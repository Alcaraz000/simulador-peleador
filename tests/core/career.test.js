import { describe, it, expect } from 'vitest';
import {
  crearPeleador, mediaDe, repartirOrigenes,
} from '../../src/core/fighter.js';
import { repartirApodos } from '../../src/core/nicknames.js';
import {
  ETAPAS, crearPartida, siguienteBeat, etapaActual, avanzarBloque, firmarPelea, cancelarProximaPelea,
  edadDeDeclive,
  faseFisicaJugador,
} from '../../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../../src/core/offers.js';
import {
  intentosDePelea, resolverRondaMinijuego, resultadoDeMarcador, roundDeCierreMinijuego, rondasParaGanar,
} from '../../src/core/tramite.js';
import { aplicarCarta } from '../../src/core/cards.js';
import { resolverOpcion } from '../../src/core/events.js';
import { createRng } from '../../src/core/rng.js';
import { SEMANAS_POR_ANIO, semanasHastaPelea, fechaDe } from '../../src/core/calendario.js';
import { ANIO_INICIAL } from '../../src/core/world.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

function jugarTodo(partida, limite = 400) {
  let actual = partida;
  const beats = [];
  let guardia = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat) beats.push(paso.beat);
  }
  return { partida: actual, beats };
}

// Puntaje crudo de mods positivos — mismo criterio que `elegirMejor`/
// `puntajeMods` en scripts/balance-sim.mjs (no se importa desde ahí: ese
// script no es un módulo pensado para reusarse, arranca su propia simulación
// apenas se lo importa).
function puntajeMods(mods = {}) {
  return Object.values(mods).reduce((acc, v) => acc + Math.max(0, v), 0);
}

function elegirMejorCarta(cartas) {
  return cartas.reduce(
    (mejor, c) => (puntajeMods(c.mods) > puntajeMods(mejor.mods) ? c : mejor),
    cartas[0],
  );
}

function elegirMejorOpcion(carta) {
  return carta.opciones.reduce((mejor, o) => {
    const puntuar = (op) => {
      const prob = op.probabilidades
        ? Math.max(...op.probabilidades.map((p) => puntajeMods(p.mods)))
        : 0;
      return puntajeMods(op.mods) + prob + (op.efectos?.dinero ?? 0) / 20000;
    };
    return puntuar(o) > puntuar(mejor) ? o : mejor;
  }, carta.opciones[0]);
}

// Juega una carrera entera aceptando y ganando cada oferta JUGABLE que
// aparece (sin correr el motor de pelea completo: aplica directamente un
// resultado ganador vía aplicarResultado), Y ELIGIENDO SIEMPRE LA MEJOR
// OPCIÓN en cada mejora/evento/redes/campCarta — sirve para verificar que la
// progresión de cinturones funciona de punta a punta cuando al jugador le
// va bien de verdad, no solo cuando gana peleas con la MEDIA congelada.
//
// Bloque 6 (hallazgo de balance): antes de este bloque, este helper NO
// aplicaba ninguna carta — el jugador ganaba todas sus peleas jugables pero
// su MEDIA nunca se movía más allá del crecimiento pasivo (career.js). Con
// un mundo que también crece de verdad (ver el arreglo de `declive` en
// world.js), un jugador que no crece nunca deja de ser competitivo — así que
// el mismo cambio que arregló el balance real hizo que este helper dejara de
// alcanzar ninguna oferta jugable dentro de la ventana de los tests. Ahora
// aplica siempre la mejor carta ofrecida (mismo criterio que
// scripts/balance-sim.mjs: la opción con más puntos de mods positivos, más
// el mejor desenlace posible si hay probabilidades, más el dinero como
// desempate), consumiendo un rng cosmético propio (derivado de
// `partida.semilla`, igual que main.js) para resolverOpcion/el minijuego de
// trámite — nunca el rng propio de la partida, que sigue calibrando el ritmo.
//
// Task v3 ("las semanas de preparación antes de una pelea"): aceptar ya no
// resuelve la pelea en el acto — firma el contrato (firmarPelea) y el
// campamento (3-5 beats más, campCarta/campSparring) se juega como cualquier
// otro beat. La pelea en sí se resuelve recién cuando aparece el beat
// `ultimo` del campamento, no en el beat 'oferta'. `beats` cuenta TODO lo que
// pasó por acá (incluido el campamento): es la medida real del presupuesto
// de ritmo de una carrera jugada de punta a punta, no solo de la cola "en
// bruto" (ver jugarTodo, más arriba, que nunca acepta nada y por lo tanto
// nunca dispara ningún campamento).
//
// v6, segunda vuelta ("no todas las peleas se juegan igual"): `ofertas`
// cuenta las peleas JUGABLES (beat 'oferta' -> campamento completo) MÁS los
// destacados de trámite (Bloque 6: "no toda defensa es un evento" — una
// defensa rutinaria ahora se juega con el minijuego, no con la crónica
// completa, pero sigue siendo LA pelea del año de un campeón). Las de
// trámite silenciosas (beat 'peleasResueltas') se resuelven solas DENTRO de
// armarCola, antes de que este helper vea nada que aceptar. `peleasTotales`
// (jugador.record) es el número que de verdad mide el objetivo de "30-32
// peleas profesionales": jugables + destacadas + trámite silencioso, juntas.
function jugarGanandoTodo(partida, limite = 500) {
  let actual = partida;
  const rngCosmetico = createRng(`${partida.semilla}_cosmetico`);
  let guardia = 0;
  let defensas = 0;
  let ofertas = 0;
  let beats = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (!paso.beat) continue;
    beats += 1;

    if (paso.beat.tipo === 'mejora') {
      const elegida = elegirMejorCarta(paso.beat.datos.cartas);
      const aplicado = aplicarCarta(actual.jugador, elegida);
      actual = { ...actual, jugador: aplicado.jugador };
    } else if (paso.beat.tipo === 'evento' || paso.beat.tipo === 'redes') {
      const carta = paso.beat.datos.carta;
      const opcion = elegirMejorOpcion(carta);
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: actual.jugador, carta, opcionId: opcion.id, rivalidades: actual.rivalidades,
        rivalObjetivoId: actual.mundo.roster[0]?.id ?? null,
      });
      actual = { ...actual, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    } else if (paso.beat.tipo === 'tramiteDestacado') {
      // Bloque 6: la defensa rutinaria de un campeón se juega con el
      // minijuego (piedra-papel-tijera), nunca en silencio — mismo criterio
      // que scripts/balance-sim.mjs: "jugando bien" siempre elige la misma
      // acción táctica (el ciclo es simétrico, no cambia el resultado
      // agregado) y gana lo que el rng cosmético defina.
      const { oferta, alMejorDe } = paso.beat.datos;
      const necesarias = rondasParaGanar(alMejorDe);
      let puntosJugador = 0;
      let puntosRival = 0;
      while (puntosJugador < necesarias && puntosRival < necesarias) {
        const { resultado } = resolverRondaMinijuego(rngCosmetico, {
          jugador: actual.jugador, rivalMedia: oferta.rivalMedia, eleccionJugador: 'tecnico',
        });
        if (resultado === 'jugador') puntosJugador += 1; else puntosRival += 1;
      }
      const { metodo, ganador } = resultadoDeMarcador({ jugador: puntosJugador, rival: puntosRival }, alMejorDe);
      const round = roundDeCierreMinijuego(rngCosmetico, { jugador: actual.jugador, oferta, metodo });
      ofertas += 1;
      if (oferta.nivel === 'defensa') defensas += 1;
      const resultado = aplicarResultado(actual.jugador, {
        oferta, resultado: { ganador, metodo, round }, modo: 'tramite', semanaGlobal: actual.semanaGlobal,
      });
      actual = { ...actual, jugador: resultado.jugador };
    } else if (paso.beat.tipo === 'oferta') {
      const { oferta } = paso.beat.datos;
      actual = firmarPelea(actual, { oferta });
    } else if (paso.beat.tipo === 'campCarta') {
      const { carta, oferta, ultimo } = paso.beat.datos;
      const opcion = elegirMejorOpcion(carta);
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: actual.jugador, carta, opcionId: opcion.id, rivalidades: actual.rivalidades,
      });
      actual = { ...actual, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
      if (ultimo) {
        ofertas += 1;
        if (oferta.nivel === 'defensa') defensas += 1;
        const resultado = aplicarResultado(actual.jugador, {
          oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 }, semanaGlobal: actual.semanaGlobal,
        });
        actual = { ...actual, jugador: resultado.jugador };
      }
    } else if (paso.beat.tipo === 'campSparring') {
      const { oferta, ultimo } = paso.beat.datos;
      if (ultimo) {
        ofertas += 1;
        if (oferta.nivel === 'defensa') defensas += 1;
        const resultado = aplicarResultado(actual.jugador, {
          oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 }, semanaGlobal: actual.semanaGlobal,
        });
        actual = { ...actual, jugador: resultado.jugador };
      }
    }
  }
  const peleasTotales = actual.jugador.record.v + actual.jugador.record.d + actual.jugador.record.e;
  return {
    partida: actual, defensas, ofertas, beats, peleasTotales,
  };
}

