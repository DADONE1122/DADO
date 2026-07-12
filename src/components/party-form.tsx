"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface PartyFormProps {
  party: any
  packages: any[]
  services: any[]
}

// Opzioni dolce. Se needsDetails, mostra un campo per gusto/richieste.
const DOLCE_OPTIONS = [
  {
    value: "Panino alla Nutella a forma di numero",
    label: "Panino alla Nutella a forma di numero — €28",
    needsDetails: false,
  },
  {
    value: "Torta di pasticceria",
    label: "Torta di pasticceria — €35/kg",
    needsDetails: true,
  },
  { value: "La porto io", label: "La porto io", needsDetails: false },
]

// Ricava scelta + dettagli dal valore salvato nel campo "cake"
function parseDolce(cake: string | null | undefined) {
  const c = (cake || "").trim()
  for (const opt of DOLCE_OPTIONS) {
    if (c === opt.value) return { choice: opt.value, details: "" }
    if (opt.needsDetails && c.startsWith(opt.value)) {
      const rest = c.slice(opt.value.length).replace(/^\s*—\s*/, "")
      return { choice: opt.value, details: rest }
    }
  }
  return { choice: "", details: "" }
}

const GUESTS_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 5) // 5..30

type Selection = { serviceId: string; optionId: string | null }

export function PartyForm({ party, packages, services }: PartyFormProps) {
  const router = useRouter()
  const initialDolce = parseDolce(party?.cake)

  const [formData, setFormData] = useState({ ...party })
  const [dolceChoice, setDolceChoice] = useState(initialDolce.choice)
  const [dolceDetails, setDolceDetails] = useState(initialDolce.details)
  const [selections, setSelections] = useState<Selection[]>(
    Array.isArray(party?.additionalServices)
      ? party.additionalServices
          .map((s: any) => ({
            serviceId: s.serviceId ?? s.service?.id,
            optionId: s.optionId ?? s.option?.id ?? null,
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
  const cakeValue = dolceChoice
    ? selectedDolce?.needsDetails && dolceDetails.trim()
      ? `${dolceChoice} — ${dolceDetails.trim()}`
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

  const toggleService = (serviceId: string) => {
    setSelections((prev) =>
      prev.some((s) => s.serviceId === serviceId)
        ? prev.filter((s) => s.serviceId !== serviceId)
        : [...prev, { serviceId, optionId: null }]
    )
  }

  const setServiceOption = (serviceId: string, optionId: string) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, optionId: optionId || null } : s
      )
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
  const grouped: Record<string, any[]> = {}
  for (const svc of services) {
    const cat = svc.category || "Altro"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(svc)
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      setSuccess("Festa completata con successo!")
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
    <form onSubmit={handleSubmit} className="space-y-8">
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
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={
                formData.date
                  ? new Date(formData.date).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => handleChange("date", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
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
            <label className="block text-sm font-medium mb-1">Pacchetto</label>
            <select
              value={formData.packageId}
              onChange={(e) => handleChange("packageId", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {packages.map((pkg: any) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — Feriale: €{pkg.ferialePrice} / Weekend: €
                  {pkg.weekendPrice}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Ospiti stimati
            </label>
            <select
              value={formData.estimatedGuests || ""}
              onChange={(e) => handleChange("estimatedGuests", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Seleziona...</option>
              {GUESTS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} bambini
                </option>
              ))}
            </select>
          </div>

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
            <label className="block text-sm font-medium mb-1">
              Nome del festeggiato <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.celebrationName || ""}
              onChange={(e) => handleChange("celebrationName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Età <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.age || ""}
              onChange={(e) => handleChange("age", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome genitore <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.parentName || ""}
              onChange={(e) => handleChange("parentName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Telefono genitore <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.parentPhone || ""}
              onChange={(e) => handleChange("parentPhone", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
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
                  {grouped[cat].map((svc: any) => {
                    const checked = isChecked(svc.id)
                    const hasOpts =
                      Array.isArray(svc.options) && svc.options.length > 0
                    return (
                      <div
                        key={svc.id}
                        className={`border rounded-md p-3 ${
                          checked ? "border-blue-400 bg-blue-50" : ""
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(svc.id)}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">
                            {svc.name}
                            {svc.priceNote && (
                              <span className="text-xs text-gray-500">
                                {" "}
                                ({svc.priceNote})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-700 font-medium whitespace-nowrap">
                            {Number(svc.price) > 0
                              ? `€${svc.price}`
                              : "su preventivo"}
                          </span>
                        </label>

                        {checked && hasOpts && (
                          <div className="mt-2 pl-7">
                            <select
                              value={getOptionId(svc.id)}
                              onChange={(e) =>
                                setServiceOption(svc.id, e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                              <option value="">Scegli...</option>
                              {svc.options.map((opt: any) => {
                                const taken = takenOptionIds.includes(opt.id)
                                return (
                                  <option
                                    key={opt.id}
                                    value={opt.id}
                                    disabled={taken}
                                  >
                                    {opt.name}
                                    {taken ? " — non disponibile in questa data" : ""}
                                  </option>
                                )
                              })}
                            </select>
                            {!formData.date && (
                              <p className="text-xs text-amber-600 mt-1">
                                Scegli prima la data per vedere la
                                disponibilità
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
    </form>
  )
}
