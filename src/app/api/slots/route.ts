import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/slots
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const slots = await prisma.slotConfig.findMany()
  return NextResponse.json(slots)
}

function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

// PUT /api/slots
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { id, maxParties, startTime, endTime } = body

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 })
  }

  // Validation
  if (maxParties !== undefined) {
    const maxPartiesInt = parseInt(maxParties)
    if (isNaN(maxPartiesInt) || maxPartiesInt < 1) {
      return NextResponse.json(
        { error: "maxParties deve essere un numero intero >= 1" },
        { status: 400 }
      )
    }
  }

  if (startTime !== undefined && !isValidTimeFormat(startTime)) {
    return NextResponse.json(
      { error: "Formato orario non valido per startTime (usa HH:mm)" },
      { status: 400 }
    )
  }

  if (endTime !== undefined && !isValidTimeFormat(endTime)) {
    return NextResponse.json(
      { error: "Formato orario non valido per endTime (usa HH:mm)" },
      { status: 400 }
    )
  }

  // Get the slot to find its slot enum value
  const slotConfig = await prisma.slotConfig.findUnique({
    where: { id },
  })

  if (!slotConfig) {
    return NextResponse.json({ error: "Slot non trovato" }, { status: 404 })
  }

  // Check if new maxParties < existing non-CANCELLED bookings for future dates
  let warning: string | null = null
  if (maxParties !== undefined) {
    const maxPartiesInt = parseInt(maxParties)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingCount = await prisma.party.count({
      where: {
        slot: slotConfig.slot as any,
        status: { not: "CANCELLED" },
        date: { gte: today },
      },
    })

    if (existingCount > maxPartiesInt) {
      warning = `Attenzione: ci sono già ${existingCount} feste prenotate in questo slot. Il nuovo limite (${maxPartiesInt}) si applica solo alle prossime prenotazioni, le feste esistenti non vengono modificate.`
    }
  }

  const slot = await prisma.slotConfig.update({
    where: { id },
    data: {
      ...(maxParties !== undefined && { maxParties: parseInt(maxParties) }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
    },
  })

  // Return the slot with optional warning
  const result: any = { ...slot }
  if (warning) {
    result.warning = warning
  }

  return NextResponse.json(result)
}