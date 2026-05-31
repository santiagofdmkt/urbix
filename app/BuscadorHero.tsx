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
    <div className="w-full px-2">
      <div className="bg-white rounded-2xl shadow-lg px-3 py-2.5 flex items-center gap-2 mb-3 w-full">
        <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)}
          placeholder="Ej: casa con jardín, 3 dormitorios..."
          className="flex-1 min-w-0 text-sm text-zinc-800 outline-none bg-transparent placeholder-zinc-400"
        />
        <button
          onClick={handleSubmit}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0">
          Buscar
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2 px-1">
        {['Casas', 'Departamentos', 'Terrenos', 'Quintas', 'Locales'].map(f => (
          <button
            key={f}
            onClick={() => handleTag(f)}
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 bg-white/80 text-zinc-600 hover:border-rose-400 hover:text-rose-500 transition cursor-pointer">
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}