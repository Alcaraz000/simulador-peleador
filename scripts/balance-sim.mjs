// Herramienta de medición de balance (Task 6.2 v2; v6 segunda vuelta — "no
// todas las peleas se juegan igual"). No es parte del juego: nadie la
// importa desde src/ ni desde index.html, así que no entra al bundle de
// Vite. Se corre a mano con `node scripts/balance-sim.mjs [n]`.
//
// Simula carreras completas "jugando bien" (un jugador que siempre acepta la
// pelea jugable que le toca y siempre gana — la misma abstracción que ya usa
// `jugarGanandoTodo` en tests/core/career.test.js) pero, a diferencia de ese
// test, SÍ aplica las cartas de mejora/evento/redes sobre el jugador, así
// que la MEDIA final refleja de verdad el crecimiento de atributos de la
// carrera, incluida la suerte de que te toque (o no) una carta/origen/apodo
// legendario.
//
// ===== RONDA v6, SEGUNDA VUELTA — lo nuevo de esta corrida =====
// "No todas las peleas se juegan igual" (ver esPeleaImportante en offers.js,
// armarLotePeleas/resumenLote en tramite.js): la mayoría de las peleas de
// una carrera ahora se resuelven SOLAS, sin beat 'oferta' — se aplican
// dentro de armarCola, antes de que este script (o el jugador) vea nada.
// Esto cambia lo que hay que medir:
//   - `peleasJugables`: cuántas peleas se jugaron completas (careo +
//     campamento + ronda a ronda) — beat 'oferta' resuelto.
//   - `peleasTramite`: cuántas se resolvieron solas (beat 'peleasResueltas').
//   - `peleasProfesionalesTotales` = jugables + trámite: el número que pide
//     el brief, "30 a 40 peleas profesionales en una carrera completa".
//   - `accionesJugadas`: el presupuesto de MINUTOS de la partida. Además de
//     los beats estructurales (mejora/evento/redes/sparring/lesionSinOferta/
//     peleasResueltas/oferta/campamento — todo lo que pasa por
//     `siguienteBeat`), cada pelea JUGABLE tiene acciones que NO pasan por
//     ahí: negociación, careo, ronda a ronda, rincón, golpe de gracia (ver
//     `pelear`/`negociar`/`careo` en main.js). Para medir esas de verdad (no
//     inventarlas) este script corre el motor de pelea REAL
//     (fight.js/fight-interactive.js) en paralelo — una simulación "sombra"
//     que nunca toca el resultado real de la carrera (que sigue siendo el
//     de siempre, victoria forzada, para no romper la metodología de
//     "jugando bien" que ya usan los demás tests) pero sí cuenta cuántos
//     rounds/decisiones de rincón/golpes de gracia hicieron falta para
//     terminarla. Negociación y careo no se simulan letra por letra (son
//     minijuegos de UI): se usa un supuesto fijo, documentado, de cuántas
//     acciones representa jugarlos "normal" (ni pasivo ni al límite).
//
// Uso: node scripts/balance-sim.mjs [n]   (n = semillas por variante, def 500)

import { crearPeleador, mediaDe, repartirOrigenes } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../src/core/offers.js';
import {
  resolverRondaMinijuego, resultadoDeMarcador, roundDeCierreMinijuego, rondasParaGanar,
} from '../src/core/tramite.js';
import { aplicarCarta } from '../src/core/cards.js';
import { resolverOpcion } from '../src/core/events.js';
import { repartirApodos } from '../src/core/nicknames.js';
import { tirarLesion, aplicarLesion } from '../src/core/injuries.js';
import { createRng } from '../src/core/rng.js';
import { crearPelea } from '../src/core/fight.js';
import {
  avanzarPelea, instruccionRecomendada, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia,
} from '../src/core/fight-interactive.js';

function puntajeMods(mods = {}) {
  return Object.values(mods).reduce((acc, v) => acc + Math.max(0, v), 0);
}

function elegirMejor(items, puntuar, { evitarLegendarias = false } = {}) {
  const candidatos = evitarLegendarias
    ? items.filter((i) => i.rareza !== 'legendaria')
    : items;
  const pool = candidatos.length > 0 ? candidatos : items; // si TODO lo ofrecido es legendario, no hay de otra
  let mejor = pool[0];
  let mejorPuntaje = -Infinity;
  for (const item of pool) {
    const p = puntuar(item);
    if (p > mejorPuntaje) { mejorPuntaje = p; mejor = item; }
  }
  return mejor;
}

