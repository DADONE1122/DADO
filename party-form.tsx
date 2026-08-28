"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { waLink, msgSollecitoDettagli, msgConfermaFesta } from "@/lib/whatsapp"
import { isWeekendOFestivo } from "@/lib/festivi"
import { unitLabel } from "@/lib/unita"
import { PREZZO_PANINO_NUTELLA, PREZZO_TORTA_AL_KG } from "@/lib/prezzi"

interface PartyFormProps {
  party: any
  packages: any[]
  services: any[]
}

// Opzioni dolce. Se needsDetails, mostra un campo per gusto/richieste.
// I prezzi arrivano da lib/prezzi: li usa anche il server quando congela il
// prezzo concordato, e se fossero scritti due volte finirebbero per divergere.
const DOLCE_OPTIONS = [
  {
    value: "Panino alla Nutella a forma di numero",
    label: `Panino alla Nutella a forma di numero — €${PREZZO_PANINO_NUTELLA}`,
    needsDetails: false,
    price: PREZZO_PANINO_NUTELLA as number | null,
  },
  {
    value: "Torta di pasticceria",
    label: `Torta di pasticceria — €${PREZZO_TORTA_AL_KG}/kg`,
    needsDetails: true,
    price: null as number | null, // al kg: il totale dipende dai kg indicati
    pricePerKg: PREZZO_TORTA_AL_KG,
  },
  { value: "La porto io", label: "La porto io", needsDetails: false, price: 0 as number | null },
]

// Ricava scelta + kg + dettagli dal valore salvato nel campo "cake".
// Formato salvato: "Torta di pasticceria — 2,5 kg — cioccolato"
function parseDolce(cake: string | null | undefined) {
  const c = (cake || "").trim()
  for (const opt of DOLCE_OPTIONS) {
    if (c === opt.value) return { choice: opt.value, details: "", kg: "" }
    if (opt.needsDetails && c.startsWith(opt.value)) {
      let rest = c.slice(opt.value.length).replace(/^\s*—\s*/, "")
      let kg = ""
      const mk = rest.match(/^([\d.,]+)\s*kg\s*(?:—\s*)?/i)
      if (mk) {
        // Il campo è <input type="number">: vuole il punto come decimale,
        // altrimenti il browser lo considera vuoto.
        kg = mk[1].replace(",", ".")
        rest = rest.slice(mk[0].length)
      }
      return { choice: opt.value, details: rest.trim(), kg }
    }
  }
  return { choice: "", details: "", kg: "" }
}

const GUESTS_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 5) // 5..30

type Selection = {
  serviceId: string
  optionId: string | null
  quantity: number
  note?: string
}

const nf = (n: number) => n.toFixed(2).replace(".", ",") + "€"

