// scripts/fix-precios.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function limpiarPrecio(texto) {
  if (!texto) return null;
  const match = texto.match(/[\d.]+/);
  if (!match) return null;
  const num = match[0].replace(/\./g, '');
  return parseInt(num) || null;
}

async function main() {
  console.log('🔧 Iniciando fix de precios...');

  const { data: propiedades, error } = await supabase
    .from('propiedades')
    .select('id, url_origen, fuente, precio')
    .in('fuente', ['argenprop', 'zonaprop'])
    .order('id');

  if (error) { console.error('❌ Error al obtener propiedades:', error.message); return; }

  console.log(`📋 ${propiedades.length} propiedades a procesar\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-AR',
  });
  const page = await context.newPage();

  let ok = 0, fail = 0, sinCambio = 0;

  for (const prop of propiedades) {
    if (!prop.url_origen) { console.log(`  ⚠️ ID ${prop.id}: sin URL, salteando`); fail++; continue; }

    try {
      await page.goto(prop.url_origen, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      let precioTexto = null;

      if (prop.fuente === 'argenprop') {
        precioTexto = await page.$eval('.titlebar__price', el => el.innerText.trim()).catch(() => null);
      } else if (prop.fuente === 'zonaprop') {
        precioTexto = await page.$eval('[data-qa="POSTING_CARD_PRICE"], .price-operation', el => el.innerText.trim()).catch(() => null);
      }

      if (!precioTexto) {
        console.log(`  ⚠️ ID ${prop.id}: no se encontró precio en página`);
        fail++;
        continue;
      }

      const moneda = precioTexto.includes('USD') ? 'USD' : 'ARS';
      const precioLimpio = limpiarPrecio(precioTexto);

      if (!precioLimpio) {
        console.log(`  ⚠️ ID ${prop.id}: precio no parseable ("${precioTexto}")`);
        fail++;
        continue;
      }

      if (precioLimpio === prop.precio) {
        console.log(`  ✓ ID ${prop.id}: sin cambio (${precioLimpio})`);
        sinCambio++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('propiedades')
        .update({ precio: precioLimpio, moneda })
        .eq('id', prop.id);

      if (updateError) {
        console.log(`  ❌ ID ${prop.id}: error al actualizar — ${updateError.message}`);
        fail++;
      } else {
        console.log(`  ✅ ID ${prop.id}: ${prop.precio} → ${precioLimpio} ${moneda}`);
        ok++;
      }

    } catch (e) {
      console.log(`  ❌ ID ${prop.id}: ${e.message}`);
      fail++;
    }

    await page.waitForTimeout(1000);
  }

  await browser.close();

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Actualizadas: ${ok}`);
  console.log(`   ✓  Sin cambio:   ${sinCambio}`);
  console.log(`   ❌ Fallidas:     ${fail}`);
}

main();