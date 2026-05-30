// scripts/refetch-meli.js
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

async function subirImagenes(propId, urls) {
  const publicUrls = [];
  for (let i = 0; i < Math.min(urls.length, 10); i++) {
    try {
      const { buffer, contentType } = await downloadImage(urls[i]);
      if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('webp')) continue;
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const path = `${propId}/${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
        publicUrls.push(publicUrl);
        process.stdout.write('📸');
      }
    } catch (e) {
      process.stdout.write('⚠️');
    }
  }
  return publicUrls;
}

async function main() {
  console.log('🔄 Refetch MercadoLibre - títulos y fotos\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, url_origen, titulo')
    .eq('fuente', 'mercadolibre')
    .not('url_origen', 'is', null);

  console.log(`Total ML: ${propiedades.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  for (const prop of propiedades) {
    console.log(`\n[${prop.id}] ${prop.url_origen.slice(0, 60)}...`);
    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Título
      const titulo = await page.$eval(
        '.ui-pdp-title, h1.ui-pdp-title, h1',
        el => el.innerText.trim()
      ).catch(() => null);

      // Precio
      const precioText = await page.$eval(
        '.andes-money-amount__fraction',
        el => el.innerText.trim()
      ).catch(() => null);
      const monedaText = await page.$eval(
        '.andes-money-amount__currency-symbol',
        el => el.innerText.trim()
      ).catch(() => 'USD');

      // Dirección
      const direccion = await page.$eval(
        '.ui-pdp-media__title, .ui-vip-location__subtitle, [class*="location"] p',
        el => el.innerText.trim()
      ).catch(() => null);

      // Fotos
      const fotos = await page.$$eval(
        '.ui-pdp-gallery__figure img, figure.ui-pdp-gallery__figure img',
        els => [...new Set(els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(s => s && s.startsWith('http') && !s.includes('svg')))]
      ).catch(() => []);

      // Atributos
      const dormitorios = await page.$$eval(
        '.ui-pdp-features__item',
        els => {
          const d = els.find(e => e.innerText.match(/dormitorio|ambiente/i));
          return d ? parseInt(d.innerText.match(/\d+/)?.[0]) || null : null;
        }
      ).catch(() => null);

      const superficie = await page.$$eval(
        '.ui-pdp-features__item',
        els => {
          const s = els.find(e => e.innerText.match(/m²|m2/i));
          return s ? parseFloat(s.innerText.match(/[\d.]+/)?.[0]) || null : null;
        }
      ).catch(() => null);

      console.log(`  título: ${titulo?.slice(0, 50)}`);
      console.log(`  fotos: ${fotos.length}`);

      // Actualizar DB
      const updateData = {};
      if (titulo) updateData.titulo = titulo;
      if (direccion) updateData.direccion = direccion;
      if (precioText) updateData.precio = parseInt(precioText.replace(/\D/g, ''));
      if (monedaText) updateData.moneda = monedaText.includes('US') ? 'USD' : 'ARS';
      if (dormitorios) updateData.dormitorios = dormitorios;
      if (superficie) updateData.superficie_m2 = superficie;

      if (Object.keys(updateData).length > 0) {
        await supabase.from('propiedades').update(updateData).eq('id', prop.id);
      }

      // Subir fotos
      if (fotos.length > 0) {
        const publicUrls = await subirImagenes(prop.id, fotos);
        if (publicUrls.length > 0) {
          await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', prop.id);
          console.log(`\n  ✅ ${publicUrls.length} fotos subidas`);
        }
      }

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }

    await page.waitForTimeout(1500);
  }

  await browser.close();
  console.log('\n✅ Refetch ML completo.');
}

main();