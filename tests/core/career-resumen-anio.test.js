// Resumen de fin de año (pedido textual del usuario): cada vez que un año
// calendario termina (en este juego, un bloque = un año, ver ETAPAS en
// career.js — 24 bloques de 1 año cada uno), la carrera tiene que dejar a
// mano lo necesario para reconstruir el resumen: cómo fue cambiando la media,
// qué decisiones se tomaron y qué peleas hubo. Este archivo vive aparte de
// career.test.js (mismo criterio que career-lesiones-reales.test.js) para no
// sumar más peso al worker que ya corre los loops de miles de semillas.
import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  crearPartida, siguienteBeat, avanzarBloque, registrarDecision, registrarMuestraMedia,
} from '../../src/core/career.js';
import { iniciarRegistroAnio } from '../../src/core/year-summary.js';
import { ANIO_INICIAL } from '../../src/core/world.js';
import { fechaDe } from '../../src/core/calendario.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

function peleaDePrueba(fecha, over = {}) {
  return {
    rivalId: 'r1', rivalNombre: 'Juan Perez', rivalApodo: 'El Pibe', rivalMedia: 40,
    resultado: 'v', metodo: 'ko', round: 2, bolsa: 1000, enJuego: null, esTitulo: false,
    esObligatoria: false, fecha, modo: 'tramite', ...over,
  };
}

describe('crearPartida: abre el registro del primer año', () => {
  it('arranca con registroAnioActual en el anio inicial, una muestra de media y sin decisiones', () => {
    const p = nuevaPartida();
    expect(p.registroAnioActual).toBeTruthy();
    expect(p.registroAnioActual.anio).toBe(ANIO_INICIAL);
    expect(p.registroAnioActual.muestrasMedia).toHaveLength(1);
    expect(p.registroAnioActual.muestrasMedia[0].semana).toBe(1);
    expect(p.registroAnioActual.decisiones).toEqual([]);
    expect(p.anioCerrado ?? null).toBeNull();
  });
});

describe('avanzarBloque: cierra el año en curso y abre uno nuevo', () => {
  it('deja anioCerrado con el registro tal cual estaba, y abre un registroAnioActual nuevo para el anio que arranca', () => {
    const p = nuevaPartida();
    const conDecision = registrarDecision(p, {
      tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: p.semanaGlobal,
    });
    const despues = avanzarBloque(conDecision);

    expect(despues.anioCerrado).toEqual(conDecision.registroAnioActual);
    expect(despues.anioCerrado.decisiones).toHaveLength(1);
    expect(despues.anioCerrado.anio).toBe(p.registroAnioActual.anio);

    expect(despues.registroAnioActual.anio).toBe(fechaDe(despues.semanaGlobal, ANIO_INICIAL).anio);
    expect(despues.registroAnioActual.anio).toBeGreaterThan(despues.anioCerrado.anio);
    expect(despues.registroAnioActual.decisiones).toEqual([]);
    expect(despues.registroAnioActual.muestrasMedia).toHaveLength(1);
  });

  it('no muta la partida original (registroAnioActual/anioCerrado incluidos)', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });
});

describe('registrarDecision / registrarMuestraMedia (envoltorio a nivel partida)', () => {
  it('registrarDecision suma una decision al registro del anio en curso, usando la semana actual de la partida', () => {
    const p = nuevaPartida();
    const conDecision = registrarDecision(p, { tipo: 'evento', titulo: 'El examen', opcion: 'Rendir' });
    expect(conDecision.registroAnioActual.decisiones).toEqual([
      { tipo: 'evento', titulo: 'El examen', opcion: 'Rendir', semana: p.semanaGlobal },
    ]);
    // No muta la original.
    expect(p.registroAnioActual.decisiones).toEqual([]);
  });

  it('registrarMuestraMedia suma una muestra usando el jugador y la semana actuales de la partida', () => {
    const p = nuevaPartida();
    const masFuerte = {
      ...p,
      jugador: { ...p.jugador, atributos: { ...p.jugador.atributos, potencia: p.jugador.atributos.potencia + 30 } },
    };
    const conMuestra = registrarMuestraMedia(masFuerte);
    expect(conMuestra.registroAnioActual.muestrasMedia).toHaveLength(2);
    expect(conMuestra.registroAnioActual.muestrasMedia[1].media)
      .toBeGreaterThan(conMuestra.registroAnioActual.muestrasMedia[0].media);
  });
});

