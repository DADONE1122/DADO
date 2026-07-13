"use client"

import { useMemo, useState } from "react"

type PartyRow = {
  id: string
  celebrationName: string
  parentName: string
  parentPhone: string
  age: number
  date: string
  slot: string
  status: string
  packageName: string
}

const TABS = [
  { key: "upcoming", label: "In programma" },
  { key: "pending", label: "Da confermare" },
  { key: "complete", label: "Confermate" },
  { key: "past", label: "Passate" },
  { key: "cancelled", label: "Archivio" },
] as const

export function FesteList({ parties }: { parties: PartyRow[] }) {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("upcoming")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      upcoming: 0,
      pending: 0,
      complete: 0,
      past: 0,
      cancelled: 0,
    }
    for (const p of parties) {
      const d = new Date(p.date)
      if (p.status === "CANCELLED") c.cancelled++
      else if (d < today) c.past++
      else {
        c.upcoming++
        if (p.status === "PENDING_DETAILS") c.pending++
        if (p.status === "COMPLETE") c.complete++
      }
    }
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return parties
      .filter((p) => {
        const d = new Date(p.date)
        if (tab === "cancelled") {
          if (p.status !== "CANCELLED") return false
        } else if (tab === "past") {
          if (p.status === "CANCELLED" || d >= today) return false
        } else {
          if (p.status === "CANCELLED" || d < today) return false
          if (tab === "pending" && p.status !== "PENDING_DETAILS") return false
          if (tab === "complete" && p.status !== "COMPLETE") return false
        }
        if (!q) return true
        return (
          p.celebrationName.toLowerCase().includes(q) ||
          p.parentName.toLowerCase().includes(q) ||
          p.parentPhone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
        )
      })
      .sort((a, b) =>
        tab === "past" || tab === "cancelled"
          ? +new Date(b.date) - +new Date(a.date)
          : +new Date(a.date) - +new Date(b.date)
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, query, tab])

  return (
    <div>
      {/* Ricerca */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Cerca per festeggiato, genitore o telefono..."
        className="w-full px-4 py-2.5 border rounded-xl mb-4 bg-white focus:outline-none focus:ring-2"
        style={{ borderColor: "#E5D9BF" }}
      />

      {/* Filtri */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              tab === t.key ? "text-white" : "bg-white text-gray-600 border"
            }`}
            style={
              tab === t.key
                ? { backgroundColor: "#2B2B6B" }
                : { borderColor: "#E5D9BF" }
            }
          >
            {t.label}{" "}
            <span className={tab === t.key ? "text-white/70" : "text-gray-400"}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Risultati */}
      {filtered.length === 0 ? (
        <div
          className="bg-white border rounded-xl p-10 text-center text-gray-400"
          style={{ borderColor: "#E5D9BF" }}
        >
          {query
            ? "Nessuna festa trovata per questa ricerca."
            : "Nessuna festa in questa sezione."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const d = new Date(p.date)
            const isCancelled = p.status === "CANCELLED"
            return (
              <a
                key={p.id}
                href={`/dashboard/feste/${p.id}`}
                className={`block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${
                  isCancelled ? "opacity-60" : ""
                }`}
                style={{ borderColor: "#E5D9BF" }}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-lg flex flex-col items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: isCancelled ? "#9CA3AF" : "#2B2B6B" }}
                    >
                      <span className="text-sm font-bold leading-none">
                        {d.getDate()}
                      </span>
                      <span className="text-[10px] uppercase leading-none mt-0.5">
                        {d.toLocaleDateString("it-IT", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {p.celebrationName}{" "}
                        <span className="text-gray-400 font-normal">
                          ({p.age} anni)
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {d.toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {p.slot === "MORNING" ? "Mattina" : "Pomeriggio"} ·{" "}
                        {p.packageName} · {p.parentName} ({p.parentPhone})
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                      isCancelled
                        ? "bg-gray-100 text-gray-500"
                        : p.status === "COMPLETE"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {isCancelled
                      ? "Annullata"
                      : p.status === "COMPLETE"
                      ? "Confermata"
                      : "Da confermare"}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
