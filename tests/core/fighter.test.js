import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio, mediaDe, recordTexto,
} from '../../src/core/fighter.js';
import { ESTILOS } from '../../src/core/styles.js';
import { NACIONALIDADES, NOMBRES_POR_PAIS } from '../../src/content/names.js';

const base = {
  nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR',
  disciplina: 'boxeo', estilo: 'noqueador', categoria: 'pluma',
  mano: 'zurda', altura: 172, alcance: 178, origen: 'barrio',
};

describe('categorias', () => {
  it('define pluma y mediano', () => {
    expect(Object.keys(CATEGORIAS).sort()).toEqual(['mediano', 'pluma']);
  });

  it('pluma pesa menos que mediano', () => {
    expect(CATEGORIAS.pluma.pesoMax).toBeLessThan(CATEGORIAS.mediano.pesoMin);
  });
});

describe('crearPeleador', () => {
  it('arma un peleador con la forma esperada', () => {
    const p = crearPeleador({ ...base, esJugador: true });
    expect(p.esJugador).toBe(true);
    expect(p.nombre).toBe('Lucas Ortiz');
    expect(p.edad).toBe(15);
    expect(p.record).toEqual({ v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
    expect(p.retirado).toBe(false);
    expect(p.especiales.menton).toBeGreaterThan(0);
    expect(p.estado.lesion).toBeNull();
  });

  it('genera un id unico', () => {
    const a = crearPeleador(base);
    const b = crearPeleador(base);
    expect(a.id).not.toBe(b.id);
  });

  it('aplica los modificadores del estilo', () => {
    const noqueador = crearPeleador({ ...base, estilo: 'noqueador' });
    const tecnico = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(noqueador.atributos.potencia).toBeGreaterThan(tecnico.atributos.potencia);
    expect(tecnico.atributos.tecnica).toBeGreaterThan(noqueador.atributos.tecnica);
  });

  it('aplica los modificadores del origen', () => {
    const conMods = ORIGENES.find((o) => Object.keys(o.mods).length > 0);
    expect(conMods).toBeTruthy();
  });

  it('rechaza un estilo inexistente', () => {
    expect(() => crearPeleador({ ...base, estilo: 'grappler' })).toThrow(/grappler/);
  });

  it('rechaza una categoria desconocida', () => {
    expect(() => crearPeleador({ ...base, categoria: 'pesado' })).toThrow(/pesado/);
  });

  it('en boxeo el grappling queda en el minimo', () => {
    const p = crearPeleador(base);
    expect(p.atributos.grappling).toBe(1);
  });

  it('acepta las seis nacionalidades y guarda el codigo', () => {
    for (const codigo of ['AR', 'MX', 'US', 'ES', 'IT', 'JP']) {
      expect(crearPeleador({ ...base, nacionalidad: codigo }).nacionalidad).toBe(codigo);
    }
  });
});

describe('nacionalidades', () => {
  it('son exactamente seis', () => {
    expect(NACIONALIDADES).toHaveLength(6);
    expect(NACIONALIDADES.map((n) => n.codigo).sort()).toEqual(['AR', 'ES', 'IT', 'JP', 'MX', 'US']);
  });

  it('cada una tiene bandera y escuela', () => {
    for (const n of NACIONALIDADES) {
      expect(n.bandera.length).toBeGreaterThan(0);
      expect(n.escuela.length).toBeGreaterThan(0);
      expect(NOMBRES_POR_PAIS[n.codigo].nombres.length).toBeGreaterThan(0);
    }
  });

  it('el campo bandera sigue siendo dato crudo por nacionalidad (la UI dibuja SVG aparte)', () => {
    expect(NACIONALIDADES.find((n) => n.codigo === 'AR').bandera).toBeTruthy();
    expect(NACIONALIDADES.find((n) => n.codigo === 'JP').bandera).toBeTruthy();
  });
});

describe('peleadorAleatorio', () => {
  it('es determinista con la misma semilla', () => {
    const a = peleadorAleatorio(createRng(5));
    const b = peleadorAleatorio(createRng(5));
    expect(a.nombre).toBe(b.nombre);
    expect(a.atributos).toEqual(b.atributos);
  });

  it('respeta las opciones forzadas', () => {
    const p = peleadorAleatorio(createRng(3), { categoria: 'mediano', nacionalidad: 'JP' });
    expect(p.disciplina).toBe('boxeo');
    expect(p.categoria).toBe('mediano');
    expect(p.nacionalidad).toBe('JP');
    expect(ESTILOS[p.estilo].disciplinas).toContain('boxeo');
  });

  it('usa nombres acordes a la nacionalidad', () => {
    const p = peleadorAleatorio(createRng(11), { nacionalidad: 'JP' });
    const { nombres, apellidos } = NOMBRES_POR_PAIS.JP;
    expect(nombres.some((n) => p.nombre.startsWith(n))).toBe(true);
    expect(apellidos.some((a) => p.nombre.endsWith(a))).toBe(true);
  });

  it('acepta un nivel objetivo de media', () => {
    const flojo = peleadorAleatorio(createRng(1), { media: 45 });
    const crack = peleadorAleatorio(createRng(1), { media: 85 });
    expect(mediaDe(crack)).toBeGreaterThan(mediaDe(flojo));
  });
});

describe('mediaDe', () => {
  it('devuelve un entero entre 1 y 99', () => {
    const media = mediaDe(crearPeleador(base));
    expect(Number.isInteger(media)).toBe(true);
    expect(media).toBeGreaterThan(0);
    expect(media).toBeLessThanOrEqual(99);
  });
});

describe('recordTexto', () => {
  it('omite los empates cuando son cero', () => {
    const p = crearPeleador(base);
    p.record = { v: 9, d: 3, e: 0, ko: 7, sub: 0, dec: 2 };
    expect(recordTexto(p)).toBe('9-3');
  });

  it('muestra los empates cuando existen', () => {
    const p = crearPeleador(base);
    p.record = { v: 9, d: 3, e: 1, ko: 7, sub: 0, dec: 2 };
    expect(recordTexto(p)).toBe('9-3-1');
  });
});
