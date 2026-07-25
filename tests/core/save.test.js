import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import {
  CLAVE_GUARDADO, VERSION_ESQUEMA, serializar, deserializar, guardar, cargar, borrar, haySlot,
} from '../../src/core/save.js';

function storageFalso() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    _datos: datos,
  };
}

function partidaDePrueba() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 42 });
}

let storage;
beforeEach(() => { storage = storageFalso(); });

describe('serializar / deserializar', () => {
  it('ida y vuelta conserva la partida', () => {
    const partida = partidaDePrueba();
    const recuperada = deserializar(serializar(partida));
    expect(recuperada.jugador.nombre).toBe(partida.jugador.nombre);
    expect(recuperada.semilla).toBe(partida.semilla);
    expect(recuperada.mundo.roster).toHaveLength(partida.mundo.roster.length);
  });

  it('escribe la version del esquema', () => {
    expect(JSON.parse(serializar(partidaDePrueba())).version).toBe(VERSION_ESQUEMA);
  });

  it('rechaza JSON invalido', () => {
    expect(() => deserializar('no es json')).toThrow(/inv[aá]lid/i);
  });

  it('rechaza otra version de esquema', () => {
    const texto = JSON.stringify({ ...partidaDePrueba(), version: 99 });
    expect(() => deserializar(texto)).toThrow(/versi[oó]n/i);
  });

  // VERSION_ESQUEMA no cambió entre v1 y v2 (mismo valor: 1), así que una
  // partida v1 guardada de verdad pasaría el chequeo de arriba. Le faltan
  // campos que el resto del juego v2 asume que existen (semanaGlobal en la
  // partida; apellido y entrenador en el jugador) — sin este chequeo, cargarla
  // no tira acá, pero rompe más adelante (calendario.js, panel-peleador.js,
  // coach.js) con una pantalla en blanco o una excepción a mitad de partida.
  // La forma de acá abajo es la de una partida v1 GUARDADA DE VERDAD (no un
  // recorte del fixture v2): a los campos simplemente nunca les llegó a
  // existir la key, no es que valgan null.
  it('rechaza una partida v1 real (sin semanaGlobal, sin apellido, sin entrenador)', () => {
    const partidaV1 = {
      version: VERSION_ESQUEMA,
      semilla: 1,
      rngEstado: { s0: 1, s1: 2, s2: 3, s3: 4 },
      jugador: {
        nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR',
        disciplina: 'boxeo', estilo: 'tecnico', categoria: 'pluma',
      },
      mundo: { roster: [], anio: 2024 },
      rivalidades: [], noticias: [], etapaIndice: 0, bloque: 1, bloqueGlobal: 1,
      cola: [], beatActual: null, historialBeats: 0, terminada: false, legado: null,
    };
    expect(() => deserializar(JSON.stringify(partidaV1))).toThrow(/esquema/i);
  });

  // El fixture v2 de este archivo (partidaDePrueba, usado en TODO este
  // proyecto) no pasa `apellido` a crearPeleador a propósito: en v2 esa key
  // SIEMPRE existe (crearPeleador la fija en `null` si no viene), y el
  // chequeo de esquema tiene que aceptar eso — el punto no es que el
  // apellido tenga contenido, sino que la FORMA sea la de v2, no la de v1.
  it('acepta una partida v2 real (con semanaGlobal, apellido -aunque sea null- y entrenador)', () => {
    const partida = partidaDePrueba();
    expect(partida.jugador.apellido).toBeNull();
    const texto = serializar(partida);
    expect(() => deserializar(texto)).not.toThrow();
  });
});

describe('guardar / cargar', () => {
  it('guarda y recupera', () => {
    const partida = partidaDePrueba();
    expect(guardar(partida, storage)).toBe(true);
    expect(cargar(storage).jugador.nombre).toBe(partida.jugador.nombre);
  });

  it('usa la clave versionada', () => {
    guardar(partidaDePrueba(), storage);
    expect(storage._datos.has(CLAVE_GUARDADO)).toBe(true);
  });

  it('cargar sin slot devuelve null', () => {
    expect(cargar(storage)).toBeNull();
  });

  it('cargar un slot corrupto devuelve null y limpia', () => {
    storage.setItem(CLAVE_GUARDADO, '{{{roto');
    expect(cargar(storage)).toBeNull();
    expect(storage.getItem(CLAVE_GUARDADO)).toBeNull();
  });

  it('devuelve false si el storage explota', () => {
    const roto = { getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem: () => {} };
    expect(guardar(partidaDePrueba(), roto)).toBe(false);
  });

  it('devuelve false si no hay storage', () => {
    expect(guardar(partidaDePrueba(), null)).toBe(false);
    expect(cargar(null)).toBeNull();
  });

  it('cargar devuelve null si getItem tira error', () => {
    const roto = { getItem: () => { throw new Error('SecurityError'); }, removeItem: () => {} };
    expect(cargar(roto)).toBeNull();
  });
});

describe('haySlot y borrar', () => {
  it('detecta y borra el slot', () => {
    expect(haySlot(storage)).toBe(false);
    guardar(partidaDePrueba(), storage);
    expect(haySlot(storage)).toBe(true);
    borrar(storage);
    expect(haySlot(storage)).toBe(false);
  });

  it('haySlot devuelve false si getItem tira error', () => {
    const roto = { getItem: () => { throw new Error('SecurityError'); }, removeItem: () => {} };
    expect(haySlot(roto)).toBe(false);
  });
});
