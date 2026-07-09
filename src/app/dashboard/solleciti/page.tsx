import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getPendingParties } from "@/lib/solleciti"

export const dynamic = "force-dynamic"

export default async function SollecitiPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user?.role !== "OWNER") {
    redirect("/staff")
  }

  const parties = await getPendingParties()

  return (
    <main className="p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📋 Solleciti Dettagli Mancanti</h1>
        <p className="text-gray-600 mb-8">
          Feste con stato &quot;Dettagli mancanti&quot; in programma nei prossimi 5 giorni
        </p>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {parties.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg mb-2">✅ Nessuna festa con dettagli mancanti</p>
              <p>Tutte le feste in programma nei prossimi 5 giorni hanno i dettagli completi.</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                <p className="text-yellow-800 font-semibold">
                  {parties.length} festa{parties.length !== 1 ? "e" : ""} in attesa di dettagli
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 border-b font-semibold text-gray-700">Bambino/a</th>
                      <th className="text-left p-3 border-b font-semibold text-gray-700">Genitore</th>
                      <th className="text-left p-3 border-b font-semibold text-gray-700">Telefono</th>
                      <th className="text-left p-3 border-b font-semibold text-gray-700">Data</th>
                      <th className="text-left p-3 border-b font-semibold text-gray-700">Slot</th>
                      <th className="text-center p-3 border-b font-semibold text-gray-700">Giorni rimanenti</th>
                      <th className="text-center p-3 border-b font-semibold text-gray-700">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.map((party) => (
                      <tr
                        key={party.id}
                        className={`hover:bg-gray-50 ${
                          party.daysRemaining <= 1 ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="p-3 border-b">{party.celebrationName}</td>
                        <td className="p-3 border-b">{party.parentName}</td>
                        <td className="p-3 border-b">{party.parentPhone}</td>
                        <td className="p-3 border-b">
                          {party.date.toLocaleDateString("it-IT", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="p-3 border-b">{party.slot}</td>
                        <td className="p-3 border-b text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-sm font-bold ${
                              party.daysRemaining <= 1
                                ? "bg-red-100 text-red-800"
                                : party.daysRemaining <= 3
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {party.daysRemaining === 0
                              ? "Oggi!"
                              : party.daysRemaining === 1
                              ? "Domani!"
                              : `${party.daysRemaining} giorni`}
                          </span>
                        </td>
                        <td className="p-3 border-b text-center">
                          <a
                            href={`/dashboard/feste/${party.id}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            Completa dettagli
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">ℹ️ Come funziona</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Questa pagina mostra tutte le feste con dettagli mancanti nei prossimi 5 giorni</li>
            <li>• Ogni mattina viene inviata un&apos;email automatica con lo stesso elenco</li>
            <li>• Per completare i dettagli, clicca su &quot;Completa dettagli&quot; e inserisci almeno la torta</li>
            <li>• Una volta completati, la festa scompare automaticamente da questa lista</li>
          </ul>
        </div>
      </div>
    </main>
  )
}