// scripts/refetch-descripciones.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🚀 Refetch descripciones Argenprop...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, url_origen, descripcion')
    .eq('fuente', 'argenprop')
    .not('url_origen', 'is', null);

  const sinDesc = (propiedades || []).filter(p => !p.descripcion || p.descripcion.trim() === '');

  console.log(`Total Argenprop: ${propiedades.length}`);
  console.log(`Sin descripción: ${sinDesc.length}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  let ok = 0;
  let fail = 0;

  for (const prop of sinDesc) {
    console.log(`\n[${ok + fail + 1}/${sinDesc.length}] → ${prop.url_origen}`);
    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const descripcion = await page.evaluate(() => {
        const selectors = [
          '.description__text',
          '.property-description',
          '[data-qa="POSTING_DESCRIPTION"]',
          '.section-description p',
          '[class*="description"] p',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText && el.innerText.trim()) return el.innerText.trim();
        }
        return null;
      });

      const extras = await page.evaluate(() => {
        const items = {};
        const rows = [...document.querySelectorAll('.property-details-section li, .section-specs li, [class*="specs"] li, .features-list__item')];
        for (const row of rows) {
          const txt = row.innerText || '';
          if (txt.match(/dorm|ambientes/i)) {
            const num = txt.match(/\d+/);
            if (num) items.dormitorios = parseInt(num[0]);
          }
          if (txt.match(/ba[ñn]/i)) {
            const num = txt.match(/\d+/);
            if (num) items.banos = parseInt(num[0]);
          }
          if (txt.match(/superficie total|m²|m2/i)) {
            const num = txt.match(/(\d+(?:[.,]\d+)?)/);
            if (num) items.superficie_m2 = parseFloat(num[1].replace(',', '.'));
          }
        }
        return items;
      });

      if (!descripcion && Object.keys(extras).length === 0) {
        console.log('  ⏭ Sin datos nuevos');
        fail++;
        continue;
      }

      const update = {};
      if (descripcion) update.descripcion = descripcion;
      if (extras.dormitorios) update.dormitorios = extras.dormitorios;
      if (extras.banos) update.banos = extras.banos;
      if (extras.superficie_m2) update.superficie_m2 = extras.superficie_m2;

      await supabase.from('propiedades').update(update).eq('id', prop.id);

      const campos = Object.keys(update).join(', ');
      console.log(`  ✅ Actualizada: ${campos}`);
      ok++;

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      fail++;
    }

    await page.waitForTimeout(1500);
  }

  await browser.close();
  console.log(`\n✅ Listo. OK: ${ok} | Sin datos: ${fail}`);
}

main();