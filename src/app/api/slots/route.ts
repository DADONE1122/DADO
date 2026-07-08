import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

// GET /api/slots
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const slots = await prisma.slotConfig.findMany()
  return NextResponse.json(slots)
}

// PUT /api/slots
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { id, maxParties, startTime, endTime } = body

  const slot = await prisma.slotConfig.update({
    where: { id },
    data: {
      ...(maxParties !== undefined && { maxParties }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
    },
  })

  return NextResponse.json(slot)
}