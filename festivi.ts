// Festivi nazionali italiani: a questi si applica il prezzo weekend/festivo.

// Pasqua (algoritmo di Gauss) → ritorna la data del Lunedì dell'Angelo
function pasquetta(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=marzo, 4=aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1
  const easter = new Date(year, month - 1, day)
  easter.setDate(easter.getDate() + 1) // lunedì dell'Angelo
  return easter
}

const FISSI = [
  [1, 1],   // Capodanno
  [1, 6],   // Epifania
  [4, 25],  // Liberazione
  [5, 1],   // Festa del Lavoro
  [6, 2],   // Repubblica
  [8, 15],  // Ferragosto
  [11, 1],  // Ognissanti
  [12, 8],  // Immacolata
  [12, 25], // Natale
  [12, 26], // Santo Stefano
]

export function isFestivo(date: Date): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (FISSI.some(([fm, fd]) => fm === m && fd === d)) return true
  const p = pasquetta(date.getFullYear())
  return p.getMonth() === date.getMonth() && p.getDate() === d
}

// Weekend (sab/dom) oppure festivo nazionale
export function isWeekendOFestivo(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDay()
  return day === 0 || day === 6 || isFestivo(d)
}
