// ─── LISTING ──────────────────────────────────────────────────────────────────
async function scrapearListado(page, operacion, urlBase) {
  const propiedades = [];
  const urlsVistas = new Set(); // para detectar cuando ZonaProp repite la pagina

  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    const url = urlPagina(urlBase, pag);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await delay(2500, 5000);
      await scrollHumano(page);

      const cantCards = await page.evaluate(() =>
        document.querySelectorAll('[class*="postingsList-module__card-container"]').length
      );

      if (cantCards === 0) { console.log(`  ⚠️ Sin resultados en pág ${pag}.`); break; }

      const items = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[class*="postingsList-module__card-container"]')];

        return cards.map(card => {
          // Precio
          const precioTexto = card.querySelector('h2[data-qa="POSTING_CARD_PRICE"]')?.innerText?.trim() || null;

          // Dirección
          const direccion = card.querySelector('h4[class*="postingLocations-module__location-address"]')?.innerText?.trim() || null;

          // Link
          const linkEl  = card.querySelector('a[href*="/propiedades/"]');
          const href     = linkEl?.getAttribute('href') || null;

          // Título — descripción corta visible en card
          const titulo = card.querySelector('[class*="postingCard-module__posting-description"]')?.innerText?.trim()
            || direccion
            || 'Campo';

          // Features
          const featSpans  = [...card.querySelectorAll('span[class*="postingMainFeatures-module__posting-main-features-span"]')];
          const featsText  = featSpans.map(f => f.innerText?.trim()).filter(Boolean);
          const dormitoriosText = featsText.find(f => f.match(/dorm/i))   || null;
          const banosText       = featsText.find(f => f.match(/ba[ñn]/i)) || null;
          const superficieText  = featsText.find(f => f.match(/m²|m2|ha/i))  || null;

          return { titulo, precioTexto, direccion, dormitoriosText, banosText, superficieText, href };
        }).filter(i => i.href);
      });

      if (items.length === 0) break;

      // Normalizar URLs de esta pagina
      const urlsEstaPagina = items.map(i =>
        i.href?.startsWith('http') ? i.href : `https://www.zonaprop.com.ar${i.href}`
      );

      // Si TODAS las urls de esta pagina ya las vimos antes, ZonaProp repitio
      // el listado (no hay mas paginas reales). Cortamos.
      const todasRepetidas = urlsEstaPagina.every(u => urlsVistas.has(u));
      if (todasRepetidas) {
        console.log(`  🔁 Pág ${pag} repite resultados anteriores — fin del listado.`);
        break;
      }

      console.log(`  📄 ${CIUDAD.nombre}/${operacion} pág ${pag}: ${items.length} campos`);

      for (const item of items) {
        const urlFull = item.href?.startsWith('http') ? item.href : `https://www.zonaprop.com.ar${item.href}`;
        if (urlsVistas.has(urlFull)) continue; // ya estaba, no la dupliques en la lista
        urlsVistas.add(urlFull);

        propiedades.push({
          titulo:        item.titulo,
          precio:        limpiarPrecio(item.precioTexto),
          moneda:        item.precioTexto?.includes('USD') ? 'USD' : 'ARS',
          direccion:     item.direccion,
          dormitorios:   limpiarInt(item.dormitoriosText),
          banos:         limpiarInt(item.banosText),
          superficie_m2: limpiarSuperficie(item.superficieText),
          url_origen:    urlFull,
        });
      }

      await delay(3000, 6000);

    } catch (e) {
      console.log(`  ⚠️ Error pág ${pag}: ${e.message}`);
      await delay(15000, 20000);
      break;
    }
  }

  return propiedades;
}