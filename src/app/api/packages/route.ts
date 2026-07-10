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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const pkg = await prisma.package.create({
    data: {
      name: body.name,
      ferialePrice: parseFloat(body.ferialePrice),
      weekendPrice: parseFloat(body.weekendPrice),
      isActive: body.isActive ?? true,
    },
  })

  return NextResponse.json(pkg, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const pkg = await prisma.package.update({
    where: { id: body.id },
    data: {
      name: body.name,
      ferialePrice: body.ferialePrice ? parseFloat(body.ferialePrice) : undefined,
      weekendPrice: body.weekendPrice ? parseFloat(body.weekendPrice) : undefined,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(pkg)
}