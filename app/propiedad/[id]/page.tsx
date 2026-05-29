import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PropiedadDetalle({ params }: { params: { id: string } }) {
  const { data: p } = await supabase
    .from('propiedades')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!p) return notFound()

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-100">
        <Link href="/"><span className="text-2xl font-bold text-rose-500 cursor-pointer">urbix</span></Link>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {p.imagenes && (<img src={p.imagenes} alt={p.titulo} className="w-full h-72 object-cover rounded-2xl mb-8" />)}
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{p.titulo}</h1>
        <p className="text-zinc-400 text-sm mb-6">{p.direccion} · {p.ciudad}</p>
        <p className="text-3xl font-bold text-rose-500 mb-8">{p.moneda} {p.precio?.toLocaleString()}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {p.dormitorios && (<div className="bg-zinc-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-zinc-900">{p.dormitorios}</p><p className="text-xs text-zinc-400 mt-1">Dormitorios</p></div>)}
          {p.banos && (<div className="bg-zinc-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-zinc-900">{p.banos}</p><p className="text-xs text-zinc-400 mt-1">Baños</p></div>)}
          {p.superficie_m2 && (<div className="bg-zinc-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-zinc-900">{p.superficie_m2}</p><p className="text-xs text-zinc-400 mt-1">m²</p></div>)}
          {p.barrio && (<div className="bg-zinc-50 rounded-xl p-4 text-center"><p className="text-sm font-bold text-zinc-900">{p.barrio}</p><p className="text-xs text-zinc-400 mt-1">Barrio</p></div>)}
        </div>
        {p.descripcion && (<div className="mb-10"><h2 className="text-lg font-bold text-zinc-900 mb-3">Descripción</h2><p className="text-sm text-zinc-600 leading-relaxed">{p.descripcion}</p></div>)}
        <div className="bg-rose-50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Contactar</h2>
          {p.url_origen && (<a href={p.url_origen} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-rose-500 text-white font-semibold py-3 rounded-full hover:bg-rose-600 transition mb-3">Ver publicación original</a>)}
          {p.contacto && (<p className="text-sm text-zinc-500 text-center">{p.contacto}</p>)}
        </div>
        <div className="mt-8"><Link href="/"><span className="text-sm text-rose-500 hover:underline cursor-pointer">← Volver al inicio</span></Link></div>
      </div>
    </div>
  )
}
