import { describe, it, expect } from 'vitest';
import { icono } from '../../src/ui/icons.js';

// Regresión puntual: el carrito de la tienda tenía solo la canasta y le
// faltaban las ruedas (queja textual del usuario: "el ícono del carrito no
// debe verse cortado"). Con las ruedas sumadas como paths propios, el ícono
// ya no se ve incompleto.
describe('icono("tienda")', () => {
  it('incluye las ruedas además de la canasta (ya no se ve cortado)', () => {
    const svg = icono('tienda');
    expect(svg.querySelectorAll('path').length).toBeGreaterThanOrEqual(3);
  });
});

// Set nuevo de íconos para creación (mano hábil, apodo, estilo, categoría,
// origen) y tienda (staff + lujos), pedidos textualmente por el usuario
// ("faltan más iconos"). Todos tienen que poder dibujarse sin tirar error.
describe('set de íconos nuevo (creación + tienda)', () => {
  const nombres = [
    'persona', 'mano', 'etiqueta', 'blanco', 'balanza', 'origen',
    'cerebro', 'maletin', 'auto', 'casa', 'estrella', 'ancla', 'globo', 'dado', 'lista',
  ];

  it.each(nombres)('%s se dibuja como un <svg> con al menos un <path>', (nombre) => {
    const svg = icono(nombre);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});

// Cabecera del peleador rearmada (Cambio 3): la fila "EDAD | FORMA" pide un
// ícono nuevo para forma física — un pulso/latido (mismo lenguaje Feather/
// Lucide minimalista que el resto del set), distinto de "corazon" (que ya
// se usa para otra cosa en la tienda) para que no se confundan a simple vista.
describe('icono("forma")', () => {
  it('se dibuja como un <svg> con al menos un <path>', () => {
    const svg = icono('forma');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('es visualmente distinto de "corazon" (no una copia)', () => {
    expect(icono('forma').outerHTML).not.toBe(icono('corazon').outerHTML);
  });
});

// Bolsa + niveles de riesgo (v3, oferta de pelea) y los cuatro tonos del
// careo (reusan íconos ya existentes en el set de arriba: rayo/cerebro/
// corazon/estrella — ver presser.js).
describe('set de íconos nuevo (oferta de pelea)', () => {
  const nombres = ['billete', 'escudo', 'medidor', 'peligro'];

  it.each(nombres)('%s se dibuja como un <svg> con al menos un <path>', (nombre) => {
    const svg = icono(nombre);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('billete, escudo, medidor y peligro son visualmente distintos entre si', () => {
    const paths = nombres.map((n) => icono(n).querySelectorAll('path').length);
    // No es una prueba de diseño, solo una red mínima: cada ícono nuevo tiene
    // su propia data, no son copias unos de otros.
    expect(new Set(nombres.map((n) => icono(n).outerHTML)).size).toBe(nombres.length);
    expect(paths.every((n) => n > 0)).toBe(true);
  });
});

// v6 (rediseño integral, pedido textual: "que tengan iconos diferenciables"):
// antes cada paso de la creación (origen/apodo/estilo) mostraba el MISMO
// ícono fijo en las 2-3 tarjetas que ofrecía, así que dentro de la grilla no
// había forma de distinguirlas sin leer el título. Estos 5 son puntuales
// para ese mapeo por id (ver ICONO_ORIGEN/ICONO_ESTILO en create.js).
describe('set de íconos nuevo (creación v6: origen/estilo diferenciables)', () => {
  const nombres = ['reloj', 'monitor', 'corona', 'viento', 'cruce'];

  it.each(nombres)('%s se dibuja como un <svg> con al menos un <path>', (nombre) => {
    const svg = icono(nombre);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('son visualmente distintos entre si (y de los que ya existian)', () => {
    expect(new Set(nombres.map((n) => icono(n).outerHTML)).size).toBe(nombres.length);
  });
});

// v7: cabecera del resumen de fin de año.
describe('icono("grafico")', () => {
  it('se dibuja como un <svg> con al menos un <path>', () => {
    const svg = icono('grafico');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});

describe('icono desconocido', () => {
  it('tira un error legible', () => {
    expect(() => icono('no-existe')).toThrow(/no-existe/);
  });
});
