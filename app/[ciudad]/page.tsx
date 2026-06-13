import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LocalidadClient } from '@/app/PropiedadesComponents'

const CIUDADES = ['Chivilcoy', 'Mercedes', '25 de Mayo', '9 de Julio', 'Pehuajó', 'Trenque Lauquen', 'Lobos']

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default async function CiudadPage({ params }: { params: Promise<{ ciudad: string }> }) {
  const { ciudad } = await params
  const slug = norm(decodeURIComponent(ciudad))

  const ciudadNombre = CIUDADES.find(c => norm(c) === slug)
  if (!ciudadNombre) return notFound()

  const { data } = await supabase
    .from('propiedades')
    .select('id')
    .eq('activo', true)
    .eq('ciudad', ciudadNombre)
    .limit(1)

  if (!data || data.length === 0) return notFound()

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <LocalidadClient ciudadNombre={ciudadNombre} />
    </Suspense>
  )
}