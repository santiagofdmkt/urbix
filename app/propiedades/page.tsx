import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default async function PropiedadesPage() {
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

  const parseImg = (imagenes: any): string | null => {
    try {
      if (!imagenes) return null
      if (typeof imagenes === 'string' && imagenes.startsWith('http')) return imagenes
      const arr = typeof imagenes === 'string' ? JSON.parse(imagenes) : imagenes
      if (!Array.isArray(arr)) return null
      return arr.find((s: string) => s.includes('supabase.co')) || arr[0] || null
    } catch { return null }
  }

  const getTitulo = (titulo: string | null): string => {
    const t = titulo?.trim() || ''
    return t.length > 70 ? t.slice(0, 70).trim() + '...' : t
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">

      {/* NAV */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
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

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-rose-500 transition">Inicio</Link>
          <span>/</span>
          <span className="text-zinc-700 font-medium">Todas las propiedades</span>
        </div>

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">Todas las propiedades</h1>
          <p className="text-zinc-400 text-sm">{propiedades.length} propiedades disponibles</p>
        </div>

        {/* FILTRO POR CIUDAD */}
        <div className="flex flex-wrap gap-2 mb-8">
          {['Chivilcoy', 'Mercedes', '25 de Mayo', '9 de Julio', 'Pehuajó', 'Trenque Lauquen', 'Lobos'].map(ciudad => (
            <Link
              key={ciudad}
              href={'/localidad/' + encodeURIComponent(ciudad)}
              className="text-xs px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition font-medium">
              {ciudad}
            </Link>
          ))}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {propiedades.map(p => {
            const img = parseImg(p.imagenes)
            if (!img) return null
            const titulo = getTitulo(p.titulo)
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

      </div>
    </div>
  )
}