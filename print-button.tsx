"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-1.5 rounded-lg border text-sm text-gray-700 hover:bg-gray-50 print:hidden"
      title="Stampa il foglio della settimana"
    >
      🖨️ Stampa
    </button>
  )
}
