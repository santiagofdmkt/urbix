import { Suspense } from 'react'
import { PropiedadesClient } from '@/app/PropiedadesComponents'

export default function PropiedadesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <PropiedadesClient />
    </Suspense>
  )
}