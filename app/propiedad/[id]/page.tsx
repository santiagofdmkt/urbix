import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import Link from "next/link"

export default async function PropiedadDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabase.from("propiedades").select("*").eq("id", id).single()
  if (!p) return notFound()

  const parseImgs = (raw: any): string[] => {
    try {
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string' && raw.startsWith('http')) return [raw]
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [parsed]
      }
      return []
    } catch { return raw ? [raw] : [] }
  }

  const imgs = parseImgs(p.imagenes)
  const precioM2 = p.superficie_m2 && p.precio ? Math.round(p.precio / p.superficie_m2) : null
  const tituloCorto = p.titulo?.split(/[._\n]/)[0]?.trim() || p.titulo
  const descripcion = p.descripcion || p.titulo

  return (
    <div className="min-h-screen bg-zinc-50">

      <nav className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 text-sm">
          <Link href="/" className="text-rose-500 font-bold text-lg tracking-tight">urbix</Link>
          <span className="text-zinc-200">/</span>
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 transition">Chivilcoy</Link>
          <span className="text-zinc-200">/</span>
          <span className="text-zinc-400 truncate max-w-xs text-xs">{tituloCorto}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-zinc-900 leading-snug mb-1">{tituloCorto}</h1>
          <div className="flex items-center gap-1 text-zinc-400 text-xs">
            <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            {p.direccion}{p.barrio ? `, ${p.barrio}` : ""}, Chivilcoy, Buenos Aires
          </div>
        </div>

        <div className="mb-6 rounded-2xl overflow-hidden bg-zinc-100 h-80 relative">
          {imgs.length > 0 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-1 w-full h-full">
              <div className="col-span-2 row-span-2 overflow-hidden">
                <img src={imgs[0]} alt={tituloCorto} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
              </div>
              {[1,2,3,4].map(i => (
                <div key={i} className="overflow-hidden relative bg-zinc-200">
                  {imgs[i] && <img src={imgs[i]} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" />}
                  {i === 3 && imgs.length > 5 && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white cursor-pointer">
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-xs font-medium">+{imgs.length - 4} fotos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="text-sm text-zinc-400">Sin imágenes disponibles</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <p className="text-3xl font-bold text-rose-500 tracking-tight">{p.moneda} {p.precio?.toLocaleString("es-AR")}</p>
            {precioM2 && <p className="text-xs text-zinc-400 mt-0.5">{p.moneda} {precioM2.toLocaleString("es-AR")}/m²</p>}
          </div>
          {p.url_origen && (
            <a href={p.url_origen} target="_blank" rel="noopener noreferrer"
              className="bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 py-2.5 rounded-xl transition text-sm whitespace-nowrap">
              Ver en {p.fuente} →
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Tipo", value: "Casa", svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
            { label: "Dormitorios", value: p.dormitorios, svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8"/> },
            { label: "Baños", value: p.banos, svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16M4 12V8a4 4 0 018 0v4M4 12v4a2 2 0 002 2h12a2 2 0 002-2v-4"/> },
            { label: "Superficie", value: p.superficie_m2 ? `${p.superficie_m2} m²` : null, svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/> },
          ].filter(i => i.value).map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-zinc-100 p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.svg}</svg>
              </div>
              <div>
                <p className="text-xs text-zinc-400 leading-none mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-zinc-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Descripción</h2>
            <p className="text-zinc-500 text-sm leading-relaxed whitespace-pre-line">{descripcion}</p>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 sticky top-20">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Publicado por</h2>
              <p className="text-rose-500 font-semibold text-sm mb-1">{p.inmobiliaria || p.fuente}</p>
              {p.contacto && <p className="text-xs text-zinc-400 mb-4">{p.contacto}</p>}
              {p.url_origen && (
                <a href={p.url_origen} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-rose-500 hover:bg-rose-600 text-white font-medium py-2.5 rounded-xl transition text-sm mb-4">
                  Ver publicación completa
                </a>
              )}
              <div className="border-t border-zinc-50 pt-4">
                <p className="text-xs text-zinc-300 text-center leading-relaxed">
                  Datos de {p.fuente}. Verificá siempre con la inmobiliaria.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}