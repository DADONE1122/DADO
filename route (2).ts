import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/listino — public, returns the full listino data
export async function GET() {
  const [packages, services, content] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.additionalService.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.listinoContent.findUnique({
      where: { id: "singleton" },
    }),
  ])

  return NextResponse.json({ packages, services, content })
}

// PUT /api/listino — OWNER only, updates editorial content
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const body = await request.json()
  const { titolo, sottotitolo, note, numeroWhatsapp } = body

  // Validation
  if (!titolo || titolo.trim().length === 0) {
    return NextResponse.json({ error: "Il titolo è obbligatorio" }, { status: 400 })
  }
  if (titolo.length > 200) {
    return NextResponse.json({ error: "Il titolo non può superare 200 caratteri" }, { status: 400 })
  }
  if (sottotitolo && sottotitolo.length > 500) {
    return NextResponse.json({ error: "Il sottotitolo non può superare 500 caratteri" }, { status: 400 })
  }
  if (note && note.length > 2000) {
    return NextResponse.json({ error: "Le note non possono superare 2000 caratteri" }, { status: 400 })
  }
  if (!numeroWhatsapp || numeroWhatsapp.trim().length === 0) {
    return NextResponse.json({ error: "Il numero WhatsApp è obbligatorio" }, { status: 400 })
  }

  // Normalize WhatsApp number: remove all non-digit characters
  const normalizedNumero = numeroWhatsapp.replace(/[^0-9]/g, "")
  if (normalizedNumero.length < 10 || normalizedNumero.length > 15) {
    return NextResponse.json(
      { error: "Il numero WhatsApp deve essere tra 10 e 15 cifre" },
      { status: 400 }
    )
  }

  try {
    const content = await prisma.listinoContent.upsert({
      where: { id: "singleton" },
      update: {
        titolo: titolo.trim(),
        sottotitolo: sottotitolo?.trim() || null,
        note: note?.trim() || null,
        numeroWhatsapp: `+${normalizedNumero}`,
      },
      create: {
        id: "singleton",
        titolo: titolo.trim(),
        sottotitolo: sottotitolo?.trim() || null,
        note: note?.trim() || null,
        numeroWhatsapp: `+${normalizedNumero}`,
      },
    })

    return NextResponse.json({ success: true, content })
  } catch (error) {
    console.error("Error updating listino:", error)
    return NextResponse.json(
      { error: "Errore durante il salvataggio" },
      { status: 500 }
    )
  }
}