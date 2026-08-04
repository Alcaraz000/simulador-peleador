import { describe, it, expect } from 'vitest';
import { bandera } from '../../src/ui/flags.js';
import { NACIONALIDADES } from '../../src/content/names.js';

// v18: de 6 a 12 países. La lista sale de NACIONALIDADES en vez de estar
// escrita a mano, así agregar un país sin su dibujante rompe el test de una
// (antes había que acordarse de tocar los dos archivos).
const CODIGOS = NACIONALIDADES.map((n) => n.codigo);

function contieneEmoji(texto) {
  return /\p{Extended_Pictographic}/u.test(texto);
}

describe('bandera', () => {
  it.each(CODIGOS)('devuelve un SVG para %s', (codigo) => {
    const nodo = bandera(codigo);
    expect(nodo.tagName.toLowerCase()).toBe('svg');
    expect(nodo.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('un código desconocido no rompe y devuelve igual un SVG', () => {
    expect(() => bandera('ZZ')).not.toThrow();
    const nodo = bandera('ZZ');
    expect(nodo.tagName.toLowerCase()).toBe('svg');
  });

  it('el SVG no contiene caracteres emoji, ni para los 6 códigos ni para uno desconocido', () => {
    for (const codigo of [...CODIGOS, 'ZZ']) {
      const nodo = bandera(codigo);
      expect(contieneEmoji(nodo.outerHTML)).toBe(false);
    }
  });

  it('respeta la relación 3:2 y el ancho pedido', () => {
    const nodo = bandera('AR', { ancho: 30 });
    expect(nodo.getAttribute('width')).toBe('30');
    expect(Number(nodo.getAttribute('height'))).toBeCloseTo(20, 0);
  });

  it('usa un ancho por defecto razonable cuando no se pide ninguno', () => {
    const nodo = bandera('IT');
    expect(Number(nodo.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(nodo.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('tiene esquinas redondeadas', () => {
    const nodo = bandera('JP');
    const clip = nodo.querySelector('clipPath rect');
    expect(clip).toBeTruthy();
    expect(Number(clip.getAttribute('rx'))).toBeGreaterThan(0);
  });

  it('cada código dibuja contenido visualmente distinto', () => {
    const svgs = CODIGOS.map((c) => bandera(c).outerHTML);
    expect(new Set(svgs).size).toBe(CODIGOS.length);
  });

  // Un país sin dibujante cae en `dibujarDesconocida` (el cuadrado gris con la
  // cruz): no rompe nada, pero en el ranking se ve como un error. Este test es
  // el que avisa si se agrega una nacionalidad y se olvida la bandera.
  //
  // El id del clipPath cambia en CADA llamada (contador global, para que dos
  // banderas en la misma pantalla no compartan clip), así que comparar el HTML
  // crudo daría "distinto" siempre — hay que normalizarlo antes.
  const sinIds = (codigo) => bandera(codigo).outerHTML.replace(/bandera-clip-\d+/g, 'clip');

  it('todas las nacionalidades del juego tienen su propio dibujante', () => {
    const desconocida = sinIds('ZZ');
    for (const codigo of CODIGOS) {
      expect(sinIds(codigo)).not.toBe(desconocida);
    }
  });

  it('no hay dos países que dibujen exactamente la misma bandera', () => {
    const dibujos = CODIGOS.map(sinIds);
    expect(new Set(dibujos).size).toBe(CODIGOS.length);
  });

  it('no es una función pura con estado compartido que rompa entre llamadas (ids de clip únicos)', () => {
    const a = bandera('AR');
    const b = bandera('AR');
    const idA = a.querySelector('clipPath').id;
    const idB = b.querySelector('clipPath').id;
    expect(idA).not.toBe(idB);
  });
});
