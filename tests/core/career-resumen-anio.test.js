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
    expect(p.beatsResumenAnio ?? []).toEqual([]);
  });
});

// v12 (pedido textual: "que el resumen aparezca al principio de cada año
// calendario, no al final de un bloque"): `anioCerrado` (un solo registro
// crudo) pasa a ser `beatsResumenAnio` (un ARRAY de beats 'resumenAnio' ya
// armados y filtrados) — el filtro `anioTieneAlgoQueContar` y el armado del
// beat pasan a resolverse en el momento en que se detecta el cruce (ver
// `cerrarAniosCruzados` en career.js), no después: un salto de calendario
// puede cerrar más de un año de una sola vez (ver el describe de más abajo,
// "un salto que cruza más de un año"), así que hace falta poder devolver
// más de un beat.
describe('avanzarBloque: cierra el año calendario que cruza y abre uno nuevo', () => {
  it('deja beatsResumenAnio con el beat resumenAnio del año que cierra, y abre un registroAnioActual nuevo para el año que arranca', () => {
    const p = nuevaPartida();
    const conDecision = registrarDecision(p, {
      tipo: 'mejora', titulo: 'Mejora', opcion: 'Más potencia', semana: p.semanaGlobal,
    });
    const despues = avanzarBloque(conDecision);

    expect(despues.beatsResumenAnio).toHaveLength(1);
    const [beat] = despues.beatsResumenAnio;
    expect(beat.tipo).toBe('resumenAnio');
    expect(beat.datos.anio).toBe(p.registroAnioActual.anio);
    expect(beat.datos.decisiones).toHaveLength(1);

    expect(despues.registroAnioActual.anio).toBe(fechaDe(despues.semanaGlobal, ANIO_INICIAL).anio);
    expect(despues.registroAnioActual.anio).toBeGreaterThan(beat.datos.anio);
    expect(despues.registroAnioActual.decisiones).toEqual([]);
    expect(despues.registroAnioActual.muestrasMedia).toHaveLength(1);
  });

  it('un año sin nada que contar no deja ningún beat pendiente', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.beatsResumenAnio).toEqual([]);
  });

  it('no muta la partida original (registroAnioActual/beatsResumenAnio incluidos)', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });
});

