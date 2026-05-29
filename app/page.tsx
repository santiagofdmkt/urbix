import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('*')
    .eq('activo', true)
    .not('imagenes', 'is', null)
    .order('created_at', { ascending: false })

  const { count: totalDB } = await supabase
    .from('propiedades')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  const total = totalDB || 0

  function getImg(imagenes: any): string | null {
    try {
      if (!imagenes) return null
      const raw = typeof imagenes === 'string' ? JSON.parse(imagenes) : imagenes
      const src = Array.isArray(raw) ? raw[0] : raw
      return typeof src === 'string' && src.startsWith('http') ? src : null
    } catch {
      return typeof imagenes === 'string' && imagenes.startsWith('http') ? imagenes : null
    }
  }

  function getTitulo(titulo: string | null): string {
    const t = titulo?.trim() || ''
    return t.length > 80 ? t.slice(0, 80).trim() + '...' : t
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#" className="text-zinc-500 hover:text-zinc-800 transition">Comprar</Link>
            <Link href="#" className="text-zinc-500 hover:text-zinc-800 transition">Alquilar</Link>
            <Link href="#" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</button>
            <button className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">
              Registrarse
            </button>
            <button className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition">
              <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative py-20 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #ede9fe 100%)" }}>
        <p className="text-xs font-bold tracking-widest text-rose-400 uppercase mb-4">Buscador inmobiliario con IA</p>
        <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 leading-tight mb-3">
          Buscá propiedades<br />
          <span className="text-rose-500 italic">como te las imaginás</span>
        </h1>
        <p className="text-lg text-zinc-500 max-w-lg mx-auto mb-10">
          Describí lo que buscás con tus palabras. Sin filtros complicados.
        </p>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Ej: casa con jardín, 3 dormitorios, cerca de la plaza..."
              className="flex-1 text-sm text-zinc-800 outline-none bg-transparent placeholder-zinc-400" />
            <button className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
              Buscar
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["Casas", "Departamentos", "Terrenos", "Alquiler", "Venta", "Apto crédito"].map(f => (
              <button key={f} className="text-xs px-4 py-1.5 rounded-full border border-zinc-200 bg-white/80 text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition">
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-zinc-100 py-6">
        <div className="max-w-4xl mx-auto flex justify-center gap-16">
          {[
            { num: `${total}`, label: "Propiedades disponibles" },
            { num: "IA", label: "Búsqueda inteligente" },
            { num: "100%", label: "Gratis para buscar" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-rose-500">{s.num}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROPIEDADES RECIENTES */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Nuevas y destacadas</p>
            <h2 className="text-2xl font-bold text-zinc-900">Lo último disponible</h2>
          </div>
          <button className="text-sm text-rose-500 hover:underline font-medium">Ver más →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {propiedades?.slice(0, 8).map(p => {
            const img = getImg(p.imagenes)
            const titulo = getTitulo(p.titulo)
            return (
              <Link key={p.id} href={`/propiedad/${p.id}`} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                <div className="relative h-44 bg-zinc-100 overflow-hidden">
                  {img && <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />}
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-semibold text-rose-500 px-2 py-1 rounded-lg">
                    {p.moneda} {p.precio?.toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{titulo}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{p.direccion}</p>
                  <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                    {p.dormitorios && <span>{p.dormitorios} dorm.</span>}
                    {p.banos && <span>{p.banos} baños</span>}
                    {p.superficie_m2 && <span>{p.superficie_m2} m²</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* EXPLORAR POR CATEGORÍA */}
      <section className="bg-zinc-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Explorá por categoría</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Encontrá lo que buscás más rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Casas", icon: "🏠", desc: "Casas en venta" },
              { label: "Departamentos", icon: "🏢", desc: "Deptos y PHs" },
              { label: "Terrenos", icon: "🌿", desc: "Lotes y terrenos" },
              { label: "Quintas", icon: "🏡", desc: "Casas quinta" },
            ].map(cat => (
              <button key={cat.label} className="bg-white rounded-2xl p-5 text-left border border-zinc-100 hover:border-rose-300 hover:shadow-md transition group">
                <span className="text-3xl mb-3 block">{cat.icon}</span>
                <p className="font-semibold text-zinc-800 text-sm">{cat.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{cat.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TODAS LAS PROPIEDADES */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Propiedades recientes</p>
            <h2 className="text-2xl font-bold text-zinc-900">Todas las propiedades</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {propiedades?.map(p => {
            const img = getImg(p.imagenes)
            const titulo = getTitulo(p.titulo)
            return (
              <Link key={p.id} href={`/propiedad/${p.id}`} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                <div className="relative h-52 bg-zinc-100 overflow-hidden">
                  {img && <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white font-bold text-lg">{p.moneda} {p.precio?.toLocaleString("es-AR")}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-zinc-800 line-clamp-2 mb-1">{titulo}</p>
                  <p className="text-xs text-zinc-400 line-clamp-1">{p.direccion}, {p.ciudad}</p>
                  <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                    {p.dormitorios && <span>🛏 {p.dormitorios}</span>}
                    {p.banos && <span>🚿 {p.banos}</span>}
                    {p.superficie_m2 && <span>📐 {p.superficie_m2} m²</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="text-2xl font-bold text-rose-400 mb-3">urbix</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                El buscador inmobiliario con IA para toda Argentina. Encontrá tu próxima propiedad con solo describirla.
              </p>
              <div className="flex gap-3 mt-4">
                {["instagram", "twitter", "linkedin"].map(s => (
                  <a key={s} href="#" className="w-8 h-8 bg-zinc-800 hover:bg-rose-500 rounded-full flex items-center justify-center transition">
                    <span className="text-xs text-zinc-400 hover:text-white">{s[0].toUpperCase()}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-4">Propiedades en Venta</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                {["Casas", "Departamentos", "Terrenos", "Quintas", "Locales comerciales"].map(l => (
                  <li key={l}><a href="#" className="hover:text-rose-400 transition">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-4">Herramientas</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                {["Búsqueda con IA", "Favoritos", "Alertas de precio", "Comparar propiedades", "Calculadora"].map(l => (
                  <li key={l}><a href="#" className="hover:text-rose-400 transition">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-4">Empresa</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                {["Acerca de urbix", "Soy inmobiliaria", "Contacto", "Términos de uso", "Política de privacidad"].map(l => (
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

    </div>
  )
}