import { prisma } from "@/lib/prisma"
import { PartyStatus } from "@prisma/client"

export type SollecitoParty = {
  id: string
  celebrationName: string
  parentName: string
  parentPhone: string
  date: Date
  slot: string
  daysRemaining: number
}

/**
 * Query parties with PENDING_DETAILS status whose date is within the next 5 days (inclusive).
 * Excludes past dates (date < today) and CANCELLED parties.
 * Returns result sorted by date ascending.
 *
 * This is the canonical query used by BOTH the cron job and the /dashboard/solleciti page.
 * Window logic: date >= today AND date <= today + 5 days
 */
export async function getPendingParties(): Promise<SollecitoParty[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fiveDaysFromNow = new Date(today)
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

  const parties = await prisma.party.findMany({
    where: {
      status: "PENDING_DETAILS" as PartyStatus,
      date: {
        gte: today,
        lte: fiveDaysFromNow,
      },
    },
    orderBy: { date: "asc" },
  })

  return parties.map((party) => {
    const diffTime = party.date.getTime() - today.getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      id: party.id,
      celebrationName: party.celebrationName,
      parentName: party.parentName,
      parentPhone: party.parentPhone,
      date: party.date,
      slot: party.slot === "MORNING" ? "Mattina" : "Pomeriggio",
      daysRemaining,
    }
  })
}

/**
 * Build an HTML email body for the solleciti reminder.
 */
export function buildSollecitiEmailBody(parties: SollecitoParty[]): string {
  const rows = parties
    .map(
      (p) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.celebrationName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.parentName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.parentPhone}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.date.toLocaleDateString("it-IT")}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.slot}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${p.daysRemaining <= 1 ? "#dc2626" : "#d97706"};">${p.daysRemaining}</td>
    </tr>`
    )
    .join("\n")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e40af;">📋 Solleciti Feste — Pito Pitù</h1>
  <p>Buongiorno,</p>
  <p>le seguenti feste hanno ancora dettagli mancanti (${parties.length} feste in attesa):</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Bambino</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Genitore</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Telefono</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Data</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Slot</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Giorni</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p style="color: #666; font-size: 14px;">Questa email viene inviata automaticamente ogni mattina per le feste in programma nei prossimi 5 giorni.</p>
  <p style="color: #666; font-size: 14px;">Collegati al gestionale per inserire i dettagli mancanti:
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pitopitu.vercel.app"}/dashboard/solleciti">Vedi solleciti</a>
  </p>
</body>
</html>`
}