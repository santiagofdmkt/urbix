import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parsearQuery(query: string) {
  const q = query.toLowerCase()
  const filtros: any = {}

  // CIUDAD — busca nombres de ciudades conocidas
  const ciudades = ['chivilcoy', 'mercedes', '25 de mayo', '9 de julio', 'pehuajo', 'pehuajó', 'trenque lauquen', 'lobos']
  for (const ciudad of ciudades) {
    if (q.includes(ciudad)) {
      filtros.ciudad = ciudad === 'pehuajo' ? 'Pehuajó' : ciudad.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      break
    }
  }

  // DORMITORIOS
  const dormMatch = q.match(/(\d+)\s*(dorm|dormitorio|ambiente|hab)/i)
  if (dormMatch) filtros.dormitorios_min = parseInt(dormMatch[1])

  // PRECIO MAX — "hasta X", "menos de X", "máximo X"
  const precioMaxMatch = q.match(/(?:hasta|menos de|m[aá]ximo|max)\s*(?:usd\s*)?(\d[\d.,]*)\s*(?:mil|k|m)?/i)
  if (precioMaxMatch) {
    let precio = parseFloat(precioMaxMatch[1].replace(/\./g, '').replace(',', '.'))
    if (q.includes('mil') || q.includes('k')) precio = precio * 1000
    filtros.precio_max = precio
  }

  // PRECIO MIN — "desde X", "más de X", "mínimo X"
  const precioMinMatch = q.match(/(?:desde|m[aá]s de|m[ií]nimo|min)\s*(?:usd\s*)?(\d[\d.,]*)\s*(?:mil|k)?/i)
  if (precioMinMatch) {
    let precio = parseFloat(precioMinMatch[1].replace(/\./g, '').replace(',', '.'))
    if (q.includes('mil') || q.includes('k')) precio = precio * 1000
    filtros.precio_min = precio
  }

  // MONEDA
  if (q.includes('usd') || q.includes('dolar') || q.includes('dólar') || q.includes('verde')) {
    filtros.moneda = 'USD'
  } else if (q.includes('pesos') || q.includes('ars')) {
    filtros.moneda = 'ARS'
  }

  // SUPERFICIE
  const supMatch = q.match(/(\d+)\s*m[²2]/i)
  if (supMatch) filtros.superficie_min = parseInt(supMatch[1])

  // KEYWORDS para filtrar en descripción
  const keywordMap: Record<string, string[]> = {
    'jardín': ['jardin', 'jardín'],
    'pileta': ['pileta', 'piscina'],
    'cochera': ['cochera', 'garage'],
    'quincho': ['quincho'],
    'parrilla': ['parrilla'],
    'terraza': ['terraza'],
    'balcón': ['balcon', 'balcón'],
    'luminoso': ['luminoso', 'luminosa'],
    'esquina': ['esquina'],
  }
  filtros.keywords = []
  for (const [label, variants] of Object.entries(keywordMap)) {
    if (variants.some(v => q.includes(v))) {
      filtros.keywords.push(label)
    }
  }

  // TIPO
  if (q.includes('casa')) filtros.tipo = 'casa'
  if (q.includes('departamento') || q.includes('depto') || q.includes('dpto')) filtros.tipo = 'departamento'
  if (q.includes('terreno') || q.includes('lote')) filtros.tipo = 'terreno'
  if (q.includes('quinta')) filtros.tipo = 'quinta'
  if (q.includes('local') || q.includes('comercial')) filtros.tipo = 'local'

  return filtros
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    const filtros = parsearQuery(query)

    let q = supabase
      .from('propiedades')
      .select('*')
      .eq('activo', true)
      .not('imagenes', 'is', null)

    if (filtros.ciudad) q = q.ilike('ciudad', '%' + filtros.ciudad + '%')
    if (filtros.dormitorios_min) q = q.gte('dormitorios', filtros.dormitorios_min)
    if (filtros.precio_max) q = q.lte('precio', filtros.precio_max)
    if (filtros.precio_min) q = q.gte('precio', filtros.precio_min)
    if (filtros.moneda) q = q.eq('moneda', filtros.moneda)
    if (filtros.superficie_min) q = q.gte('superficie_m2', filtros.superficie_min)

    q = q.order('created_at', { ascending: false }).limit(50)

    const { data: propiedades } = await q
    let resultados = propiedades || []

    // Filtrar por tipo en título
    if (filtros.tipo) {
      const filtrados = resultados.filter(p => {
        const txt = (p.titulo || '').toLowerCase()
        return txt.includes(filtros.tipo)
      })
      if (filtrados.length > 0) resultados = filtrados
    }

    // Filtrar por keywords en descripción/título
    if (filtros.keywords && filtros.keywords.length > 0) {
      const filtrados = resultados.filter(p => {
        const txt = ((p.titulo || '') + ' ' + (p.descripcion || '')).toLowerCase()
        return filtros.keywords.some((kw: string) => txt.includes(kw.toLowerCase()))
      })
      if (filtrados.length > 0) resultados = filtrados
    }

    return NextResponse.json({ filtros, resultados })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}