describe('etapas', () => {
  // v6, segunda vuelta ("'Veterano' no es una categoría nueva... el
  // peleador sigue siendo profesional"): ETAPAS pasa de CUATRO entradas a
  // TRES — profesional dura de punta a punta de la carrera pro (debut a
  // los 21, hasta el retiro ~39). "Veterano" sigue existiendo como etiqueta
  // de SABOR (ver tagContenido en career.js), nunca como una etapa real.
  it('define las tres etapas en orden', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['juvenil', 'amateur', 'profesional']);
  });

  // v13 (Task 5.1, "tres decisiones al año"): un bloque deja de ser un año y
  // pasa a ser un cuatrimestre — 24 años × 3 = 72 bloques (una decisión cada
  // uno, ver el comentario grande de ETAPAS en career.js).
  it('suman setenta y dos bloques (24 anios x 3 decisiones por anio)', () => {
    expect(ETAPAS.reduce((a, e) => a + e.bloques, 0)).toBe(72);
  });

  it('la carrera cubre de los 15 a los ~39', () => {
    const BLOQUES_POR_ANIO = 3;
    const totalAnios = ETAPAS.reduce((a, e) => a + e.bloques, 0) / BLOQUES_POR_ANIO;
    const finEstimado = 15 + totalAnios;
    expect(finEstimado).toBeGreaterThanOrEqual(38);
    expect(finEstimado).toBeLessThanOrEqual(41);
  });

  it('en juvenil se pelea menos que en amateur', () => {
    const juvenil = ETAPAS.find((e) => e.id === 'juvenil');
    const amateur = ETAPAS.find((e) => e.id === 'amateur');
    expect(juvenil.probPelea).toBeLessThan(amateur.probPelea);
  });

  // Profesional ya NO tiene un `probPelea` fijo (Pedido 4, v6: "de joven se
  // pelea más seguido... un pibe de 21 pelea cuatro o cinco veces al año").
  // La frecuencia ahora depende de la edad — `intentosDePelea` (tramite.js).
  // Este test confirma la forma general del arco (más joven, más peleas)
  // sin acoplarse a los números exactos de las bandas (esos se calibran con
  // scripts/_tune.mjs y pueden moverse sin romper este test).
  it('profesional ya no tiene probPelea: la frecuencia de pelea depende de la edad, no de la etapa', () => {
    const pro = ETAPAS.find((e) => e.id === 'profesional');
    expect(pro.probPelea).toBeUndefined();

    const rng = createRng(1);
    const jugadorJoven = { edad: 21, ranking: 50, titulos: [] };
    const jugadorVeterano = { edad: 38, ranking: 50, titulos: [] };
    const n = 300;
    let totalJoven = 0;
    let totalVeterano = 0;
    for (let i = 0; i < n; i += 1) {
      totalJoven += intentosDePelea(rng, jugadorJoven);
      totalVeterano += intentosDePelea(rng, jugadorVeterano);
    }
    expect(totalJoven / n).toBeGreaterThan(totalVeterano / n);
  });
});

describe('crearPartida', () => {
  it('arranca en el bloque 1 de la etapa juvenil', () => {
    const p = nuevaPartida();
    expect(p.etapaIndice).toBe(0);
    expect(p.bloque).toBe(1);
    expect(p.terminada).toBe(false);
    expect(p.legado).toBeNull();
    expect(p.version).toBe(1);
  });

  it('crea el mundo con la disciplina y categoria del jugador', () => {
    const p = nuevaPartida();
    expect(p.mundo.disciplina).toBe('boxeo');
    expect(p.mundo.categoria).toBe('pluma');
    expect(p.mundo.roster.length).toBeGreaterThan(5);
  });

  it('el jugador arranca con 15 anios y sin rivalidades', () => {
    const p = nuevaPartida();
    expect(p.jugador.edad).toBe(15);
    expect(p.rivalidades).toEqual([]);
  });

  it('es determinista con la misma semilla', () => {
    expect(nuevaPartida(9).mundo.roster.map((r) => r.nombre))
      .toEqual(nuevaPartida(9).mundo.roster.map((r) => r.nombre));
  });

  it('arranca en la semana global 1 y sin ninguna pelea pendiente', () => {
    const p = nuevaPartida();
    expect(p.semanaGlobal).toBe(1);
    expect(p.proximaPelea).toBeNull();
  });
});

