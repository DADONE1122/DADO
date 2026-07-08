import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth-helpers"
import { checkSlotCapacity } from "@/lib/slot-capacity"

// GET /api/parties/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: {
      package: true,
      additionalServices: {
        include: { service: true },
      },
    },
  })

  if (!party) {
    return NextResponse.json({ error: "Festa non trovata" }, { status: 404 })
  }

  return NextResponse.json(party)
}

// PUT /api/parties/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const party = await prisma.party.findUnique({
    where: { id: params.id },
  })

  if (!party) {
    return NextResponse.json({ error: "Festa non trovata" }, { status: 404 })
  }

  // Check if date or slot is changing — if so, verify capacity on the new slot
  const newDate = body.date !== undefined ? new Date(body.date) : party.date
  const newSlot = body.slot !== undefined ? body.slot : party.slot
  const dateChanged = body.date !== undefined
  const slotChanged = body.slot !== undefined

  if (dateChanged || slotChanged) {
    try {
      // Check slot capacity excluding this party itself
      await checkSlotCapacity(newDate, newSlot as string, params.id)
    } catch (error: any) {
      if (error.message === "Slot al completo per questa data") {
        return NextResponse.json(
          { error: "Slot al completo per questa data" },
          { status: 409 }
        )
      }
      throw error
    }
  }

  // Build update data
  const updateData: any = {}

  // Blocco data fields
  if (body.date !== undefined) updateData.date = new Date(body.date)
  if (body.slot !== undefined) updateData.slot = body.slot
  if (body.packageId !== undefined) updateData.packageId = body.packageId
  if (body.estimatedGuests !== undefined) updateData.estimatedGuests = parseInt(body.estimatedGuests)
  if (body.depositReceived !== undefined) updateData.depositReceived = body.depositReceived
  if (body.depositAmount !== undefined) updateData.depositAmount = body.depositAmount ? parseFloat(body.depositAmount) : null
  if (body.depositMethod !== undefined) updateData.depositMethod = body.depositMethod || null

  // Dettagli fields
  if (body.celebrationName !== undefined) updateData.celebrationName = body.celebrationName
  if (body.age !== undefined) updateData.age = parseInt(body.age)
  if (body.parentName !== undefined) updateData.parentName = body.parentName
  if (body.parentPhone !== undefined) updateData.parentPhone = body.parentPhone
  if (body.cake !== undefined) updateData.cake = body.cake
  if (body.allergies !== undefined) updateData.allergies = body.allergies
  if (body.decorationTheme !== undefined) updateData.decorationTheme = body.decorationTheme
  if (body.specialRequests !== undefined) updateData.specialRequests = body.specialRequests

  // Status transition to COMPLETE: only "cake" is required
  if (body.status === "COMPLETE") {
    const cakeValue = updateData.cake !== undefined ? updateData.cake : party.cake
    if (!cakeValue || cakeValue.trim() === "") {
      return NextResponse.json(
        { error: "Il campo 'torta' è obbligatorio per completare la festa" },
        { status: 400 }
      )
    }
    updateData.status = "COMPLETE"
  } else if (body.status !== undefined) {
    updateData.status = body.status
  }

  const updatedParty = await prisma.party.update({
    where: { id: params.id },
    data: updateData,
    include: {
      package: true,
      additionalServices: {
        include: { service: true },
      },
    },
  })

  return NextResponse.json(updatedParty)
}

// DELETE /api/parties/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  await prisma.party.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  })

  return NextResponse.json({ success: true })
}