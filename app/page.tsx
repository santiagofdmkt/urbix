export default function Home() {
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
      <main
        className="relative flex flex-col items-center justify-center text-center px-6 py-32"
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #ede9fe 100%)",
        }}
      >
        <span className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-4">
          Buscador inmobiliario con IA · Chivilcoy
        </span>

        <h1 className="text-5xl font-bold text-zinc-900 max-w-2xl leading-tight mb-4">
          Encontrá tu próxima propiedad en Chivilcoy
        </h1>

        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Describí lo que buscás en tus propias palabras. Sin filtros complicados.
        </p>

        {/* Buscador */}
        <div className="flex w-full max-w-2xl bg-white rounded-full shadow-lg px-2 py-2 gap-2">
          <input
            type="text"
            placeholder="Ej: casa con jardín cerca de la plaza, 3 dormitorios..."
            className="flex-1 px-5 py-2 text-sm text-zinc-800 outline-none bg-transparent"
          />
          <button className="bg-rose-500 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-rose-600 transition">
            Buscar
          </button>
        </div>

        <p className="text-xs text-zinc-400 mt-5">
          Más de 140 propiedades en Chivilcoy y alrededores
        </p>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {["Casas", "Departamentos", "Terrenos", "Alquiler", "Venta", "Apto crédito"].map((f) => (
            <button
              key={f}
              className="text-sm px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition"
            >
              {f}
            </button>
          ))}
        </div>
      </main>

      {/* Stats */}
      <section className="flex justify-center gap-12 py-10 border-b border-zinc-100">
        {[
          { num: "140+", label: "Propiedades" },
          { num: "5+", label: "Inmobiliarias" },
          { num: "IA", label: "Búsqueda inteligente" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-bold text-rose-500">{s.num}</p>
            <p className="text-sm text-zinc-500">{s.label}</p>
          </div>
        ))}
      </section>

    </div>
  );
}