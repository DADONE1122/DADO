import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
/**

Layout protetto per tutta l'area /dashboard.
Controllo di sessione lato server per OGNI pagina sotto /dashboard:


non autenticato → login




autenticato ma non OWNER (es. STAFF) → vista staff


Le singole pagine possono mantenere i propri controlli: sono ridondanti ma innocui.
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
return <>{children}</>
}