export function PartyForm({ party, packages, services }: PartyFormProps) {
  const router = useRouter()
  const initialDolce = parseDolce(party?.cake)

  const [formData, setFormData] = useState({ ...party })
  const [dolceChoice, setDolceChoice] = useState(initialDolce.choice)
  const [dolceDetails, setDolceDetails] = useState(initialDolce.details)
  const [dolceKg, setDolceKg] = useState(initialDolce.kg)
  const [selections, setSelections] = useState<Selection[]>(
    Array.isArray(party?.additionalServices)
      ? party.additionalServices
          .map((s: any) => ({
            serviceId: s.serviceId ?? s.service?.id,
            optionId: s.optionId ?? s.option?.id ?? null,
            quantity: Number(s.quantity ?? 1) || 1,
            note: s.note ?? "",
          }))
          .filter((s: any) => s.serviceId)
      : []
  )
  const [takenOptionIds, setTakenOptionIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isNew = !party?.id
  const isPending = formData.status === "PENDING_DETAILS"
  const isCancelled = formData.status === "CANCELLED"

  const selectedDolce = DOLCE_OPTIONS.find((o) => o.value === dolceChoice)
  const dolceKgNum = parseFloat((dolceKg || "").replace(",", ".")) || 0
  const cakeValue = dolceChoice
    ? selectedDolce?.needsDetails
      ? [
          dolceChoice,
          dolceKgNum > 0 ? `${dolceKg.replace(".", ",")} kg` : "",
          dolceDetails.trim(),
        ]
          .filter(Boolean)
          .join(" — ")
      : dolceChoice
    : ""
  const cakeIsFilled = cakeValue !== ""

  const selectedPackage = packages.find(
    (p: any) => p.id === formData.packageId
  )

  // Disponibilità opzioni esclusive (es. sfondi) per la data scelta
  useEffect(() => {
    const dateStr = formData.date
      ? new Date(formData.date).toISOString().split("T")[0]
      : ""
    if (!dateStr) {
      setTakenOptionIds([])
      return
    }
    const params = new URLSearchParams({ date: dateStr })
    if (party?.id) params.set("excludePartyId", party.id)
    fetch(`/api/parties/options-availability?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { takenOptionIds: [] }))
      .then((d) => setTakenOptionIds(d.takenOptionIds || []))
      .catch(() => setTakenOptionIds([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date])

  // Spunta da sola la Pulizia finale quando si sceglie FAI DA TE, e la toglie
  // se si passa a un pacchetto che la include già. Così non ci si dimentica
  // di addebitarla né la si lascia addosso per sbaglio.
  useEffect(() => {
    const obbligatori = services.filter(
      (s: any) =>
        s.mandatoryForPackageId && s.mandatoryForPackageId === formData.packageId
    )
    const idsObbligatori = obbligatori.map((s: any) => s.id)
    const idsMandatoriAltrove = services
      .filter((s: any) => s.mandatoryForPackageId)
      .map((s: any) => s.id)

    setSelections((prev) => {
      // via quelli obbligatori per ALTRI pacchetti, dentro quelli di questo
      let next = prev.filter(
        (s) =>
          !idsMandatoriAltrove.includes(s.serviceId) ||
          idsObbligatori.includes(s.serviceId)
      )
      for (const id of idsObbligatori) {
        if (!next.some((s) => s.serviceId === id)) {
          next = [...next, { serviceId: id, optionId: null, quantity: 1, note: "" }]
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.packageId])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const buildPayload = (extra: any = {}) => ({
    ...formData,
    cake: cakeValue,
    serviceSelections: selections,
    ...extra,
  })

  const isChecked = (serviceId: string) =>
    selections.some((s) => s.serviceId === serviceId)

  const getOptionId = (serviceId: string) =>
    selections.find((s) => s.serviceId === serviceId)?.optionId ?? ""

  const getQuantity = (serviceId: string) =>
    selections.find((s) => s.serviceId === serviceId)?.quantity ?? 1

  const getNote = (serviceId: string) =>
    selections.find((s) => s.serviceId === serviceId)?.note ?? ""

  const setServiceNote = (serviceId: string, note: string) => {
    setSelections((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, note } : s))
    )
  }

  const toggleService = (serviceId: string) => {
    setSelections((prev) => {
      if (prev.some((s) => s.serviceId === serviceId)) {
        // Togliendo un servizio padre si tolgono anche le sue voci figlie
        // (es. deselezionando Pizza famiglia sparisce la Farcitura).
        const figli = services
          .filter((s: any) => s.parentServiceId === serviceId)
          .map((s: any) => s.id)
        return prev.filter(
          (s) => s.serviceId !== serviceId && !figli.includes(s.serviceId)
        )
      }
      return [...prev, { serviceId, optionId: null, quantity: 1, note: "" }]
    })
  }

  const setServiceOption = (serviceId: string, optionId: string) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, optionId: optionId || null } : s
      )
    )
  }

  const setServiceQuantity = (serviceId: string, raw: string) => {
    const n = parseFloat(raw.replace(",", "."))
    const q = !isFinite(n) || n <= 0 ? 1 : Math.min(Math.round(n * 100) / 100, 999)
    setSelections((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, quantity: q } : s))
    )
  }

  // Raggruppa i servizi per categoria (ordine fisso, "Altro" in fondo)
  const CATEGORY_ORDER = [
    "Cibo",
    "Bevande",
    "Torte e dolci",
    "Allestimenti",
    "Extra",
  ]
  // ── Regole obbligatorie del listino ────────────────────────────────────────
  // 1) Servizi obbligatori per il pacchetto scelto (es. Pulizia finale con
  //    FAI DA TE): vengono spuntati da soli e non si possono togliere.
  const serviziObbligatori = services.filter(
    (s: any) => s.mandatoryForPackageId && s.mandatoryForPackageId === formData.packageId
  )
  const isObbligatorio = (id: string) =>
    serviziObbligatori.some((s: any) => s.id === id)

  // 2) Se il dolce lo porta il genitore, va addebitato il diritto di sbarco:
  //    almeno uno fra "Servizio torta esterna" e "Servizio panino nutella esterno".
  const dolceEsterno = dolceChoice === "La porto io"
  const serviziSbarco = services.filter((s: any) => s.requiredIfCakeExternal)
  const sbarcoScelto = serviziSbarco.some((s: any) =>
    selections.some((sel) => sel.serviceId === s.id)
  )
  const mancaSbarco = dolceEsterno && serviziSbarco.length > 0 && !sbarcoScelto

  // Servizi mostrati accanto al pacchetto (riguardano la festa in sé,
  // non sono extra da listino): es. Festa condivisa.
  const serviziPacchetto = services.filter((s: any) => s.showWithPackage)

  // Voci figlie (es. Farcitura sotto Pizza famiglia): non compaiono nella
  // lista principale, ma rientrate sotto il servizio padre.
  const figliDi = (id: string) =>
    services.filter((s: any) => s.parentServiceId === id)

  const grouped: Record<string, any[]> = {}
  for (const svc of services) {
    if (svc.showWithPackage || svc.parentServiceId) continue
    const cat = svc.category || "Altro"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(svc)
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  // ── Riepilogo economico ─────────────────────────────────────────────────────
  const weekend = formData.date ? isWeekendOFestivo(formData.date) : false
  const pkgPrice = selectedPackage
    ? Number(weekend ? selectedPackage.weekendPrice : selectedPackage.ferialePrice)
    : 0
  const baseGuests = selectedPackage?.baseGuests || 15
  const extraGuestPrice = Number(selectedPackage?.extraGuestPrice || 0)
  const guests = parseInt(formData.estimatedGuests) || 0
  const extraGuests = Math.max(0, guests - baseGuests)
  const extraGuestsTotal = extraGuests * extraGuestPrice

  const selectedServices = selections
    .map((sel) => {
      const svc = services.find((x: any) => x.id === sel.serviceId)
      if (!svc) return null
      const opt = sel.optionId
        ? (svc.options || []).find((o: any) => o.id === sel.optionId)
        : null
      const unit: string | null = svc.unit || null
      const qty = unit ? Number(sel.quantity) || 1 : 1
      const unitPrice = Number(svc.price)
      return {
        name: svc.name,
        unitPrice,
        unit,
        qty,
        subtotal: unitPrice * qty,
        option: opt?.name || null,
        note: (sel.note || "").trim() || null,
      }
    })
    .filter(Boolean) as {
    name: string
    unitPrice: number
    unit: string | null
    qty: number
    subtotal: number
    option: string | null
    note: string | null
  }[]
  const servicesTotal = selectedServices.reduce((sum, x) => sum + x.subtotal, 0)
  const hasQuoteOnly = selectedServices.some((x) => x.unitPrice === 0)

  // Dolce: la torta di pasticceria costa €/kg, quindi dipende dai kg indicati.
  const dolcePrice = selectedDolce?.needsDetails
    ? dolceKgNum > 0
      ? (selectedDolce as any).pricePerKg * dolceKgNum
      : null
    : selectedDolce?.price ?? null

  // ── Prezzo concordato (congelato) ──────────────────────────────────────────
  // Se la festa è già stata confermata, il prezzo pattuito col genitore è
  // salvato sulla festa e NON cambia se ritocchiamo il listino.
  const prezzoCongelato =
    party?.totalAmount !== null && party?.totalAmount !== undefined
      ? Number(party.totalAmount)
      : null
  const congelatoIl = party?.pricesFrozenAt ? new Date(party.pricesFrozenAt) : null
  const righeCongelate: any[] = (party?.priceBreakdown as any)?.righe || []

  // Doppio conteggio: la torta è già nel dolce, se l'utente spunta anche il
  // servizio "Torta personalizzata" la conta due volte.
  const tortaInServizi = selectedServices.some((s) => /torta/i.test(s.name))
  const tortaDoppia = Boolean(selectedDolce?.needsDetails && tortaInServizi)

  // Totale calcolato sul listino di OGGI (stima finché la festa non è confermata)
  const totaleStimato =
    Math.round(
      (pkgPrice + extraGuestsTotal + servicesTotal + (dolcePrice || 0)) * 100
    ) / 100

  // Se c'è un prezzo concordato, è quello che vale: il saldo si calcola su
  // quello, non sulla stima del listino corrente.
  const total = prezzoCongelato !== null ? prezzoCongelato : totaleStimato
  const scostamento =
    prezzoCongelato !== null
      ? Math.round((totaleStimato - prezzoCongelato) * 100) / 100
      : 0
  const prezzoDaAggiornare = prezzoCongelato !== null && Math.abs(scostamento) >= 0.01

  const deposit = formData.depositReceived ? Number(formData.depositAmount) || 0 : 0
  const balance = total - deposit
  const eur = (n: number) => n.toFixed(2).replace(".", ",") + "€"

  // ── Messaggi WhatsApp precompilati ─────────────────────────────────────────
  const oraIt = formData.slot === "MORNING" ? "11:00" : "15:30"
  const msgSollecito = formData.date
    ? msgSollecitoDettagli(formData.parentName || "", formData.celebrationName || "", formData.date)
    : ""
  const msgConferma = formData.date
    ? msgConfermaFesta(formData.parentName || "", formData.celebrationName || "", formData.date, oraIt)
    : ""

  // Cosa manca per poter salvare. Mostrato in chiaro accanto al pulsante,
  // così il salvataggio non fallisce mai in silenzio.
  const campiMancanti: string[] = []
  if (!formData.date) campiMancanti.push("la data")
  if (!formData.packageId) campiMancanti.push("il pacchetto")
  if (!String(formData.estimatedGuests ?? "").trim())
    campiMancanti.push("il numero di bambini")
  if (!formData.celebrationName?.trim()) campiMancanti.push("il nome del festeggiato")
  if (!String(formData.age ?? "").trim()) campiMancanti.push("l'età")
  if (!formData.parentName?.trim()) campiMancanti.push("il nome del genitore")
  if (!formData.parentPhone?.trim()) campiMancanti.push("il telefono")
  const puoSalvare = campiMancanti.length === 0

  // Incoerenze sull'acconto: non bloccano il salvataggio ma vanno segnalate,
  // altrimenti si perde traccia di soldi già incassati.
  const accontoIncompleto =
    Boolean(formData.depositReceived) &&
    (!String(formData.depositAmount ?? "").trim() || !formData.depositMethod)

  // Scheda di un singolo servizio: casella, quantità, appunto, opzioni e
  // eventuali voci figlie rientrate (es. Farcitura sotto Pizza famiglia).
  const SchedaServizio = ({
    svc,
    annidato = false,
  }: {
    svc: any
    annidato?: boolean
  }) => {
    const checked = isChecked(svc.id)
    const hasOpts = Array.isArray(svc.options) && svc.options.length > 0
    const bloccato = isObbligatorio(svc.id)
    const figli = figliDi(svc.id)

    return (
      <div
        className={`border rounded-md p-3 ${
          checked ? "border-blue-400 bg-blue-50" : ""
        } ${annidato ? "ml-6 mt-2 bg-white/70" : ""}`}
      >
        <label
          className={`flex items-center gap-3 ${
            bloccato ? "cursor-default" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={bloccato}
            onChange={() => !bloccato && toggleService(svc.id)}
            className="w-4 h-4"
          />
          <span className="flex-1">
            {svc.name}
            {svc.priceNote && (
              <span className="text-xs text-gray-500"> ({svc.priceNote})</span>
            )}
            {bloccato && (
              <span className="ml-1 text-xs font-medium text-amber-700">
                — obbligatoria
              </span>
            )}
          </span>
          <span className="text-gray-700 font-medium whitespace-nowrap">
            {Number(svc.price) > 0 ? `€${svc.price}` : "su preventivo"}
          </span>
        </label>

        {/* Quantità per i servizi a unità (al kg, a pezzo, a bottiglia…) */}
        {checked && svc.unit && (
          <div className="mt-2 pl-7 flex items-center gap-2 flex-wrap">
            <label htmlFor={`qty-${svc.id}`} className="text-sm text-gray-600">
              Quantità
            </label>
            <input
              id={`qty-${svc.id}`}
              type="number"
              inputMode="decimal"
              min={svc.unit === "kg" ? "0.5" : "1"}
              step={svc.unit === "kg" ? "0.5" : "1"}
              value={getQuantity(svc.id)}
              onChange={(e) => setServiceQuantity(svc.id, e.target.value)}
              className="w-24 px-3 py-2 border rounded-md text-base"
            />
            <span className="text-sm text-gray-600">
              {unitLabel(svc.unit, getQuantity(svc.id))}
            </span>
            <span className="ml-auto text-sm font-semibold text-gray-800">
              = {nf(Number(svc.price) * getQuantity(svc.id))}
            </span>
          </div>
        )}

        {/* Appunto libero (gusto, tema, testo del topper…) */}
        {checked && svc.needsNote && (
          <div className="mt-2 pl-7">
            <label
              htmlFor={`note-${svc.id}`}
              className="block text-sm text-gray-600 mb-1"
            >
              {svc.noteLabel || "Appunti"}
            </label>
            <input
              id={`note-${svc.id}`}
              type="text"
              value={getNote(svc.id)}
              onChange={(e) => setServiceNote(svc.id, e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              placeholder="Scrivi qui..."
            />
          </div>
        )}

        {/* Opzioni a tendina (es. tema dello sfondo fotografico) */}
        {checked && hasOpts && (
          <div className="mt-2 pl-7">
            <select
              value={getOptionId(svc.id)}
              onChange={(e) => setServiceOption(svc.id, e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
            >
              <option value="">Scegli il tema...</option>
              {svc.options.map((opt: any) => {
                const taken = takenOptionIds.includes(opt.id)
                return (
                  <option key={opt.id} value={opt.id} disabled={taken}>
                    {opt.name}
                    {taken ? " — già preso in questa data" : ""}
                  </option>
                )
              })}
            </select>
            {!formData.date && (
              <p className="text-xs text-amber-600 mt-1">
                Scegli prima la data per vedere la disponibilità
              </p>
            )}
          </div>
        )}

        {/* Voci figlie: compaiono solo se il padre è selezionato */}
        {checked &&
          figli.map((f: any) => (
            <SchedaServizio key={f.id} svc={f} annidato />
          ))}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!puoSalvare) {
      setError(`Manca ${campiMancanti.join(", ")}.`)
      // Porta l'utente sul primo campo non compilato invece di lasciarlo
      // a fissare un pulsante che non fa niente.
      const primo = document.querySelector<HTMLElement>(
        "form :invalid, form [data-mancante=true]"
      )
      primo?.scrollIntoView({ behavior: "smooth", block: "center" })
      primo?.focus?.()
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      if (isNew) {
        const res = await fetch(`/api/parties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Errore durante la creazione")
        }
        const created = await res.json()
        router.push(`/dashboard/feste/${created.id}`)
        return
      }

      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il salvataggio")
      }
      setSuccess("Modifiche salvate con successo!")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!cakeIsFilled) {
      setError("Seleziona il dolce per completare la festa")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ status: "COMPLETE" })),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il completamento")
      }
      setSuccess("Festa completata: il prezzo concordato è stato bloccato.")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Ri-blocca il prezzo concordato sul totale attuale. Serve quando la festa
  // cambia dopo la conferma (il genitore aggiunge un servizio, cambia i bambini)
  // e il prezzo è stato ri-concordato davvero.
  const handleRefreeze = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ refreezePrice: true })),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante l'aggiornamento del prezzo")
      }
      setSuccess("Prezzo concordato aggiornato.")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (
      !confirm(
        "Sei sicuro di voler annullare questa festa? L'acconto verrà trattenuto."
      )
    ) {
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/parties/${party.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Errore durante l'annullamento")
      setSuccess("Festa annullata")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (isCancelled) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-500 mb-2">Festa Annullata</h2>
        <p className="text-gray-500">
          Questa festa è stata annullata. L&apos;acconto è stato trattenuto.
        </p>
      </div>
    )
  }

  const Messages = () => (
    <>
      {success && (
        <div className="bg-green-50 border border-green-400 rounded-lg p-3 text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}
    </>
  )

  return (
    <form
      onSubmit={handleSubmit}
      // Se un campo è invalido per il browser (es. un numero fuori range), il
      // submit non parte proprio: senza questo l'utente cliccherebbe "Salva"
      // senza veder succedere nulla. Qui intercettiamo e diciamo cosa non va.
      onInvalid={(e) => {
        const el = e.target as HTMLInputElement
        const etichetta =
          el.closest("div")?.querySelector("label")?.textContent?.replace("*", "").trim() ||
          el.name ||
          "un campo"
        setError(
          `Controlla "${etichetta}": ${el.validationMessage || "valore non valido"}`
        )
      }}
      className="space-y-8"
    >
      {/* Status Banner (solo in modifica) */}
      {isPending && !isNew && (
        <div
          className={`border-2 rounded-lg p-4 flex items-center gap-3 ${
            cakeIsFilled
              ? "bg-green-50 border-green-400"
              : "bg-red-50 border-red-400"
          }`}
        >
          <span className="text-2xl">{cakeIsFilled ? "✅" : "⚠️"}</span>
          <div>
            <p
              className={`font-bold text-lg ${
                cakeIsFilled ? "text-green-800" : "text-red-800"
              }`}
            >
              {cakeIsFilled ? "Pronta da completare" : "Dettagli mancanti"}
            </p>
            <p
              className={`text-sm ${
                cakeIsFilled ? "text-green-700" : "text-red-700"
              }`}
            >
              {cakeIsFilled
                ? "Il dolce è stato scelto. Puoi completare la festa col pulsante verde."
                : "Scegli il dolce per poter completare la festa."}
            </p>
          </div>
        </div>
      )}

      <Messages />

      {/* ===== BLOCCO DATA ===== */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          📅 Blocco Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Data <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={
                formData.date
                  ? new Date(formData.date).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => handleChange("date", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            />
            {/* Conferma in chiaro che giorno è: evita di prenotare il giorno
                sbagliato e mostra subito se scatta il prezzo weekend. */}
            {formData.date && (
              <p className="mt-1.5 text-sm">
                <span className="font-medium capitalize" style={{ color: "#2B2B6B" }}>
                  {new Date(formData.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    weekend
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {weekend ? "weekend/festivo — tariffa maggiorata" : "feriale"}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slot</label>
            <select
              value={formData.slot}
              onChange={(e) => handleChange("slot", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="MORNING">Mattina (11:00-15:00)</option>
              <option value="AFTERNOON">Pomeriggio (15:30-18:30)</option>
            </select>
          </div>
          <div>
            <label htmlFor="packageId" className="block text-sm font-medium mb-1">
              Pacchetto <span className="text-red-500">*</span>
            </label>
            <select
              id="packageId"
              name="packageId"
              value={formData.packageId || ""}
              onChange={(e) => handleChange("packageId", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            >
              <option value="">Seleziona il pacchetto...</option>
              {packages.map((pkg: any) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — Feriale: €{pkg.ferialePrice} / Weekend: €
                  {pkg.weekendPrice}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="estimatedGuests"
              className="block text-sm font-medium mb-1"
            >
              Bambini attesi <span className="text-red-500">*</span>
            </label>
            <select
              id="estimatedGuests"
              name="estimatedGuests"
              value={formData.estimatedGuests || ""}
              onChange={(e) => handleChange("estimatedGuests", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            >
              <option value="">Seleziona...</option>
              {GUESTS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} bambini
                </option>
              ))}
            </select>
          </div>

          {/* Opzioni della festa in sé (es. Festa condivisa): stanno qui e
              non fra i servizi, perché riguardano com'è fatta la festa. */}
          {selectedPackage && serviziPacchetto.length > 0 && (
            <div className="md:col-span-2 space-y-2">
              {serviziPacchetto.map((svc: any) => (
                <SchedaServizio key={svc.id} svc={svc} />
              ))}
            </div>
          )}

          {/* Pannello: cosa include il pacchetto scelto */}
          {selectedPackage && (
            <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800">
                {selectedPackage.name}
                {selectedPackage.description && (
                  <span className="font-normal text-gray-600">
                    {" "}
                    — {selectedPackage.description}
                  </span>
                )}
              </p>
              {selectedPackage.inclusions && (
                <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                  {String(selectedPackage.inclusions)
                    .split("\n")
                    .filter(Boolean)
                    .map((inc: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                </ul>
              )}
              {selectedPackage.extraGuestPrice && (
                <p className="mt-2 text-xs text-gray-600">
                  Base {selectedPackage.baseGuests || 15} bambini — invitato
                  extra: €{selectedPackage.extraGuestPrice} a bambino
                </p>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <h3 className="font-semibold text-gray-700 mb-2">Acconto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ricevuta
                </label>
                <select
                  value={formData.depositReceived ? "true" : "false"}
                  onChange={(e) =>
                    handleChange("depositReceived", e.target.value === "true")
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="false">No</option>
                  <option value="true">Sì</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Importo (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.depositAmount || ""}
                  onChange={(e) => handleChange("depositAmount", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metodo</label>
                <select
                  value={formData.depositMethod || ""}
                  onChange={(e) =>
                    handleChange("depositMethod", e.target.value || null)
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleziona...</option>
                  <option value="CASH">Contanti</option>
                  <option value="BANK_TRANSFER">Bonifico</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DETTAGLI ===== */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          🎂 Dettagli Festa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="celebrationName" className="block text-sm font-medium mb-1">
              Nome del festeggiato <span className="text-red-500">*</span>
            </label>
            <input
              id="celebrationName"
              name="celebrationName"
              type="text"
              autoComplete="off"
              autoCapitalize="words"
              value={formData.celebrationName || ""}
              onChange={(e) => handleChange("celebrationName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            />
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium mb-1">
              Età <span className="text-red-500">*</span>
            </label>
            <input
              id="age"
              name="age"
              type="number"
              inputMode="numeric"
              value={formData.age || ""}
              onChange={(e) => handleChange("age", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
              min="0"
              max="18"
            />
          </div>
          <div>
            <label htmlFor="parentName" className="block text-sm font-medium mb-1">
              Nome genitore <span className="text-red-500">*</span>
            </label>
            <input
              id="parentName"
              name="parentName"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              value={formData.parentName || ""}
              onChange={(e) => handleChange("parentName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            />
          </div>
          <div>
            <label htmlFor="parentPhone" className="block text-sm font-medium mb-1">
              Telefono genitore <span className="text-red-500">*</span>
            </label>
            <input
              id="parentPhone"
              name="parentPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formData.parentPhone || ""}
              onChange={(e) => handleChange("parentPhone", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dolce</label>
            <select
              value={dolceChoice}
              onChange={(e) => setDolceChoice(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Seleziona...</option>
              {DOLCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {selectedDolce?.needsDetails && (
            <div>
              <label htmlFor="dolceKg" className="block text-sm font-medium mb-1">
                Peso torta (kg) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="dolceKg"
                  type="number"
                  inputMode="decimal"
                  min="0.5"
                  step="0.5"
                  value={dolceKg}
                  onChange={(e) => setDolceKg(e.target.value)}
                  className="w-28 px-3 py-2 border rounded-md text-base"
                  placeholder="2"
                />
                <span className="text-sm text-gray-600">
                  kg × €35 ={" "}
                  <b>{dolceKgNum > 0 ? nf(35 * dolceKgNum) : "—"}</b>
                </span>
              </div>
            </div>
          )}
          {selectedDolce?.needsDetails && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Gusto e richieste (torta)
              </label>
              <input
                type="text"
                value={dolceDetails}
                onChange={(e) => setDolceDetails(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Es. cioccolato, senza glutine, scritta..."
              />
            </div>
          )}
          {/* Dolce portato da casa: va addebitato il diritto di sbarco. */}
          {mancaSbarco && (
            <div className="md:col-span-2 bg-amber-50 border-2 border-amber-400 rounded-lg p-3">
              <p className="text-sm text-amber-900 font-medium">
                ⚠️ Il dolce lo porta il genitore: spunta nei servizi{" "}
                {serviziSbarco.map((s: any) => `"${s.name}"`).join(" oppure ")}.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Senza, il diritto di sbarco non viene addebitato.
              </p>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Richieste speciali
            </label>
            <input
              type="text"
              value={formData.specialRequests || ""}
              onChange={(e) => handleChange("specialRequests", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Altre richieste..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              🔒 Note interne <span className="text-xs text-gray-400 font-normal">(solo titolari — lo staff non le vede)</span>
            </label>
            <textarea
              rows={2}
              value={formData.internalNotes || ""}
              onChange={(e) => handleChange("internalNotes", e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-yellow-50/50"
              placeholder="Es. genitore da richiamare, acconto promesso per venerdì, cliente della fidelity..."
            />
          </div>
        </div>
      </section>

      {/* ===== SERVIZI AGGIUNTIVI (upselling) ===== */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          ➕ Servizi Aggiuntivi
        </h2>
        {services.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nessun servizio configurato. Aggiungili dalla sezione
            Configurazioni.
          </p>
        ) : (
          <div className="space-y-5">
            {orderedCategories.map((cat) => (
              <div key={cat}>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grouped[cat].map((svc: any) => (
                    <SchedaServizio key={svc.id} svc={svc} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== RIEPILOGO ECONOMICO ===== */}
      {selectedPackage && (
        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
            💰 Riepilogo Economico
          </h2>
          <div className="space-y-1.5 text-sm">
            {prezzoCongelato !== null && (
              <p className="text-xs text-gray-400 uppercase tracking-wide pb-1">
                Voci ai prezzi di oggi
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">
                {selectedPackage.name} ({weekend ? "weekend/festivo" : "feriale"})
              </span>
              <span className="font-medium">{eur(pkgPrice)}</span>
            </div>
            {extraGuests > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Invitati extra: {extraGuests} × {eur(extraGuestPrice)} (oltre i {baseGuests})
                </span>
                <span className="font-medium">{eur(extraGuestsTotal)}</span>
              </div>
            )}
            {selectedServices.map((x, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-600">
                  {x.name}
                  {x.option ? `: ${x.option}` : ""}
                  {x.note && (
                    <span className="text-gray-500"> ({x.note})</span>
                  )}
                  {x.unit && (
                    <span className="text-gray-500">
                      {" "}
                      — {String(x.qty).replace(".", ",")}{" "}
                      {unitLabel(x.unit, x.qty)} × {eur(x.unitPrice)}
                    </span>
                  )}
                </span>
                <span className="font-medium whitespace-nowrap">
                  {x.unitPrice > 0 ? eur(x.subtotal) : "su preventivo"}
                </span>
              </div>
            ))}
            {dolceChoice && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Dolce: {dolceChoice}
                  {selectedDolce?.needsDetails && dolceKgNum > 0 && (
                    <span className="text-gray-500">
                      {" "}
                      — {dolceKg.replace(".", ",")} kg × €35
                    </span>
                  )}
                </span>
                <span className="font-medium whitespace-nowrap">
                  {dolcePrice === null
                    ? "indica i kg"
                    : dolcePrice > 0
                      ? eur(dolcePrice)
                      : "—"}
                </span>
              </div>
            )}
            {tortaDoppia && (
              <p className="text-xs bg-amber-50 border border-amber-300 text-amber-800 rounded-md p-2 mt-1">
                ⚠️ Attenzione: hai indicato una torta sia nel <b>Dolce</b> sia
                nei <b>Servizi</b>. Se è la stessa torta, togline una — altrimenti
                la stai contando due volte.
              </p>
            )}
            {prezzoCongelato === null ? (
              <div
                className="flex justify-between pt-2 mt-2 border-t font-bold text-base"
                style={{ color: "#2B2B6B" }}
              >
                <span>
                  Totale stimato
                  {hasQuoteOnly || dolcePrice === null ? " (parziale)" : ""}
                </span>
                <span>{eur(totaleStimato)}</span>
              </div>
            ) : (
              <>
                {/* La festa è confermata: vale il prezzo concordato col genitore,
                    non quello che verrebbe fuori dal listino di oggi. */}
                <div className="flex justify-between text-gray-500 pt-2 mt-2 border-t">
                  <span>Totale a listino di oggi</span>
                  <span>{eur(totaleStimato)}</span>
                </div>
                <div
                  className="flex justify-between font-bold text-base"
                  style={{ color: "#2B2B6B" }}
                >
                  <span>🔒 Prezzo concordato</span>
                  <span>{eur(prezzoCongelato)}</span>
                </div>
                {congelatoIl && (
                  <p className="text-xs text-gray-400">
                    Bloccato il{" "}
                    {congelatoIl.toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    . Ritoccare il listino non cambia questa festa.
                  </p>
                )}
                {righeCongelate.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 py-1">
                      Vedi il dettaglio concordato
                    </summary>
                    <div className="mt-1 pl-2 border-l-2 space-y-1 py-1" style={{ borderColor: "#E5D9BF" }}>
                      {righeCongelate.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between text-gray-600">
                          <span>{r.descrizione}</span>
                          <span className="font-medium whitespace-nowrap">
                            {eur(Number(r.subtotale))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {prezzoDaAggiornare && (
                  <div className="bg-amber-50 border border-amber-300 rounded-md p-2.5 mt-1.5">
                    <p className="text-xs text-amber-900">
                      La festa è cambiata dopo la conferma: a listino di oggi
                      farebbe <b>{eur(totaleStimato)}</b>, cioè{" "}
                      <b>
                        {scostamento > 0 ? "+" : "−"}
                        {eur(Math.abs(scostamento))}
                      </b>{" "}
                      rispetto al prezzo concordato.
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreeze}
                      disabled={saving}
                      className="mt-2 px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50"
                      style={{ backgroundColor: "#2B2B6B" }}
                    >
                      Aggiorna il prezzo concordato a {eur(totaleStimato)}
                    </button>
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      Fallo solo se hai ri-concordato il prezzo col genitore.
                    </p>
                  </div>
                )}
              </>
            )}
            {deposit > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Acconto ricevuto</span>
                  <span>−{eur(deposit)}</span>
                </div>
                <div className="flex justify-between font-bold" style={{ color: "#2B2B6B" }}>
                  <span>Saldo alla festa</span>
                  <span>{eur(balance)}</span>
                </div>
              </>
            )}
            {guests === 0 && (
              <p className="text-xs bg-amber-50 border border-amber-300 text-amber-800 rounded-md p-2 mt-1">
                ⚠️ Non hai ancora indicato il numero di bambini: eventuali
                invitati extra (oltre {baseGuests}) non sono conteggiati.
              </p>
            )}
            {accontoIncompleto && (
              <p className="text-xs bg-amber-50 border border-amber-300 text-amber-800 rounded-md p-2 mt-1">
                ⚠️ Hai segnato l&apos;acconto come ricevuto ma manca{" "}
                {!String(formData.depositAmount ?? "").trim() ? "l'importo" : ""}
                {!String(formData.depositAmount ?? "").trim() && !formData.depositMethod ? " e " : ""}
                {!formData.depositMethod ? "il metodo (contanti/bonifico)" : ""}.
                Senza questi dati il saldo non torna.
              </p>
            )}
            <p className="text-xs text-gray-400 pt-2">
              Prezzo weekend applicato a sabati, domeniche e festivi nazionali.
              Le voci &quot;su preventivo&quot; restano da concordare.
            </p>
          </div>
        </section>
      )}

      {/* ===== CONTATTA IL GENITORE ===== */}
      {!isNew && formData.parentPhone && (
        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
            📱 Contatta {formData.parentName || "il genitore"}
          </h2>
          <div className="flex gap-3 flex-wrap">
            {isPending && (
              <a
                href={waLink(formData.parentPhone, msgSollecito)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90"
                style={{ backgroundColor: "#25D366" }}
              >
                💬 Sollecita dettagli su WhatsApp
              </a>
            )}
            {formData.status === "COMPLETE" && (
              <a
                href={waLink(formData.parentPhone, msgConferma)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90"
                style={{ backgroundColor: "#25D366" }}
              >
                💬 Invia conferma su WhatsApp
              </a>
            )}
            <a
              href={waLink(formData.parentPhone, "")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg border font-medium text-sm text-gray-700 hover:bg-gray-50"
            >
              💬 Chat libera
            </a>
            <a
              href={`tel:${(formData.parentPhone || "").replace(/\s/g, "")}`}
              className="px-5 py-2.5 rounded-lg border font-medium text-sm text-gray-700 hover:bg-gray-50"
            >
              📞 Chiama
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Il messaggio si apre precompilato in WhatsApp: lo puoi modificare prima di inviarlo.
          </p>
        </section>
      )}

      {/* Messaggi anche vicino ai pulsanti */}
      <Messages />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? "Salvataggio..."
            : isNew
            ? "Crea festa"
            : "Salva modifiche"}
        </button>

        {!isNew && isPending && cakeIsFilled && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Completa festa
          </button>
        )}

        {!isNew && formData.status === "COMPLETE" && (
          <a
            href={`/api/parties/${party.id}/invito`}
            target="_blank"
            className="px-6 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 font-medium"
          >
            🎟️ Genera invito
          </a>
        )}

        {!isNew && !isCancelled && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 ml-auto"
          >
            Annulla festa
          </button>
        )}
      </div>

      {/* Spazio per non far coprire l'ultimo contenuto dalla barra fissa */}
      <div className="h-24 md:hidden" aria-hidden="true" />

      {/* ===== BARRA FISSA: totale sempre visibile + salva a portata di pollice =====
          Su telefono il form è lungo: senza questa barra bisogna scorrere fino
          in fondo per vedere quanto costa e per salvare. */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.12)] px-4 py-3"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5D9BF" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Totale{hasQuoteOnly || dolcePrice === null ? " parziale" : ""}
            </div>
            <div
              className="text-xl font-bold leading-tight"
              style={{ color: "#2B2B6B" }}
            >
              {selectedPackage ? eur(total) : "—"}
              {deposit > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  saldo {eur(balance)}
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 text-white rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: puoSalvare ? "#2B2B6B" : "#9CA3AF" }}
          >
            {saving ? "Salvo..." : isNew ? "Crea festa" : "Salva"}
          </button>
        </div>
        {!puoSalvare && (
          <p className="text-[11px] text-amber-700 mt-1.5 truncate">
            Manca {campiMancanti.join(", ")}
          </p>
        )}
      </div>
    </form>
  )
}