describe('siguienteBeat', () => {
  // v13 (Task 5.1): el primer beat de cada bloque es LA DECISIÓN del
  // cuatrimestre — mejora, evento o redes, elegida por peso (ya no siempre
  // 'mejora' garantizada + extras encima: eso es justo lo que rompía el
  // "exactamente 3 por año", ver PESOS_DECISION en career.js).
  it('el primer beat de cada bloque es la decision del bloque (mejora, evento o redes)', () => {
    const { beat } = siguienteBeat(nuevaPartida());
    expect(['mejora', 'evento', 'redes']).toContain(beat.tipo);
    if (beat.tipo === 'mejora') {
      // Pedido del coordinador (v4): repartirMejoras a veces reparte 2 cartas
      // en vez de 3 (~1 de cada 5, ver decidirCantidadMejoras en cards.js), así
      // que ya no se puede fijar un piso de 3 para una semilla cualquiera.
      expect(beat.datos.cartas.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('la decision suele ser mejora: es ampliamente la mayoritaria de las tres', () => {
    let mejoras = 0;
    const total = 300;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { beat } = siguienteBeat(nuevaPartida(semilla));
      if (beat.tipo === 'mejora') mejoras += 1;
    }
    expect(mejoras / total).toBeGreaterThan(0.6);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    siguienteBeat(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('marca terminada al agotar los bloques', () => {
    const { partida } = jugarTodo(nuevaPartida());
    expect(partida.terminada).toBe(true);
  });
});

describe('ritmo de la carrera', () => {
  // Task v3: el presupuesto de ritmo tiene que medirse sobre una carrera
  // REALMENTE jugada (aceptando ofertas, con su campamento de 3-5 beats cada
  // una) — jugarTodo (arriba) nunca acepta nada, así que nunca dispara ningún
  // campamento y mediría un piso irreal.
  //
  // ===== RONDA v6, SEGUNDA VUELTA ("no todas las peleas se juegan igual") =====
  // Con las peleas de trámite resolviéndose solas (ver esPeleaImportante en
  // offers.js, armarLotePeleas en tramite.js), `beats` acá abajo cuenta los
  // beats ESTRUCTURALES que el jugador de verdad resuelve con el mando desde
  // el tablero (mejora, evento, redes, sparring, lesionSinOferta,
  // peleasResueltas, la oferta jugable en sí, y el campamento de la pelea
  // jugable) — pero NO incluye las acciones de la pantalla completa de la
  // pelea jugable (negociación, careo, ronda a ronda, rincón, golpe de
  // gracia): esas viven fuera de `siguienteBeat` (ver `pelear`/`negociar`/
  // `careo`, main.js) y se miden aparte con scripts/balance-sim.mjs, que sí
  // corre el motor de pelea completo — ver el informe entregado con esta
  // ronda para el estimado de MINUTOS de partida completo (con su supuesto
  // explícito de segundos por beat).
  //
  // v13 (Task 5.1/5.2, "el ritmo"): los números viejos de acá (v6/v7) ya no
  // aplican — el bloque pasó de año a cuatrimestre (72 en vez de 24, con una
  // decisión GARANTIZADA en cada uno, no probabilística) y las peleas por
  // año pasaron a depender del MOMENTO de la carrera (joven/prime/campeón/
  // veterano, ver tramite.js), no de una banda continua por edad.
  //
  // Bloque 6 ("no toda defensa es un evento" + el arreglo de fondo de
  // `declive` en world.js, que dejó de ser casi un no-op): `jugarGanandoTodo`
  // (arriba) pasó a elegir siempre la MEJOR mejora/evento/redes/campCarta —
  // antes de este bloque nunca tocaba una carta, y con un mundo que ahora
  // crece de verdad un jugador que no crece se queda sin ofertas jugables
  // (ver el comentario grande de `jugarGanandoTodo`). Con la MEDIA subiendo
  // de verdad Y las defensas rutinarias resolviéndose con el minijuego (no
  // con la crónica completa), el número de BEATS estructurales bajó bastante
  // del ~158.5 de la ronda anterior. Medido con este mismo método
  // (jugarGanandoTodo, 4500 semillas en tres ventanas de 1500 — ver el
  // informe de balance de esta ronda para la estabilidad):
  //   beats estructurales: avg≈145.4 | min=118 max=168, estable entre ventanas
  //   peleas PROFESIONALES TOTALES (jugables+destacadas+trámite): avg≈26.3 |
  //   min=23 max=36, estable entre ventanas
  it('sobre muchas semillas, el promedio de beats estructurales/carrera cae en el rango medido (jugadas de punta a punta, con campamento incluido)', () => {
    const total = 1500;
    const todos = [];
    for (let semilla = 1; semilla <= total; semilla += 1) {
      todos.push(jugarGanandoTodo(nuevaPartida(semilla)).beats);
    }
    const promedio = todos.reduce((a, b) => a + b, 0) / total;

    // Banda amplia sobre el ~145.4 medido, para no ser flaky pero seguir
    // marcando una regresión real si alguien recorta o infla el ritmo.
    expect(promedio).toBeGreaterThanOrEqual(132);
    expect(promedio).toBeLessThanOrEqual(158);

    const dentroDelRango = todos.filter((b) => b >= 100 && b <= 190).length;
    expect(dentroDelRango / total).toBeGreaterThanOrEqual(0.97);
  });

  // El objetivo de la spec (Task 5.2): ~30-32 peleas PROFESIONALES por
  // carrera (jugables + trámite) — ver el comentario grande de arriba sobre
  // por qué "jugando bien" (este helper) mide un poco menos que eso: un
  // campeón (que "jugando bien" corona temprano en la mayoría de las
  // carreras) pelea una vez al año de ahí en adelante.
  it('sobre muchas semillas, las peleas profesionales totales (jugables + trámite) caen en el rango medido', () => {
    const total = 1500;
    const todas = [];
    for (let semilla = 1; semilla <= total; semilla += 1) {
      todas.push(jugarGanandoTodo(nuevaPartida(semilla)).peleasTotales);
    }
    const promedio = todas.reduce((a, b) => a + b, 0) / total;
    expect(promedio).toBeGreaterThanOrEqual(23);
    expect(promedio).toBeLessThanOrEqual(30);

    // Piso duro: ninguna carrera jugada de punta a punta debería quedar muy
    // por debajo de "una carrera profesional completa".
    expect(Math.min(...todas)).toBeGreaterThanOrEqual(15);
    const dentroDelRango = todas.filter((n) => n >= 20 && n <= 40).length;
    expect(dentroDelRango / total).toBeGreaterThanOrEqual(0.9);
  });

  it('incluye peleas jugables, mejoras y eventos', () => {
    // Semilla 1 (antes 3): el minijuego de trámite (Pedido 2, v7) suma
    // tiradas de rng nuevas dentro de armarLotePeleas, así que corre la
    // secuencia entera de la carrera de nuevo (mismo motivo que ya movió
    // esta semilla varias veces antes) — la semilla 3 dejó de traer ningún
    // 'evento'/'redes' en toda la carrera; 1 sí.
    const { beats } = jugarTodo(nuevaPartida(1));
    const tipos = new Set(beats.map((b) => b.tipo));
    expect(tipos).toContain('mejora');
    expect(tipos).toContain('oferta');
    expect(tipos.has('evento') || tipos.has('redes')).toBe(true);
  });

  // v6: la mayoría de las peleas de una carrera son de trámite — se
  // resuelven solas, sin que el jugador tenga que aceptar nada.
  it('tambien aparecen peleas de tramite, resueltas solas con su propio resumen', () => {
    const { beats } = jugarTodo(nuevaPartida(3));
    const tramite = beats.filter((b) => b.tipo === 'peleasResueltas');
    expect(tramite.length).toBeGreaterThan(0);
    tramite.forEach((b) => {
      expect(b.datos.resultados.length).toBeGreaterThan(0);
      expect(b.datos.texto.length).toBeGreaterThan(0);
    });
  });

  // v6, segunda vuelta: ya NO hay una pelea por cada oferta jugada — la
  // mayoría del historial ahora viene de peleas de trámite, resueltas solas
  // dentro de armarCola. La invariante que sigue valiendo, de punta a punta:
  // el historial tiene EXACTAMENTE una entrada por cada pelea profesional de
  // verdad (jugable + trámite), ni una pelea fantasma de más ni de menos.
  it('cada pelea profesional del historial vino de una oferta jugable o de un lote de tramite (no hay peleas fantasma)', () => {
    const { partida, ofertas, peleasTotales } = jugarGanandoTodo(nuevaPartida(4));
    expect(ofertas).toBeGreaterThan(0);
    expect(peleasTotales).toBeGreaterThan(ofertas); // hay trámite de más, no solo jugables
    expect(partida.jugador.historial.length).toBe(peleasTotales);
  });

  it('el jugador llega cerca de los 39 al final', () => {
    const { partida } = jugarTodo(nuevaPartida(6));
    expect(partida.jugador.edad).toBeGreaterThanOrEqual(36);
    expect(partida.jugador.edad).toBeLessThanOrEqual(42);
  });
});

describe('etapaActual', () => {
  // v6, segunda vuelta: ya no hay una etapa "veterano" separada — profesional
  // dura de punta a punta de la carrera pro.
  it('empieza en juvenil y termina en profesional', () => {
    const p = nuevaPartida();
    expect(etapaActual(p).id).toBe('juvenil');
    const { partida } = jugarTodo(p);
    expect(etapaActual(partida).id).toBe('profesional');
  });
});

// Sistema 2 (feedback del usuario: "hay una edad donde el prime va bajando,
// [el tablero] debería poder comunicarlo"): fase física del jugador, un arco
// de verdad — ascenso, meseta ("tu prime") y declive, en vez de un
// interruptor mudo. Usa los mismos umbrales (y la misma demora con
// preparador) que `declivePorEdadJugador` — es literalmente la versión
// "para mostrar en el tablero" del mismo cálculo.
describe('faseFisicaJugador', () => {
  function conEdad(edad, extra = {}) {
    const p = nuevaPartida();
    p.jugador.edad = edad;
    Object.assign(p.jugador, extra);
    return p.jugador;
  }

  it('lejos del umbral de declive, esta en ascenso', () => {
    expect(faseFisicaJugador(conEdad(20)).id).toBe('ascenso');
  });

  it('cerca del umbral pero sin haberlo cruzado, esta en su prime', () => {
    expect(faseFisicaJugador(conEdad(30)).id).toBe('prime');
    expect(faseFisicaJugador(conEdad(31)).id).toBe('prime');
  });

  it('pasado el umbral suave (34), esta en declive', () => {
    expect(faseFisicaJugador(conEdad(35)).id).toBe('declive');
  });

  it('pasado el umbral duro (38), el declive es mas marcado', () => {
    expect(faseFisicaJugador(conEdad(39)).id).toBe('declive_duro');
  });

  it('el preparador corre los umbrales de fase, igual que los del declive real', () => {
    expect(faseFisicaJugador(conEdad(35, { staff: ['preparador'] })).id).not.toBe('declive');
    expect(faseFisicaJugador(conEdad(35, { staff: ['preparador'] })).id).toBe('prime');
  });

  it('toda fase trae una etiqueta legible', () => {
    for (const edad of [18, 30, 33, 37]) {
      expect(faseFisicaJugador(conEdad(edad)).etiqueta.length).toBeGreaterThan(0);
    }
  });
});

describe('avanzarBloque', () => {
  it('envejece al jugador y avanza el anio del mundo', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBeGreaterThan(p.jugador.edad);
    expect(despues.mundo.anio).toBeGreaterThan(p.mundo.anio);
  });

  // v13 (Task 5.1): avanzarBloque ahora es siempre el bloque de ENERO (el
  // "pesado" — ver esInicioDeAnio/PESOS_DECISION en career.js) y avanza
  // exactamente un año entero, SEMANAS_POR_ANIO (52) — ya no depende de
  // `etapa.aniosPorBloque` (ese campo no existe más: un bloque es un
  // cuatrimestre, no un año).
  it('avanza semanaGlobal exactamente un anio (SEMANAS_POR_ANIO)', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.semanaGlobal).toBe(p.semanaGlobal + SEMANAS_POR_ANIO);
  });

  it('genera noticias del mundo', () => {
    const despues = avanzarBloque(nuevaPartida());
    expect(despues.noticias.length).toBeGreaterThan(0);
  });

  // Causa real del bug reportado por el usuario ("todas las noticias dicen
  // ÚLTIMO MOMENTO, aunque sean de antes"): antes de este fix, lo único que
  // llamaba a `marcarLeidas` (news.js) era el click del acordeón en
  // panel-noticias.js — un gesto que en PC no hace falta nunca (la lista ya
  // está siempre visible debajo del botón) y que en la práctica casi nadie
  // dispara antes de que llegue la siguiente tanda. `avanzarBloque` es el
  // flujo real del juego que suma noticias nuevas (una vez por bloque): tiene
  // que apagar la marca de la tanda anterior al sumar la propia.
  it('una tanda anterior deja de estar marcada "nueva" al sumarse una tanda nueva (causa real del bug ÚLTIMO MOMENTO)', () => {
    const p = nuevaPartida();
    p.noticias = [{
      id: 'noticia_vieja', tipo: 'victoria', titular: 'x', cuerpo: 'x', fecha: 2020, nueva: true,
    }];
    const despues = avanzarBloque(p);

    const vieja = despues.noticias.find((n) => n.id === 'noticia_vieja');
    expect(vieja).toBeTruthy();
    expect(vieja.nueva).toBe(false);

    // La tanda recién generada en ESTE bloque sí queda marcada como nueva.
    const restantes = despues.noticias.filter((n) => n.id !== 'noticia_vieja');
    expect(restantes.length).toBeGreaterThan(0);
    expect(restantes.every((n) => n.nueva === true)).toBe(true);
  });

  it('avanzando varios bloques seguidos, nunca queda más de una tanda marcada "nueva" a la vez', () => {
    let p = nuevaPartida();
    for (let i = 0; i < 5; i += 1) p = avanzarBloque(p);

    const idsDeLaUltimaTanda = p.noticias.filter((n) => n.nueva).map((n) => n.id);
    expect(idsDeLaUltimaTanda.length).toBeGreaterThan(0);

    const otraVuelta = avanzarBloque(p);
    const siguenNuevas = otraVuelta.noticias.filter((n) => idsDeLaUltimaTanda.includes(n.id) && n.nueva);
    expect(siguenNuevas).toHaveLength(0);
  });

  // v7, corrección del coordinador ("las lesiones tienen que costar de
  // verdad, evaluadas semana a semana, no una vez por bloque"): la
  // recuperación ya NO se descuenta acá, en avanzarBloque — se mudó al gate
  // por cupo de armarLotePeleas (tramite.js), disparado dentro de
  // armarCola/siguienteBeat (career.js). avanzarBloque solo, aislado, ya no
  // toca `estado.lesion` para nada (ver el test siguiente para esa
  // invariante) — para ver la recuperación de verdad hay que pasar por
  // siguienteBeat, que corre avanzarBloque Y armarCola en el mismo golpe al
  // cambiar de bloque.
  it('avanzarBloque solo (sin pasar por armarCola) no toca la lesion', () => {
    const p = nuevaPartida();
    p.jugador.estado.lesion = { id: 'ceja', nombre: 'Ceja', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x' };
    const despues = avanzarBloque(p);
    expect(despues.jugador.estado.lesion).not.toBeNull();
    expect(despues.jugador.estado.lesion.semanasRestantes).toBe(4);
  });

  // Vía siguienteBeat (avanzarBloque + armarCola en el mismo golpe): una
  // lesión corta cura apenas el primer cupo de pelea del bloque la
  // encuentra activa (ver armarLotePeleas, tramite.js) — profesional
  // siempre tiene al menos un cupo (intentosDePelea nunca da 0).
  it('recupera lesiones con el paso de los bloques (via armarCola, tramite.js)', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2; // profesional: intentosDePelea siempre da >=1 cupo
    p.jugador.estado.lesion = { id: 'ceja', nombre: 'Ceja', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x' };
    const { partida: despues } = siguienteBeat(p);
    expect(despues.jugador.estado.lesion).toBeNull();
  });

  // Sistema 1 (feedback del usuario: "¿Qué efecto tienen las lesiones?
  // Parecería que no afecta en nada"): antes, la forma se recuperaba +5 TODOS
  // los bloques sin importar si seguías lesionado. Mientras sigue activa la
  // lesión AL ARRANCAR el bloque (el estado tal cual venía del bloque
  // anterior — la recuperación de este bloque todavía no corrió, eso pasa
  // recién en armarCola), ese descanso pasivo se frena: la forma se queda
  // baja de verdad.
  it('mientras sigue lesionado al arrancar el bloque, la forma NO se recupera sola (Sistema 1: el efecto tiene que pesar)', () => {
    const p = nuevaPartida();
    p.jugador.estado.lesion = {
      id: 'rodilla', nombre: 'Rodilla', severidad: 3, semanasRestantes: 100, costo: 1, texto: 'x',
    };
    p.jugador.estado.forma = 30;
    const despues = avanzarBloque(p);
    expect(despues.jugador.estado.forma).toBe(30);
  });

  // v13: acá vivían dos tests de "forma" — uno cubría el bonus de curación
  // de `recuperar()` (dentro de armarCola), el otro el +5 pasivo por bloque
  // sano de `avanzarBloque`. La forma dejó de existir como estado del
  // peleador (ver el comentario de más arriba, "acá se descontaba fatiga y
  // se sumaba forma entre bloques"), así que no queda nada que esos dos
  // tests puedan seguir midiendo — la recuperación de la lesión en sí ya
  // está cubierta por el test de arriba ("recupera lesiones con el paso de
  // los bloques").

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('a partir de los 34 años el jugador empieza a perder agilidad y cardio', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1; // amateur: 1 año por bloque, asi el numero da redondo
    p.jugador.edad = 33;
    const agiAntes = p.jugador.atributos.agilidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBe(34);
    expect(despues.jugador.atributos.agilidad).toBeLessThan(agiAntes);
    expect(despues.jugador.atributos.cardio).toBeLessThan(cardioAntes);
  });

  // Pedido 4 (v6): antes de EDAD_FIN_CRECIMIENTO (27) los atributos SUBEN
  // solos (crecimiento pasivo) — este test cambió de sentido a propósito: ya
  // no espera "sin cambios" antes del declive, espera que efectivamente
  // crezcan (todavía lejos de cualquier declive).
  it('antes del umbral de declive, los atributos crecen solos (crecimiento pasivo)', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 20;
    const agiAntes = p.jugador.atributos.agilidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.atributos.agilidad).toBeGreaterThan(agiAntes);
    expect(despues.jugador.atributos.cardio).toBeGreaterThan(cardioAntes);
  });

  // Pedido 4: pasado EDAD_FIN_CRECIMIENTO (27) pero antes del declive (32),
  // la meseta del prime — ni sube solo ni baja.
  it('en la meseta del prime (27 a 31), los atributos no cambian solos', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 29;
    const agiAntes = p.jugador.atributos.agilidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.atributos.agilidad).toBe(agiAntes);
    expect(despues.jugador.atributos.cardio).toBe(cardioAntes);
  });

  it('con preparador contratado, el declive todavia no llegó a los 32', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 31;
    p.jugador.staff = ['preparador'];
    const agiAntes = p.jugador.atributos.agilidad;
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBe(32);
    expect(despues.jugador.atributos.agilidad).toBe(agiAntes);
  });

  it('con preparador contratado, el declive igual llega mas tarde en la carrera', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 36;
    p.jugador.staff = ['preparador'];
    const agiAntes = p.jugador.atributos.agilidad;
    const despues = avanzarBloque(p);
    expect(despues.jugador.atributos.agilidad).toBeLessThan(agiAntes);
  });

  // Sistema 2 (feedback del usuario, segunda vez: "se supone que hay una
  // edad donde va bajando el prime"): el declive de un único escalón fijo
  // (-2 velocidad/-1 cardio desde los 32 hasta el final) no se sentía como un
  // arco real. Ahora hay un segundo escalón, más duro, que arranca a los 36
  // — la misma edad en la que el propio juego narra el arranque de la etapa
  // "veterano" (ver ETAPAS, edadDesde: 36 — "Cada pelea puede ser la
  // última"): ahí el declive se agrava Y empieza a tocar también la potencia,
  // no solo piernas y pulmón.
  it('en el escalon duro el declive se agrava y empieza a pegarle tambien a la fuerza', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1; // amateur: 1 año por bloque, numero redondo
    p.jugador.edad = 37;
    const fuerzaAntes = p.jugador.atributos.fuerza;
    const velAntes = p.jugador.atributos.agilidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBe(38);
    expect(fuerzaAntes - despues.jugador.atributos.fuerza).toBe(1);
    // Más marcado que el escalón suave (-2 velocidad/-1 cardio, ver el test
    // "a partir de los 32...", arriba): acá se siente más.
    expect(velAntes - despues.jugador.atributos.agilidad).toBe(3);
    expect(cardioAntes - despues.jugador.atributos.cardio).toBe(2);
  });

  it('el escalon duro del declive tambien se demora con el preparador contratado', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 35;
    p.jugador.staff = ['preparador'];
    const fuerzaAntes = p.jugador.atributos.fuerza;
    const despues = avanzarBloque(p);
    // Con preparador el umbral duro se corre a los 39: a los 36 recién
    // arranca el escalón SUAVE (si es que llegó), la fuerza todavía no se
    // toca.
    expect(despues.jugador.atributos.fuerza).toBe(fuerzaAntes);
  });

  it('mientras el jugador tiene el cinturon mundial puesto, el mundo no le anuncia un nuevo campeon', () => {
    const p = nuevaPartida();
    p.jugador.titulos = ['Cinturón mundial'];
    p.mundo.campeonId = p.mundo.roster[0].id;
    p.mundo.roster[0].edad = 41; // fuerza lo que seria una "vacante" si nadie lo protegiera
    const despues = avanzarBloque(p);
    expect(despues.noticias.some((n) => n.titular.includes('cinturón vacante'))).toBe(false);
    expect(despues.noticias.some((n) => n.titular.includes('es el nuevo campeón'))).toBe(false);
  });

  it('sin el cinturon mundial, el mundo puede anunciar un nuevo campeon con normalidad', () => {
    const p = nuevaPartida();
    p.mundo.campeonId = p.mundo.roster[0].id;
    p.mundo.roster[0].edad = 41;
    const despues = avanzarBloque(p);
    expect(despues.noticias.some((n) => n.titular.includes('cinturón vacante'))).toBe(true);
  });
});

