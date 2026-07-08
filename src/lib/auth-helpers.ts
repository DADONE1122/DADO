import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireRole(roles: string[]) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  if (!roles.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }
  return null
}

export async function isOwner() {
  const session = await getSession()
  return session?.user?.role === "OWNER"
}