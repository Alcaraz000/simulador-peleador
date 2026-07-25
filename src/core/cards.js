import { ETIQUETAS, aplicarModificadores, LIMITES_ESTADO } from './stats.js';
import { bonusCartas } from './money.js';
import { CARTAS_MEJORA } from '../content/cards-improve.js';

export function formatearMods(mods) {
  return Object.entries(mods).map(([clave, valor]) => {
    const nombre = ETIQUETAS[clave]?.larga ?? clave;
    const signo = valor > 0 ? '+' : '';
    return `${signo}${valor} ${nombre}`;
  });
}

function cartaAplica(carta, { etapa, disciplina }) {
  const porEtapa = carta.etapas.includes(etapa);
  const porDisciplina = carta.disciplinas === 'todas' || carta.disciplinas.includes(disciplina);
  return porEtapa && porDisciplina;
}

// Pesos de rareza para el sorteo de mejoras: normal ~70%, rara ~25%, legendaria ~5%.
// El peso es por RAREZA, no por carta: si hay cinco cartas normales y una rara, la
// rara sigue valiendo 25% en total (no 25% dividido entre cinco competidoras).
const PESOS_RAREZA = { normal: 70, rara: 25, legendaria: 5 };

function rarezaDe(carta) {
  return carta.rareza ?? 'normal';
}

// Elige UNA carta de `elegibles` respetando los pesos de rareza: el peso es
// por RAREZA, no por carta individual (si hay cinco normales y una rara, la
// rara sigue valiendo 25% en total, no 25% dividido entre cinco competidoras).
// Si a `elegibles` (ya filtrado por etapa/disciplina/categoría) le falta
// alguna rareza, esa rareza simplemente no aparece entre las entradas: el
// peso se redistribuye solo entre las que sí están presentes.
// Consume exactamente una tirada de rng (igual que rng.pick), así que se
// puede usar como reemplazo directo de un `rng.pick` sin correr la secuencia
// del resto del bloque.
export function elegirPorRareza(rng, elegibles) {
  const porRareza = {};
  for (const carta of elegibles) {
    const rareza = rarezaDe(carta);
    porRareza[rareza] = (porRareza[rareza] ?? 0) + 1;
  }
  const entradas = elegibles.map((carta) => {
    const rareza = rarezaDe(carta);
    const peso = (PESOS_RAREZA[rareza] ?? PESOS_RAREZA.normal) / porRareza[rareza];
    return { valor: carta, peso };
  });
  return rng.weighted(entradas);
}

// Sortea `total` cartas sin repetir de `elegibles`, respetando los pesos de
// rareza (ver elegirPorRareza). Si una rareza se queda sin cartas a mitad de
// camino, el peso restante se reparte entre las que sí tienen: nunca se
// devuelven menos cartas de las pedidas por culpa de un hueco de rareza
// (mientras el catálogo alcance en total).
function sortearPorRareza(rng, elegibles, total) {
  let restantes = [...elegibles];
  const elegidas = [];
  while (elegidas.length < total && restantes.length > 0) {
    const elegida = elegirPorRareza(rng, restantes);
    elegidas.push(elegida);
    restantes = restantes.filter((c) => c !== elegida);
  }
  return elegidas;
}

export function repartirMejoras(rng, { jugador, etapa, cantidad = 3, catalogo = null }) {
  const fuente = catalogo ?? CARTAS_MEJORA;
  const bonus = bonusCartas(jugador);
  const total = cantidad + bonus.opcionesExtra;
  const elegibles = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina }));
  const elegidas = sortearPorRareza(rng, elegibles, total);

  if (bonus.bonusValor === 0) return elegidas;
  return elegidas.map((carta) => {
    const mods = {};
    for (const [clave, valor] of Object.entries(carta.mods)) {
      mods[clave] = valor > 0 ? valor + bonus.bonusValor : valor;
    }
    return { ...carta, mods };
  });
}

export function aplicarCarta(jugador, carta) {
  const nuevo = {
    ...jugador,
    atributos: { ...jugador.atributos },
    especiales: { ...jugador.especiales },
    estado: { ...jugador.estado },
  };

  const paraAtributos = {};
  const paraEspeciales = {};
  const paraEstado = {};
  for (const [clave, valor] of Object.entries(carta.mods)) {
    if (clave in nuevo.atributos) paraAtributos[clave] = valor;
    else if (clave in nuevo.especiales) paraEspeciales[clave] = valor;
    else if (clave in nuevo.estado) paraEstado[clave] = valor;
  }

  const a = aplicarModificadores(nuevo.atributos, paraAtributos);
  const e = aplicarModificadores(nuevo.especiales, paraEspeciales);
  const s = aplicarModificadores(nuevo.estado, paraEstado, LIMITES_ESTADO);
  nuevo.atributos = a.resultado;
  nuevo.especiales = e.resultado;
  nuevo.estado = s.resultado;

  const deltas = { ...a.deltas, ...e.deltas, ...s.deltas };
  return { jugador: nuevo, deltas, texto: formatearMods(deltas).join(' · ') };
}

export function resolverProbabilidad(rng, opcion) {
  const entradas = opcion.probabilidades.map((p) => ({ valor: p, peso: p.peso }));
  const elegida = rng.weighted(entradas);
  return { resultado: elegida.mods, texto: elegida.texto };
}

// Convierte los pesos de `opcion.probabilidades` en enteros que suman
// exactamente 100, en el mismo orden, para que la UI muestre el porcentaje
// real de cada desenlace. Si el peso total no divide redondo, el resto se lo
// lleva la entrada de mayor peso (la primera, en caso de empate).
export function porcentajesDe(opcion) {
  const probs = opcion?.probabilidades;
  if (!probs || probs.length === 0) return [];

  const pesos = probs.map((p) => Math.max(0, p.peso));
  const totalPeso = pesos.reduce((a, b) => a + b, 0);
  if (totalPeso <= 0) return pesos.map(() => 0);

  const porcentajes = pesos.map((peso) => Math.floor((peso / totalPeso) * 100));
  const resto = 100 - porcentajes.reduce((a, b) => a + b, 0);

  let indiceMayor = 0;
  for (let i = 1; i < pesos.length; i++) {
    if (pesos[i] > pesos[indiceMayor]) indiceMayor = i;
  }
  porcentajes[indiceMayor] += resto;

  return porcentajes;
}
