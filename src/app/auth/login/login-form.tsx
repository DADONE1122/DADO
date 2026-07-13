"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSending(true)

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        // Fondamentale: senza callbackUrl il link nella mail rimanda a
        // /auth/login (loop). Con questo, dopo la verifica si va in dashboard.
        callbackUrl: "/dashboard",
      })

      if (result?.error) {
        setError("Errore durante l'invio del link")
      } else {
        setSent(true)
      }
    } catch {
      setError("Errore di connessione")
    } finally {
      setSending(false)
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: "#FDF8F0" }}
    >
      <div className="max-w-md w-full">
        <div
          className="bg-white rounded-2xl shadow-lg border p-8"
          style={{ borderColor: "#E5D9BF" }}
        >
          <div className="text-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-pitopitu.png"
              alt="Pitopitù Playground"
              className="mx-auto mb-1 h-20 w-auto"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/draghetto.png"
              alt=""
              aria-hidden="true"
              className="mx-auto mb-2 h-16 w-auto"
            />
            <p className="text-sm text-gray-500 mt-1">
              Gestionale Feste di Compleanno
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="text-lg font-bold mb-2" style={{ color: "#2B2B6B" }}>
                Link di accesso inviato!
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Controlla la tua email e clicca il link per entrare. Se non lo
                trovi, guarda nella cartella spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1 text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua@email.it"
                  required
                  className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5D9BF" }}
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: "#2B2B6B" }}
              >
                {sending ? "Invio in corso..." : "Invia link di accesso"}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Via Kennedy 28, Cabiate (CO)
        </p>
      </div>
    </main>
  )
}
