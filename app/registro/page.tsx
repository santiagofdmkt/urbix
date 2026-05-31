'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setEnviado(true)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/perfil' }
    })
  }

  if (enviado) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Revisá tu email</h2>
        <p className="text-zinc-400 text-sm">Te enviamos un link de confirmación a <strong>{email}</strong></p>
        <Link href="/" className="mt-6 inline-block text-sm text-rose-500 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <p className="text-zinc-400 text-sm mt-2">Creá tu cuenta gratis</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm">
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-xl py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrarse con Google
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-zinc-100"/>
            <span className="text-xs text-zinc-400">o con email</span>
            <div className="flex-1 h-px bg-zinc-100"/>
          </div>
          <form onSubmit={handleRegistro} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"/>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"/>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"/>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-50">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-xs text-zinc-400 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-rose-500 font-medium hover:underline">Ingresá</Link>
          </p>
        </div>
      </div>
    </div>
  )
}