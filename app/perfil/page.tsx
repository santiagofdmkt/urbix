'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [favoritos, setFavoritos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: favs } = await supabase
        .from('favoritos')
        .select('*, propiedades(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setFavoritos(favs || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Cargando...</div>
    </div>
  )

  const nombre = user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.email?.split('@')[0]
  const avatar = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <nav className="bg-white border-b border-zinc-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-rose-500 transition">Cerrar sesión</button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* HEADER PERFIL */}
        <div className="flex items-center gap-4 mb-10">
          {avatar
            ? <img src={avatar} className="w-16 h-16 rounded-full object-cover"/>
            : <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 text-2xl font-bold">{nombre?.[0]?.toUpperCase()}</div>
          }
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{nombre}</h1>
            <p className="text-sm text-zinc-400">{user.email}</p>
          </div>
        </div>

        {/* FAVORITOS */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-4">❤️ Mis favoritos</h2>
          {favoritos.length === 0
            ? <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
                <p className="text-zinc-400 text-sm mb-3">Todavía no guardaste ninguna propiedad.</p>
                <Link href="/propiedades" className="text-sm text-rose-500 font-medium hover:underline">Ver propiedades</Link>
              </div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritos.map(f => {
                  const p = f.propiedades
                  if (!p) return null
                  return (
                    <Link key={f.id} href={'/propiedad/' + p.id}
                      className="group block bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition">
                      <div className="h-40 bg-zinc-100 overflow-hidden">
                        {p.imagenes && <img src={(() => { try { const a = JSON.parse(p.imagenes); return Array.isArray(a) ? a[0] : p.imagenes } catch { return p.imagenes } })()} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-bold text-rose-500 mb-1">{p.moneda} {p.precio?.toLocaleString('es-AR')}</p>
                        <p className="text-xs text-zinc-700 line-clamp-2">{p.titulo}</p>
                        <p className="text-xs text-zinc-400 mt-1">{p.ciudad}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
          }
        </div>
      </div>
    </div>
  )
}