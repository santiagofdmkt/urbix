// scripts/scraper-meli.js
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

async function yaExiste(url) {
  const { data } = await supabase.from('propiedades').select('id').eq('url_origen', url).limit(1);
  return data && data.length > 0;
}

async function subirImagenes(propId, urls) {
  const publicUrls = [];
  for (let i = 0; i < Math.min(urls.length, 10); i++) {
    try {
      const { buffer, contentType } = await downloadImage(urls[i]);
      if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('webp')) {
        continue;
      }
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
  console.log(` → ${publicUrls.length} subidas`);
  return publicUrls;
}

async function main() {
  console.log('🚀 Scraper MercadoLibre Inmuebles - Chivilcoy\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  let totalGuardadas = 0;
  let paginaActual = 1;
  const maxPaginas = 5;

  while (paginaActual <= maxPaginas) {
    const offset = (paginaActual - 1) * 48 + 1;
    const url = paginaActual === 1
      ? 'https://inmuebles.mercadolibre.com.ar/venta/buenos-aires-interior/chivilcoy/'
      : `https://inmuebles.mercadolibre.com.ar/venta/buenos-aires-interior/chivilcoy/_Desde_${offset}`;

    console.log(`\n📄 Página ${paginaActual}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const items = await page.$$eval('.ui-search-result__wrapper', cards =>
      cards.map(card => {
        const titulo = card.querySelector('.ui-search-item__title')?.innerText?.trim() || null;
        const precio = card.querySelector('.andes-money-amount__fraction')?.innerText?.trim() || null;
        const moneda = card.querySelector('.andes-money-amount__currency-symbol')?.innerText?.trim() || 'USD';
        const direccion = card.querySelector('.ui-search-item__location')?.innerText?.trim() || null;
        const href = card.querySelector('a')?.getAttribute('href') || null;
        const imagen = card.querySelector('img')?.getAttribute('src') || card.querySelector('img')?.getAttribute('data-src') || null;
        const attrs = [...card.querySelectorAll('.ui-search-card-attributes__attribute')].map(a => a.innerText.trim());
        return { titulo, precio, moneda, direccion, href, imagen, attrs };
      })
    );

    if (items.length === 0) { console.log('Sin resultados, terminando.'); break; }
    console.log(`  → ${items.length} propiedades en esta página`);

    for (const item of items) {
      if (!item.href) continue;
      const urlOrigen = item.href.split('?')[0]; // limpiar query params

      const existe = await yaExiste(urlOrigen);
      if (existe) { process.stdout.write('⏭'); continue; }

      console.log(`\n  [nuevo] ${item.titulo?.slice(0, 60)}`);

      // Entrar al detalle para obtener todas las fotos
      let fotos = item.imagen ? [item.imagen] : [];
      let dormitorios = null;
      let banos = null;
      let superficie = null;

      try {
        await page.goto(urlOrigen, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        // Fotos de la galería
        const fotosDetalle = await page.$$eval(
          '.ui-pdp-gallery__figure img, .ui-pdp-image img, figure img',
          els => [...new Set(els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(s => s && s.startsWith('http') && !s.includes('svg')))]
        );
        if (fotosDetalle.length > 0) fotos = fotosDetalle;

        // Atributos
        const attrsDetalle = await page.$$eval(
          '.ui-pdp-features__item, .andes-table__column--left',
          els => els.map(el => el.innerText.trim())
        );
        const dormText = attrsDetalle.find(a => a.match(/dormitorio|ambiente/i));
        const banoText = attrsDetalle.find(a => a.match(/baño/i));
        const supText = attrsDetalle.find(a => a.match(/m²|m2/i));
        dormitorios = dormText ? parseInt(dormText.match(/\d+/)?.[0]) || null : null;
        banos = banoText ? parseInt(banoText.match(/\d+/)?.[0]) || null : null;
        superficie = supText ? parseFloat(supText.match(/[\d.]+/)?.[0]) || null : null;

        console.log(`    → ${fotos.length} fotos encontradas`);

        // Volver al listado
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

      } catch (e) {
        console.log(`    ⚠️ Error en detalle: ${e.message}`);
      }

      // Parsear precio
      const precioNum = item.precio ? parseInt(item.precio.replace(/\D/g, '')) : null;
      const moneda = item.moneda === 'US$' || item.moneda === '$' ? (item.moneda === 'US$' ? 'USD' : 'ARS') : 'USD';

      // Insertar en DB
      const { data, error } = await supabase.from('propiedades').insert([{
        titulo: item.titulo,
        descripcion: null,
        precio: precioNum,
        moneda,
        direccion: item.direccion,
        barrio: null,
        dormitorios,
        banos,
        superficie_m2: superficie,
        imagenes: null,
        inmobiliaria: null,
        contacto: null,
        activo: true,
        ciudad: 'Chivilcoy',
        fuente: 'mercadolibre',
        url_origen: urlOrigen,
      }]).select('id').single();

      if (error) { console.log(`    ❌ Error DB: ${error.message}`); continue; }

      const propId = data.id;

      if (fotos.length > 0) {
        const publicUrls = await subirImagenes(propId, fotos);
        if (publicUrls.length > 0) {
          await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', propId);
          totalGuardadas++;
        }
      }
    }

    paginaActual++;
    await page.waitForTimeout(2000);
  }

  await browser.close();
  console.log(`\n✅ Listo. ${totalGuardadas} propiedades nuevas guardadas.`);
}

main();