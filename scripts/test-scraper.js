// scripts/test-scraper.js
// TEST — ZonaProp Chivilcoy, 5 propiedades, SIN insertar en Supabase
// Objetivo: validar que capturamos titulo, precio, direccion, dormitorios,
//           banos, superficie, descripcion e imagenes correctamente.

const { chromium } = require('playwright');

const TEST_URL = 'https://www.zonaprop.com.ar/inmuebles/venta/partido-de-chivilcoy.html';
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
        '[data-qa="POSTING_GALLERY"] img',
        '.flickity-slider img',
        '[class*="gallery"] img',
        '[class*="slider"] img',
        'img[data-flickity-lazyload]',
        '.photo-viewer img',
        '[class*="photo"] img',
      ];
      let imagenes = [];
      for (const sel of imgSelectors) {
        const imgs = [...document.querySelectorAll(sel)];
        const urls = imgs
          .map(el =>
            el.getAttribute('data-flickity-lazyload') ||
            el.getAttribute('data-src') ||
            el.getAttribute('src')
          )
          .filter(u => u && !u.includes('svg') && !u.includes('placeholder') && u.startsWith('http'));
        if (urls.length > 0) {
          imagenes = [...new Set(urls)]; // deduplicar
          console.log('[detalle] selector imagenes:', sel, '→', imagenes.length);
          break;
        }
      }

      // ── DESCRIPCIÓN ───────────────────────────────────────────────────────
      const descSelectors = [
        '[data-qa="POSTING_DESCRIPTION"]',
        '[data-qa="posting-description"]',
        '.description-text',
        '.postingcard-description',
        '[class*="description__content"]',
        '[class*="Description"] p',
        '[class*="description"] p',
      ];
      let descripcion = null;
      let descSelectorUsado = null;
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) {
          descripcion = el.innerText.trim();
          descSelectorUsado = sel;
          break;
        }
      }
      if (descSelectorUsado) console.log('[detalle] selector desc:', descSelectorUsado);

      // ── FEATURES DESDE DETALLE ────────────────────────────────────────────
      const featureSelectors = [
        '[data-qa="POSTING_CARD_FEATURES"] li',
        '[data-qa="posting-features"] li',
        '[data-qa="POSTING_FEATURES"] li',
        '.section-icon-features li',
        '[class*="features"] li',
        '[class*="Features"] li',
        '[class*="specs"] li',
      ];
      let dormitorios = null, banos = null, superficie_m2 = null;
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
        if (dormitorios || banos || superficie_m2) break;
      }

      return { imagenes, descripcion, dormitorios, banos, superficie_m2 };
    });

    return detalle;
  } catch (e) {
    return { imagenes: [], descripcion: null, dormitorios: null, banos: null, superficie_m2: null, error: e.message };
  }
}

async function main() {
  console.log('🧪 TEST SCRAPER — ZonaProp Chivilcoy (sin Supabase)\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // ── PASO 1: Listing ───────────────────────────────────────────────────────
  console.log('📄 Cargando listing...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  const items = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-qa^="posting"]')];
    console.log('[listing] cards encontradas:', cards.length);

    return cards.map(card => {
      const titulo =
        card.querySelector('[data-qa="POSTING_CARD_DESCRIPTION"]')?.innerText?.trim() ||
        card.querySelector('[class*="Title"]')?.innerText?.trim() ||
        card.querySelector('h2')?.innerText?.trim() ||
        null;

      const precioEl =
        card.querySelector('[data-qa="POSTING_CARD_PRICE"]') ||
        card.querySelector('[class*="Price"]') ||
        card.querySelector('[class*="price"]');
      const precioTexto = precioEl?.innerText?.trim() || null;

      const direccion =
        card.querySelector('[data-qa="POSTING_CARD_LOCATION"]')?.innerText?.trim() ||
        card.querySelector('[class*="Location"]')?.innerText?.trim() ||
        null;

      const feats = [...card.querySelectorAll('[data-qa="POSTING_CARD_FEATURES"] li, [class*="features"] li')];
      const featsText = feats.map(f => f.innerText?.trim()).filter(Boolean);

      const dormitoriosText = featsText.find(f => f.match(/dorm|amb/i)) || null;
      const banosText = featsText.find(f => f.match(/ba[ñn]/i)) || null;
      const superficieText = featsText.find(f => f.match(/m²|m2/i)) || null;

      // URL — ZonaProp pone el href en un <a> dentro de la card
      const linkEl = card.querySelector('a[href]');
      const href = linkEl?.getAttribute('href') || null;

      return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href };
    }).filter(i => i.href);
  });

  console.log(`\n✅ Cards encontradas en listing: ${items.length}`);
  if (items.length === 0) {
    console.log('❌ No se encontraron cards. Revisá los selectores del listing.');
    await browser.close();
    return;
  }

  // ── PASO 2: Detalle de las primeras MAX_TEST ──────────────────────────────
  const muestra = items.slice(0, MAX_TEST);

  for (let i = 0; i < muestra.length; i++) {
    const item = muestra[i];
    const url = item.href?.startsWith('http') ? item.href : `https://www.zonaprop.com.ar${item.href}`;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${i + 1}/${muestra.length}] ${url}`);
    console.log(`  titulo:     ${item.titulo || '❌ null'}`);
    console.log(`  precio:     ${item.precioTexto || '❌ null'} → ${limpiarPrecio(item.precioTexto)}`);
    console.log(`  direccion:  ${item.direccion || '❌ null'}`);
    console.log(`  dorm(list): ${item.dormitoriosText || '❌ null'} → ${limpiarInt(item.dormitoriosText)}`);
    console.log(`  baños(list):${item.banosText || '❌ null'} → ${limpiarInt(item.banosText)}`);
    console.log(`  sup(list):  ${item.superficieText || '❌ null'} → ${limpiarSuperficie(item.superficieText)}`);

    console.log(`  🔎 Entrando al detalle...`);
    const detalle = await obtenerDetalle(page, url);

    console.log(`  desc:       ${detalle.descripcion ? '✅ ' + detalle.descripcion.slice(0, 80) + '...' : '❌ null'}`);
    console.log(`  dorm(det):  ${detalle.dormitorios ?? '❌ null'}`);
    console.log(`  baños(det): ${detalle.banos ?? '❌ null'}`);
    console.log(`  sup(det):   ${detalle.superficie_m2 ?? '❌ null'}`);
    console.log(`  imagenes:   ${detalle.imagenes.length > 0 ? '✅ ' + detalle.imagenes.length + ' urls' : '❌ ninguna'}`);
    if (detalle.imagenes.length > 0) {
      detalle.imagenes.slice(0, 3).forEach((url, idx) => console.log(`    img[${idx}]: ${url}`));
    }
    if (detalle.error) console.log(`  ⚠️ error: ${detalle.error}`);

    await page.waitForTimeout(2000);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🧪 Test completado. Revisá los resultados arriba.');
  console.log('Si todo muestra ✅ → el scraper está listo para escalar.');
  console.log('Si hay ❌ → avisale a Claude qué campos fallan.');

  await browser.close();
}

main();