describe('ofertas de pelea bloqueadas por lesion', () => {
  // v6, segunda vuelta: "avisa que llegó pelea" ya no es solo el beat
  // 'oferta' (jugable) — la enorme mayoría de los años de carrera resuelven
  // su cupo de pelea como 'peleasResueltas' (trámite), sin pasar por ahí.
  // El gate de lesión (puedePelear, injuries.js) bloquea AMBOS por igual: ni
  // jugable ni trámite pueden aparecer mientras la lesión sigue activa.
  it('si esta lesionado y le tocaba pelea, avisa en vez de quedarse callado', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2; // profesional: intentosDePelea siempre da >=1 cupo
    // semanasRestantes en 400, no en un número chico: con 12 iteraciones de
    // siguienteBeat, el mínimo de beats por bloque en profesional (mientras
    // sigue lesionado) es 2 (mejora + lesionSinOferta, siempre) — así que en
    // el peor caso (sin ningún beat opcional) 12 iteraciones alcanzan para 6
    // bloques como mucho, y cada uno descuenta 52 semanas (ver ETAPAS): 6×52
    // = 312. 400 deja margen de sobra para que la lesión siga activa en todo
    // el loop, igual que antes hacía bloquesRestantes:8 contra un máximo de 6
    // bloques.
    p.jugador.estado.lesion = {
      id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, semanasRestantes: 400, costo: 85000, texto: 'x',
    };
    let actual = p;
    const tipos = [];
    for (let i = 0; i < 12; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat) tipos.push(paso.beat.tipo);
    }
    expect(tipos).not.toContain('oferta');
    expect(tipos).not.toContain('peleasResueltas');
    // Pedidos 1/2 (v7): el destacado de trámite (beat 'tramiteDestacado')
    // tampoco puede aparecer con la lesión activa — mismo gate que
    // 'oferta'/'peleasResueltas', ver más arriba.
    expect(tipos).not.toContain('tramiteDestacado');
    expect(tipos).toContain('lesionSinOferta');
  });

  it('sin lesion, esa misma situacion resuelve actividad de pelea con normalidad (jugable o de tramite)', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2;
    let actual = p;
    const tipos = [];
    for (let i = 0; i < 12; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat) tipos.push(paso.beat.tipo);
    }
    // Pedidos 1/2 (v7): un cupo de trámite puede resolverse en el momento
    // (peleasResueltas) o aparecer como destacado sin resolver, para
    // jugarse con el minijuego (tramiteDestacado) — cualquiera de las tres
    // cuenta como "hubo actividad de pelea".
    expect(tipos.includes('oferta') || tipos.includes('peleasResueltas') || tipos.includes('tramiteDestacado')).toBe(true);
    expect(tipos).not.toContain('lesionSinOferta');
  });

  // Corrección del coordinador (segunda ronda): el usuario fue textual —
  // "hasta no estar recuperado de una lesión, no puede aparecer una pelea
  // nueva" — sin matices. Antes solo bloqueaba severidad 3; ahora CUALQUIER
  // lesión activa (leve o moderada incluida) corta la oferta igual que la
  // grave. Único punto de generación de ofertas en todo el juego es
  // armarCola (acá abajo, vía siguienteBeat) — no hay otro camino que pueda
  // saltarse el gate.
  it('con lesion leve o moderada, TAMBIÉN bloquea toda actividad de pelea (sin matices de severidad)', () => {
    // semanasRestantes en 400 con 12 iteraciones, mismo margen de seguridad
    // que el test de la lesión grave (arriba): 12 iteraciones alcanzan para
    // 6 bloques como mucho (2 beats mínimo por bloque mientras sigue
    // lesionado), y 6×52=312 semanas — 400 nunca se agota en ese margen, sin
    // depender de una duración "realista" de catálogo (acá lo que se prueba
    // es el gate, no el número).
    for (const severidad of [1, 2]) {
      const p = nuevaPartida();
      p.etapaIndice = 2;
      p.jugador.estado.lesion = {
        id: 'x', nombre: 'x', severidad, semanasRestantes: 400, costo: 1, texto: 'x',
      };
      let actual = p;
      const tipos = [];
      for (let i = 0; i < 12; i++) {
        const paso = siguienteBeat(actual);
        actual = paso.partida;
        if (paso.beat) tipos.push(paso.beat.tipo);
      }
      expect(tipos).not.toContain('oferta');
      expect(tipos).not.toContain('peleasResueltas');
      expect(tipos).not.toContain('tramiteDestacado');
      expect(tipos).toContain('lesionSinOferta');
    }
  });

  // No tiene que quedar trabado: en cuanto se cura (semanasRestantes llega a
  // 0 vía recuperar(), avanzarBloque), la actividad de pelea vuelve sola en
  // el próximo bloque, sin que el jugador tenga que hacer nada especial.
  it('en cuanto se cura, la actividad de pelea vuelve sin trabas', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2;
    p.jugador.estado.lesion = {
      id: 'ceja', nombre: 'Ceja', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x',
    };
    let actual = p;
    let vioPelea = false;
    for (let i = 0; i < 8 && !vioPelea; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat?.tipo === 'oferta' || paso.beat?.tipo === 'peleasResueltas' || paso.beat?.tipo === 'tramiteDestacado') vioPelea = true;
    }
    expect(actual.jugador.estado.lesion).toBeNull();
    expect(vioPelea).toBe(true);
  });
});

