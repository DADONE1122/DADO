import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]
const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  // Mese di riferimento (?month=YYYY-MM), default: corrente
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() // 0-based
  if (searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    const [y, m] = searchParams.month.split("-").map(Number)
    year = y
    month = m - 1
  }

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const [parties, slotConfigs] = await Promise.all([
    prisma.party.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ slot: "asc" }],
      select: {
        id: true,
        celebrationName: true,
        date: true,
        slot: true,
        status: true,
      },
    }),
    prisma.slotConfig.findMany(),
  ])

  const maxMorning =
    slotConfigs.find((s) => s.slot === "MORNING")?.maxParties ?? 2
  const maxAfternoon =
    slotConfigs.find((s) => s.slot === "AFTERNOON")?.maxParties ?? 5

  // Feste raggruppate per giorno del mese
  const byDay: Record<number, typeof parties> = {}
  for (const p of parties) {
    const d = p.date.getDate()
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(p)
  }

  // Celle del calendario: offset lunedì-based + giorni del mese
  const firstWeekday = (monthStart.getDay() + 6) % 7 // 0 = lunedì
  const daysInMonth = monthEnd.getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

  const isToday = (day: number) =>
    day === now.getDate() &&
    month === now.getMonth() &&
    year === now.getFullYear()

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header con navigazione mese */}
      <div className="flex items-center justify-between mb-6">
        <a
          href={`/dashboard/calendario?month=${fmt(prevMonth)}`}
          className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:shadow"
          style={{ borderColor: "#E5D9BF", color: "#2B2B6B" }}
        >
          ← {MESI[prevMonth.getMonth()]}
        </a>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#2B2B6B" }}>
          📆 {MESI[month]} {year}
        </h1>
        <a
          href={`/dashboard/calendario?month=${fmt(nextMonth)}`}
          className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:shadow"
          style={{ borderColor: "#E5D9BF", color: "#2B2B6B" }}
        >
          {MESI[nextMonth.getMonth()]} →
        </a>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-3 text-xs text-gray-500 flex-wrap">
        <span>🌅 Mattina (max {maxMorning})</span>
        <span>🌇 Pomeriggio (max {maxAfternoon})</span>
        <span className="text-yellow-600">■ dettagli mancanti</span>
        <span className="text-green-600">■ confermata</span>
        <span className="text-red-500 font-medium">FULL = slot al completo</span>
      </div>

      {/* Griglia */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {GIORNI.map((g) => (
          <div
            key={g}
            className="text-center text-xs font-bold py-2 uppercase tracking-wide"
            style={{ color: "#2B2B6B" }}
          >
            {g}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e${i}`} className="min-h-[90px]" />
          }
          const dayParties = byDay[day] || []
          const morning = dayParties.filter((p) => p.slot === "MORNING")
          const afternoon = dayParties.filter((p) => p.slot === "AFTERNOON")
          const morningFull = morning.length >= maxMorning
          const afternoonFull = afternoon.length >= maxAfternoon

          return (
            <div
              key={day}
              className={`min-h-[90px] bg-white border rounded-lg p-1.5 md:p-2 ${
                isToday(day) ? "ring-2 ring-offset-1" : ""
              }`}
              style={{
                borderColor: "#E5D9BF",
                ...(isToday(day) ? ({ ["--tw-ring-color" as any]: "#2B2B6B" } as any) : {}),
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold ${
                    isToday(day) ? "px-1.5 py-0.5 rounded-full text-white" : "text-gray-600"
                  }`}
                  style={isToday(day) ? { backgroundColor: "#2B2B6B" } : {}}
                >
                  {day}
                </span>
                <span className="text-[9px] text-gray-400">
                  {afternoonFull && <span className="text-red-500 font-bold">FULL</span>}
                </span>
              </div>

              <div className="space-y-0.5">
                {morning.map((p) => (
                  <a
                    key={p.id}
                    href={`/dashboard/feste/${p.id}`}
                    className={`block text-[10px] md:text-xs px-1 py-0.5 rounded truncate ${
                      p.status === "COMPLETE"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                    title={`${p.celebrationName} — mattina`}
                  >
                    🌅 {p.celebrationName}
                  </a>
                ))}
                {afternoon.map((p) => (
                  <a
                    key={p.id}
                    href={`/dashboard/feste/${p.id}`}
                    className={`block text-[10px] md:text-xs px-1 py-0.5 rounded truncate ${
                      p.status === "COMPLETE"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                    title={`${p.celebrationName} — pomeriggio`}
                  >
                    🌇 {p.celebrationName}
                  </a>
                ))}
              </div>

              {dayParties.length === 0 && (
                <a
                  href="/dashboard/nuova-festa"
                  className="block text-center text-gray-300 hover:text-gray-500 text-xs mt-2"
                  title="Crea festa"
                >
                  +
                </a>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
