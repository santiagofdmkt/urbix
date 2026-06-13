'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function SoyInmobiliariaContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'landing' | 'form' | 'success'>(
    searchParams.get('registro') === '1' ? 'form' : 'landing'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [faqAbierta, setFaqAbierta] = useState<number | null>(null)

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

  const FAQS = [
    {
      q: '¿Cuánto cuesta publicar en Urbix?',
      a: 'Nada. No cobramos comisiones ni abonos por publicar tus propiedades. Reclamar tu perfil y mantener tu inventario visible en Urbix es totalmente gratis.',
    },
    {
      q: '¿Cómo llegan los compradores a mis propiedades?',
      a: 'Urbix es un buscador con IA que entiende búsquedas naturales, como "casa con patio cerca del centro de Chivilcoy". Tus propiedades aparecen ante compradores del interior que las buscan con sus propias palabras, no solo con filtros rígidos.',
    },
    {
      q: '¿Necesito conocimientos técnicos para sumarme?',
      a: 'No. Completás un formulario simple con los datos de tu inmobiliaria y nosotros nos encargamos del resto. No hace falta instalar nada ni configurar integraciones complejas.',
    },
    {
      q: '¿Puedo dejar de usar Urbix cuando quiera?',
      a: 'Sí. Sin contratos, sin permanencia mínima y sin penalidades. Usás Urbix mientras te sirva y lo dejás cuando quieras.',
    },
    {
      q: '¿En qué zonas funciona Urbix?',
      a: 'Hoy tenemos cobertura en ciudades del interior bonaerense como Chivilcoy, Mercedes, 9 de Julio, Lobos y más. Sumamos nuevas localidades de forma constante.',
    },
  ]

  if (step === 'landing') return (
    <div className="min-h-screen bg-white font-sans">
      <span id="top" />
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 transition">← Volver al inicio</Link>
        </div>
      </header>

      {/* HERO: TUS PROPIEDADES FRENTE A QUIEN COMPRA */}
      <section className="relative w-full py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80" alt="fondo hogar" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,241,242,0.97) 0%, rgba(252,231,243,0.95) 50%, rgba(237,233,254,0.93) 100%)" }} />
        </div>
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full bg-rose-300/20 blur-3xl z-0" />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-purple-300/20 blur-3xl z-0" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-14">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-rose-100 border border-rose-200 rounded-full px-4 py-1.5 mb-5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Para inmobiliarias del interior</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 leading-tight mb-5">
              Tus propiedades,<br />
              <span className="text-rose-500 italic">frente a quien compra.</span>
            </h1>
            <p className="text-zinc-600 text-base leading-relaxed mb-8 max-w-lg font-medium">
              Los compradores de Chivilcoy, Mercedes, 9 de Julio y toda la zona ya buscan en Urbix.
              Sumá tu inmobiliaria y recibí consultas reales — sin pagar por cada click.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                { icon: '📩', title: 'Leads directos', desc: 'El comprador te contacta a vos, sin intermediarios.' },
                { icon: '🤝', title: 'Sin ataduras', desc: 'Sin contrato largo — arrancás y parás cuando querés.' },
                { icon: '📊', title: 'Visibilidad real', desc: 'Sabés exactamente cuánta gente ve tus propiedades.' },
                { icon: '🏙️', title: 'Presente en todo el país', desc: 'Tu ciudad tiene su lugar, sin importar donde estés.' },
              ].map(item => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-rose-100 shadow-sm flex items-center justify-center text-xl shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => setStep('form')} className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-8 py-4 rounded-full transition text-sm shadow-xl shadow-rose-300 cursor-pointer">
              Quiero sumar mi inmobiliaria
              <span className="text-lg">→</span>
            </button>
            <p className="text-xs text-zinc-400 mt-3 ml-1">Sin costo de alta · Sin permanencia mínima</p>
          </div>
          <div className="flex-shrink-0 w-full md:w-[380px]">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/60 backdrop-blur-sm">
              <div className="relative bg-gradient-to-br from-rose-500 via-rose-500 to-pink-600 px-7 py-8 text-white overflow-hidden">
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute bottom-[-20px] left-[-20px] w-28 h-28 rounded-full bg-white/10" />
                <p className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Este mes en Urbix</p>
                <p className="text-4xl font-black relative z-10">Cientos</p>
                <p className="text-rose-100 text-sm mt-1 relative z-10 font-medium">de propiedades activas en el interior</p>
              </div>
              <div className="bg-white px-7 py-6 space-y-5">
                {[
                  { num: '7', label: 'Ciudades del interior', icon: '📍' },
                  { num: '100%', label: 'Gratis para el comprador', icon: '✅' },
                  { num: 'IA', label: 'Búsqueda inteligente', icon: '🤖' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-4 border-b border-zinc-100 pb-5 last:border-0 last:pb-0">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-zinc-500 text-sm flex-1">{s.label}</span>
                    <span className="text-rose-500 font-black text-xl">{s.num}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-r from-rose-50 to-purple-50 px-7 py-4 border-t border-rose-100">
                <p className="text-zinc-500 text-xs text-center leading-relaxed">
                  Los compradores del interior <span className="text-zinc-800 font-bold">ya buscan en Urbix</span> cada día
                </p>
              </div>
            </div>
            <div className="mt-4 mx-4 bg-white rounded-2xl px-5 py-3.5 shadow-lg border border-zinc-100 flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="text-xs font-bold text-zinc-800">Expansión en curso</p>
                <p className="text-xs text-zinc-400">Nuevas ciudades sumándose cada mes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TE TRAEMOS COMPRADORES QUE HOY NO TE ENCUENTRAN */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-xl border border-zinc-100 order-2 md:order-1">
            <img src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=900&q=80" alt="Buscando propiedades en Urbix" className="w-full h-full object-cover" />
          </div>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full mb-4">
              🔍 Buscador gratuito
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 leading-tight mb-5">
              Te traemos compradores<br />que hoy no te encuentran
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              Urbix es un buscador con inteligencia artificial que entiende lo que la gente busca con sus propias palabras, como <span className="font-semibold text-zinc-800">"casa luminosa con patio cerca del centro"</span>. Tus propiedades aparecen ante compradores que difícilmente las encontrarían en los portales tradicionales.
            </p>
            <p className="text-zinc-600 leading-relaxed mb-6">
              Al reclamar tu perfil tenés <span className="font-semibold text-zinc-800">el control de tus publicaciones</span>: las mantenés actualizadas, mejorás su visibilidad y llegás a más gente. <span className="font-bold text-rose-500">Todo gratis.</span>
            </p>
            <ul className="space-y-3">
              {[
                'Búsquedas por intención, no solo por filtros',
                'Tus propiedades, ordenadas y siempre actualizadas',
                'Más visibilidad sin pagar publicidad',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PUBLICÁ TUS PROPIEDADES DONDE TE BUSCAN */}
      <section className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #ede9fe 100%)" }}>
        <p className="text-xs font-bold tracking-widest text-rose-400 uppercase mb-4">Para inmobiliarias</p>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
          Publicá tus propiedades<br />
          <span className="text-rose-500 italic">donde te buscan</span>
        </h2>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10">
          Sumá tu inmobiliaria a Urbix y llegá a compradores del interior bonaerense que buscan con IA.
        </p>
        <button onClick={() => setStep('form')}
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

      {/* ¿POR QUÉ ES GRATIS? */}
      <section className="bg-zinc-50 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">¿Por qué es gratis?</h2>
          <p className="text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            No cobramos comisiones ni abonos por publicar. Mientras hacemos crecer Urbix en el interior, sumar tu inmobiliaria y tener tus propiedades visibles es totalmente gratis. Nos conviene que tengas éxito: cuantas más operaciones cierres, más fuerte es Urbix.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '💸', titulo: 'Sin comisiones', desc: 'Cero costo por listar tus propiedades.' },
              { icon: '♾️', titulo: 'Sin límites', desc: 'Publicá todas las propiedades que tengas.' },
              { icon: '👥', titulo: 'Más leads', desc: 'Llegá a compradores nuevos sin pagar de más.' },
            ].map(b => (
              <div key={b.titulo} className="bg-white p-8 rounded-2xl border border-zinc-100 hover:shadow-md transition">
                <span className="text-4xl mb-4 block">{b.icon}</span>
                <h3 className="font-bold text-zinc-800 mb-2">{b.titulo}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ¿CÓMO EMPEZAR? */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-12 text-center">¿Cómo empezar?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '1', titulo: 'Reclamá tu perfil', desc: 'Completá el formulario con los datos de tu inmobiliaria.' },
            { n: '2', titulo: 'Verificamos tus datos', desc: 'Revisamos y activamos tu perfil a la brevedad.' },
            { n: '3', titulo: 'Empezás a recibir consultas', desc: 'Tu inventario queda visible y comenzás a recibir contactos.' },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500 text-white text-xl font-black flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-200">
                {s.n}
              </div>
              <h3 className="font-bold text-zinc-800 mb-2">{s.titulo}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="bg-zinc-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-10 text-center">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <button
                  onClick={() => setFaqAbierta(faqAbierta === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer">
                  <span className="font-semibold text-zinc-800 text-sm md:text-base">{faq.q}</span>
                  <svg className={`w-5 h-5 text-rose-500 shrink-0 transition-transform ${faqAbierta === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {faqAbierta === i && (
                  <div className="px-6 pb-5 -mt-1">
                    <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-zinc-900 text-white py-16 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Conseguí más consultas</h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
          Reclamá tu perfil y empezá a usar todas las herramientas gratuitas. Configuración en minutos, sin comisiones, sin límites.
        </p>
        <button onClick={() => setStep('form')}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-full text-lg transition cursor-pointer">
          Registrar mi inmobiliaria
        </button>
      </section>
    </div>
  )

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
            { name: 'nombre',              label: 'Nombre y apellido',                         placeholder: 'Juan Pérez',           type: 'text'     },
            { name: 'inmobiliaria',         label: 'Nombre de la inmobiliaria',                 placeholder: 'Inmobiliaria El Sol',  type: 'text'     },
            { name: 'telefono',             label: 'Teléfono / WhatsApp',                       placeholder: '+54 9 2346 123456',    type: 'tel'      },
            { name: 'email',                label: 'Email',                                     placeholder: 'juan@ejemplo.com',     type: 'email'    },
            { name: 'ciudad',               label: 'Ciudad donde opera',                        placeholder: 'Chivilcoy',            type: 'text'     },
            { name: 'cantidad_propiedades', label: '¿Cuántas propiedades tenés para publicar?', placeholder: 'Ej: 15',              type: 'number'   },
            { name: 'password',             label: 'Contraseña',                                placeholder: 'Mínimo 6 caracteres', type: 'password' },
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

          <button type="submit" disabled={loading}
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

export default function SoyInmobiliaria() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-zinc-400">Cargando...</p></div>}>
      <SoyInmobiliariaContent />
    </Suspense>
  )
}