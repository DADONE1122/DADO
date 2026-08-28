import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user?.role !== "OWNER") {
    redirect("/staff")
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const in7days = new Date(today)
  in7days.setDate(today.getDate() + 7)

  const [monthCount, pendingCount, weekCount, upcomingParties] =
    await Promise.all([
      prisma.party.count({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.party.count({
        where: { status: "PENDING_DETAILS", date: { gte: today } },
      }),
      prisma.party.count({
        where: {
          date: { gte: today, lte: in7days },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.party.findMany({
        where: { date: { gte: today }, status: { not: "CANCELLED" } },
        take: 10,
        orderBy: [{ date: "asc" }, { slot: "asc" }],
        include: {
          package: true,
          additionalServices: { include: { service: true, option: true } },
        },
      }),
    ])

  const stats = [
    { label: "Feste questo mese", value: monthCount, icon: "🎉" },
    { label: "Prossimi 7 giorni", value: weekCount, icon: "📅" },
    { label: "Dettagli da confermare", value: pendingCount, icon: "⚠️" },
  ]

  return (
    <main className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#2B2B6B" }}>
        Dashboard
      </h1>
      <p className="text-gray-500 mb-6 text-sm">
        Benvenuto, {session.user.name || session.user.email}
      </p>

      {/* Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm"
            style={{ borderColor: "#E5D9BF" }}
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-3xl font-bold" style={{ color: "#2B2B6B" }}>
                {s.value}
              </p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Prossime feste */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold" style={{ color: "#2B2B6B" }}>
          Prossime feste
        </h2>
        <a
          href="/dashboard/nuova-festa"
          className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: "#2B2B6B" }}
        >
          ＋ Nuova festa
        </a>
      </div>

      {upcomingParties.length === 0 ? (
        <div
          className="bg-white border rounded-xl p-8 text-center text-gray-500"
          style={{ borderColor: "#E5D9BF" }}
        >
          Nessuna festa in programma. Crea la prima!
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingParties.map((party) => {
            const isPending = party.status === "PENDING_DETAILS"
            const sfondo = party.additionalServices.find((ps) => ps.option)
            return (
              <a
                key={party.id}
                href={`/dashboard/feste/${party.id}`}
                className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                style={{ borderColor: isPending ? "#FBBF24" : "#E5D9BF" }}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-lg flex flex-col items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: "#2B2B6B" }}
                    >
                      <span className="text-sm font-bold leading-none">
                        {party.date.getDate()}
                      </span>
                      <span className="text-[10px] uppercase leading-none mt-0.5">
                        {party.date.toLocaleDateString("it-IT", { month: "short" })}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {party.celebrationName}{" "}
                        <span className="text-gray-400 font-normal">
                          ({party.age} anni)
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {party.slot === "MORNING" ? "Mattina 11:00" : "Pomeriggio 15:30"}{" "}
                        · {party.package.name}
                        {sfondo?.option ? ` · Sfondo: ${sfondo.option.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      party.status === "COMPLETE"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {party.status === "COMPLETE" ? "Completa" : "Dettagli mancanti"}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}
