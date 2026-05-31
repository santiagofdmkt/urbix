import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import Link from "next/link"
import GaleriaConLightbox from "./GaleriaConLightbox"
import FormularioContacto from "./FormularioContacto"
import BotonFavorito from "./BotonFavorito"

export default async function PropiedadDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabase.from("propiedades").select("*").eq("id", id).single()
  if (!p) return notFound()

  const { data: similares } = await supabase
    .from("propiedades")
    .select("*")
    .eq("activo", true)
    .eq("ciudad", p.ciudad)
    .not("imagenes", "is", null)
    .neq("id", id)
    .limit(4)

  const parseImgs = (raw: any): string[] => {
    try {
      if (!raw) return []
      if (Array.isArray(raw)) return raw
      const str = typeof raw === 'string' ? raw.trim() : String(raw)
      if (str.startsWith('[')) {
        const parsed = JSON.parse(str)
        return Array.isArray(parsed) ? parsed : []
      }
      if (str.startsWith('http')) return [str]
      return []
    } catch { return [] }
  }

  const getImgSimilar = (imagenes: any): string | null => {
    try {
      if (!imagenes) return null
      const arr = parseImgs(imagenes)
      return arr.find((s: string) => s.includes('supabase.co')) || arr[0] || null
    } catch { return null }
  }

  const imgs = parseImgs(p.imagenes)
  const precioM2 = p.superficie_m2 && p.precio ? Math.round(p.precio / p.superficie_m2) : null

  const tituloCorto = (() => {
    const t = p.titulo?.trim() || ''
    return t.length > 80 ? t.slice(0, 80).trim() + '...' : t
  })()

  const descripcion = p.descripcion || p.titulo || ''

  const TAGS: Record<string, string> = {
    'jardin': '🌳 Jardín', 'jardín': '🌳 Jardín',
    'pileta': '🏊 Pileta', 'piscina': '🏊 Pileta',
    'garage': '🚗 Garage', 'cochera': '🚗 Cochera',
    'quincho': '🔥 Quincho', 'parrilla': '🔥 Parrilla',
    'terraza': '🏙 Terraza',
    'balcon': '🌿 Balcón', 'balcón': '🌿 Balcón',
    'luminoso': '☀️ Luminoso', 'luminosa': '☀️ Luminoso',
    'esquina': '📍 Esquina', 'estrenar': '✨ A estrenar',
    'escritura': '📄 Con escritura',
    'apto credito': '🏦 Apto crédito', 'apto crédito': '🏦 Apto crédito',
  }

  const tags: string[] = []
  const descLower = descripcion.toLowerCase()
  for (const [key, label] of Object.entries(TAGS)) {
    if (descLower.includes(key) && !tags.includes(label)) tags.push(label)
  }

  const telefonoLimpio = p.contacto ? p.contacto.replace(/\D/g, '') : ''
  const waMensaje = encodeURIComponent('Hola, vi la propiedad en Urbix: ' + tituloCorto)
  const waUrl = telefonoLimpio ? 'https://wa.me/' + telefonoLimpio + '?text=' + waMensaje : ''
  const direccionCompleta = [p.direccion, p.barrio, p.ciudad].filter(Boolean).join(', ')

  const fichaItems = [
    { label: 'Dormitorios', value: p.dormitorios,
      svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8"/> },
    { label: 'Baños', value: p.banos,
      svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16M4 12V8a4 4 0 018 0v4M4 12v4a2 2 0 002 2h12a2 2 0 002-2v-4"/> },
    { label: 'Superficie', value: p.superficie_m2 ? (p.superficie_m2 + ' m²') : null,
      svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/> },
    { label: 'Ciudad', value: p.ciudad,
      svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/> },
  ].filter(i => i.value)

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">

      {/* NAV */}
      <nav className="bg-white border-b border-zinc-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/" className="text-rose-500 font-bold text-lg tracking-tight">urbix</Link>
            <span className="text-zinc-200">/</span>
            <Link href={'/localidad/' + encodeURIComponent(p.ciudad)} className="hover:text-zinc-600 transition">{p.ciudad}</Link>
            <span className="text-zinc-200">/</span>
            <span className="truncate max-w-xs text-xs">{tituloCorto}</span>
          </div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-rose-500 transition">← Volver</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* TÍTULO + DIRECCIÓN */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 leading-snug max-w-3xl">{tituloCorto}</h1>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-3xl font-bold text-rose-500">{p.moneda} {p.precio?.toLocaleString('es-AR')}</p>
              {precioM2 && <p className="text-xs text-zinc-400">{p.moneda} {precioM2.toLocaleString('es-AR')}/m²</p>}
              <BotonFavorito propiedadId={String(p.id)} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            <span>{direccionCompleta}</span>
          </div>
        </div>

        {/* GALERÍA */}
        <div className="mb-8">
          <GaleriaConLightbox imgs={imgs} titulo={tituloCorto} />
        </div>

        {/* LAYOUT PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLUMNA IZQUIERDA */}
          <div className="lg:col-span-2 space-y-6">

            {fichaItems.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Detalles de la propiedad</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {fichaItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {item.svg}
                        </svg>
                      </div>
                      <p className="text-xs text-zinc-400">{item.label}</p>
                      <p className="text-sm font-bold text-zinc-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Características</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="text-xs bg-zinc-50 text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Descripción</h2>
              <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-line">{descripcion}</p>
            </div>

            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3.5 rounded-2xl transition text-sm w-full">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            )}

          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            <div className="sticky top-20">
              <FormularioContacto propiedadId={String(p.id)} propiedadTitulo={tituloCorto} />
              <div className="mt-4 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <p className="text-sm text-rose-500 font-semibold mb-1">¿Sos de esta inmobiliaria?</p>
                <p className="text-xs text-zinc-500 mb-3">Registrate y publicá tus propiedades en Urbix.</p>
                <Link href="/soy-inmobiliaria?registro=1"
                  className="block text-center text-sm bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition">
                  Registrar mi inmobiliaria
                </Link>
              </div>
              <div className="mt-4 bg-zinc-50 rounded-xl p-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  La información es de carácter informativo. Verificá siempre los datos con el propietario o representante antes de tomar decisiones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PROPIEDADES SIMILARES */}
        {similares && similares.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              <h2 className="text-lg font-bold text-zinc-900">Más propiedades en {p.ciudad}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similares.map(s => {
                const img = getImgSimilar(s.imagenes)
                if (!img) return null
                const tit = s.titulo ? s.titulo.slice(0, 60) : ''
                return (
                  <Link key={s.id} href={'/propiedad/' + s.id}
                    className="group block bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                    <div className="h-44 overflow-hidden bg-zinc-100">
                      <img src={img} alt={tit} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-bold text-rose-500 mb-1">{s.moneda} {s.precio?.toLocaleString('es-AR')}</p>
                      <p className="text-xs text-zinc-700 font-medium line-clamp-2 mb-1">{tit}</p>
                      <p className="text-xs text-zinc-400">{s.ciudad}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}