const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const http = require('http')

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk'
const BUCKET = 'propiedades-imagenes'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': url.includes('zonaprop') ? 'https://www.zonaprop.com.ar/' : 'https://www.argenprop.com/'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function migrateImages() {
  const { data: propiedades, error } = await supabase.from('propiedades').select('id, imagenes')
  if (error) { console.error('Error:', error); return }

  console.log(`Procesando ${propiedades.length} propiedades...`)

  for (const prop of propiedades) {
    const imgs = Array.isArray(prop.imagenes) 
  ? prop.imagenes 
  : (prop.imagenes ? [prop.imagenes] : [])
    if (imgs.length === 0) continue

    const alreadyMigrated = imgs[0].includes('supabase.co')
    if (alreadyMigrated) { console.log(`[${prop.id}] Ya migrada, skip`); continue }

    console.log(`[${prop.id}] Migrando ${imgs.length} imágenes...`)
    const newUrls = []

    for (let i = 0; i < imgs.length; i++) {
      try {
        const { buffer, contentType } = await downloadImage(imgs[i])
        const ext = contentType.includes('png') ? 'png' : 'jpg'
        const path = `${prop.id}/${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType, upsert: true })

        if (uploadError) { console.log(`  img ${i}: error upload`, uploadError.message); continue }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
        newUrls.push(publicUrl)
        console.log(`  img ${i}: OK`)
      } catch (e) {
        console.log(`  img ${i}: error descarga`, e.message)
      }
    }

    if (newUrls.length > 0) {
      await supabase.from('propiedades').update({ imagenes: newUrls }).eq('id', prop.id)
      console.log(`[${prop.id}] Actualizada con ${newUrls.length} URLs de Supabase`)
    }
  }

  console.log('Migración completa!')
}

migrateImages()