describe('ofertas de pelea por carrera', () => {
  // v6, segunda vuelta ("no todas las peleas se juegan igual"): esto medía
  // solo las peleas JUGABLES completas (beat 'oferta'). Bloque 6 ("no toda
  // defensa es un evento"): una defensa rutinaria ya no se juega completa —
  // se resuelve con el minijuego ('tramiteDestacado') — así que "cuántas
  // peleas de verdad importaron" pasa a ser jugables + destacadas juntas
  // (`ofertas`, en `jugarGanandoTodo`), no solo el beat 'oferta' a secas.
  //
  // Con `jugarTodo` (nunca acepta ni gana nada, la media del jugador no se
  // mueve) esto medía casi siempre 1 sola oferta por carrera entera —
  // esperable: sin ganar ni crecer, un jugador no tiene forma de rankear lo
  // bastante alto en un mundo que ahora también crece de verdad (ver el
  // arreglo de `declive`, world.js). Por eso el helper acá abajo pasa a ser
  // `jugarGanandoTodo` (gana Y elige siempre la mejor carta) — mismo
  // criterio que 'ritmo de la carrera', arriba.
  //
  // Medido sobre 1500 semillas: avg≈11.9 | min=2 max=19 (hay carreras con
  // muy poca varianza de ranking que tardan en clasificar y otras que
  // explotan rápido — el piso duro de acá abajo es generoso a propósito,
  // para no ser flaky, y la franja "típica" cubre a la enorme mayoría sin
  // exigirle lo mismo a cada semilla individual).
  it('el promedio de peleas jugables+destacadas por carrera cae en el rango medido', () => {
    const total = 1500;
    const todas = [];
    for (let semilla = 1; semilla <= total; semilla += 1) {
      todas.push(jugarGanandoTodo(nuevaPartida(semilla)).ofertas);
    }
    const promedio = todas.reduce((a, b) => a + b, 0) / total;
    expect(promedio).toBeGreaterThanOrEqual(10);
    expect(promedio).toBeLessThanOrEqual(14);

    // Piso duro, generoso: ninguna carrera jugada de punta a punta debería
    // quedar en cero peleas jugables/destacadas.
    expect(Math.min(...todas)).toBeGreaterThanOrEqual(1);
    const dentroDelRango = todas.filter((n) => n >= 4 && n <= 20).length;
    expect(dentroDelRango / total).toBeGreaterThanOrEqual(0.97);
  });
});

// Sistema 1, corrección del coordinador ("cualquier lesión bloquea las
// ofertas — medí el efecto colateral, y si las ofertas caen por debajo de
// 12 o los tres cinturones bajan del 85%, la palanca correcta es que las
// lesiones duren menos o sean menos frecuentes, nunca aflojar el gate"): los
// tests de esa medición (con lesiones reales aplicándose pelea a pelea, no
// solo las 10 semillas de arriba) viven en su propio archivo —
// tests/core/career-lesiones-reales.test.js — para que Vitest los aísle en
// su propio worker: sumar sus dos tests de 3000 semillas a los que ya corren
// acá (ritmo de la carrera, progresión de cinturones, también 3000 cada uno)
// hacía crecer el heap del mismo worker hasta quedarse sin memoria (medido
// en esa corrección).

// Puntaje crudo de mods positivos — mismo criterio que `elegirMejorCarta`
// de arriba, usado acá para elegir el MEJOR origen/apodo ofrecido en la
// creación (igual que `elegirMejor` en scripts/balance-sim.mjs).
function elegirMejorDe(items, puntuar) {
  return items.reduce((mejor, item) => (puntuar(item) > puntuar(mejor) ? item : mejor), items[0]);
}

// Bloque 6 (hallazgo de balance, "que el talento y el reparto inicial pesen
// más"): `crearPeleador` solo tira un talento/reparto inicial DISTINTO por
// carrera si recibe un `rng` — sin uno, cae al default de fighter.js
// (`createRng(1)`, fijo). Antes de este bloque, NI la creación real del
// juego (src/main.js) NI esta clase de medición (scripts/balance-sim.mjs)
// se lo pasaban: todo peleador jugador salía con el MISMO talento pase lo
// que pase la semilla, así que el eje entero que calibra este bloque
// (sortearTalento/repartirAtributosIniciales, talento.js/fighter.js) nunca
// llegaba a pesar en ninguna carrera real — ver el informe de balance
// entregado con esta ronda. Acá se arma el jugador con el mismo criterio que
// "creación real" en balance-sim.mjs: elige el MEJOR origen/apodo ofrecido
// (jugando bien de verdad, no solo aceptando el primero) y les pasa un rng
// propio (namespaced por semilla) que sigue consumiéndose en `crearPeleador`
// — así el talento y el reparto inicial SÍ varían semilla a semilla.
function jugadorConTalentoReal(semilla) {
  const rngCreacion = createRng(`creacion_${semilla}`);
  const origenElegido = elegirMejorDe(repartirOrigenes(rngCreacion), (o) => puntajeMods(o.mods));
  const apodoElegido = elegirMejorDe(repartirApodos(rngCreacion), (a) => puntajeMods(a.mods));
  return crearPeleador({
    apellido: 'Ortiz', apodoId: apodoElegido.id, nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: origenElegido.id, media: 38, esJugador: true,
    rng: rngCreacion,
  });
}

