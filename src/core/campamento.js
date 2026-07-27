// Semanas de preparación antes de una pelea (Task v3, pedido textual: "al
// aceptar una pelea, va directo al combate, debería de haber unas semanas de
// preparación"). Este módulo decide CUÁNTO dura ese campamento y arma esos
// beats — nunca los resuelve ni pinta nada, eso sigue siendo trabajo de
// career.js/main.js.
//
// Pedido 3 (v6, "hay muy poco margen entre una pelea y otra... debe darte
// varios turnos de preparación"): antes eran 2-3 beats (mayormente 2). Ahora
// son 3-4 para una pelea común y 4-5 para una de título/defensa — "varios"
// de verdad, no "dos o tres". Esto suma beats/carrera de forma estructural
// (ver el objetivo declarado en career.js, arriba de ETAPAS, actualizado con
// el rango medido después de este cambio).
//
// Composición fija: un campamento SIEMPRE trae exactamente un beat de
// sparring (pedido textual: "nunca le apareció el minijuego de sparring" —
// acá deja de depender del azar) y el resto son cartas de campamento
// (src/content/cards-camp.js), que narran el trabajo específico para ESE
// rival y le pegan a atributos/forma/fatiga/moral: lo que hagas en el
// campamento tiene que importar para la pelea.

import {
  elegirPorRareza, conSalvaguardaDeCondiciones, excluirRecientes, recordarCarta,
} from './cards.js';
import { crearSparring } from './sparring.js';
import { CARTAS_CAMPAMENTO } from '../content/cards-camp.js';

// Cuánto pesa, en semanas del calendario del tablero (calendario.js), cada
// beat de campamento. Con esto un campamento común (3-4 beats) dura 9-12
// semanas y uno de título (4-5 beats) dura 12-15: dos a cuatro meses de
// preparación real, sensiblemente más "aire" que las 6-9 semanas de antes,
// pero lejos de una pretemporada entera.
export const SEMANAS_POR_BEAT_CAMPAMENTO = 3;

// Cuántos beats trae el campamento COMO PISO (antes de la chance de
// extenderse un beat más, ver PROB_LARGO): 3 para una pelea común, 4 para
// una de título/defensa — la ceremonia de una pelea grande empieza un
// escalón más arriba.
const BASE_LARGO = { esTitulo: 4, normal: 3 };

// Chance de que el campamento sea el piso + 1 beat en vez de quedarse en el
// piso. Al igual que antes, una pelea de título o una defensa obligatoria
// merece más ceremonia que una de relleno, así que su chance es mayor.
const PROB_LARGO = { esTitulo: 0.3, normal: 0.15 };

export function decidirLargoCampamento(rng, oferta) {
  const base = oferta.esTitulo ? BASE_LARGO.esTitulo : BASE_LARGO.normal;
  const prob = oferta.esTitulo ? PROB_LARGO.esTitulo : PROB_LARGO.normal;
  return rng.chance(prob) ? base + 1 : base;
}

function rellenar(texto, oferta) {
  // {rival} se usa siempre SOLO (nunca junto al nombre): con el roster de
  // 100 (Pedido 1) la mayoría de los rivales de relleno no tienen apodo, así
  // que cae al nombre en vez de mostrar "null" en las cartas de campamento.
  return texto.replace(/\{rival\}/g, oferta.rivalApodo ?? oferta.rivalNombre);
}

/**
 * Elige una carta de campamento para esta etapa y ya la deja lista para
 * mostrar (marcador {rival} relleno). `jugador` es opcional (Sistema 3,
 * cards.js): si no se pasa, `cumpleCondiciones` no filtra nada — así los
 * callers/tests que todavía no lo pasan siguen funcionando tal cual.
 *
 * `recientes` (Bug v7, "El video antes de dormir se repite todo el tiempo" —
 * causa real: CARTAS_CAMPAMENTO tiene 17 cartas elegibles, pero
 * `elegirPorRareza` no tenía memoria de qué acababa de salir, así que nada
 * evitaba que la MISMA carta volviera enseguida): últimos ids de ESTE pool ya
 * mostrados, se excluyen del sorteo (ver excluirRecientes, cards.js) sin
 * vaciarlo nunca. Opcional (default `[]`) para no romper callers/tests viejos.
 */
