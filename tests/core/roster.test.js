import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PARODIAS } from '../../src/content/parodies.js';
import {
  PERSONALIDADES, parodiasDe, crearDesdeParodia, crearRoster, leyendasDe, leyendasDeNacionalidad,
} from '../../src/core/roster.js';
import { mediaDe } from '../../src/core/fighter.js';

describe('parodias', () => {
  it('tiene al menos quince personajes', () => {
    expect(PARODIAS.length).toBeGreaterThanOrEqual(15);
  });

  it('las seis nacionalidades tienen leyendas propias', () => {
    for (const codigo of ['AR', 'MX', 'US', 'ES', 'IT', 'JP']) {
      const leyendas = leyendasDeNacionalidad(codigo);
      expect(leyendas.length).toBeGreaterThanOrEqual(1);
      for (const l of leyendas) {
        expect(l.nacionalidad).toBe(codigo);
        expect(l.rol).toBe('leyenda');
      }
    }
  });

  it('cada nacionalidad tiene al menos un peleador en actividad', () => {
    for (const codigo of ['AR', 'MX', 'US', 'ES', 'IT', 'JP']) {
      const activos = PARODIAS.filter((p) => p.nacionalidad === codigo && p.rol === 'activo');
      expect(activos.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('en la v1 todas son de boxeo', () => {
    for (const p of PARODIAS) expect(p.disciplina).toBe('boxeo');
  });

  it('las leyendas son mas fuertes que los activos', () => {
    const media = (rol) => {
      const grupo = PARODIAS.filter((p) => p.rol === rol);
      return grupo.reduce((a, p) => a + p.media, 0) / grupo.length;
    };
    expect(media('leyenda')).toBeGreaterThan(media('activo'));
  });

  it('cada parodia declara a quien parodia', () => {
    for (const p of PARODIAS) {
      expect(p.referencia).toBeTruthy();
      expect(p.nombre).toBeTruthy();
      expect(p.frase).toBeTruthy();
    }
  });

  it('tiene ids unicos', () => {
    const ids = PARODIAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mezcla activos y leyendas', () => {
    const roles = new Set(PARODIAS.map((p) => p.rol));
    expect(roles).toContain('activo');
    expect(roles).toContain('leyenda');
  });

  it('todas usan una personalidad valida', () => {
    for (const p of PARODIAS) expect(PERSONALIDADES).toContain(p.personalidad);
  });
});

describe('parodiasDe', () => {
  it('filtra por disciplina y categoria', () => {
    const encontradas = parodiasDe('boxeo', 'pluma');
    for (const p of encontradas) {
      expect(p.disciplina).toBe('boxeo');
      expect(p.categoria).toBe('pluma');
    }
  });

  it('puede filtrar por rol', () => {
    for (const p of parodiasDe('boxeo', 'pluma', 'activo')) expect(p.rol).toBe('activo');
  });
});

describe('crearDesdeParodia', () => {
  it('convierte una parodia en peleador completo', () => {
    const peleador = crearDesdeParodia(PARODIAS[0]);
    expect(peleador.esParodia).toBe(true);
    expect(peleador.referencia).toBe(PARODIAS[0].referencia);
    expect(peleador.nombre).toBe(PARODIAS[0].nombre);
    expect(peleador.atributos).toBeTruthy();
  });

  it('respeta la media declarada dentro de un margen', () => {
    const parodia = PARODIAS.find((p) => p.rol === 'activo');
    const peleador = crearDesdeParodia(parodia);
    expect(Math.abs(mediaDe(peleador) - parodia.media)).toBeLessThanOrEqual(8);
  });
});

describe('crearRoster', () => {
  it('genera la cantidad pedida', () => {
    const roster = crearRoster(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster).toHaveLength(10);
  });

  it('todos comparten disciplina y categoria', () => {
    const roster = crearRoster(createRng(2), { disciplina: 'boxeo', categoria: 'mediano', cantidad: 8 });
    for (const p of roster) {
      expect(p.disciplina).toBe('boxeo');
      expect(p.categoria).toBe('mediano');
    }
  });

  it('incluye al menos una parodia activa si existe para esa categoria', () => {
    const roster = crearRoster(createRng(3), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster.some((p) => p.esParodia)).toBe(true);
  });

  it('asigna ranking 1..N ordenado por media', () => {
    const roster = crearRoster(createRng(4), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster.map((p) => p.ranking)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < roster.length; i++) {
      expect(mediaDe(roster[i - 1])).toBeGreaterThanOrEqual(mediaDe(roster[i]));
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = crearRoster(createRng(9), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 8 });
    const b = crearRoster(createRng(9), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 8 });
    expect(a.map((p) => p.nombre)).toEqual(b.map((p) => p.nombre));
  });

  it('no repite nombres', () => {
    const roster = crearRoster(createRng(12), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 12 });
    const nombres = roster.map((p) => p.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});

describe('leyendasDe', () => {
  it('devuelve solo leyendas de esa disciplina', () => {
    for (const p of leyendasDe('boxeo')) {
      expect(p.rol).toBe('leyenda');
      expect(p.disciplina).toBe('boxeo');
    }
  });
});
