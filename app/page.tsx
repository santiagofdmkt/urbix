import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('*')
    .eq('activo', true)
    .not('imagenes', 'is', null)

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4">
        <span className="text-2xl font-bold text-rose-500">urbix</span>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition">
            Publicar propiedad
          </button>
          <button className="bg-rose-500 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-rose-600 transition">
            Registrar inmobiliaria
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex flex-col items-center justify-center text-center px-6 py-32"
        style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #ede9fe 100%)" }}>
        <span className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-4">
          Buscador inmobiliario con IA
        </span>
        <h1 className="text-5xl font-bold text-zinc-900 max-w-2xl leading-tight mb-4">
          Encontrá tu próxima propiedad
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Describí lo que buscás en tus propias palabras. Sin filtros complicados.
        </p>

        {/* Buscador */}
        <div className="flex flex-col w-full max-w-2xl gap-3">
          <div className="flex bg-white rounded-full shadow-lg px-2 py-2 gap-2">
            <input type="text"
              placeholder="Ej: casa con jardín, 3 dormitorios, cerca de la plaza..."
              className="flex-1 px-5 py-2 text-sm text-zinc-800 outline-none bg-transparent" />
            <button className="bg-rose-500 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-rose-600 transition">
              Buscar
            </button>
          </div>
          <div className="flex bg-white rounded-full shadow px-2 py-2 gap-2">
            <input type="text"
              placeholder="Ciudad (ej: Chivilcoy, Mercedes, Suipacha...)"
              className="flex-1 px-5 py-2 text-sm text-zinc-800 outline-none bg-transparent" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {["Casas", "Departamentos", "Terrenos", "Alquiler", "Venta", "Apto crédito"].map((f) => (
            <button key={f}
              className="text-sm px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition">
              {f}
            </button>
          ))}
        </div>
      </main>

      {/* Stats */}
      <section className="flex justify-center gap-12 py-10 border-b border-zinc-100">
        {[
          { num: `${propiedades?.length || 0}`, label: "Propiedades" },
          { num: "IA", label: "Búsqueda inteligente" },
          { num: "100%", label: "Gratis para buscar" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-bold text-rose-500">{s.num}</p>
            <p className="text-sm text-zinc-500">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Propiedades */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-zinc-900 mb-8">Propiedades disponibles</h2>
        {propiedades && propiedades.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {propiedades.map((p) => (
              <Link key={p.id} href={`/propiedad/${p.id}`} className="border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md transition cursor-pointer block">
                {p.imagenes && (
                  <img
                    src={p.imagenes}
                    alt={p.titulo}
                    className="h-48 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-zinc-900 mb-1 line-clamp-2">
                    {p.titulo}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3">{p.direccion}</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {p.moneda} {p.precio?.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {p.dormitorios ? `${p.dormitorios} dorm · ` : ''}
                    {p.banos ? `${p.banos} baños · ` : ''}
                    {p.superficie_m2 ? `${p.superficie_m2} m²` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400">No hay propiedades cargadas todavía.</p>
        )}
      </section>

    </div>
  )
}