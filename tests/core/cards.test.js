import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_MEJORA } from '../../src/content/cards-improve.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import {
  formatearMods, repartirMejoras, aplicarCarta, resolverProbabilidad, porcentajesDe,
} from '../../src/core/cards.js';

const RAREZAS_VALIDAS = ['normal', 'rara', 'legendaria'];
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de mejoras', () => {
  it('tiene al menos catorce cartas con id unico', () => {
    expect(CARTAS_MEJORA.length).toBeGreaterThanOrEqual(14);
    const ids = CARTAS_MEJORA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta tiene titulo, texto y al menos un modificador', () => {
    for (const carta of CARTAS_MEJORA) {
      expect(carta.titulo.length).toBeGreaterThan(0);
      expect(carta.texto.length).toBeGreaterThan(0);
      expect(Object.keys(carta.mods).length).toBeGreaterThan(0);
    }
  });

  it('ninguna carta de la v1 toca el grappling', () => {
    for (const carta of CARTAS_MEJORA) {
      expect('grappling' in carta.mods).toBe(false);
    }
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_MEJORA) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('la mayoria de las cartas son normales', () => {
    const normales = CARTAS_MEJORA.filter((c) => c.rareza === 'normal');
    expect(normales.length).toBeGreaterThan(CARTAS_MEJORA.length / 2);
  });

  it('tiene entre 2 y 3 legendarias, potentes de verdad', () => {
    const legendarias = CARTAS_MEJORA.filter((c) => c.rareza === 'legendaria');
    expect(legendarias.length).toBeGreaterThanOrEqual(2);
    expect(legendarias.length).toBeLessThanOrEqual(3);
    for (const carta of legendarias) {
      const sumaPositivos = Object.values(carta.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      expect(sumaPositivos).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('formatearMods', () => {
  it('escribe los modificadores con signo y nombre largo', () => {
    expect(formatearMods({ velocidad: 3 })).toEqual(['+3 Velocidad']);
    expect(formatearMods({ potencia: -2 })).toEqual(['-2 Potencia']);
  });

  it('lista varios en orden de aparicion', () => {
    expect(formatearMods({ cardio: 5, potencia: -3 })).toEqual(['+5 Cardio', '-3 Potencia']);
  });

  it('usa nombre legible tambien para forma, fatiga y moral (no el id crudo)', () => {
    expect(formatearMods({ forma: 6 })).toEqual(['+6 Forma']);
    expect(formatearMods({ fatiga: -4 })).toEqual(['-4 Fatiga']);
    expect(formatearMods({ moral: 10 })).toEqual(['+10 Moral']);
  });
});

describe('repartirMejoras', () => {
  it('reparte tres cartas por defecto', () => {
    expect(repartirMejoras(createRng(1), { jugador: jugador(), etapa: 'profesional' })).toHaveLength(3);
  });

  it('no repite cartas', () => {
    const cartas = repartirMejoras(createRng(2), { jugador: jugador(), etapa: 'profesional' });
    expect(new Set(cartas.map((c) => c.id)).size).toBe(cartas.length);
  });

  it('nunca ofrece cartas de otra disciplina', () => {
    const cartas = repartirMejoras(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    for (const carta of cartas) {
      expect(carta.disciplinas === 'todas' || carta.disciplinas.includes('boxeo')).toBe(true);
    }
  });

  it('el entrenador de elite da una opcion mas', () => {
    const conEntrenador = repartirMejoras(createRng(4), {
      jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional',
    });
    expect(conEntrenador).toHaveLength(4);
  });

  it('el entrenador mejora los numeros positivos', () => {
    const sin = repartirMejoras(createRng(5), { jugador: jugador(), etapa: 'profesional' });
    const con = repartirMejoras(createRng(5), { jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional' });
    const positivos = (cartas) => cartas.reduce(
      (acc, c) => acc + Object.values(c.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0), 0,
    );
    expect(positivos(con)).toBeGreaterThan(positivos(sin));
  });

  it('es determinista', () => {
    const a = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    const b = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('respeta el filtro de etapa', () => {
    const cartas = repartirMejoras(createRng(7), { jugador: jugador(), etapa: 'juvenil' });
    for (const carta of cartas) expect(carta.etapas).toContain('juvenil');
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    let totalCartas = 0;
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
      for (const carta of cartas) {
        conteo[carta.rareza] += 1;
        totalCartas += 1;
      }
    }
    const pct = (n) => (100 * conteo[n]) / totalCartas;
    expect(pct('normal')).toBeGreaterThan(55);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(40);
    expect(pct('legendaria')).toBeLessThan(15);
  });

  it('si una rareza no tiene cartas elegibles para la etapa/disciplina, igual completa la cantidad pedida con lo que haya', () => {
    const catalogoChico = [
      { id: 'n1', titulo: 'N1', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n2', titulo: 'N2', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n3', titulo: 'N3', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n4', titulo: 'N4', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
    ];
    for (let semilla = 1; semilla <= 20; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), {
        jugador: jugador(), etapa: 'profesional', catalogo: catalogoChico,
      });
      expect(cartas).toHaveLength(3);
    }
  });
});

describe('aplicarCarta', () => {
  it('sube el atributo y devuelve el delta', () => {
    const yo = jugador();
    const antes = yo.atributos.velocidad;
    const paso = aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.jugador.atributos.velocidad).toBe(antes + 3);
    expect(paso.deltas.velocidad).toBe(3);
  });

  it('reparte a especiales y a estado', () => {
    const yo = jugador();
    const paso = aplicarCarta(yo, {
      id: 'x', titulo: 'T', texto: 't', mods: { disciplinaPersonal: 4, forma: 6, menton: 2 },
    });
    expect(paso.jugador.especiales.disciplinaPersonal).toBe(yo.especiales.disciplinaPersonal + 4);
    expect(paso.jugador.especiales.menton).toBe(yo.especiales.menton + 2);
    expect(paso.jugador.estado.forma).toBe(yo.estado.forma + 6);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('devuelve un texto con los cambios', () => {
    const paso = aplicarCarta(jugador(), { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.texto).toContain('Velocidad');
  });
});

describe('resolverProbabilidad', () => {
  const opcion = {
    id: 'o', texto: 'Arriesgar',
    probabilidades: [
      { peso: 1, mods: { forma: 3 }, texto: 'Salió bien.' },
      { peso: 1, mods: { forma: -3 }, texto: 'Salió mal.' },
    ],
  };

  it('devuelve uno de los resultados posibles', () => {
    const paso = resolverProbabilidad(createRng(1), opcion);
    expect([3, -3]).toContain(paso.resultado.forma);
    expect(paso.texto.length).toBeGreaterThan(0);
  });

  it('es determinista', () => {
    expect(resolverProbabilidad(createRng(9), opcion)).toEqual(resolverProbabilidad(createRng(9), opcion));
  });

  it('respeta los pesos', () => {
    const cargada = {
      probabilidades: [
        { peso: 9, mods: { forma: 1 }, texto: 'casi siempre' },
        { peso: 1, mods: { forma: -1 }, texto: 'casi nunca' },
      ],
    };
    let positivos = 0;
    for (let s = 1; s <= 200; s++) {
      if (resolverProbabilidad(createRng(s), cargada).resultado.forma === 1) positivos++;
    }
    expect(positivos).toBeGreaterThan(150);
  });

  it('con una sola opcion siempre da esa', () => {
    const unica = { probabilidades: [{ peso: 1, mods: { forma: 5 }, texto: 'única' }] };
    expect(resolverProbabilidad(createRng(3), unica).resultado.forma).toBe(5);
  });
});

describe('porcentajesDe', () => {
  it('da array vacio si la opcion no tiene probabilidades', () => {
    expect(porcentajesDe({ id: 'x', texto: 't' })).toEqual([]);
  });

  it('reparte pesos iguales en mitades exactas', () => {
    const opcion = { probabilidades: [{ peso: 1 }, { peso: 1 }] };
    expect(porcentajesDe(opcion)).toEqual([50, 50]);
  });

  it('respeta el orden y la proporcion de los pesos', () => {
    const opcion = { probabilidades: [{ peso: 6 }, { peso: 4 }] };
    expect(porcentajesDe(opcion)).toEqual([60, 40]);
  });

  it('cuando el reparto no cierra redondo, el resto va a la entrada de mayor peso y la suma da 100', () => {
    const opcion = { probabilidades: [{ peso: 1 }, { peso: 1 }, { peso: 1 }] };
    const pct = porcentajesDe(opcion);
    expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pct[0]).toBe(34);
    expect(pct[1]).toBe(33);
    expect(pct[2]).toBe(33);
  });

  it('siempre suma exactamente 100 para todas las opciones con probabilidades del catalogo de eventos', () => {
    for (const carta of CARTAS_EVENTO) {
      for (const opcion of carta.opciones) {
        if (!opcion.probabilidades) continue;
        const pct = porcentajesDe(opcion);
        expect(pct.length).toBe(opcion.probabilidades.length);
        expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
      }
    }
  });
});
