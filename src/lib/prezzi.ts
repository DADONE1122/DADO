// Calcolo del preventivo di una festa.
//
// Sta in una libreria condivisa perché lo usano DUE mondi:
//  - il form (per mostrare il totale mentre si prenota)
//  - il server (per congelare il prezzo concordato alla conferma)
// Se la formula fosse duplicata, prima o poi il prezzo mostrato al cliente e
// quello registrato divergerebbero.

import { isWeekendOFestivo } from "./festivi"
import { unitLabel, formatQty } from "./unita"

export type RigaPreventivo = {
  /** "pacchetto" | "extra-ospiti" | "servizio" | "dolce" */
  tipo: "pacchetto" | "extra-ospiti" | "servizio" | "dolce"
  descrizione: string
  quantita: number
  prezzoUnitario: number
  subtotale: number
  /** true quando il prezzo non è determinabile (voce "su preventivo") */
  daConcordare?: boolean
}

export type Preventivo = {
  righe: RigaPreventivo[]
  totale: number
  /** true se qualche voce è "su preventivo" o incompleta: il totale è parziale */
  parziale: boolean
  weekend: boolean
}

export type InputPreventivo = {
  date: string | Date | null | undefined
  estimatedGuests: number | string | null | undefined
  pacchetto:
    | {
        name: string
        ferialePrice: any
        weekendPrice: any
        baseGuests?: number | null
        extraGuestPrice?: any
      }
    | null
    | undefined
  /** servizi selezionati, già risolti con il loro anagrafica */
  servizi: Array<{
    name: string
    price: any
    unit?: string | null
    quantity?: number | null
    optionName?: string | null
  }>
  /** dolce: descrizione + prezzo già risolto (null = non determinabile) */
  dolce?: { descrizione: string; prezzo: number | null } | null
}

const num = (v: any): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."))
  return isFinite(n) ? n : 0
}

/** Arrotonda ai centesimi, evitando gli strascichi in virgola mobile. */
export const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * Calcola il preventivo. Funzione PURA: stesso input → stesso output,
 * così client e server non possono divergere.
 */
export function calcolaPreventivo(input: InputPreventivo): Preventivo {
  const righe: RigaPreventivo[] = []
  const weekend = input.date ? isWeekendOFestivo(input.date as any) : false

  // 1) Pacchetto
  const pkg = input.pacchetto
  if (pkg) {
    const prezzo = num(weekend ? pkg.weekendPrice : pkg.ferialePrice)
    righe.push({
      tipo: "pacchetto",
      descrizione: `${pkg.name} (${weekend ? "weekend/festivo" : "feriale"})`,
      quantita: 1,
      prezzoUnitario: prezzo,
      subtotale: prezzo,
    })

    // 2) Invitati oltre la soglia inclusa
    const base = pkg.baseGuests ?? 15
    const extraPrice = num(pkg.extraGuestPrice)
    const ospiti = parseInt(String(input.estimatedGuests ?? "")) || 0
    const extra = Math.max(0, ospiti - base)
    if (extra > 0 && extraPrice > 0) {
      righe.push({
        tipo: "extra-ospiti",
        descrizione: `Invitati extra (oltre i ${base})`,
        quantita: extra,
        prezzoUnitario: extraPrice,
        subtotale: round2(extra * extraPrice),
      })
    }
  }

  // 3) Servizi aggiuntivi
  for (const s of input.servizi || []) {
    const prezzoUnitario = num(s.price)
    const qty = s.unit ? num(s.quantity) || 1 : 1
    const nome = s.optionName ? `${s.name}: ${s.optionName}` : s.name
    const descrizione = s.unit
      ? `${nome} — ${formatQty(qty)} ${unitLabel(s.unit, qty)}`
      : nome
    righe.push({
      tipo: "servizio",
      descrizione,
      quantita: qty,
      prezzoUnitario,
      subtotale: round2(prezzoUnitario * qty),
      daConcordare: prezzoUnitario === 0,
    })
  }

  // 4) Dolce
  if (input.dolce) {
    righe.push({
      tipo: "dolce",
      descrizione: `Dolce: ${input.dolce.descrizione}`,
      quantita: 1,
      prezzoUnitario: input.dolce.prezzo ?? 0,
      subtotale: input.dolce.prezzo ?? 0,
      daConcordare: input.dolce.prezzo === null,
    })
  }

  const totale = round2(righe.reduce((s, r) => s + r.subtotale, 0))
  const parziale = righe.some((r) => r.daConcordare)

  return { righe, totale, parziale, weekend }
}

/**
 * Ricostruisce l'input del preventivo a partire da una festa letta dal
 * database (con package e additionalServices inclusi). Usata dal server per
 * congelare il prezzo e per ricalcolarlo.
 */
export function preventivoDaFesta(party: any, dolcePrezzo: number | null = null): Preventivo {
  return calcolaPreventivo({
    date: party.date,
    estimatedGuests: party.estimatedGuests,
    pacchetto: party.package,
    servizi: (party.additionalServices || []).map((ps: any) => ({
      name: ps.service?.name ?? "",
      price: ps.service?.price ?? 0,
      unit: ps.service?.unit ?? null,
      quantity: ps.quantity ?? 1,
      optionName: ps.option?.name ?? null,
    })),
    dolce: party.cake
      ? { descrizione: party.cake, prezzo: dolcePrezzo }
      : null,
  })
}

/**
 * Prezzo del dolce dal testo salvato nel campo `cake`.
 * Formati: "Panino alla Nutella a forma di numero" (fisso),
 *          "Torta di pasticceria — 2,5 kg — cioccolato" (al kg),
 *          "La porto io" (gratis).
 * Restituisce null quando il prezzo non è determinabile (kg non indicati).
 */
export const PREZZO_PANINO_NUTELLA = 35
export const PREZZO_TORTA_AL_KG = 35

export function prezzoDolce(cake: string | null | undefined): number | null {
  const c = (cake || "").trim()
  if (!c) return 0
  if (/^La porto io/i.test(c)) return 0
  if (/^Panino alla Nutella/i.test(c)) return PREZZO_PANINO_NUTELLA
  if (/^Torta di pasticceria/i.test(c)) {
    const m = c.match(/([\d.,]+)\s*kg/i)
    if (!m) return null // peso non indicato: non calcolabile
    const kg = parseFloat(m[1].replace(",", "."))
    if (!isFinite(kg) || kg <= 0) return null
    return round2(kg * PREZZO_TORTA_AL_KG)
  }
  return null
}
