// scripts/scraper.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function limpiarPrecio(texto) {
  if (!texto) return null;
  // Toma solo el primer bloque numérico (ej: "USD 115.000 | $ 342.000" → 115000)
  const match = texto.match(/[\d.]+/);
  if (!match) return null;
  const num = match[0].replace(/\./g, '');
  return parseInt(num) || null;
}

function limpiarSuperficie(texto) {
  if (!texto) return null;
  const match = texto.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}

function limpiarInt(texto) {
  if (!texto) return null;
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

async function yaExiste(url) {
  const { data } = await supabase.from('propiedades').select('id').eq('url_origen', url).limit(1);
  return data && data.length > 0;
}

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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function subirImagenes(propId, urls, fuente) {
  const referer = fuente === 'zonaprop' ? 'https://www.zonaprop.com.ar/' : 'https://www.argenprop.com/';
  const publicUrls = [];
  for (let i = 0; i < Math.min(urls.length, 8); i++) {
    try {
      const { buffer, contentType } = await downloadImage(urls[i], referer);
      if (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('webp')) {
        console.log(`    img ${i}: saltada (${contentType})`);
        continue;
      }
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const path = `${propId}/${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
        publicUrls.push(publicUrl);
        console.log(`    📸 img ${i}: OK`);
      }
    } catch (e) {
      console.log(`    ⚠️ img ${i}: ${e.message}`);
    }
  }
  return publicUrls;
}

async function guardarPropiedad(prop, page) {
  const existe = await yaExiste(prop.url_origen);
  if (existe) { console.log(`  ⏭ Ya existe: ${prop.url_origen}`); return; }

  let imagenesUrls = prop.imagenesRaw ? [prop.imagenesRaw] : [];
  try {
    console.log(`  🔎 Entrando a detalle: ${prop.url_origen}`);
    await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    if (prop.fuente === 'zonaprop') {
      const imgs = await page.$$eval('img[data-qa="POSTING_GALLERY_IMAGE"]', els =>
        els.map(el => el.getAttribute('src')).filter(Boolean)
      );
      if (imgs.length > 0) imagenesUrls = imgs;
      else {
        const imgs2 = await page.$$eval('.gallery-image img, .postingGallery img', els =>
          els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(Boolean)
        );
        if (imgs2.length > 0) imagenesUrls = imgs2;
      }
    } else {
      const imgs = await page.$$eval('.gallery img, .swiper-slide img, [class*="gallery"] img', els =>
        els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(Boolean)
      );
      if (imgs.length > 0) imagenesUrls = imgs;
    }
    console.log(`    → ${imagenesUrls.length} imágenes encontradas`);
  } catch (e) {
    console.log(`    ⚠️ No se pudo entrar al detalle: ${e.message}`);
  }

  const { data, error } = await supabase.from('propiedades').insert([{
    titulo: prop.titulo,
    descripcion: prop.descripcion,
    precio: prop.precio,
    moneda: prop.moneda,
    direccion: prop.direccion,
    barrio: prop.barrio,
    dormitorios: prop.dormitorios,
    banos: prop.banos,
    superficie_m2: prop.superficie_m2,
    imagenes: null,
    inmobiliaria: prop.inmobiliaria,
    contacto: prop.contacto,
    activo: true,
    ciudad: 'Chivilcoy',
    fuente: prop.fuente,
    url_origen: prop.url_origen,
  }]).select('id').single();

  if (error) { console.error(`  ❌ Error: ${error.message}`); return; }

  const propId = data.id;

  if (imagenesUrls.length > 0) {
    const publicUrls = await subirImagenes(propId, imagenesUrls, prop.fuente);
    if (publicUrls.length > 0) {
      await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', propId);
      console.log(`  ✅ Guardada con ${publicUrls.length} imágenes: ${prop.titulo}`);
    }
  } else {
    console.log(`  ✅ Guardada sin imágenes: ${prop.titulo}`);
  }
}

async function scrapearArgenprop(page) {
  console.log('\n🔍 Scrapeando Argenprop...');
  const propiedades = [];
  let paginaActual = 1;
  const maxPaginas = 5;

  while (paginaActual <= maxPaginas) {
    const url = paginaActual === 1
      ? 'https://www.argenprop.com/inmuebles/venta/partido-de-chivilcoy'
      : `https://www.argenprop.com/inmuebles/venta/partido-de-chivilcoy-pagina-${paginaActual}`;

    console.log(`  Página ${paginaActual}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval('.listing__item', (cards) =>
      cards.map((card) => {
        const titulo = card.querySelector('.card__title')?.innerText?.trim() || null;
        const precio = card.querySelector('.card__price')?.innerText?.trim() || null;
        const direccion = card.querySelector('.card__address')?.innerText?.trim() || null;
        const descripcion = card.querySelector('.card__description')?.innerText?.trim() || null;
        const href = card.querySelector('a.card')?.getAttribute('href') || null;
        const imagen = card.querySelector('img')?.getAttribute('src') || null;
        const feats = [...card.querySelectorAll('.card__common-data span')].map(s => s.innerText.trim());
        const dormitoriosText = feats.find(f => f.match(/dorm|amb/i)) || null;
        const banosText = feats.find(f => f.match(/ba[ñn]/i)) || null;
        const superficieText = feats.find(f => f.match(/m²|m2/i)) || null;
        return { titulo, precio, direccion, descripcion, href, imagen, dormitoriosText, banosText, superficieText };
      })
    );

    if (items.length === 0) { console.log(`  Sin resultados, terminando.`); break; }

    for (const item of items) {
      propiedades.push({
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio: limpiarPrecio(item.precio),
        moneda: item.precio?.includes('USD') ? 'USD' : 'ARS',
        direccion: item.direccion,
        barrio: null,
        dormitorios: limpiarInt(item.dormitoriosText),
        banos: limpiarInt(item.banosText),
        superficie_m2: limpiarSuperficie(item.superficieText),
        imagenesRaw: item.imagen,
        inmobiliaria: null,
        contacto: null,
        fuente: 'argenprop',
        url_origen: item.href ? `https://www.argenprop.com${item.href}` : null,
      });
    }
    console.log(`  → ${items.length} propiedades encontradas`);
    paginaActual++;
    await page.waitForTimeout(1500);
  }
  return propiedades;
}

