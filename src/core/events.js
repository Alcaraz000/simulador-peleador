import {
  aplicarCarta, resolverProbabilidad, formatearMods, elegirPorRareza, conSalvaguardaDeCondiciones,
  excluirRecientes,
} from './cards.js';
import { subirHeat } from './rivalry.js';
import { clamp } from './stats.js';
import { CARTAS_EVENTO } from '../content/cards-events.js';
import { CARTAS_REDES } from '../content/cards-social.js';

// `recientes` (Bug v7, "una carta no puede repetirse tan seguido"): las
// últimas cartas de ESTE pool que ya se mostraron (ver excluirRecientes,
// cards.js) — career.js las lleva y las actualiza en `partida.memoriaCartas`.
// Opcional (default `[]`) para no romper callers/tests que todavía no las
// pasan: sin memoria, el comportamiento es el de siempre.
export function elegirEvento(rng, { jugador, etapa, categoria = null, recientes = [] }) {
  const elegibles = CARTAS_EVENTO.filter(
    (c) => c.etapas.includes(etapa) && (categoria === null || c.categoria === categoria),
  );
  const base = elegibles.length > 0 ? elegibles : CARTAS_EVENTO;
  // Sistema 3 (cards.js, "las tarjetas deben depender de la situación"): la
  // salvaguarda ya se ocupa de que esto nunca deje `base` en cero.
  const conCondiciones = conSalvaguardaDeCondiciones(base, jugador);
  const fuente = excluirRecientes(conCondiciones, recientes);
  return elegirPorRareza(rng, fuente);
}

export function elegirCartaRedes(rng, { jugador, oferta = null, recientes = [] }) {
  if (oferta && rng.chance(0.5)) {
    const deSemana = CARTAS_REDES.find((c) => c.id === 'post_pelea_grande');
    if (deSemana) return deSemana;
  }
  const conCondiciones = conSalvaguardaDeCondiciones(CARTAS_REDES, jugador);
  const fuente = excluirRecientes(conCondiciones, recientes);
  return elegirPorRareza(rng, fuente);
}

export function resolverOpcion(rng, { jugador, carta, opcionId, rivalidades = [], rivalObjetivoId = null }) {
  const opcion = carta.opciones.find((o) => o.id === opcionId);
  if (!opcion) throw new Error(`Opción desconocida: ${opcionId}`);

  let mods = { ...(opcion.mods ?? {}) };
  let texto = opcion.textoResultado ?? '';
  let indiceGanador = null;
  let efectosRama = null;
  let caePelea = false;

  if (opcion.probabilidades) {
    const tirada = resolverProbabilidad(rng, opcion);
    mods = { ...mods, ...tirada.resultado };
    texto = tirada.texto;
    indiceGanador = tirada.indice;
    efectosRama = tirada.efectos ?? null;
    caePelea = tirada.caePelea;
  }

  const paso = aplicarCarta(jugador, { ...carta, mods });
  let nuevo = paso.jugador;

  // El efectos de la RAMA ganadora (Task v3, "cartas nuevas con azar") pisa
  // el de la opción entera cuando ambos declaran la misma clave: una carta de
  // riesgo puede querer "+ fama si sale bien, - fama si sale mal", algo que
  // `opcion.efectos` (fijo, aplica siempre) no puede expresar por sí solo.
  const efectos = { ...(opcion.efectos ?? {}), ...(efectosRama ?? {}) };
  if (typeof efectos.dinero === 'number') {
    nuevo = { ...nuevo, dinero: Math.max(0, nuevo.dinero + efectos.dinero) };
  }

  let nuevasRivalidades = rivalidades;
  if (efectos.heatRival && rivalObjetivoId) {
    nuevasRivalidades = subirHeat(rivalidades, rivalObjetivoId, efectos.heatRival);
  }

  const deltasTexto = formatearMods(paso.deltas);
  const extras = [];
  if (efectos.dinero) extras.push(`${efectos.dinero > 0 ? '+' : '-'}US$ ${Math.abs(efectos.dinero).toLocaleString('es-AR')}`);

  return {
    jugador: nuevo,
    rivalidades: nuevasRivalidades,
    texto,
    deltas: paso.deltas,
    deltasTexto: [...deltasTexto, ...extras],
    indiceGanador,
    // Task v3 ("cartas nuevas con azar"): true si la rama ganadora de esta
    // opción declaró `caePelea: true` (ver CARTAS_EVENTO/CARTAS_REDES). Quien
    // llama (main.js) es responsable de cancelar la pelea de verdad, vía
    // `cancelarProximaPelea` (career.js) — acá solo se expone la señal.
    caePelea,
  };
}
