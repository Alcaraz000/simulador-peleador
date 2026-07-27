// Resumen de fin de año (pedido textual del usuario: "cada vez que termina un
// año calendario, quiero que aparezca un resumen de lo ocurrido"). Este
// módulo es el registro MÍNIMO que hace falta para reconstruir ese resumen:
// una muestra de media por cada momento en que cambió, las decisiones
// tomadas, y un filtro sobre el historial de peleas ya existente (nunca lo
// duplica — `jugador.historial`/`historialAmateur` ya traen rival/fecha/
// resultado/método, ver aplicarResultado en offers.js).
import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { createRng } from '../../src/core/rng.js';
import { ANIO_INICIAL, crearMundo, rankingDelJugador } from '../../src/core/world.js';
import { fechaDe } from '../../src/core/calendario.js';
import {
  iniciarRegistroAnio, registrarMuestraMedia, registrarDecision, peleasDelAnio, anioTieneAlgoQueContar,
} from '../../src/core/year-summary.js';

function jugadorDePrueba(overrides = {}) {
  return crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
    ...overrides,
  });
}

function mundoDePrueba() {
  return crearMundo(createRng(9), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
}

describe('iniciarRegistroAnio', () => {
  it('arranca con el anio derivado de la semana global y una primera muestra de media', () => {
    const jugador = jugadorDePrueba();
    const registro = iniciarRegistroAnio(1, jugador);
    expect(registro.anio).toBe(fechaDe(1, ANIO_INICIAL).anio);
    expect(registro.muestrasMedia).toHaveLength(1);
    expect(registro.muestrasMedia[0].semana).toBe(1);
    expect(registro.muestrasMedia[0].media).toBeGreaterThan(0);
    expect(registro.decisiones).toEqual([]);
  });

  it('el anio coincide con fechaDe para una semana bien avanzada en la carrera', () => {
    const jugador = jugadorDePrueba();
    const semana = 1 + 52 * 6; // ~6 años después
    const registro = iniciarRegistroAnio(semana, jugador);
    expect(registro.anio).toBe(fechaDe(semana, ANIO_INICIAL).anio);
  });

  // v8 (pedido textual: "un gráfico nuevo, cómo escalaste en el ranking"): la
  // primera muestra también trae el puesto, calculado con el mismo criterio
  // que el resto del tablero (rankingDelJugador, world.js).
  it('con mundo, la primera muestra trae tambien el ranking real del jugador', () => {
    const jugador = jugadorDePrueba();
    const mundo = mundoDePrueba();
    const registro = iniciarRegistroAnio(1, jugador, mundo);
    expect(registro.muestrasMedia[0].ranking).toBe(rankingDelJugador(mundo, jugador));
  });

  it('sin mundo (llamador defensivo, o partida vieja), el ranking de la muestra queda en null y no revienta', () => {
    const jugador = jugadorDePrueba();
    expect(() => iniciarRegistroAnio(1, jugador)).not.toThrow();
    const registro = iniciarRegistroAnio(1, jugador);
    expect(registro.muestrasMedia[0].ranking).toBeNull();
  });
});

describe('registrarMuestraMedia', () => {
  it('agrega una muestra nueva sin tocar las anteriores', () => {
    const jugador = jugadorDePrueba();
    const registro = iniciarRegistroAnio(1, jugador);
    const jugadorMasFuerte = { ...jugador, atributos: { ...jugador.atributos, potencia: jugador.atributos.potencia + 20 } };
    const actualizado = registrarMuestraMedia(registro, 10, jugadorMasFuerte);
    expect(actualizado.muestrasMedia).toHaveLength(2);
    expect(actualizado.muestrasMedia[0]).toEqual(registro.muestrasMedia[0]);
    expect(actualizado.muestrasMedia[1].semana).toBe(10);
    expect(actualizado.muestrasMedia[1].media).toBeGreaterThan(actualizado.muestrasMedia[0].media);
  });

  it('no muta el registro original', () => {
    const jugador = jugadorDePrueba();
    const registro = iniciarRegistroAnio(1, jugador);
    const antes = JSON.stringify(registro);
    registrarMuestraMedia(registro, 5, jugador);
    expect(JSON.stringify(registro)).toBe(antes);
  });

  it('si no hay registro (null), no revienta: devuelve null', () => {
    expect(registrarMuestraMedia(null, 5, jugadorDePrueba())).toBeNull();
  });

  // v8: la nueva muestra suma ranking igual que la primera (mismo criterio,
  // ver iniciarRegistroAnio más arriba) — un solo campo entero más por
  // muestra, no una estructura paralela (mantiene el guardado liviano).
  it('con mundo, la muestra nueva trae tambien su ranking real', () => {
    const jugador = jugadorDePrueba();
    const mundo = mundoDePrueba();
    const registro = iniciarRegistroAnio(1, jugador, mundo);
    const jugadorMasFuerte = { ...jugador, atributos: { ...jugador.atributos, potencia: jugador.atributos.potencia + 20 } };
    const actualizado = registrarMuestraMedia(registro, 10, jugadorMasFuerte, mundo);
    expect(actualizado.muestrasMedia[1].ranking).toBe(rankingDelJugador(mundo, jugadorMasFuerte));
  });
});

describe('registrarDecision', () => {
  it('agrega una decision con su semana', () => {
    const registro = iniciarRegistroAnio(1, jugadorDePrueba());
    const actualizado = registrarDecision(registro, { tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: 3 });
    expect(actualizado.decisiones).toHaveLength(1);
    expect(actualizado.decisiones[0]).toEqual({
      tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: 3,
    });
  });

  it('no muta el registro original y acumula varias decisiones en orden', () => {
    let registro = iniciarRegistroAnio(1, jugadorDePrueba());
    const antes = JSON.stringify(registro);
    registro = registrarDecision(registro, { tipo: 'mejora', titulo: 'Mejora', opcion: 'A', semana: 1 });
    registro = registrarDecision(registro, { tipo: 'evento', titulo: 'El examen', opcion: 'Rendir', semana: 2 });
    expect(JSON.parse(antes).decisiones).toEqual([]);
    expect(registro.decisiones.map((d) => d.opcion)).toEqual(['A', 'Rendir']);
  });

  it('si no hay registro (null), no revienta: devuelve null', () => {
    expect(registrarDecision(null, { tipo: 'mejora', titulo: 'x', opcion: 'y', semana: 1 })).toBeNull();
  });
});

describe('peleasDelAnio', () => {
  function historialEntry(over) {
    return {
      rivalId: 'r1', rivalNombre: 'Juan Perez', rivalApodo: 'El Pibe', rivalMedia: 40,
      resultado: 'v', metodo: 'ko', round: 3, bolsa: 1000, enJuego: null, esTitulo: false,
      esObligatoria: false, fecha: null, modo: 'jugada', ...over,
    };
  }

  it('filtra el historial profesional por anio segun fecha (semanaGlobal)', () => {
    const anioObjetivo = ANIO_INICIAL + 2;
    const semanaEnEseAnio = 1 + 52 * 2 + 10;
    const jugador = jugadorDePrueba();
    jugador.historial = [
      historialEntry({ rivalNombre: 'Del año anterior', fecha: 1 + 52 * 1 }),
      historialEntry({ rivalNombre: 'Del año objetivo', fecha: semanaEnEseAnio }),
      historialEntry({ rivalNombre: 'Del año siguiente', fecha: 1 + 52 * 3 }),
    ];
    const peleas = peleasDelAnio(jugador, anioObjetivo);
    expect(peleas).toHaveLength(1);
    expect(peleas[0].rivalNombre).toBe('Del año objetivo');
  });

  it('combina historial profesional y amateur, ordenadas por fecha', () => {
    const anioObjetivo = ANIO_INICIAL;
    const jugador = jugadorDePrueba();
    jugador.historial = [historialEntry({ rivalNombre: 'Pro', fecha: 20 })];
    jugador.historialAmateur = [historialEntry({ rivalNombre: 'Amateur', fecha: 5, modo: 'tramite' })];
    const peleas = peleasDelAnio(jugador, anioObjetivo);
    expect(peleas.map((p) => p.rivalNombre)).toEqual(['Amateur', 'Pro']);
  });

  it('ignora entradas sin fecha (guardados viejos, o el gap que esto mismo corrige)', () => {
    const jugador = jugadorDePrueba();
    jugador.historial = [historialEntry({ fecha: null }), historialEntry({ fecha: undefined })];
    expect(peleasDelAnio(jugador, ANIO_INICIAL)).toEqual([]);
  });

  it('si no hay historialAmateur (jugador viejo), no revienta', () => {
    const jugador = jugadorDePrueba();
    jugador.historial = [];
    delete jugador.historialAmateur;
    expect(peleasDelAnio(jugador, ANIO_INICIAL)).toEqual([]);
  });
});

describe('anioTieneAlgoQueContar', () => {
  it('sin registro, no hay nada que contar', () => {
    expect(anioTieneAlgoQueContar(null, jugadorDePrueba())).toBe(false);
  });

  it('un anio sin peleas (aunque haya elegido la mejora obligatoria) no amerita el resumen', () => {
    const jugador = jugadorDePrueba();
    jugador.historial = [];
    let registro = iniciarRegistroAnio(1, jugador);
    registro = registrarDecision(registro, { tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: 1 });
    expect(anioTieneAlgoQueContar(registro, jugador)).toBe(false);
  });

  it('un anio con al menos una pelea (profesional o amateur) SI amerita el resumen', () => {
    const jugador = jugadorDePrueba();
    const registro = iniciarRegistroAnio(1, jugador);
    jugador.historial = [{
      rivalId: 'r1', rivalNombre: 'Juan', rivalApodo: null, rivalMedia: 40, resultado: 'v',
      metodo: 'ko', round: 2, bolsa: 500, enJuego: null, esTitulo: false, esObligatoria: false,
      fecha: 1, modo: 'tramite',
    }];
    expect(anioTieneAlgoQueContar(registro, jugador)).toBe(true);
  });
});