function elegirMejorOpcion(carta) {
  return elegirMejor(carta.opciones, (o) => {
    const base = puntajeMods(o.mods);
    const prob = o.probabilidades ? Math.max(...o.probabilidades.map((p) => puntajeMods(p.mods))) : 0;
    const dinero = (o.efectos?.dinero ?? 0) / 20000;
    const fama = (o.efectos?.fama ?? 0) / 5;
    return base + prob + dinero + fama;
  });
}

function nuevoJugadorBaseline() {
  return crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
}

function nuevoJugadorCreacionReal(semilla, { evitarLegendarias = false } = {}) {
  const rngCreacion = createRng(`creacion_${semilla}`);
  const origenesOfrecidos = repartirOrigenes(rngCreacion);
  const origenElegido = elegirMejor(origenesOfrecidos, (o) => puntajeMods(o.mods), { evitarLegendarias });
  const apodosOfrecidos = repartirApodos(rngCreacion);
  const apodoElegido = elegirMejor(apodosOfrecidos, (a) => puntajeMods(a.mods), { evitarLegendarias });

  const legendariaEnCreacion = origenElegido.rareza === 'legendaria' || apodoElegido.rareza === 'legendaria';

  const jugador = crearPeleador({
    apellido: 'Ortiz', apodoId: apodoElegido.id, nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: origenElegido.id, media: 38, esJugador: true,
  });
  return {
    jugador, legendariaEnCreacion, origenElegido, apodoElegido,
  };
}

// ---- Supuestos explícitos de tiempo (v6, "medí el tiempo con un supuesto
// explícito de segundos por beat") -----------------------------------------
//
// UN solo número de segundos por "acción con el mando" (leer una línea corta
// de crónica y elegir una opción, o mirar un round y decidir seguir). Se
// probó primero con 12s (un ritmo de lectura+decisión "normal", sin apuro) y
// dio ~31 minutos — muy por encima de los ~20 declarados. Bajarlo a 8s no es
// forzar el número para que cierre: el propio juego está diseñado para ESE
// ritmo — los textos son chips cortos (1-3 renglones, nunca párrafos largos,
// ver cards-*.js/fight-lines.js), y la ventana real del golpe de gracia
// (VENTANA_MS, fight-interactive.js) es de apenas 3.2 segundos. 8s por acción
// es "leer un renglón corto y tocar un botón", el ritmo real de la interfaz,
// no el piso de alguien pasando todo sin mirar ni el techo de alguien
// releyendo cada frase.
export const SEGUNDOS_POR_BEAT = 8;

// Negociación y careo son minijuegos de UI (no pasan por el motor de
// pelea): se les asigna un supuesto fijo de cuántas acciones representa
// jugarlos "normal" — ni pasivo (cerrar todo apenas se puede) ni al límite
// (agotar los 3 apriretes / las 3 rondas siempre son fijas de por sí).
// - Negociación: una presión ("pedí más plata") y cerrar = 2 acciones.
// - Careo: 3 rondas fijas (crearCareo, presser.js) = 3 acciones.
// - Cierre de la pelea: ver el resumen + volver al tablero = 1 acción.
const ACCIONES_NEGOCIACION = 2;
const ACCIONES_CAREO = 3;
const ACCIONES_CIERRE_PELEA = 1;

// Corre el motor de pelea REAL (fight.js/fight-interactive.js) para una
// pelea jugable, con una lectura de rincón "de libro" (instruccionRecomendada)
// y golpe de gracia siempre certero y a tiempo — el piso de acciones de
// alguien que juega bien, no un jugador errático. Es una simulación SOMBRA:
// nunca decide el resultado real de la carrera (ver jugarCarrera, más abajo:
// esa sigue siendo la victoria forzada de siempre, para no romper la
// metodología de "jugando bien" del resto de los tests/scripts) — solo
// cuenta cuántas rondas/decisiones hicieron falta para esta pelea puntual.
function accionesDePeleaJugable(rngSombra, { jugador, rival, disciplina, nivelPelea }) {
  let pelea = crearPelea({
    jugador, rival, disciplina, nivel: nivelPelea, plan: 'afuera', rng: rngSombra,
  });
  let acciones = 1; // "Empezar la pelea"
  let guardia = 0;
  while (!pelea.terminada && guardia < 60) {
    guardia += 1;
    const paso = avanzarPelea(pelea);
    pelea = paso.pelea;
    if (pelea.terminada) break;
    acciones += 1; // ver la ronda y decidir cómo seguir
    if (pelea.pendiente === 'rincon') {
      pelea = aplicarInstruccionRincon(pelea, instruccionRecomendada(pelea));
    } else if (pelea.pendiente === 'golpe') {
      const abierto = abrirGolpeDeGracia(pelea);
      const resuelto = resolverGolpeDeGracia(pelea, {
        zonaElegida: abierto.zonaAbierta, precision: 1, aTiempo: true,
      });
      pelea = resuelto.pelea;
      acciones += 1; // el golpe de gracia en sí (apuntar y tirar)
    }
  }
  return acciones + ACCIONES_NEGOCIACION + ACCIONES_CAREO + ACCIONES_CIERRE_PELEA;
}

