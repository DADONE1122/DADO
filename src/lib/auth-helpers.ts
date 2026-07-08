import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function getSession() {
  const session = await auth()
  return session
}

export async function requireRole(roles: string[]) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  if (!roles.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }
  return null
}

export async function isOwner() {
  const session = await auth()
  return session?.user?.role === "OWNER"
}