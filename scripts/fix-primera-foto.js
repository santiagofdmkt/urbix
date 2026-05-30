// scripts/fix-primera-foto.js
// Saca la primera imagen del array y la reemplaza por la segunda
// Para propiedades de Argenprop donde el 0.jpg es un logo

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 Corrigiendo primera foto en propiedades de Argenprop...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, imagenes')
    .eq('fuente', 'argenprop')
    .not('imagenes', 'is', null);

  console.log(`Total Argenprop: ${propiedades.length}\n`);

  let reparadas = 0;
  let saltadas = 0;

  for (const prop of propiedades) {
    try {
      const imgs = JSON.parse(prop.imagenes);
      if (!Array.isArray(imgs) || imgs.length < 2) { saltadas++; continue; }

      // Sacar el primer elemento (logo) y dejar el resto
      const sinLogo = imgs.slice(1);

      await supabase
        .from('propiedades')
        .update({ imagenes: JSON.stringify(sinLogo) })
        .eq('id', prop.id);

      reparadas++;
      process.stdout.write('✅');
    } catch { saltadas++; process.stdout.write('⚠️'); }
  }

  console.log(`\n\nReparadas: ${reparadas}`);
  console.log(`Saltadas (solo 1 foto): ${saltadas}`);
  console.log('\n✅ Listo.');
}

main();