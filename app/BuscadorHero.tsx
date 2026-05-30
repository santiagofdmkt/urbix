'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BuscadorHero() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push('/buscar?q=' + encodeURIComponent(query))
  }

  function handleTag(tag: string) {
    router.push('/buscar?q=' + encodeURIComponent(tag))
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 mb-3">
        <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)}
          placeholder="Ej: casa con jardín, 3 dormitorios, cerca de la plaza..."
          className="flex-1 text-sm text-zinc-800 outline-none bg-transparent placeholder-zinc-400"
        />
        <button
          onClick={handleSubmit}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition cursor-pointer">
          Buscar
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {['Casas', 'Departamentos', 'Terrenos', 'Quintas', 'Locales'].map(f => (
          <button
            key={f}
            onClick={() => handleTag(f)}
            className="text-xs px-4 py-1.5 rounded-full border border-zinc-200 bg-white/80 text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition cursor-pointer">
            {f}
          </button>
        ))}
      </div>
    </>
  )
}