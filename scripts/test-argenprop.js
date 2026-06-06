// scripts/test-argenprop.js
// TEST — ArgenProp Chivilcoy, 5 propiedades, SIN insertar en Supabase
// Usa playwright-extra + stealth para evitar detección

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const TEST_URL_VENTA = 'https://www.argenprop.com/inmuebles/venta/partido-de-chivilcoy';
const MAX_TEST = 5;

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

async function obtenerDetalle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const detalle = await page.evaluate(() => {
      // ── IMÁGENES ──────────────────────────────────────────────────────────
      const imgSelectors = [
        '.gallery__photo img',
        '.gallery img',
        '[class*="gallery"] img',
        '.slider img',
        '[class*="slider"] img',
        '.carousel img',
        '[class*="photo"] img',
        'img[data-src]',
      ];
      let imagenes = [];
      let selectorUsado = null;
      for (const sel of imgSelectors) {
        const imgs = [...document.querySelectorAll(sel)];
        const urls = imgs
          .map(el =>
            el.getAttribute('data-src') ||
            el.getAttribute('data-lazy') ||
            el.getAttribute('src')
          )
          .filter(u => u && !u.includes('svg') && !u.includes('placeholder') && !u.includes('data:') && u.startsWith('http'));
        if (urls.length > 0) {
          imagenes = [...new Set(urls)];
          selectorUsado = sel;
          break;
        }
      }
      if (selectorUsado) console.log('[detalle] imgs selector:', selectorUsado, '→', imagenes.length);

      // ── DESCRIPCIÓN ───────────────────────────────────────────────────────
      const descSelectors = [
        '.description__text',
        '.property-description',
        '[class*="description__text"]',
        '[class*="Description__text"]',
        '.section-description p',
        '[class*="description"] p',
        '[class*="Description"] p',
      ];
      let descripcion = null;
      let descSelector = null;
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) {
          descripcion = el.innerText.trim();
          descSelector = sel;
          break;
        }
      }
      if (descSelector) console.log('[detalle] desc selector:', descSelector);

      // ── FEATURES DESDE DETALLE ────────────────────────────────────────────
      const featureSelectors = [
        '.property-details li',
        '.section-icon-features li',
        '[class*="features"] li',
        '[class*="Features"] li',
        '[class*="specs"] li',
        '.property-main-features li',
        '.card__common-data span',
      ];
      let dormitorios = null, banos = null, superficie_m2 = null;
      let featSelector = null;
      for (const sel of featureSelectors) {
        const items = [...document.querySelectorAll(sel)];
        if (items.length === 0) continue;
        for (const item of items) {
          const txt = item.innerText || '';
          if (txt.match(/dorm|amb/i) && !dormitorios) {
            const n = txt.match(/\d+/); if (n) dormitorios = parseInt(n[0]);
          }
          if (txt.match(/ba[ñn]/i) && !banos) {
            const n = txt.match(/\d+/); if (n) banos = parseInt(n[0]);
          }
          if (txt.match(/m²|m2|superficie/i) && !superficie_m2) {
            const n = txt.match(/(\d+(?:[.,]\d+)?)/);
            if (n) superficie_m2 = parseFloat(n[1].replace(',', '.'));
          }
        }
        if (dormitorios || banos || superficie_m2) { featSelector = sel; break; }
      }
      if (featSelector) console.log('[detalle] feats selector:', featSelector);

      return { imagenes, descripcion, dormitorios, banos, superficie_m2 };
    });

    return detalle;
  } catch (e) {
    return { imagenes: [], descripcion: null, dormitorios: null, banos: null, superficie_m2: null, error: e.message };
  }
}

