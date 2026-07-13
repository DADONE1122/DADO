import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PartyForm } from "@/components/party-form"

export default async function PartyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session || session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: {
      package: true,
      additionalServices: {
        include: { service: true, option: true },
      },
    },
  })

  if (!party) {
    redirect("/dashboard/feste")
  }

  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  // Storico: altre feste con lo stesso numero di telefono (cliente abituale)
  const phoneDigits = party.parentPhone.replace(/\D/g, "")
  const allSamePhone = phoneDigits
    ? await prisma.party.findMany({
        where: { id: { not: party.id } },
        orderBy: { date: "desc" },
        select: {
          id: true,
          celebrationName: true,
          date: true,
          status: true,
          parentPhone: true,
        },
      })
    : []
  const previousParties = allSamePhone
    .filter((p) => p.parentPhone.replace(/\D/g, "") === phoneDigits)
    .slice(0, 5)

  const services = await prisma.additionalService.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { options: { where: { isActive: true }, orderBy: { name: "asc" } } },
  })

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <a
          href="/dashboard/feste"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Torna alle feste
        </a>

        {(party.status === "COMPLETE" || (party.depositMethod === "BANK_TRANSFER" && party.depositReceived)) && (
          <a
            href={`/api/parties/${party.id}/invito`}
            target="_blank"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            🎟️ Scarica invito
          </a>
        )}
      </div>

      {previousParties.length > 0 && (
        <div
          className="mb-6 bg-white border-2 rounded-xl p-4"
          style={{ borderColor: "#F0C864" }}
        >
          <p className="font-bold mb-2" style={{ color: "#2B2B6B" }}>
            ⭐ Cliente abituale — {previousParties.length === 1 ? "1 altra festa" : `${previousParties.length} altre feste`} con questo numero
          </p>
          <div className="flex flex-wrap gap-2">
            {previousParties.map((prev) => (
              <a
                key={prev.id}
                href={`/dashboard/feste/${prev.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs border hover:shadow ${
                  prev.status === "CANCELLED" ? "opacity-60" : ""
                }`}
                style={{ borderColor: "#E5D9BF" }}
              >
                🎂 {prev.celebrationName} —{" "}
                {prev.date.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                {prev.status === "CANCELLED" ? " (annullata)" : ""}
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Famiglia che torna: perfetta per la fidelity card e per un&apos;accoglienza speciale 😊
          </p>
        </div>
      )}

      <PartyForm
        party={JSON.parse(JSON.stringify(party))}
        packages={JSON.parse(JSON.stringify(packages))}
        services={JSON.parse(JSON.stringify(services))}
      />
    </main>
  )
}