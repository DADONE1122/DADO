import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function getListino() {
  const [packages, services, content] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.additionalService.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.listinoContent.findUnique({
      where: { id: "singleton" },
    }),
  ])
  return { packages, services, content }
}

export default async function HomePage() {
  const { packages, services, content } = await getListino()

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF8F0" }}>
      {/* Hero */}
      <header className="py-8 px-4 text-center border-b" style={{ borderColor: "#D4C5A9" }}>
        <div className="max-w-lg mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/draghetto.png"
            alt="Draghetto Pito Pitù"
            className="mx-auto mb-2 h-24 w-auto"
          />
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#2B2B6B" }}>
            Pito Pitù
          </h1>
          <p className="text-gray-600 text-sm">Ludoteca e Giropizza — Cabiate (CO)</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Title & subtitle */}
        {content && (
          <section className="text-center">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#2B2B6B" }}>
              {content.titolo}
            </h2>
            {content.sottotitolo && (
              <p className="text-gray-700 text-sm leading-relaxed">
                {content.sottotitolo}
              </p>
            )}
          </section>
        )}

        {/* Packages */}
        <section>
          <h3 className="text-lg font-bold mb-3" style={{ color: "#2B2B6B" }}>
            🎉 Pacchetti Festa
          </h3>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-lg border p-4"
                style={{ borderColor: "#D4C5A9" }}
              >
                <h4 className="font-bold text-base mb-1" style={{ color: "#2B2B6B" }}>
                  {pkg.name}
                </h4>
                {pkg.description && (
                  <p className="text-xs text-gray-500 mb-2">{pkg.description}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Feriale</span>
                  <span className="font-semibold" style={{ color: "#2B2B6B" }}>
                    {Number(pkg.ferialePrice).toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Weekend / Festivo</span>
                  <span className="font-semibold" style={{ color: "#2B2B6B" }}>
                    {Number(pkg.weekendPrice).toFixed(2)}€
                  </span>
                </div>
                {pkg.inclusions && (
                  <ul className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: "#EFE5D0" }}>
                    {String(pkg.inclusions).split("\n").filter(Boolean).map((inc, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-600">
                        <span className="text-green-600">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {pkg.extraGuestPrice && (
                  <p className="mt-2 text-xs text-gray-500">
                    Base {pkg.baseGuests || 15} bambini · invitato extra +{Number(pkg.extraGuestPrice).toFixed(2)}€
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Additional Services */}
        {services.length > 0 && (
          <section>
            <h3 className="text-lg font-bold mb-3" style={{ color: "#2B2B6B" }}>
              ✨ Servizi Aggiuntivi
            </h3>
            <div className="space-y-4">
              {["Cibo", "Bevande", "Torte e dolci", "Allestimenti", "Extra"]
                .concat(
                  Array.from(
                    new Set(
                      services
                        .map((s) => s.category || "Altro")
                        .filter(
                          (c) =>
                            !["Cibo", "Bevande", "Torte e dolci", "Allestimenti", "Extra"].includes(c)
                        )
                    )
                  )
                )
                .filter((cat) => services.some((s) => (s.category || "Altro") === cat))
                .map((cat) => (
                  <div key={cat}>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                      {cat}
                    </h4>
                    <div className="space-y-1.5">
                      {services
                        .filter((s) => (s.category || "Altro") === cat)
                        .map((svc) => (
                          <div
                            key={svc.id}
                            className="bg-white rounded-lg border p-3 flex justify-between items-center gap-3"
                            style={{ borderColor: "#D4C5A9" }}
                          >
                            <span className="text-gray-700 text-sm">
                              {svc.name}
                              {svc.priceNote && (
                                <span className="text-xs text-gray-400"> ({svc.priceNote})</span>
                              )}
                            </span>
                            <span
                              className="font-semibold text-sm whitespace-nowrap"
                              style={{ color: "#2B2B6B" }}
                            >
                              {Number(svc.price) > 0
                                ? `+${Number(svc.price).toFixed(2)}€`
                                : "su preventivo"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {content?.note && (
          <section
            className="bg-white rounded-lg border p-4 text-sm text-gray-600 leading-relaxed"
            style={{ borderColor: "#D4C5A9" }}
          >
            <p className="whitespace-pre-line">{content.note}</p>
          </section>
        )}

        {/* Footer: address + WhatsApp */}
        <footer className="text-center pt-4 border-t" style={{ borderColor: "#D4C5A9" }}>
          <p className="text-sm text-gray-600 mb-3">
            Via Kennedy 28, 22060 Cabiate (CO)
          </p>
          {content?.numeroWhatsapp && (
            <a
              href={`https://wa.me/${content.numeroWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm"
              style={{ backgroundColor: "#25D366" }}
            >
              💬 Scrivici su WhatsApp
            </a>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Pito Pitù © {new Date().getFullYear()}
          </p>
        </footer>
      </main>

      {/* Draghetto in basso a destra, come nel listino cartaceo */}
      <div className="pointer-events-none fixed bottom-0 right-0 z-0 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/draghetto.png"
          alt=""
          aria-hidden="true"
          className="h-32 w-auto opacity-90 sm:h-44"
        />
      </div>
    </div>
  )
}