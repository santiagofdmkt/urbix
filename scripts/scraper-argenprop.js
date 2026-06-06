// scripts/scraper-argenprop.js
// PRODUCCIÓN — ArgenProp, todas las ciudades Urbix
// Ventas + alquileres | Descripción e imágenes corregidas
// playwright-extra + stealth

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CIUDADES = [
  // { nombre: 'Chivilcoy',       slug: 'partido-de-chivilcoy' },
  // { nombre: 'Mercedes',        slug: 'partido-de-mercedes' },
  // { nombre: '25 de Mayo',      slug: 'partido-de-25-de-mayo' },
  // { nombre: '9 de Julio',      slug: 'partido-de-9-de-julio' },
  // { nombre: 'Pehuajó',         slug: 'partido-de-pehuajo' },
  // { nombre: 'Trenque Lauquen', slug: 'partido-de-trenque-lauquen' },
  // { nombre: 'Lobos',           slug: 'partido-de-lobos' },
  { nombre: 'Mar del Plata', slug: 'partido-de-general-pueyrredon' },
];

const OPERACIONES = ['venta', 'alquiler'];
const MAX_PAGINAS = 10;

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

function normalizarImagenUrl(url) {
  if (!url) return null;
  return url
    .replace(/_u_small\.jpg/, '_u_large.jpg')
    .replace(/_u_medium\.jpg/, '_u_large.jpg')
    .replace(/_u_thumbnail\.jpg/, '_u_large.jpg');
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
  const referer = 'https://www.argenprop.com/';
  const publicUrls = [];
  const urlsNormalizadas = urls.map(normalizarImagenUrl).filter(Boolean);
  const urlsUnicas = [...new Set(urlsNormalizadas)];

  for (let i = 0; i < Math.min(urlsUnicas.length, 10); i++) {
    const rawUrl = urlsUnicas[i];
    if (!rawUrl || rawUrl.includes('svg') || rawUrl.includes('placeholder') || rawUrl.includes('data:')) continue;
    try {
      const { buffer, contentType } = await downloadImage(rawUrl, referer);
      if (!contentType.match(/jpeg|jpg|png|webp/)) continue;
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
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
  process.stdout.write('\n');
  return publicUrls;
}

async function obtenerDetalle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const detalle = await page.evaluate(() => {
      // IMÁGENES
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
        if (urls.length > 0) { imagenes = [...new Set(urls)]; break; }
      }

      // DESCRIPCIÓN — selector correcto confirmado por inspección
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
          const lineasFiltradas = lineas.filter(l => {
            if (l.match(/^\d+\s*(m²|m2|años?|dormitorio|baño|ambiente|cochera)/i)) return false;
            if (l.match(/^(casa|quinta|departamento|terreno|local|oficina|campo|galpón)$/i)) return false;
            if (l.match(/^(muy bueno|bueno|excelente|a estrenar|reciclado)$/i)) return false;
            if (l.match(/^(descripción|descripcion|características principales)$/i)) return false;
            return true;
          });
          if (lineasFiltradas.length > 0) {
            descripcion = lineasFiltradas.join(' ').trim();
            break;
          }
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
        '.card__common-data span',
      ];
      let dormitorios = null, banos = null, superficie_m2 = null, superficieTerr = null;
      for (const sel of featureSelectors) {
        const items = [...document.querySelectorAll(sel)];
        if (items.length === 0) continue;
        for (const item of items) {
          const txt = item.innerText || '';
          if (txt.match(/dorm/i) && !dormitorios) {
            const n = txt.match(/\d+/); if (n) dormitorios = parseInt(n[0]);
          }
          if (txt.match(/ba[ñn]/i) && !banos) {
            const n = txt.match(/\d+/); if (n) banos = parseInt(n[0]);
          }
          if (txt.match(/cubierta/i) && !superficie_m2) {
            const n = txt.match(/(\d+(?:[.,]\d+)?)/);
            if (n) superficie_m2 = parseFloat(n[1].replace(',', '.'));
          }
          if (txt.match(/terreno|total/i) && !superficieTerr) {
            const n = txt.match(/(\d+(?:[.,]\d+)?)/);
            if (n) superficieTerr = parseFloat(n[1].replace(',', '.'));
          }
        }
        if (dormitorios || banos || superficie_m2) break;
      }

      if (!superficie_m2 && superficieTerr) superficie_m2 = superficieTerr;

      return { imagenes, descripcion, dormitorios, banos, superficie_m2 };
    });

    return detalle;
  } catch (e) {
    return { imagenes: [], descripcion: null, dormitorios: null, banos: null, superficie_m2: null };
  }
}

