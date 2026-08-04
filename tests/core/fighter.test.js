import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio, mediaDe, recordTexto, repartirOrigenes,
  nombreConApodo, apodoParaMostrar, repartirAtributosIniciales,
} from '../../src/core/fighter.js';
import { ESTILOS } from '../../src/core/styles.js';
import { NACIONALIDADES, NOMBRES_POR_PAIS } from '../../src/content/names.js';
import { ATRIBUTOS } from '../../src/core/stats.js';

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
    // v6 ("las peleas amateur no cuentan ni en el ranking ni en el
    // historial"): récord/historial profesional y amateur arrancan
    // SEPARADOS, ambos en cero — nunca comparten acumulador.
    expect(p.recordAmateur).toEqual({ v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
    expect(p.historialAmateur).toEqual([]);
    expect(p.retirado).toBe(false);
    expect(p.estado.lesion).toBeNull();
  });

  it('genera un id unico', () => {
    const a = crearPeleador(base);
    const b = crearPeleador(base);
    expect(a.id).not.toBe(b.id);
  });

  // v13 (Bloque 1): ESTILOS todavía trae mods con nombres de atributos viejos
  // (potencia, tecnica) — se convierten recién en el Bloque 4. Acá solo
  // importa que aplicar esos mods (que hoy no calzan con ninguna clave) no
  // rompa nada y el peleador quede con exactamente los cuatro atributos.
  it('aplica los modificadores del estilo sin romper la forma de los atributos', () => {
    const noqueador = crearPeleador({ ...base, estilo: 'noqueador' });
    const tecnico = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(Object.keys(noqueador.atributos).sort()).toEqual([...ATRIBUTOS].sort());
    expect(Object.keys(tecnico.atributos).sort()).toEqual([...ATRIBUTOS].sort());
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

  // v13: grappling deja de ser un atributo separado (se fundió en los
  // cuatro nuevos) — el peleador nunca debe traer esa clave.
  it('ya no existe un atributo grappling', () => {
    const p = crearPeleador(base);
    expect(p.atributos.grappling).toBeUndefined();
    expect(Object.keys(p.atributos).sort()).toEqual([...ATRIBUTOS].sort());
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

  // v13 (Bloque 1): NICKNAMES todavía trae mods con nombres de atributos
  // viejos (potencia) — se convierten en el Bloque 4. Acá solo importa que
  // aplicar el apodo no rompa la forma del peleador.
  it('aplica los mods del apodo sin romper la forma de los atributos', () => {
    const conApodo = crearPeleador({ ...base, estilo: 'tecnico', apodo: undefined, apodoId: 'dinamita' });
    expect(Object.keys(conApodo.atributos).sort()).toEqual([...ATRIBUTOS].sort());
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
  // v18: de 6 a 12 (ver el comentario de NACIONALIDADES, names.js). Lo que
  // importa no es el número exacto sino que no haya códigos repetidos y que
  // cada país esté completo — eso lo cubre el test de abajo.
  it('no hay códigos repetidos', () => {
    const codigos = NACIONALIDADES.map((n) => n.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('incluye los seis países originales', () => {
    const codigos = NACIONALIDADES.map((n) => n.codigo);
    for (const codigo of ['AR', 'ES', 'IT', 'JP', 'MX', 'US']) {
      expect(codigos).toContain(codigo);
    }
  });

  it('cada una tiene escuela', () => {
    for (const n of NACIONALIDADES) {
      expect(n.escuela.length).toBeGreaterThan(0);
      expect(NOMBRES_POR_PAIS[n.codigo].nombres.length).toBeGreaterThan(0);
    }
  });

  // El pool de nombres de un país es lo que le pone techo a cuántos peleadores
  // suyos pueden convivir: `intentarSumar` (roster.js) rechaza nombres
  // repetidos, así que con un pool chico la camada nueva no entra y el país se
  // seca. Doce por doce = 144 combinaciones, el estándar que fijó la v17.
  it('cada país trae doce nombres y doce apellidos, sin repetir', () => {
    for (const n of NACIONALIDADES) {
      const { nombres, apellidos } = NOMBRES_POR_PAIS[n.codigo];
      expect(nombres).toHaveLength(12);
      expect(apellidos).toHaveLength(12);
      expect(new Set(nombres).size).toBe(12);
      expect(new Set(apellidos).size).toBe(12);
    }
  });

  // Regresión (revisión Bloque 5): NACIONALIDADES ya no tiene un campo
  // `bandera` con el emoji — era dato muerto que nadie leía (la UI dibuja la
  // bandera en SVG con bandera(codigo) de src/ui/flags.js) y, si alguien lo
  // volvía a usar sin darse cuenta, resucitaba el bug que el usuario reportó
  // dos veces (🇦🇷 se ve como "AR" en Windows).
  it('no tiene un campo bandera con emoji (dato muerto, ver src/ui/flags.js)', () => {
    for (const n of NACIONALIDADES) {
      expect(n.bandera).toBeUndefined();
    }
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

  it('la media es el promedio simple de los cuatro atributos', () => {
    const p = crearPeleador({ ...base, apellido: 'Ortiz' });
    p.atributos = { fuerza: 40, defensa: 50, cardio: 60, agilidad: 70 };
    expect(mediaDe(p)).toBe(55);
  });
});

describe('repartirAtributosIniciales', () => {
  it('reparte desigual: dos peleadores con la misma media tienen perfiles distintos', () => {
    const a = repartirAtributosIniciales(createRng(1), 40);
    const b = repartirAtributosIniciales(createRng(2), 40);
    const spread = (x) => Math.max(...Object.values(x)) - Math.min(...Object.values(x));
    expect(spread(a)).toBeGreaterThan(8);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respeta la media objetivo dentro de un punto', () => {
    for (let s = 1; s <= 30; s += 1) {
      const at = repartirAtributosIniciales(createRng(s), 42);
      const media = Math.round(Object.values(at).reduce((x, y) => x + y, 0) / 4);
      expect(Math.abs(media - 42)).toBeLessThanOrEqual(1);
    }
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

// Regresión barrida final (cierre de ronda v3): con apodo null/undefined
// (guardado viejo, o un rival generado sin uno), media docena de pantallas
// interpolaban `jugador.apodo` sin resguardo y mostraban el string literal
// "null" en pantalla. `nombreConApodo` centraliza el formato para que ese
// resguardo valga en todos lados a la vez.
describe('nombreConApodo', () => {
  it('con apodo, muestra "Apodo" Nombre', () => {
    const p = crearPeleador(base);
    expect(nombreConApodo(p)).toBe('"El Relámpago" Lucas Ortiz');
  });

  it('sin apodo (null), muestra solo el nombre, nunca "null"', () => {
    const p = crearPeleador({ ...base, apodo: null, apodoId: null });
    expect(nombreConApodo(p)).toBe('Lucas Ortiz');
    expect(nombreConApodo(p)).not.toContain('null');
  });

  it('sin apodo (undefined), muestra solo el nombre', () => {
    const { apodo, ...sinApodo } = crearPeleador(base);
    expect(nombreConApodo(sinApodo)).toBe('Lucas Ortiz');
  });
});

// Pedido 1 (v6, roster de 100): con solo 16 apodos posibles (names.js) para
// ~95 rivales de relleno, la mayoría termina SIN apodo (null) — antes,
// cualquier NPC generado tenía garantizado un apodo, así que este caso nunca
// pasaba en producción para un rival de verdad. `apodoParaMostrar` es la
// versión de `nombreConApodo` para los lugares que muestran SOLO el mote
// (marcador de pelea, chip de archirrival, título del campamento) — mismo
// resguardo, sin duplicar el nombre al lado.
describe('apodoParaMostrar', () => {
  it('con apodo, devuelve el apodo', () => {
    const p = crearPeleador(base);
    expect(apodoParaMostrar(p)).toBe('El Relámpago');
  });

  it('sin apodo (null), devuelve el nombre, nunca "null"', () => {
    const p = crearPeleador({ ...base, apodo: null, apodoId: null });
    expect(apodoParaMostrar(p)).toBe('Lucas Ortiz');
    expect(apodoParaMostrar(p)).not.toContain('null');
  });
});
