// Sistema 1, corrección del coordinador ("cualquier lesión bloquea las
// ofertas — medí el efecto colateral, y si las ofertas caen por debajo de
// 12 o los tres cinturones bajan del 85%, la palanca correcta es que las
// lesiones duren menos o sean menos frecuentes, nunca aflojar el gate").
//
// Archivo aparte de career.test.js (no un describe más ahí adentro): correr
// simulaciones de miles de carreras completas sumadas a las que YA corre
// career.test.js ("ritmo de la carrera", "progresión de cinturones", cada
// una con 3000 semillas) hacía crecer el heap del mismo worker hasta
// quedarse sin memoria (`JavaScript heap out of memory`, medido en esta
// misma corrección). Vitest aísla la memoria POR ARCHIVO, no por test
// dentro de un mismo archivo — separarlos en su propio archivo alcanzó para
// que cada worker libere la memoria entre uno y otro. El tamaño de muestra
// (1500, no 3000) es la otra mitad de esa misma solución: con el margen real
// medido más abajo (~86.4-86.7%, estable entre ventanas de 1000-1500
// semillas separadas — no apenas por encima del piso), 1500 alcanza para no
// ser flaky sin duplicar el costo de memoria/tiempo de sobra.
import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  crearPartida, siguienteBeat, firmarPelea,
} from '../../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../../src/core/offers.js';
import { createRng } from '../../src/core/rng.js';
import { tirarLesion, aplicarLesion } from '../../src/core/injuries.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

// Igual que jugarGanandoTodo (career.test.js), pero además tira lesiones DE
// VERDAD después de cada pelea ganada (mismo criterio que cerrarPelea en
// main.js: rng aparte, nunca el de la partida — ver injuries.js). Ni
// jugarGanandoTodo ni jugarTodo (career.test.js) aplican lesiones nunca, así
// que los tests de "ofertas de pelea por carrera"/"progresión de
// cinturones" ahí no podían detectar el costo real de ampliar puedePelear()
// a cualquier severidad. Este helper sí lo mide.
function jugarGanandoTodoConLesiones(partida, limite = 500) {
  let actual = partida;
  const rngLesion = createRng(`${partida.semilla}_lesiones`);
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

    if (paso.beat.tipo === 'oferta') {
      const { oferta } = paso.beat.datos;
      actual = firmarPelea(actual, { oferta });
    } else if (paso.beat.tipo === 'campCarta' || paso.beat.tipo === 'campSparring') {
      const { oferta, ultimo } = paso.beat.datos;
      if (ultimo) {
        ofertas += 1;
        if (oferta.nivel === 'defensa') defensas += 1;
        const resultado = aplicarResultado(actual.jugador, {
          oferta,
          resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
        });
        let jugador = resultado.jugador;
        // danoRecibido representativo de una pelea ganada de verdad (ni un
        // paseo ni al límite) — mismo rango que balance-sim.mjs.
        const danoRecibido = rngLesion.int(10, 50);
        const lesion = tirarLesion(rngLesion, { peleador: jugador, contexto: 'pelea', danoRecibido });
        if (lesion) jugador = aplicarLesion(jugador, lesion);
        actual = { ...actual, jugador };
      }
    }
  }
  // v6, segunda vuelta ("no todas las peleas se juegan igual"): `ofertas`
  // ahora cuenta SOLO las peleas JUGABLES (esta lesión solo puede aplicarse
  // después de una — las de trámite se resuelven solas dentro de armarCola,
  // sin pasar por acá). `peleasTotales` (jugador.record) es el número que
  // de verdad mide "cuántas peleas profesionales tuvo esta carrera" —
  // jugables + trámite.
  const peleasTotales = actual.jugador.record.v + actual.jugador.record.d + actual.jugador.record.e;
  return {
    partida: actual, defensas, ofertas, beats, peleasTotales,
  };
}

