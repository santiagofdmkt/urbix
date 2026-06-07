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
  { label: 'USD 100k – 200k', min: 100000, max: 200000 },
  { label: 'USD 200k – 500k', min: 200000, max: 500000 },
  { label: 'Más de USD 500k', min: 500000, max: Infinity },
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

export function LocalidadClient({ ciudadNombre }: { ciudadNombre: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [todas, setTodas] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])

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
    router.replace(`/localidad/${encodeURIComponent(ciudadNombre)}?operacion=${op}`, { scroll: false })
  }

  function togglePrecio(label: string) {
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const porOperacion = todas.filter(p => p.operacion === operacion)
  const filtradas = filtrarPorPrecios(porOperacion, preciosActivos)
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
          <span className="text-zinc-700 font-medium">{ciudadNombre}</span>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">Propiedades en {ciudadNombre}</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtradas.map(p => <PropCard key={p.id} p={p} operacion={operacion} />)}
          </div>
        )}
      </div>
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
    router.replace(`/propiedades?operacion=${op}`, { scroll: false })
  }

  function togglePrecio(label: string) {
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const porOperacion = todas.filter(p => p.operacion === operacion)
  const filtradas = filtrarPorPrecios(porOperacion, preciosActivos)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtradas.map(p => <PropCard key={p.id} p={p} operacion={operacion} mostrarCiudad />)}
          </div>
        )}
      </div>
    </div>
  )
}