import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/services?all=true
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const showAll = searchParams.get("all") === "true"

  const where: any = {}
  if (!showAll) {
    where.isActive = true
  }

  const services = await prisma.additionalService.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(services)
}

// POST /api/services
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { name, price } = body

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Il nome è obbligatorio" }, { status: 400 })
  }

  const priceNum = parseFloat(price)
  if (isNaN(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Il prezzo deve essere un numero >= 0" }, { status: 400 })
  }

  const service = await prisma.additionalService.create({
    data: {
      name: name.trim(),
      price: priceNum,
      isActive: true,
    },
  })

  return NextResponse.json(service, { status: 201 })
}

// PUT /api/services
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { id, name, price, isActive } = body

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 })
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name.trim()
  if (price !== undefined) {
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Il prezzo deve essere un numero >= 0" }, { status: 400 })
    }
    updateData.price = priceNum
  }
  if (isActive !== undefined) updateData.isActive = isActive

  const service = await prisma.additionalService.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(service)
}