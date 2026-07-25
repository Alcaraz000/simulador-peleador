import { aplicarCarta, resolverProbabilidad, formatearMods, elegirPorRareza } from './cards.js';
import { subirHeat } from './rivalry.js';
import { clamp } from './stats.js';
import { CARTAS_EVENTO } from '../content/cards-events.js';
import { CARTAS_REDES } from '../content/cards-social.js';

export function elegirEvento(rng, { jugador, etapa, categoria = null }) {
  const elegibles = CARTAS_EVENTO.filter(
    (c) => c.etapas.includes(etapa) && (categoria === null || c.categoria === categoria),
  );
  const fuente = elegibles.length > 0 ? elegibles : CARTAS_EVENTO;
  return elegirPorRareza(rng, fuente);
}

export function elegirCartaRedes(rng, { jugador, oferta = null }) {
  if (oferta && rng.chance(0.5)) {
    const deSemana = CARTAS_REDES.find((c) => c.id === 'post_pelea_grande');
    if (deSemana) return deSemana;
  }
  return elegirPorRareza(rng, CARTAS_REDES);
}

export function resolverOpcion(rng, { jugador, carta, opcionId, rivalidades = [], rivalObjetivoId = null }) {
  const opcion = carta.opciones.find((o) => o.id === opcionId);
  if (!opcion) throw new Error(`Opción desconocida: ${opcionId}`);

  let mods = { ...(opcion.mods ?? {}) };
  let texto = opcion.textoResultado ?? '';

  if (opcion.probabilidades) {
    const tirada = resolverProbabilidad(rng, opcion);
    mods = { ...mods, ...tirada.resultado };
    texto = tirada.texto;
  }

  const paso = aplicarCarta(jugador, { ...carta, mods });
  let nuevo = paso.jugador;

  const efectos = opcion.efectos ?? {};
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
  };
}
