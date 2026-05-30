import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { nombre, telefono, email, mensaje, propiedad_id, propiedad_titulo } = await req.json()

    const { error } = await supabase.from('consultas').insert([{
      propiedad_id,
      propiedad_titulo,
      nombre,
      telefono,
      email,
      mensaje,
    }])

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}