// Partida armada a mano (no depende de que una semilla en particular traiga
// pelea o no): `bloqueGlobal:2` fuerza a `siguienteBeat` a pasar por
// `avanzarBloque` en la primera llamada (mismo camino que el juego real toma
// al cerrar cualquier año que no sea el primero); `bloque:2` con etapaIndice
// 0 (juvenil, 3 bloques) evita cualquier transición de etapa de por medio.
// `semanaGlobal` se adelanta unos años (en vez de dejarlo en 1, el default de
// crearPartida) para que "una pelea de un año viejo" sea un caso posible de
// verdad en los tests de más abajo — con semanaGlobal:1 no hay ningún año
// anterior al que cierra.
function partidaAPuntoDeCerrarAnio(overrides = {}) {
  const p = nuevaPartida(1);
  const semanaGlobal = 1 + 52 * 3 + 10;
  return {
    ...p,
    bloqueGlobal: 2,
    bloque: 2,
    etapaIndice: 0,
    cola: [],
    semanaGlobal,
    registroAnioActual: iniciarRegistroAnio(semanaGlobal, p.jugador, p.mundo),
    ...overrides,
  };
}

describe('siguienteBeat: el resumen de fin de año aparece como su propio beat', () => {
  it('un año con al menos una pelea (fecha dentro del anio que cierra) dispara "resumenAnio" antes que la mejora del año nuevo', () => {
    const p = partidaAPuntoDeCerrarAnio();
    const anioQueCierra = p.registroAnioActual.anio;
    const jugadorConPelea = { ...p.jugador, historial: [peleaDePrueba(p.semanaGlobal)] };
    const conDecision = registrarDecision(
      { ...p, jugador: jugadorConPelea },
      { tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia' },
    );

    const paso = siguienteBeat(conDecision);
    expect(paso.beat.tipo).toBe('resumenAnio');
    expect(paso.beat.datos.anio).toBe(anioQueCierra);
    expect(paso.beat.datos.peleas).toHaveLength(1);
    expect(paso.beat.datos.decisiones).toEqual([
      { tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: p.semanaGlobal },
    ]);
    expect(paso.beat.datos.muestrasMedia.length).toBeGreaterThanOrEqual(1);
    // v8: cada muestra trae también el ranking del jugador en ese momento
    // (mismo criterio que la media), no solo su valor.
    expect(typeof paso.beat.datos.muestrasMedia[0].ranking).toBe('number');

    // Al consumir el beat 'resumenAnio', lo próximo en la cola es la mejora
    // del año que recién arranca — nunca se pierde un beat real por el
    // resumen.
    const siguientePaso = siguienteBeat(paso.partida);
    expect(siguientePaso.beat.tipo).toBe('mejora');
  });

  it('combina peleas profesionales y amateur del año que cierra, y deja afuera las de otros años', () => {
    const p = partidaAPuntoDeCerrarAnio();
    const jugadorConPeleas = {
      ...p.jugador,
      historial: [peleaDePrueba(p.semanaGlobal, { rivalNombre: 'De este año (pro)' })],
      historialAmateur: [
        peleaDePrueba(p.semanaGlobal - 5, { rivalNombre: 'De este año (amateur)' }),
        peleaDePrueba(1, { rivalNombre: 'De un año viejo' }),
      ],
    };
    const paso = siguienteBeat({ ...p, jugador: jugadorConPeleas });
    expect(paso.beat.tipo).toBe('resumenAnio');
    const nombres = paso.beat.datos.peleas.map((x) => x.rivalNombre);
    expect(nombres).toContain('De este año (pro)');
    expect(nombres).toContain('De este año (amateur)');
    expect(nombres).not.toContain('De un año viejo');
  });

  it('no muta la partida original', () => {
    const p = partidaAPuntoDeCerrarAnio({
      jugador: { ...nuevaPartida(1).jugador, historial: [peleaDePrueba(1)] },
    });
    const antes = JSON.stringify(p);
    siguienteBeat(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('serializable de punta a punta (JSON round-trip no pierde nada del beat)', () => {
    const p = partidaAPuntoDeCerrarAnio({
      jugador: { ...nuevaPartida(1).jugador, historial: [peleaDePrueba(1)] },
    });
    const paso = siguienteBeat(p);
    const vueltaYVuelta = JSON.parse(JSON.stringify(paso.beat));
    expect(vueltaYVuelta).toEqual(paso.beat);
  });
});

describe('siguienteBeat: sin peleas en el año, no aparece el resumen (nada de ceremonia)', () => {
  it('un año sin ninguna pelea (aunque haya elegido la mejora obligatoria) no interrumpe: el primer beat sigue siendo mejora', () => {
    const p = partidaAPuntoDeCerrarAnio();
    const conDecision = registrarDecision(p, { tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia' });
    // jugador.historial/historialAmateur ya arrancan vacíos en crearPeleador.
    const paso = siguienteBeat(conDecision);
    expect(paso.beat.tipo).not.toBe('resumenAnio');
    expect(paso.beat.tipo).toBe('mejora');
  });

  it('el primer año de la carrera (bloqueGlobal 1, sin pasar por avanzarBloque todavía) nunca dispara el resumen', () => {
    const p = nuevaPartida(2);
    const paso = siguienteBeat(p);
    expect(paso.beat.tipo).not.toBe('resumenAnio');
  });
});
