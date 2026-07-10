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
      orderBy: { name: "asc" },
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
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#2B2B6B" }}>
            🦕 Pito Pitù
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
                <h4 className="font-bold text-base mb-2" style={{ color: "#2B2B6B" }}>
                  {pkg.name}
                </h4>
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
            <div className="space-y-2">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-white rounded-lg border p-3 flex justify-between items-center"
                  style={{ borderColor: "#D4C5A9" }}
                >
                  <span className="text-gray-700 text-sm">{svc.name}</span>
                  <span className="font-semibold text-sm" style={{ color: "#2B2B6B" }}>
                    +{Number(svc.price).toFixed(2)}€
                  </span>
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
    </div>
  )
}