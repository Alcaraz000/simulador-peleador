export const ATRIBUTOS = ['fuerza', 'defensa', 'cardio', 'agilidad'];

export const ETIQUETAS = {
  fuerza: { corta: 'FUE', larga: 'Fuerza' },
  defensa: { corta: 'DEF', larga: 'Defensa' },
  cardio: { corta: 'CAR', larga: 'Cardio' },
  agilidad: { corta: 'AGI', larga: 'Agilidad' },
};

export const LIMITES_ATRIBUTO = { min: 1, max: 99 };

export function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

export function crearAtributos(valores = {}) {
  const salida = {};
  for (const clave of ATRIBUTOS) {
    const bruto = valores[clave] ?? 40;
    salida[clave] = clamp(Math.round(bruto), LIMITES_ATRIBUTO.min, LIMITES_ATRIBUTO.max);
  }
  return salida;
}

// Simplificación (v13): de seis atributos + cinco estados (mentón, disciplina
// personal, forma, moral, fatiga) a cuatro atributos y nada más. Los cinco
// estados desaparecen del tablero; solo sobrevive la lesión. La fatiga sigue
// existiendo, pero ya no vive acá: nace en 0 dentro de cada pelea (fight.js,
// Bloque 2) y no sale nunca al peleador.
export function crearEstado() {
  return { lesion: null };
}

export function aplicarModificadores(objetivo, mods, limites = LIMITES_ATRIBUTO) {
  const resultado = { ...objetivo };
  const deltas = {};
  for (const [clave, delta] of Object.entries(mods)) {
    if (typeof resultado[clave] !== 'number') continue;
    const antes = resultado[clave];
    const despues = clamp(antes + delta, limites.min, limites.max);
    resultado[clave] = despues;
    if (despues !== antes) deltas[clave] = despues - antes;
  }
  return { resultado, deltas };
}

// Rangos visuales de MEDIA (tablero, v2): el cuadrado de MEDIA se colorea
// según el rango, con la etiqueta del rango al lado.
export const RANGOS_MEDIA = {
  hierro: { id: 'hierro', nombre: 'Hierro', min: 1, max: 49, color: '#9aa0a6' },
  bronce: { id: 'bronce', nombre: 'Bronce', min: 50, max: 64, color: '#c87f3a' },
  plata: { id: 'plata', nombre: 'Plata', min: 65, max: 79, color: '#c9d1d9' },
  oro: { id: 'oro', nombre: 'Oro', min: 80, max: 89, color: '#f2c14e' },
  platino: { id: 'platino', nombre: 'Platino', min: 90, max: 99, color: '#6fe0e8' },
};

export function rangoDeMedia(media) {
  const valor = clamp(Math.round(media), LIMITES_ATRIBUTO.min, LIMITES_ATRIBUTO.max);
  const rango = Object.values(RANGOS_MEDIA).find((r) => valor >= r.min && valor <= r.max);
  const elegido = rango ?? RANGOS_MEDIA.hierro;
  return { id: elegido.id, nombre: elegido.nombre, color: elegido.color };
}
