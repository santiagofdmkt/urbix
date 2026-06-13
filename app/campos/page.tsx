import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const CamposClient = dynamic(() => import('./CamposClient'))

export const metadata = {
  title: 'Campos del interior | Urbix',
  description: 'Campos, chacras y quintas en el interior bonaerense. Superficie, ubicación y contacto directo.',
}

export default function CamposPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><p className="text-zinc-400">Cargando campos...</p></div>}>
      <CamposClient />
    </Suspense>
  )
}