export function elegirCartaCampamento(rng, {
  etapa, oferta, jugador = null, recientes = [],
}) {
  const elegibles = CARTAS_CAMPAMENTO.filter((c) => c.etapas.includes(etapa));
  const base = elegibles.length > 0 ? elegibles : CARTAS_CAMPAMENTO;
  const conCondiciones = conSalvaguardaDeCondiciones(base, jugador);
  const fuente = excluirRecientes(conCondiciones, recientes);
  const carta = elegirPorRareza(rng, fuente);
  return {
    ...carta,
    // Bug encontrado por la barrida de la UI real (tests/ui/barrida-
    // jugador.test.js) al correr con semillas nuevas (el minijuego de
    // trámite, Pedido 2 v7, corre la secuencia de rng de toda la carrera):
    // "Estudiar a {rival}" (cards-camp.js) quedaba con el marcador crudo en
    // pantalla — `titulo` nunca pasaba por `rellenar`, solo `texto` y las
    // `opciones`. El comentario de la función ya prometía "{rival} relleno"
    // sin ninguna excepción; ahora lo cumple de verdad.
    titulo: rellenar(carta.titulo, oferta),
    texto: rellenar(carta.texto, oferta),
    opciones: carta.opciones.map((o) => ({ ...o, texto: rellenar(o.texto, oferta) })),
  };
}

// Reparte `total` semanas entre `partes` beats en enteros que suman
// exactamente `total` (el resto de la división se lo lleva el último beat),
// así `semanaGlobal` llega a `semanaObjetivo` justo cuando termina el
// campamento, ni una semana antes ni después.
function repartirSemanas(total, partes) {
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  return Array.from({ length: partes }, (_, i) => (i === partes - 1 ? base + resto : base));
}

// El sparring va siempre cerca del medio del campamento (arranca con trabajo
// de gimnasio, pasa por los rounds fuertes, y — si el campamento es largo —
// cierra con los últimos ajustes antes de la pelea), sea cual sea `largo`
// (antes solo soportaba 2 o 3; Pedido 3 lo estira a 3-5).
function ordenDe(largo) {
  const medio = Math.floor(largo / 2);
  return Array.from({ length: largo }, (_, i) => (i === medio ? 'sparring' : 'carta'));
}

/**
 * Arma los beats del campamento para la oferta ya firmada. No muta `jugador`
 * ni `oferta`; el estado del rng viaja en el propio `rng` (quien llama es
 * responsable de guardar `rng.estado()`, mismo contrato que el resto de
 * career.js).
 *
 * `recientes` (Bug v7, memoria corta de cartas de campamento, ver
 * elegirCartaCampamento arriba): entra con lo que ya se vio en campamentos
 * ANTERIORES (career.js la guarda en `partida.memoriaCartas.campamento`) y
 * sale actualizada con lo que se mostró EN ESTE, encadenada beat a beat —
 * así dos cartas del MISMO campamento tampoco pueden repetirse entre sí, no
 * solo entre campamentos distintos.
 *
 * @returns {{ beats: Array<{tipo:'campCarta'|'campSparring', datos:object}>, semanaObjetivo: number, recientes: string[] }}
 */
export function armarBeatsCampamento(rng, {
  jugador, etapa, oferta, semanaInicial, recientes = [],
}) {
  const largo = decidirLargoCampamento(rng, oferta);
  const totalSemanas = largo * SEMANAS_POR_BEAT_CAMPAMENTO;
  const semanaObjetivo = semanaInicial + totalSemanas;
  const semanas = repartirSemanas(totalSemanas, largo);
  const orden = ordenDe(largo);

  let memoria = recientes;
  const beats = orden.map((clase, i) => {
    const ultimo = i === orden.length - 1;
    if (clase === 'sparring') {
      return {
        tipo: 'campSparring',
        datos: {
          sparring: crearSparring(rng, { jugador }), oferta, semanas: semanas[i], ultimo,
        },
      };
    }
    const carta = elegirCartaCampamento(rng, {
      etapa, oferta, jugador, recientes: memoria,
    });
    memoria = recordarCarta(memoria, carta.id);
    return {
      tipo: 'campCarta',
      datos: {
        carta, oferta, semanas: semanas[i], ultimo,
      },
    };
  });

  return { beats, semanaObjetivo, recientes: memoria };
}