// ---- Bloque 6: el eje de rejugabilidad -------------------------------------
// Reemplaza el viejo "≥85% consigue los tres cinturones" (spec v13,
// "simplificación y progresión" — ese objetivo se elimina a propósito: si el
// 100% de las carreras llega al mundial, el peleador malo no existe, es un
// peleador bueno con más pasos). Los objetivos nuevos:
//   - al menos un cinturón: 85-90% de las carreras jugadas de punta a punta.
//   - llegó al mundial: 20-25% — TIENE que poder fallar.
//   - media final: ~85-90, con dispersión GRANDE (un juego rejugable no
//     converge todas las carreras al mismo número).
//
// Medido con este mismo método (jugarGanandoTodo + jugadorConTalentoReal) en
// CINCO ventanas independientes de 1500 semillas cada una (1-1500,
// 1501-3000, 3001-4500, 4501-6000, 6001-7500 — la lección del proyecto sobre
// muestras chicas, "con n=150 las sub-muestras variaban 12 puntos": acá se
// verificó la estabilidad ANTES de fijar el umbral, no después):
//   al menos un cinturón: 89.2% / 87.9% / 88.5% / 86.3% / 88.7%
//   llegó al mundial:     24.5% / 24.1% / 23.3% / 23.1% / 23.9%
//   media final avg:      88.70 / 88.17 / 88.48 / 88.02 / 88.20
//   media final desv:      8.44 /  8.63 /  8.15 /  8.99 /  8.41
// Las cinco ventanas caen dentro de los rangos de la spec sin excepción — los
// umbrales de acá abajo dejan margen sobre lo medido (no pegados al valor
// exacto) para no ser flaky, pero siguen marcando una regresión real si el
// talento deja de pesar (todo sube hacia ~100%/~97) o si pesa demasiado
// (todo se derrumba).
describe('Bloque 6: el eje de rejugabilidad (reemplaza "3 cinturones")', () => {
  const NOMBRE_MUNDIAL = CINTURONES.find((c) => c.id === 'mundial').nombre;
  const TOTAL = 1500;

  function carrerasDeMuestra() {
    const resultados = [];
    for (let semilla = 1; semilla <= TOTAL; semilla += 1) {
      const { partida } = jugarGanandoTodo(crearPartida({ jugador: jugadorConTalentoReal(semilla), semilla }));
      resultados.push(partida.jugador);
    }
    return resultados;
  }

  it('sobre muchas semillas, entre 83% y 92% de las carreras jugadas de punta a punta ganan al menos un cinturón', () => {
    const jugadores = carrerasDeMuestra();
    const tasa = jugadores.filter((j) => j.titulos.length > 0).length / TOTAL;
    expect(tasa).toBeGreaterThanOrEqual(0.83);
    expect(tasa).toBeLessThanOrEqual(0.92);
  });

  it('sobre muchas semillas, entre 18% y 28% llega al cinturón mundial — tiene que poder fallar, nunca ~100%', () => {
    const jugadores = carrerasDeMuestra();
    const tasa = jugadores.filter((j) => j.titulos.includes(NOMBRE_MUNDIAL)).length / TOTAL;
    expect(tasa).toBeGreaterThanOrEqual(0.18);
    expect(tasa).toBeLessThanOrEqual(0.28);
  });

  it('la media final promedia ~85-90, con dispersión grande: un juego rejugable no converge todas las carreras al mismo número', () => {
    const jugadores = carrerasDeMuestra();
    const medias = jugadores.map((j) => mediaDe(j));
    const avg = medias.reduce((a, b) => a + b, 0) / TOTAL;
    const desv = Math.sqrt(medias.reduce((a, m) => a + (m - avg) ** 2, 0) / TOTAL);
    expect(avg).toBeGreaterThanOrEqual(84);
    expect(avg).toBeLessThanOrEqual(92);
    // Antes de este bloque la desviación estándar rondaba 1.7-1.9 (casi
    // todas las carreras terminaban en 96-99, pegadas al techo de 99) —
    // ahora tiene que ser, como mínimo, el triple.
    expect(desv).toBeGreaterThanOrEqual(6);
  });
});

// Guarda del lado opuesto: si `PROB_ASCENSO_PRIORITARIO` se acerca demasiado a 1,
// "defender el cinturón" deja de sentirse presente (el jugador siempre escala
// apenas puede y nunca ve una defensa obligatoria). Task 25 midió que en 0.95
// casi 1 de cada 5 carreras no ofrecía ninguna defensa; este test pone un piso.
// Usa `nuevaPartida` (jugador fijo) y no el talento real de arriba: esto mide
// una mecánica de matchmaking (offers.js), no el eje de rejugabilidad — con
// `jugarGanandoTodo` ya aplicando siempre la mejor carta (Bloque 6, ver el
// comentario grande ahí), el jugador fijo crece de sobra para calificar a
// defensas con normalidad. Muestra subida de 150 (flaky de nacimiento, misma
// lección del proyecto que arriba) a 1500: medido en tres ventanas de 1500,
// 0.00% / 0.07% / 0.00% sin ninguna defensa — muy por debajo del piso.
describe('defensa obligatoria (matchmaking)', () => {
  it('sobre muchas semillas, casi siempre aparece al menos una defensa obligatoria', () => {
    const total = 1500;
    let sinDefensas = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { defensas } = jugarGanandoTodo(nuevaPartida(semilla));
      if (defensas === 0) sinDefensas += 1;
    }
    expect(sinDefensas / total).toBeLessThanOrEqual(0.1);
  });
});

// Bug reportado por el usuario: "aparece en la esquina de PRÓXIMA PELEA el
// nombre del peleador que me acaba de aparecer como propuesta, no la acepté
// y ya aparece ahí, eso está mal" (con "faltan 68 semanas", casi año y
// medio, aunque el campamento son solo unas pocas semanas). Causa real:
// armarCola dejaba `proximaPelea` seteada apenas armaba la cola del bloque
// -antes de que el jugador viera siquiera el beat 'oferta'- con un
// semanaObjetivo calculado sobre la duración de TODO el bloque (~68 semanas
// en profesional), no sobre el campamento real. La corrección separa el dato
// interno de bookkeeping (`ofertaPendiente`, que ni siquiera guarda
// semanaObjetivo) de lo que el panel puede mostrar (`proximaPelea`, que solo
// nace en `firmarPelea`, con el semanaObjetivo real del campamento).
describe('ofertaPendiente / proximaPelea (calendario del tablero)', () => {
  // v6, segunda vuelta: en profesional ya NO todos los bloques traen una
  // oferta JUGABLE (la mayoría de los cupos de pelea se resuelven solos, ver
  // armarLotePeleas en tramite.js) — así que hay que avanzar bloque a bloque
  // hasta encontrar uno que sí traiga una oferta pendiente, en vez de asumir
  // que el primero la tiene. `primerPaso` es el `siguienteBeat` inmediato
  // después de arrancar ESE bloque (su primer beat de CONTENIDO real,
  // siempre 'mejora') — el mismo punto que antes probaban los tests de acá
  // abajo.
  //
  // v7, resumen de fin de año: si el año que ESE bloque cierra tuvo alguna
  // pelea, el primer beat que devuelve siguienteBeat puede ser 'resumenAnio'
  // (antes que la mejora) — ver anioTieneAlgoQueContar, year-summary.js. Acá
  // se lo consume como un beat más (no aporta nada a lo que este helper
  // busca) para seguir devolviendo, siempre, el primer beat de contenido.
  //
  // Bloque 6 (hallazgo): `actual.etapaIndice = 2` fuerza 'profesional' SIN
  // pasar por juvenil/amateur — el jugador arranca la etapa profesional a
  // los 15 (EDAD_INICIAL), no a los 21 (edadDesde real), así que la carrera
  // simulada acá TERMINA (agota los 54 bloques de 'profesional') a los ~33
  // años, nunca llega a los ~38 del tag de sabor 'veterano' (donde
  // decidirNivel, offers.js, ofrece eliminatoria sin condiciones). Con un
  // mundo que ahora sí crece de verdad (ver el arreglo de `declive` en
  // world.js), un jugador con la media base de `nuevaPartida` (45, sin
  // ninguna carta aplicada — este helper tampoco elige mejoras, solo drena
  // la cola) puede tardar más de 60 bloques en rankear lo bastante alto para
  // que decidirNivel le ofrezca algo jugable. Una media base más alta (70,
  // muy por encima de la media inicial real) no es una carrera "jugando
  // bien" — es simplemente un jugador ya fuerte de entrada, elegido a mano
  // para que este test (que verifica una invariante MECÁNICA, no de
  // balance: `ofertaPendiente` vs `proximaPelea`) encuentre su oferta rápido
  // y de forma confiable, sin depender de cuánto tarde en madurar.
  function nuevaPartidaFuerte(semilla) {
    const jugador = crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 70, esJugador: true,
    });
    return crearPartida({ jugador, semilla });
  }

  function primerPasoConOfertaPendiente(semilla, { maxBloques = 60 } = {}) {
    let actual = nuevaPartidaFuerte(semilla);
    actual.etapaIndice = 2;
    for (let i = 0; i < maxBloques; i += 1) {
      let primerPaso = siguienteBeat(actual);
      if (primerPaso.beat?.tipo === 'resumenAnio') primerPaso = siguienteBeat(primerPaso.partida);
      if (primerPaso.partida.ofertaPendiente) return primerPaso;
      // Este bloque no trajo ninguna oferta jugable (fue trámite, o nada):
      // se agota el resto de su cola para pasar limpio al próximo bloque.
      let siguiente = primerPaso.partida;
      while (siguiente.cola.length > 0) {
        siguiente = siguienteBeat(siguiente).partida;
      }
      actual = siguiente;
    }
    throw new Error(`no hubo ninguna oferta jugable pendiente en ${maxBloques} bloques (semilla ${semilla})`);
  }

  it('en cuanto se arma la cola con una oferta, queda en ofertaPendiente (dato interno) pero proximaPelea sigue null hasta que el jugador firme', () => {
    const primerPaso = primerPasoConOfertaPendiente(2);

    // v13 (ritmo nuevo): cada bloque trae UNA decisión, sorteada por peso
    // entre mejora/evento/redes — ya no es siempre 'mejora'. Lo que este test
    // protege no es cuál salió, sino que si el bloque trae una oferta más
    // adelante en la cola, `ofertaPendiente` ya la refleje (para que
    // cancelarProximaPelea pueda actuar) mientras `proximaPelea` — lo único
    // que lee el panel — sigue null: el jugador todavía no vio esa oferta,
    // mucho menos la firmó.
    expect(['mejora', 'evento', 'redes']).toContain(primerPaso.beat.tipo);
    expect(primerPaso.partida.ofertaPendiente).not.toBeNull();
    expect(primerPaso.partida.proximaPelea).toBeNull();

    let actual = primerPaso.partida;
    let beatOferta = null;
    for (let i = 0; i < 5 && !beatOferta; i += 1) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat && paso.beat.tipo === 'oferta') beatOferta = paso.beat;
    }

    expect(beatOferta).not.toBeNull();
    expect(primerPaso.partida.ofertaPendiente.oferta.id).toBe(beatOferta.datos.oferta.id);
    // Incluso llegando al beat 'oferta' (todavía sin decidir), proximaPelea
    // sigue sin mostrar nada.
    expect(actual.proximaPelea).toBeNull();
  });

  it('sin firmar, semanasHastaPelea da null: no hay nada que contar todavía', () => {
    const primerPaso = primerPasoConOfertaPendiente(2);
    expect(primerPaso.partida.ofertaPendiente).not.toBeNull();
    expect(semanasHastaPelea(primerPaso.partida)).toBeNull();
  });

  it('recién firmada, semanasHastaPelea da una cuenta regresiva creíble (el campamento son 3-5 beats, nunca ~52 semanas)', () => {
    const primerPaso = primerPasoConOfertaPendiente(2);
    const { oferta } = primerPaso.partida.ofertaPendiente;
    const firmada = firmarPelea(primerPaso.partida, { oferta });
    const faltan = semanasHastaPelea(firmada);
    expect(faltan).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(faltan)).toBe(true);
    // SEMANAS_POR_BEAT_CAMPAMENTO=3 x hasta 5 beats (campamento.js): 15 como
    // mucho, muy lejos de las ~52 semanas de un bloque entero (1 año).
    expect(faltan).toBeLessThanOrEqual(15);
  });

  it('no muta partida.ofertaPendiente de la partida original', () => {
    const p = nuevaPartida(2);
    p.etapaIndice = 2;
    const antes = JSON.stringify(p.ofertaPendiente);
    siguienteBeat(p);
    expect(JSON.stringify(p.ofertaPendiente)).toBe(antes);
  });
});

