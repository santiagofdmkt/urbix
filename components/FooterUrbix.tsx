import Link from 'next/link'

export default function FooterUrbix() {
  return (
    <footer className="bg-zinc-900 text-white pt-16 pb-8 w-full">
      <div className="max-w-7xl mx-auto px-4">

        {/* Boton volver arriba: sube al ancla #top que esta al inicio de cada pagina */}
        <div className="flex flex-col items-center mb-12">
          <a href="#top" aria-label="Volver arriba" className="group flex items-center justify-center w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition hover:-translate-y-1">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/>
            </svg>
          </a>
          <a href="#top" className="text-xs text-zinc-400 hover:text-rose-400 mt-3 transition font-medium">Volver arriba</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <p className="text-2xl font-bold text-rose-400 mb-3">urbix</p>
            <p className="text-sm text-zinc-400 leading-relaxed">El buscador inmobiliario con IA que entiende lo que buscás.</p>
            <div className="flex gap-3 mt-4">
              {['I', 'T', 'L'].map(s => (
                <a key={s} href="#" className="w-8 h-8 bg-zinc-800 hover:bg-rose-500 rounded-full flex items-center justify-center transition">
                  <span className="text-xs text-zinc-400 hover:text-white">{s}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300 mb-4">Propiedades</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {['Casas', 'Departamentos', 'Terrenos', 'Quintas', 'Locales comerciales'].map(l => (
                <li key={l}><a href="#" className="hover:text-rose-400 transition">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300 mb-4">Localidades</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {['Chivilcoy', 'Mercedes', '25 de Mayo', '9 de Julio', 'Pehuajó', 'Trenque Lauquen', 'Lobos'].map(l => (
                <li key={l}><Link href={'/' + encodeURIComponent(l)} className="hover:text-rose-400 transition">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300 mb-4">Empresa</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {['Acerca de urbix', 'Soy inmobiliaria', 'Contacto', 'Términos de uso', 'Privacidad'].map(l => (
                <li key={l}><a href="#" className="hover:text-rose-400 transition">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-600">© 2026 Urbix. Todos los derechos reservados.</p>
          <p className="text-xs text-zinc-600">Argentina</p>
        </div>
      </div>
    </footer>
  )
}