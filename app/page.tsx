// app/page.tsx
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BuscadorHero from './BuscadorHero'
import BotonesHero from './BotonesHero'

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
  'Pehuajó':         'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  'Trenque Lauquen': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&q=80',
  'Lobos':           'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
}

// Provincias/regiones que todavia no tienen cobertura. Se muestran como una sola
// tarjeta "Proximamente" cada una (sin desglosar localidades), para acortar la seccion.
const REGIONES_PROXIMAMENTE: { nombre: string; foto: string }[] = [
  { nombre: 'Ciudad Autónoma de Buenos Aires', foto: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80' },
  { nombre: 'Costa Atlántica',                 foto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
  { nombre: 'Córdoba',                         foto: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80' },
  { nombre: 'Santa Fe',                        foto: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=400&q=80' },
  { nombre: 'La Pampa',                        foto: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80' },
]

const DEFAULT_FOTO = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80'

// Encabezado de seccion: etiqueta fina con degrade vivo (mismo tono que la barra
// de stats) para que cada titulo levante, marcada pero prolija. El ring interno
// tenue le da definicion sin recargarla. inline-block para que el boton "Ver mas"
// pueda quedar pegado al lado en vez de irse al extremo derecho.
function SectionHeading({ eyebrow, titulo, acento = 'rose' }: { eyebrow: string; titulo: string; acento?: 'rose' | 'blue' | 'emerald' }) {
  const fondo =
    acento === 'blue'
      ? 'linear-gradient(120deg, #2563eb 0%, #3b82f6 50%, #06b6d4 100%)'
      : acento === 'emerald'
      ? 'linear-gradient(120deg, #047857 0%, #10b981 55%, #34d399 100%)'
      : 'linear-gradient(120deg, #e1108c 0%, #f43f5e 45%, #fb6f4c 100%)'
  const sombra =
    acento === 'blue'
      ? '0 4px 14px -8px rgba(37,99,235,0.5)'
      : acento === 'emerald'
      ? '0 4px 14px -8px rgba(5,150,105,0.5)'
      : '0 4px 14px -8px rgba(225,16,140,0.45)'
  return (
    <div
      className="inline-block rounded-lg px-3.5 py-2 ring-1 ring-inset ring-white/20"
      style={{ background: fondo, boxShadow: sombra }}
    >
      <p className="text-[10px] font-semibold uppercase mb-0.5 text-white/70" style={{ letterSpacing: '0.2em' }}>
        {eyebrow}
      </p>
      <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">
        {titulo}
      </h2>
    </div>
  )
}

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
    const real = arr.find((src: string) => typeof src === 'string' && src.startsWith('http'))
    return real || null
  } catch { return null }
}

  function getTitulo(titulo: string | null): string {
    const t = titulo?.trim() || ''
    return t.length > 80 ? t.slice(0, 80).trim() + '...' : t
  }

  const destacadas = propiedades.filter((p: any) => p.operacion === 'venta').slice(0, 8)
  const alquileres = propiedades.filter((p: any) => p.operacion === 'alquiler').slice(0, 8)
  const recientes = propiedades.slice(0, 9)

  return (
    <div className="min-h-screen bg-white font-sans w-full overflow-x-hidden">
      <span id="top" />

      {/* NAV */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight shrink-0">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#comprar" className="text-zinc-500 hover:text-zinc-800 transition">Comprar</a>
            <a href="#alquiler" className="text-zinc-500 hover:text-zinc-800 transition">Alquilar</a>
            <a href="#campos" className="text-zinc-500 hover:text-zinc-800 transition">Campos del interior</a>
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</Link>
            <Link href="/registro" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</Link>
            <Link href="/perfil" className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition">
              <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <Link href="/soy-inmobiliaria" className="text-xs font-semibold text-zinc-600 hover:text-rose-500 transition">
              Soy inmobiliaria
            </Link>
            <Link href="/registro" className="bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Registrarse</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative py-12 md:py-20 px-4 text-center overflow-hidden w-full"
        style={{ background: "linear-gradient(135deg, #fdd9de 0%, #f9b9cb 45%, #e3c4ec 100%)" }}>
        <p className="text-xs font-bold tracking-widest text-rose-400 uppercase mb-4">Buscador inmobiliario con IA</p>
        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 leading-tight mb-4">
          Buscá propiedades<br />
          <span className="text-rose-500 italic">como te las imaginás</span>
        </h1>
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-rose-600 bg-white/70 border border-rose-200 px-4 py-1.5 rounded-full shadow-sm">
            📍 Pensado para el interior del país
          </span>
        </div>
        <p className="text-base md:text-lg text-zinc-500 max-w-lg mx-auto mb-8">
          Casas, departamentos y campos en el interior bonaerense. Describí lo que buscás con tus palabras, sin filtros complicados.
        </p>
        <div className="max-w-2xl mx-auto w-full">
          <BotonesHero />
          <BuscadorHero />
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-rose-400 py-6 w-full overflow-x-hidden"
        style={{ background: 'linear-gradient(120deg, #e1108c 0%, #f43f5e 45%, #fb6f4c 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:flex md:justify-center gap-6 md:gap-16">
          {[
            { num: `${total}+`, label: "Propiedades disponibles" },
            { num: "7",         label: "Localidades del interior" },
            { num: "IA",        label: "Búsqueda inteligente" },
            { num: "100%",      label: "Gratis para buscar" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-white drop-shadow">{s.num}</p>
              <p className="text-xs mt-0.5 text-rose-50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROPIEDADES POR ZONA */}
      <section className="bg-zinc-50 py-12 w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading eyebrow="Cobertura regional" titulo="Propiedades por zona" />

          {/* Provincia de Buenos Aires (interior) — con localidades que se van cargando */}
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3 mt-8">Provincia de Buenos Aires</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-12">
            {LOCALIDADES.map(loc => {
              const cant = conteoXCiudad[loc.nombre] || 0
              const tiene = cant > 0
              const foto = FOTOS_LOCALIDADES[loc.nombre] || DEFAULT_FOTO
              return (
                <Link key={loc.nombre} href={tiene ? '/' + encodeURIComponent(loc.nombre) : '#'}
                  className={`relative rounded-2xl overflow-hidden group cursor-pointer ${tiene ? 'hover:shadow-lg' : 'opacity-70 pointer-events-none'} transition`}>
                  <div className="h-28 relative">
                    <img src={foto} alt={loc.nombre} className={`w-full h-full object-cover ${tiene ? 'group-hover:scale-105' : 'grayscale'} transition duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {!tiene && <div className="absolute top-2 right-2 bg-zinc-700/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Próximamente</div>}
                    {tiene && <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{cant} prop.</div>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-semibold leading-tight">{loc.nombre}</p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Otras provincias y regiones — una sola tarjeta por zona, en "Proximamente" */}
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Otras provincias y regiones</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {REGIONES_PROXIMAMENTE.map(reg => (
              <div key={reg.nombre} className="relative rounded-2xl overflow-hidden opacity-80 cursor-default">
                <div className="h-28 relative">
                  <img src={reg.foto} alt={reg.nombre} className="w-full h-full object-cover grayscale" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
                  <div className="absolute top-2 right-2 bg-zinc-700/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Próximamente
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-semibold leading-tight">{reg.nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* PROPIEDADES EN ALQUILER */}
      <section id="alquiler" className="bg-zinc-50 w-full py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <SectionHeading eyebrow="Disponibles ahora" titulo="Propiedades en alquiler" acento="blue" />
            <Link href="/propiedades?operacion=alquiler" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 border border-blue-200 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-full transition">
              Ver más
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {alquileres.map(p => {
              const img = getImg(p.imagenes)
              if (!img) return null
              const titulo = getTitulo(p.titulo)
              return (
                <Link key={p.id} href={`/propiedad/${p.id}`} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition bg-white">
                  <div className="relative h-44 bg-zinc-100 overflow-hidden">
                    <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-semibold text-rose-500 px-2 py-1 rounded-lg">
                      {p.moneda} {p.precio?.toLocaleString('es-AR')}
                    </div>
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Alquiler
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
          {alquileres.length === 0 && (
            <div className="text-center py-16 text-zinc-400">
              <p className="text-4xl mb-3">🏠</p>
              <p className="font-semibold">Próximamente propiedades en alquiler</p>
              <p className="text-sm mt-1">Estamos incorporando más propiedades cada día</p>
            </div>
          )}
        </div>
      </section>

      {/* PROPIEDADES RECIENTES */}
      <section id="todas" className="max-w-7xl mx-auto px-4 py-12 w-full">
        <SectionHeading eyebrow="Propiedades recientes" titulo="Últimas incorporaciones" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {recientes.map(p => {
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
        <div className="text-center mt-10">
          <Link href="/propiedades" className="inline-flex items-center gap-2 bg-white border border-zinc-200 hover:border-rose-400 hover:text-rose-500 text-zinc-600 font-semibold px-8 py-3 rounded-full transition text-sm">
            Ver todas las propiedades →
          </Link>
        </div>
      </section>

      {/* EXPLORÁ POR LOCALIDAD */}
      <section className="bg-gradient-to-br from-rose-50 to-white py-16 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading eyebrow="Nuestras localidades" titulo="Explorá por localidad" />
          <p className="text-sm text-zinc-400 mt-5 mb-8 max-w-lg">Cobertura real en el interior bonaerense. Hacé clic en tu ciudad para ver todas las propiedades disponibles.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {LOCALIDADES.map(loc => {
              const cant = conteoXCiudad[loc.nombre] || 0
              const foto = FOTOS_LOCALIDADES[loc.nombre] || DEFAULT_FOTO
              const tiene = cant > 0
              return (
                <Link key={loc.nombre} href={tiene ? '/' + encodeURIComponent(loc.nombre) : '#'}
                  className={`group relative rounded-3xl overflow-hidden block ${tiene ? 'hover:shadow-xl' : 'opacity-50 pointer-events-none'} transition-all duration-300`}>
                  <div className="h-48 md:h-56 relative overflow-hidden">
                    <img src={foto} alt={loc.nombre} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                  {tiene && <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">{cant} prop.</div>}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-bold text-lg leading-tight">{loc.nombre}</p>
                    <p className="text-rose-200 text-xs mt-0.5 font-medium">{tiene ? 'Ver propiedades →' : 'Próximamente'}</p>
                  </div>
                </Link>
              )
            })}
            <div className="relative rounded-3xl overflow-hidden bg-rose-500 flex flex-col items-center justify-center p-6 text-center min-h-[192px] md:min-h-[224px]">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-white font-bold text-base leading-snug mb-1">¿Tu ciudad no está?</p>
              <p className="text-rose-100 text-xs mb-4">Estamos expandiéndonos. Avisanos y la sumamos.</p>
              <Link href="/contacto" className="bg-white text-rose-500 text-xs font-bold px-4 py-2 rounded-full hover:bg-rose-50 transition">Sugerir ciudad</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CAMPOS DEL INTERIOR */}
      <section id="campos" className="max-w-7xl mx-auto px-4 pb-16 pt-4 scroll-mt-20 w-full">
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          {/* gradiente base verde */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-600" />
          {/* foto de campo translucida (Unsplash, sin dependencia de archivos locales) */}
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          {/* oscurecer hacia la izquierda para que el texto se lea */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/70 via-emerald-800/25 to-transparent" />
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 backdrop-blur px-3 py-1 rounded-full mb-4">
                  <span className="text-sm leading-none">🌾</span> Campos del interior
                </span>
                <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight mb-3 drop-shadow">
                  ¿Buscás campos en el interior?
                </h2>
                <p className="text-emerald-50 text-sm md:text-base leading-relaxed mb-6 drop-shadow-sm">
                  Campos productivos, chacras y quintas en el interior bonaerense y la zona. Sumamos publicaciones rurales con superficie, ubicación y datos de contacto. Encontrá la tierra que estás buscando.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {['Superficie y hectáreas', 'Ubicación exacta', 'Contacto directo'].map(f => (
                    <span key={f} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/15 border border-white/25 px-3 py-1.5 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/campos"
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base px-8 py-4 rounded-full transition shadow-lg hover:-translate-y-0.5 whitespace-nowrap">
                Ver campos disponibles
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

     {/* FOOTER */}
      <footer className="bg-zinc-900 text-white pt-16 pb-8 w-full">
        <div className="max-w-7xl mx-auto px-4">

          {/* Boton volver arriba */}
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

    </div>
  )
}