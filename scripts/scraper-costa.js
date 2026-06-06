// scripts/scraper-costa.js
// Scraper ZonaProp — Costa Atlántica (ventas + alquileres)
// Urbix 2026 — selectores revisados, imágenes y descripción desde detalle

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── LOCALIDADES COSTA ATLÁNTICA ────────────────────────────────────────────
const LOCALIDADES = [
  { nombre: 'Pinamar',        slug: 'partido-de-pinamar' },
  { nombre: 'Villa Gesell',   slug: 'partido-de-villa-gesell' },
  { nombre: 'Mar del Plata',  slug: 'partido-de-general-pueyrredon' },
  { nombre: 'Miramar',        slug: 'partido-de-general-alvarado' },
  { nombre: 'Necochea',       slug: 'partido-de-necochea' },
  { nombre: 'Monte Hermoso',  slug: 'partido-de-coronel-dorrego' },
];

// ventas y alquileres
const OPERACIONES = ['venta', 'alquiler'];

const MAX_PAGINAS = 5; // ajustá según cuánto querés traer por ciudad/operación

// ─── HELPERS ────────────────────────────────────────────────────────────────
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

function downloadImage(url, referer) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
      },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, referer).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || 'image/jpeg',
      }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function subirImagenes(propId, urls) {
  const referer = 'https://www.zonaprop.com.ar/';
  const publicUrls = [];
  for (let i = 0; i < Math.min(urls.length, 8); i++) {
    const rawUrl = urls[i];
    if (!rawUrl || rawUrl.includes('svg') || rawUrl.includes('placeholder')) continue;
    try {
      const { buffer, contentType } = await downloadImage(rawUrl, referer);
      if (!contentType.match(/jpeg|jpg|png|webp/)) {
        console.log(`    img ${i}: saltada (${contentType})`);
        continue;
      }
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const path = `${propId}/${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
        publicUrls.push(publicUrl);
        console.log(`    📸 img ${i}: OK`);
      } else {
        console.log(`    ⚠️ img ${i}: upload error ${error.message}`);
      }
    } catch (e) {
      console.log(`    ⚠️ img ${i}: ${e.message}`);
    }
  }
  return publicUrls;
}

// ─── DETALLE DE PROPIEDAD (imágenes + descripción) ──────────────────────────
async function obtenerDetalle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const detalle = await page.evaluate(() => {
      // ── IMÁGENES ──────────────────────────────────────────────────────────
      // ZonaProp usa data-flickity-lazyload o src en slides
      const imgSelectors = [
        '[data-qa="POSTING_GALLERY"] img',
        '.flickity-slider img',
        '.gallery-images img',
        '[class*="gallery"] img',
        '[class*="slider"] img',
        'img[data-flickity-lazyload]',
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
        if (urls.length > 0) { imagenes = urls; break; }
      }

      // ── DESCRIPCIÓN ──────────────────────────────────────────────────────
      const descSelectors = [
        '[data-qa="POSTING_DESCRIPTION"]',
        '[data-qa="posting-description"]',
        '.description-text',
        '.postingcard-description',
        '[class*="description__content"]',
        '[class*="Description"] p',
      ];
      let descripcion = null;
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) { descripcion = el.innerText.trim(); break; }
      }

      // ── EXTRAS (dormitorios, baños, sup desde detalle) ───────────────────
      const featureSelectors = [
        '[data-qa="POSTING_CARD_FEATURES"] li',
        '[data-qa="posting-features"] li',
        '.section-icon-features li',
        '[class*="features"] li',
        '[class*="Features"] li',
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
    console.log(`    ⚠️ Error en detalle: ${e.message}`);
    return { imagenes: [], descripcion: null, dormitorios: null, banos: null, superficie_m2: null };
  }
}

// ─── GUARDAR PROPIEDAD ───────────────────────────────────────────────────────
async function guardarPropiedad(prop, page, ciudad, operacion) {
  if (!prop.url_origen) return;

  const existe = await yaExiste(prop.url_origen);
  if (existe) { console.log(`  ⏭ Ya existe`); return; }

  // Entrar al detalle para imágenes y descripción
  console.log(`  🔎 Detalle: ${prop.url_origen}`);
  const detalle = await obtenerDetalle(page, prop.url_origen);

  const dormitorios = detalle.dormitorios || prop.dormitorios;
  const banos = detalle.banos || prop.banos;
  const superficie_m2 = detalle.superficie_m2 || prop.superficie_m2;
  const descripcion = detalle.descripcion || prop.descripcion || null;

  console.log(`    → desc: ${descripcion ? '✅' : '❌'} | imgs: ${detalle.imagenes.length} | dorm: ${dormitorios} | sup: ${superficie_m2}`);

  // Insertar registro
  const { data, error } = await supabase.from('propiedades').insert([{
    titulo: prop.titulo,
    descripcion,
    precio: prop.precio,
    moneda: prop.moneda,
    direccion: prop.direccion,
    barrio: prop.barrio,
    dormitorios,
    banos,
    superficie_m2,
    imagenes: null,
    inmobiliaria: null,
    contacto: null,
    activo: true,
    ciudad,
    fuente: 'zonaprop',
    url_origen: prop.url_origen,
    operacion,
  }]).select('id').single();

  if (error) { console.error(`  ❌ Insert error: ${error.message}`); return; }

  const propId = data.id;

  // Subir imágenes
  if (detalle.imagenes.length > 0) {
    const publicUrls = await subirImagenes(propId, detalle.imagenes);
    if (publicUrls.length > 0) {
      await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', propId);
      console.log(`  ✅ Guardada con ${publicUrls.length} fotos: ${prop.titulo?.slice(0, 60)}`);
    } else {
      console.log(`  ✅ Guardada sin fotos (descarga falló): ${prop.titulo?.slice(0, 60)}`);
    }
  } else {
    console.log(`  ✅ Guardada sin imágenes: ${prop.titulo?.slice(0, 60)}`);
  }
}

// ─── SCRAPEAR LISTING ────────────────────────────────────────────────────────
async function scrapearListado(page, localidad, operacion) {
  console.log(`\n📍 ZonaProp — ${localidad.nombre} — ${operacion.toUpperCase()}`);
  const propiedades = [];

  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    // URL ZonaProp: /inmuebles/venta/partido-de-pinamar.html para pág 1
    //              /inmuebles/venta/partido-de-pinamar-pagina-2.html para pág 2+
    const url = pag === 1
      ? `https://www.zonaprop.com.ar/inmuebles/${operacion}/${localidad.slug}.html`
      : `https://www.zonaprop.com.ar/inmuebles/${operacion}/${localidad.slug}-pagina-${pag}.html`;

    console.log(`  Página ${pag}: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3000);

      // Verificar si hay resultados
      const sinResultados = await page.$('[data-qa="search-no-results"], .empty-state');
      if (sinResultados) { console.log(`  Sin resultados.`); break; }

      const items = await page.evaluate(() => {
        // ZonaProp usa data-qa="posting XXXX" en cada card
        const cards = [...document.querySelectorAll('[data-qa^="posting"]')];

        return cards.map(card => {
          // Título
          const titulo =
            card.querySelector('[data-qa="POSTING_CARD_DESCRIPTION"]')?.innerText?.trim() ||
            card.querySelector('[class*="Title"]')?.innerText?.trim() ||
            card.querySelector('h2')?.innerText?.trim() ||
            null;

          // Precio
          const precioEl =
            card.querySelector('[data-qa="POSTING_CARD_PRICE"]') ||
            card.querySelector('[class*="Price"]') ||
            card.querySelector('[class*="price"]');
          const precioTexto = precioEl?.innerText?.trim() || null;

          // Dirección
          const direccion =
            card.querySelector('[data-qa="POSTING_CARD_LOCATION"]')?.innerText?.trim() ||
            card.querySelector('[class*="Location"]')?.innerText?.trim() ||
            null;

          // Features (dorm, baños, sup)
          const feats = [...card.querySelectorAll('[data-qa="POSTING_CARD_FEATURES"] li, [class*="features"] li')];
          const featsText = feats.map(f => f.innerText?.trim()).filter(Boolean);

          const dormitoriosText = featsText.find(f => f.match(/dorm|amb/i)) || null;
          const banosText = featsText.find(f => f.match(/ba[ñn]/i)) || null;
          const superficieText = featsText.find(f => f.match(/m²|m2/i)) || null;

          // URL
          const linkEl = card.querySelector('a[href*="/propiedades/"], a[href*="/propiedad/"]') || card.closest('a');
          const href = linkEl?.getAttribute('href') || null;

          // Imagen thumbnail (para referencia, vamos a reemplazar con las del detalle)
          const imgEl = card.querySelector('img');
          const imgSrc = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || null;

          return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href, imgSrc };
        }).filter(i => i.href); // solo los que tienen URL
      });

      if (items.length === 0) {
        console.log(`  Sin cards encontradas — puede ser la última página.`);
        break;
      }

      console.log(`  → ${items.length} propiedades`);

      for (const item of items) {
        propiedades.push({
          titulo: item.titulo,
          descripcion: null, // se carga desde detalle
          precio: limpiarPrecio(item.precioTexto),
          moneda: item.precioTexto?.includes('USD') ? 'USD' : 'ARS',
          direccion: item.direccion,
          barrio: null,
          dormitorios: limpiarInt(item.dormitoriosText),
          banos: limpiarInt(item.banosText),
          superficie_m2: limpiarSuperficie(item.superficieText),
          url_origen: item.href?.startsWith('http') ? item.href : `https://www.zonaprop.com.ar${item.href}`,
        });
      }

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`  ⚠️ Error página ${pag}: ${e.message}`);
      break;
    }
  }

  console.log(`  Total encontradas: ${propiedades.length}`);
  return propiedades;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando scraper Costa Atlántica — ZonaProp (ventas + alquileres)');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let totalGuardadas = 0;

  try {
    for (const localidad of LOCALIDADES) {
      for (const operacion of OPERACIONES) {
        const propiedades = await scrapearListado(page, localidad, operacion);

        for (const prop of propiedades) {
          await guardarPropiedad(prop, page, localidad.nombre, operacion);
          totalGuardadas++;
          await page.waitForTimeout(1500); // pausa entre propiedades
        }

        await page.waitForTimeout(4000); // pausa entre ciudad/operación
      }
    }

    console.log(`\n✅ Scraping completado. Total procesadas: ${totalGuardadas}`);
  } catch (e) {
    console.error('❌ Error general:', e);
  } finally {
    await browser.close();
  }
}

main();