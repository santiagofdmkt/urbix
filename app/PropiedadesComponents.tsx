'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Operacion = 'venta' | 'alquiler'
type Orden = 'recientes' | 'precio_asc' | 'precio_desc'

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

const LIMITE_MOBILE = 7
const LIMITE_DESKTOP = 24

const CIUDADES = ['Chivilcoy', 'Mercedes', '25 de Mayo', '9 de Julio', 'Pehuajó', 'Trenque Lauquen', 'Lobos']

// Foto de cada ciudad para el hero. Dejá la imagen en /public/localidades/<ciudad>.jpg
// Si no existe, el hero queda con el degradado rose igual (no rompe nada).
const IMAGENES_CIUDAD: Record<string, string> = {
  'Chivilcoy': '/localidades/chivilcoy.jpg',
}

// Tarjetas de localidades (mismo estilo que la home). Mantené imagenes y conteos
// en sync con la home (app/page.tsx). Imagenes en /public/localidades/<archivo>.
// props = numero de propiedades (muestra "X prop." y la hace clickeable);
// props = null => se muestra como "Proximamente".
const LOCALIDADES_CARDS: Record<string, { img: string; props: number | null }> = {
  'Chivilcoy':       { img: '/localidades/chivilcoy.jpg',       props: 120 },
  'Mercedes':        { img: '/localidades/mercedes.jpg',        props: 286 },
  '25 de Mayo':      { img: '/localidades/25-de-mayo.jpg',      props: null },
  '9 de Julio':      { img: '/localidades/9-de-julio.jpg',      props: null },
  'Pehuajó':         { img: '/localidades/pehuajo.jpg',         props: null },
  'Trenque Lauquen': { img: '/localidades/trenque-lauquen.jpg', props: null },
  'Lobos':           { img: '/localidades/lobos.jpg',           props: 271 },
}

// Detecta si estamos en viewport mobile (< 768px, breakpoint md de Tailwind).
// Sirve para mostrar 7 propiedades en mobile y LIMITE_DESKTOP en escritorio.
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

