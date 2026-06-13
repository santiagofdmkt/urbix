'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Operacion = 'venta' | 'alquiler'

interface Propiedad {
  id: number
  titulo: string | null
  precio: number | null
  moneda: string | null
  direccion: string | null
  dormitorios: number | null
  banos: number | null
  superficie_m2: number | null
  imagenes: string | null
  inmobiliaria: string | null
  operacion: string | null
  ciudad: string | null
}

const LIMITE_VISIBLE = 24

// Foto de cada ciudad para el hero. Dejá la imagen en /public/localidades/<ciudad>.jpg
// Si no existe, el hero queda con el fondo azul noche igual (no rompe nada).
const IMAGENES_CIUDAD: Record<string, string> = {
  'Chivilcoy': '/localidades/chivilcoy.jpg',
}

function parseImg(raw: any): string | null {
  try {
    if (!raw) return null
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr)) return null
    return arr.find((s: string) => typeof s === 'string' && s.startsWith('http')) || null
  } catch { return null }
}

function getTitulo(titulo: string | null): string {
  const t = titulo?.trim() || ''
  return t.length > 70 ? t.slice(0, 70).trim() + '...' : t
}

function PropCard({ p, operacion, mostrarCiudad = false }: { p: Propiedad; operacion: Operacion; mostrarCiudad?: boolean }) {
  const img = parseImg(p.imagenes)
  if (!img) return null
  const titulo = getTitulo(p.titulo)
  return (
    <Link href={`/propiedad/${p.id}`} className="group block bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative h-52 bg-zinc-100 overflow-hidden">
        <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-white font-bold text-lg leading-tight">{p.moneda} {p.precio?.toLocaleString('es-AR') ?? '—'}</p>
        </div>
        <div className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow ${operacion === 'venta' ? 'bg-rose-500' : 'bg-blue-500'}`}>
          {operacion === 'venta' ? 'Venta' : 'Alquiler'}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-zinc-800 line-clamp-2 mb-1">{titulo}</p>
        <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{p.direccion}{mostrarCiudad && p.ciudad ? `, ${p.ciudad}` : ''}</p>
        <div className="flex gap-3 text-xs text-zinc-500">
          {p.dormitorios && <span>🛏 {p.dormitorios}</span>}
          {p.banos        && <span>🚿 {p.banos}</span>}
          {p.superficie_m2 && <span>📐 {p.superficie_m2} m²</span>}
        </div>
        {p.inmobiliaria && (
          <p className="text-[11px] text-zinc-400 mt-2 truncate border-t border-zinc-50 pt-2">🏢 {p.inmobiliaria}</p>
        )}
      </div>
    </Link>
  )
}

const RANGOS = [
  { label: 'Hasta USD 50k',   min: 0,      max: 50000 },
  { label: 'USD 50k – 100k',  min: 50000,  max: 100000 },
  { label: 'USD 100k – 150k', min: 100000, max: 150000 },
  { label: 'USD 150k – 200k', min: 150000, max: 200000 },
  { label: 'USD 200k – 250k', min: 200000, max: 250000 },
  { label: 'USD 250k – 350k', min: 250000, max: 350000 },
  { label: 'Más de USD 350k', min: 350000, max: Infinity },
]

function Filtros({ operacion, onCambiarOperacion, cantVenta, cantAlquiler, preciosActivos, onTogglePrecio, loading }: {
  operacion: Operacion
  onCambiarOperacion: (op: Operacion) => void
  cantVenta: number
  cantAlquiler: number
  preciosActivos: string[]
  onTogglePrecio: (rango: string) => void
  loading: boolean
}) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="flex items-center bg-white border border-zinc-200 rounded-full p-1 shadow-sm self-start">
        <button
          onClick={() => onCambiarOperacion('venta')}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${operacion === 'venta' ? 'bg-rose-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Comprar
          {!loading && cantVenta > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${operacion === 'venta' ? 'bg-rose-400 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{cantVenta}</span>
          )}
        </button>
        <button
          onClick={() => onCambiarOperacion('alquiler')}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${operacion === 'alquiler' ? 'bg-blue-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Alquilar
          {!loading && cantAlquiler > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${operacion === 'alquiler' ? 'bg-blue-400 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{cantAlquiler}</span>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {RANGOS.map(r => {
          const activo = preciosActivos.includes(r.label)
          return (
            <button
              key={r.label}
              onClick={() => onTogglePrecio(r.label)}
              className={`cursor-pointer text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
                activo
                  ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-rose-400 hover:text-rose-500'
              }`}
            >
              {r.label}
            </button>
          )
        })}
        {preciosActivos.length > 0 && (
          <button
            onClick={() => preciosActivos.forEach(r => onTogglePrecio(r))}
            className="cursor-pointer text-xs text-zinc-400 hover:text-rose-400 transition px-2"
          >
            × Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 animate-pulse">
          <div className="h-52 bg-zinc-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-zinc-200 rounded w-3/4" />
            <div className="h-3 bg-zinc-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function filtrarPorPrecios(props: Propiedad[], preciosActivos: string[]): Propiedad[] {
  if (preciosActivos.length === 0) return props
  return props.filter(p => {
    const precio = p.precio ?? 0
    return preciosActivos.some(label => {
      const rango = RANGOS.find(r => r.label === label)
      if (!rango) return false
      return precio >= rango.min && precio < rango.max
    })
  })
}

function BotonVerMas({ restantes, onClick }: { restantes: number; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center mt-12 gap-3">
      <button
        onClick={onClick}
        className="cursor-pointer inline-flex items-center gap-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-full transition text-base shadow-lg shadow-rose-200/60 hover:shadow-rose-300/60 hover:-translate-y-0.5">
        Ver más propiedades
        <span className="bg-white/20 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">+{restantes}</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
      </button>
      <span className="text-xs text-zinc-400">Mostrando 24 de {restantes + LIMITE_VISIBLE}</span>
    </div>
  )
}

function SeccionCampos({ ciudadNombre }: { ciudadNombre: string }) {
  return (
    <section className="max-w-7xl mx-auto px-4 pb-14">
      <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-3xl" role="img" aria-label="Campo">🌾</span>
          </div>
          <div>
            <h2 className="text-white text-2xl font-bold mb-1.5">¿Buscás campos en {ciudadNombre}?</h2>
            <p className="text-rose-50 text-sm leading-relaxed max-w-xl">
              Campos productivos, chacras y quintas en {ciudadNombre} y la zona. Estamos sumando publicaciones rurales con superficie, ubicación y datos de contacto. Contanos qué estás buscando y te avisamos apenas tengamos opciones para vos.
            </p>
          </div>
        </div>
        <Link
          href={`/localidad/${encodeURIComponent(ciudadNombre)}/campos`}
          className="shrink-0 inline-flex items-center gap-2 bg-white text-rose-600 hover:bg-rose-50 font-semibold text-sm px-6 py-3 rounded-full transition shadow-sm whitespace-nowrap">
          Ver campos en {ciudadNombre}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </section>
  )
}

function FooterUrbix() {
  return (
    <footer className="bg-zinc-900 text-white pt-16 pb-8 w-full">
      <div className="max-w-7xl mx-auto px-4">
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
                <li key={l}><Link href={'/localidad/' + encodeURIComponent(l)} className="hover:text-rose-400 transition">{l}</Link></li>
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

export function LocalidadClient({ ciudadNombre }: { ciudadNombre: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [todas, setTodas] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])
  const [mostrarTodas, setMostrarTodas] = useState(false)

  const heroImg = IMAGENES_CIUDAD[ciudadNombre]

  useEffect(() => {
    async function fetchProps() {
      setLoading(true)
      const { data } = await supabase
        .from('propiedades')
        .select('*')
        .eq('activo', true)
        .eq('ciudad', ciudadNombre)
        .not('imagenes', 'is', null)
        .order('created_at', { ascending: false })
      setTodas(data || [])
      setLoading(false)
    }
    fetchProps()
  }, [ciudadNombre])

  function cambiarOperacion(op: Operacion) {
    setOperacion(op)
    setPreciosActivos([])
    setMostrarTodas(false)
    router.replace(`/localidad/${encodeURIComponent(ciudadNombre)}?operacion=${op}`, { scroll: false })
  }

  function togglePrecio(label: string) {
    setMostrarTodas(false)
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const porOperacion = todas.filter(p => p.operacion === operacion)
  const filtradas = filtrarPorPrecios(porOperacion, preciosActivos)
  const visibles = mostrarTodas ? filtradas : filtradas.slice(0, LIMITE_VISIBLE)
  const restantes = filtradas.length - LIMITE_VISIBLE
  const cantVenta = todas.filter(p => p.operacion === 'venta').length
  const cantAlquiler = todas.filter(p => p.operacion === 'alquiler').length

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</Link>
            <Link href="/registro" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</Link>
          </div>
        </div>
      </header>

      {/* HERO LOCAL — foto protagonista + overlay azul noche */}
      <section className="relative overflow-hidden border-b border-zinc-200">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        {heroImg && (
          <img
            src={heroImg}
            alt={`Vista de ${ciudadNombre}`}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/55 to-rose-900/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-sm text-slate-200 mb-5">
            <Link href="/" className="hover:text-white transition">Inicio</Link>
            <span>/</span>
            <span className="text-white font-medium">{ciudadNombre}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            Provincia de Buenos Aires
          </span>
          <h1 className="text-white font-bold leading-tight mb-4 drop-shadow-md">
            <span className="block text-2xl md:text-3xl font-semibold text-slate-200">Propiedades en</span>
            <span className="block text-5xl md:text-6xl tracking-tight">{ciudadNombre}</span>
          </h1>
          <p className="text-slate-100 text-base md:text-lg leading-relaxed mb-7 max-w-xl drop-shadow-sm">
            {loading
              ? `Casas, departamentos, terrenos y campos en ${ciudadNombre} y la zona.`
              : `Buscá entre ${todas.length} publicaciones de ${ciudadNombre} y la zona, sin filtros complicados.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#listado" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-7 py-3.5 rounded-full transition shadow-md">
              Ver propiedades
            </a>
            <Link href="/soy-inmobiliaria" className="bg-white/10 border border-white/50 text-white hover:bg-white/20 text-sm font-semibold px-7 py-3.5 rounded-full transition backdrop-blur">
              Soy inmobiliaria
            </Link>
          </div>
        </div>
      </section>

      {/* BANNER — encontra tu propiedad + mapa (fondo gris para contraste) */}
      <section className="bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
          <div className="rounded-3xl bg-zinc-100 border border-zinc-200 shadow-sm p-6 md:p-9">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 leading-tight mb-2">
                  Encontrá ahora la propiedad que buscás en <span className="text-rose-500">{ciudadNombre}</span>
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed mb-5 max-w-md">
                  Reunimos las propiedades de toda la ciudad y la zona en un solo lugar, actualizadas de forma permanente.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 bg-white border border-rose-100 rounded-xl px-3.5 py-2 shadow-sm">
                    <span className="text-xl font-bold text-rose-500 leading-none">{loading ? '—' : todas.length}</span>
                    <span className="text-[11px] text-zinc-500 leading-tight">propiedades<br/>activas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-xl px-3.5 py-2 shadow-sm">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span className="text-[11px] text-zinc-500 leading-tight">Cobertura<br/>local real</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-xl px-3.5 py-2 shadow-sm">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h5M20 20v-5h-5M5.5 9a7 7 0 0111.9-2.5M18.5 15a7 7 0 01-11.9 2.5"/></svg>
                    <span className="text-[11px] text-zinc-500 leading-tight">Actualizado<br/>hoy</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-xl px-3.5 py-2 shadow-sm">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.66A2.25 2.25 0 009.568 3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z"/></svg>
                    <span className="text-[11px] text-zinc-500 leading-tight">Venta y<br/>alquiler</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-2 ring-1 ring-rose-200 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                    {ciudadNombre}, Buenos Aires
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Mapa</span>
                </div>
                <div className="relative rounded-xl overflow-hidden h-56 lg:h-64 bg-zinc-100">
                  <iframe
                    title={`Mapa de ${ciudadNombre}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(ciudadNombre + ', Buenos Aires, Argentina')}&z=13&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="listado" className="max-w-7xl mx-auto px-4 py-10 scroll-mt-20">
        <div className="mb-6">
          <p className="text-zinc-400 text-sm">{loading ? 'Cargando propiedades...' : `${filtradas.length} propiedades en ${operacion}`}</p>
        </div>
        <Filtros
          operacion={operacion}
          onCambiarOperacion={cambiarOperacion}
          cantVenta={cantVenta}
          cantAlquiler={cantAlquiler}
          preciosActivos={preciosActivos}
          onTogglePrecio={togglePrecio}
          loading={loading}
        />
        {loading ? <Skeleton /> : filtradas.length === 0 ? (
          <div className="text-center py-24 text-zinc-400">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-lg text-zinc-500">Sin resultados con estos filtros</p>
            <p className="text-sm mt-2">Probá ajustando el rango de precios o cambiando la operación</p>
            <button onClick={() => setPreciosActivos([])} className="mt-6 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-full transition text-sm">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibles.map(p => <PropCard key={p.id} p={p} operacion={operacion} />)}
            </div>
            {!mostrarTodas && restantes > 0 && (
              <BotonVerMas restantes={restantes} onClick={() => setMostrarTodas(true)} />
            )}
          </>
        )}
      </div>

      <SeccionCampos ciudadNombre={ciudadNombre} />

      <FooterUrbix />
    </div>
  )
}

const CIUDADES = ['Chivilcoy', 'Mercedes', '25 de Mayo', '9 de Julio', 'Pehuajó', 'Trenque Lauquen', 'Lobos']

export function PropiedadesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [todas, setTodas] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])
  const [mostrarTodas, setMostrarTodas] = useState(false)

  useEffect(() => {
    async function fetchProps() {
      setLoading(true)
      const { data } = await supabase
        .from('propiedades')
        .select('*')
        .eq('activo', true)
        .not('imagenes', 'is', null)
        .order('created_at', { ascending: false })
      setTodas(data || [])
      setLoading(false)
    }
    fetchProps()
  }, [])

  function cambiarOperacion(op: Operacion) {
    setOperacion(op)
    setPreciosActivos([])
    setMostrarTodas(false)
    router.replace(`/propiedades?operacion=${op}`, { scroll: false })
  }

  function togglePrecio(label: string) {
    setMostrarTodas(false)
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const porOperacion = todas.filter(p => p.operacion === operacion)
  const filtradas = filtrarPorPrecios(porOperacion, preciosActivos)
  const visibles = mostrarTodas ? filtradas : filtradas.slice(0, LIMITE_VISIBLE)
  const restantes = filtradas.length - LIMITE_VISIBLE
  const cantVenta = todas.filter(p => p.operacion === 'venta').length
  const cantAlquiler = todas.filter(p => p.operacion === 'alquiler').length

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</Link>
            <Link href="/registro" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</Link>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-rose-500 transition">Inicio</Link>
          <span>/</span>
          <span className="text-zinc-700 font-medium">Todas las propiedades</span>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">Todas las propiedades</h1>
          <p className="text-zinc-400 text-sm">{loading ? 'Cargando...' : `${filtradas.length} propiedades en ${operacion}`}</p>
        </div>
        <Filtros
          operacion={operacion}
          onCambiarOperacion={cambiarOperacion}
          cantVenta={cantVenta}
          cantAlquiler={cantAlquiler}
          preciosActivos={preciosActivos}
          onTogglePrecio={togglePrecio}
          loading={loading}
        />
        <div className="flex flex-wrap gap-2 mb-8">
          {CIUDADES.map(ciudad => (
            <Link key={ciudad} href={'/localidad/' + encodeURIComponent(ciudad)} className="text-xs px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition font-medium">
              {ciudad}
            </Link>
          ))}
        </div>
        {loading ? <Skeleton /> : filtradas.length === 0 ? (
          <div className="text-center py-24 text-zinc-400">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-lg text-zinc-500">Sin resultados con estos filtros</p>
            <p className="text-sm mt-2">Probá ajustando el rango de precios o cambiando la operación</p>
            <button onClick={() => setPreciosActivos([])} className="mt-6 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-full transition text-sm">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibles.map(p => <PropCard key={p.id} p={p} operacion={operacion} mostrarCiudad />)}
            </div>
            {!mostrarTodas && restantes > 0 && (
              <BotonVerMas restantes={restantes} onClick={() => setMostrarTodas(true)} />
            )}
          </>
        )}
      </div>

      <FooterUrbix />
    </div>
  )
}