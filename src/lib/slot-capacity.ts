import { PrismaClient } from "@prisma/client"

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

/**
 * Acquires a PostgreSQL advisory lock for a date+slot combination
 * and checks if the slot has capacity for new non-CANCELLED parties.
 *
 * @param tx - Prisma transaction client
 * @param date - The party date
 * @param slot - MORNING or AFTERNOON
 * @param excludePartyId - Optional party ID to exclude from count (for updates)
 * @throws "Slot al completo per questa data" if at capacity
 * @throws "Configurazione slot non trovata" if slot config missing
 */
export async function checkSlotCapacity(
  tx: PrismaTransactionClient,
  date: Date,
  slot: string,
  excludePartyId?: string
): Promise<void> {
  const slotKey = `${date.toISOString().split("T")[0]}-${slot}`
  const lockId = hashStringToBigInt(slotKey)

  // Acquire advisory lock (xact lock auto-releases on commit/rollback)
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockId})`)

  // Get slot config
  const slotConfig = await tx.slotConfig.findUnique({
    where: { slot: slot as any },
  })

  if (!slotConfig) {
    throw new Error("Configurazione slot non trovata")
  }

  // Count existing non-CANCELLED parties for this date and slot
  const where: any = {
    date,
    slot: slot as any,
    status: { not: "CANCELLED" },
  }

  // Exclude the current party when updating
  if (excludePartyId) {
    where.id = { not: excludePartyId }
  }

  const existingCount = await tx.party.count({ where })

  if (existingCount >= slotConfig.maxParties) {
    throw new Error("Slot al completo per questa data")
  }
}

function hashStringToBigInt(str: string): bigint {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to positive bigint
  return BigInt(Math.abs(hash))
}