import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"
import { checkSlotCapacity } from "@/lib/slot-capacity"
import {
  normalizeSelections,
  assertOptionsAvailable,
  createPartyServices,
} from "@/lib/service-selections"

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

  // Validazione esplicita: meglio un messaggio chiaro che un 500 generico.
  const mancanti: string[] = []
  if (!date) mancanti.push("data")
  if (!slot) mancanti.push("slot")
  if (!body.packageId) mancanti.push("pacchetto")
  if (!String(body.celebrationName ?? "").trim())
    mancanti.push("nome del festeggiato")
  if (!String(body.parentName ?? "").trim()) mancanti.push("nome del genitore")
  if (!String(body.parentPhone ?? "").trim())
    mancanti.push("telefono del genitore")

  const guests = parseInt(body.estimatedGuests)
  if (!Number.isFinite(guests) || guests <= 0) mancanti.push("numero di bambini")

  const age = parseInt(body.age)
  if (!Number.isFinite(age) || age < 0) mancanti.push("età del festeggiato")

  if (mancanti.length > 0) {
    return NextResponse.json(
      { error: `Dati mancanti o non validi: ${mancanti.join(", ")}` },
      { status: 400 }
    )
  }

  const partyDate = new Date(date)
  if (isNaN(partyDate.getTime())) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 })
  }

  const selections = normalizeSelections(body)

  try {
    // Single transaction: check capacity (with advisory lock) + create party
    const result = await prisma.$transaction(async (tx) => {
      await checkSlotCapacity(tx, partyDate, slot)
      await assertOptionsAvailable(tx, selections, partyDate)

      const party = await tx.party.create({
        data: {
          parentName: body.parentName,
          parentPhone: body.parentPhone,
          celebrationName: body.celebrationName,
          age,
          date: partyDate,
          slot: slot as any,
          packageId: body.packageId,
          estimatedGuests: guests,
          depositReceived: body.depositReceived || false,
          depositAmount: body.depositAmount ? parseFloat(body.depositAmount) : null,
          depositMethod: body.depositMethod || null,
          cake: body.cake || null,
          specialRequests: body.specialRequests || null,
          internalNotes: body.internalNotes || null,
          status: "PENDING_DETAILS",
        },
        include: {
          package: true,
        },
      })

      // Add additional services (with optional per-day exclusive options)
      await createPartyServices(tx, party.id, selections)

      return party
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (
      error.message === "Slot al completo per questa data" ||
      error.message?.includes("già prenotata")
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error creating party:", error)
    return NextResponse.json(
      { error: "Errore durante la creazione della festa" },
      { status: 500 }
    )
  }
}