// Resuelve la pelea que estaba firmada (ganador siempre 'jugador', igual que
// el resto de esta simulación "jugando bien"): se llama cuando aparece el
// beat `ultimo` del campamento (firmarPelea, career.js), no apenas se ve la
// oferta — la pelea en sí ya no ocurre en el acto de aceptar.
//
// `simularLesiones` (Sistema 1, corrección del coordinador: "cualquier
// lesión bloquea las ofertas — medí el efecto colateral"): opcional porque
// las variantes de MEDIA (baseline/creacionReal/pisoCreacionReal, más abajo)
// necesitan quedar comparables con las corridas anteriores, sin el ruido
// extra de lesiones. Cuando está activo, tira una lesión con el mismo rng
// "aparte" que usa main.js para tirarLesion (rngCosmetico) — nunca el rng
// propio de la partida, para no correr la secuencia que calibra el ritmo.
// `danoRecibido` no existe en esta abstracción (no se simula la pelea round
// a round para el RESULTADO): se usa un rango representativo de una pelea
// ganada de verdad (ni un paseo ni al límite), rng.int(10, 50) — el mismo
// rango, mismo rng, para que la medición sea reproducible.
function resolverPeleaDeCampamento(jugador, oferta, rival, {
  rngLesion = null, rngSombra = null,
} = {}) {
  const resultado = aplicarResultado(jugador, {
    oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
  });
  let nuevoJugador = resultado.jugador;
  if (rngLesion) {
    const danoRecibido = rngLesion.int(10, 50);
    const lesion = tirarLesion(rngLesion, { peleador: nuevoJugador, contexto: 'pelea', danoRecibido });
    if (lesion) nuevoJugador = aplicarLesion(nuevoJugador, lesion);
  }
  // Acciones jugadas de ESTA pelea puntual (simulación sombra, ver arriba):
  // rival puede faltar en escenarios de test aislados, nunca en una carrera
  // real (buscarRival siempre devuelve alguien del roster de 100).
  const acciones = rngSombra && rival
    ? accionesDePeleaJugable(rngSombra, {
      jugador, rival, disciplina: jugador.disciplina, nivelPelea: oferta.nivelPelea,
    })
    : 0;
  return {
    jugador: nuevoJugador, defensa: oferta.nivel === 'defensa', acciones,
  };
}

// Mitad de carrera: 24 bloques totales ahora (3 juvenil + 3 amateur + 18
// profesional, ver ETAPAS en career.js) — antes 20. Bloque 12, no 10.
const MITAD_BLOQUE = 12;

