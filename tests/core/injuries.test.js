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
    expect(grave.bloques).toBeGreaterThan(leve.bloques);
    expect(grave.costo).toBeGreaterThan(leve.costo);
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

  it('devuelve una lesion con bloques restantes', () => {
    let lesion = null;
    for (let s = 1; s <= 200 && !lesion; s++) {
      lesion = tirarLesion(createRng(s), { peleador: jugador(), contexto: 'pelea', danoRecibido: 99 });
    }
    expect(lesion).toBeTruthy();
    expect(lesion.bloquesRestantes).toBeGreaterThan(0);
    expect(lesion.texto).toBeTruthy();
  });
});

describe('aplicarLesion', () => {
  it('no muta y baja la forma', () => {
    const p = jugador();
    const formaAntes = p.estado.forma;
    const lesion = { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, bloquesRestantes: 1, costo: 5000, texto: 'x' };
    const nuevo = aplicarLesion(p, lesion);
    expect(p.estado.lesion).toBeNull();
    expect(nuevo.estado.lesion.id).toBe('ceja');
    expect(nuevo.estado.forma).toBeLessThan(formaAntes);
  });
});

describe('recuperar', () => {
  it('descuenta bloques y cura al llegar a cero', () => {
    let p = aplicarLesion(jugador(), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    let paso = recuperar(p, { bloques: 1 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion.bloquesRestantes).toBe(1);
    paso = recuperar(paso.peleador, { bloques: 1 });
    expect(paso.curada).toBe(true);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  it('sin lesion no hace nada', () => {
    const paso = recuperar(jugador(), { bloques: 3 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion).toBeNull();
  });
});

describe('curarConDinero', () => {
  it('cura al instante si alcanza la plata', () => {
    let p = aplicarLesion(jugador({ dinero: 100000 }), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(true);
    expect(paso.gasto).toBe(20000);
    expect(paso.peleador.dinero).toBe(80000);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  it('falla si no alcanza y no cobra nada', () => {
    let p = aplicarLesion(jugador({ dinero: 100 }), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(false);
    expect(paso.gasto).toBe(0);
    expect(paso.peleador.dinero).toBe(100);
    expect(paso.peleador.estado.lesion).not.toBeNull();
  });
});

describe('puedePelear', () => {
  it('permite pelear sano o con lesion leve', () => {
    expect(puedePelear(jugador())).toBe(true);
    const leve = aplicarLesion(jugador(), { id: 'ceja', nombre: 'Ceja', severidad: 1, bloquesRestantes: 1, costo: 1, texto: 'x' });
    expect(puedePelear(leve)).toBe(true);
  });

  it('bloquea solo con lesion grave', () => {
    const grave = aplicarLesion(jugador(), { id: 'rodilla', nombre: 'Rodilla', severidad: 3, bloquesRestantes: 3, costo: 1, texto: 'x' });
    expect(puedePelear(grave)).toBe(false);
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
