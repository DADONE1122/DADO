import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PartyCard } from "@/components/party-card"

export default async function FestePage() {
  const session = await auth()
  if (!session || session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  const parties = await prisma.party.findMany({
    orderBy: { date: "desc" },
    include: { package: true },
  })

  const activeParties = parties.filter((p) => p.status !== "CANCELLED")
  const cancelledParties = parties.filter((p) => p.status === "CANCELLED")

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Feste</h1>
          <p className="text-gray-600 mt-1">
            {activeParties.length} feste attive · {parties.length} totale
          </p>
        </div>
        <a
          href="/dashboard"
          className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          ← Dashboard
        </a>
      </div>

      {activeParties.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nessuna festa attiva. Crea una nuova festa dal calendario.
        </div>
      )}

      <div className="space-y-3">
        {activeParties.map((party) => (
          <PartyCard
            key={party.id}
            id={party.id}
            celebrationName={party.celebrationName}
            parentName={party.parentName}
            date={party.date.toISOString()}
            slot={party.slot}
            status={party.status}
          />
        ))}
      </div>

      {cancelledParties.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-500 mb-4">
            Archivio ({cancelledParties.length})
          </h2>
          <div className="space-y-3">
            {cancelledParties.map((party) => (
              <PartyCard
                key={party.id}
                id={party.id}
                celebrationName={party.celebrationName}
                parentName={party.parentName}
                date={party.date.toISOString()}
                slot={party.slot}
                status={party.status}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}