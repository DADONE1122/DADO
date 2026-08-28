import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

// GET /api/users
export async function GET() {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users)
}

// POST /api/users
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { email, name, role } = body

  // Validation
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 })
  }

  if (!role || !["OWNER", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 })
  }

  // Check unique email
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email già registrata" }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      role: role as any,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}

// PUT /api/users
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { id, name, role } = body

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 })
  }

  // Protection: OWNER cannot declassify themselves
  const currentUser = await prisma.user.findUnique({ where: { id } })
  if (!currentUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
  }

  if (session.user?.id === id && role && role !== "OWNER") {
    return NextResponse.json(
      { error: "Non puoi rimuovere il ruolo OWNER a te stesso" },
      { status: 403 }
    )
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name?.trim() || null
  if (role !== undefined) {
    if (!["OWNER", "STAFF"].includes(role)) {
      return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 })
    }
    updateData.role = role
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/users?id=xxx
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 })
  }

  // Protection 1: OWNER cannot delete themselves
  if (session.user?.id === id) {
    return NextResponse.json(
      { error: "Non puoi eliminare te stesso" },
      { status: 403 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
  }

  // Protection 2: must remain at least one OWNER
  if (user.role === "OWNER") {
    const ownerCount = await prisma.user.count({ where: { role: "OWNER" } })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Deve rimanere almeno un proprietario" },
        { status: 403 }
      )
    }
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}