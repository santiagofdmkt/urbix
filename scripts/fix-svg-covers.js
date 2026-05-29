// scripts/fix-svg-covers.js
// Detecta 0.jpg corruptos (SVG) en Storage y reordena el array imagenes en la tabla

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';
const BUCKET = 'propiedades-imagenes';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Hace un HEAD request y devuelve el content-type
function getContentType(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.headers['content-type'] || '');
    });
    req.on('error', () => resolve(''));
    req.setTimeout(8000, () => { req.destroy(); resolve(''); });
    req.end();
  });
}

function parseImagenes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const str = typeof raw === 'string' ? raw.replace(/\\"/g, '"').replace(/^\[?"?|"?\]?$/g, '').trim() : '';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    if (typeof raw === 'string' && raw.startsWith('http')) return [raw];
    return [];
  }
}

async function main() {
  console.log('🔍 Buscando propiedades con 0.jpg corrupto...\n');

  const { data: propiedades, error } = await supabase
    .from('propiedades')
    .select('id, imagenes')
    .not('imagenes', 'is', null);

  if (error) { console.error('Error leyendo propiedades:', error.message); return; }

  console.log(`Total propiedades con imagenes: ${propiedades.length}\n`);

  let corruptas = 0;
  let reparadas = 0;
  let sinSolucion = 0;

  for (const prop of propiedades) {
    const urls = parseImagenes(prop.imagenes);
    if (urls.length === 0) continue;

    const primera = urls[0];
    if (!primera.includes('supabase.co')) continue; // saltar si no está en Storage

    // Chequear content-type de la primera imagen
    const ct = await getContentType(primera);

    if (ct.includes('svg') || ct.includes('xml')) {
      corruptas++;
      console.log(`[${prop.id}] ❌ 0.jpg es SVG (${ct})`);

      // Buscar la primera URL válida del resto del array
      let urlValida = null;
      for (let i = 1; i < urls.length; i++) {
        const ctCheck = await getContentType(urls[i]);
        if (ctCheck.includes('jpeg') || ctCheck.includes('jpg') || ctCheck.includes('png') || ctCheck.includes('webp')) {
          urlValida = i;
          break;
        }
      }

      if (urlValida !== null) {
        // Reordenar: sacar el SVG del frente, poner el válido primero
        const urlsSinSvg = urls.filter((_, i) => i !== 0); // quita el 0.jpg SVG
        const urlsReordenadas = [urls[urlValida], ...urlsSinSvg.filter((_, i) => i !== urlValida - 1)];

        const { error: updateError } = await supabase
          .from('propiedades')
          .update({ imagenes: JSON.stringify(urlsReordenadas) })
          .eq('id', prop.id);

        if (!updateError) {
          reparadas++;
          console.log(`  ✅ Reparada — nueva portada: ${urls[urlValida]}`);
        } else {
          console.log(`  ⚠️ Error al actualizar: ${updateError.message}`);
        }
      } else {
        sinSolucion++;
        console.log(`  ⚠️ No hay imágenes válidas en el array — quedaría sin foto`);
      }
    } else {
      process.stdout.write(`.`); // punto por cada propiedad OK
    }
  }

  console.log(`\n\n📊 Resumen:`);
  console.log(`  Corruptas encontradas: ${corruptas}`);
  console.log(`  Reparadas: ${reparadas}`);
  console.log(`  Sin solución (solo tenían SVG): ${sinSolucion}`);
  console.log('\n✅ Listo.');
}

main();