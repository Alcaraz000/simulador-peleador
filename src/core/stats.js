export const ATRIBUTOS = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq', 'grappling'];

export const ETIQUETAS = {
  potencia: { corta: 'POT', larga: 'Potencia' },
  velocidad: { corta: 'VEL', larga: 'Velocidad' },
  tecnica: { corta: 'TÉC', larga: 'Técnica' },
  defensa: { corta: 'DEF', larga: 'Defensa' },
  cardio: { corta: 'CAR', larga: 'Cardio' },
  iq: { corta: 'IQ', larga: 'IQ de pelea' },
  grappling: { corta: 'GRA', larga: 'Grappling' },
  disciplinaPersonal: { corta: 'DIS', larga: 'Disciplina' },
  menton: { corta: 'MEN', larga: 'Mentón' },
  forma: { corta: 'FOR', larga: 'Forma' },
  fatiga: { corta: 'FAT', larga: 'Fatiga' },
  moral: { corta: 'MOR', larga: 'Moral' },
};

export const LIMITES_ATRIBUTO = { min: 1, max: 99 };
export const LIMITES_ESTADO = { min: 0, max: 100 };

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

export function crearEstado() {
  return { forma: 60, fatiga: 10, moral: 60, lesion: null };
}

export function calcularMedia(atributos, pesos) {
  let suma = 0;
  let pesoTotal = 0;
  for (const [clave, peso] of Object.entries(pesos)) {
    if (typeof atributos[clave] !== 'number' || peso <= 0) continue;
    suma += atributos[clave] * peso;
    pesoTotal += peso;
  }
  if (pesoTotal === 0) return 0;
  return Math.round(suma / pesoTotal);
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

const ESCALAS = {
  forma: [[80, 'EN PUNTO'], [40, 'NORMAL'], [0, 'OXIDADO']],
  moral: [[80, 'ENCENDIDO'], [40, 'ESTABLE'], [0, 'BAJONEADO']],
  fatiga: [[80, 'FUNDIDO'], [50, 'CANSADO'], [25, 'LIVIANO'], [0, 'ENTERO']],
};

export function etiquetaEstado(nombre, valor) {
  const escala = ESCALAS[nombre];
  if (!escala) return String(valor);
  for (const [umbral, etiqueta] of escala) {
    if (valor >= umbral) return etiqueta;
  }
  return escala[escala.length - 1][1];
}
