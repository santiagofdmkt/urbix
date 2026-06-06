// scripts/scraper-zonaprop.js
// Ciudades del interior bonaerense — ZonaProp
// URLs directas de imágenes sin Storage | Con inmobiliaria
// playwright-extra + stealth + protecciones anti-ban
// Selectores verificados manualmente en producción

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CIUDAD A SCRAPEAR — cambiá solo esta línea ───────────────────────────
const CIUDAD = { nombre: 'Chivilcoy', slug: 'chivilcoy-chivilcoy' };
// Opciones disponibles:
// { nombre: 'Chivilcoy',       slug: 'chivilcoy-chivilcoy' }
// { nombre: 'Mercedes',        slug: 'mercedes-mercedes' }
// { nombre: '25 de Mayo',      slug: '25-de-mayo-25-de-mayo' }
// { nombre: '9 de Julio',      slug: '9-de-julio-9-de-julio' }
// { nombre: 'Pehuajó',         slug: 'pehuajo-pehuajo' }
// { nombre: 'Trenque Lauquen', slug: 'trenque-lauquen-trenque-lauquen' }
// { nombre: 'Lobos',           slug: 'lobos-lobos' }

// URL base del listado — incluye todos los tipos de propiedad
const URL_BASE_VENTA    = `https://www.zonaprop.com.ar/inmuebles-venta-${CIUDAD.slug}.html`;
const URL_BASE_ALQUILER = `https://www.zonaprop.com.ar/inmuebles-alquiler-${CIUDAD.slug}.html`;

const OPERACIONES = [
  { tipo: 'venta',    urlBase: URL_BASE_VENTA },
  { tipo: 'alquiler', urlBase: URL_BASE_ALQUILER },
];

const MAX_PAGINAS = 10;

// ─── LÍMITE DE SEGURIDAD ──────────────────────────────────────────────────
const PAUSA_CADA     = 15;
const PAUSA_LARGA_MS = 30000;

// ─── USER AGENTS rotativos ────────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
];

function userAgentAleatorio() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── DELAYS ALEATORIOS ────────────────────────────────────────────────────
function delay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(r => setTimeout(r, ms));
}

// ─── SCROLL HUMANO ────────────────────────────────────────────────────────
async function scrollHumano(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalScroll = 0;
      const distanciaTotal = Math.floor(Math.random() * 600) + 400;
      const timer = setInterval(() => {
        const paso = Math.floor(Math.random() * 80) + 40;
        window.scrollBy(0, paso);
        totalScroll += paso;
        if (totalScroll >= distanciaTotal) { clearInterval(timer); resolve(); }
      }, Math.floor(Math.random() * 80) + 60);
    });
  });
  await delay(300, 800);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function limpiarPrecio(texto) {
  if (!texto) return null;
  const match = texto.match(/[\d.,]+/);
  if (!match) return null;
  return parseInt(match[0].replace(/[.,]/g, '')) || null;
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

// ─── PAGINACIÓN ───────────────────────────────────────────────────────────
function urlPagina(urlBase, pag) {
  if (pag === 1) return urlBase;
  return urlBase.replace('.html', `-pagina-${pag}.html`);
}

// ─── DETALLE DE FICHA ─────────────────────────────────────────────────────
async function obtenerDetalle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await delay(2000, 4000);
    await scrollHumano(page);

    const detalle = await page.evaluate(() => {
      // IMÁGENES — src directo, sin Storage
      const imgs = [...document.querySelectorAll('img[class*="imageGrid-module__imgProperty"]')];
      const imagenes = [...new Set(
        imgs
          .map(el => el.getAttribute('src') || el.getAttribute('data-src'))
          .filter(u => u && u.startsWith('http') && !u.includes('placeholder'))
      )];

      // DESCRIPCIÓN
      const descEl = document.querySelector('[class*="wrapper-description"]');
      const descripcion = descEl?.innerText?.trim()?.slice(0, 1000) || null;

      // CARACTERÍSTICAS
      const featItems = [...document.querySelectorAll('#section-icon-features-property li.icon-feature')];
      let dormitorios = null, banos = null, superficie_m2 = null;
      for (const item of featItems) {
        const txt   = item.innerText?.trim() || '';
        const icono = item.querySelector('i')?.className || '';
        if ((icono.includes('dorm') || txt.match(/dorm/i)) && !dormitorios) {
          const n = txt.match(/\d+/); if (n) dormitorios = parseInt(n[0]);
        }
        if ((icono.includes('ban') || txt.match(/ba[ñn]/i)) && !banos) {
          const n = txt.match(/\d+/); if (n) banos = parseInt(n[0]);
        }
        if ((icono.includes('stotal') || icono.includes('scubierta') || txt.match(/m²|m2/i)) && !superficie_m2) {
          const n = txt.match(/(\d+(?:[.,]\d+)?)/); if (n) superficie_m2 = parseFloat(n[1].replace(',', '.'));
        }
      }

      // INMOBILIARIA
      const inmobEl = document.querySelector('a[data-qa="linkMicrositioAnuncianteLeads"]');
      const inmobiliaria = inmobEl?.innerText?.trim() || null;

      return { imagenes, descripcion, dormitorios, banos, superficie_m2, inmobiliaria };
    });

    return detalle;
  } catch (e) {
    console.log(`  ⚠️ Error detalle: ${e.message}`);
    return { imagenes: [], descripcion: null, dormitorios: null, banos: null, superficie_m2: null, inmobiliaria: null };
  }
}

