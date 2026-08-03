import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import {
  rankingsDe, rankingsProfesionales, rankingAmateur, puestoEn, divisionDe,
  campeonesIniciales, campeonDe, coronarCampeon, cinturonesDe, puntajeDe,
  CUPO_NACIONAL, CUPO_MUNDIAL,
} from '../../src/core/divisiones.js';

const NAC = 'AR';

function mundo(semilla = 7) {
  return crearMundo(createRng(semilla), {
    disciplina: 'boxeo', categoria: 'pluma', cantidad: 100, nacionalidadLocal: NAC,
  });
}

function jugador({ media = 70, record = { v: 5, d: 1, e: 0, ko: 2 }, nacionalidad = NAC } = {}) {
  const base = crearPeleador({
    apellido: 'Test', apodo: 'El Test', nacionalidad, disciplina: 'boxeo', estilo: 'tecnico',
    categoria: 'pluma', origen: 'barrio', media, esJugador: true, rng: createRng(3),
  });
  return { ...base, record };
}

describe('las cuatro divisiones', () => {
  it('el regional y el nacional son SOLO del país del jugador', () => {
    const { regional, nacional } = rankingsProfesionales(mundo());

    expect(regional.length).toBeGreaterThan(0);
    expect(nacional.length).toBeGreaterThan(0);
    expect(regional.every((p) => p.nacionalidad === NAC)).toBe(true);
    expect(nacional.every((p) => p.nacionalidad === NAC)).toBe(true);
  });

  it('el mundial mezcla países, no es solo el local', () => {
    const { mundial } = rankingsProfesionales(mundo());
    const paises = new Set(mundial.map((p) => p.nacionalidad));

    expect(paises.size).toBeGreaterThan(1);
  });

  // La coherencia que pidió el usuario, textual: "estar primero en el regional
  // no significa estar primero en el nacional".
  it('el #1 regional NUNCA es también el #1 nacional', () => {
    const { regional, nacional } = rankingsProfesionales(mundo());
    expect(regional[0].id).not.toBe(nacional[0].id);
  });

  it('nadie está en el regional y en el nacional a la vez', () => {
    const { regional, nacional } = rankingsProfesionales(mundo());
    const enNacional = new Set(nacional.map((p) => p.id));

    expect(regional.some((p) => enNacional.has(p.id))).toBe(false);
  });

  it('el regional es el resto del país: todos sus integrantes valen menos que el peor del nacional', () => {
    const { regional, nacional } = rankingsProfesionales(mundo());
    const peorNacional = puntajeDe(nacional[nacional.length - 1]);

    expect(regional.every((p) => puntajeDe(p) <= peorNacional)).toBe(true);
  });

  it('cada división respeta su cupo', () => {
    const { nacional, mundial } = rankingsProfesionales(mundo());
    expect(nacional.length).toBeLessThanOrEqual(CUPO_NACIONAL);
    expect(mundial.length).toBeLessThanOrEqual(CUPO_MUNDIAL);
  });

  it('cada lista está ordenada de mejor a peor', () => {
    const rankings = rankingsProfesionales(mundo());
    for (const division of ['regional', 'nacional', 'mundial']) {
      const puntajes = rankings[division].map(puntajeDe);
      const ordenados = [...puntajes].sort((a, b) => b - a);
      expect(puntajes).toEqual(ordenados);
    }
  });

  // Por NOMBRE y no por id: el id de un peleador se genera fuera del rng (es
  // único por proceso, no por semilla), así que dos mundos creados con la
  // misma semilla traen los mismos peleadores con ids distintos. Lo que tiene
  // que ser determinista es QUIÉNES son y en qué orden.
  it('es determinista: el mismo mundo da exactamente el mismo ranking', () => {
    const uno = rankingsProfesionales(mundo(11));
    const dos = rankingsProfesionales(mundo(11));
    for (const division of ['regional', 'nacional', 'mundial']) {
      expect(uno[division].map((p) => p.nombre)).toEqual(dos[division].map((p) => p.nombre));
    }
  });
});

