import {
  aplicarCarta, resolverProbabilidad, formatearMods, elegirPorRareza, conSalvaguardaDeCondiciones,
} from './cards.js';
import { subirHeat } from './rivalry.js';
import { clamp } from './stats.js';
import { CARTAS_EVENTO } from '../content/cards-events.js';
import { CARTAS_REDES } from '../content/cards-social.js';

export function elegirEvento(rng, { jugador, etapa, categoria = null }) {
  const elegibles = CARTAS_EVENTO.filter(
    (c) => c.etapas.includes(etapa) && (categoria === null || c.categoria === categoria),
  );
  const base = elegibles.length > 0 ? elegibles : CARTAS_EVENTO;
  // Sistema 3 (cards.js, "las tarjetas deben depender de la situación"): la
  // salvaguarda ya se ocupa de que esto nunca deje `base` en cero.
  const fuente = conSalvaguardaDeCondiciones(base, jugador);
  return elegirPorRareza(rng, fuente);
}

export function elegirCartaRedes(rng, { jugador, oferta = null }) {
  if (oferta && rng.chance(0.5)) {
    const deSemana = CARTAS_REDES.find((c) => c.id === 'post_pelea_grande');
    if (deSemana) return deSemana;
  }
  const fuente = conSalvaguardaDeCondiciones(CARTAS_REDES, jugador);
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
  if (typeof efectos.fama === 'number') {
    nuevo = { ...nuevo, fama: clamp(nuevo.fama + efectos.fama, 0, 100) };
  }

  let nuevasRivalidades = rivalidades;
  if (efectos.heatRival && rivalObjetivoId) {
    nuevasRivalidades = subirHeat(rivalidades, rivalObjetivoId, efectos.heatRival);
  }

  const deltasTexto = formatearMods(paso.deltas);
  const extras = [];
  if (efectos.dinero) extras.push(`${efectos.dinero > 0 ? '+' : '-'}US$ ${Math.abs(efectos.dinero).toLocaleString('es-AR')}`);
  if (efectos.fama) extras.push(`${efectos.fama > 0 ? '+' : ''}${efectos.fama} Fama`);

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
