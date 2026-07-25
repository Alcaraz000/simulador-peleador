import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_MEJORA } from '../../src/content/cards-improve.js';
import { formatearMods, repartirMejoras, aplicarCarta, resolverProbabilidad } from '../../src/core/cards.js';

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
