import {
  ATRIBUTOS, ETIQUETAS, aplicarModificadores, LIMITES_ESTADO,
} from './stats.js';
import { bonusCartas } from './money.js';
import { CARTAS_MEJORA } from '../content/cards-improve.js';

export function formatearMods(mods) {
  return Object.entries(mods).map(([clave, valor]) => {
    const nombre = ETIQUETAS[clave]?.larga ?? clave;
    const signo = valor > 0 ? '+' : '';
    return `${signo}${valor} ${nombre}`;
  });
}

// Sistema 1 (feedback del usuario: "las tarjetas que aparecen están
// condicionadas al estado del jugador"): `carta.estados` es opcional y, si
// falta, se asume `['sano']` — así el catálogo viejo (todo pensado para un
// jugador sano, "machaque de gimnasio") sigue funcionando tal cual sin tener
// que taggear cada carta a mano. Una carta de recuperación declara
// `estados: ['lesionado']` explícitamente (ver CARTAS_MEJORA,
// content/cards-improve.js): mientras el jugador está lesionado, SOLO esas
// aparecen — nunca las de gimnasio — y viceversa.
function cartaAplicaPorEstado(carta, estado) {
  const estadosCarta = carta.estados ?? ['sano'];
  return estadosCarta.includes(estado);
}

