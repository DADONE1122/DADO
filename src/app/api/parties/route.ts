import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"
import { checkSlotCapacity } from "@/lib/slot-capacity"

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

  try {
    // Single transaction: check capacity (with advisory lock) + create party
    const result = await prisma.$transaction(async (tx) => {
      await checkSlotCapacity(tx, partyDate, slot)

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
          cake: body.cake || null,
          specialRequests: body.specialRequests || null,
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
