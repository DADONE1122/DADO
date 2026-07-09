import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type DayParty = {
  id: string
  slot: string
  packageName: string
  cake: string | null
  allergies: string | null
  decorationTheme: string | null
  specialRequests: string | null
}

type DayInfo = {
  label: string
  date: Date
  dateStr: string
  parties: DayParty[]
  isToday: boolean
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

function getDayLabels(): DayInfo[] {
  const { start: monday } = getWeekRange()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DayInfo[] = []
  const dayNames = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    days.push({
      label: dayNames[i],
      date,
      dateStr: date.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      parties: [],
      isToday: date.getTime() === today.getTime(),
    })
  }

  return days
}

export default async function StaffPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // Both STAFF and OWNER can access this page
  if (session.user?.role !== "STAFF" && session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  const { start, end } = getWeekRange()
  const days = getDayLabels()

  // Fetch all parties for the current week (non-CANCELLED)
  const parties = await prisma.party.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    include: {
      package: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  })

  // Group parties by date
  for (const party of parties) {
    const dateKey = party.date.toISOString().split("T")[0]
    const day = days.find((d) => d.date.toISOString().split("T")[0] === dateKey)
    if (day) {
      day.parties.push({
        id: party.id,
        slot: party.slot === "MORNING" ? "☀️ Mattina" : "🌤️ Pomeriggio",
        packageName: party.package.name,
        cake: party.cake,
        allergies: party.allergies,
        decorationTheme: party.decorationTheme,
        specialRequests: party.specialRequests,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">📋 Staff — Pito Pitù</h1>
          <span className="text-sm text-gray-500">
            Settimana del {days[0].dateStr}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {days.map((day) => (
          <DaySection key={day.dateStr} day={day} />
        ))}

        {days.every((d) => d.parties.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-medium">Nessuna festa questa settimana</p>
            <p className="text-sm">Buona settimana di riposo!</p>
          </div>
        )}
      </main>
    </div>
  )
}

function DaySection({ day }: { day: DayInfo }) {
  return (
    <div>
      {/* Day header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 ${
          day.isToday
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-700"
        }`}
      >
        <span className="font-semibold text-sm">{day.label}</span>
        <span className="text-xs opacity-75">{day.dateStr}</span>
        {day.isToday && (
          <span className="ml-auto text-xs font-bold bg-blue-200 px-2 py-0.5 rounded-full">
            OGGI
          </span>
        )}
        {day.parties.length > 0 && (
          <span className="ml-auto text-xs font-medium bg-white/50 px-2 py-0.5 rounded-full">
            {day.parties.length} festa{day.parties.length !== 1 ? "e" : ""}
          </span>
        )}
      </div>

      {/* Parties for this day */}
      {day.parties.length === 0 ? (
        <p className="text-xs text-gray-400 pl-3 pb-3">— Nessuna festa</p>
      ) : (
        <div className="space-y-2 pb-3">
          {day.parties.map((party) => (
            <PartyCard key={party.id} party={party} />
          ))}
        </div>
      )}
    </div>
  )
}

function PartyCard({ party }: { party: DayParty }) {
  const hasDetails = party.cake || party.allergies || party.decorationTheme || party.specialRequests

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mx-2">
      {/* Slot + Package */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{party.slot}</span>
        <span className="text-sm font-semibold text-blue-700">
          📦 {party.packageName}
        </span>
      </div>

      {/* Details */}
      {hasDetails ? (
        <div className="space-y-1 text-sm">
          {party.cake && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0">🎂</span>
              <span className="text-gray-700">{party.cake}</span>
            </div>
          )}
          {party.allergies && (
            <div className="flex gap-2">
              <span className="text-red-400 shrink-0">⚠️</span>
              <span className="text-red-700 font-medium">{party.allergies}</span>
            </div>
          )}
          {party.decorationTheme && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0">🎨</span>
              <span className="text-gray-700">{party.decorationTheme}</span>
            </div>
          )}
          {party.specialRequests && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0">📝</span>
              <span className="text-gray-600">{party.specialRequests}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Nessun dettaglio inserito</p>
      )}
    </div>
  )
}