import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import Link from "next/link"

export default async function PropiedadDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabase.from("propiedades").select("*").eq("id", id).single()
  if (!p) return notFound()

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <Link href="/"><span className="text-rose-500 text-sm font-medium hover:underline cursor-pointer">← Volver al inicio</span></Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Imagen */}
        {p.imagenes?.[0] && (
          <img src={p.imagenes[0]} alt={p.titulo} className="w-full h-72 object-cover rounded-2xl mb-6 shadow" />
        )}

        {/* Precio y título */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <p className="text-3xl font-bold text-rose-500 mb-2">{p.moneda} {p.precio?.toLocaleString()}</p>
          <h1 className="text-xl font-semibold text-zinc-800">{p.titulo}</h1>
          <p className="text-zinc-500 text-sm mt-1">{p.direccion}{p.barrio ? `, ${p.barrio}` : ""}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {p.dormitorios && (
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-zinc-800">{p.dormitorios}</p>
              <p className="text-xs text-zinc-500 mt-1">Dormitorios</p>
            </div>
          )}
          {p.banos && (
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-zinc-800">{p.banos}</p>
              <p className="text-xs text-zinc-500 mt-1">Baños</p>
            </div>
          )}
          {p.superficie_m2 && (
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-zinc-800">{p.superficie_m2}</p>
              <p className="text-xs text-zinc-500 mt-1">m²</p>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Descripción</h2>
          <p className="text-zinc-700 text-sm leading-relaxed">{p.descripcion}</p>
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Contactar</h2>
          {p.url_origen && (
            <a href={p.url_origen} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition mb-3">
              Ver en {p.fuente}
            </a>
          )}
          {p.contacto && <p className="text-sm text-zinc-500 text-center">{p.contacto}</p>}
        </div>
      </div>
    </div>
  )
}