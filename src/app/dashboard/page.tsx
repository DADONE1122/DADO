import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }

  if (session.user?.role !== "OWNER") {
    redirect("/staff")
  }

  const recentParties = await prisma.party.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { package: true },
  })

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Pito Pitù</h1>
      <p className="text-gray-600 mb-8">Benvenuto, {session.user.name || session.user.email}</p>

      <div className="grid gap-4">
        <div className="flex gap-4 mb-6">
          <a href="/dashboard/feste" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Feste
          </a>
          <a href="/dashboard/calendario" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Calendario
          </a>
          <a href="/dashboard/nuova-festa" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Nuova Festa
          </a>
          <a href="/dashboard/configurazioni" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Configurazioni
          </a>
          <a href="/dashboard/solleciti" className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
            Solleciti
          </a>
          <a href="/dashboard/listino" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Listino
          </a>
        </div>

        <h2 className="text-xl font-semibold mb-4">Feste Recenti</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Bambino</th>
                <th className="text-left p-2 border">Genitore</th>
                <th className="text-left p-2 border">Data</th>
                <th className="text-left p-2 border">Slot</th>
                <th className="text-left p-2 border">Stato</th>
              </tr>
            </thead>
            <tbody>
              {recentParties.map((party) => (
                <tr key={party.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{party.celebrationName}</td>
                  <td className="p-2 border">{party.parentName}</td>
                  <td className="p-2 border">{party.date.toLocaleDateString("it-IT")}</td>
                  <td className="p-2 border">{party.slot === "MORNING" ? "Mattina" : "Pomeriggio"}</td>
                  <td className="p-2 border">
                    <span className={`px-2 py-1 rounded text-sm ${
                      party.status === "COMPLETE" ? "bg-green-100 text-green-800" :
                      party.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {party.status === "COMPLETE" ? "Completa" :
                       party.status === "CANCELLED" ? "Annullata" :
                       "Dettagli mancanti"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentParties.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nessuna festa presente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}