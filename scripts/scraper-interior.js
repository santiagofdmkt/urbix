// scripts/scraper-interior.js
// Ciudades del interior bonaerense — ArgenProp
// URLs directas sin subir al Storage | Con inmobiliaria
// playwright-extra + stealth

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CIUDAD A SCRAPEAR — cambiá solo esta línea ───────────────────────────
const CIUDAD = { nombre: 'Chivilcoy', slug: 'partido-de-chivilcoy' };
// Opciones disponibles:
// { nombre: 'Chivilcoy',       slug: 'partido-de-chivilcoy' }
// { nombre: 'Mercedes',        slug: 'partido-de-mercedes' }
// { nombre: '25 de Mayo',      slug: 'partido-de-25-de-mayo' }
// { nombre: '9 de Julio',      slug: 'partido-de-9-de-julio' }
// { nombre: 'Pehuajó',         slug: 'partido-de-pehuajo' }
// { nombre: 'Trenque Lauquen', slug: 'partido-de-trenque-lauquen' }
// { nombre: 'Lobos',           slug: 'partido-de-lobos' }

const OPERACIONES = ['venta', 'alquiler'];
const MAX_PAGINAS = 10;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function limpiarPrecio(texto) {
  if (!texto) return null;
  const match = texto.match(/[\d.]+/);
  if (!match) return null;
  return parseInt(match[0].replace(/\./g, '')) || null;
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

// ─── DETALLE ──────────────────────────────────────────────────────────────────
async function obtenerDetalle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const detalle = await page.evaluate(() => {
      // IMÁGENES — URLs directas de ArgenProp, sin subir al Storage
      const imgSelectors = [
        '.gallery__photo img',
        '.gallery img',
        '[class*="gallery"] img',
        '.slider img',
        '[class*="slider"] img',
        '[class*="photo"] img',
        'img[data-src]',
      ];
      let imagenes = [];
      for (const sel of imgSelectors) {
        const imgs = [...document.querySelectorAll(sel)];
        const urls = imgs
          .map(el => el.getAttribute('data-src') || el.getAttribute('data-lazy') || el.getAttribute('src'))
          .filter(u => u && !u.includes('svg') && !u.includes('placeholder') && !u.includes('data:') && u.startsWith('http'));
        if (urls.length > 0) {
          // Normalizar a _u_large
          imagenes = [...new Set(urls)].map(u => u
            .replace(/_u_small\.jpg/, '_u_large.jpg')
            .replace(/_u_medium\.jpg/, '_u_large.jpg')
            .replace(/_u_thumbnail\.jpg/, '_u_large.jpg')
          );
          break;
        }
      }

      // DESCRIPCIÓN
      const descSelectors = [
        '.section-description--content',
        '[class*="section-description--content"]',
        '.description__text',
        '[class*="description__text"]',
      ];
      let descripcion = null;
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) {
          const lineas = el.innerText.split('\n').map(l => l.trim()).filter(Boolean);
          const filtradas = lineas.filter(l => {
            if (l.match(/^\d+\s*(m²|m2|años?|dormitorio|baño|ambiente|cochera)/i)) return false;
            if (l.match(/^(casa|quinta|departamento|terreno|local|oficina|campo|galpón)$/i)) return false;
            if (l.match(/^(muy bueno|bueno|excelente|a estrenar|reciclado)$/i)) return false;
            if (l.match(/^(descripción|descripcion|características principales)$/i)) return false;
            return true;
          });
          if (filtradas.length > 0) { descripcion = filtradas.join(' ').trim(); break; }
        }
      }

      // FEATURES
      const featureSelectors = [
        '.property-main-features li',
        '.property-details li',
        '.section-icon-features li',
        '[class*="features"] li',
        '[class*="Features"] li',
        '[class*="specs"] li',
      ];
      let dormitorios = null, banos = null, superficie_m2 = null, superficieTerr = null;
      for (const sel of featureSelectors) {
        const items = [...document.querySelectorAll(sel)];
        if (items.length === 0) continue;
        for (const item of items) {
          const txt = item.innerText || '';
          if (txt.match(/dorm/i) && !dormitorios) { const n = txt.match(/\d+/); if (n) dormitorios = parseInt(n[0]); }
          if (txt.match(/ba[ñn]/i) && !banos) { const n = txt.match(/\d+/); if (n) banos = parseInt(n[0]); }
          if (txt.match(/cubierta/i) && !superficie_m2) { const n = txt.match(/(\d+(?:[.,]\d+)?)/); if (n) superficie_m2 = parseFloat(n[1].replace(',', '.')); }
          if (txt.match(/terreno|total/i) && !superficieTerr) { const n = txt.match(/(\d+(?:[.,]\d+)?)/); if (n) superficieTerr = parseFloat(n[1].replace(',', '.')); }
        }
        if (dormitorios || banos || superficie_m2) break;
      }
      if (!superficie_m2 && superficieTerr) superficie_m2 = superficieTerr;

      // INMOBILIARIA
      const inmobiliaria = document.querySelector('#avisos-anunciante-sup')?.innerText?.trim() || null;

      return { imagenes, descripcion, dormitorios, banos, superficie_m2, inmobiliaria };
    });

    return detalle;
  } catch (e) {
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
    titulo: prop.titulo,
    descripcion: detalle.descripcion || null,
    precio: prop.precio,
    moneda: prop.moneda,
    direccion: prop.direccion,
    barrio: null,
    dormitorios: detalle.dormitorios || prop.dormitorios,
    banos: detalle.banos || prop.banos,
    superficie_m2: detalle.superficie_m2 || prop.superficie_m2,
    imagenes: detalle.imagenes.length > 0 ? JSON.stringify(detalle.imagenes) : null,
    inmobiliaria: detalle.inmobiliaria || null,
    contacto: null,
    activo: true,
    ciudad: CIUDAD.nombre,
    fuente: 'argenprop',
    url_origen: prop.url_origen,
    operacion,
  }]);

  if (error) { console.error(`\n❌ ${error.message}`); return; }

  console.log(`  ✅ [${CIUDAD.nombre}/${operacion}] ${prop.titulo?.slice(0, 50)} | ${detalle.inmobiliaria || 'sin inmob.'}`);
}

