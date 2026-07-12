import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Layout protetto per tutta l'area /dashboard.
 * - non autenticato → login
 * - autenticato ma non OWNER (es. STAFF) → vista staff
 * Include la barra di navigazione con i colori del brand Pito Pitù.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  if (session.user.role !== "OWNER") {
    redirect("/staff")
  }

  const links = [
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/dashboard/feste", label: "🎉 Feste" },
    { href: "/dashboard/nuova-festa", label: "＋ Nuova Festa" },
    { href: "/dashboard/solleciti", label: "🔔 Solleciti" },
    { href: "/dashboard/configurazioni", label: "⚙️ Configurazioni" },
    { href: "/dashboard/listino", label: "📋 Listino" },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF8F0" }}>
      <nav
        className="sticky top-0 z-20 shadow-md"
        style={{ backgroundColor: "#2B2B6B" }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            <span className="text-white font-bold text-lg mr-3 whitespace-nowrap">
              🦕 Pito Pitù
            </span>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-md text-sm text-white/85 hover:text-white hover:bg-white/10 whitespace-nowrap transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/"
              target="_blank"
              className="ml-auto px-3 py-1.5 rounded-md text-xs text-white/60 hover:text-white whitespace-nowrap"
            >
              Vedi listino pubblico ↗
            </a>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
