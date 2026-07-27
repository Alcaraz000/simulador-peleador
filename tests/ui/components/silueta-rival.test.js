import { describe, it, expect, vi } from 'vitest';
import { dibujarSilueta } from '../../../src/ui/components/silueta-rival.js';
import { POSTURAS } from '../../../src/core/fight-interactive.js';

// zonas en el mismo formato que devuelve `abrirGolpeDeGracia` (Task 4.4):
// un array de 3 con {id, nombre, estado}.
function zonasDe(posturaId) {
  const { zonas } = POSTURAS[posturaId];
  return Object.entries(zonas).map(([id, estado]) => ({
    id, nombre: id === 'menton' ? 'Mentón' : id === 'sien' ? 'Sien' : 'Hígado', estado,
  }));
}

const POSTURA_IDS = Object.keys(POSTURAS);

// El cuerpo (foto del boxeador) ocupa aproximadamente esta franja horizontal
// en las tres fotos (medido a mano sobre cubriendo-{menton,sien,higado}.webp,
// 640x487: el brazo/guante más ancho de las tres llega hasta x=145..495; acá
// se deja margen extra). Las etiquetas deben quedar siempre afuera de esta
// franja para no taparlo.
const CUERPO_X_MIN = 112;
const CUERPO_X_MAX = 508;

function parseViewBox(svg) {
  const [x, y, w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  return { x, y, w, h };
}

function rectsDeEtiquetas(svg) {
  return [...svg.querySelectorAll('[data-zona] rect')];
}

function rectBox(rect) {
  return {
    x: Number(rect.getAttribute('x')),
    y: Number(rect.getAttribute('y')),
    w: Number(rect.getAttribute('width')),
    h: Number(rect.getAttribute('height')),
  };
}

function seSolapan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe('dibujarSilueta', () => {
  it('devuelve un unico SVG', () => {
    const svg = dibujarSilueta({ postura: 'guardia_alta', zonas: zonasDe('guardia_alta'), onElegirZona: () => {} });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('dibuja el cuerpo aislado de la logica de zonas, en su propio grupo', () => {
    const svg = dibujarSilueta({ postura: 'guardia_alta', zonas: zonasDe('guardia_alta'), onElegirZona: () => {} });
    expect(svg.querySelector('[data-parte="cuerpo"]')).toBeTruthy();
  });

  it.each(POSTURA_IDS)('postura %s: dibuja las tres zonas con su estado', (posturaId) => {
    const svg = dibujarSilueta({ postura: posturaId, zonas: zonasDe(posturaId), onElegirZona: () => {} });
    const grupos = svg.querySelectorAll('[data-zona]');
    expect(grupos).toHaveLength(3);
    for (const id of ['menton', 'sien', 'higado']) {
      const grupo = svg.querySelector(`[data-zona="${id}"]`);
      expect(grupo).toBeTruthy();
      expect(grupo.dataset.estado).toBe(POSTURAS[posturaId].zonas[id]);
    }
  });

  it.each(POSTURA_IDS)('postura %s: las etiquetas quedan dentro del viewBox', (posturaId) => {
    const svg = dibujarSilueta({ postura: posturaId, zonas: zonasDe(posturaId), onElegirZona: () => {} });
    const { w, h } = parseViewBox(svg);
    for (const rect of rectsDeEtiquetas(svg)) {
      const box = rectBox(rect);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(w);
      expect(box.y + box.h).toBeLessThanOrEqual(h);
    }
  });

  it.each(POSTURA_IDS)('postura %s: ninguna etiqueta se solapa con la franja del cuerpo', (posturaId) => {
    const svg = dibujarSilueta({ postura: posturaId, zonas: zonasDe(posturaId), onElegirZona: () => {} });
    for (const rect of rectsDeEtiquetas(svg)) {
      const box = rectBox(rect);
      const dentroDeFranjaCuerpo = box.x < CUERPO_X_MAX && box.x + box.w > CUERPO_X_MIN;
      expect(dentroDeFranjaCuerpo).toBe(false);
    }
  });

  it.each(POSTURA_IDS)('postura %s: las etiquetas no se solapan entre si', (posturaId) => {
    const svg = dibujarSilueta({ postura: posturaId, zonas: zonasDe(posturaId), onElegirZona: () => {} });
    const cajas = rectsDeEtiquetas(svg).map(rectBox);
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        expect(seSolapan(cajas[i], cajas[j])).toBe(false);
      }
    }
  });

  it('clickear una zona dispara onElegirZona con su id', () => {
    const onElegirZona = vi.fn();
    const svg = dibujarSilueta({ postura: 'guardia_alta', zonas: zonasDe('guardia_alta'), onElegirZona });
    svg.querySelector('[data-zona="higado"]').dispatchEvent(new Event('click', { bubbles: true }));
    expect(onElegirZona).toHaveBeenCalledWith('higado');
  });

  it('cada zona es su propio elemento clickeable (no se pisan los handlers)', () => {
    const llamadas = [];
    const svg = dibujarSilueta({
      postura: 'manos_abajo', zonas: zonasDe('manos_abajo'), onElegirZona: (id) => llamadas.push(id),
    });
    svg.querySelector('[data-zona="menton"]').dispatchEvent(new Event('click', { bubbles: true }));
    svg.querySelector('[data-zona="sien"]').dispatchEvent(new Event('click', { bubbles: true }));
    expect(llamadas).toEqual(['menton', 'sien']);
  });

  // La foto que se muestra tiene que ser coherente con qué zona está
  // `tapado` en esa postura (pedido textual v7): si el mentón está tapado,
  // se ve al rival cubriéndose el mentón. Dos posturas (manos_abajo y
  // cubre_un_lado) tapan la sien y comparten la misma foto — no hay una
  // cuarta foto disponible, y ambas leen "sien: tapado".
  describe('la foto del cuerpo es coherente con la zona tapada', () => {
    it.each([
      ['guardia_alta', 'menton'],
      ['manos_abajo', 'sien'],
      ['cubre_un_lado', 'sien'],
      ['contra_cuerdas', 'higado'],
    ])('postura %s usa la foto de "cubriendo-%s"', (posturaId, zonaTapada) => {
      // Guarda contra un typo en el propio mapeo: confirma que esa zona
      // realmente es la tapada según POSTURAS antes de exigir la foto.
      expect(POSTURAS[posturaId].zonas[zonaTapada]).toBe('tapado');

      const svg = dibujarSilueta({ postura: posturaId, zonas: zonasDe(posturaId), onElegirZona: () => {} });
      const imagen = svg.querySelector('[data-parte="cuerpo"] image');
      expect(imagen).toBeTruthy();
      expect(imagen.getAttribute('href')).toMatch(new RegExp(`cubriendo-${zonaTapada}`, 'i'));
    });
  });

  it('la imagen del cuerpo es decorativa (aria-hidden), la info ya la da cada zona', () => {
    const svg = dibujarSilueta({ postura: 'guardia_alta', zonas: zonasDe('guardia_alta'), onElegirZona: () => {} });
    expect(svg.querySelector('[data-parte="cuerpo"]').getAttribute('aria-hidden')).toBe('true');
  });
});
