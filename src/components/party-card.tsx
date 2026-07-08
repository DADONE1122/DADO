interface PartyCardProps {
  id: string
  celebrationName: string
  parentName: string
  date: string
  slot: string
  status: string
}

export function PartyCard({ celebrationName, parentName, date, slot, status }: PartyCardProps) {
  const isPending = status === "PENDING_DETAILS"
  const isComplete = status === "COMPLETE"
  const isCancelled = status === "CANCELLED"

  return (
    <div className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
      isCancelled ? "bg-gray-50 opacity-75" : "bg-white"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{celebrationName}</h3>
            {isPending && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border-2 border-red-400 animate-pulse">
                ⚠️ Dettagli mancanti
              </span>
            )}
            {isComplete && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Completa
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                Annullata
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {parentName} · {new Date(date).toLocaleDateString("it-IT")} ·{" "}
            {slot === "MORNING" ? "Mattina" : "Pomeriggio"}
          </p>
        </div>
        <a
          href={`/dashboard/feste/${id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap ml-4"
        >
          Apri scheda →
        </a>
      </div>
    </div>
  )
}