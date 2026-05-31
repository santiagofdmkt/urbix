import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { nombre, telefono, email, mensaje, propiedad_id, propiedad_titulo } = await req.json()

    // 1. Guardar en Supabase
    const { error } = await supabase.from('consultas').insert([{
      propiedad_id,
      propiedad_titulo,
      nombre,
      telefono,
      email,
      mensaje,
    }])

    if (error) {
      console.error('ERROR SUPABASE:', error)
      throw error
    }

    // 2. Email a Urbix
    const { error: resendError } = await resend.emails.send({
      from: 'Urbix <onboarding@resend.dev>',
      to: 'santiagofd.mkt@gmail.com',
      subject: `Nueva consulta: ${propiedad_titulo}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#f43f5e">Nueva consulta en Urbix</h2>
          <p><strong>Propiedad:</strong> ${propiedad_titulo}</p>
          <p><strong>ID:</strong> ${propiedad_id}</p>
          <hr/>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Teléfono:</strong> ${telefono}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong> ${mensaje || 'Sin mensaje'}</p>
        </div>
      `,
    })

    if (resendError) {
      console.error('ERROR RESEND:', resendError)
      throw resendError
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('ERROR GENERAL:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}