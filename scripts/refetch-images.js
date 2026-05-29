const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function downloadImage(url, referer) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, referer).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function subirImagenes(propId, urls, fuente) {
  const referer = fuente === 'zonaprop' ? 'https://www.zonaprop.com.ar/' : 'https://www.argenprop.com/';
  const publicUrls = [];
  for (let i = 0; i < Math.min(urls.length, 10); i++) {
    try {
      const { buffer, contentType } = await downloadImage(urls[i], referer);
      if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('webp')) {
  console.log(`  img ${i}: saltada (${contentType})`);
  continue;
}
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const path = `${propId}/${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
        publicUrls.push(publicUrl);
        process.stdout.write(`📸`);
      }
    } catch (e) {
      process.stdout.write(`⚠️`);
    }
  }
  console.log(` → ${publicUrls.length} subidas`);
  return publicUrls;
}

async function main() {
  console.log('🚀 Refetch de imágenes para propiedades existentes...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, url_origen, fuente, imagenes')
    .not('url_origen', 'is', null);

  console.log(`Total propiedades: ${propiedades.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  for (const prop of propiedades) {
    console.log(`[${prop.id}] ${prop.fuente} → ${prop.url_origen}`);

    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      let imageUrls = [];

      if (prop.fuente === 'zonaprop') {
        imageUrls = await page.$$eval(
          'img[data-qa="POSTING_GALLERY_IMAGE"], .gallery img, [class*="gallery"] img, .swiper-slide img',
          els => [...new Set(els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(s => s && s.startsWith('http')))]
        );
      } else {
        imageUrls = await page.$$eval(
          '.gallery img, .swiper-slide img, [class*="gallery"] img, [class*="photo"] img, .card__photos img',
          els => [...new Set(els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(s => s && s.startsWith('http')))]
        );
      }

      console.log(`  → ${imageUrls.length} imágenes encontradas`);

      if (imageUrls.length > 0) {
        const publicUrls = await subirImagenes(prop.id, imageUrls, prop.fuente);
        if (publicUrls.length > 0) {
          await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', prop.id);
          console.log(`  ✅ Actualizada con ${publicUrls.length} fotos\n`);
        }
      } else {
        console.log(`  ⏭ Sin imágenes nuevas\n`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`);
    }

    await page.waitForTimeout(1000);
  }

  await browser.close();
  console.log('✅ Refetch completado.');
}

main(); 