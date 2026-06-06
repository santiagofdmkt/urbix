'use client'

export default function BotonesHero() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 80 // altura del nav sticky
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="flex justify-center gap-2 mb-4">
      {[
        { label: 'Comprar', id: 'comprar' },
        { label: 'Alquilar', id: 'alquiler' },
      ].map((tab, i) => (
        <button
          key={tab.label}
          onClick={() => scrollTo(tab.id)}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition border ${
            i === 0
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white text-zinc-500 border-zinc-200 hover:border-rose-300'
          }`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}