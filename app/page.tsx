// app/page.tsx
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const LOCALIDADES = [
  { nombre: 'Chivilcoy',       cp: 6620 },
  { nombre: 'Mercedes',        cp: 6600 },
  { nombre: '25 de Mayo',      cp: 6660 },
  { nombre: '9 de Julio',      cp: 6500 },
  { nombre: 'Pehuajó',         cp: 6450 },
  { nombre: 'Trenque Lauquen', cp: 6400 },
  { nombre: 'Lobos',           cp: 7240 },
]

const FOTOS_LOCALIDADES: Record<string, string> = {
  'Chivilcoy':       'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
  'Mercedes':        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80',
  '25 de Mayo':      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=80',
  '9 de Julio':      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
  'Pehuajó':         'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'Trenque Lauquen': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&q=80',
  'Lobos':           'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
}

const DEFAULT_FOTO = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80'

export default async function Home() {
  const { data: raw } = await supabase
    .from('propiedades')
    .select('*')
    .eq('activo', true)
    .not('imagenes', 'is', null)
    .order('created_at', { ascending: false })

  const propiedades = (raw || []).sort((a, b) => {
    const tieneStorage = (p: any) => {
      try {
        const imgs = JSON.parse(p.imagenes)
        return Array.isArray(imgs) && imgs[0]?.includes('supabase.co') ? 1 : 0
      } catch { return 0 }
    }
    const countImgs = (p: any) => {
      try {
        const imgs = JSON.parse(p.imagenes)
        return Array.isArray(imgs) ? imgs.length : 1
      } catch { return 1 }
    }
    const diff = tieneStorage(b) - tieneStorage(a)
    if (diff !== 0) return diff
    return countImgs(b) - countImgs(a)
  })

  const { data: porCiudad } = await supabase
    .from('propiedades')
    .select('ciudad')
    .eq('activo', true)

  const conteoXCiudad: Record<string, number> = {}
  for (const p of porCiudad || []) {
    if (p.ciudad) conteoXCiudad[p.ciudad] = (conteoXCiudad[p.ciudad] || 0) + 1
  }

  const total = propiedades.length

  function getImg(imagenes: any): string | null {
    try {
      if (!imagenes) return null
      const raw = typeof imagenes === 'string' ? JSON.parse(imagenes) : imagenes
      const arr = Array.isArray(raw) ? raw : [raw]
      const real = arr.find((src: string) => typeof src === 'string' && src.includes('supabase.co'))
      return real || null
    } catch { return null }
  }

  function getTitulo(titulo: string | null): string {
    const t = titulo?.trim() || ''
    return t.length > 80 ? t.slice(0, 80).trim() + '...' : t
  }

  const destacadas = propiedades.slice(0, 8)
  const todas = propiedades

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#comprar" className="text-zinc-500 hover:text-zinc-800 transition">Comprar</Link>
            <Link href="#alquilar" className="text-zinc-500 hover:text-zinc-800 transition">Alquilar</Link>
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</button>
            <button className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</button>
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
        <p className="text-lg text-zinc-500 max-w-lg mx-auto mb-8">
          Describí lo que buscás con tus palabras. Sin filtros complicados.
        </p>

        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center gap-2 mb-4">
            {['Comprar', 'Alquilar'].map((tab, i) => (
              <button key={tab} className={`px-6 py-2 rounded-full text-sm font-semibold transition border ${
                i === 0
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-rose-300'
              }`}>
                {tab}
              </button>
            ))}
          </div>

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
            {['Casas', 'Departamentos', 'Terrenos', 'Quintas', 'Locales'].map(f => (
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
            { num: `${total}+`, label: "Propiedades disponibles" },
            { num: "7",         label: "Localidades del interior" },
            { num: "IA",        label: "Búsqueda inteligente" },
            { num: "100%",      label: "Gratis para buscar" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-rose-500">{s.num}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORAR POR TIPO */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Explorá por categoría</p>
        <h2 className="text-2xl font-bold text-zinc-900 mb-5">Encontrá lo que buscás</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Casas',         icon: '🏠', desc: 'En venta' },
            { label: 'Departamentos', icon: '🏢', desc: 'Deptos y PHs' },
            { label: 'Terrenos',      icon: '🌿', desc: 'Lotes y terrenos' },
            { label: 'Quintas',       icon: '🏡', desc: 'Casas quinta' },
            { label: 'Locales',       icon: '🏪', desc: 'Comerciales' },
          ].map(cat => (
            <button key={cat.label} className="bg-white rounded-2xl p-4 text-left border border-zinc-100 hover:border-rose-300 hover:shadow-md transition group">
              <span className="text-3xl mb-2 block">{cat.icon}</span>
              <p className="font-semibold text-zinc-800 text-sm">{cat.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{cat.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* PROPIEDADES DESTACADAS */}
      <section id="comprar" className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Nuevas y destacadas</p>
            <h2 className="text-2xl font-bold text-zinc-900">Lo último disponible</h2>
          </div>
          <Link href="#todas" className="text-sm text-rose-500 hover:underline font-medium">Ver más →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {destacadas.map(p => {
            const img = getImg(p.imagenes)
            if (!img) return null
            const titulo = getTitulo(p.titulo)
            return (
              <Link key={p.id} href={`/propiedad/${p.id}`} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                <div className="relative h-44 bg-zinc-100 overflow-hidden">
                  <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-semibold text-rose-500 px-2 py-1 rounded-lg">
                    {p.moneda} {p.precio?.toLocaleString('es-AR')}
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

      {/* LOCALIDADES */}
      <section className="bg-zinc-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Cobertura regional</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Propiedades en el interior bonaerense</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {LOCALIDADES.map(loc => {
              const cant = conteoXCiudad[loc.nombre] || 0
              const tiene = cant > 0
              const foto = FOTOS_LOCALIDADES[loc.nombre] || DEFAULT_FOTO
              return (
                <div key={loc.nombre} className={`relative rounded-2xl overflow-hidden group cursor-pointer ${tiene ? 'hover:shadow-lg' : 'opacity-70'} transition`}>
                  <div className="h-28 relative">
                    <img src={foto} alt={loc.nombre} className={`w-full h-full object-cover ${tiene ? 'group-hover:scale-105' : 'grayscale'} transition duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {!tiene && (
                      <div className="absolute top-2 right-2 bg-zinc-700/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Próximamente
                      </div>
                    )}
                    {tiene && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {cant} prop.
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-semibold leading-tight">{loc.nombre}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TODAS LAS PROPIEDADES */}
      <section id="todas" className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Propiedades recientes</p>
            <h2 className="text-2xl font-bold text-zinc-900">Todas las propiedades</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {todas.map(p => {
            const img = getImg(p.imagenes)
            if (!img) return null
            const titulo = getTitulo(p.titulo)
            return (
              <Link key={p.id} href={`/propiedad/${p.id}`} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                <div className="relative h-52 bg-zinc-100 overflow-hidden">
                  <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white font-bold text-lg">{p.moneda} {p.precio?.toLocaleString('es-AR')}</p>
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
                El buscador inmobiliario con IA para el interior bonaerense. Encontrá tu próxima propiedad con solo describirla.
              </p>
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
                  <li key={l}><a href="#" className="hover:text-rose-400 transition">{l}</a></li>
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
            <p className="text-xs text-zinc-600">Interior de la Provincia de Buenos Aires</p>
          </div>
        </div>
      </footer>

    </div>
  )
}