function cartaAplica(carta, { etapa, disciplina, estado }) {
  const porEtapa = carta.etapas.includes(etapa);
  const porDisciplina = carta.disciplinas === 'todas' || carta.disciplinas.includes(disciplina);
  const porEstado = cartaAplicaPorEstado(carta, estado);
  return porEtapa && porDisciplina && porEstado;
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

// Sortea `total` elementos sin repetir de `elegibles`, respetando los pesos
// de rareza (ver elegirPorRareza). Si una rareza se queda sin elementos a
// mitad de camino, el peso restante se reparte entre las que sí tienen:
// nunca se devuelven menos elementos de los pedidos por culpa de un hueco de
// rareza (mientras el catálogo alcance en total). Genérico a propósito: lo
// usa `repartirMejoras` acá abajo, y también `repartirOrigenes` (fighter.js)
// y `repartirApodos` (nicknames.js) — un solo algoritmo de reparto por
// rareza para todo el juego, no uno por catálogo.
export function sortearPorRareza(rng, elegibles, total) {
  let restantes = [...elegibles];
  const elegidas = [];
  while (elegidas.length < total && restantes.length > 0) {
    const elegida = elegirPorRareza(rng, restantes);
    elegidas.push(elegida);
    restantes = restantes.filter((c) => c !== elegida);
  }
  return elegidas;
}

// Sistema 2, corrección del coordinador (segunda ronda): "el problema está
// en la mitad de la carrera, no en el final" — a mitad de carrera (bloque
// 10/20) la MEDIA seguía baja (~52) aunque el final ya hubiera subido
// bastante: cada carta mueve poco sobre una base chica, así que arrancar se
// sentía lento pase lo que pase con el techo. Dos palancas, las dos decaen a
// 0 en profesional (donde pasa la mayoría de los 20 bloques de la carrera),
// así que empujan fuerte el arranque sin inflar mucho más el techo final:
//   - BONUS_ETAPA_TEMPRANA: suma puntos directo al atributo de combate más
//     grande de la carta (ver conBonusEnElMasGrande, más abajo).
//   - OPCIONES_EXTRA_ETAPA_TEMPRANA: una o dos cartas más para elegir en el
//     reparto — sube el promedio por selección (mejor de más opciones) sin
//     tocar ningún valor. Con esta sola palanca la brecha CON/SIN legendaria
//     no se achica (a veces hasta se agranda un poco: más tiradas tempranas
//     = más chances de que la legendaria temprana SÍ aparezca), pero por sí
//     sola no alcanza para mover la MEDIA lo suficiente.
//
// Medido con scripts/balance-sim.mjs (n=1500, "creación real"): MEDIA a
// mitad de carrera subió de ~52.5 a 56.5 (antes de esta corrección; el
// objetivo pedido era "~60"). La brecha CON/SIN legendaria (medida como
// "creación real" vs. "piso deliberado", mismas semillas) bajó de ~3.3 a
// ~2.5 puntos — se probaron combinaciones que llegaban más cerca de 60
// (hasta ~57-58), pero la brecha se achicaba proporcionalmente más (hasta
// ~2.4 y bajando): se priorizó no perforar más ese piso, porque "no aplanes
// las legendarias" es un pedido tan explícito y repetido como éste. La
// brecha SIGUE siendo clara y medible, no desapareció — un jugador con
// suerte legendaria sigue notándose por encima de uno sin ella.
const BONUS_ETAPA_TEMPRANA = { juvenil: 6, amateur: 4, profesional: 0, veterano: 0 };
const OPCIONES_EXTRA_ETAPA_TEMPRANA = { juvenil: 2, amateur: 2, profesional: 0, veterano: 0 };

// Aplica `valor` a CADA mod positivo de la carta (comportamiento de siempre
// del bonus del entrenador, sin tocar).
function conBonusEnTodos(mods, valor) {
  const nuevo = {};
  for (const [clave, m] of Object.entries(mods)) {
    nuevo[clave] = m > 0 ? m + valor : m;
  }
  return nuevo;
}

// Aplica `valor` UNA sola vez, al ATRIBUTO DE COMBATE positivo más grande de
// la carta (potencia/velocidad/tecnica/defensa/cardio/iq/grappling — los
// únicos que pesan en calcularMedia, stats.js) — lo usa el bonus de etapa
// temprana. Dos motivos para esta doble restricción, medidos en
// balance-sim.mjs:
//   1. Solo el atributo más grande, no todos los positivos: si se sumara a
//      cada mod positivo (como el del entrenador), una carta con dos o tres
//      stats positivos terminaba recibiendo el doble o el triple de bonus
//      que una de un solo stat, y podía acercar su total al de una
//      legendaria — justo lo que "no aplanes la varianza" pide evitar.
//   2. Solo atributos de combate, nunca forma/fatiga/moral/disciplina/
//      mentón: esos no mueven la MEDIA para nada, así que un bonus ahí no
//      ayudaba en lo más mínimo al problema real ("a mitad de carrera la
//      MEDIA sigue baja") — y de paso, con el bonus en TODOS los mods
//      positivos, terminaba premiando más a cartas de puro descanso/QoL
//      (que rinden alto en una suma cruda mal pensada) que a las que sí
//      suben MEDIA.
function conBonusEnElMasGrande(mods, valor) {
  const positivos = Object.entries(mods).filter(([clave, m]) => m > 0 && ATRIBUTOS.includes(clave));
  if (positivos.length === 0) return mods;
  const [claveMax] = positivos.reduce((mejor, actual) => (actual[1] > mejor[1] ? actual : mejor));
  return { ...mods, [claveMax]: mods[claveMax] + valor };
}

export function repartirMejoras(rng, { jugador, etapa, cantidad = 3, catalogo = null }) {
  const fuente = catalogo ?? CARTAS_MEJORA;
  const bonus = bonusCartas(jugador);
  const opcionesExtraEtapa = OPCIONES_EXTRA_ETAPA_TEMPRANA[etapa] ?? 0;
  const total = cantidad + bonus.opcionesExtra + opcionesExtraEtapa;
  const estado = jugador.estado?.lesion ? 'lesionado' : 'sano';
  const elegibles = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina, estado }));
  const elegidas = sortearPorRareza(rng, elegibles, total);

  const bonusEtapa = BONUS_ETAPA_TEMPRANA[etapa] ?? 0;
  if (bonus.bonusValor === 0 && bonusEtapa === 0) return elegidas;
  return elegidas.map((carta) => {
    let mods = carta.mods;
    if (bonus.bonusValor > 0) mods = conBonusEnTodos(mods, bonus.bonusValor);
    // El bonus de etapa temprana NUNCA toca una legendaria (pedido explícito
    // y repetido: "no aplanes la varianza de las legendarias").
    if (bonusEtapa > 0 && carta.rareza !== 'legendaria') mods = conBonusEnElMasGrande(mods, bonusEtapa);
    return mods === carta.mods ? carta : { ...carta, mods };
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

// `indice` es la posición de la rama ganadora DENTRO de `opcion.probabilidades`
// (por referencia al objeto elegido, no por texto: dos ramas pueden compartir
// `texto`, o no tenerlo, y siguen siendo distinguibles por índice). La UI lo
// usa para el roll con suspenso (animarRoll) en vez de adivinar comparando
// strings, que falla ~50% de las veces cuando el texto se repite.
//
// `efectos` y `caePelea` (Task v3, "cartas nuevas con azar") viven POR RAMA,
// a diferencia de `opcion.efectos` (que aplica siempre, gane la rama que
// gane): una carta de riesgo como "puede darte +2 a todo, o puede hacer que
// se caiga tu pelea y perdés fama" necesita que la fama y la caída de la
// pelea dependan de CUÁL rama salió, no de la opción entera. `resolverOpcion`
// (events.js) es quien de verdad los usa; acá solo se los deja pasar tal
// cual venían en la rama ganadora.
export function resolverProbabilidad(rng, opcion) {
  const entradas = opcion.probabilidades.map((p) => ({ valor: p, peso: p.peso }));
  const elegida = rng.weighted(entradas);
  return {
    resultado: elegida.mods,
    texto: elegida.texto,
    indice: opcion.probabilidades.indexOf(elegida),
    efectos: elegida.efectos,
    caePelea: elegida.caePelea ?? false,
  };
}

// Convierte los pesos de `opcion.probabilidades` en enteros que suman
// exactamente 100, en el mismo orden, para que la UI muestre el porcentaje
// real de cada desenlace. Si el peso total no divide redondo, el resto se lo
// lleva la entrada de mayor peso (la primera, en caso de empate). Si NINGUNA
// rama tiene peso positivo (todas en 0, o negativas que se clampean a 0), no
// hay proporción real que repartir: se reparte parejo entre todas para que
// la suma siga dando 100 en vez de 0.
export function porcentajesDe(opcion) {
  const probs = opcion?.probabilidades;
  if (!probs || probs.length === 0) return [];

  const pesosCrudos = probs.map((p) => Math.max(0, p.peso));
  const totalCrudo = pesosCrudos.reduce((a, b) => a + b, 0);
  const pesos = totalCrudo > 0 ? pesosCrudos : probs.map(() => 1);
  const totalPeso = totalCrudo > 0 ? totalCrudo : pesos.length;

  const porcentajes = pesos.map((peso) => Math.floor((peso / totalPeso) * 100));
  const resto = 100 - porcentajes.reduce((a, b) => a + b, 0);

  let indiceMayor = 0;
  for (let i = 1; i < pesos.length; i++) {
    if (pesos[i] > pesos[indiceMayor]) indiceMayor = i;
  }
  porcentajes[indiceMayor] += resto;

  return porcentajes;
}
