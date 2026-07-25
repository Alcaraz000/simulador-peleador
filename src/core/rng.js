/**
 * RNG determinista con semilla (mulberry32).
 * Todo el azar del juego pasa por acá: hace las partidas reproducibles
 * y los tests estables.
 */

function semillaDesdeTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(semilla) {
  const base = typeof semilla === 'string' ? semillaDesdeTexto(semilla) : (semilla >>> 0);
  let estadoInterno = base;

  function next() {
    estadoInterno = (estadoInterno + 0x6d2b79f5) >>> 0;
    let t = estadoInterno;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng = {
    seed: base,
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(entries) {
      const total = entries.reduce((acc, e) => acc + Math.max(0, e.peso), 0);
      if (total <= 0) return entries[0].valor;
      let tirada = next() * total;
      for (const e of entries) {
        tirada -= Math.max(0, e.peso);
        if (tirada < 0) return e.valor;
      }
      return entries[entries.length - 1].valor;
    },
    shuffle(arr) {
      const copia = [...arr];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
    estado: () => estadoInterno,
    restaurar(valor) {
      estadoInterno = valor >>> 0;
    },
  };

  return rng;
}
