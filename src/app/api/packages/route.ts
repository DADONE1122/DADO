import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/packages?all=true
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

  const packages = await prisma.package.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(packages)
}

function validatePackage(body: any): string | null {
  if (!body.name || body.name.trim().length === 0) {
    return "Il nome è obbligatorio"
  }

  const ferialePrice = parseFloat(body.ferialePrice)
  if (isNaN(ferialePrice) || ferialePrice < 0) {
    return "Il prezzo feriale deve essere un numero >= 0"
  }

  const weekendPrice = parseFloat(body.weekendPrice)
  if (isNaN(weekendPrice) || weekendPrice < 0) {
    return "Il prezzo weekend deve essere un numero >= 0"
  }

  return null
}

// POST /api/packages
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const error = validatePackage(body)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const pkg = await prisma.package.create({
    data: {
      name: body.name.trim(),
      ferialePrice: parseFloat(body.ferialePrice),
      weekendPrice: parseFloat(body.weekendPrice),
      isActive: body.isActive ?? true,
    },
  })

  return NextResponse.json(pkg, { status: 201 })
}

// PUT /api/packages
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 })
  }

  const validationError = validatePackage(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const pkg = await prisma.package.update({
    where: { id: body.id },
    data: {
      name: body.name.trim(),
      ferialePrice: parseFloat(body.ferialePrice),
      weekendPrice: parseFloat(body.weekendPrice),
      isActive: body.isActive,
    },
  })

  return NextResponse.json(pkg)
}