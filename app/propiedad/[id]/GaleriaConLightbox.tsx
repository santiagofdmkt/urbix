'use client'
import { useEffect, useState } from 'react'

export default function GaleriaConLightbox({ imgs, titulo }: { imgs: string[], titulo: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight' && lightbox !== null) setLightbox(i => i! < imgs.length - 1 ? i! + 1 : 0)
      if (e.key === 'ArrowLeft' && lightbox !== null) setLightbox(i => i! > 0 ? i! - 1 : imgs.length - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, imgs.length])

  return (
    <>
      <div className="mb-6 rounded-2xl overflow-hidden bg-zinc-100 h-80 relative">
        {imgs.length > 0 ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-1 w-full h-full">
            <div className="col-span-2 row-span-2 overflow-hidden cursor-pointer" onClick={() => setLightbox(0)}>
              <img src={imgs[0]} alt={titulo} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
            </div>
            {[1,2,3,4].map(i => (
              <div key={i} className="overflow-hidden relative bg-zinc-200 cursor-pointer" onClick={() => imgs[i] && setLightbox(i)}>
                {imgs[i] && <img src={imgs[i]} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" />}
                {i === 3 && imgs.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span className="text-xs font-semibold">+{imgs.length - 4} fotos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-2">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span className="text-sm text-zinc-400">Sin imágenes disponibles</span>
          </div>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {imgs.map((img, i) => (
            <img key={i} src={img} alt="" onClick={() => setLightbox(i)}
              className="w-20 h-16 object-cover rounded-lg cursor-pointer shrink-0 border-2 border-transparent hover:border-rose-400 transition" />
          ))}
        </div>
      )}

      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl hover:text-rose-400" onClick={() => setLightbox(null)}>✕</button>
          <button className="absolute left-4 text-white text-4xl hover:text-rose-400 px-4"
            onClick={e => { e.stopPropagation(); setLightbox(i => i! > 0 ? i! - 1 : imgs.length - 1) }}>‹</button>
          <img src={imgs[lightbox]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button className="absolute right-4 text-white text-4xl hover:text-rose-400 px-4"
            onClick={e => { e.stopPropagation(); setLightbox(i => i! < imgs.length - 1 ? i! + 1 : 0) }}>›</button>
          <p className="absolute bottom-4 text-white/60 text-sm">{lightbox + 1} / {imgs.length}</p>
        </div>
      )}
    </>
  )
}