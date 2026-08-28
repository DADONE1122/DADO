"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type ListinoContent = {
  titolo: string
  sottotitolo: string | null
  note: string | null
  numeroWhatsapp: string
}

export default function ListinoEditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<ListinoContent>({
    titolo: "",
    sottotitolo: "",
    note: "",
    numeroWhatsapp: "",
  })

  useEffect(() => {
    fetch("/api/listino")
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setForm({
            titolo: data.content.titolo || "",
            sottotitolo: data.content.sottotitolo || "",
            note: data.content.note || "",
            numeroWhatsapp: data.content.numeroWhatsapp || "",
          })
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Errore nel caricamento dei dati")
        setLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/listino", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il salvataggio")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <p className="text-gray-500">Caricamento...</p>
      </main>
    )
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Torna alla dashboard
        </a>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: "#2B2B6B" }}>
        📝 Modifica Listino Pubblico
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        Le modifiche sono visibili immediatamente sulla homepage pubblica.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
          ✅ Listino salvato con successo!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titolo *
          </label>
          <input
            type="text"
            value={form.titolo}
            onChange={(e) => setForm({ ...form, titolo: e.target.value })}
            maxLength={200}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{form.titolo.length}/200</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sottotitolo / Descrizione
          </label>
          <textarea
            value={form.sottotitolo ?? ""}
            onChange={(e) => setForm({ ...form, sottotitolo: e.target.value })}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {(form.sottotitolo || "").length}/500
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note (acconto, cancellazioni, ecc.)
          </label>
          <textarea
            value={form.note ?? ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            maxLength={2000}
            rows={5}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {(form.note || "").length}/2000
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero WhatsApp *
          </label>
          <input
            type="tel"
            value={form.numeroWhatsapp}
            onChange={(e) => setForm({ ...form, numeroWhatsapp: e.target.value })}
            placeholder="+39 333 1234567"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Inserisci il numero completo con prefisso internazionale
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Salvataggio..." : "💾 Salva"}
          </button>
          <a
            href="/"
            target="_blank"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-center"
          >
            👁️ Anteprima
          </a>
        </div>
      </form>
    </main>
  )
}