// ─── GUARDAR ──────────────────────────────────────────────────────────────────
async function guardarPropiedad(prop, page, operacion) {
  if (!prop.url_origen) return;

  const existe = await yaExiste(prop.url_origen);
  if (existe) { process.stdout.write('⏭ '); return; }

  const detalle = await obtenerDetalle(page, prop.url_origen);

  const { error } = await supabase.from('propiedades').insert([{
    titulo:        prop.titulo,
    descripcion:   detalle.descripcion   || null,
    precio:        prop.precio,
    moneda:        prop.moneda,
    direccion:     prop.direccion,
    barrio:        null,
    dormitorios:   detalle.dormitorios   || prop.dormitorios,
    banos:         detalle.banos         || prop.banos,
    superficie_m2: detalle.superficie_m2 || prop.superficie_m2,
    imagenes:      detalle.imagenes.length > 0 ? JSON.stringify(detalle.imagenes) : null,
    inmobiliaria:  detalle.inmobiliaria  || null,
    contacto:      null,
    activo:        true,
    ciudad:        CIUDAD.nombre,
    fuente:        'zonaprop',
    url_origen:    prop.url_origen,
    operacion,
  }]);

  if (error) { console.error(`\n❌ ${error.message}`); return; }

  console.log(`  ✅ [${CIUDAD.nombre}/${operacion}] ${prop.titulo?.slice(0, 50)} | ${detalle.inmobiliaria || 'sin inmob.'}`);
}

// ─── LISTING ──────────────────────────────────────────────────────────────────
async function scrapearListado(page, operacion, urlBase) {
  const propiedades = [];

  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    const url = urlPagina(urlBase, pag);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await delay(2500, 5000);
      await scrollHumano(page);

      const cantCards = await page.evaluate(() =>
        document.querySelectorAll('[class*="postingsList-module__card-container"]').length
      );

      if (cantCards === 0) { console.log(`  ⚠️ Sin resultados en pág ${pag}.`); break; }

      const items = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[class*="postingsList-module__card-container"]')];

        return cards.map(card => {
          // Precio
          const precioTexto = card.querySelector('h2[data-qa="POSTING_CARD_PRICE"]')?.innerText?.trim() || null;

          // Dirección
          const direccion = card.querySelector('h4[class*="postingLocations-module__location-address"]')?.innerText?.trim() || null;

          // Link
          const linkEl  = card.querySelector('a[href*="/propiedades/"]');
          const href     = linkEl?.getAttribute('href') || null;

          // Título — descripción corta visible en card
          const titulo = card.querySelector('[class*="postingCard-module__posting-description"]')?.innerText?.trim()
            || direccion
            || 'Propiedad';

          // Features
          const featSpans  = [...card.querySelectorAll('span[class*="postingMainFeatures-module__posting-main-features-span"]')];
          const featsText  = featSpans.map(f => f.innerText?.trim()).filter(Boolean);
          const dormitoriosText = featsText.find(f => f.match(/dorm/i))   || null;
          const banosText       = featsText.find(f => f.match(/ba[ñn]/i)) || null;
          const superficieText  = featsText.find(f => f.match(/m²|m2/i))  || null;

          return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href };
        }).filter(i => i.href);
      });

      if (items.length === 0) break;

      console.log(`  📄 ${CIUDAD.nombre}/${operacion} pág ${pag}: ${items.length} props`);

      for (const item of items) {
        propiedades.push({
          titulo:        item.titulo,
          precio:        limpiarPrecio(item.precioTexto),
          moneda:        item.precioTexto?.includes('USD') ? 'USD' : 'ARS',
          direccion:     item.direccion,
          dormitorios:   limpiarInt(item.dormitoriosText),
          banos:         limpiarInt(item.banosText),
          superficie_m2: limpiarSuperficie(item.superficieText),
          url_origen:    item.href?.startsWith('http') ? item.href : `https://www.zonaprop.com.ar${item.href}`,
        });
      }

      await delay(3000, 6000);

    } catch (e) {
      console.log(`  ⚠️ Error pág ${pag}: ${e.message}`);
      await delay(15000, 20000);
      break;
    }
  }

  return propiedades;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Scraper ZonaProp — ${CIUDAD.nombre}`);
  console.log(`⚠️  Modo cuidadoso: delays aleatorios + scroll humano + pausas cada ${PAUSA_CADA} props\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: userAgentAleatorio(),
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let contadorTotal = 0;

  try {
    for (const { tipo, urlBase } of OPERACIONES) {
      console.log(`\n📍 ${CIUDAD.nombre} — ${tipo.toUpperCase()}`);
      const propiedades = await scrapearListado(page, tipo, urlBase);
      console.log(`  Total encontradas: ${propiedades.length}`);

      for (const prop of propiedades) {
        await guardarPropiedad(prop, page, tipo);
        contadorTotal++;

        await delay(2000, 4500);

        if (contadorTotal % PAUSA_CADA === 0) {
          console.log(`\n  ⏸  ${contadorTotal} props procesadas — pausa de ${PAUSA_LARGA_MS / 1000}s...`);
          await delay(PAUSA_LARGA_MS, PAUSA_LARGA_MS + 5000);
          console.log(`  ▶️  Reanudando...\n`);
        }
      }

      console.log(`\n  ⏳ Pausa entre operaciones...`);
      await delay(8000, 12000);
    }

    console.log(`\n✅ Completado — ${CIUDAD.nombre} | ${contadorTotal} propiedades procesadas`);
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await browser.close();
  }
}

main();
