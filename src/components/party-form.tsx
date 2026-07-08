"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface PartyFormProps {
  party: any
  packages: any[]
  services: any[]
}

export function PartyForm({ party, packages, services }: PartyFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({ ...party })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isPending = formData.status === "PENDING_DETAILS"
  const isCancelled = formData.status === "CANCELLED"

  // Check if detail fields are filled
  const detailFields = {
    celebrationName: formData.celebrationName,
    age: formData.age,
    parentName: formData.parentName,
    parentPhone: formData.parentPhone,
    cake: formData.cake,
    allergies: formData.allergies,
    decorationTheme: formData.decorationTheme,
    specialRequests: formData.specialRequests,
  }
  const allDetailsFilled = Object.values(detailFields).every(
    (v) => v !== null && v !== undefined && v !== ""
  )

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il salvataggio")
      }

      setSuccess("Festa aggiornata con successo!")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!allDetailsFilled) {
      setError("Compila tutti i dettagli prima di completare la festa")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "COMPLETE" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il completamento")
      }

      setSuccess("Festa completata con successo!")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Sei sicuro di voler annullare questa festa? L'acconto verrà trattenuto.")) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Errore durante l'annullamento")

      setSuccess("Festa annullata")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (isCancelled) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-500 mb-2">Festa Annullata</h2>
        <p className="text-gray-500">
          Questa festa è stata annullata. L&apos;acconto è stato trattenuto.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Status Banner */}
      {isPending && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-red-800 text-lg">Dettagli mancanti</p>
            <p className="text-red-700 text-sm">
              {allDetailsFilled
                ? "Tutti i dettagli sono stati compilati. Puoi completare la festa."
                : "Compila tutti i campi nella sezione Dettagli per completare la festa."}
            </p>
          </div>
        </div>
      )}

      {/* Success/Error messages */}
      {success && (
        <div className="bg-green-50 border border-green-400 rounded-lg p-3 text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      {/* ===== BLOCCO DATA ===== */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          📅 Blocco Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={formData.date ? new Date(formData.date).toISOString().split("T")[0] : ""}
              onChange={(e) => handleChange("date", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slot</label>
            <select
              value={formData.slot}
              onChange={(e) => handleChange("slot", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="MORNING">Mattina (11:00-15:00)</option>
              <option value="AFTERNOON">Pomeriggio (15:30-18:30)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pacchetto</label>
            <select
              value={formData.packageId}
              onChange={(e) => handleChange("packageId", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {packages.map((pkg: any) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — Feriale: €{pkg.ferialePrice} / Weekend: €{pkg.weekendPrice}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ospiti stimati</label>
            <input
              type="number"
              value={formData.estimatedGuests || ""}
              onChange={(e) => handleChange("estimatedGuests", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              min="1"
            />
          </div>
          <div className="md:col-span-2">
            <h3 className="font-semibold text-gray-700 mb-2">Acconto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ricevuto</label>
                <select
                  value={formData.depositReceived ? "true" : "false"}
                  onChange={(e) => handleChange("depositReceived", e.target.value === "true")}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="false">No</option>
                  <option value="true">Sì</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.depositAmount || ""}
                  onChange={(e) => handleChange("depositAmount", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metodo</label>
                <select
                  value={formData.depositMethod || ""}
                  onChange={(e) => handleChange("depositMethod", e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleziona...</option>
                  <option value="CASH">Contanti</option>
                  <option value="BANK_TRANSFER">Bonifico</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DETTAGLI ===== */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          🎂 Dettagli Festa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome del festeggiato <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.celebrationName || ""}
              onChange={(e) => handleChange("celebrationName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Età <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.age || ""}
              onChange={(e) => handleChange("age", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome genitore <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.parentName || ""}
              onChange={(e) => handleChange("parentName", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Telefono genitore <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.parentPhone || ""}
              onChange={(e) => handleChange("parentPhone", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Torta</label>
            <input
              type="text"
              value={formData.cake || ""}
              onChange={(e) => handleChange("cake", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Es. Torta cioccolato"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Allergie <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={formData.allergies || ""}
              onChange={(e) => handleChange("allergies", e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-red-300 bg-red-50"
              placeholder="⚠️ Campo sicurezza - indicare eventuali allergie"
            />
            <p className="text-xs text-red-600 mt-1 font-medium">
              Campo obbligatorio per la sicurezza del bambino
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tema decorazione</label>
            <input
              type="text"
              value={formData.decorationTheme || ""}
              onChange={(e) => handleChange("decorationTheme", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Es. Supereroi, Principesse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Richieste speciali</label>
            <input
              type="text"
              value={formData.specialRequests || ""}
              onChange={(e) => handleChange("specialRequests", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Altre richieste..."
            />
          </div>
        </div>

        {/* Detail fields status */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            Stato dettagli: {allDetailsFilled ? "✅ Completati" : `⚠️ ${Object.values(detailFields).filter((v) => !v).length} campi vuoti`}
          </p>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio..." : "Salva modifiche"}
        </button>

        {isPending && allDetailsFilled && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Completa festa
          </button>
        )}

        {!isCancelled && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 ml-auto"
          >
            Annulla festa
          </button>
        )}
      </div>
    </form>
  )
}