// Helpers for party service selections with per-day exclusive options
// (e.g. "Sfondo fotografico: Unicorni" can be used by only one party per date).

export type ServiceSelection = {
  serviceId: string
  optionId?: string | null
  quantity?: number
  note?: string | null
}

// Quantità valida: numero positivo, max 2 decimali (per i kg di torta), con
// tetto di sicurezza. Qualsiasi valore non valido torna a 1.
export function safeQuantity(raw: any): number {
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw ?? "").replace(",", "."))
  if (!isFinite(n) || n <= 0) return 1
  return Math.min(Math.round(n * 100) / 100, 999)
}

// Accepts either body.serviceSelections ([{serviceId, optionId, quantity}]) or
// the legacy body.serviceIds (string[]) and returns a normalized list.
export function normalizeSelections(body: any): ServiceSelection[] {
  if (Array.isArray(body.serviceSelections)) {
    return body.serviceSelections
      .filter((s: any) => s && s.serviceId)
      .map((s: any) => ({
        serviceId: String(s.serviceId),
        optionId: s.optionId ? String(s.optionId) : null,
        quantity: safeQuantity(s.quantity),
        note: s.note ? String(s.note).slice(0, 500) : null,
      }))
  }
  if (Array.isArray(body.serviceIds)) {
    return body.serviceIds
      .filter(Boolean)
      .map((id: any) => ({ serviceId: String(id), optionId: null, quantity: 1, note: null }))
  }
  return []
}

// Throws Error with a user-facing message if an exclusive-per-day option is
// already taken by another non-cancelled party on the same date.
// Works with either the prisma client or a transaction client (tx).
export async function assertOptionsAvailable(
  db: any,
  selections: ServiceSelection[],
  date: Date,
  excludePartyId?: string
) {
  const withOption = selections.filter((s) => s.optionId)
  for (const sel of withOption) {
    const service = await db.additionalService.findUnique({
      where: { id: sel.serviceId },
      select: { exclusivePerDay: true, name: true },
    })
    if (!service?.exclusivePerDay) continue

    const partyWhere: any = { date, status: { not: "CANCELLED" } }
    if (excludePartyId) partyWhere.id = { not: excludePartyId }

    const clash = await db.partyService.findFirst({
      where: { optionId: sel.optionId, party: partyWhere },
      include: { option: true },
    })
    if (clash) {
      const optName = clash.option?.name || "scelta"
      throw new Error(
        `L'opzione "${optName}" (${service.name}) è già prenotata da un'altra festa in questa data`
      )
    }
  }
}

// Creates the partyService rows inside the given client (prisma or tx).
export async function createPartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  for (const sel of selections) {
    await db.partyService.create({
      data: {
        partyId,
        serviceId: sel.serviceId,
        optionId: sel.optionId || null,
        quantity: safeQuantity(sel.quantity),
        note: sel.note || null,
      },
    })
  }
}

// Replaces all partyService rows for a party.
export async function replacePartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  await db.partyService.deleteMany({ where: { partyId } })
  await createPartyServices(db, partyId, selections)
}
// Helpers for party service selections with per-day exclusive options
// (e.g. "Sfondo fotografico: Unicorni" can be used by only one party per date).

export type ServiceSelection = {
  serviceId: string
  optionId?: string | null
  quantity?: number
  note?: string | null
}

// Quantità valida: numero positivo, max 2 decimali (per i kg di torta), con
// tetto di sicurezza. Qualsiasi valore non valido torna a 1.
export function safeQuantity(raw: any): number {
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw ?? "").replace(",", "."))
  if (!isFinite(n) || n <= 0) return 1
  return Math.min(Math.round(n * 100) / 100, 999)
}

// Accepts either body.serviceSelections ([{serviceId, optionId, quantity}]) or
// the legacy body.serviceIds (string[]) and returns a normalized list.
export function normalizeSelections(body: any): ServiceSelection[] {
  if (Array.isArray(body.serviceSelections)) {
    return body.serviceSelections
      .filter((s: any) => s && s.serviceId)
      .map((s: any) => ({
        serviceId: String(s.serviceId),
        optionId: s.optionId ? String(s.optionId) : null,
        quantity: safeQuantity(s.quantity),
        note: s.note ? String(s.note).slice(0, 500) : null,
      }))
  }
  if (Array.isArray(body.serviceIds)) {
    return body.serviceIds
      .filter(Boolean)
      .map((id: any) => ({ serviceId: String(id), optionId: null, quantity: 1, note: null }))
  }
  return []
}

