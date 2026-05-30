'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

export default function SoyInmobiliaria() {
  const searchParams = useSearchParams()
const [step, setStep] = useState<'landing' | 'form' | 'success'>(
  searchParams.get('registro') === '1' ? 'form' : 'landing'
)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    inmobiliaria: '',
    telefono: '',
    email: '',
    ciudad: '',
    cantidad_propiedades: '',
    password: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nombre: form.nombre,
            inmobiliaria: form.inmobiliaria,
            telefono: form.telefono,
            ciudad: form.ciudad,
            rol: 'inmobiliaria',
          }
        }
      })
      if (authError) throw authError

      const { error: dbError } = await supabase
        .from('inmobiliarias')
        .insert([{
          user_id: authData.user?.id,
          nombre_contacto: form.nombre,
          inmobiliaria: form.inmobiliaria,
          telefono: form.telefono,
          email: form.email,
          ciudad: form.ciudad,
          cantidad_propiedades: parseInt(form.cantidad_propiedades) || 0,
        }])
      if (dbError) throw dbError

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── LANDING ────────────────────────────────────────────
  if (step === 'landing') return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 transition">← Volver al inicio</Link>
        </div>
      </header>

      <section className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #ede9fe 100%)" }}>
        <p className="text-xs font-bold tracking-widest text-rose-400 uppercase mb-4">Para inmobiliarias</p>
        <h1 className="text-5xl font-bold text-zinc-900 mb-4">
          Publicá tus propiedades<br />
          <span className="text-rose-500 italic">donde te buscan</span>
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10">
          Sumá tu inmobiliaria a Urbix y llegá a compradores del interior bonaerense que buscan con IA.
        </p>
        <button
          onClick={() => setStep('form')}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-full text-lg transition shadow-lg cursor-pointer">
          Registrar mi inmobiliaria
        </button>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: '🔍', titulo: 'Buscador con IA', desc: 'Tus propiedades aparecen cuando alguien describe exactamente lo que vendés.' },
          { icon: '📍', titulo: 'Presencia local', desc: 'Posicionamiento en tu ciudad y en todo el interior bonaerense.' },
          { icon: '📊', titulo: 'Panel de gestión', desc: 'Cargá, editá y gestioná tus propiedades desde un panel simple y rápido.' },
        ].map(b => (
          <div key={b.titulo} className="text-center p-6 rounded-2xl border border-zinc-100 hover:shadow-md transition">
            <span className="text-4xl mb-4 block">{b.icon}</span>
            <h3 className="font-bold text-zinc-800 mb-2">{b.titulo}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-zinc-900 text-white py-14 text-center">
        <h2 className="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
        <p className="text-zinc-400 mb-8">Registro gratuito. Sin contratos.</p>
        <button
          onClick={() => setStep('form')}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-full text-lg transition cursor-pointer">
          Registrar mi inmobiliaria
        </button>
      </section>
    </div>
  )

  // ── FORMULARIO ──────────────────────────────────────────
  if (step === 'form') return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <button onClick={() => setStep('landing')} className="text-sm text-zinc-500 hover:text-zinc-800 transition cursor-pointer">← Volver</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">Registrá tu inmobiliaria</h2>
        <p className="text-zinc-500 mb-8">Completá los datos para crear tu cuenta.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'nombre',               label: 'Nombre y apellido',                         placeholder: 'Juan Pérez',           type: 'text'     },
            { name: 'inmobiliaria',          label: 'Nombre de la inmobiliaria',                 placeholder: 'Inmobiliaria El Sol',  type: 'text'     },
            { name: 'telefono',              label: 'Teléfono / WhatsApp',                       placeholder: '+54 9 2346 123456',    type: 'tel'      },
            { name: 'email',                 label: 'Email',                                     placeholder: 'juan@ejemplo.com',     type: 'email'    },
            { name: 'ciudad',                label: 'Ciudad donde opera',                        placeholder: 'Chivilcoy',            type: 'text'     },
            { name: 'cantidad_propiedades',  label: '¿Cuántas propiedades tenés para publicar?', placeholder: 'Ej: 15',              type: 'number'   },
            { name: 'password',              label: 'Contraseña',                                placeholder: 'Mínimo 6 caracteres', type: 'password' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-zinc-700 mb-1">{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={f.placeholder}
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition bg-white"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition text-base mt-2 cursor-pointer">
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Al registrarte aceptás los{' '}
            <a href="#" className="text-rose-500 hover:underline">Términos de uso</a>
            {' '}y la{' '}
            <a href="#" className="text-rose-500 hover:underline">Política de privacidad</a>.
          </p>
        </form>
      </div>
    </div>
  )

  // ── SUCCESS ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 font-sans">
      <span className="text-6xl mb-6">🎉</span>
      <h2 className="text-3xl font-bold text-zinc-900 mb-3">¡Cuenta creada!</h2>
      <p className="text-zinc-500 max-w-md mb-8">
        Te enviamos un email de confirmación. Una vez verificado podés acceder a tu panel y empezar a publicar.
      </p>
      <Link href="/" className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-8 py-3 rounded-full transition cursor-pointer">
        Volver al inicio
      </Link>
    </div>
  )
}