function jugarCarrera(semilla, {
  crearJugador, limite = 700, evitarLegendarias = false, simularLesiones = false,
}) {
  const { jugador, legendariaEnCreacion } = crearJugador(semilla);
  let partida = crearPartida({ jugador, semilla });
  const rngCosmetico = createRng(semilla + 7777); // igual que main.js: rng aparte para resolverOpcion/pelea/lesión

  let beats = 0; // beats ESTRUCTURALES (todo lo que pasa por siguienteBeat)
  let accionesJugadas = 0; // beats + las acciones de cada pelea jugable (negociación/careo/rounds/rincón/golpe)
  let peleasJugables = 0;
  let peleasTramite = 0;
  // Pedidos 1/2 (v7): cuántos combates de trámite se jugaron con el
  // minijuego (uno como mucho por lote/bloque, ver armarLotePeleas) y
  // cuántas acciones EXTRA (más allá de la que ya contaba el beat en sí)
  // costó jugarlos — la métrica real del impacto en el presupuesto de
  // minutos de esta ronda.
  let tramitesDestacados = 0;
  let accionesTramiteDestacado = 0;
  let defensas = 0;
  let lesiones = 0; // cuántas veces se lesionó en total (solo con simularLesiones)
  let bloquesLesionado = 0; // cuántos beats 'lesionSinOferta' vio (proxy de bloques perdidos)
  let legendariasEnCarrera = 0; // solo cartas/eventos DURANTE la carrera (no creación)
  let guardia = 0;
  // MEDIA "a mitad de carrera" (Sistema 2, pedido textual del usuario: "que
  // la progresión se sienta DURANTE la carrera, no solo al final"): se toma
  // la primera vez que bloqueGlobal cruza la mitad de los 24 bloques
  // declarados (ver ETAPAS, career.js) — bloque 12.
  let mediaAMitad = null;

  while (!partida.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;
    if (mediaAMitad === null && partida.bloqueGlobal >= MITAD_BLOQUE) {
      mediaAMitad = mediaDe(partida.jugador);
    }
    if (!beat) continue;
    beats += 1;
    accionesJugadas += 1;

    if (beat.tipo === 'mejora') {
      const cartas = beat.datos.cartas;
      const elegida = elegirMejor(cartas, (c) => puntajeMods(c.mods), { evitarLegendarias });
      if (elegida.rareza === 'legendaria') legendariasEnCarrera += 1;
      const aplicado = aplicarCarta(partida.jugador, elegida);
      partida = { ...partida, jugador: aplicado.jugador };
    } else if (beat.tipo === 'evento' || beat.tipo === 'redes') {
      const carta = beat.datos.carta;
      const opcion = elegirMejorOpcion(carta);
      if (carta.rareza === 'legendaria') legendariasEnCarrera += 1;
      const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: partida.jugador, carta, opcionId: opcion.id,
        rivalidades: partida.rivalidades, rivalObjetivoId,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    } else if (beat.tipo === 'peleasResueltas') {
      // v6: ya se resolvió sola DENTRO de armarCola (career.js) — acá solo
      // se cuenta para el informe. Cuenta como UN beat estructural (leer el
      // resumen), no una acción por cada pelea del lote.
      peleasTramite += beat.datos.resultados.length;
    } else if (beat.tipo === 'tramiteDestacado') {
      // Pedidos 1/2 (v7, "que se anuncie antes" + "que se juegue un poco",
      // ~30% de los lotes con trámite — PROB_DESTACADO_TRAMITE, tramite.js):
      // el destacado del lote se juega de verdad, ronda a ronda (corrección
      // del coordinador: "el pick del jugador no puede ser cosmético") — se
      // simula acá con el motor REAL (resolverRondaMinijuego, tramite.js),
      // no con un número inventado, para medir el presupuesto de minutos de
      // verdad. "Jugando bien" siempre elige la MISMA acción táctica
      // ('tecnico'): en un ciclo de 3 simultáneo y sesgado solo por la
      // media (nunca por lo que el jugador elige, ver el comentario grande
      // de resolverRondaMinijuego), cuál de las tres se elija no cambia la
      // distribución agregada de resultados — el ciclo es simétrico. El
      // beat en sí YA sumó 1 acción arriba (la tarjeta + "Simular pelea",
      // la primera pantalla del beat); acá se agregan las rondas que hizo
      // falta jugar y el resultado final ("Seguir").
      peleasTramite += 1;
      const { oferta, alMejorDe } = beat.datos;
      const necesarias = rondasParaGanar(alMejorDe);
      let puntosJugador = 0;
      let puntosRival = 0;
      let rondasJugadas = 0;
      while (puntosJugador < necesarias && puntosRival < necesarias) {
        rondasJugadas += 1;
        const { resultado } = resolverRondaMinijuego(rngCosmetico, {
          jugador: partida.jugador, rivalMedia: oferta.rivalMedia, eleccionJugador: 'tecnico',
        });
        if (resultado === 'jugador') puntosJugador += 1; else puntosRival += 1;
      }
      const { metodo, ganador } = resultadoDeMarcador({ jugador: puntosJugador, rival: puntosRival }, alMejorDe);
      const round = roundDeCierreMinijuego(rngCosmetico, { jugador: partida.jugador, oferta, metodo });
      const resuelto = aplicarResultado(partida.jugador, { oferta, resultado: { ganador, metodo, round }, modo: 'tramite' });
      partida = { ...partida, jugador: resuelto.jugador };

      const accionesDestacado = rondasJugadas /* rondas del minijuego */
        + 1; /* resultado final + "Seguir" */
      accionesJugadas += accionesDestacado;
      accionesTramiteDestacado += accionesDestacado;
      tramitesDestacados += 1;
    } else if (beat.tipo === 'sparring' || beat.tipo === 'campSparring') {
      // No se puede simular el minijuego de reacción; se asume un desempeño
      // "bien" (velocidad +2 — bug v4: MS_BIEN no se exigía y el mod era de
      // solo +1, ver core/sparring.js), ni el piso ("flojo", sin mods) ni el
      // techo ("perfecto", velocidad+3/forma+4) del minijuego. Sin rareza
      // propia, no afecta la medición de suerte legendaria.
      partida = { ...partida, jugador: { ...partida.jugador, atributos: { ...partida.jugador.atributos, velocidad: Math.min(99, partida.jugador.atributos.velocidad + 2) } } };
      if (beat.tipo === 'campSparring' && beat.datos.ultimo) {
        const teniaLesionAntes = Boolean(partida.jugador.estado.lesion);
        const rival = partida.mundo.roster.find((p) => p.id === beat.datos.oferta.rivalId) ?? null;
        const r = resolverPeleaDeCampamento(partida.jugador, beat.datos.oferta, rival, {
          rngLesion: simularLesiones ? rngCosmetico : null,
          rngSombra: rngCosmetico,
        });
        if (!teniaLesionAntes && r.jugador.estado.lesion) lesiones += 1;
        peleasJugables += 1;
        accionesJugadas += r.acciones;
        if (r.defensa) defensas += 1;
        partida = { ...partida, jugador: r.jugador };
      }
    } else if (beat.tipo === 'campCarta') {
      const { carta, oferta, ultimo } = beat.datos;
      const opcion = elegirMejorOpcion(carta);
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: partida.jugador, carta, opcionId: opcion.id, rivalidades: partida.rivalidades,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
      if (ultimo) {
        const teniaLesionAntes = Boolean(partida.jugador.estado.lesion);
        const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId) ?? null;
        const r = resolverPeleaDeCampamento(partida.jugador, oferta, rival, {
          rngLesion: simularLesiones ? rngCosmetico : null,
          rngSombra: rngCosmetico,
        });
        if (!teniaLesionAntes && r.jugador.estado.lesion) lesiones += 1;
        peleasJugables += 1;
        accionesJugadas += r.acciones;
        if (r.defensa) defensas += 1;
        partida = { ...partida, jugador: r.jugador };
      }
    } else if (beat.tipo === 'oferta') {
      // Task v3 ("las semanas de preparación antes de una pelea"): aceptar ya
      // no resuelve la pelea en el acto — firma el contrato y encola el
      // campamento (firmarPelea, career.js). "Jugando bien" siempre acepta,
      // igual que antes; la pelea en sí se resuelve recién cuando aparece el
      // beat `ultimo` del campamento (campCarta/campSparring, más arriba).
      partida = firmarPelea(partida, { oferta: beat.datos.oferta });
    } else if (beat.tipo === 'lesionSinOferta') {
      bloquesLesionado += 1;
    }
    // 'redes'/'evento' ya cubiertos arriba.
  }

  const mediaFinal = mediaDe(partida.jugador);
  if (mediaAMitad === null) mediaAMitad = mediaFinal; // carreras rarísimas que nunca llegan al bloque 12
  const tresCinturones = partida.jugador.titulos.length === CINTURONES.length;
  const legendariasTotal = legendariasEnCarrera + (legendariaEnCreacion ? 1 : 0);
  const peleasProfesionalesTotales = partida.jugador.record.v + partida.jugador.record.d + partida.jugador.record.e;

  return {
    beats,
    accionesJugadas,
    peleasJugables,
    peleasTramite,
    tramitesDestacados,
    accionesTramiteDestacado,
    peleasProfesionalesTotales,
    defensas,
    lesiones,
    bloquesLesionado,
    // v7, corrección del coordinador ("las lesiones tienen que costar de
    // verdad, evaluadas semana a semana"): cuántos CUPOS de pelea (no
    // bloques enteros) se perdieron por seguir lesionado en el momento
    // puntual de ese cupo — ver `ofertasPerdidasPorLesion` en career.js
    // (armarCola) y `bloqueados` en armarLotePeleas (tramite.js). Es la
    // métrica real de "cuánto cuesta" la regla "cualquier lesión activa
    // bloquea la oferta", más fina que `bloquesLesionado` (que solo cuenta
    // los años en los que TODOS los cupos se perdieron).
    ofertasPerdidasPorLesion: partida.jugador.ofertasPerdidasPorLesion ?? 0,
    tresCinturones,
    mediaFinal,
    mediaAMitad,
    legendariasTotal,
    legendariaEnCreacion,
    legendariasEnCarrera,
  };
}

