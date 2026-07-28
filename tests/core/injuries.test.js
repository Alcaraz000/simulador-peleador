import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  LESIONES, tirarLesion, aplicarLesion, recuperar, curarConDinero, puedePelear, factorEfectividad,
} from '../../src/core/injuries.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de lesiones', () => {
  it('tiene al menos seis lesiones con severidad 1 a 3', () => {
    expect(LESIONES.length).toBeGreaterThanOrEqual(6);
    const severidades = new Set(LESIONES.map((l) => l.severidad));
    expect([...severidades].sort()).toEqual([1, 2, 3]);
  });

  it('las mas graves duran mas y cuestan mas', () => {
    const leve = LESIONES.find((l) => l.severidad === 1);
    const grave = LESIONES.find((l) => l.severidad === 3);
    expect(grave.semanas).toBeGreaterThan(leve.semanas);
    expect(grave.costo).toBeGreaterThan(leve.costo);
  });

  // v7 ("contá la recuperación en semanas, no en bloques"): las leves/
  // moderadas tienen que ser creíbles en semanas (nunca meses y meses) — el
  // propio catálogo documenta el porqué de cada número.
  it('las leves y moderadas duran semanas creibles (nunca meses y meses)', () => {
    for (const lesion of LESIONES.filter((l) => l.severidad <= 2)) {
      expect(lesion.semanas).toBeLessThanOrEqual(16);
    }
  });
});

describe('tirarLesion', () => {
  it('es determinista', () => {
    const a = tirarLesion(createRng(5), { peleador: jugador(), contexto: 'pelea', danoRecibido: 80 });
    const b = tirarLesion(createRng(5), { peleador: jugador(), contexto: 'pelea', danoRecibido: 80 });
    expect(a).toEqual(b);
  });

  it('casi nunca lesiona en entrenamiento', () => {
    let lesiones = 0;
    for (let s = 1; s <= 100; s++) {
      if (tirarLesion(createRng(s), { peleador: jugador(), contexto: 'entrenamiento' })) lesiones++;
    }
    expect(lesiones).toBeLessThan(15);
  });

  it('lesiona mas seguido cuanto mas dano se recibio', () => {
    const contar = (dano) => {
      let n = 0;
      for (let s = 1; s <= 100; s++) {
        if (tirarLesion(createRng(s), { peleador: jugador(), contexto: 'pelea', danoRecibido: dano })) n++;
      }
      return n;
    };
    expect(contar(95)).toBeGreaterThan(contar(10));
  });

  it('la disciplina personal alta protege', () => {
    const contar = (disciplinaPersonal) => {
      let n = 0;
      for (let s = 1; s <= 100; s++) {
        const p = jugador();
        p.especiales = { ...p.especiales, disciplinaPersonal };
        if (tirarLesion(createRng(s), { peleador: p, contexto: 'pelea', danoRecibido: 70 })) n++;
      }
      return n;
    };
    expect(contar(95)).toBeLessThan(contar(15));
  });

  it('devuelve una lesion con semanas restantes', () => {
    let lesion = null;
    for (let s = 1; s <= 200 && !lesion; s++) {
      lesion = tirarLesion(createRng(s), { peleador: jugador(), contexto: 'pelea', danoRecibido: 99 });
    }
    expect(lesion).toBeTruthy();
    expect(lesion.semanasRestantes).toBeGreaterThan(0);
    expect(lesion.texto).toBeTruthy();
  });
});

describe('aplicarLesion', () => {
  it('no muta al peleador original y deja la lesion puesta en la copia', () => {
    const p = jugador();
    const lesion = { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, semanasRestantes: 4, costo: 5000, texto: 'x' };
    const nuevo = aplicarLesion(p, lesion);
    expect(p.estado.lesion).toBeNull();
    expect(nuevo.estado.lesion.id).toBe('ceja');
    expect(nuevo).not.toBe(p);
  });
});

