import { clamp } from './stats.js';

export const HEAT_INICIAL = 10;
export const HEAT_POR_CRUCE = 18;

export function crearRivalidad(_peleadorId, rivalId) {
  return { rivalId, heat: HEAT_INICIAL, h2h: { v: 0, d: 0, e: 0 }, esArchirrival: false, hitos: [] };
}

function clonar(rivalidades) {
  return rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] }));
}

function asegurar(lista, rivalId) {
  let rivalidad = lista.find((r) => r.rivalId === rivalId);
  if (!rivalidad) {
    rivalidad = crearRivalidad(null, rivalId);
    lista.push(rivalidad);
  }
  return rivalidad;
}

export function registrarCruce(rivalidades, rivalId, resultado, { heat = HEAT_POR_CRUCE, hito = null } = {}) {
  const lista = clonar(rivalidades);
  const rivalidad = asegurar(lista, rivalId);
  rivalidad.h2h[resultado] += 1;
  rivalidad.heat = clamp(rivalidad.heat + heat, 0, 100);
  if (hito) rivalidad.hitos.push(hito);
  return lista;
}

export function subirHeat(rivalidades, rivalId, cantidad) {
  const lista = clonar(rivalidades);
  const rivalidad = asegurar(lista, rivalId);
  rivalidad.heat = clamp(rivalidad.heat + cantidad, 0, 100);
  return lista;
}

export function cruces(rivalidad) {
  return rivalidad.h2h.v + rivalidad.h2h.d + rivalidad.h2h.e;
}

export function elegirArchirrival(rivalidades) {
  const candidatos = rivalidades.filter((r) => cruces(r) >= 2);
  if (candidatos.length === 0) return null;
  const ganador = candidatos.reduce((mejor, actual) => (actual.heat > mejor.heat ? actual : mejor));
  ganador.esArchirrival = true;
  for (const r of rivalidades) if (r !== ganador) r.esArchirrival = false;
  return ganador;
}

export function h2hTexto(rivalidad) {
  const { v, d, e } = rivalidad.h2h;
  return e > 0 ? `${v}-${d}-${e}` : `${v}-${d}`;
}
