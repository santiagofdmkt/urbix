// scripts/refetch-desc.js
// Actualiza descripcion de las propiedades que tienen null
// Usa el selector correcto: .section-description--content

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔄 Refetch descripciones — ArgenProp\n');

  const { data: propiedades, error } = await supabase
    .from('propiedades')
    .select('id, url_origen, descripcion')
    .eq('fuente', 'argenprop')
    .is('descripcion', null);

  if (error) { console.error('❌ Error Supabase:', error.message); return; }

  console.log(`📋 Propiedades sin descripción: ${propiedades.length}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-AR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < propiedades.length; i++) {
    const prop = propiedades[i];
    process.stdout.write(`[${i + 1}/${propiedades.length}] `);

    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2000);

      const descripcion = await page.evaluate(() => {
        const descSelectors = [
          '.section-description--content',
          '[class*="section-description--content"]',
          '.description__text',
          '[class*="description__text"]',
        ];
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
            if (filtradas.length > 0) return filtradas.join(' ').trim();
          }
        }
        return null;
      });

      if (descripcion) {
        await supabase.from('propiedades').update({ descripcion }).eq('id', prop.id);
        console.log(`✅ ${descripcion.slice(0, 60)}...`);
        ok++;
      } else {
        console.log(`❌ Sin descripción`);
        fail++;
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
      fail++;
    }

    await page.waitForTimeout(1500);
  }

  await browser.close();
  console.log(`\n✅ Listo. OK: ${ok} | Sin datos: ${fail}`);
}

main();