import { NextRequest, NextResponse } from "next/server"
import { getPendingParties, buildSollecitiEmailBody } from "@/lib/solleciti"
import { prisma } from "@/lib/prisma"
import { resend } from "@/lib/resend"

// POST /api/cron/solleciti
// Vercel Cron job that runs every morning
// Protected by CRON_SECRET — Vercel Cron sends Authorization: Bearer CRON_SECRET
export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    // Get pending parties with the same logic as the dashboard page
    const parties = await getPendingParties()

    if (parties.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nessuna festa con dettagli mancanti nei prossimi 5 giorni",
        sent: 0,
      })
    }

    // Get all OWNER emails to send the notification
    const owners = await prisma.user.findMany({
      where: { role: "OWNER" },
      select: { email: true },
    })

    if (owners.length === 0) {
      return NextResponse.json(
        { error: "Nessun proprietario trovato" },
        { status: 500 }
      )
    }

    const ownerEmails = owners.map((o) => o.email)
    const emailBody = buildSollecitiEmailBody(parties)

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@pitopitu.it",
      to: ownerEmails,
      subject: `📋 ${parties.length} feste con dettagli mancanti — Pito Pitù`,
      html: emailBody,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: "Errore nell'invio dell'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email inviata a ${ownerEmails.length} proprietari per ${parties.length} feste`,
      sent: parties.length,
      emailId: data?.id,
    })
  } catch (error) {
    console.error("Cron solleciti error:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}