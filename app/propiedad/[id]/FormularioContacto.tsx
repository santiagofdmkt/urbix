'use client'
import { useState } from 'react'

export default function FormularioContacto({
  propiedadId,
  propiedadTitulo,
}: {
  propiedadId: string
  propiedadTitulo: string
}) {
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', mensaje: '' })
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          propiedad_id: propiedadId,
          propiedad_titulo: propiedadTitulo,
        }),
      })
      if (!res.ok) throw new Error('Error al enviar')
      setEnviado(true)
    } catch {
      setError('Hubo un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
      <span className="text-3xl mb-2 block">✅</span>
      <p className="text-sm font-semibold text-green-700">¡Consulta enviada!</p>
      <p className="text-xs text-zinc-500 mt-1">Te contactamos a la brevedad.</p>
    </div>
  )

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-zinc-800 mb-1">Quiero información</h2>
      <p className="text-xs text-zinc-400 mb-4">Completá tus datos y te contactamos.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { name: 'nombre',   label: 'Nombre y apellido', type: 'text',  placeholder: 'Juan Pérez' },
          { name: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', placeholder: '+54 9 11 1234 5678' },
          { name: 'email',    label: 'Email',              type: 'email', placeholder: 'juan@ejemplo.com' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-xs font-medium text-zinc-600 mb-1">{f.label}</label>
            <input
              type={f.type}
              name={f.name}
              value={form[f.name as keyof typeof form]}
              onChange={handleChange}
              placeholder={f.placeholder}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition bg-white"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Mensaje</label>
          <textarea
            name="mensaje"
            value={form.mensaje}
            onChange={handleChange}
            placeholder="Quiero más información sobre esta propiedad..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition bg-white resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition text-sm cursor-pointer">
          {loading ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </form>
    </div>
  )
}