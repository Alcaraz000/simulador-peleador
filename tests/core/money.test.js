import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  STAFF, LUJOS, catalogo, comprar, tieneStaff, bonusCartas, cobrarSponsor, puedeComprarAlgo,
} from '../../src/core/money.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo', () => {
  it('define cinco de staff y cinco lujos', () => {
    expect(STAFF).toHaveLength(5);
    expect(LUJOS).toHaveLength(5);
  });

  it('todos tienen precio positivo e id unico', () => {
    const ids = [...STAFF, ...LUJOS].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of [...STAFF, ...LUJOS]) expect(item.precio).toBeGreaterThan(0);
  });

  it('marca lo comprado y lo que no alcanza', () => {
    const yo = jugador({ dinero: STAFF[0].precio, staff: [STAFF[1].id] });
    const c = catalogo(yo);
    expect(c.staff.find((i) => i.id === STAFF[1].id).comprado).toBe(true);
    expect(c.staff.find((i) => i.id === STAFF[0].id).alcanza).toBe(true);
    const caro = c.staff.concat(c.lujos).find((i) => i.precio > yo.dinero);
    if (caro) expect(caro.alcanza).toBe(false);
  });
});

describe('comprar', () => {
  it('descuenta la plata y suma el staff', () => {
    const item = STAFF[0];
    const paso = comprar(jugador({ dinero: item.precio + 100 }), item.id);
    expect(paso.ok).toBe(true);
    expect(paso.jugador.dinero).toBe(100);
    expect(paso.jugador.staff).toContain(item.id);
    expect(paso.texto).toBeTruthy();
  });

  it('un lujo suma fama y queda en la lista', () => {
    const item = LUJOS[0];
    const paso = comprar(jugador({ dinero: item.precio, fama: 10 }), item.id);
    expect(paso.ok).toBe(true);
    expect(paso.jugador.lujos).toContain(item.id);
    expect(paso.jugador.fama).toBeGreaterThan(10);
  });

  it('falla si no alcanza y no cobra', () => {
    const item = STAFF[0];
    const paso = comprar(jugador({ dinero: 0 }), item.id);
    expect(paso.ok).toBe(false);
    expect(paso.jugador.dinero).toBe(0);
    expect(paso.jugador.staff).not.toContain(item.id);
  });

  it('no permite comprar dos veces lo mismo', () => {
    const item = STAFF[0];
    const yo = jugador({ dinero: item.precio * 3, staff: [item.id] });
    const paso = comprar(yo, item.id);
    expect(paso.ok).toBe(false);
    expect(paso.jugador.dinero).toBe(yo.dinero);
  });

  it('rechaza un id desconocido', () => {
    expect(() => comprar(jugador({ dinero: 999999 }), 'inventado')).toThrow(/inventado/);
  });

  it('no muta el jugador original', () => {
    const yo = jugador({ dinero: 999999 });
    const antes = JSON.stringify(yo);
    comprar(yo, STAFF[0].id);
    expect(JSON.stringify(yo)).toBe(antes);
  });
});

// Pedido 7 (v9, "quiero que brille [el botón de la tienda] cuando el
// jugador pueda comprar algo con el dinero que tiene, y no sea algo ya
// comprado"): la comprobación barata que alimenta ese brillo.
describe('puedeComprarAlgo', () => {
  it('true si alcanza para algo que todavía no tiene', () => {
    expect(puedeComprarAlgo(jugador({ dinero: STAFF[0].precio }))).toBe(true);
  });

  it('false sin plata para nada', () => {
    expect(puedeComprarAlgo(jugador({ dinero: 0 }))).toBe(false);
  });

  it('false si lo único que podría pagar ya lo tiene comprado', () => {
    const yo = jugador({ dinero: STAFF[0].precio, staff: [STAFF[0].id], lujos: [] });
    // Con exactamente la plata del ítem más barato (y nada más alcanzable),
    // si ya lo tiene, no queda nada nuevo para comprar.
    const soloEseAlcanza = STAFF.every((s) => s.id === STAFF[0].id || s.precio > yo.dinero)
      && LUJOS.every((l) => l.precio > yo.dinero);
    expect(soloEseAlcanza).toBe(true);
    expect(puedeComprarAlgo(yo)).toBe(false);
  });

  it('true si con lo comprado todavía queda algo más barato sin comprar', () => {
    const yo = jugador({ dinero: STAFF[1].precio, staff: [STAFF[0].id] });
    expect(puedeComprarAlgo(yo)).toBe(true);
  });

  it('true con plata de sobra para comprar cualquier cosa (isla privada, el más caro)', () => {
    expect(puedeComprarAlgo(jugador({ dinero: 999999999 }))).toBe(true);
  });

  it('no muta el jugador', () => {
    const yo = jugador({ dinero: STAFF[0].precio });
    const antes = JSON.stringify(yo);
    puedeComprarAlgo(yo);
    expect(JSON.stringify(yo)).toBe(antes);
  });
});

describe('tieneStaff', () => {
  it('detecta el staff contratado', () => {
    expect(tieneStaff(jugador({ staff: ['entrenador'] }), 'entrenador')).toBe(true);
    expect(tieneStaff(jugador(), 'entrenador')).toBe(false);
  });
});

describe('bonusCartas', () => {
  it('sin entrenador no da bonus', () => {
    expect(bonusCartas(jugador())).toEqual({ opcionesExtra: 0, bonusValor: 0 });
  });

  it('con entrenador da mas opciones y mejores numeros', () => {
    const bonus = bonusCartas(jugador({ staff: ['entrenador'] }));
    expect(bonus.opcionesExtra).toBeGreaterThan(0);
    expect(bonus.bonusValor).toBeGreaterThan(0);
  });
});

describe('cobrarSponsor', () => {
  it('sin fama no aparece sponsor', () => {
    let hubo = false;
    for (let s = 1; s <= 40 && !hubo; s++) {
      if (cobrarSponsor(jugador({ fama: 0 }), createRng(s))) hubo = true;
    }
    expect(hubo).toBe(false);
  });

  it('con mucha fama aparece seguido y paga', () => {
    let cobros = 0;
    for (let s = 1; s <= 40; s++) {
      const paso = cobrarSponsor(jugador({ fama: 90 }), createRng(s));
      if (paso) {
        cobros++;
        expect(paso.monto).toBeGreaterThan(0);
        expect(paso.jugador.dinero).toBe(paso.monto);
        expect(paso.texto).toBeTruthy();
      }
    }
    expect(cobros).toBeGreaterThan(10);
  });
});
