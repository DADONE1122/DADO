import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PartyForm } from "@/components/party-form"

export const dynamic = "force-dynamic"

export default async function NuovaFestaPage() {
  const session = await auth()
  if (!session || session.user?.role !== "OWNER") {
    redirect("/auth/login")
  }

  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const services = await prisma.additionalService.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { options: { where: { isActive: true }, orderBy: { name: "asc" } } },
  })

  // Festa vuota di partenza (nessun id => modalità creazione)
  const emptyParty = {
    date: "",
    slot: "AFTERNOON",
    // Nessun pacchetto preselezionato: dev'essere una scelta esplicita,
    // altrimenti si rischia di salvare una FULL come FAI DA TE.
    packageId: "",
    estimatedGuests: "",
    depositReceived: false,
    depositAmount: "",
    depositMethod: "",
    status: "PENDING_DETAILS",
    celebrationName: "",
    age: "",
    parentName: "",
    parentPhone: "",
    cake: "",
    allergies: "",
    decorationTheme: "",
    specialRequests: "",
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <a
          href="/dashboard/feste"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Torna alle feste
        </a>
        <h1 className="text-2xl font-bold mt-2">Nuova Festa</h1>
      </div>

      <PartyForm
        party={emptyParty}
        packages={JSON.parse(JSON.stringify(packages))}
        services={JSON.parse(JSON.stringify(services))}
      />
    </main>
  )
}
