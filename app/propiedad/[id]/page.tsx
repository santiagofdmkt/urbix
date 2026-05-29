import { createClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PropiedadDetalle({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: p } = await supabase
    .from('propiedades')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!p) return notFound()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">{p.titulo}</h1>
      <p className="text-rose-500 font-semibold text-xl mb-4">
        {p.moneda} {p.precio?.toLocaleString()}
      </p>
      {p.imagenes?.[0] && (
        <img src={p.imagenes[0]} alt={p.titulo} className="w-full rounded-xl mb-4 object-cover max-h-96" />
      )}
      <p className="text-zinc-600 mb-2">📍 {p.direccion}, {p.barrio}</p>
      <p className="text-zinc-700 mb-4">{p.descripcion}</p>
      <div className="flex gap-4 text-sm text-zinc-500 mb-6">
        {p.dormitorios && <span>🛏 {p.dormitorios} dorm.</span>}
        {p.banos && <span>🚿 {p.banos} baños</span>}
        {p.superficie_m2 && <span>📐 {p.superficie_m2} m²</span>}
      </div>
      <div className="bg-rose-50 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Contactar</h2>
        {p.url_origen && <a href={p.url_origen} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-rose-500 text-white font-semibold py-2 rounded-lg mb-2">Ver en {p.fuente}</a>}
        {p.contacto && <p className="text-sm text-zinc-500 text-center">{p.contacto}</p>}
      </div>
      <div className="mt-8"><Link href="/"><span className="text-sm text-rose-500 hover:underline cursor-pointer">← Volver al inicio</span></Link></div>
    </div>
  )
}