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
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      options: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  })

  return NextResponse.json(services)
}

// Sync ServiceOption rows for a service from a list of names.
// Creates new names, reactivates matches, deactivates removed ones
// (soft delete: options may be referenced by existing parties).
async function syncOptions(serviceId: string, optionNames: string[]) {
  const names = optionNames.map((n) => n.trim()).filter(Boolean)
  const existing = await prisma.serviceOption.findMany({ where: { serviceId } })

  for (const name of names) {
    const match = existing.find(
      (o) => o.name.toLowerCase() === name.toLowerCase()
    )
    if (match) {
      if (!match.isActive) {
        await prisma.serviceOption.update({
          where: { id: match.id },
          data: { isActive: true, name },
        })
      }
    } else {
      await prisma.serviceOption.create({ data: { serviceId, name } })
    }
  }
  // Deactivate options no longer in the list
  for (const opt of existing) {
    const still = names.some((n) => n.toLowerCase() === opt.name.toLowerCase())
    if (!still && opt.isActive) {
      await prisma.serviceOption.update({
        where: { id: opt.id },
        data: { isActive: false },
      })
    }
  }
  await prisma.additionalService.update({
    where: { id: serviceId },
    data: { hasOptions: names.length > 0 },
  })
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
      category: body.category?.trim() || null,
      priceNote: body.priceNote?.trim() || null,
      exclusivePerDay: body.exclusivePerDay === true,
      isActive: true,
    },
  })

  if (Array.isArray(body.options)) {
    await syncOptions(service.id, body.options)
  }

  const full = await prisma.additionalService.findUnique({
    where: { id: service.id },
    include: { options: { where: { isActive: true } } },
  })

  return NextResponse.json(full, { status: 201 })
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
  if (body.category !== undefined) updateData.category = body.category?.trim() || null
  if (body.priceNote !== undefined) updateData.priceNote = body.priceNote?.trim() || null
  if (body.exclusivePerDay !== undefined) updateData.exclusivePerDay = body.exclusivePerDay === true

  const service = await prisma.additionalService.update({
    where: { id },
    data: updateData,
  })

  if (Array.isArray(body.options)) {
    await syncOptions(id, body.options)
  }

  const full = await prisma.additionalService.findUnique({
    where: { id },
    include: { options: { where: { isActive: true } } },
  })

  return NextResponse.json(full)
}
