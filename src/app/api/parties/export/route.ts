import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/parties/export?anno=2026 → CSV per contabilità (solo OWNER)
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const annoParam = searchParams.get("anno")
  const anno = annoParam ? parseInt(annoParam) : null

  const where: any = {}
  if (anno && !isNaN(anno)) {
    where.date = {
      gte: new Date(anno, 0, 1),
      lte: new Date(anno, 11, 31),
    }
  }

  const parties = await prisma.party.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      package: { select: { name: true } },
      additionalServices: {
        include: {
          service: { select: { name: true } },
          option: { select: { name: true } },
        },
      },
    },
  })

  // CSV con separatore ; (Excel italiano) e BOM UTF-8
  const esc = (v: any) => {
    const s = String(v ?? "")
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = [
    "Data", "Slot", "Festeggiato", "Età", "Genitore", "Telefono",
    "Pacchetto", "Ospiti stimati", "Servizi", "Dolce",
    "Acconto ricevuto", "Importo acconto", "Metodo acconto",
    "Stato", "Note interne",
  ].join(";")

  const rows = parties.map((p) =>
    [
      p.date.toLocaleDateString("it-IT"),
      p.slot === "MORNING" ? "Mattina" : "Pomeriggio",
      esc(p.celebrationName),
      p.age,
      esc(p.parentName),
      esc(p.parentPhone),
      esc(p.package.name),
      p.estimatedGuests,
      esc(
        p.additionalServices
          .map((ps) =>
            ps.option ? `${ps.service.name}: ${ps.option.name}` : ps.service.name
          )
          .join(" + ")
      ),
      esc(p.cake || ""),
      p.depositReceived ? "Sì" : "No",
      p.depositAmount ? Number(p.depositAmount).toFixed(2).replace(".", ",") : "",
      p.depositMethod === "CASH" ? "Contanti" : p.depositMethod === "BANK_TRANSFER" ? "Bonifico" : "",
      p.status === "COMPLETE" ? "Confermata" : p.status === "CANCELLED" ? "Annullata" : "Da confermare",
      esc(p.internalNotes || ""),
    ].join(";")
  )

  const csv = "﻿" + [header, ...rows].join("\r\n")
  const filename = anno ? `feste-pito-pitu-${anno}.csv` : "feste-pito-pitu.csv"

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
