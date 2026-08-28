// Formattazione delle unità di misura dei servizi (a persona, al kg, ...).
// Sta qui perché la usano il form, il foglio staff e l'export contabile:
// se la logica fosse duplicata, i tre punti finirebbero per divergere.

const PLURALI: Record<string, string> = {
  persona: "persone",
  pezzo: "pezzi",
  tavolo: "tavoli",
  bottiglia: "bottiglie",
  tazzina: "tazzine",
  teglia: "teglie",
  caraffa: "caraffe",
  pizza: "pizze",
  festeggiato: "festeggiati",
  kg: "kg",
  ora: "ore",
}

/** "persona" + 8 → "persone"; "kg" + 2,5 → "kg" */
export function unitLabel(unit: string | null | undefined, qty: number): string {
  if (!unit) return ""
  return qty === 1 ? unit : PLURALI[unit] || unit
}

/** 8 → "8"; 2.5 → "2,5"; 2.00 → "2" */
export function formatQty(qty: number): string {
  return String(qty).replace(/\.0+$/, "").replace(".", ",")
}

/**
 * Etichetta compatta per una riga di servizio prenotato.
 * Es. "Giropizza adulti — 8 persone", "Sfondo: Dinosauri"
 */
export function serviceLabel(ps: {
  quantity?: any
  note?: string | null
  service: { name: string; unit?: string | null }
  option?: { name: string } | null
}): string {
  const qty = Number(ps.quantity ?? 1) || 1
  let s = ps.option ? `${ps.service.name}: ${ps.option.name}` : ps.service.name
  if (ps.service?.unit && qty !== 1) {
    s += ` — ${formatQty(qty)} ${unitLabel(ps.service.unit, qty)}`
  }
  // L'appunto (gusto, tema, testo del topper) serve a chi prepara: va mostrato
  const nota = (ps.note || "").trim()
  if (nota) s += ` (${nota})`
  return s
}
