// Helpers WhatsApp condivisi (client e server)

export function waLink(phone: string, text: string) {
  let digits = (phone || "").replace(/\D/g, "")
  if (digits.length === 10 && digits.startsWith("3")) digits = "39" + digits
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

export function formatDataIt(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function msgSollecitoDettagli(parentName: string, childName: string, date: Date | string) {
  return `Ciao ${parentName}! 😊 Ti scriviamo da Pito Pitù per la festa di ${childName} di ${formatDataIt(date)}: ci mancano ancora un paio di dettagli (dolce ed eventuali richieste). Quando hai un momento facci sapere, grazie! 🎉`
}

export function msgConfermaFesta(parentName: string, childName: string, date: Date | string, ora: string) {
  return `Ciao ${parentName}! La festa di ${childName} è confermata per ${formatDataIt(date)} alle ${ora} da Pito Pitù 🎉 Vi aspettiamo in Via Kennedy 28 a Cabiate. A presto!`
}