// ─── LISTING ──────────────────────────────────────────────────────────────────
async function scrapearListado(page, operacion) {
  const propiedades = [];

  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    const url = pag === 1
      ? `https://www.argenprop.com/inmuebles/${operacion}/${CIUDAD.slug}`
      : `https://www.argenprop.com/inmuebles/${operacion}/${CIUDAD.slug}?pagina-${pag}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2500);

      const cantCards = await page.evaluate(() => document.querySelectorAll('.listing__item').length);
      if (cantCards === 0) { console.log(`  ⚠️ Sin resultados en pág ${pag}.`); break; }

      const items = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.listing__item')];
        return cards.map(card => {
          const titulo = card.querySelector('.card__title')?.innerText?.trim() || null;
          const precioTexto = card.querySelector('.card__price')?.innerText?.trim() || null;
          const direccion = card.querySelector('.card__address')?.innerText?.trim() || null;
          const feats = [...card.querySelectorAll('.card__common-data span, .card__details span, .card__detail span')];
          const featsText = feats.map(f => f.innerText?.trim()).filter(Boolean);
          const dormitoriosText = featsText.find(f => f.match(/dorm/i)) || null;
          const banosText = featsText.find(f => f.match(/ba[ñn]/i)) || null;
          const superficieText = featsText.find(f => f.match(/m²|m2/i)) || null;
          const linkEl = card.querySelector('a.card, a[href*="-en-venta-"], a[href*="-en-alquiler-"]') || card.querySelector('a');
          const href = linkEl?.getAttribute('href') || null;
          return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href };
        }).filter(i => i.href && i.titulo);
      });

      if (items.length === 0) break;

      console.log(`  📄 ${CIUDAD.nombre}/${operacion} pág ${pag}: ${items.length} props`);

      for (const item of items) {
        propiedades.push({
          titulo: item.titulo,
          precio: limpiarPrecio(item.precioTexto),
          moneda: item.precioTexto?.includes('USD') ? 'USD' : 'ARS',
          direccion: item.direccion,
          dormitorios: limpiarInt(item.dormitoriosText),
          banos: limpiarInt(item.banosText),
          superficie_m2: limpiarSuperficie(item.superficieText),
          url_origen: item.href?.startsWith('http') ? item.href : `https://www.argenprop.com${item.href}`,
        });
      }

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`  ⚠️ Error pág ${pag}: ${e.message}`);
      break;
    }
  }

  return propiedades;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Scraper interior — ${CIUDAD.nombre}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    for (const operacion of OPERACIONES) {
      console.log(`\n📍 ${CIUDAD.nombre} — ${operacion.toUpperCase()}`);
      const propiedades = await scrapearListado(page, operacion);
      console.log(`  Total encontradas: ${propiedades.length}`);
      for (const prop of propiedades) {
        await guardarPropiedad(prop, page, operacion);
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(3000);
    }
    console.log(`\n✅ Completado — ${CIUDAD.nombre}`);
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await browser.close();
  }
}

main();