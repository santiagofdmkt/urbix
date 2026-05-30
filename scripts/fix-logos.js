// scripts/fix-logos.js
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getContentType(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.headers['content-type'] || '');
    });
    req.on('error', () => resolve(''));
    req.setTimeout(8000, () => { req.destroy(); resolve(''); });
    req.end();
  });
}

async function main() {
  console.log('🔍 Buscando logos como foto principal...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, imagenes')
    .not('imagenes', 'is', null);

  let corruptas = 0;
  let reparadas = 0;

  for (const prop of propiedades) {
    let imgs = [];
    try {
      imgs = JSON.parse(prop.imagenes);
      if (!Array.isArray(imgs) || imgs.length === 0) continue;
    } catch { continue; }

    const ct = await getContentType(imgs[0]);
    if (ct.includes('svg') || ct.includes('xml') || !ct.includes('image')) {
      corruptas++;
      console.log(`[${prop.id}] ❌ Primera imagen es logo/SVG`);

      // Buscar primera imagen real
      let primeraReal = null;
      for (let i = 1; i < imgs.length; i++) {
        const ctCheck = await getContentType(imgs[i]);
        if (ctCheck.includes('jpeg') || ctCheck.includes('jpg') || ctCheck.includes('png') || ctCheck.includes('webp')) {
          primeraReal = i;
          break;
        }
      }

      if (primeraReal !== null) {
        const nuevasUrls = [imgs[primeraReal], ...imgs.filter((_, i) => i !== primeraReal && i !== 0)];
        await supabase.from('propiedades').update({ imagenes: JSON.stringify(nuevasUrls) }).eq('id', prop.id);
        reparadas++;
        console.log(`  ✅ Reparada — nueva portada: img ${primeraReal}`);
      } else {
        console.log(`  ⚠️ No hay imagen válida alternativa`);
      }
    } else {
      process.stdout.write('.');
    }
  }

  console.log(`\n\n📊 Resumen:`);
  console.log(`  Logos encontrados: ${corruptas}`);
  console.log(`  Reparadas: ${reparadas}`);
  console.log('\n✅ Listo.');
}

main();