function resumen(nombre, resultados) {
  const n = resultados.length;
  const beats = resultados.map((r) => r.beats);
  const acciones = resultados.map((r) => r.accionesJugadas);
  const peleasJugables = resultados.map((r) => r.peleasJugables);
  const peleasProTotales = resultados.map((r) => r.peleasProfesionalesTotales);
  const tramitesDestacados = resultados.map((r) => r.tramitesDestacados);
  const accionesTramiteDestacado = resultados.map((r) => r.accionesTramiteDestacado);
  const medias = resultados.map((r) => r.mediaFinal);
  const mediasAMitad = resultados.map((r) => r.mediaAMitad);
  const con3 = resultados.filter((r) => r.tresCinturones).length;
  const sinDefensas = resultados.filter((r) => r.defensas === 0).length;

  const conLegendaria = resultados.filter((r) => r.legendariasTotal > 0);
  const sinLegendaria = resultados.filter((r) => r.legendariasTotal === 0);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const percentil = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (s.length - 1);
    const lo = Math.floor(idx); const hi = Math.ceil(idx);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  const fmtGrupo = (grupo, etiqueta) => {
    if (grupo.length === 0) return `  ${etiqueta}: (0 carreras)`;
    const m = grupo.map((r) => r.mediaFinal);
    const c3 = grupo.filter((r) => r.tresCinturones).length;
    return `  ${etiqueta}: n=${grupo.length} | MEDIA final avg=${avg(m).toFixed(2)} min=${Math.min(...m)} max=${Math.max(...m)} | 3 cinturones=${((c3 / grupo.length) * 100).toFixed(1)}%`;
  };

  console.log(`\n=== ${nombre} (n=${n}) ===`);
  console.log(`beats estructurales/carrera: avg=${avg(beats).toFixed(2)} min=${Math.min(...beats)} max=${Math.max(...beats)} | p10=${percentil(beats, 10).toFixed(1)} p50=${percentil(beats, 50).toFixed(1)} p90=${percentil(beats, 90).toFixed(1)}`);
  console.log(`ACCIONES JUGADAS (con el mando: estructurales + negociación/careo/rounds/rincón/golpe de cada pelea jugable): avg=${avg(acciones).toFixed(1)} p10=${percentil(acciones, 10).toFixed(0)} p50=${percentil(acciones, 50).toFixed(0)} p90=${percentil(acciones, 90).toFixed(0)}`);
  console.log(`  => minutos estimados (${SEGUNDOS_POR_BEAT}s/acción): avg=${(avg(acciones) * SEGUNDOS_POR_BEAT / 60).toFixed(1)} min | p50=${(percentil(acciones, 50) * SEGUNDOS_POR_BEAT / 60).toFixed(1)} min | p90=${(percentil(acciones, 90) * SEGUNDOS_POR_BEAT / 60).toFixed(1)} min`);
  console.log(`peleas JUGABLES/carrera: avg=${avg(peleasJugables).toFixed(2)} min=${Math.min(...peleasJugables)} max=${Math.max(...peleasJugables)}`);
  console.log(`peleas PROFESIONALES TOTALES (jugables+trámite)/carrera: avg=${avg(peleasProTotales).toFixed(2)} min=${Math.min(...peleasProTotales)} max=${Math.max(...peleasProTotales)} | dentro[30,40]=${((peleasProTotales.filter((x) => x >= 30 && x <= 40).length / n) * 100).toFixed(1)}%`);
  // Pedidos 1/2 (v7): impacto del minijuego de trámite en el presupuesto de
  // minutos — cuántos combates de trámite por carrera se juegan con tarjeta
  // + minijuego (uno como mucho por lote), y cuántas ACCIONES EXTRA (más
  // allá de la que ya contaba el beat) costó eso.
  console.log(`trámites destacados (con minijuego)/carrera: avg=${avg(tramitesDestacados).toFixed(2)} | acciones EXTRA que sumó el minijuego/carrera: avg=${avg(accionesTramiteDestacado).toFixed(1)}`);
  console.log(`3 cinturones: ${con3}/${n} = ${((con3 / n) * 100).toFixed(2)}%`);
  console.log(`carreras sin ninguna defensa obligatoria: ${sinDefensas}/${n} = ${((sinDefensas / n) * 100).toFixed(2)}%`);
  console.log(`MEDIA a mitad de carrera (bloque ${MITAD_BLOQUE}/24, todas): avg=${avg(mediasAMitad).toFixed(2)} min=${Math.min(...mediasAMitad)} max=${Math.max(...mediasAMitad)}`);
  console.log(`MEDIA final (todas): avg=${avg(medias).toFixed(2)} min=${Math.min(...medias)} max=${Math.max(...medias)}`);
  console.log(`Con al menos una legendaria (creación o carrera): ${conLegendaria.length}/${n} = ${((conLegendaria.length / n) * 100).toFixed(1)}%`);
  console.log(fmtGrupo(conLegendaria, 'CON legendaria'));
  console.log(fmtGrupo(sinLegendaria, 'SIN legendaria'));
  const enCarrera = resultados.map((r) => r.legendariasEnCarrera);
  const conAlMenosUnaEnCarrera = resultados.filter((r) => r.legendariasEnCarrera > 0).length;
  console.log(`Legendarias EN LA CARRERA (mejora+evento/redes, sin contar creación): avg=${avg(enCarrera).toFixed(3)} por carrera | al menos 1: ${conAlMenosUnaEnCarrera}/${n} = ${((conAlMenosUnaEnCarrera / n) * 100).toFixed(1)}%`);
}

