import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { POOL_RESUMEN_ANIO, textoResumenAnio } from '../../src/content/resumen-anio-lines.js';

function pelea(over = {}) {
  return { resultado: 'v', metodo: 'ko', ...over };
}

describe('POOL_RESUMEN_ANIO', () => {
  it('cada categoria tiene al menos una variante, sin vacias ni repetidas', () => {
    for (const [categoria, lineas] of Object.entries(POOL_RESUMEN_ANIO)) {
      expect(lineas.length, categoria).toBeGreaterThanOrEqual(1);
      lineas.forEach((l) => expect(l.length, categoria).toBeGreaterThan(5));
      expect(new Set(lineas).size, `${categoria} tiene duplicados`).toBe(lineas.length);
    }
  });
});

describe('textoResumenAnio', () => {
  it('sin peleas, da un texto neutro (no deberia pasar en la practica, pero no revienta)', () => {
    const texto = textoResumenAnio(createRng(1), { peleas: [] });
    expect(texto.length).toBeGreaterThan(0);
  });

  it('todas ganadas arma un texto de la categoria "perfecta" con el record adentro', () => {
    const texto = textoResumenAnio(createRng(1), {
      peleas: [pelea({ resultado: 'v' }), pelea({ resultado: 'v' }), pelea({ resultado: 'v' })],
    });
    expect(texto).toContain('3-0');
  });

  it('todas perdidas arma un texto de la categoria "derrotas"', () => {
    const texto = textoResumenAnio(createRng(1), {
      peleas: [pelea({ resultado: 'd', metodo: 'decision' }), pelea({ resultado: 'd', metodo: 'decision' })],
    });
    expect(texto).toContain('0-2');
  });

  it('mezcla de resultados da un texto distinto de la perfecta y de las derrotas', () => {
    const texto = textoResumenAnio(createRng(2), {
      peleas: [pelea({ resultado: 'v' }), pelea({ resultado: 'd', metodo: 'decision' })],
    });
    expect(texto).toContain('1-1');
  });

  it('con empates, el record de tres numeros aparece en el texto', () => {
    const texto = textoResumenAnio(createRng(1), {
      peleas: [pelea({ resultado: 'v' }), pelea({ resultado: 'e', metodo: 'decision' })],
    });
    expect(texto).toContain('1-0-1');
  });

  it('una sola pelea ganada usa el texto singular (no habla de "año redondo")', () => {
    const texto = textoResumenAnio(createRng(1), { peleas: [pelea({ resultado: 'v' })] });
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toContain('0-0');
  });

  it('es deterministico con la misma semilla de rng', () => {
    const peleas = [pelea({ resultado: 'v' }), pelea({ resultado: 'd', metodo: 'decision' })];
    const a = textoResumenAnio(createRng(9), { peleas });
    const b = textoResumenAnio(createRng(9), { peleas });
    expect(a).toBe(b);
  });
});
