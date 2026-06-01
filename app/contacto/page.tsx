'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ContactoForm() {
  const searchParams = useSearchParams()
  const enviado = searchParams.get('enviado') === 'true'

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-rose-500 tracking-tight">urbix</Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 transition">← Volver al inicio</Link>
        </div>
      </header>

      <section className="max-w-xl mx-auto px-4 py-16">

        {enviado ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📍</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">¡Gracias por la sugerencia!</h1>
            <p className="text-sm text-zinc-500 mb-8">
              Recibimos tu ciudad. Si hay suficiente demanda, la sumamos al portal.
            </p>
            <Link
              href="/"
              className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">¿No encontrás tu ciudad?</p>
            <h1 className="text-3xl font-bold text-zinc-900 mb-3">Sugerí una ciudad</h1>
            <p className="text-sm text-zinc-500 mb-8">
              Estamos expandiéndonos por el interior bonaerense y el país. Si tu ciudad no está, avisanos y la sumamos a la lista.
            </p>

            <form
              action="https://formsubmit.co/santiagofd.mkt@gmail.com"
              method="POST"
              className="space-y-4"
            >
              <input type="hidden" name="_subject" value="Nueva sugerencia de ciudad — Urbix" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_next" value="https://urbix.com.ar/contacto?enviado=true" />

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Tu nombre</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Juan García"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Tu email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="juan@gmail.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Ciudad que querés sugerir</label>
                <input
                  type="text"
                  name="ciudad"
                  required
                  placeholder="Ej: Bragado, Lincoln, Junín..."
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Mensaje (opcional)</label>
                <textarea
                  name="mensaje"
                  rows={3}
                  placeholder="Cualquier comentario adicional..."
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                Enviar sugerencia
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-400">
              ¿Preferís escribirnos directo?{' '}
              <a href="mailto:santiagofd.mkt@gmail.com" className="text-rose-500 hover:underline">santiagofd.mkt@gmail.com</a>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default function Contacto() {
  return (
    <Suspense>
      <ContactoForm />
    </Suspense>
  )
}