// Throws Error with a user-facing message if an exclusive-per-day option is
// already taken by another non-cancelled party on the same date.
// Works with either the prisma client or a transaction client (tx).
export async function assertOptionsAvailable(
  db: any,
  selections: ServiceSelection[],
  date: Date,
  excludePartyId?: string
) {
  const withOption = selections.filter((s) => s.optionId)
  for (const sel of withOption) {
    const service = await db.additionalService.findUnique({
      where: { id: sel.serviceId },
      select: { exclusivePerDay: true, name: true },
    })
    if (!service?.exclusivePerDay) continue

    const partyWhere: any = { date, status: { not: "CANCELLED" } }
    if (excludePartyId) partyWhere.id = { not: excludePartyId }

    const clash = await db.partyService.findFirst({
      where: { optionId: sel.optionId, party: partyWhere },
      include: { option: true },
    })
    if (clash) {
      const optName = clash.option?.name || "scelta"
      throw new Error(
        `L'opzione "${optName}" (${service.name}) è già prenotata da un'altra festa in questa data`
      )
    }
  }
}

// Creates the partyService rows inside the given client (prisma or tx).
export async function createPartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  for (const sel of selections) {
    await db.partyService.create({
      data: {
        partyId,
        serviceId: sel.serviceId,
        optionId: sel.optionId || null,
        quantity: safeQuantity(sel.quantity),
        note: sel.note || null,
      },
    })
  }
}

// Replaces all partyService rows for a party.
export async function replacePartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  await db.partyService.deleteMany({ where: { partyId } })
  await createPartyServices(db, partyId, selections)
}
// Helpers for party service selections with per-day exclusive options
// (e.g. "Sfondo fotografico: Unicorni" can be used by only one party per date).

export type ServiceSelection = { serviceId: string; optionId?: string | null }

// Accepts either body.serviceSelections ([{serviceId, optionId}]) or the
// legacy body.serviceIds (string[]) and returns a normalized list.
export function normalizeSelections(body: any): ServiceSelection[] {
  if (Array.isArray(body.serviceSelections)) {
    return body.serviceSelections
      .filter((s: any) => s && s.serviceId)
      .map((s: any) => ({
        serviceId: String(s.serviceId),
        optionId: s.optionId ? String(s.optionId) : null,
      }))
  }
  if (Array.isArray(body.serviceIds)) {
    return body.serviceIds
      .filter(Boolean)
      .map((id: any) => ({ serviceId: String(id), optionId: null }))
  }
  return []
}

// Throws Error with a user-facing message if an exclusive-per-day option is
// already taken by another non-cancelled party on the same date.
// Works with either the prisma client or a transaction client (tx).
export async function assertOptionsAvailable(
  db: any,
  selections: ServiceSelection[],
  date: Date,
  excludePartyId?: string
) {
  const withOption = selections.filter((s) => s.optionId)
  for (const sel of withOption) {
    const service = await db.additionalService.findUnique({
      where: { id: sel.serviceId },
      select: { exclusivePerDay: true, name: true },
    })
    if (!service?.exclusivePerDay) continue

    const partyWhere: any = { date, status: { not: "CANCELLED" } }
    if (excludePartyId) partyWhere.id = { not: excludePartyId }

    const clash = await db.partyService.findFirst({
      where: { optionId: sel.optionId, party: partyWhere },
      include: { option: true },
    })
    if (clash) {
      const optName = clash.option?.name || "scelta"
      throw new Error(
        `L'opzione "${optName}" (${service.name}) è già prenotata da un'altra festa in questa data`
      )
    }
  }
}

// Creates the partyService rows inside the given client (prisma or tx).
export async function createPartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  for (const sel of selections) {
    await db.partyService.create({
      data: {
        partyId,
        serviceId: sel.serviceId,
        optionId: sel.optionId || null,
      },
    })
  }
}

// Replaces all partyService rows for a party.
export async function replacePartyServices(
  db: any,
  partyId: string,
  selections: ServiceSelection[]
) {
  await db.partyService.deleteMany({ where: { partyId } })
  await createPartyServices(db, partyId, selections)
}
