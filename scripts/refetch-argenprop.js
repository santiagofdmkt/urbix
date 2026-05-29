const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.argenprop.com/'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('🚀 Refetch Argenprop...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, url_origen, fuente, imagenes')
    .eq('fuente', 'argenprop')
    .not('url_origen', 'is', null);

  console.log(`Total Argenprop: ${propiedades.length}\n`);

  const browser = await chromium.launch({ headless: false }); // visible para debug
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  for (const prop of propiedades) {
    console.log(`\n[${prop.id}] → ${prop.url_origen}`);
    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Intentar múltiples selectores de Argenprop
      const imageUrls = await page.$$eval(
        'img',
        els => [...new Set(
          els
            .map(el => el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy'))
            .filter(s => s && s.startsWith('http') && !s.includes('svg') && (s.includes('.jpg') || s.includes('.jpeg') || s.includes('.png') || s.includes('.webp')))
        )]
      );

      console.log(`  → ${imageUrls.length} imágenes encontradas`);
      if (imageUrls.length === 0) { console.log('  ⏭ Sin imágenes'); continue; }

      const publicUrls = [];
      for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
        try {
          const { buffer, contentType } = await downloadImage(imageUrls[i]);
          if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('webp')) {
            console.log(`  img ${i}: saltada (${contentType})`);
            continue;
          }
          const ext = contentType.includes('png') ? 'png' : 'jpg';
          const path = `${prop.id}/${i}.${ext}`;
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

      if (publicUrls.length > 0) {
        await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', prop.id);
        console.log(`\n  ✅ Actualizada con ${publicUrls.length} fotos`);
      }

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }

    await page.waitForTimeout(2000);
  }

  await browser.close();
  console.log('\n✅ Listo.');
}

main();