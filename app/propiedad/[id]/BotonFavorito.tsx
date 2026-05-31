'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BotonFavorito({ propiedadId }: { propiedadId: string }) {
  const router = useRouter()
  const [guardado, setGuardado] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('favoritos')
        .select('id')
        .eq('user_id', user.id)
        .eq('propiedad_id', propiedadId)
        .single()
      setGuardado(!!data)
    }
    init()
  }, [propiedadId])

  const toggle = async () => {
    if (!userId) { router.push('/login'); return }
    setLoading(true)
    if (guardado) {
      await supabase.from('favoritos')
        .delete()
        .eq('user_id', userId)
        .eq('propiedad_id', propiedadId)
      setGuardado(false)
    } else {
      await supabase.from('favoritos')
        .insert({ user_id: userId, propiedad_id: propiedadId })
      setGuardado(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition text-sm font-medium ${
        guardado
          ? 'bg-rose-50 border-rose-200 text-rose-500'
          : 'bg-white border-zinc-200 text-zinc-500 hover:border-rose-300 hover:text-rose-400'
      }`}>
      <svg className="w-5 h-5" fill={guardado ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
      {guardado ? 'Guardado' : 'Guardar'}
    </button>
  )
}