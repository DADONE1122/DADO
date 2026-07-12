import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth-helpers"
import { ImageResponse } from "@vercel/og"

// ─── Text overlay configuration ─────────────────────────────────────────────
// All values in percentage of image dimensions (width=1315, height=632)
// Positions are approximate — adjust after visual testing
const TEXT_OVERLAYS = {
  date: {
    label: "il giorno",
    x: 31, // left edge of text
    y: 48, // baseline
    fontSize: 36,
  },
  time: {
    label: "alle ore",
    x: 57,
    y: 48,
    fontSize: 36,
  },
  celebrationName: {
    label: "Ti aspetto!",
    x: 50,
    y: 63,
    fontSize: 42,
  },
  phone: {
    label: "Confermare al numero:",
    x: 50,
    y: 74,
    fontSize: 28,
  },
}

const IMAGE_WIDTH = 1315
const IMAGE_HEIGHT = 632
const TEXT_COLOR = "#2B2B6B"

// ─── Helper: format date in Italian ─────────────────────────────────────────
function formatDateItalian(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
  })
}

// ─── Helper: get slot start time ────────────────────────────────────────────
function getSlotStartTime(slot: string): string {
  // SlotConfig stores start times; fallback to defaults
  return slot === "MORNING" ? "11:00" : "15:30"
}

// ─── GET /api/parties/[id]/invito → image/png ──────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: {
      package: true,
    },
  })

  if (!party) {
    return NextResponse.json({ error: "Festa non trovata" }, { status: 404 })
  }

  // Only visible when deposit is BANK_TRANSFER and received
  if (party.depositMethod !== "BANK_TRANSFER" || !party.depositReceived) {
    return NextResponse.json(
      { error: "Invito disponibile solo per pagamenti con bonifico e acconto ricevuto" },
      { status: 400 }
    )
  }

  // Load template image and font over HTTP (public files are not on the
  // serverless filesystem on Vercel, they must be fetched by URL).
  const origin = new URL(request.url).origin

  const templateArrayBuffer = await fetch(`${origin}/invito-template.png`).then(
    (r) => r.arrayBuffer()
  )
  const templateBase64 = Buffer.from(templateArrayBuffer).toString("base64")
  const templateDataUri = `data:image/png;base64,${templateBase64}`

  let fontData: ArrayBuffer | null = null
  try {
    fontData = await fetch(
      `${origin}/fonts/Caveat-VariableFont_wght.ttf`
    ).then((r) => r.arrayBuffer())
  } catch {
    fontData = null
  }

  // Build text positions (percentage → pixels)
  const dateStr = formatDateItalian(party.date)
  const timeStr = getSlotStartTime(party.slot)

  const textStyle = (overlay: typeof TEXT_OVERLAYS.date) => ({
    position: "absolute" as const,
    left: `${(overlay.x / 100) * IMAGE_WIDTH}px`,
    top: `${(overlay.y / 100) * IMAGE_HEIGHT}px`,
    fontSize: overlay.fontSize,
    color: TEXT_COLOR,
    fontFamily: '"Caveat", "Dancing Script", cursive',
    textAlign: "center" as const,
    transform: "translate(-50%, -50%)",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.2,
    fontWeight: 700,
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          display: "flex",
          position: "relative",
          backgroundImage: `url(${templateDataUri})`,
          backgroundSize: `${IMAGE_WIDTH}px ${IMAGE_HEIGHT}px`,
        }}
      >
        {/* Date */}
        <div style={textStyle(TEXT_OVERLAYS.date)}>{dateStr}</div>

        {/* Time */}
        <div style={textStyle(TEXT_OVERLAYS.time)}>{timeStr}</div>

        {/* "Ti aspetto!" — celebration name */}
        <div style={textStyle(TEXT_OVERLAYS.celebrationName)}>
          {party.celebrationName}
        </div>

        {/* Phone */}
        <div style={textStyle(TEXT_OVERLAYS.phone)}>{party.parentPhone}</div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fonts: fontData
        ? [
            {
              name: "Caveat",
              data: fontData,
              weight: 700,
              style: "normal",
            },
          ]
        : undefined,
    }
  )
}