describe('firmarPelea (campamento de preparación)', () => {
  function ofertaDePrueba() {
    return {
      id: 'of_1', rivalId: 'r1', rivalApodo: 'El Zurdo', esTitulo: false,
    };
  }

  it('mete los beats de campamento al frente de la cola', () => {
    const p = nuevaPartida(1);
    p.etapaIndice = 2; // profesional
    const conCola = { ...p, cola: [{ tipo: 'noticias', datos: {} }] };
    const firmada = firmarPelea(conCola, { oferta: ofertaDePrueba() });
    expect(['campCarta', 'campSparring']).toContain(firmada.cola[0].tipo);
    expect(firmada.cola[firmada.cola.length - 1].tipo).toBe('noticias');
  });

  it('deja proximaPelea con la oferta y un semanaObjetivo mayor a la semana actual', () => {
    const p = nuevaPartida(2);
    const oferta = ofertaDePrueba();
    const firmada = firmarPelea(p, { oferta });
    expect(firmada.proximaPelea.oferta).toBe(oferta);
    expect(firmada.proximaPelea.semanaObjetivo).toBeGreaterThan(p.semanaGlobal);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida(3);
    const antes = JSON.stringify(p);
    firmarPelea(p, { oferta: ofertaDePrueba() });
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('siguienteBeat avanza semanaGlobal al consumir un beat de campamento', () => {
    const p = nuevaPartida(4);
    const firmada = firmarPelea(p, { oferta: ofertaDePrueba() });
    const semanaAntes = firmada.semanaGlobal;
    const paso = siguienteBeat(firmada);
    expect(['campCarta', 'campSparring']).toContain(paso.beat.tipo);
    expect(paso.partida.semanaGlobal).toBe(semanaAntes + paso.beat.datos.semanas);
  });

  it('consumiendo todo el campamento, semanaGlobal llega exactamente a semanaObjetivo', () => {
    const p = nuevaPartida(5);
    let actual = firmarPelea(p, { oferta: ofertaDePrueba() });
    const objetivo = actual.proximaPelea.semanaObjetivo;
    let ultimoBeat = null;
    for (let i = 0; i < 5 && !ultimoBeat; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat.datos.ultimo) ultimoBeat = paso.beat;
    }
    expect(ultimoBeat).not.toBeNull();
    expect(actual.semanaGlobal).toBe(objetivo);
  });

  // Pedido explícito del brief: "una partida guardada a mitad del
  // campamento tiene que retomarse bien, con la cuenta regresiva correcta".
  // save.js serializa con JSON.stringify/parse sin tocar nada — este test
  // confirma que eso alcanza: la cola (con sus beats de campamento
  // pendientes), proximaPelea y semanaGlobal sobreviven intactos, y la
  // carrera puede seguir jugándose después de "recargar" como si nada.
  it('una partida guardada a mitad del campamento se retoma con la cuenta regresiva correcta', () => {
    const p = nuevaPartida(6);
    const firmada = firmarPelea(p, { oferta: ofertaDePrueba() });
    // Juega UN beat de campamento (deja el resto pendiente en la cola: "a
    // mitad de camino", no al principio ni al final).
    const paso = siguienteBeat(firmada);
    const aMitadDeCamino = paso.partida;
    expect(aMitadDeCamino.cola.length).toBeGreaterThan(0);

    const recuperada = JSON.parse(JSON.stringify(aMitadDeCamino));

    expect(recuperada.cola).toEqual(aMitadDeCamino.cola);
    expect(recuperada.proximaPelea).toEqual(aMitadDeCamino.proximaPelea);
    expect(recuperada.semanaGlobal).toBe(aMitadDeCamino.semanaGlobal);
    expect(semanasHastaPelea(recuperada)).toBe(semanasHastaPelea(aMitadDeCamino));

    // Y la carrera sigue jugándose con normalidad desde ahí: el próximo beat
    // es el que quedó pendiente en la cola, no algo roto ni un salto de bloque.
    const siguientePaso = siguienteBeat(recuperada);
    expect(siguientePaso.beat.tipo).toBe(aMitadDeCamino.cola[0].tipo);
  });
});

// Task v3 ("cartas nuevas con azar"): la usan las cartas de riesgo cuyo
// desenlace malo es "se te cae la pelea" (CARTAS_EVENTO/CARTAS_REDES, ver
// `caePelea` en events.js) — la consecuencia tiene que ser REAL, no solo un
// texto de sabor mientras la pelea sigue ocurriendo igual.
describe('cancelarProximaPelea', () => {
  function ofertaDePrueba() {
    return {
      id: 'of_1', rivalId: 'r1', rivalApodo: 'El Zurdo', esTitulo: false,
    };
  }

  it('sin ninguna oferta en danza, no hace nada', () => {
    const p = nuevaPartida(1);
    expect(p.ofertaPendiente).toBeNull();
    const cancelada = cancelarProximaPelea(p);
    expect(cancelada.ofertaPendiente).toBeNull();
    expect(cancelada.cola).toEqual(p.cola);
  });

  it('con una oferta pendiente en la cola, la saca y limpia ofertaPendiente', () => {
    const oferta = ofertaDePrueba();
    const p = {
      ...nuevaPartida(2),
      ofertaPendiente: { oferta },
      cola: [{ tipo: 'evento', datos: {} }, { tipo: 'oferta', datos: { oferta } }, { tipo: 'redes', datos: {} }],
    };
    const cancelada = cancelarProximaPelea(p);
    expect(cancelada.ofertaPendiente).toBeNull();
    expect(cancelada.cola.map((b) => b.tipo)).toEqual(['evento', 'redes']);
  });

  it('no muta la partida original', () => {
    const p = {
      ...nuevaPartida(3),
      ofertaPendiente: { oferta: ofertaDePrueba() },
      cola: [{ tipo: 'oferta', datos: { oferta: ofertaDePrueba() } }],
    };
    const antes = JSON.stringify(p);
    cancelarProximaPelea(p);
    expect(JSON.stringify(p)).toBe(antes);
  });
});

describe('el año del mundo sigue al calendario', () => {
  // Los bloques duran 1 a 1.3 años. Si el mundo acumulara años enteros por su
  // cuenta terminaría varios años atrás del calendario del tablero y de la
  // edad del jugador, y el tablero mostraría dos años distintos a la vez.
  it('coincide con fechaDe(semanaGlobal) bloque a bloque durante toda la carrera', () => {
    let actual = nuevaPartida(7);
    for (let i = 0; i < 20 && !actual.terminada; i += 1) {
      actual = avanzarBloque(actual);
      expect(actual.mundo.anio).toBe(fechaDe(actual.semanaGlobal, ANIO_INICIAL).anio);
    }
  });

  it('al final de una carrera completa el mundo avanzó tantos años como el jugador', () => {
    const inicial = nuevaPartida(8);
    const { partida } = jugarTodo(inicial);
    const aniosDelMundo = partida.mundo.anio - ANIO_INICIAL;
    const aniosDelJugador = partida.jugador.edad - inicial.jugador.edad;
    // Tolerancia de un año: el calendario redondea semanas a años enteros.
    expect(Math.abs(aniosDelMundo - aniosDelJugador)).toBeLessThanOrEqual(1);
  });
});

// ---- Declive por edad y castigo (v13) ----------------------------------
describe('el declive empieza a los 34 y el castigo lo adelanta', () => {
  function peleadorCon(historial) {
    const p = crearPeleador({
      nombre: 'Ortiz', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 50, esJugador: true,
    });
    return { ...p, historial, staff: [] };
  }

  it('sin castigo, el declive empieza a los 34', () => {
    expect(edadDeDeclive(peleadorCon([]))).toBe(34);
  });

  it('los nocauts sufridos lo adelantan', () => {
    const golpeado = peleadorCon(Array.from({ length: 6 }, () => ({ resultado: 'd', metodo: 'ko' })));
    expect(edadDeDeclive(golpeado)).toBeLessThan(34);
  });

  it('las derrotas por puntos NO lo adelantan: perder parejo no te envejece', () => {
    const porPuntos = peleadorCon(Array.from({ length: 6 }, () => ({ resultado: 'd', metodo: 'decision' })));
    expect(edadDeDeclive(porPuntos)).toBe(34);
  });

  it('las caidas sufridas tambien suman castigo, aunque hayas ganado', () => {
    const ganandoPeroCastigado = peleadorCon(
      Array.from({ length: 5 }, () => ({ resultado: 'v', metodo: 'decision', caidasSufridas: 2 })),
    );
    expect(edadDeDeclive(ganandoPeroCastigado)).toBeLessThan(34);
  });

  it('el castigo tiene un tope: nunca adelanta el declive mas alla de lo razonable', () => {
    const destruido = peleadorCon(Array.from({ length: 60 }, () => ({ resultado: 'd', metodo: 'ko', caidasSufridas: 3 })));
    expect(edadDeDeclive(destruido)).toBeGreaterThanOrEqual(29);
  });
});

// ---- Task 5.1: tres decisiones al año, ancladas al calendario -------------
describe('Task 5.1: tres decisiones al año, una cada cuatro meses', () => {
  // "Jugando bien" (acepta y firma toda oferta jugable): a diferencia de
  // jugarTodo, esto SÍ dispara campamentos (que avanzan semanaGlobal semana a
  // semana) — la prueba de fuego real de que un campamento en curso no corre
  // una decisión fuera de su mes (ver el comentario grande de ETAPAS,
  // career.js, sobre por qué la decisión se resuelve SIEMPRE antes que
  // cualquier beat de campamento del mismo bloque).
  function decisionesDeCarrera(semilla, limite = 500) {
    let actual = nuevaPartida(semilla);
    let guardia = 0;
    const porAnio = {};
    const meses = new Set();
    let total = 0;
    while (!actual.terminada && guardia < limite) {
      guardia += 1;
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      const beat = paso.beat;
      if (!beat) continue;
      if (beat.tipo === 'mejora' || beat.tipo === 'evento' || beat.tipo === 'redes') {
        const fecha = fechaDe(actual.semanaGlobal, ANIO_INICIAL);
        porAnio[fecha.anio] = (porAnio[fecha.anio] ?? 0) + 1;
        meses.add(fecha.mes);
        total += 1;
      } else if (beat.tipo === 'oferta') {
        actual = firmarPelea(actual, { oferta: beat.datos.oferta });
      } else if (beat.tipo === 'campCarta' || beat.tipo === 'campSparring') {
        const { oferta, ultimo } = beat.datos;
        if (ultimo) {
          const resultado = aplicarResultado(actual.jugador, {
            oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 }, semanaGlobal: actual.semanaGlobal,
          });
          actual = { ...actual, jugador: resultado.jugador };
        }
      }
    }
    return { porAnio, meses, total };
  }

  const semillas = [1, 2, 3, 4, 5];

  it('cada año trae exactamente tres decisiones', () => {
    semillas.forEach((semilla) => {
      const { porAnio } = decisionesDeCarrera(semilla);
      for (const n of Object.values(porAnio)) expect(n).toBe(3);
    });
  });

  it('una carrera completa trae exactamente 72 decisiones (24 años x 3)', () => {
    semillas.forEach((semilla) => {
      const { total } = decisionesDeCarrera(semilla);
      expect(total).toBe(72);
    });
  });

  it('las decisiones caen siempre en enero, mayo o septiembre — nunca en otro mes, ni siquiera con campamentos de por medio', () => {
    semillas.forEach((semilla) => {
      const { meses } = decisionesDeCarrera(semilla);
      expect([...meses].sort((a, b) => a - b)).toEqual([1, 5, 9]);
    });
  });
});