function Filtros({ operacion, onCambiarOperacion, cantVenta, cantAlquiler, preciosActivos, onTogglePrecio, orden, onCambiarOrden, loading }: {
  operacion: Operacion
  onCambiarOperacion: (op: Operacion) => void
  cantVenta: number
  cantAlquiler: number
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

      {/* Boton colapsable para el filtro de precio (ahorra espacio en mobile y escritorio) */}
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

      {/* Chips de precio: solo visibles si el panel esta abierto (mobile y escritorio) */}
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

function ordenarPropiedades(props: Propiedad[], orden: Orden): Propiedad[] {
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
        Ver más propiedades
        <span className="bg-white/20 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">+{restantes}</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
      </button>
      <span className="text-xs text-zinc-400">Mostrando {mostrados} de {total}</span>
    </div>
  )
}

function SeccionCampos({ ciudadNombre }: { ciudadNombre: string }) {
  return (
    <section id="campos" className="max-w-7xl mx-auto px-4 pb-14 scroll-mt-20">
      <div className="relative overflow-hidden rounded-3xl shadow-xl">
        {/* gradiente base */}
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600" />
        {/* foto de campo translucida — /public/localidades/campo-fondo.jpg (fallback a la raiz) */}
        <img
          src="/localidades/campo-fondo.jpg"
          alt=""
          aria-hidden="true"
          data-tried="0"
          onError={(e) => {
            const el = e.currentTarget
            if (el.getAttribute('data-tried') === '0') {
              el.setAttribute('data-tried', '1')
              el.src = '/campo-fondo.jpg'
            } else {
              el.style.display = 'none'
            }
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        {/* oscurecer hacia la izquierda para que el texto se lea */}
        <div className="absolute inset-0 bg-gradient-to-r from-rose-900/70 via-rose-700/25 to-transparent" />
        <div className="relative px-6 py-10 md:px-12 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 backdrop-blur px-3 py-1 rounded-full mb-4">
                <span className="text-sm leading-none">🌾</span> Próximamente en {ciudadNombre}
              </span>
              <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight mb-3 drop-shadow">
                ¿Buscás campos en {ciudadNombre}?
              </h2>
              <p className="text-rose-50 text-sm md:text-base leading-relaxed mb-6 drop-shadow-sm">
                Campos productivos, chacras y quintas en {ciudadNombre} y la zona. Estamos sumando publicaciones rurales con superficie, ubicación y datos de contacto. Dejanos lo que buscás y te avisamos apenas tengamos opciones para vos.
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
              href={`/${encodeURIComponent(ciudadNombre)}/campos`}
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-rose-600 hover:bg-rose-50 font-bold text-base px-8 py-4 rounded-full transition shadow-lg hover:-translate-y-0.5 whitespace-nowrap">
              Ver campos en {ciudadNombre}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SeccionOtrasLocalidades({ ciudadNombre }: { ciudadNombre: string }) {
  const otras = CIUDADES.filter(c => c !== ciudadNombre)
  return (
    <section className="max-w-7xl mx-auto px-4 pb-16">
      <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-2">Más cobertura</p>
      <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">Explorá otras localidades</h2>
      <p className="text-zinc-500 text-sm mb-7 max-w-xl">Sumamos propiedades del interior bonaerense. Elegí otra ciudad para ver lo que hay disponible.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {otras.map((c, idx) => {
          const info = LOCALIDADES_CARDS[c] || { img: '', props: null }
          const activa = info.props != null
          // En mobile mostramos solo 5 ciudades + la tarjeta "tu ciudad no esta" = 6 tarjetas (simetria 2x3).
          // La 6ta ciudad se oculta solo en mobile y reaparece desde md en adelante.
          const ocultarEnMobile = idx >= 5
          const inner = (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
              {info.img && (
                <img
                  src={info.img}
                  alt={c}
                  data-tried="0"
                  onError={(e) => {
                    const el = e.currentTarget
                    if (el.getAttribute('data-tried') === '0') {
                      el.setAttribute('data-tried', '1')
                      el.src = info.img.replace('/localidades', '')
                    } else {
                      el.style.display = 'none'
                    }
                  }}
                  className={`absolute inset-0 w-full h-full object-cover transition duration-500 ${activa ? 'group-hover:scale-105' : ''}`}
                />
              )}
              {!activa && <div className="absolute inset-0 bg-white/40" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {activa && (
                <span className="absolute top-3 right-3 bg-rose-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">{info.props} prop.</span>
              )}
              <div className="absolute bottom-0 left-0 p-4">
                <p className="text-white font-bold text-lg leading-tight drop-shadow">{c}</p>
                {activa ? (
                  <p className="text-white/85 text-xs font-medium mt-0.5 inline-flex items-center gap-1">Ver propiedades <span className="group-hover:translate-x-0.5 transition">→</span></p>
                ) : (
                  <p className="text-white/80 text-xs font-medium mt-0.5">Próximamente</p>
                )}
              </div>
            </>
          )
          return activa ? (
            <Link key={c} href={'/' + encodeURIComponent(c)} className={`group relative ${ocultarEnMobile ? 'hidden md:block' : 'block'} overflow-hidden rounded-2xl h-44 md:h-48 shadow-sm hover:shadow-lg transition`}>
              {inner}
            </Link>
          ) : (
            <div key={c} className={`relative ${ocultarEnMobile ? 'hidden md:block' : ''} overflow-hidden rounded-2xl h-44 md:h-48 shadow-sm`}>
              {inner}
            </div>
          )
        })}

        {/* tarjeta: ¿tu ciudad no esta? */}
        <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 bg-rose-500 flex flex-col items-center justify-center text-center px-5">
          <svg className="w-7 h-7 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM11 11v9m-2-2h4"/></svg>
          <p className="text-white font-bold text-base leading-tight">¿Tu ciudad no está?</p>
          <p className="text-rose-100 text-xs mt-1 mb-3 leading-snug">Estamos expandiéndonos. Avisanos y la sumamos.</p>
          <Link href="/contacto" className="bg-white text-rose-600 text-xs font-bold px-4 py-2 rounded-full hover:bg-rose-50 transition">Sugerir ciudad</Link>
        </div>
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

export function LocalidadClient({ ciudadNombre }: { ciudadNombre: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [todas, setTodas] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [orden, setOrden] = useState<Orden>('recientes')
  const [query, setQuery] = useState('')

  const esMobile = useEsMobile()
  const limite = esMobile ? LIMITE_MOBILE : LIMITE_DESKTOP

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
    router.replace(`/${encodeURIComponent(ciudadNombre)}?operacion=${op}`, { scroll: false })
  }

  function buscar() {
    const q = query.trim()
    if (!q) return
    router.push('/buscar?q=' + encodeURIComponent(`${q} en ${ciudadNombre}`))
  }

  function buscarTag(tag: string) {
    router.push('/buscar?q=' + encodeURIComponent(`${tag} en ${ciudadNombre}`))
  }

  function togglePrecio(label: string) {
    setMostrarTodas(false)
    setPreciosActivos(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const porOperacion = todas.filter(p => p.operacion === operacion)
  const filtradas = filtrarPorPrecios(porOperacion, preciosActivos)
  const ordenadas = ordenarPropiedades(filtradas, orden)
  const visibles = mostrarTodas ? ordenadas : ordenadas.slice(0, limite)
  const cantVenta = todas.filter(p => p.operacion === 'venta').length
  const cantAlquiler = todas.filter(p => p.operacion === 'alquiler').length

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/soy-inmobiliaria" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Soy inmobiliaria</Link>
            <a href="#campos" className="text-zinc-500 hover:text-zinc-800 transition font-medium">Campos en {ciudadNombre}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition font-medium">Iniciar sesión</Link>
            <Link href="/registro" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">Registrarse</Link>
          </div>
        </div>
      </header>

      {/* HERO LOCAL — foto + texto + mapa de la ciudad */}
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
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/92 via-slate-900/70 to-slate-900/45" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

            {/* IZQUIERDA: texto */}
            <div>
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
                Casas, departamentos, terrenos y campos en {ciudadNombre} y la zona. Encontralos sin filtros complicados.
              </p>
              <div className="flex flex-wrap gap-3 mb-7">
                <a href="#listado" className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-7 py-3.5 rounded-full transition shadow-md">
                  Ver propiedades
                </a>
                <Link href="/soy-inmobiliaria" className="bg-white/10 border border-white/50 text-white hover:bg-white/20 text-sm font-semibold px-7 py-3.5 rounded-full transition backdrop-blur">
                  Soy inmobiliaria
                </Link>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
                <span className="text-base font-bold text-white tabular-nums inline-block min-w-[2.5ch] text-center">{loading ? '—' : todas.length}</span>
                <span className="text-xs text-slate-200">propiedades activas en {ciudadNombre}</span>
              </div>
            </div>

            {/* DERECHA: mapa (oculto en mobile) */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl p-2 ring-1 ring-white/30 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                    {ciudadNombre}, Buenos Aires
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Mapa</span>
                </div>
                <div className="relative rounded-xl overflow-hidden h-72 bg-zinc-100">
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

      {/* BUSCADOR — busqueda con IA, compacto */}
      <section id="buscador" className="bg-white border-b border-zinc-100 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-12">
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rose-500 mb-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 2l1.2 3L9 6 6.2 7 5 10 3.8 7 1 6l2.8-1L5 2zm9 3l.8 2.2L17 8l-2.2.8L14 11l-.8-2.2L11 8l2.2-.8L14 5zm-3.5 6l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L7.5 14l2.1-.9.9-2.1z"/></svg>
              Búsqueda con IA
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
              Describí lo que buscás en {ciudadNombre}
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-lg ring-1 ring-zinc-100 p-2 flex items-center gap-2 mb-4">
            <span className="pl-3 text-zinc-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') buscar() }}
              placeholder="Ej: casa con jardín, 3 dormitorios y patio..."
              className="flex-1 min-w-0 text-base text-zinc-800 outline-none bg-transparent placeholder-zinc-400 py-2"
            />
            <button
              onClick={buscar}
              className="cursor-pointer bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition shrink-0 inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              Buscar
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-400 mr-1">Sugerencias:</span>
            {['Casas', 'Departamentos', 'Terrenos', 'Quintas', 'Locales'].map(f => (
              <button
                key={f}
                onClick={() => buscarTag(f)}
                className="cursor-pointer text-xs font-medium px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50 transition">
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div id="listado" className="max-w-7xl mx-auto px-4 py-10 scroll-mt-20">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-1">Mirá las propiedades de {ciudadNombre}</h2>
          <p className="text-zinc-400 text-sm">{loading ? 'Cargando propiedades...' : `${filtradas.length} propiedades en ${operacion === 'venta' ? 'venta' : 'alquiler'}`}</p>
        </div>
        <Filtros
          operacion={operacion}
          onCambiarOperacion={cambiarOperacion}
          cantVenta={cantVenta}
          cantAlquiler={cantAlquiler}
          preciosActivos={preciosActivos}
          onTogglePrecio={togglePrecio}
          orden={orden}
          onCambiarOrden={(o) => { setOrden(o); setMostrarTodas(false) }}
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
            {!mostrarTodas && ordenadas.length > limite && (
              <BotonVerMas mostrados={limite} total={ordenadas.length} onClick={() => setMostrarTodas(true)} />
            )}
          </>
        )}
      </div>

      <SeccionCampos ciudadNombre={ciudadNombre} />

      <SeccionOtrasLocalidades ciudadNombre={ciudadNombre} />

      <FooterUrbix />
    </div>
  )
}

export function PropiedadesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const operacionParam = (searchParams.get('operacion') as Operacion) || 'venta'
  const [operacion, setOperacion] = useState<Operacion>(operacionParam)
  const [todas, setTodas] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [preciosActivos, setPreciosActivos] = useState<string[]>([])
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [orden, setOrden] = useState<Orden>('recientes')

  const esMobile = useEsMobile()
  const limite = esMobile ? LIMITE_MOBILE : LIMITE_DESKTOP

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
  const ordenadas = ordenarPropiedades(filtradas, orden)
  const visibles = mostrarTodas ? ordenadas : ordenadas.slice(0, limite)
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
          orden={orden}
          onCambiarOrden={(o) => { setOrden(o); setMostrarTodas(false) }}
          loading={loading}
        />
        <div className="flex flex-wrap gap-2 mb-8">
          {CIUDADES.map(ciudad => (
            <Link key={ciudad} href={'/' + encodeURIComponent(ciudad)} className="text-xs px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition font-medium">
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
            {!mostrarTodas && ordenadas.length > limite && (
              <BotonVerMas mostrados={limite} total={ordenadas.length} onClick={() => setMostrarTodas(true)} />
            )}
          </>
        )}
      </div>

      <FooterUrbix />
    </div>
  )
}