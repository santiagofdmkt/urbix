export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
        <span className="text-2xl font-bold text-zinc-900">Urbix</span>
        <button className="bg-zinc-900 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-zinc-700 transition">
          Quiero publicar mi inmobiliaria
        </button>
      </header>

      <main className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-4">
          Buscador inmobiliario con IA · Chivilcoy
        </span>
        <h1 className="text-5xl font-bold text-zinc-900 max-w-2xl leading-tight mb-4">
          Encontrá tu próxima propiedad en Chivilcoy
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Describí lo que buscás en tus propias palabras. Sin filtros complicados.
        </p>

        <div className="flex w-full max-w-xl gap-2">
          <input
            type="text"
            placeholder="Ej: casa con jardín cerca de la plaza, 3 dormitorios..."
            className="flex-1 border border-zinc-200 rounded-full px-5 py-3 text-sm text-zinc-800 outline-none focus:border-zinc-400"
          />
          <button className="bg-zinc-900 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition">
            Buscar
          </button>
        </div>

        <p className="text-xs text-zinc-400 mt-4">
          Más de 140 propiedades en Chivilcoy y alrededores
        </p>
      </main>
    </div>
  );
}