// ---- Task 5.3: la tarjeta previa a la pelea --------------------------------
// Bloque 6 ("resolver la pelea simulada en el mismo beat del anuncio", una de
// las palancas de menor daño que la propia spec sugiere si la partida se
// siente larga): la charla del entrenador (Task 5.3) empezó como su PROPIO
// beat, antes del resumen del lote — dos "Seguir" para contar lo mismo una
// vez ("contra quién fuiste") y la síntesis ("3-0, dos por nocaut"). Ahora
// viaja DENTRO del beat 'peleasResueltas', en `datos.charla`: un solo beat,
// la misma información. Este describe se reescribe sobre esa fusión.
describe('Task 5.3/Bloque 6: la charla del entrenador (fusionada en el resumen) vs. la oferta (importante)', () => {
  // Recorre varias carreras (jugarTodo: nunca acepta nada, así que el juego
  // no se detiene esperando una decisión de aceptar/rechazar) y clasifica
  // cada bloque de enero según qué beat de pelea trajo.
  function beatsDePeleaDeCarrera(semilla) {
    const { beats } = jugarTodo(nuevaPartida(semilla));
    return beats;
  }

  it('un año resuelto entero como trámite (sin destacado ni marquee) trae la charla dentro del resumen, nunca la oferta', () => {
    let vistoCharla = false;
    for (let semilla = 1; semilla <= 40; semilla += 1) {
      const beats = beatsDePeleaDeCarrera(semilla);
      beats.forEach((b) => {
        if (b.tipo === 'peleasResueltas' && b.datos.charla) {
          vistoCharla = true;
          expect(b.datos.charla.length).toBeGreaterThan(0);
          expect(b.datos.charla).not.toMatch(/\{rival\}/);
        }
      });
    }
    expect(vistoCharla).toBe(true);
  });

  it('una pelea importante siempre encola su propia oferta (aceptar/rechazar), nunca disfrazada de resumen de trámite', () => {
    // Bloque 6: un mismo bloque puede traer trámite (peleas de más allá del
    // primer cupo, ver armarLotePeleas) Y una oferta jugable a la vez (el
    // primer cupo del año, si califica) — en ese caso 'peleasResueltas'
    // SÍ puede aparecer antes de 'oferta' en la misma cola, y es correcto:
    // son dos peleas DISTINTAS del mismo año. Lo que nunca puede pasar es
    // que la oferta jugable en sí venga escondida dentro de un beat de
    // resumen — siempre es su propio beat 'oferta', con su propia oferta.
    let vistoOferta = false;
    for (let semilla = 1; semilla <= 40; semilla += 1) {
      const beats = beatsDePeleaDeCarrera(semilla);
      beats.forEach((b) => {
        if (b.tipo === 'oferta') {
          vistoOferta = true;
          expect(b.datos.oferta).toBeTruthy();
          expect(b.datos.charla).toBeUndefined();
        }
        if (b.tipo === 'peleasResueltas') {
          // El resumen de trámite nunca trae una oferta jugable adentro: eso
          // es exclusivo del beat 'oferta'.
          expect(b.datos.oferta).toBeUndefined();
        }
      });
    }
    expect(vistoOferta).toBe(true);
  });

  it('la charla tiene al menos 8 variantes de texto distintas, y aparecen de verdad en varias carreras', () => {
    const textos = new Set();
    for (let semilla = 1; semilla <= 200; semilla += 1) {
      const beats = beatsDePeleaDeCarrera(semilla);
      beats
        .filter((b) => b.tipo === 'peleasResueltas' && b.datos.charla)
        .forEach((b) => textos.add(b.datos.charla));
    }
    expect(textos.size).toBeGreaterThanOrEqual(8);
  });
});
