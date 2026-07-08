import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

// GET /api/parties?date=YYYY-MM-DD&slot=MORNING|AFTERNOON
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const slot = searchParams.get("slot")

  const where: any = {}
  if (date) {
    const dateObj = new Date(date)
    where.date = dateObj
  }
  if (slot) {
    where.slot = slot
  }

  const parties = await prisma.party.findMany({
    where,
    include: {
      package: true,
      additionalServices: {
        include: { service: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(parties)
}

// POST /api/parties
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { date, slot } = body

  if (!date || !slot) {
    return NextResponse.json(
      { error: "Data e slot sono obbligatori" },
      { status: 400 }
    )
  }

  const partyDate = new Date(date)
  const slotKey = `${partyDate.toISOString().split("T")[0]}-${slot}`

  // Use PostgreSQL advisory lock for race condition prevention
  // Hash the slotKey to a bigint for pg_advisory_xact_lock
  const lockId = hashStringToBigInt(slotKey)

  try {
    // Execute in transaction with advisory lock
    const result = await prisma.$transaction(async (tx) => {
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
      const existingCount = await tx.party.count({
        where: {
          date: partyDate,
          slot: slot as any,
          status: { not: "CANCELLED" },
        },
      })

      if (existingCount >= slotConfig.maxParties) {
        throw new Error("Slot al completo per questa data")
      }

      // Create the party
      const party = await tx.party.create({
        data: {
          parentName: body.parentName,
          parentPhone: body.parentPhone,
          celebrationName: body.celebrationName,
          age: parseInt(body.age),
          date: partyDate,
          slot: slot as any,
          packageId: body.packageId,
          estimatedGuests: parseInt(body.estimatedGuests),
          depositReceived: body.depositReceived || false,
          depositAmount: body.depositAmount ? parseFloat(body.depositAmount) : null,
          depositMethod: body.depositMethod || null,
          status: "PENDING_DETAILS",
        },
        include: {
          package: true,
        },
      })

      // Add additional services if provided
      if (body.serviceIds && Array.isArray(body.serviceIds)) {
        for (const serviceId of body.serviceIds) {
          await tx.partyService.create({
            data: {
              partyId: party.id,
              serviceId,
            },
          })
        }
      }

      return party
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (error.message === "Slot al completo per questa data") {
      return NextResponse.json(
        { error: "Slot al completo per questa data" },
        { status: 409 }
      )
    }
    console.error("Error creating party:", error)
    return NextResponse.json(
      { error: "Errore durante la creazione della festa" },
      { status: 500 }
    )
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