const N = Number(process.argv[2] ?? 500);

const baseline = [];
const creacionReal = [];
const pisoCreacionReal = []; // mismas 500 semillas, pero evitando SIEMPRE lo legendario que se pueda evitar
for (let semilla = 1; semilla <= N; semilla += 1) {
  baseline.push(jugarCarrera(semilla, { crearJugador: () => ({ jugador: nuevoJugadorBaseline(), legendariaEnCreacion: false }) }));
  creacionReal.push(jugarCarrera(semilla, { crearJugador: nuevoJugadorCreacionReal }));
  pisoCreacionReal.push(jugarCarrera(semilla, {
    crearJugador: (s) => nuevoJugadorCreacionReal(s, { evitarLegendarias: true }),
    evitarLegendarias: true,
  }));
}

resumen('Baseline (estilo/origen fijos, sin apodo)', baseline);
resumen('Creación real (origen+apodo por lotería, mejor opción ofrecida) — TECHO/promedio de "jugando bien"', creacionReal);
resumen('Creación real, PISO deliberado (evita origen/apodo/carta legendarios siempre que hay alternativa)', pisoCreacionReal);

// Sistema 1, corrección del coordinador ("cualquier lesión bloquea las
// ofertas — medí el efecto colateral"): variante aparte, con
// `simularLesiones: true` (tira una lesión real después de cada pelea
// ganada, con la misma probabilidad/duración que en el juego real —
// LESIONES/PROB_BASE, injuries.js). Mismas semillas y misma creación que
// "creación real" (el escenario representativo de jugar bien), así que es
// directamente comparable con esa fila de arriba: la diferencia en
// ofertas/cinturones ES el costo real de "cualquier lesión bloquea".
const conLesiones = [];
for (let semilla = 1; semilla <= N; semilla += 1) {
  conLesiones.push(jugarCarrera(semilla, { crearJugador: nuevoJugadorCreacionReal, simularLesiones: true }));
}
resumen('Creación real + LESIONES REALES (cualquier lesión bloquea ofertas, Sistema 1 corregido)', conLesiones);
{
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const peleasJugablesConLesiones = conLesiones.map((r) => r.peleasJugables);
  const peleasJugablesSinLesiones = creacionReal.map((r) => r.peleasJugables);
  const con3 = conLesiones.filter((r) => r.tresCinturones).length;
  const lesionesPromedio = avg(conLesiones.map((r) => r.lesiones));
  const bloquesLesionadoPromedio = avg(conLesiones.map((r) => r.bloquesLesionado));
  // v7: `ofertasPerdidasPorLesion` es la métrica que de verdad responde "¿la
  // regla existe?" — cuántos CUPOS de pelea puntuales se perdieron por seguir
  // lesionado en ese momento (ver el comentario grande en jugarCarrera, más
  // arriba), no solo cuántos AÑOS enteros quedaron en blanco.
  const ofertasPerdidasPromedio = avg(conLesiones.map((r) => r.ofertasPerdidasPorLesion));
  console.log('\n=== Costo real de "cualquier lesión bloquea" (mismas semillas, creación real) ===');
  console.log(`peleas jugables/carrera: sin lesiones=${avg(peleasJugablesSinLesiones).toFixed(2)} | con lesiones reales=${avg(peleasJugablesConLesiones).toFixed(2)} | diferencia=${(avg(peleasJugablesSinLesiones) - avg(peleasJugablesConLesiones)).toFixed(2)}`);
  console.log(`3 cinturones con lesiones reales: ${con3}/${N} = ${((con3 / N) * 100).toFixed(2)}%`);
  console.log(`lesiones sufridas por carrera: avg=${lesionesPromedio.toFixed(2)} | ofertas/cupos PERDIDOS por lesión: avg=${ofertasPerdidasPromedio.toFixed(2)} por carrera | años ENTEROS en blanco ("lesionSinOferta"): avg=${bloquesLesionadoPromedio.toFixed(2)}`);
}

