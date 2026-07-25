import { NICKNAMES } from '../content/nicknames.js';
import { sortearPorRareza } from './cards.js';

/** Busca un apodo del catálogo por id, o null si no existe. */
export function apodoPorId(id) {
  return NICKNAMES.find((n) => n.id === id) ?? null;
}

/**
 * Reparte 3 apodos sin repetir, respetando la distribución de rarezas del
 * proyecto (normal ~70% / rara ~25% / legendaria ~5%). Reusa el mismo
 * algoritmo de reparto por rareza que ya usa `repartirMejoras` (ver
 * sortearPorRareza en cards.js) en vez de reimplementarlo.
 */
export function repartirApodos(rng) {
  return sortearPorRareza(rng, NICKNAMES, 3);
}
