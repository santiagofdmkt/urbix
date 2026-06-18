'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FooterUrbix from '@/components/FooterUrbix'

type Operacion = 'venta' | 'alquiler'
type Orden = 'recientes' | 'precio_asc' | 'precio_desc'

interface Campo {
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

const LIMITE_MOBILE = 7
const LIMITE_DESKTOP = 24

function useEsMobile(): boolean {
  const [esMobile, setEsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setEsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return esMobile
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

// Los campos suelen venir con superficie en m². Para campos se lee mejor en hectáreas.
// Si la superficie es grande (>= 10000 m² = 1 ha) la mostramos en ha; si no, en m².
function formatSuperficie(m2: number | null): string | null {
  if (!m2 || m2 <= 0) return null
  if (m2 >= 10000) {
    const ha = m2 / 10000
    const txt = ha % 1 === 0 ? ha.toString() : ha.toFixed(1).replace('.', ',')
    return `${txt} ha`
  }
  return `${m2.toLocaleString('es-AR')} m²`
}

function CampoCard({ p, operacion, mostrarCiudad = true }: { p: Campo; operacion: Operacion; mostrarCiudad?: boolean }) {
  const img = parseImg(p.imagenes)
  if (!img) return null
  const titulo = getTitulo(p.titulo)
  const sup = formatSuperficie(p.superficie_m2)
  return (
    <Link href={`/propiedad/${p.id}`} className="group block bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative h-52 bg-zinc-100 overflow-hidden">
        <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-white font-bold text-lg leading-tight">{p.moneda} {p.precio?.toLocaleString('es-AR') ?? '—'}</p>
        </div>
        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow inline-flex items-center gap-1">
          🌾 Campo
        </div>
        <div className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow ${operacion === 'venta' ? 'bg-rose-500' : 'bg-blue-500'}`}>
          {operacion === 'venta' ? 'Venta' : 'Alquiler'}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-zinc-800 line-clamp-2 mb-1">{titulo}</p>
        <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{p.direccion}{mostrarCiudad && p.ciudad ? `, ${p.ciudad}` : ''}</p>
        <div className="flex gap-3 text-xs text-zinc-500">
          {sup && <span>📐 {sup}</span>}
          {p.dormitorios ? <span>🛏 {p.dormitorios}</span> : null}
          {p.banos ? <span>🚿 {p.banos}</span> : null}
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

function Filtros({ operacion, onCambiarOperacion, cantVenta, cantAlquiler, ciudadActiva, onCambiarCiudad, ciudadesConCampos, preciosActivos, onTogglePrecio, orden, onCambiarOrden, loading }: {
  operacion: Operacion
  onCambiarOperacion: (op: Operacion) => void
  cantVenta: number
  cantAlquiler: number
  ciudadActiva: string
  onCambiarCiudad: (c: string) => void
  ciudadesConCampos: string[]
  preciosActivos: string[]
  onTogglePrecio: (rango: string) => void
  orden: Orden
  onCambiarOrden: (o: Orden) => void
  loading: boolean
}) {
  const [precioAbierto, setPrecioAbierto] = useState(false)
  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-white border border-zinc-200 rounded-full p-1 shadow-sm">
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
        <div className="flex items-center gap-2">
          <label htmlFor="orden" className="text-xs text-zinc-400 hidden sm:block">Ordenar por</label>
          <div className="relative">
            <select
              id="orden"
              value={orden}
              onChange={e => onCambiarOrden(e.target.value as Orden)}
              className="cursor-pointer appearance-none bg-white border border-zinc-200 rounded-full pl-4 pr-9 py-2 text-sm font-semibold text-zinc-600 shadow-sm hover:border-rose-300 focus:outline-none focus:border-rose-400 transition"
            >
              <option value="recientes">Últimas ingresadas</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
            </select>
            <svg className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
      </div>

      {/* Filtro por localidad: solo ciudades que tienen campos + opcion Todas */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCambiarCiudad('Todas')}
          className={`cursor-pointer text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${ciudadActiva === 'Todas' ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}
        >
          Todas las zonas
        </button>
        {ciudadesConCampos.map(c => (
          <button
            key={c}
            onClick={() => onCambiarCiudad(c)}
            className={`cursor-pointer text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${ciudadActiva === c ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-600 hover:border-emerald-400 hover:text-emerald-600'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Boton colapsable para el filtro de precio */}
      <button
        onClick={() => setPrecioAbierto(v => !v)}
        className="cursor-pointer flex items-center justify-between w-full sm:w-auto bg-white border border-zinc-200 rounded-full pl-5 pr-4 py-2.5 text-sm font-semibold text-zinc-600 shadow-sm sm:self-start"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M10 12h4M11 16h2"/></svg>
          Filtrar por precio
          {preciosActivos.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{preciosActivos.length}</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-200 sm:ml-3 ${precioAbierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>

      <div className={`${precioAbierto ? 'flex' : 'hidden'} flex-wrap gap-2`}>
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

function filtrarPorPrecios(props: Campo[], preciosActivos: string[]): Campo[] {
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

function ordenarCampos(props: Campo[], orden: Orden): Campo[] {
  if (orden === 'precio_asc')  return [...props].sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity))
  if (orden === 'precio_desc') return [...props].sort((a, b) => (b.precio ?? -Infinity) - (a.precio ?? -Infinity))
  return props
}

function BotonVerMas({ mostrados, total, onClick }: { mostrados: number; total: number; onClick: () => void }) {
  const restantes = total - mostrados
  return (
    <div className="flex flex-col items-center mt-12 gap-3">
      <button
        onClick={onClick}
        className="cursor-pointer inline-flex items-center gap-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-full transition text-base shadow-lg shadow-rose-200/60 hover:shadow-rose-300/60 hover:-translate-y-0.5">
        Ver más campos
        <span className="bg-white/20 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">+{restantes}</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
      </button>
      <span className="text-xs text-zinc-400">Mostrando {mostrados} de {total}</span>
    </div>
  )
}

export default function CamposClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const ciudadParam = searchParams.get('ciudad') || 'Todas'

  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [ciudadActiva, setCiudadActiva] = useState<string>(ciudadParam)
  const [todos, setTodos] = useState<Campo[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [orden, setOrden] = useState<Orden>('recientes')

  const esMobile = useEsMobile()
  const limite = esMobile ? LIMITE_MOBILE : LIMITE_DESKTOP

  useEffect(() => {
    async function fetchCampos() {
      setLoading(true)
      // Un campo es toda propiedad con aptitud cargada (todo lo de Agrofy la tiene).
      const { data } = await supabase
        .from('propiedades')
        .select('*')
        .eq('activo', true)
        .not('aptitud', 'is', null)
        .not('imagenes', 'is', null)
        .order('created_at', { ascending: false })
      setTodos(data || [])
      setLoading(false)
    }
    fetchCampos()
  }, [])

  function cambiarOperacion(op: Operacion) {
    setOperacion(op)
    setPreciosActivos([])
    setMostrarTodas(false)
  }

  function cambiarCiudad(c: string) {
    setCiudadActiva(c)
    setMostrarTodas(false)
  }

  function togglePrecio(label: string) {
    setMostrarTodas(false)
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  // Chips de localidad generados desde la data real (cualquier partido con campos).
  const ciudadesConCampos = Array.from(
    new Set(todos.map(p => p.ciudad).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const porOperacion = todos.filter(p => p.operacion === operacion)
  const porCiudad = ciudadActiva === 'Todas' ? porOperacion : porOperacion.filter(p => p.ciudad === ciudadActiva)
  const filtradas = filtrarPorPrecios(porCiudad, preciosActivos)
  const ordenadas = ordenarCampos(filtradas, orden)
  const visibles = mostrarTodas ? ordenadas : ordenadas.slice(0, limite)
  const cantVenta = todos.filter(p => p.operacion === 'venta').length
  const cantAlquiler = todos.filter(p => p.operacion === 'alquiler').length
  const totalCampos = todos.length

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <span id="top" />
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/propiedades" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Propiedades</Link>
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</Link>
            <Link href="/registro" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</Link>
          </div>
        </div>
      </header>

      {/* HERO CAMPOS */}
      <section className="relative overflow-hidden border-b border-zinc-200">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-green-800" />
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-900/55 to-emerald-900/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="flex items-center gap-2 text-sm text-emerald-100 mb-5">
            <Link href="/" className="hover:text-white transition">Inicio</Link>
            <span>/</span>
            <span className="text-white font-medium">Campos</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-5">
            <span className="text-sm leading-none">🌾</span> Campos del interior
          </span>
          <h1 className="text-white font-bold leading-tight mb-4 drop-shadow-md text-4xl md:text-6xl tracking-tight max-w-3xl">
            Campos, chacras y quintas<br />en el interior bonaerense
          </h1>
          <p className="text-emerald-50 text-base md:text-lg leading-relaxed mb-7 max-w-2xl drop-shadow-sm">
            Campos productivos, ganaderos y mixtos, con superficie, ubicación y datos de contacto. Encontrá la tierra que estás buscando, sin filtros complicados.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#listado" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-7 py-3.5 rounded-full transition shadow-md">
              Ver campos disponibles
            </a>
            <Link href="/soy-inmobiliaria" className="bg-white/10 border border-white/50 text-white hover:bg-white/20 text-sm font-semibold px-7 py-3.5 rounded-full transition backdrop-blur">
              Publicar mis campos
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 mt-7">
            <span className="text-base font-bold text-white tabular-nums inline-block min-w-[2ch] text-center">{loading ? '—' : totalCampos}</span>
            <span className="text-xs text-emerald-100">campos publicados en el interior</span>
          </div>
        </div>
      </section>

      <div id="listado" className="max-w-7xl mx-auto px-4 py-10 scroll-mt-20">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-1">
            {ciudadActiva === 'Todas' ? 'Campos disponibles' : `Campos en ${ciudadActiva}`}
          </h2>
          <p className="text-zinc-400 text-sm">{loading ? 'Cargando campos...' : `${filtradas.length} ${filtradas.length === 1 ? 'campo' : 'campos'} en ${operacion === 'venta' ? 'venta' : 'alquiler'}`}</p>
        </div>

        <Filtros
          operacion={operacion}
          onCambiarOperacion={cambiarOperacion}
          cantVenta={cantVenta}
          cantAlquiler={cantAlquiler}
          ciudadActiva={ciudadActiva}
          onCambiarCiudad={cambiarCiudad}
          ciudadesConCampos={ciudadesConCampos}
          preciosActivos={preciosActivos}
          onTogglePrecio={togglePrecio}
          orden={orden}
          onCambiarOrden={(o) => { setOrden(o); setMostrarTodas(false) }}
          loading={loading}
        />

        {loading ? <Skeleton /> : filtradas.length === 0 ? (
          <div className="text-center py-24 text-zinc-400">
            <p className="text-5xl mb-4">🌾</p>
            <p className="font-semibold text-lg text-zinc-500">
              {totalCampos === 0 ? 'Todavía no hay campos publicados' : 'Sin campos con estos filtros'}
            </p>
            <p className="text-sm mt-2">
              {totalCampos === 0
                ? 'Estamos sumando campos del interior. Volvé pronto.'
                : 'Probá cambiando la zona, el rango de precios o la operación.'}
            </p>
            {totalCampos > 0 && (
              <button onClick={() => { setPreciosActivos([]); setCiudadActiva('Todas') }} className="mt-6 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-full transition text-sm">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibles.map(p => <CampoCard key={p.id} p={p} operacion={operacion} />)}
            </div>
            {!mostrarTodas && ordenadas.length > limite && (
              <BotonVerMas mostrados={limite} total={ordenadas.length} onClick={() => setMostrarTodas(true)} />
            )}
          </>
        )}
      </div>

      {/* CTA publicar campos */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 to-green-600 px-6 py-10 md:px-12 md:py-12 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">¿Tenés campos para vender o alquilar?</h2>
              <p className="text-emerald-50 text-sm md:text-base leading-relaxed">
                Sumá tus campos a Urbix y llegá a compradores del interior que buscan tierra productiva. Sin comisiones, sin límites.
              </p>
            </div>
            <Link href="/soy-inmobiliaria" className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base px-8 py-4 rounded-full transition shadow-lg hover:-translate-y-0.5 whitespace-nowrap">
              Publicar mis campos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <FooterUrbix />
    </div>
  )
}