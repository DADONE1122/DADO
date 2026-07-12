"use client"

import { useState, useEffect } from "react"

type TabId = "pacchetti" | "servizi" | "slot" | "utenti"

type Package = { id: string; name: string; ferialePrice: number; weekendPrice: number; isActive: boolean }
type Service = { id: string; name: string; price: number; isActive: boolean }
type Slot = { id: string; slot: string; startTime: string; endTime: string; maxParties: number }
type User = { id: string; email: string; name: string | null; role: string; createdAt: string }

export default function ConfigurazioniPage() {
  const [tab, setTab] = useState<TabId>("pacchetti")

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <a href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Torna alla dashboard
        </a>
      </div>

      <h1 className="text-2xl font-bold mb-6" style={{ color: "#2B2B6B" }}>
        ⚙️ Configurazioni
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b pb-px">
        {[
          { id: "pacchetti" as TabId, label: "Pacchetti" },
          { id: "servizi" as TabId, label: "Servizi" },
          { id: "slot" as TabId, label: "Slot" },
          { id: "utenti" as TabId, label: "Utenti" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? "bg-blue-100 text-blue-800 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pacchetti" && <PackageManager />}
      {tab === "servizi" && <ServiceManager />}
      {tab === "slot" && <SlotManager />}
      {tab === "utenti" && <UserManager />}
    </main>
  )
}

// ─── Package Manager ────────────────────────────────────────────────────────

function PackageManager() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const EMPTY_PKG = { name: "", ferialePrice: "", weekendPrice: "", description: "", inclusions: "", baseGuests: "", extraGuestPrice: "" }
  const [form, setForm] = useState<any>(EMPTY_PKG)
  const [showNew, setShowNew] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = async () => {
    const res = await fetch("/api/packages?all=true")
    const data = await res.json()
    setPackages(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (id?: string) => {
    const body = id ? { id, ...form } : form
    const res = await fetch("/api/packages", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setMessage({ type: "success", text: id ? "Pacchetto aggiornato" : "Pacchetto creato" })
      setForm(EMPTY_PKG)
      setEditing(null)
      setShowNew(false)
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  const toggleActive = async (pkg: Package) => {
    await fetch("/api/packages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
    })
    load()
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pacchetti Festa</h2>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); setForm(EMPTY_PKG) }}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          + Nuovo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h3 className="font-medium mb-3">Nuovo Pacchetto</h3>
          <PackageForm form={form} setForm={setForm} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => save()} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Crea</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`bg-white border rounded-lg p-4 ${!pkg.isActive ? "opacity-60" : ""}`}>
            {editing === pkg.id ? (
              <>
                <PackageForm
                  form={form}
                  setForm={setForm}
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => save(pkg.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Salva</button>
                  <button onClick={() => { setEditing(null); setForm(EMPTY_PKG) }} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-gray-600">
                    Feriale: {Number(pkg.ferialePrice).toFixed(2)}€ · Weekend: {Number(pkg.weekendPrice).toFixed(2)}€
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {pkg.isActive ? "Attivo" : "Disattivato"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(pkg.id); setForm({ name: pkg.name, ferialePrice: String(pkg.ferialePrice), weekendPrice: String(pkg.weekendPrice), description: (pkg as any).description || "", inclusions: (pkg as any).inclusions || "", baseGuests: (pkg as any).baseGuests ? String((pkg as any).baseGuests) : "", extraGuestPrice: (pkg as any).extraGuestPrice ? String((pkg as any).extraGuestPrice) : "" }) }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => toggleActive(pkg)}
                    className={`text-sm ${pkg.isActive ? "text-yellow-600 hover:text-yellow-800" : "text-green-600 hover:text-green-800"}`}
                  >
                    {pkg.isActive ? "Disattiva" : "Attiva"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PackageForm({ form, setForm }: { form: any; setForm: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo Feriale (€)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.ferialePrice}
          onChange={(e) => setForm({ ...form, ferialePrice: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo Weekend (€)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.weekendPrice}
          onChange={(e) => setForm({ ...form, weekendPrice: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          required
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione breve</label>
        <input
          type="text"
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder="Es. La festa completa: pensiamo a tutto noi."
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Cosa include (una voce per riga — appare nel listino e in prenotazione)</label>
        <textarea
          rows={5}
          value={form.inclusions || ""}
          onChange={(e) => setForm({ ...form, inclusions: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder={"1 vassoio pizza 30x40\nBiglietti invito\n..."}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bambini inclusi (base)</label>
        <input
          type="number"
          min="1"
          value={form.baseGuests || ""}
          onChange={(e) => setForm({ ...form, baseGuests: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder="15"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo invitato extra (€)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.extraGuestPrice || ""}
          onChange={(e) => setForm({ ...form, extraGuestPrice: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder="5.00"
        />
      </div>
    </div>
  )
}

// ─── Service Manager ────────────────────────────────────────────────────────

function ServiceManager() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const EMPTY_SVC = { name: "", price: "", category: "", priceNote: "", optionsText: "", exclusivePerDay: false }
  const [form, setForm] = useState<any>(EMPTY_SVC)
  const [editing, setEditing] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = async () => {
    const res = await fetch("/api/services?all=true")
    const data = await res.json()
    setServices(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (id?: string) => {
    const payload: any = {
      name: form.name,
      price: form.price,
      category: form.category,
      priceNote: form.priceNote,
      exclusivePerDay: form.exclusivePerDay,
      options: String(form.optionsText || "").split("\n").map((x: string) => x.trim()).filter(Boolean),
    }
    const body = id ? { id, ...payload } : payload
    const res = await fetch("/api/services", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setMessage({ type: "success", text: id ? "Servizio aggiornato" : "Servizio creato" })
      setForm(EMPTY_SVC)
      setEditing(null)
      setShowNew(false)
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  const toggleActive = async (svc: Service) => {
    await fetch("/api/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: svc.id, isActive: !svc.isActive }),
    })
    load()
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Servizi Aggiuntivi</h2>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); setForm(EMPTY_SVC) }}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          + Nuovo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h3 className="font-medium mb-3">Nuovo Servizio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo (€) — 0 = su preventivo</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm">
                <option value="">Altro</option>
                <option value="Cibo">Cibo</option>
                <option value="Bevande">Bevande</option>
                <option value="Torte e dolci">Torte e dolci</option>
                <option value="Allestimenti">Allestimenti</option>
                <option value="Extra">Extra</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nota prezzo (es. "al kg", "min. 20")</label>
              <input type="text" value={form.priceNote} onChange={(e) => setForm({ ...form, priceNote: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Opzioni tra cui scegliere (una per riga, es. gli sfondi) — vuoto se il servizio non ha opzioni</label>
              <textarea rows={3} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder={"Unicorni\nSupereroi\nPrincipesse"} />
              <label className="flex items-center gap-2 mt-1 text-xs text-gray-700">
                <input type="checkbox" checked={form.exclusivePerDay} onChange={(e) => setForm({ ...form, exclusivePerDay: e.target.checked })} className="w-3.5 h-3.5" />
                Ogni opzione può essere prenotata da UNA sola festa al giorno (es. sfondi fotografici)
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => save()} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Crea</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.map((svc) => (
          <div key={svc.id} className={`bg-white border rounded-lg p-4 ${!svc.isActive ? "opacity-60" : ""}`}>
            {editing === svc.id ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo (€) — 0 = su preventivo</label>
                    <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm">
                      <option value="">Altro</option>
                      <option value="Cibo">Cibo</option>
                      <option value="Bevande">Bevande</option>
                      <option value="Torte e dolci">Torte e dolci</option>
                      <option value="Allestimenti">Allestimenti</option>
                      <option value="Extra">Extra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nota prezzo</label>
                    <input type="text" value={form.priceNote} onChange={(e) => setForm({ ...form, priceNote: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Opzioni (una per riga) — vuoto se senza opzioni</label>
                    <textarea rows={3} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
                    <label className="flex items-center gap-2 mt-1 text-xs text-gray-700">
                      <input type="checkbox" checked={form.exclusivePerDay} onChange={(e) => setForm({ ...form, exclusivePerDay: e.target.checked })} className="w-3.5 h-3.5" />
                      Ogni opzione prenotabile da UNA sola festa al giorno
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => save(svc.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Salva</button>
                  <button onClick={() => { setEditing(null); setForm(EMPTY_SVC) }} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{svc.name} {(svc as any).category && <span className="text-xs text-gray-400">· {(svc as any).category}</span>}</p>
                  <p className="text-sm text-gray-600">{Number(svc.price) > 0 ? `+${Number(svc.price).toFixed(2)}€` : "su preventivo"}{(svc as any).priceNote ? ` (${(svc as any).priceNote})` : ""}</p>
                  {Array.isArray((svc as any).options) && (svc as any).options.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">Opzioni: {((svc as any).options as any[]).map((o: any) => o.name).join(", ")}{(svc as any).exclusivePerDay ? " · 1 festa/giorno" : ""}</p>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${svc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {svc.isActive ? "Attivo" : "Disattivato"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(svc.id); setForm({ name: svc.name, price: String(svc.price), category: (svc as any).category || "", priceNote: (svc as any).priceNote || "", optionsText: (((svc as any).options || []) as any[]).map((o: any) => o.name).join("\n"), exclusivePerDay: !!(svc as any).exclusivePerDay }) }} className="text-sm text-blue-600 hover:text-blue-800">Modifica</button>
                  <button onClick={() => toggleActive(svc)} className={`text-sm ${svc.isActive ? "text-yellow-600" : "text-green-600"}`}>
                    {svc.isActive ? "Disattiva" : "Attiva"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Slot Manager ───────────────────────────────────────────────────────────

function SlotManager() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ startTime: "", endTime: "", maxParties: "" })
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null)

  const load = async () => {
    const res = await fetch("/api/slots")
    const data = await res.json()
    setSlots(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (slot: Slot) => {
    const res = await fetch("/api/slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slot.id, ...form }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.warning) {
        setMessage({ type: "warning", text: data.warning })
      } else {
        setMessage({ type: "success", text: "Slot aggiornato" })
      }
      setEditing(null)
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-100 text-green-700" :
          message.type === "warning" ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Slot Orari</h2>

      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">
              {slot.slot === "MORNING" ? "☀️ Mattina (11:00-15:00)" : "🌤️ Pomeriggio (15:30-18:30)"}
            </h3>

            {editing === slot.id ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Inizio</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fine</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max feste</label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxParties}
                      onChange={(e) => setForm({ ...form, maxParties: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => save(slot)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Salva</button>
                  <button onClick={() => { setEditing(null); setForm({ startTime: "", endTime: "", maxParties: "" }) }} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
                </div>
              </>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-500">Inizio:</span> <span className="font-medium">{slot.startTime}</span></div>
                  <div><span className="text-gray-500">Fine:</span> <span className="font-medium">{slot.endTime}</span></div>
                  <div><span className="text-gray-500">Max feste:</span> <span className="font-medium">{slot.maxParties}</span></div>
                </div>
                <button
                  onClick={() => { setEditing(slot.id); setForm({ startTime: slot.startTime, endTime: slot.endTime, maxParties: String(slot.maxParties) }) }}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                >
                  Modifica
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── User Manager ───────────────────────────────────────────────────────────

function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: "", name: "", role: "STAFF" })
  const [showNew, setShowNew] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [sessionUserId, setSessionUserId] = useState<string>("")

  const load = async () => {
    const res = await fetch("/api/users")
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Get current session user ID from the first user fetch
    fetch("/api/users").then(r => r.json()).then(data => {
      // We can't get session ID directly, but we'll check on delete
    })
  }, [])

  const createUser = async () => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setMessage({ type: "success", text: "Utente creato. Accederà via magic link." })
      setForm({ email: "", name: "", role: "STAFF" })
      setShowNew(false)
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  const updateRole = async (user: User, newRole: string) => {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    })
    if (res.ok) {
      setMessage({ type: "success", text: "Ruolo aggiornato" })
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  const deleteUser = async (user: User) => {
    if (!confirm(`Sei sicuro di voler eliminare ${user.email}?`)) return
    const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" })
    if (res.ok) {
      setMessage({ type: "success", text: "Utente eliminato" })
      load()
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error || "Errore" })
    }
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Utenti</h2>
        <button
          onClick={() => { setShowNew(!showNew); setForm({ email: "", name: "", role: "STAFF" }) }}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          + Nuovo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h3 className="font-medium mb-3">Nuovo Utente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ruolo</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm">
                <option value="STAFF">Staff</option>
                <option value="OWNER">Proprietario</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={createUser} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Crea</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">Annulla</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border text-sm font-medium">Email</th>
              <th className="text-left p-2 border text-sm font-medium">Nome</th>
              <th className="text-left p-2 border text-sm font-medium">Ruolo</th>
              <th className="text-center p-2 border text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-2 border text-sm">{user.email}</td>
                <td className="p-2 border text-sm">{user.name || "—"}</td>
                <td className="p-2 border text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user, e.target.value)}
                    className="text-sm border rounded px-1 py-0.5"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="OWNER">Proprietario</option>
                  </select>
                </td>
                <td className="p-2 border text-center text-sm">
                  <button
                    onClick={() => deleteUser(user)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Gli utenti ricevono un magic link via email per accedere. I proprietari (OWNER) hanno accesso completo alla dashboard. Lo staff (STAFF) può solo vedere la vista /staff.
      </p>
    </div>
  )
}