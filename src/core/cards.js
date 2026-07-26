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
// `pesos` es opcional (default PESOS_RAREZA, el de siempre): lo usa
// `repartirMejoras` para compensar la varianza legendaria cuando reparte
// menos cartas de lo habitual (ver PESOS_RAREZA_REPARTO_REDUCIDO, más abajo)
// — el resto de los callers (repartirOrigenes, repartirApodos,
// repartirEstilos, elegirEvento, elegirCartaCampamento, elegirCartaRedes) no
// lo pasan y siguen con el 70/25/5 de siempre.
// Consume exactamente una tirada de rng (igual que rng.pick), así que se
// puede usar como reemplazo directo de un `rng.pick` sin correr la secuencia
// del resto del bloque.
export function elegirPorRareza(rng, elegibles, pesos = PESOS_RAREZA) {
  const porRareza = {};
  for (const carta of elegibles) {
    const rareza = rarezaDe(carta);
    porRareza[rareza] = (porRareza[rareza] ?? 0) + 1;
  }
  const entradas = elegibles.map((carta) => {
    const rareza = rarezaDe(carta);
    const peso = (pesos[rareza] ?? pesos.normal) / porRareza[rareza];
    return { valor: carta, peso };
  });
  return rng.weighted(entradas);
}

// Sortea `total` elementos sin repetir de `elegibles`, respetando los pesos
// de rareza (ver elegirPorRareza, incluido el `pesos` opcional). Si una
// rareza se queda sin elementos a mitad de camino, el peso restante se
// reparte entre las que sí tienen: nunca se devuelven menos elementos de los
// pedidos por culpa de un hueco de rareza (mientras el catálogo alcance en
// total). Genérico a propósito: lo usa `repartirMejoras` acá abajo, y
// también `repartirOrigenes` (fighter.js), `repartirApodos` (nicknames.js) y
// `repartirEstilos` (styles.js) — un solo algoritmo de reparto por rareza
// para todo el juego, no uno por catálogo.
export function sortearPorRareza(rng, elegibles, total, pesos = PESOS_RAREZA) {
  let restantes = [...elegibles];
  const elegidas = [];
  while (elegidas.length < total && restantes.length > 0) {
    const elegida = elegirPorRareza(rng, restantes, pesos);
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
//   - OPCIONES_EXTRA_ETAPA_TEMPRANA: cuánta MEJOR CALIDAD (chance de
//     rara/legendaria, ver `bonusCalidadDe` y `repartirMejoras` más abajo)
//     gana ese reparto puntual — sube el promedio por selección sin tocar
//     ningún valor de la carta que sale.
//
// Cambio 1 (feedback del usuario: "una acción trae 5 opciones, eso no está
// bien, son 2 o máximo 3"): hasta acá, OPCIONES_EXTRA_ETAPA_TEMPRANA (y el
// `opcionesExtra` del entrenador de elite, ver bonusCartas en money.js)
// SUMABAN cartas de más al reparto — con base 3 + entrenador (+1) + etapa
// temprana (+2), llegaba a repartir 5. El tope de `repartirMejoras` ahora es
// DURO (nunca más que la cantidad base, 2 o 3): estos dos bonus dejaron de
// agregar cartas y en cambio suben la chance de que la carta que SÍ sale sea
// rara o legendaria — compensado matemáticamente (ver `pesosCompensados`)
// para que la tasa de "al menos una legendaria" NO baje por tener menos
// tiradas: es la misma lógica que ya usaba `pesosCompensadosPorMenosCartas`
// para el reparto reducido (2 en vez de 3), generalizada para cubrir también
// las cartas que este bonus ya no agrega.
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

// Pedido del coordinador (v4, "el mazo de mejora también"): la queja
// original del usuario ("muchas decisiones de tres opciones") apuntaba
// justo a este mazo — el panel de campamento diciendo "El dado trajo tres
// mejoras. Elegí una." con tres tarjetas, el beat MÁS frecuente del juego
// (corre garantizado en TODOS los bloques). `repartirMejoras` reparte 3
// cartas la gran mayoría de las veces, pero ~1 de cada 5 reparte solo 2:
// variedad de ritmo sin que se sienta un recorte. Solo se sortea cuando el
// caller NO pide una `cantidad` puntual (el caso real de career.js, que
// nunca la pasa): pasar `cantidad` explícita sigue siendo 100%
// determinístico y no consume esta tirada — así ningún test/caller que fije
// un número exacto se ve afectado por esta variación.
export const CANTIDAD_MEJORAS_POR_DEFECTO = 3;
export const CANTIDAD_MEJORAS_REDUCIDA = 2;
const PROB_CANTIDAD_REDUCIDA = 0.2; // ~1 de cada 5

export function decidirCantidadMejoras(rng) {
  return rng.chance(PROB_CANTIDAD_REDUCIDA) ? CANTIDAD_MEJORAS_REDUCIDA : CANTIDAD_MEJORAS_POR_DEFECTO;
}

// Repartir menos cartas de las que "corresponderían" reduce, para ESE
// reparto puntual, la chance de que aparezca una legendaria — pedido
// explícito: "no dejes que eso aplane la varianza legendaria". Se compensa
// subiendo el peso de legendaria (bajando el de normal en la misma medida;
// 'rara' no se toca) de forma que la chance de ver AL MENOS UNA legendaria en
// `totalOfrecido` tiradas quede igual a la que había con `totalQueHubieraSalido`
// tiradas al peso de siempre (5%):
//   1 - (1-w)^totalOfrecido = 1 - (1-0.05)^totalQueHubieraSalido
//   =>  w = 1 - (0.95^totalQueHubieraSalido)^(1/totalOfrecido)
// Si no falta ninguna tirada (totalQueHubieraSalido <= totalOfrecido), no hay
// nada que compensar: se devuelve el peso de siempre tal cual.
//
// Dos llamadores, la MISMA lógica para los dos (Cambio 1: "coordiná tu
// cambio con `pesosCompensadosPorMenosCartas` en vez de pelearte con ella" —
// esta es esa función, generalizada en vez de duplicada):
//   1. La cantidad base salió reducida (2 en vez de 3, ~1 de cada 5
//      repartos, decidirCantidadMejoras): falta la 3ª carta de siempre.
//   2. El entrenador de elite y/o la etapa temprana ya NO agregan cartas de
//      más (tope duro de 3, Cambio 1): faltan las que antes sí se agregaban.
// `repartirMejoras` combina ambas faltantes en un solo `totalQueHubieraSalido`
// antes de llamar acá — ver el comentario ahí.
// Medido en conjunto sobre carreras completas con scripts/balance-sim.mjs
// (no solo el reparto individual) y con un test estadístico dedicado en
// cards.test.js: la tasa de "al menos una legendaria" con menos tiradas de
// las que corresponderían queda cerca de la de la cantidad de siempre, no
// varios puntos más abajo.
function pesosCompensados(totalOfrecido, totalQueHubieraSalido) {
  if (totalQueHubieraSalido <= totalOfrecido) return PESOS_RAREZA;
  const pLegendariaBase = PESOS_RAREZA.legendaria / 100;
  const probObjetivoSinCompensar = 1 - (1 - pLegendariaBase) ** totalQueHubieraSalido;
  const wLegendaria = 1 - (1 - probObjetivoSinCompensar) ** (1 / totalOfrecido);
  const pctLegendaria = wLegendaria * 100;
  const deltaDeNormal = pctLegendaria - PESOS_RAREZA.legendaria;
  return {
    normal: PESOS_RAREZA.normal - deltaDeNormal,
    rara: PESOS_RAREZA.rara,
    legendaria: pctLegendaria,
  };
}

export function repartirMejoras(rng, { jugador, etapa, cantidad = null, catalogo = null }) {
  const fuente = catalogo ?? CARTAS_MEJORA;
  const bonus = bonusCartas(jugador);
  const opcionesExtraEtapa = OPCIONES_EXTRA_ETAPA_TEMPRANA[etapa] ?? 0;
  const cantidadBase = cantidad ?? decidirCantidadMejoras(rng);

  // Cambio 1: tope DURO — nunca se reparten más de `cantidadBase` cartas
  // (2 o 3), ni con entrenador de elite ni en etapa temprana. Lo que esos dos
  // bonus daban ANTES en cantidad (`bonus.opcionesExtra` + `opcionesExtraEtapa`,
  // hasta +3 cartas juntos) ahora se traduce en CALIDAD: `totalQueHubieraSalido`
  // es cuántas cartas se habrían repartido con el sistema viejo (deshaciendo
  // también la reducción de `decidirCantidadMejoras` con `Math.max(...,
  // CANTIDAD_MEJORAS_POR_DEFECTO)`, para no confundir esa reducción — ya
  // compensada por su cuenta — con el bonus de calidad de este cambio) y
  // `pesosCompensados` sube el peso de legendaria/rara para que la chance de
  // "al menos una legendaria" en las `cantidadBase` cartas que sí se ofrecen
  // iguale (no baje) la que había cuando esas cartas de más existían de
  // verdad.
  const totalQueHubieraSalido = Math.max(cantidadBase, CANTIDAD_MEJORAS_POR_DEFECTO)
    + bonus.opcionesExtra + opcionesExtraEtapa;
  const pesos = pesosCompensados(cantidadBase, totalQueHubieraSalido);
  const estado = jugador.estado?.lesion ? 'lesionado' : 'sano';
  const elegibles = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina, estado }));
  const elegidas = sortearPorRareza(rng, elegibles, cantidadBase, pesos);

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