describe('recuperar', () => {
  it('descuenta semanas y cura al llegar a cero', () => {
    let p = aplicarLesion(jugador(), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 26000, texto: 'x',
    });
    let paso = recuperar(p, { semanas: 6 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion.semanasRestantes).toBe(4);
    paso = recuperar(paso.peleador, { semanas: 6 });
    expect(paso.curada).toBe(true);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  // v7: el tic real de la carrera (career.js, avanzarBloque) descuenta 52
  // semanas por bloque (siempre, ver ETAPAS) — una lesión leve o moderada
  // (bien por debajo de 52) ya cura ENTERA en el primer tic después de
  // sufrida, no en dos como antes con `bloques:1`.
  it('una lesion leve o moderada cura entera en el primer tic de un bloque (52 semanas)', () => {
    let p = aplicarLesion(jugador(), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 26000, texto: 'x',
    });
    const paso = recuperar(p, { semanas: 52 });
    expect(paso.curada).toBe(true);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  it('sin lesion no hace nada', () => {
    const paso = recuperar(jugador(), { semanas: 3 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion).toBeNull();
  });
});

describe('curarConDinero', () => {
  it('cura al instante si la reduccion del 90% deja cero semanas', () => {
    let p = aplicarLesion(jugador({ dinero: 100000 }), {
      id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, semanasRestantes: 4, costo: 8000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(true);
    expect(paso.gasto).toBe(8000);
    expect(paso.peleador.dinero).toBe(92000);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  // v7 (pedido textual: "reducir los tiempos de recuperación en un -90%",
  // no necesariamente a cero): una lesión grave (rodilla, 64 semanas) queda
  // con un resto tras la cirugía — pero ese resto (≈6 semanas) ya cae bien
  // por debajo del próximo tic de 52, así que en los hechos le ahorra al
  // jugador el bloque entero de ofertas perdidas que le hubiese costado sin
  // pagar.
  it('en una lesion grave, reduce el resto en un 90% en vez de curar del todo', () => {
    let p = aplicarLesion(jugador({ dinero: 200000 }), {
      id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, semanasRestantes: 64, costo: 85000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(true);
    expect(paso.gasto).toBe(85000);
    expect(paso.peleador.estado.lesion).not.toBeNull();
    expect(paso.peleador.estado.lesion.semanasRestantes).toBe(6);
    expect(paso.peleador.estado.lesion.semanasRestantes).toBeLessThan(52);
  });

  it('falla si no alcanza y no cobra nada', () => {
    let p = aplicarLesion(jugador({ dinero: 100 }), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 26000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(false);
    expect(paso.gasto).toBe(0);
    expect(paso.peleador.dinero).toBe(100);
    expect(paso.peleador.estado.lesion).not.toBeNull();
  });
});

// Corrección del coordinador (segunda ronda): el usuario fue textual —
// "hasta no estar recuperado de una lesión, no puede aparecer una pelea
// nueva" — sin matices de severidad. Antes solo bloqueaba grave (severidad
// 3); ahora CUALQUIER lesión activa bloquea, sea leve, moderada o grave.
describe('puedePelear', () => {
  it('permite pelear sano', () => {
    expect(puedePelear(jugador())).toBe(true);
  });

  it('bloquea con cualquier lesion activa, sin importar la severidad', () => {
    for (const severidad of [1, 2, 3]) {
      const lesionado = aplicarLesion(jugador(), {
        id: 'x', nombre: 'x', severidad, semanasRestantes: 4, costo: 1, texto: 'x',
      });
      expect(puedePelear(lesionado)).toBe(false);
    }
  });

  it('en cuanto se cura, vuelve a permitir pelear', () => {
    const lesionado = aplicarLesion(jugador(), {
      id: 'ceja', nombre: 'Ceja', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x',
    });
    const { peleador: curado } = recuperar(lesionado, { semanas: 52 });
    expect(puedePelear(curado)).toBe(true);
  });
});

// Sistema 1 (feedback del usuario): "¿Qué efecto tienen las lesiones?
// Parecería que no afecta en nada". `factorEfectividad` es el multiplicador
// real que castiga el rendimiento en pelea de un peleador lesionado (lo usa
// `efectividad` en fight.js): antes era un 0.88 fijo que además solo pegaba
// sobre la mitad de la fórmula (~6% total, invisible). Ahora escala con la
// severidad y pesa sobre el total.
describe('factorEfectividad', () => {
  it('sin lesion, no penaliza nada', () => {
    expect(factorEfectividad(null)).toBe(1);
  });

  it('cuanto mas grave la lesion, mayor la penalizacion', () => {
    const leve = factorEfectividad({ severidad: 1 });
    const moderada = factorEfectividad({ severidad: 2 });
    expect(leve).toBeLessThan(1);
    expect(moderada).toBeLessThan(leve);
  });

  it('la penalizacion es real, no cosmética (al menos un 10% para una lesion moderada)', () => {
    expect(factorEfectividad({ severidad: 2 })).toBeLessThanOrEqual(0.9);
  });
});