// ===== RONDA v6, SEGUNDA VUELTA ("no todas las peleas se juegan igual") =====
// Con las peleas de trámite resolviéndose solas (esPeleaImportante,
// offers.js; armarLotePeleas, tramite.js), "ofertas" (peleas JUGABLES) dejó
// de ser el número que mide "cuánto pelea esta carrera" — la mayoría de las
// peleas de una carrera son trámite, y una lesión real solo puede aplicarse
// DESPUÉS de una jugable (esta suite nunca simuló lesiones sobre peleas de
// trámite — quedan fuera de esta medición a propósito, mismo criterio que
// balance-sim.mjs: son resultados calculados, no una pelea de verdad donde
// el jugador puede llevarse un golpe). El eje que de verdad importa acá
// (medido sobre el jugador MÁS DÉBIL del proyecto — nuevaPartida: media=45
// fija, sin origen/apodo optimizado — el peor caso, no el "jugando bien" de
// balance-sim) es que las lesiones reales NO le pegan al objetivo central de
// esta ronda: 30-40 peleas profesionales totales y ≥85% de tres cinturones.
//
// v13 (Task 5.1/5.2, "el ritmo"): el bloque pasó de año a cuatrimestre y las
// peleas por año pasan a depender del MOMENTO de la carrera (no de una banda
// continua por edad) — ver el comentario grande de career.test.js
// ("ritmo de la carrera") para el porqué del número más bajo que antes.
// Recalculado sobre 1500/2500 semillas respectivamente:
//   peleas PROFESIONALES TOTALES/carrera (con lesiones reales): avg≈27.8 —
//     apenas por debajo del ~28.5 sin lesiones (career.test.js), el mismo
//     costo chico de siempre.
//   3 cinturones con lesiones reales: sigue por encima del 85% (no
//     re-medido en esta ronda — Bloque 6 calibra el eje de cinturones).
describe('ofertas de pelea con lesiones reales (Sistema 1: cualquier lesión bloquea)', () => {
  it('las peleas profesionales totales (jugables + trámite) se mantienen dentro de lo esperado incluso con lesiones reales aplicándose', () => {
    const total = 1500;
    let sumaTotales = 0;
    let debajoDe20 = 0;
    let debajoDelPisoDuro = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { peleasTotales } = jugarGanandoTodoConLesiones(nuevaPartida(semilla));
      sumaTotales += peleasTotales;
      if (peleasTotales < 20) debajoDe20 += 1;
      if (peleasTotales < 15) debajoDelPisoDuro += 1;
    }
    const promedio = sumaTotales / total;
    // Margen amplio sobre el ~27.8 medido (v13), para no ser flaky pero
    // seguir marcando una regresión real si las lesiones se vuelven más
    // largas o frecuentes sin volver a medir.
    expect(promedio).toBeGreaterThanOrEqual(22);
    expect(promedio).toBeLessThanOrEqual(34);
    // "Debajo de 20" no debería pasar casi nunca — margen generoso para no
    // ser flaky.
    expect(debajoDe20 / total).toBeLessThanOrEqual(0.1);
    // Piso duro real: ninguna carrera, ni con lesiones, debería quedar tan
    // corta como para no llegar ni a 15 peleas profesionales.
    expect(debajoDelPisoDuro / total).toBeLessThanOrEqual(0.02);
  });

  // n=2500 (no 1500 como el test de arriba): Cambio 1 (cards.js, "el tope de
  // mejoras es 3, duro") cambió cuántas tiradas de rng consume cada reparto
  // de mejoras, así que corrió la secuencia entera para estas mismas
  // semillas. Con el rediseño de ritmo v6 (segunda vuelta: "no todas las
  // peleas se juegan igual" + `permiteMarqueeEsteAnio`) y el gate de lesión
  // por cupo de v7 (ver el comentario grande al principio del archivo), la
  // tasa real con lesiones reales sobre 2500 semillas es ~99.1% — muy por
  // encima del piso de 0.85, con margen amplio de sobra pese a que ahora las
  // lesiones sí le cuestan ofertas de verdad. n=2500 se mantiene sin
  // acercarse al costo de memoria que esta suite separó a propósito.
  it('sobre muchas semillas, los tres cinturones se mantienen por encima del 85% incluso con lesiones reales', () => {
    const total = 2500;
    let conLosTres = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { partida } = jugarGanandoTodoConLesiones(nuevaPartida(semilla));
      if (partida.jugador.titulos.length === CINTURONES.length) conLosTres += 1;
    }
    expect(conLosTres / total).toBeGreaterThanOrEqual(0.85);
  });
});
