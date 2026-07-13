import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FesteList } from "@/components/feste-list"

export const dynamic = "force-dynamic"

export default async function FestePage() {
  const session = await auth()
  if (!session || session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  const parties = await prisma.party.findMany({
    orderBy: { date: "desc" },
    include: { package: { select: { name: true } } },
  })

  const rows = parties.map((p) => ({
    id: p.id,
    celebrationName: p.celebrationName,
    parentName: p.parentName,
    parentPhone: p.parentPhone,
    age: p.age,
    date: p.date.toISOString(),
    slot: p.slot,
    status: p.status,
    packageName: p.package.name,
  }))

  return (
    <main className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#2B2B6B" }}>
          🎉 Feste
        </h1>
        <div className="flex gap-2">
          <a
            href="/api/parties/export"
            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white"
            style={{ borderColor: "#E5D9BF" }}
            title="Scarica tutte le feste in CSV (per Excel/contabilità)"
          >
            ⬇️ CSV
          </a>
          <a
            href="/dashboard/nuova-festa"
            className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: "#2B2B6B" }}
          >
            ＋ Nuova festa
          </a>
        </div>
      </div>

      <FesteList parties={rows} />
    </main>
  )
}
