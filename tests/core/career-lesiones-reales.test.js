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
// v7, corrección del coordinador ("las lesiones tienen que costar de
// verdad, evaluadas semana a semana, no una vez por bloque" — ver el
// comentario grande de LESIONES en injuries.js y de armarLotePeleas en
// tramite.js): estos números están RECALCULADOS después de ese arreglo — los
// de la ronda anterior (con el gate revisado una sola vez por bloque, así
// que cualquier lesión de 52 semanas o menos curaba gratis) ya no describen
// el sistema actual. Medido sobre 1500/2500 semillas respectivamente:
//   peleas JUGABLES/carrera: avg≈6.07 | min=3 max=12 (el mismo tipo de
//     número que career.test.js sin lesiones — la diferencia sigue siendo
//     chica: la mayoría de los cupos de pelea ya eran trámite antes de que
//     hubiera lesión posible).
//   peleas PROFESIONALES TOTALES/carrera: avg≈33.9 | min=28 max=42 — nunca
//     por debajo de 25 en 1500 semillas (piso duro).
//   ofertas/cupos PERDIDOS por lesión (la métrica que de verdad dice si la
//     regla pesa): avg≈0.64 por carrera, con el 44.2% de las carreras
//     perdiendo al menos una — ya no es cero (antes del arreglo del
//     coordinador, con el gate por bloque, esta métrica ni siquiera existía
//     como tal: el equivalente más cercano, "años enteros en blanco", medía
//     ~0.03-0.12 sobre "creación real", prácticamente cosmético).
//   3 cinturones con lesiones reales: 99.1% sobre 2500 semillas — el piso de
//     0.85 sigue con margen amplio pese al costo real.
describe('ofertas de pelea con lesiones reales (Sistema 1: cualquier lesión bloquea)', () => {
  it('las peleas profesionales totales (jugables + trámite) se mantienen dentro de lo esperado incluso con lesiones reales aplicándose', () => {
    const total = 1500;
    let sumaTotales = 0;
    let debajoDe25 = 0;
    let debajoDelPisoDuro = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { peleasTotales } = jugarGanandoTodoConLesiones(nuevaPartida(semilla));
      sumaTotales += peleasTotales;
      if (peleasTotales < 25) debajoDe25 += 1;
      if (peleasTotales < 20) debajoDelPisoDuro += 1;
    }
    const promedio = sumaTotales / total;
    // Margen amplio sobre el ~33.9 medido (v7, gate de lesión por cupo), para
    // no ser flaky pero seguir marcando una regresión real si las lesiones
    // se vuelven más largas o frecuentes sin volver a medir.
    expect(promedio).toBeGreaterThanOrEqual(28);
    expect(promedio).toBeLessThanOrEqual(40);
    // "Debajo de 25" no debería pasar casi nunca (medido: 0% sobre 1500
    // semillas) — margen generoso para no ser flaky.
    expect(debajoDe25 / total).toBeLessThanOrEqual(0.1);
    // Piso duro real: ninguna carrera, ni con lesiones, debería quedar tan
    // corta como para no llegar ni a 20 peleas profesionales.
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
