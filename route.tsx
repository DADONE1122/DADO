import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth-helpers"
import { ImageResponse } from "@vercel/og"

// ─── Text overlay configuration ─────────────────────────────────────────────
// All values in percentage of image dimensions (width=1315, height=632)
// Positions are approximate — adjust after visual testing
// y = posizione della LINEA (il testo è ancorato in basso e cresce verso l'alto,
// così cambiando fontSize la distanza lettere-linea resta costante)
// align: "center" → x è il centro del testo; "left" → x è il bordo sinistro
type Overlay = {
  label: string
  x: number
  y: number
  fontSize: number
  align: "center" | "left"
}
const TEXT_OVERLAYS: Record<string, Overlay> = {
  // Centrati esattamente sulle rispettive righe del template
  date: { label: "il giorno", x: 32.4, y: 51.6, fontSize: 44, align: "center" as const },
  time: { label: "alle ore", x: 56.7, y: 51.6, fontSize: 44, align: "center" as const },
  celebrationName: { label: "Ti aspetto!", x: 48, y: 66.9, fontSize: 74, align: "center" as const },
  // Telefono ancorato a sinistra, leggermente a destra dei ":" di "Confermare al numero:"
  phone: { label: "Confermare al numero:", x: 30, y: 78, fontSize: 38, align: "left" as const },
}

const IMAGE_WIDTH = 1315
const IMAGE_HEIGHT = 632
const TEXT_COLOR = "#2B2B6B"

// ─── Helper: format date in Italian ─────────────────────────────────────────
function formatDateItalian(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${d}/${m}`
}

// ─── Helper: get slot start time ────────────────────────────────────────────
function getSlotStartTime(slot: string): string {
  // SlotConfig stores start times; fallback to defaults
  return slot === "MORNING" ? "11:00" : "15:30"
}

// ─── Cached assets (survive warm serverless invocations) ────────────────────
let _templateDataUri: string | null = null
let _fontData: ArrayBuffer | null = null

async function getTemplateDataUri(origin: string): Promise<string> {
  if (_templateDataUri) return _templateDataUri
  const buf = await fetch(`${origin}/invito-template.png`).then((r) =>
    r.arrayBuffer()
  )
  _templateDataUri = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`
  return _templateDataUri
}

// Fetch a STATIC Caveat font from Google Fonts. The bundled variable font
// (Caveat-VariableFont) is NOT supported by satori and crashes rendering
// (parseFvarAxis). The old User-Agent forces Google to serve a TTF.
async function getFontData(): Promise<ArrayBuffer | null> {
  if (_fontData) return _fontData
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Caveat:wght@700",
      { headers: { "User-Agent": "Mozilla/4.0" } }
    ).then((r) => r.text())
    const match = css.match(/url\((https:\/\/[^)]+\.ttf)\)/)
    if (match) {
      _fontData = await fetch(match[1]).then((r) => r.arrayBuffer())
    }
  } catch {
    _fontData = null
  }
  return _fontData
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

  // Disponibile quando la festa è confermata (COMPLETE), oppure — regola
  // storica — quando l'acconto è arrivato via bonifico.
  const bankOk =
    party.depositMethod === "BANK_TRANSFER" && party.depositReceived
  if (party.status !== "COMPLETE" && !bankOk) {
    return NextResponse.json(
      { error: "Invito disponibile dopo la conferma della festa" },
      { status: 400 }
    )
  }

  // Load template image and font over HTTP (public files are not on the
  // serverless filesystem on Vercel, they must be fetched by URL).
  // Both are cached at module level: warm invocations skip the fetches.
  const origin = new URL(request.url).origin
  const templateDataUri = await getTemplateDataUri(origin)
  const fontData = await getFontData()

  // Build text positions (percentage → pixels)
  const dateStr = formatDateItalian(party.date)
  const timeStr = getSlotStartTime(party.slot)

  const textStyle = (overlay: Overlay) => ({
    position: "absolute" as const,
    left: `${(overlay.x / 100) * IMAGE_WIDTH}px`,
    top: `${(overlay.y / 100) * IMAGE_HEIGHT}px`,
    fontSize: overlay.fontSize,
    color: TEXT_COLOR,
    fontFamily: '"Caveat", "Dancing Script", cursive',
    textAlign: overlay.align,
    // Ancoraggio verticale in basso (il testo cresce verso l'alto), orizzontale
    // al centro o a sinistra a seconda di align.
    transform:
      overlay.align === "left"
        ? "translate(0, -100%)"
        : "translate(-50%, -100%)",
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
