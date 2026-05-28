// scripts/scraper.js
// Scraper de Argenprop y ZonaProp para Chivilcoy → Supabase
// Correr con: node scripts/scraper.js

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── UTILIDADES ────────────────────────────────────────────────────────────────

function limpiarPrecio(texto) {
  if (!texto) return null;
  const num = texto.replace(/[^0-9]/g, '');
  return num ? parseInt(num) : null;
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
  const { data } = await supabase
    .from('propiedades')
    .select('id')
    .eq('url_origen', url)
    .limit(1);
  return data && data.length > 0;
}

async function guardarPropiedad(prop) {
  const existe = await yaExiste(prop.url_origen);
  if (existe) {
    console.log(`  ⏭ Ya existe: ${prop.url_origen}`);
    return;
  }
  const { error } = await supabase.from('propiedades').insert([prop]);
  if (error) {
    console.error(`  ❌ Error guardando: ${error.message}`);
  } else {
    console.log(`  ✅ Guardada: ${prop.titulo}`);
  }
}

// ─── SCRAPER ARGENPROP ─────────────────────────────────────────────────────────

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

    if (items.length === 0) {
      console.log(`  Sin resultados en página ${paginaActual}, terminando.`);
      break;
    }

    for (const item of items) {
      const moneda = item.precio?.includes('USD') ? 'USD' : 'ARS';
      propiedades.push({
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio: limpiarPrecio(item.precio),
        moneda,
        direccion: item.direccion,
        barrio: null,
        dormitorios: limpiarInt(item.dormitoriosText),
        banos: limpiarInt(item.banosText),
        superficie_m2: limpiarSuperficie(item.superficieText),
        imagenes: item.imagen,
        inmobiliaria: null,
        contacto: null,
        activo: true,
        ciudad: 'Chivilcoy',
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

// ─── SCRAPER ZONAPROP ──────────────────────────────────────────────────────────

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

    if (items.length === 0) {
      console.log(`  Sin resultados en página ${paginaActual}, terminando.`);
      break;
    }

    for (const item of items) {
      const moneda = item.precio?.includes('USD') ? 'USD' : 'ARS';
      propiedades.push({
        titulo: item.titulo,
        descripcion: null,
        precio: limpiarPrecio(item.precio),
        moneda,
        direccion: item.direccion,
        barrio: null,
        dormitorios: limpiarInt(item.dormitoriosText),
        banos: limpiarInt(item.banosText),
        superficie_m2: limpiarSuperficie(item.superficieText),
        imagenes: item.imagen,
        inmobiliaria: null,
        contacto: null,
        activo: true,
        ciudad: 'Chivilcoy',
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

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando scraper Urbix...');
  console.log(`📅 ${new Date().toLocaleString('es-AR')}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  let totalGuardadas = 0;

  try {
    // Argenprop
    const propsArgenprop = await scrapearArgenprop(page);
    console.log(`\n💾 Guardando ${propsArgenprop.length} propiedades de Argenprop...`);
    for (const prop of propsArgenprop) {
      await guardarPropiedad(prop);
      totalGuardadas++;
    }

    // ZonaProp
    const propsZonaprop = await scrapearZonaprop(page);
    console.log(`\n💾 Guardando ${propsZonaprop.length} propiedades de ZonaProp...`);
    for (const prop of propsZonaprop) {
      await guardarPropiedad(prop);
      totalGuardadas++;
    }

  } catch (err) {
    console.error('❌ Error en el scraper:', err.message);
  } finally {
    await browser.close();
    console.log(`\n✅ Scraper finalizado. Total procesadas: ${totalGuardadas}`);
  }
}

main();