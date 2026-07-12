import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/parties/options-availability?date=YYYY-MM-DD&excludePartyId=xxx
// Returns the option ids already taken by other non-cancelled parties on that
// date, for services flagged exclusivePerDay (e.g. sfondi fotografici).
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get("date")
  const excludePartyId = searchParams.get("excludePartyId")

  if (!dateStr) {
    return NextResponse.json({ takenOptionIds: [] })
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 })
  }

  const partyWhere: any = {
    date,
    status: { not: "CANCELLED" },
  }
  if (excludePartyId) {
    partyWhere.id = { not: excludePartyId }
  }

  const taken = await prisma.partyService.findMany({
    where: {
      optionId: { not: null },
      service: { exclusivePerDay: true },
      party: partyWhere,
    },
    select: { optionId: true },
  })

  return NextResponse.json({
    takenOptionIds: taken.map((t) => t.optionId).filter(Boolean),
  })
}
