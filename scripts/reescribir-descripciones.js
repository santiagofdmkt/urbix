// scripts/reescribir-descripciones.js
// Reescritura conservadora por reglas (sin IA): ELIMINA el bloque del corredor
// (nombre, matricula, contacto, responsable), reordena parrafos del cuerpo, aplica
// sinonimos seguros y limpia. Idempotente: solo procesa propiedades sin descripcion_reescrita.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zrtaffecubpwoxjycyse.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydGFmZmVjdWJwd294anljeXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg0NDIxMCwiZXhwIjoyMDk1NDIwMjEwfQ.Br5rdV2jiawtfSYaOEnyGYm_lBdu6CAoXuseezMvXgk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Diccionario CONSERVADOR: solo reemplazos seguros en cualquier contexto.
const SINONIMOS = [
  [/\bamplio\b/gi,        'espacioso'],
  [/\bamplia\b/gi,        'espaciosa'],
  [/\bamplios\b/gi,       'espaciosos'],
  [/\bamplias\b/gi,       'espaciosas'],
  [/\bluminoso\b/gi,      'iluminado'],
  [/\bluminosa\b/gi,      'iluminada'],
  [/\bcuenta con\b/gi,    'dispone de'],
  [/\bcuentan con\b/gi,   'disponen de'],
  [/\bademás\b/gi,        'asimismo'],
  [/\bideal para\b/gi,    'apto para'],
  [/\bexcelente\b/gi,     'muy buena'],
  [/\bexcelentes\b/gi,    'muy buenas'],
  [/\bubicado\b/gi,       'situado'],
  [/\bubicada\b/gi,       'situada'],
  [/\bse destaca\b/gi,    'sobresale'],
  [/\bse encuentra\b/gi,  'se halla'],
  [/\bgran\b/gi,          'importante'],
  [/\bposee\b/gi,         'tiene'],
  [/\bbrinda\b/gi,        'ofrece'],
];

// Lineas administrativas del corredor/inmobiliaria que se ELIMINAN de la descripcion.
// Solo matchean lineas que ARRANCAN con estas palabras clave (no toca el cuerpo).
const ES_LINEA_CORREDOR = (linea) =>
  /^(corredor|colegiado|matr[ií]cula|cucicba|cmcpsi|cpi\b|contacto|responsable|martiller|inmobiliaria|propiedad de|a cargo de|atiende)\b/i.test(linea.trim());

function aplicarSinonimos(texto) {
  let out = texto;
  for (const [re, rep] of SINONIMOS) out = out.replace(re, rep);
  return out;
}

function limpiar(texto) {
  return texto
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function reescribir(original) {
  const texto = limpiar(original || '');
  if (texto.length < 40) return null;

  // 1) ELIMINAR las lineas del corredor (no se reagregan a ningun lado).
  const lineas = texto.split('\n');
  const cuerpoLineas = lineas.filter(l => !ES_LINEA_CORREDOR(l));

  // 2) Agrupar el cuerpo en parrafos (bloques separados por linea en blanco).
  const cuerpo = cuerpoLineas.join('\n');
  let parrafos = cuerpo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  // 3) Reordenar conservador: el 1er parrafo (resumen) queda; el resto rota una posicion.
  if (parrafos.length >= 3) {
    const primero = parrafos[0];
    const resto = parrafos.slice(1);
    resto.push(resto.shift());
    parrafos = [primero, ...resto];
  }

  // 4) Sinonimos.
  parrafos = parrafos.map(aplicarSinonimos);

  let resultado = limpiar(parrafos.join('\n\n'));

  if (resultado === texto || resultado.length < 30) return null;
  return resultado;
}

async function main() {
  console.log('🚀 Reescritura conservadora de descripciones (sin IA, sin corredor)...\n');

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, descripcion, descripcion_reescrita')
    .not('descripcion', 'is', null);

  const pendientes = (propiedades || []).filter(
    p => (!p.descripcion_reescrita || p.descripcion_reescrita.trim() === '') &&
         p.descripcion && p.descripcion.trim() !== ''
  );

  console.log(`Total con descripción: ${propiedades.length}`);
  console.log(`Pendientes de reescribir: ${pendientes.length}\n`);

  let ok = 0;
  let skip = 0;

  for (const prop of pendientes) {
    const nueva = reescribir(prop.descripcion);
    if (!nueva) {
      console.log(`[${ok + skip + 1}/${pendientes.length}] id ${prop.id} ⏭ sin cambios`);
      skip++;
      continue;
    }
    await supabase
      .from('propiedades')
      .update({ descripcion_reescrita: nueva })
      .eq('id', prop.id);
    console.log(`[${ok + skip + 1}/${pendientes.length}] id ${prop.id} ✅ reescrita`);
    ok++;
  }

  console.log(`\n✅ Listo. Reescritas: ${ok} | Sin cambios: ${skip}`);
}

main();