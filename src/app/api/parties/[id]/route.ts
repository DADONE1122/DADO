import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth-helpers"

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

  // Status transition: check if all detail fields are filled -> allow COMPLETE
  if (body.status !== undefined) {
    if (body.status === "COMPLETE") {
      // Check all detail fields are present
      const detailFields = {
        celebrationName: updateData.celebrationName ?? party.celebrationName,
        age: updateData.age ?? party.age,
        parentName: updateData.parentName ?? party.parentName,
        parentPhone: updateData.parentPhone ?? party.parentPhone,
        cake: updateData.cake ?? party.cake,
        allergies: updateData.allergies ?? party.allergies,
        decorationTheme: updateData.decorationTheme ?? party.decorationTheme,
        specialRequests: updateData.specialRequests ?? party.specialRequests,
      }

      const allFilled = Object.values(detailFields).every(
        (v) => v !== null && v !== undefined && v !== ""
      )

      if (!allFilled) {
        return NextResponse.json(
          { error: "Compila tutti i dettagli prima di completare la festa" },
          { status: 400 }
        )
      }
    }
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