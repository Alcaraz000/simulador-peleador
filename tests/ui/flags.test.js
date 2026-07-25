import { describe, it, expect } from 'vitest';
import { bandera } from '../../src/ui/flags.js';

const CODIGOS = ['AR', 'MX', 'US', 'ES', 'IT', 'JP'];

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

  it('no es una función pura con estado compartido que rompa entre llamadas (ids de clip únicos)', () => {
    const a = bandera('AR');
    const b = bandera('AR');
    const idA = a.querySelector('clipPath').id;
    const idB = b.querySelector('clipPath').id;
    expect(idA).not.toBe(idB);
  });
});
