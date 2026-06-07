import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LocalidadClient from './LocalidadClient'

export default async function LocalidadPage({ params }: { params: Promise<{ ciudad: string }> }) {
  const { ciudad } = await params
  const ciudadNombre = decodeURIComponent(ciudad)

  const { data } = await supabase
    .from('propiedades')
    .select('id')
    .eq('activo', true)
    .eq('ciudad', ciudadNombre)
    .limit(1)

  if (!data || data.length === 0) return notFound()

  return <LocalidadClient ciudadNombre={ciudadNombre} />
}