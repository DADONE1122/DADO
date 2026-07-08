"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      })
      
      if (result?.error) {
        setError("Errore durante l'invio del link")
      } else {
        setSent(true)
      }
    } catch {
      setError("Errore di connessione")
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Link di accesso inviato</h1>
          <p className="text-gray-600">
            Controlla la tua email per il link di accesso. Se non lo trovi, controlla la cartella spam.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Accedi a Pito Pitù</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua@email.it"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Invia link di accesso
          </button>
        </form>
      </div>
    </main>
  )
}