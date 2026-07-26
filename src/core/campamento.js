// Semanas de preparación antes de una pelea (Task v3, pedido textual: "al
// aceptar una pelea, va directo al combate, debería de haber unas semanas de
// preparación"). Este módulo decide CUÁNTO dura ese campamento (2 o 3 beats,
// nunca más: el juego se juega en una sentada) y arma esos beats — nunca los
// resuelve ni pinta nada, eso sigue siendo trabajo de career.js/main.js.
//
// Composición fija: un campamento SIEMPRE trae exactamente un beat de
// sparring (pedido textual: "nunca le apareció el minijuego de sparring" —
// acá deja de depender del azar) y el resto son cartas de campamento
// (src/content/cards-camp.js), que narran el trabajo específico para ESE
// rival y le pegan a atributos/forma/fatiga/moral: lo que hagas en el
// campamento tiene que importar para la pelea.

import { elegirPorRareza } from './cards.js';
import { crearSparring } from './sparring.js';
import { CARTAS_CAMPAMENTO } from '../content/cards-camp.js';

// Cuánto pesa, en semanas del calendario del tablero (calendario.js), cada
// beat de campamento. Con esto un campamento corto (2 beats) dura 6 semanas
// y uno largo (3 beats) dura 9: unas pocas semanas de verdad, no una
// pretemporada entera — coherente con "no más de 2-3 beats por campamento".
export const SEMANAS_POR_BEAT_CAMPAMENTO = 3;

// Chance de que el campamento sea largo (3 beats) en vez de corto (2). Baja a
// propósito: con ~14-15 peleas por carrera, un campamento promedio cercano a
// 3 beats no entra en el presupuesto de ritmo (30-60 beats/carrera — ver el
// informe de rebalance del plan). Una pelea de título o una defensa
// obligatoria (oferta.esTitulo) merece más ceremonia que una de relleno, así
// que su chance es mayor, pero sigue siendo la excepción, no la regla.
const PROB_LARGO = { esTitulo: 0.12, normal: 0.03 };

export function decidirLargoCampamento(rng, oferta) {
  const prob = oferta.esTitulo ? PROB_LARGO.esTitulo : PROB_LARGO.normal;
  return rng.chance(prob) ? 3 : 2;
}

function rellenar(texto, oferta) {
  return texto.replace(/\{rival\}/g, oferta.rivalApodo);
}

/** Elige una carta de campamento para esta etapa y ya la deja lista para mostrar (marcador {rival} relleno). */
export function elegirCartaCampamento(rng, { etapa, oferta }) {
  const elegibles = CARTAS_CAMPAMENTO.filter((c) => c.etapas.includes(etapa));
  const fuente = elegibles.length > 0 ? elegibles : CARTAS_CAMPAMENTO;
  const carta = elegirPorRareza(rng, fuente);
  return {
    ...carta,
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

/**
 * Arma los beats del campamento para la oferta ya firmada. No muta `jugador`
 * ni `oferta`; el estado del rng viaja en el propio `rng` (quien llama es
 * responsable de guardar `rng.estado()`, mismo contrato que el resto de
 * career.js).
 *
 * @returns {{ beats: Array<{tipo:'campCarta'|'campSparring', datos:object}>, semanaObjetivo: number }}
 */
export function armarBeatsCampamento(rng, {
  jugador, etapa, oferta, semanaInicial,
}) {
  const largo = decidirLargoCampamento(rng, oferta);
  const totalSemanas = largo * SEMANAS_POR_BEAT_CAMPAMENTO;
  const semanaObjetivo = semanaInicial + totalSemanas;
  const semanas = repartirSemanas(totalSemanas, largo);
  // El sparring va siempre en el medio: arranca con trabajo de gimnasio,
  // pasa por los rounds fuertes, y (si el campamento es largo) cierra con los
  // últimos ajustes antes de la pelea.
  const orden = largo === 2 ? ['carta', 'sparring'] : ['carta', 'sparring', 'carta'];

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
    return {
      tipo: 'campCarta',
      datos: {
        carta: elegirCartaCampamento(rng, { etapa, oferta }), oferta, semanas: semanas[i], ultimo,
      },
    };
  });

  return { beats, semanaObjetivo };
}
