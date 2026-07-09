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
        include: { service: true },
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

  const services = await prisma.additionalService.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <a
          href="/dashboard/feste"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Torna alle feste
        </a>
      </div>

      <PartyForm
        party={JSON.parse(JSON.stringify(party))}
        packages={JSON.parse(JSON.stringify(packages))}
        services={JSON.parse(JSON.stringify(services))}
      />
    </main>
  )
}