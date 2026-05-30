'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function BuscarContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [resultados, setResultados] = useState<any[]>([])
  const [filtros, setFiltros] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState(query)

  useEffect(() => {
    if (query) buscar(query)
  }, [query])

  async function buscar(texto: string) {
    if (!texto.trim()) return
    setLoading(true)
    setError('')
    setResultados([])
    setFiltros(null)
    try {
      const res = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: texto }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResultados(data.resultados || [])
      setFiltros(data.filtros || null)
    } catch (e: any) {
      setError('Error al buscar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar(busqueda)
    window.history.pushState({}, '', '/buscar?q=' + encodeURIComponent(busqueda))
  }

  const parseImg = (imagenes: any): string | null => {
    try {
      if (!imagenes) return null
      const arr = typeof imagenes === 'string' ? JSON.parse(imagenes) : imagenes
      if (!Array.isArray(arr)) return null
      return arr.find((s: string) => s.includes('supabase.co')) || arr[0] || null
    } catch { return null }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">

      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700 transition">← Volver</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 border border-zinc-100">
            <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ej: casa con jardín 3 dormitorios hasta 100k en Chivilcoy..."
              className="flex-1 text-sm text-zinc-800 outline-none bg-transparent placeholder-zinc-400"
            />
            <button type="submit" disabled={loading}
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition cursor-pointer">
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {filtros && !loading && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-400 font-medium">IA detectó:</span>
            {filtros.ciudad && <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1 rounded-full">📍 {filtros.ciudad}</span>}
            {filtros.dormitorios_min && <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1 rounded-full">🛏 {filtros.dormitorios_min}+ dorm.</span>}
            {filtros.precio_max && <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1 rounded-full">💰 hasta {filtros.moneda} {filtros.precio_max?.toLocaleString('es-AR')}</span>}
            {filtros.superficie_min && <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1 rounded-full">📐 {filtros.superficie_min}+ m²</span>}
            {filtros.keywords?.map((kw: string) => <span key={kw} className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full">✓ {kw}</span>)}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400 text-sm">La IA está analizando tu búsqueda...</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {!loading && resultados.length > 0 && (
          <>
            <p className="text-sm text-zinc-400 mb-5">
              {resultados.length} propiedades para <span className="font-medium text-zinc-700">"{query || busqueda}"</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resultados.map(p => {
                const img = parseImg(p.imagenes)
                if (!img) return null
                const titulo = p.titulo?.slice(0, 70) || ''
                return (
                  <Link key={p.id} href={'/propiedad/' + p.id}
                    className="group block bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                    <div className="relative h-52 bg-zinc-100 overflow-hidden">
                      <img src={img} alt={titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
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
          </>
        )}

        {!loading && (query || busqueda) && resultados.length === 0 && !error && filtros && (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🔍</span>
            <p className="text-zinc-600 font-medium mb-2">No encontramos propiedades</p>
            <p className="text-zinc-400 text-sm">Probá con otras palabras o una ciudad diferente.</p>
            <Link href="/" className="mt-6 inline-block text-rose-500 text-sm hover:underline">Ver todas las propiedades</Link>
          </div>
        )}

        {!loading && !query && !busqueda && (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">✨</span>
            <p className="text-zinc-600 font-medium mb-2">Describí lo que buscás</p>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">Escribí con tus palabras: tipo de propiedad, dormitorios, precio, ciudad, características.</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-zinc-400">Cargando...</p></div>}>
      <BuscarContent />
    </Suspense>
  )
}