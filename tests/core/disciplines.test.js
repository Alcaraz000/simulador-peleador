import { describe, it, expect } from 'vitest';
import { DISCIPLINAS, getDisciplina } from '../../src/core/disciplines.js';

describe('disciplinas', () => {
  it('la v1 solo tiene boxeo', () => {
    expect(Object.keys(DISCIPLINAS)).toEqual(['boxeo']);
  });

  it('boxeo no usa grappling', () => {
    expect(DISCIPLINAS.boxeo.usaGrappling).toBe(false);
  });

  // v13: los pesos por atributo desaparecieron junto con `pesosDe`. La media
  // pasó a ser el promedio simple de los cuatro (mediaDe, fighter.js), que es
  // lo que hace cierto y legible el "+4 en un atributo = +1 de media".

  it('boxeo no admite sumision', () => {
    expect(DISCIPLINAS.boxeo.desenlaces).not.toContain('sumision');
    expect(DISCIPLINAS.boxeo.desenlaces).toContain('ko');
    expect(DISCIPLINAS.boxeo.desenlaces).toContain('decision');
  });

  it('las peleas de titulo tienen mas rounds que las amateur', () => {
    for (const disciplina of Object.values(DISCIPLINAS)) {
      expect(disciplina.roundsPorNivel.titulo).toBeGreaterThan(disciplina.roundsPorNivel.amateur);
    }
  });

  // Barrida de experto en boxeo (Pedido 4, v6): una eliminatoria (la pelea
  // que define quién pasa a disputar el título, ver decidirNivel en
  // offers.js) se pelea a la misma distancia que un título de verdad — igual
  // que un "final eliminator" real, casi siempre a 12 rounds, no a la
  // distancia genérica de una pelea de trámite cualquiera (8).
  it('la eliminatoria se pelea a la misma distancia que un titulo, no como una regional de tramite', () => {
    for (const disciplina of Object.values(DISCIPLINAS)) {
      expect(disciplina.roundsPorNivel.eliminatoria).toBe(disciplina.roundsPorNivel.titulo);
      expect(disciplina.roundsPorNivel.eliminatoria).toBeGreaterThan(disciplina.roundsPorNivel.profesional);
    }
  });

  it('getDisciplina tira error con un id desconocido', () => {
    expect(() => getDisciplina('mma')).toThrow(/mma/);
    expect(() => getDisciplina('karate')).toThrow(/karate/);
  });
});
