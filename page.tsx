import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import LoginForm from "./login-form"

// Server component: se l'utente è già autenticato lo mandiamo direttamente
// in dashboard. Così, quando il magic link della mail atterra qui dopo la
// verifica, non rivede il form (che causava il "loop" di login).
export default async function LoginPage() {
  const session = await auth()

  if (session?.user) {
    redirect(session.user.role === "OWNER" ? "/dashboard" : "/staff")
  }

  return <LoginForm />
}
