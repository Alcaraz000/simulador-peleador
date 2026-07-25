import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { MOVIDAS, crearNegociacion, jugarMovida, resultadoNegociacion } from '../../src/core/negotiation.js';

const oferta = { id: 'of_1', bolsa: 8000, enJuego: 'Título regional' };

describe('movidas', () => {
  it('define las cuatro movidas', () => {
    expect(Object.keys(MOVIDAS).sort()).toEqual(['apretar', 'cerrar', 'masPlata', 'taquilla']);
  });

  it('cerrar no tiene riesgo y apretar es la mas riesgosa', () => {
    expect(MOVIDAS.cerrar.riesgoBase).toBe(0);
    expect(MOVIDAS.apretar.riesgoBase).toBeGreaterThan(MOVIDAS.masPlata.riesgoBase);
  });
});

describe('crearNegociacion', () => {
  it('arranca con la bolsa de la oferta y paciencia llena', () => {
    const n = crearNegociacion(oferta);
    expect(n.bolsa).toBe(8000);
    expect(n.bolsaInicial).toBe(8000);
    expect(n.paciencia).toBe(100);
    expect(n.cerrada).toBe(false);
    expect(n.perdida).toBe(false);
  });

  it('el super manager baja el riesgo', () => {
    expect(crearNegociacion(oferta, { tieneManager: true }).reduccionRiesgo).toBeGreaterThan(0);
    expect(crearNegociacion(oferta, { tieneManager: false }).reduccionRiesgo).toBe(0);
  });
});

describe('jugarMovida', () => {
  it('cerrar termina la negociacion sin riesgo', () => {
    const { negociacion, evento } = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(1));
    expect(negociacion.cerrada).toBe(true);
    expect(negociacion.perdida).toBe(false);
    expect(evento.tipo).toBe('cierra');
  });

  it('pedir mas plata a veces sube la bolsa', () => {
    let subio = false;
    for (let s = 1; s <= 30 && !subio; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(s));
      if (negociacion.bolsa > 8000) subio = true;
    }
    expect(subio).toBe(true);
  });

  it('cada movida arriesgada baja la paciencia', () => {
    const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(2));
    expect(negociacion.paciencia).toBeLessThan(100);
  });

  it('apretar puede hacer que el promotor se levante', () => {
    let perdidas = 0;
    for (let s = 1; s <= 40; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'apretar', createRng(s));
      if (negociacion.perdida) perdidas++;
    }
    expect(perdidas).toBeGreaterThan(10);
  });

  it('el manager reduce las perdidas', () => {
    const contar = (tieneManager) => {
      let n = 0;
      for (let s = 1; s <= 60; s++) {
        const { negociacion } = jugarMovida(crearNegociacion(oferta, { tieneManager }), 'apretar', createRng(s));
        if (negociacion.perdida) n++;
      }
      return n;
    };
    expect(contar(true)).toBeLessThan(contar(false));
  });

  it('taquilla agrega una condicion cuando el promotor acepta', () => {
    let conCondicion = false;
    for (let s = 1; s <= 40 && !conCondicion; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'taquilla', createRng(s));
      if (negociacion.condiciones.includes(MOVIDAS.taquilla.mejora.condicion)) conCondicion = true;
    }
    expect(conCondicion).toBe(true);
  });

  it('no se puede seguir jugando una negociacion cerrada', () => {
    const cerrada = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(3)).negociacion;
    const { negociacion, evento } = jugarMovida(cerrada, 'apretar', createRng(4));
    expect(negociacion).toEqual(cerrada);
    expect(evento).toBeNull();
  });

  it('rechaza una movida desconocida', () => {
    expect(() => jugarMovida(crearNegociacion(oferta), 'inventada', createRng(5))).toThrow(/inventada/);
  });

  it('no muta la negociacion original', () => {
    const n = crearNegociacion(oferta);
    const antes = JSON.stringify(n);
    jugarMovida(n, 'masPlata', createRng(6));
    expect(JSON.stringify(n)).toBe(antes);
  });
});

describe('resultadoNegociacion', () => {
  it('al perder devuelve la bolsa inicial degradada', () => {
    let n = crearNegociacion(oferta);
    let guardia = 0;
    while (!n.perdida && guardia < 50) {
      guardia += 1;
      n = jugarMovida(n, 'apretar', createRng(guardia)).negociacion;
    }
    const r = resultadoNegociacion(n);
    expect(r.perdida).toBe(true);
    expect(r.bolsa).toBeLessThan(8000);
  });

  it('al cerrar devuelve la bolsa negociada', () => {
    const n = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(7)).negociacion;
    const r = resultadoNegociacion(n);
    expect(r.perdida).toBe(false);
    expect(r.bolsa).toBe(8000);
  });
});