describe('el ranking amateur', () => {
  it('no comparte un solo nombre con el circuito profesional', () => {
    const m = mundo();
    const nombresPro = new Set(m.roster.map((p) => p.nombre));
    const amateur = rankingAmateur(m);

    expect(amateur.length).toBeGreaterThan(0);
    expect(amateur.some((p) => nombresPro.has(p.nombre))).toBe(false);
  });

  it('no comparte tampoco ningún id', () => {
    const m = mundo();
    const idsPro = new Set(m.roster.map((p) => p.id));
    expect(rankingAmateur(m).some((p) => idsPro.has(p.id))).toBe(false);
  });

  it('el jugador entra al amateur cuando tiene peleas amateurs, no antes', () => {
    const m = mundo();
    const sinPelear = jugador({ record: { v: 0, d: 0, e: 0, ko: 0 } });
    expect(puestoEn(rankingsDe(m, sinPelear), 'amateur', sinPelear.id)).toBeNull();

    const conPeleas = { ...sinPelear, recordAmateur: { v: 3, d: 1, e: 0, ko: 1 } };
    expect(puestoEn(rankingsDe(m, conPeleas), 'amateur', conPeleas.id)).not.toBeNull();
  });
});

describe('el jugador dentro de las divisiones', () => {
  it('un debutante sin peleas profesionales no ocupa ningún puesto', () => {
    const m = mundo();
    const novato = jugador({ record: { v: 0, d: 0, e: 0, ko: 0 } });
    expect(divisionDe(rankingsProfesionales(m, novato), novato.id)).toBeNull();
  });

  // El caso reportado: "voy 0-2 y estoy #62 en el ranking, no tiene sentido".
  it('un 0-2 arranca en el regional, no en la elite nacional', () => {
    const m = mundo();
    const perdedor = jugador({ media: 64, record: { v: 0, d: 2, e: 0, ko: 0 } });
    expect(divisionDe(rankingsProfesionales(m, perdedor), perdedor.id)).toBe('regional');
  });

  it('ganar sube de división y perder baja: el puesto se gana peleando', () => {
    const m = mundo();
    const flojo = jugador({ media: 78, record: { v: 1, d: 6, e: 0, ko: 0 } });
    const crack = jugador({ media: 78, record: { v: 22, d: 1, e: 0, ko: 12 } });

    expect(puntajeDe(crack)).toBeGreaterThan(puntajeDe(flojo));
    const puestoCrack = puestoEn(rankingsProfesionales(m, crack), 'nacional', crack.id);
    const puestoFlojo = puestoEn(rankingsProfesionales(m, flojo), 'nacional', flojo.id);
    expect(puestoCrack).not.toBeNull();
    if (puestoFlojo !== null) expect(puestoCrack).toBeLessThan(puestoFlojo);
  });

  it('la división es la MÁS ALTA en la que aparece', () => {
    const m = mundo();
    const crack = jugador({ media: 95, record: { v: 30, d: 0, e: 0, ko: 20 } });
    const rankings = rankingsProfesionales(m, crack);

    expect(puestoEn(rankings, 'mundial', crack.id)).not.toBeNull();
    expect(divisionDe(rankings, crack.id)).toBe('mundial');
  });
});

describe('los cinturones tienen dueño', () => {
  it('arrancan en el #1 de cada división', () => {
    const m = mundo();
    const rankings = rankingsProfesionales(m);
    const campeones = campeonesIniciales(m);

    expect(campeones.regional).toBe(rankings.regional[0].id);
    expect(campeones.nacional).toBe(rankings.nacional[0].id);
    expect(campeones.mundial).toBe(rankings.mundial[0].id);
  });

  it('el mundo nace con los tres cinturones puestos', () => {
    const m = mundo();
    for (const cinturon of ['regional', 'nacional', 'mundial']) {
      expect(campeonDe(m, cinturon)).toBeTruthy();
    }
  });

  it('coronar a alguien no muta el mapa anterior', () => {
    const antes = { regional: 'a', nacional: 'b', mundial: 'c' };
    const despues = coronarCampeon(antes, 'mundial', 'z');

    expect(antes.mundial).toBe('c');
    expect(despues.mundial).toBe('z');
    expect(despues.regional).toBe('a');
  });

  it('cinturonesDe lista todo lo que tiene puesto un mismo peleador', () => {
    const campeones = { regional: 'x', nacional: 'x', mundial: 'otro' };
    expect(cinturonesDe(campeones, 'x').sort()).toEqual(['nacional', 'regional']);
    expect(cinturonesDe(campeones, 'nadie')).toEqual([]);
  });
});