async function guardarPropiedad(prop, page, ciudad, operacion) {
  if (!prop.url_origen) return;

  const existe = await yaExiste(prop.url_origen);
  if (existe) { process.stdout.write('⏭ '); return; }

  const detalle = await obtenerDetalle(page, prop.url_origen);

  const dormitorios = detalle.dormitorios || prop.dormitorios;
  const banos = detalle.banos || prop.banos;
  const superficie_m2 = detalle.superficie_m2 || prop.superficie_m2;
  const descripcion = detalle.descripcion || null;

  const { data, error } = await supabase.from('propiedades').insert([{
    titulo: prop.titulo,
    descripcion,
    precio: prop.precio,
    moneda: prop.moneda,
    direccion: prop.direccion,
    barrio: prop.barrio || null,
    dormitorios,
    banos,
    superficie_m2,
    imagenes: null,
    inmobiliaria: null,
    contacto: null,
    activo: true,
    ciudad,
    fuente: 'argenprop',
    url_origen: prop.url_origen,
    operacion,
  }]).select('id').single();

  if (error) { console.error(`\n❌ ${error.message}`); return; }

  const propId = data.id;

  if (detalle.imagenes.length > 0) {
    const publicUrls = await subirImagenes(propId, detalle.imagenes);
    if (publicUrls.length > 0) {
      await supabase.from('propiedades').update({ imagenes: JSON.stringify(publicUrls) }).eq('id', propId);
    }
  }

  console.log(`  ✅ [${ciudad}/${operacion}] ${prop.titulo?.slice(0, 55)} | $${prop.precio} | dorm:${dormitorios} sup:${superficie_m2}`);
}

async function scrapearListado(page, ciudad, operacion) {
  const propiedades = [];

  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    const url = pag === 1
      ? `https://www.argenprop.com/inmuebles/${operacion}/${ciudad.slug}`
      : `https://www.argenprop.com/inmuebles/${operacion}/${ciudad.slug}-pagina-${pag}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2500);

      const items = await page.evaluate((ciudadNombre) => {
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

          const textoCard = (titulo + ' ' + (direccion || '') + ' ' + (card.innerText || '')).toLowerCase();
          const perteneceACiudad = textoCard.includes(ciudadNombre.toLowerCase());

          return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href, perteneceACiudad };
        }).filter(i => i.href && i.titulo && i.perteneceACiudad);
      }, ciudad.nombre);

      if (items.length === 0) {
        console.log(`  ⚠️ Sin propiedades de ${ciudad.nombre} en pág ${pag}, deteniendo.`);
        break;
      }

      console.log(`  📄 ${ciudad.nombre}/${operacion} pág ${pag}: ${items.length} props`);

      for (const item of items) {
        const urlOrigen = item.href?.startsWith('http') ? item.href : `https://www.argenprop.com${item.href}`;
        propiedades.push({
          titulo: item.titulo,
          precio: limpiarPrecio(item.precioTexto),
          moneda: item.precioTexto?.includes('USD') ? 'USD' : 'ARS',
          direccion: item.direccion,
          dormitorios: limpiarInt(item.dormitoriosText),
          banos: limpiarInt(item.banosText),
          superficie_m2: limpiarSuperficie(item.superficieText),
          url_origen: urlOrigen,
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

async function main() {
  console.log('🚀 Scraper ArgenProp — Urbix\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let totalGuardadas = 0;

  try {
    for (const ciudad of CIUDADES) {
      for (const operacion of OPERACIONES) {
        console.log(`\n📍 ${ciudad.nombre} — ${operacion.toUpperCase()}`);
        const propiedades = await scrapearListado(page, ciudad, operacion);
        console.log(`  Total encontradas: ${propiedades.length}`);

        for (const prop of propiedades) {
          await guardarPropiedad(prop, page, ciudad.nombre, operacion);
          totalGuardadas++;
          await page.waitForTimeout(1000);
        }

        await page.waitForTimeout(3000);
      }
    }

    console.log(`\n✅ Completado. Total procesadas: ${totalGuardadas}`);
  } catch (e) {
    console.error('❌ Error general:', e);
  } finally {
    await browser.close();
  }
}

main();