// v12 (causa real del "45.9% en enero" medido incluso DESPUÉS de arreglar el
// cruce de calendario): un campamento (firmarPelea + campCarta/campSparring,
// siguienteBeat) avanza semanaGlobal DENTRO del bloque actual, semanas que
// son parte del año de ESE bloque — pero avanzarBloque sumaba
// `semanasDeBloque` sobre la semana YA corrida por el campamento, así que
// cada campamento agregaba semanas de MÁS que nunca se recuperaban: el
// calendario se iba corriendo mes a mes, bloque a bloque, para siempre (el
// mismo patrón que reportó el usuario: "los primeros 5 caen en enero,
// después se van corriendo a marzo, junio, octubre"). El fix: el próximo
// bloque arranca SIEMPRE `semanasDeBloque` semanas después de donde arrancó
// ESTE bloque (`semanaInicioBloque`), nunca desde donde el campamento dejó
// `semanaGlobal` a la deriva.
describe('avanzarBloque: no arrastra el atraso de un campamento al próximo bloque', () => {
  it('si un campamento ya adelantó semanaGlobal dentro del bloque, el próximo bloque igual arranca semanasDeBloque semanas después del inicio de ESTE', () => {
    const p = nuevaPartida();
    // Simula el estado DESPUÉS de que un campamento de 15 semanas (el máximo,
    // 5 beats × 3 semanas) corrió semanaGlobal dentro del bloque actual —
    // pero el bloque en sí sigue siendo el mismo (semanaInicioBloque no se
    // toca hasta el próximo avanzarBloque).
    const conCampamentoYaCorrido = { ...p, semanaGlobal: p.semanaInicioBloque + 15 };
    const despues = avanzarBloque(conCampamentoYaCorrido);
    expect(despues.semanaGlobal).toBe(p.semanaInicioBloque + 52);
    // El próximo bloque también arranca alineado: su propio inicio queda
    // registrado para el salto que viene.
    expect(despues.semanaInicioBloque).toBe(despues.semanaGlobal);
  });

  it('sin ningún campamento de por medio, el resultado es igual al de siempre: 52 semanas después', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.semanaGlobal).toBe(p.semanaInicioBloque + 52);
  });

  it('el atraso arrastrado no cambia CUÁNTOS años cruza el bloque (sigue siendo exactamente uno, con aniosPorBloque=1)', () => {
    const p = nuevaPartida();
    const conCampamentoYaCorrido = { ...p, semanaGlobal: p.semanaInicioBloque + 15 };
    const despues = avanzarBloque(conCampamentoYaCorrido);
    expect(fechaDe(despues.semanaGlobal, ANIO_INICIAL).anio).toBe(ANIO_INICIAL + 1);
    expect(fechaDe(despues.semanaGlobal, ANIO_INICIAL).mes).toBe(1);
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
    // El bloque actual arrancó 10 semanas antes de `semanaGlobal` (como si un
    // campamento ya hubiera corrido esas 10 semanas dentro de este mismo
    // bloque) — así avanzarBloque sigue saltando exactamente 52 semanas
    // después de donde arrancó ESTE bloque (ver el comentario grande en
    // avanzarBloque, career.js), no un valor arbitrario.
    semanaInicioBloque: semanaGlobal - 10,
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
    // (mismo criterio que la media), no solo su valor. Bug v9 ("rankeado
    // antes de debutar"): esta partida se arma a mano en 'juvenil'
    // (etapaIndice:0) con el jugador recién creado — record en 0-0-0, sin
    // debutar como profesional todavía —, así que el ranking real de esa
    // muestra es `null` (ver rankingDelJugador, world.js), no un número.
    expect(paso.beat.datos.muestrasMedia[0].ranking).toBeNull();

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

describe('siguienteBeat: un año completamente vacío no dispara el resumen (nada de ceremonia)', () => {
  // v12: `anioTieneAlgoQueContar` se relajó a "peleas O decisiones" — un año
  // con la mejora obligatoria ya elegida SÍ amerita resumen ahora (ver
  // year-summary.test.js). Este test pasa a cubrir el caso que de verdad
  // sigue sin ceremonia: CERO peleas y CERO decisiones.
  it('un año sin ninguna pelea NI ninguna decisión no interrumpe: el primer beat sigue siendo mejora', () => {
    const p = partidaAPuntoDeCerrarAnio();
    // jugador.historial/historialAmateur ya arrancan vacíos en crearPeleador,
    // y no se registró ninguna decisión sobre `p`.
    const paso = siguienteBeat(p);
    expect(paso.beat.tipo).not.toBe('resumenAnio');
    expect(paso.beat.tipo).toBe('mejora');
  });

  it('el primer año de la carrera (bloqueGlobal 1, sin pasar por avanzarBloque todavía) nunca dispara el resumen', () => {
    const p = nuevaPartida(2);
    const paso = siguienteBeat(p);
    expect(paso.beat.tipo).not.toBe('resumenAnio');
  });
});

// v12 (pedido textual: "revisá que el resumen se muestre al principio de
// cada año, en cada enero"): la causa real medida (54% de los resúmenes
// caían fuera de enero, 28% de los años ni siquiera tenían resumen) era que
// el resumen estaba atado al FIN DE BLOQUE, no al año calendario — y
// `semanaGlobal` avanza en DOS lugares: el salto grande de `avanzarBloque`
// (ya cubierto arriba) y acá, semana a semana, cada beat de campamento
// (`campCarta`/`campSparring`, ver `armarBeatsCampamento` en campamento.js).
// Antes de esta ronda, ese segundo camino nunca chequeaba si el avance
// cruzaba un año — el registro seguía acumulando semanas de MÁS de un año
// calendario antes de que el próximo `avanzarBloque` lo cerrara, así que el
// resumen se iba corriendo mes a mes con cada campamento hasta terminar
// saltándose años enteros.
describe('siguienteBeat: un beat de campamento que cruza el año calendario también dispara el resumen', () => {
  it('si un campCarta empuja semanaGlobal al año siguiente, el resumen aparece antes de que siga el campamento', () => {
    const p = nuevaPartida(1);
    // Dos semanas antes de que cambie el año: el propio campCarta (3
    // semanas, SEMANAS_POR_BEAT_CAMPAMENTO) es lo que cruza la frontera.
    const semanaGlobal = 1 + 52 * 3 - 2;
    const anioQueCierra = fechaDe(semanaGlobal, ANIO_INICIAL).anio;
    const jugadorConPelea = { ...p.jugador, historial: [peleaDePrueba(semanaGlobal)] };
    const partida = {
      ...p,
      jugador: jugadorConPelea,
      semanaGlobal,
      registroAnioActual: iniciarRegistroAnio(semanaGlobal, jugadorConPelea, p.mundo),
      cola: [
        { tipo: 'campCarta', datos: { carta: { id: 'x' }, oferta: { rivalId: 'r1' }, semanas: 3, ultimo: false } },
        { tipo: 'mejora', datos: { cartas: [] } },
      ],
    };

    const paso1 = siguienteBeat(partida);
    expect(paso1.beat.tipo).toBe('campCarta');
    expect(fechaDe(paso1.partida.semanaGlobal, ANIO_INICIAL).anio).toBeGreaterThan(anioQueCierra);

    const paso2 = siguienteBeat(paso1.partida);
    expect(paso2.beat.tipo).toBe('resumenAnio');
    expect(paso2.beat.datos.anio).toBe(anioQueCierra);
    expect(paso2.beat.datos.peleas).toHaveLength(1);

    // El resto del campamento (acá, la mejora que seguía en la cola) no se
    // pierde: aparece justo después del resumen.
    const paso3 = siguienteBeat(paso2.partida);
    expect(paso3.beat.tipo).toBe('mejora');
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida(1);
    const semanaGlobal = 1 + 52 * 3 - 2;
    const partida = {
      ...p,
      semanaGlobal,
      registroAnioActual: iniciarRegistroAnio(semanaGlobal, p.jugador, p.mundo),
      cola: [{ tipo: 'campCarta', datos: { carta: { id: 'x' }, oferta: { rivalId: 'r1' }, semanas: 3, ultimo: false } }],
    };
    const antes = JSON.stringify(partida);
    siguienteBeat(partida);
    expect(JSON.stringify(partida)).toBe(antes);
  });
});

// v12 (pedido explícito: "si un avance cruza más de un año, resolvelo de
// forma que no se pierda ningún año — decidí cómo, emitir uno por año o
// fusionar, y documentá el criterio"). Decisión: EMITIR UNO POR AÑO, nunca
// fusionar — así cada año conserva sus propias peleas/decisiones/muestras
// intactas, sin mezclar dos años en una sola pantalla. Con los
// `aniosPorBloque` actuales (siempre 1, ver ETAPAS en career.js) un salto de
// `avanzarBloque` nunca cruza más de un año exacto — pero un beat de
// campamento SÍ podría, en teoría, si alguna vez `SEMANAS_POR_BEAT_CAMPAMENTO`
// o la cantidad de beats creciera. Estos tests fuerzan la situación con un
// beat de campamento "de juguete" (semanas artificialmente grandes: la
// forma del dato es la misma que cualquier campCarta real, solo que ningún
// camino del juego hoy genera una tan larga) para probar que el mecanismo
// genérico de cierre (`cerrarAniosCruzados`, career.js) no pierde ningún año
// en el medio, sea cual sea el tamaño del salto.
describe('siguienteBeat: un salto que cruza más de un año calendario no pierde ninguno', () => {
  it('emite un resumenAnio por cada año cruzado, en orden cronológico', () => {
    const p = nuevaPartida(1);
    const semanaGlobal = 1 + 52 * 5; // arranca justo al principio de un año
    const anioAntes = fechaDe(semanaGlobal, ANIO_INICIAL).anio;
    const jugador = {
      ...p.jugador,
      historial: [
        peleaDePrueba(semanaGlobal, { rivalNombre: 'Del año que arranca' }),
        peleaDePrueba(semanaGlobal + 52 + 5, { rivalNombre: 'Del año intermedio' }),
      ],
    };
    const partida = {
      ...p,
      jugador,
      semanaGlobal,
      registroAnioActual: iniciarRegistroAnio(semanaGlobal, jugador, p.mundo),
      cola: [
        // Un beat de campamento "de juguete": nunca sale así de un
        // campamento real, pero la forma del dato es la misma (ver el
        // comentario grande arriba).
        { tipo: 'campCarta', datos: { carta: { id: 'x' }, oferta: { rivalId: 'r1' }, semanas: 52 * 2 + 20, ultimo: false } },
        { tipo: 'mejora', datos: { cartas: [] } },
      ],
    };

    const paso1 = siguienteBeat(partida);
    expect(paso1.beat.tipo).toBe('campCarta');
    expect(fechaDe(paso1.partida.semanaGlobal, ANIO_INICIAL).anio).toBe(anioAntes + 2);

    const paso2 = siguienteBeat(paso1.partida);
    expect(paso2.beat.tipo).toBe('resumenAnio');
    expect(paso2.beat.datos.anio).toBe(anioAntes);
    expect(paso2.beat.datos.peleas.map((x) => x.rivalNombre)).toEqual(['Del año que arranca']);

    const paso3 = siguienteBeat(paso2.partida);
    expect(paso3.beat.tipo).toBe('resumenAnio');
    expect(paso3.beat.datos.anio).toBe(anioAntes + 1);
    expect(paso3.beat.datos.peleas.map((x) => x.rivalNombre)).toEqual(['Del año intermedio']);
    // El registro que queda corriendo es el del año NUEVO (el que recién
    // arrancó), no uno de los que se cerraron.
    expect(paso3.partida.registroAnioActual.anio).toBe(anioAntes + 2);

    const paso4 = siguienteBeat(paso3.partida);
    expect(paso4.beat.tipo).toBe('mejora');
  });

  it('si el año intermedio queda completamente vacío, se saltea sin perder el resto', () => {
    const p = nuevaPartida(1);
    const semanaGlobal = 1 + 52 * 5;
    const anioAntes = fechaDe(semanaGlobal, ANIO_INICIAL).anio;
    const jugador = {
      ...p.jugador,
      historial: [peleaDePrueba(semanaGlobal, { rivalNombre: 'Del año que arranca' })],
    };
    const partida = {
      ...p,
      jugador,
      semanaGlobal,
      registroAnioActual: iniciarRegistroAnio(semanaGlobal, jugador, p.mundo),
      cola: [
        { tipo: 'campCarta', datos: { carta: { id: 'x' }, oferta: { rivalId: 'r1' }, semanas: 52 * 2 + 20, ultimo: false } },
        { tipo: 'mejora', datos: { cartas: [] } },
      ],
    };

    const paso1 = siguienteBeat(partida);
    const paso2 = siguienteBeat(paso1.partida);
    expect(paso2.beat.tipo).toBe('resumenAnio');
    expect(paso2.beat.datos.anio).toBe(anioAntes);

    // El año intermedio no tuvo peleas ni decisiones: no aparece su
    // resumen, pero lo que seguía en la cola tampoco se pierde.
    const paso3 = siguienteBeat(paso2.partida);
    expect(paso3.beat.tipo).toBe('mejora');
  });
});
