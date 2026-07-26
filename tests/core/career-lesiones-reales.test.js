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
function jugarGanandoTodoConLesiones(partida, limite = 400) {
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
  return {
    partida: actual, defensas, ofertas, beats,
  };
}

// Sobre el jugador MÁS DÉBIL del proyecto (nuevaPartida: media=45 fija, sin
// origen/apodo optimizado — el peor caso, no el "jugando bien" de
// balance-sim), después de recortar PROB_BASE.pelea (0.18→0.10) y la
// duración/distribución de severidad de las lesiones (injuries.js):
// ofertas/carrera avg≈14.15 (era 13.62 antes del recorte, con 3 cinturones
// en 84.77% — ¡por debajo del piso!), ~5% de las carreras por debajo de 12
// ofertas, prácticamente cero por debajo del piso duro de 8 (ese piso duro
// nunca fue una garantía matemática de cero excepciones sobre miles de
// carreras: antes de esta corrección ni siquiera se medía a esta escala —
// solo sobre 10 semillas elegidas a mano), y 3 cinturones en ~86.4-86.7%. El
// gate en sí (puedePelear) no se tocó — nunca fue la palanca.
describe('ofertas de pelea con lesiones reales (Sistema 1: cualquier lesión bloquea)', () => {
  it('el promedio de ofertas por carrera se mantiene arriba de 12 incluso con lesiones reales aplicándose', () => {
    const total = 1500;
    let sumaOfertas = 0;
    let debajoDe12 = 0;
    let debajoDelPisoDuro = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { ofertas } = jugarGanandoTodoConLesiones(nuevaPartida(semilla));
      sumaOfertas += ofertas;
      if (ofertas < 12) debajoDe12 += 1;
      if (ofertas < 8) debajoDelPisoDuro += 1;
    }
    const promedio = sumaOfertas / total;
    expect(promedio).toBeGreaterThanOrEqual(12);
    // Margen amplio (medido: ~5%) para no ser flaky, pero sigue marcando
    // una regresión real si alguien alarga las lesiones o sube su
    // frecuencia sin volver a medir.
    expect(debajoDe12 / total).toBeLessThanOrEqual(0.12);
    // Se tolera una fracción mínima de mala suerte extrema, no un patrón
    // sistemático (ver el comentario grande de arriba).
    expect(debajoDelPisoDuro / total).toBeLessThanOrEqual(0.02);
  });

  it('sobre muchas semillas, los tres cinturones se mantienen por encima del 85% incluso con lesiones reales', () => {
    const total = 1500;
    let conLosTres = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { partida } = jugarGanandoTodoConLesiones(nuevaPartida(semilla));
      if (partida.jugador.titulos.length === CINTURONES.length) conLosTres += 1;
    }
    expect(conLosTres / total).toBeGreaterThanOrEqual(0.85);
  });
});