async function main() {
  console.log('🧪 TEST SCRAPER — ArgenProp Chivilcoy (sin Supabase)\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // ── LISTING ───────────────────────────────────────────────────────────────
  console.log('📄 Cargando listing ArgenProp...');
  await page.goto(TEST_URL_VENTA, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  const items = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.listing__item')];
    console.log('[listing] cards encontradas:', cards.length);

    return cards.map(card => {
      const titulo = card.querySelector('.card__title')?.innerText?.trim() || null;

      const precioTexto = card.querySelector('.card__price')?.innerText?.trim() || null;

      const direccion = card.querySelector('.card__address')?.innerText?.trim() || null;

      const descripcion = card.querySelector('.card__description')?.innerText?.trim() || null;

      const feats = [...card.querySelectorAll('.card__common-data span, .card__details span')];
      const featsText = feats.map(f => f.innerText?.trim()).filter(Boolean);

      const dormitoriosText = featsText.find(f => f.match(/dorm|amb/i)) || null;
      const banosText = featsText.find(f => f.match(/ba[ñn]/i)) || null;
      const superficieText = featsText.find(f => f.match(/m²|m2/i)) || null;

      const linkEl = card.querySelector('a.card, a[href*="/propiedad"]');
      const href = linkEl?.getAttribute('href') || null;

      const imgEl = card.querySelector('img');
      const imgSrc = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || null;

      return { titulo, precioTexto, direccion, descripcion, dormitoriosText, banosText, superficieText, href, imgSrc };
    }).filter(i => i.href);
  });

  console.log(`✅ Cards encontradas: ${items.length}`);
  if (items.length === 0) {
    console.log('❌ No se encontraron cards. Revisá los selectores del listing.');
    await browser.close();
    return;
  }

  // ── DETALLE ───────────────────────────────────────────────────────────────
  const muestra = items.slice(0, MAX_TEST);

  for (let i = 0; i < muestra.length; i++) {
    const item = muestra[i];
    const url = item.href?.startsWith('http') ? item.href : `https://www.argenprop.com${item.href}`;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${i + 1}/${muestra.length}] ${url}`);
    console.log(`  titulo:      ${item.titulo || '❌ null'}`);
    console.log(`  precio:      ${item.precioTexto || '❌ null'} → ${limpiarPrecio(item.precioTexto)}`);
    console.log(`  direccion:   ${item.direccion || '❌ null'}`);
    console.log(`  desc(list):  ${item.descripcion ? '✅ ' + item.descripcion.slice(0, 60) + '...' : '❌ null'}`);
    console.log(`  dorm(list):  ${item.dormitoriosText || '❌ null'} → ${limpiarInt(item.dormitoriosText)}`);
    console.log(`  baños(list): ${item.banosText || '❌ null'} → ${limpiarInt(item.banosText)}`);
    console.log(`  sup(list):   ${item.superficieText || '❌ null'} → ${limpiarSuperficie(item.superficieText)}`);

    console.log(`  🔎 Entrando al detalle...`);
    const detalle = await obtenerDetalle(page, url);

    console.log(`  desc(det):   ${detalle.descripcion ? '✅ ' + detalle.descripcion.slice(0, 80) + '...' : '❌ null'}`);
    console.log(`  dorm(det):   ${detalle.dormitorios ?? '❌ null'}`);
    console.log(`  baños(det):  ${detalle.banos ?? '❌ null'}`);
    console.log(`  sup(det):    ${detalle.superficie_m2 ?? '❌ null'}`);
    console.log(`  imagenes:    ${detalle.imagenes.length > 0 ? '✅ ' + detalle.imagenes.length + ' urls' : '❌ ninguna'}`);
    if (detalle.imagenes.length > 0) {
      detalle.imagenes.slice(0, 3).forEach((u, idx) => console.log(`    img[${idx}]: ${u}`));
    }
    if (detalle.error) console.log(`  ⚠️ error: ${detalle.error}`);

    await page.waitForTimeout(2000);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🧪 Test completado.');
  console.log('Si todo muestra ✅ → listo para escalar a todas las ciudades.');
  console.log('Si hay ❌ → avisale a Claude qué campos fallan y con qué selector.');

  await browser.close();
}

main();