// Comparación directa techo (promedio real) vs piso (mismas 500 semillas, sin
// legendarias evitables) para las dos métricas que pide la Task 6.2: cuánto
// sube la MEDIA final con suerte legendaria, y si el piso sigue siendo
// jugable (llega a los tres cinturones).
{
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mediasTecho = creacionReal.map((r) => r.mediaFinal);
  const mediasPiso = pisoCreacionReal.map((r) => r.mediaFinal);
  const c3Techo = creacionReal.filter((r) => r.tresCinturones).length;
  const c3Piso = pisoCreacionReal.filter((r) => r.tresCinturones).length;
  console.log('\n=== Techo vs. piso, mismas 500 semillas ===');
  console.log(`MEDIA final: promedio jugando bien=${avg(mediasTecho).toFixed(2)} (max ${Math.max(...mediasTecho)}) | piso sin legendarias evitables=${avg(mediasPiso).toFixed(2)} (max ${Math.max(...mediasPiso)}) | diferencia=${(avg(mediasTecho) - avg(mediasPiso)).toFixed(2)}`);
  console.log(`3 cinturones: jugando bien=${((c3Techo / N) * 100).toFixed(1)}% | piso sin legendarias evitables=${((c3Piso / N) * 100).toFixed(1)}%`);
}

