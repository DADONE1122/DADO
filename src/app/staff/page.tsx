import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type DayParty = {
  id: string
  celebrationName: string
  slot: string
  packageName: string
  cake: string | null
  allergies: string | null
  decorationTheme: string | null
  specialRequests: string | null
  status: string
  services: string[]
}

type DayInfo = {
  label: string
  date: Date
  dateStr: string
  dateKey: string
  parties: DayParty[]
  isToday: boolean
}

function getWeekDates(referenceDate: Date): { start: Date; end: Date } {
  const dayOfWeek = referenceDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

function getDayLabels(referenceDate: Date): DayInfo[] {
  const { start: monday } = getWeekDates(referenceDate)
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
      dateKey: date.toISOString().split("T")[0],
      parties: [],
      isToday: date.getTime() === today.getTime(),
    })
  }

  return days
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user?.role !== "STAFF" && session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  // Determine reference date for week calculation
  let referenceDate: Date
  if (searchParams.week) {
    referenceDate = new Date(searchParams.week)
  } else {
    referenceDate = new Date()
  }

  const { start, end } = getWeekDates(referenceDate)
  const days = getDayLabels(referenceDate)

  // Calculate previous/next week dates
  const prevWeek = new Date(start)
  prevWeek.setDate(start.getDate() - 3) // Wednesday of previous week
  const nextWeek = new Date(start)
  nextWeek.setDate(start.getDate() + 10) // Thursday of next week

  // Fetch all parties for the current week (non-CANCELLED)
  const parties = await prisma.party.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    include: {
      package: { select: { name: true } },
      additionalServices: {
        include: {
          service: { select: { name: true } },
          option: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  })

  // Group parties by date
  for (const party of parties) {
    const dateKey = party.date.toISOString().split("T")[0]
    const day = days.find((d) => d.dateKey === dateKey)
    if (day) {
      day.parties.push({
        id: party.id,
        celebrationName: party.celebrationName,
        slot: party.slot === "MORNING" ? "Mattina" : "Pomeriggio",
        packageName: party.package.name,
        cake: party.cake,
        allergies: party.allergies,
        decorationTheme: party.decorationTheme,
        specialRequests: party.specialRequests,
        status: party.status,
        services: party.additionalServices.map((ps: any) =>
          ps.option ? `${ps.service.name}: ${ps.option.name}` : ps.service.name
        ),
      })
    }
  }

  const weekStartStr = start.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
  })
  const weekEndStr = end.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-gray-900">📋 Pito Pitù</h1>
            <span className="text-xs text-gray-500">Staff</span>
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between mt-1">
            <a
              href={`/staff?week=${prevWeek.toISOString().split("T")[0]}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              ← Sett. prima
            </a>
            <span className="text-xs font-medium text-gray-600">
              {weekStartStr} — {weekEndStr}
            </span>
            <a
              href={`/staff?week=${nextWeek.toISOString().split("T")[0]}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              Sett. dopo →
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {days.map((day) => (
          <DaySection key={day.dateKey} day={day} />
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
  const hasDetails = party.cake || party.allergies || party.decorationTheme || party.specialRequests || (Array.isArray(party.services) && party.services.length > 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mx-2">
      {/* Header: Nome festeggiato + Slot */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-base">
          🎂 {party.celebrationName}
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {party.slot === "Mattina" ? "☀️" : "🌤️"} {party.slot}
        </span>
      </div>

      {/* Package */}
      <div className="mb-2">
        <span className="text-sm font-medium text-blue-700">
          📦 Pacchetto: {party.packageName}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {party.cake ? (
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">🎂</span>
            <span className="text-gray-700 font-medium">Dolce:</span>
            <span className="text-gray-700">{party.cake}</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">🎂</span>
            <span className="text-yellow-600 italic">Dolce: da confermare</span>
          </div>
        )}

        {party.allergies ? (
          <div className="flex gap-2 bg-red-50 -mx-3 px-3 py-1.5 rounded border border-red-200">
            <span className="text-red-500 shrink-0 font-bold">⚠️</span>
            <span className="text-red-700 font-semibold">Allergie:</span>
            <span className="text-red-700 font-medium">{party.allergies}</span>
          </div>
        ) : null}

        {party.decorationTheme ? (
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">🎨</span>
            <span className="text-gray-700 font-medium">Allestimento:</span>
            <span className="text-gray-700">{party.decorationTheme}</span>
          </div>
        ) : null}

        {Array.isArray(party.services) && party.services.length > 0 && (
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">➕</span>
            <span className="text-gray-700 font-medium">Servizi:</span>
            <span className="text-gray-700">{party.services.join(" · ")}</span>
          </div>
        )}

        {party.specialRequests ? (
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">📝</span>
            <span className="text-gray-700 font-medium">Richiesto:</span>
            <span className="text-gray-600">{party.specialRequests}</span>
          </div>
        ) : null}

        {!hasDetails && (
          <p className="text-xs text-yellow-600 italic mt-1">
            ⏳ Dettagli in attesa di conferma
          </p>
        )}
      </div>
    </div>
  )
}