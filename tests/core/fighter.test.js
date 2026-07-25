import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio, mediaDe, recordTexto, repartirOrigenes,
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

  it('todo peleador nuevo trae su entrenador puesto, segun el estilo', () => {
    const p = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(p.entrenador).toBeTruthy();
    expect(Object.keys(p.entrenador).sort()).toEqual(['aporte', 'escuela', 'frase', 'iniciales', 'nombre']);
  });
});

describe('crearPeleador con apellido (v2: ya no pide nombre completo)', () => {
  it('si viene apellido, el nombre queda igual al apellido y se guarda aparte', () => {
    const p = crearPeleador({ ...base, nombre: undefined, apellido: 'Ortiz' });
    expect(p.nombre).toBe('Ortiz');
    expect(p.apellido).toBe('Ortiz');
  });

  it('si viene nombre (legacy: NPCs y tests existentes), todo sigue igual que hoy', () => {
    const p = crearPeleador(base);
    expect(p.nombre).toBe('Lucas Ortiz');
    expect(p.apellido).toBeNull();
  });

  it('apellido gana si vienen los dos', () => {
    const p = crearPeleador({ ...base, apellido: 'Sosa' });
    expect(p.nombre).toBe('Sosa');
  });
});

describe('crearPeleador con apodoId (catalogo de apodos con mods)', () => {
  it('el peleador queda armado con apellido + apodo elegido', () => {
    const p = crearPeleador({
      ...base, nombre: undefined, apodo: undefined, apellido: 'Ortiz', apodoId: 'relampago',
    });
    expect(p.apellido).toBe('Ortiz');
    expect(p.nombre).toBe('Ortiz');
    expect(p.apodo).toBe('El Relámpago');
    expect(p.apodoId).toBe('relampago');
  });

  it('aplica los mods del apodo', () => {
    const sinApodo = crearPeleador({ ...base, estilo: 'tecnico' });
    const conApodo = crearPeleador({ ...base, estilo: 'tecnico', apodo: undefined, apodoId: 'dinamita' });
    expect(conApodo.atributos.potencia).toBeGreaterThan(sinApodo.atributos.potencia);
  });

  it('un apodoId desconocido tira error', () => {
    expect(() => crearPeleador({ ...base, apodoId: 'no-existe' })).toThrow(/no-existe/);
  });

  it('sin apodoId, no rompe (comportamiento legacy: apodo es solo texto)', () => {
    const p = crearPeleador(base);
    expect(p.apodo).toBe('El Relámpago');
    expect(p.apodoId).toBeNull();
  });
});

describe('repartirOrigenes', () => {
  it('devuelve exactamente dos', () => {
    expect(repartirOrigenes(createRng(1))).toHaveLength(2);
  });

  it('nunca repite un origen', () => {
    for (let semilla = 1; semilla <= 100; semilla += 1) {
      const origenes = repartirOrigenes(createRng(semilla));
      expect(new Set(origenes.map((o) => o.id)).size).toBe(origenes.length);
    }
  });

  it('es determinista', () => {
    const a = repartirOrigenes(createRng(4));
    const b = repartirOrigenes(createRng(4));
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  });

  it('ORIGENES tiene al menos 6 opciones con rarezas', () => {
    expect(ORIGENES.length).toBeGreaterThanOrEqual(6);
    for (const origen of ORIGENES) {
      expect(['normal', 'rara', 'legendaria']).toContain(origen.rareza);
    }
  });

  it('los origenes legendarios no vienen nerfeados (mods netos altos)', () => {
    const legendarios = ORIGENES.filter((o) => o.rareza === 'legendaria');
    expect(legendarios.length).toBeGreaterThanOrEqual(1);
    for (const origen of legendarios) {
      const positivos = Object.values(origen.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      expect(positivos).toBeGreaterThanOrEqual(8);
    }
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    let total = 0;
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      for (const origen of repartirOrigenes(createRng(semilla))) {
        conteo[origen.rareza] += 1;
        total += 1;
      }
    }
    const pct = (n) => (100 * conteo[n]) / total;
    expect(pct('normal')).toBeGreaterThan(55);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(40);
    expect(pct('legendaria')).toBeLessThan(15);
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