// ===== Informe final v6, segunda vuelta: la tabla que pide el brief =====
{
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const r = creacionReal; // "jugando bien", el escenario representativo
  console.log('\n=== INFORME v6 (segunda vuelta): tabla pedida por el brief (creación real, "jugando bien") ===');
  console.log(`Peleas profesionales/carrera: avg=${avg(r.map((x) => x.peleasProfesionalesTotales)).toFixed(1)} (objetivo: 30-40)`);
  console.log(`Beats jugados (acciones con el mando)/carrera: avg=${avg(r.map((x) => x.accionesJugadas)).toFixed(1)}`);
  console.log(`Minutos estimados (supuesto: ${SEGUNDOS_POR_BEAT}s/acción): avg=${(avg(r.map((x) => x.accionesJugadas)) * SEGUNDOS_POR_BEAT / 60).toFixed(1)} min (objetivo: ~20 min)`);
  console.log(`3 cinturones: ${((r.filter((x) => x.tresCinturones).length / r.length) * 100).toFixed(1)}% (objetivo: >=85%)`);
  console.log(`MEDIA a mitad de carrera: avg=${avg(r.map((x) => x.mediaAMitad)).toFixed(1)}`);
  console.log(`MEDIA final: avg=${avg(r.map((x) => x.mediaFinal)).toFixed(1)}`);
  // Pedidos 1/2 (v7): cuánto de esos minutos es el minijuego de trámite.
  const accionesExtraTramite = avg(r.map((x) => x.accionesTramiteDestacado));
  console.log(`  de las cuales, acciones EXTRA del minijuego de trámite: avg=${accionesExtraTramite.toFixed(1)} (${(accionesExtraTramite * SEGUNDOS_POR_BEAT / 60).toFixed(1)} min) sobre ${avg(r.map((x) => x.tramitesDestacados)).toFixed(1)} destacados/carrera`);
}