async function scrapearZonaprop(page) {
  console.log('\n🔍 Scrapeando ZonaProp...');
  const propiedades = [];
  let paginaActual = 1;
  const maxPaginas = 5;

  while (paginaActual <= maxPaginas) {
    const url = paginaActual === 1
      ? 'https://www.zonaprop.com.ar/inmuebles-venta-chivilcoy.html'
      : `https://www.zonaprop.com.ar/inmuebles-venta-chivilcoy-pagina-${paginaActual}.html`;

    console.log(`  Página ${paginaActual}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval('[data-qa="posting PROPERTY"]', (cards) =>
      cards.map((card) => {
        const titulo = card.querySelector('[data-qa="POSTING_CARD_DESCRIPTION"]')?.innerText?.trim() || null;
        const precio = card.querySelector('[data-qa="POSTING_CARD_PRICE"]')?.innerText?.trim() || null;
        const direccion = card.querySelector('[data-qa="POSTING_CARD_LOCATION"]')?.innerText?.trim() || null;
        const href = card.querySelector('a')?.getAttribute('href') || null;
        const imagen = card.querySelector('img')?.getAttribute('src') || null;
        const features = [...card.querySelectorAll('[data-qa="POSTING_CARD_FEATURES"] span')].map(s => s.innerText.trim());
        const dormitoriosText = features.find(f => f.match(/dorm|amb/i)) || null;
        const banosText = features.find(f => f.match(/ba[ñn]/i)) || null;
        const superficieText = features.find(f => f.match(/m²|m2/i)) || null;
        return { titulo, precio, direccion, href, imagen, dormitoriosText, banosText, superficieText };
      })
    );

    if (items.length === 0) { console.log(`  Sin resultados, terminando.`); break; }

    for (const item of items) {
      propiedades.push({
        titulo: item.titulo,
        descripcion: null,
        precio: limpiarPrecio(item.precio),
        moneda: item.precio?.includes('USD') ? 'USD' : 'ARS',
        direccion: item.direccion,
        barrio: null,
        dormitorios: limpiarInt(item.dormitoriosText),
        banos: limpiarInt(item.banosText),
        superficie_m2: limpiarSuperficie(item.superficieText),
        imagenesRaw: item.imagen,
        inmobiliaria: null,
        contacto: null,
        fuente: 'zonaprop',
        url_origen: item.href ? `https://www.zonaprop.com.ar${item.href}` : null,
      });
    }
    console.log(`  → ${items.length} propiedades encontradas`);
    paginaActual++;
    await page.waitForTimeout(1500);
  }
  return propiedades;
}

async function main() {
  console.log('🚀 Iniciando scraper Urbix con imágenes múltiples...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

try {
    const propArgenprop = await scrapearArgenprop(page);
    const propZonaprop = await scrapearZonaprop(page);
    const todasLasPropiedades = [...propArgenprop, ...propZonaprop];

    console.log(`\n📦 Total a procesar: ${todasLasPropiedades.length} propiedades`);

    for (const prop of todasLasPropiedades) {
      if (!prop.url_origen) { console.log('  ⏭ Sin URL, saltada.'); continue; }
      await guardarPropiedad(prop, page);
      await page.waitForTimeout(1000);
    }

    console.log('\n✅ Scraping finalizado.');
  } catch (e) {
    console.error('❌ Error general:', e.message);
  } finally {
    await browser.close();
  }
}

main();