import {
  ATRIBUTOS, ETIQUETAS, aplicarModificadores,
} from './stats.js';
import { bonusCartas } from './money.js';
import { rendimientoDeMejora } from './talento.js';
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

// Sistema 3 (feedback del usuario: "una acción dice 'doble turno como cuando
// eras pibe' y mi personaje tiene 17 y es amateur... algunas tarjetas deben
// depender de la situación, edad, categoría, situación actual"): `carta.
// condiciones` es un objeto OPCIONAL con campos también opcionales — para
// sumar una condición nueva a una carta alcanza con escribir un campo, sin
// tocar esta función ni la de quien reparte. Los campos soportados hoy:
//   - edadMin / edadMax: rango de edad del jugador (inclusive).
//   - campeon: true exige al menos un cinturón puesto, false exige NINGUNO.
//   - dineroMin / dineroMax: rango de plata en el bolsillo.
//   - resultadoReciente: 'victoria' | 'derrota' | 'empate' — el resultado de
//     la ÚLTIMA pelea PROFESIONAL (jugador.historial; en juvenil/amateur ese
//     historial todavía está vacío — ver recordAmateur/historialAmateur en
//     fighter.js/career.js — así que una carta con esta condición nunca
//     aplica antes del debut profesional, algo correcto: no hay "la última
//     pelea" todavía).
// v13 (simplificación): la fama se va del juego, así que `famaMin`/`famaMax`
// dejaron de ser condiciones soportadas — ningún catálogo nuevo debe usarlas.
// Este catálogo de campos es EXTENSIBLE (agregar un tipo de condición nuevo
// sí toca esta función, una vez), pero USAR uno ya existente en una carta
// nueva es puramente declarativo.
function cumpleCondiciones(carta, jugador) {
  const cond = carta.condiciones;
  if (!cond || !jugador) return true;

  if (cond.edadMin != null && jugador.edad < cond.edadMin) return false;
  if (cond.edadMax != null && jugador.edad > cond.edadMax) return false;

  if (cond.campeon != null) {
    const esCampeon = (jugador.titulos?.length ?? 0) > 0;
    if (cond.campeon !== esCampeon) return false;
  }

  if (cond.dineroMin != null && (jugador.dinero ?? 0) < cond.dineroMin) return false;
  if (cond.dineroMax != null && (jugador.dinero ?? 0) > cond.dineroMax) return false;

  if (cond.resultadoReciente != null) {
    const CODIGO_RESULTADO = { victoria: 'v', derrota: 'd', empate: 'e' };
    const historial = jugador.historial ?? [];
    const ultimo = historial.length > 0 ? historial[historial.length - 1].resultado : null;
    if (ultimo !== CODIGO_RESULTADO[cond.resultadoReciente]) return false;
  }

  return true;
}

// Salvaguarda (pedido explícito: "el filtrado no puede dejar el pool
// vacío... si las condiciones son muy exigentes en algún momento de la
// carrera, tiene que haber siempre cartas elegibles"): filtra `pool` por
// `cumpleCondiciones`, pero si eso deja CERO cartas (puede pasar: nada te
// impide, sin querer, escribir una carta cuyas condiciones ningún jugador de
// esa etapa cumple nunca) devuelve `pool` tal cual, IGNORANDO las
// condiciones situacionales — nunca una pantalla sin nada para elegir. Quien
// llama ya filtró `pool` por etapa/disciplina/estado/categoría antes de
// pasarlo acá, así que ese filtro de base sigue de pie en el fallback.
// Una carta que en alguna de sus ramas te voltea la pelea (`caePelea: true`)
// no tiene ningún sentido si no hay pelea en danza: el usuario se cruzó "El
// sobre en el vestuario" —cuyo mal desenlace es "se cae la pelea"— sin tener
// nada pactado. Se INFIERE del contenido en vez de declararlo carta por
// carta: así una carta nueva con `caePelea` queda cubierta sola, sin que
// nadie tenga que acordarse de agregarle una condición.
export function puedeVoltearUnaPelea(carta) {
  return (carta.opciones ?? []).some((opcion) => (
    opcion.caePelea === true
    || (opcion.probabilidades ?? []).some((rama) => rama.caePelea === true)
  ));
}

/**
 * `contexto.hayPeleaEnDanza` — si hay una pelea firmada o una oferta todavía
 * sin firmar en este bloque. Sin contexto se asume que sí, para no cambiar el
 * comportamiento de quien no lo pase (el campamento, por ejemplo, siempre
 * corre con una pelea firmada).
 */
export function conSalvaguardaDeCondiciones(pool, jugador, contexto = {}) {
  const hayPelea = contexto.hayPeleaEnDanza ?? true;
  const filtrado = pool.filter((carta) => (
    cumpleCondiciones(carta, jugador) && (hayPelea || !puedeVoltearUnaPelea(carta))
  ));
  return filtrado.length > 0 ? filtrado : pool.filter((carta) => hayPelea || !puedeVoltearUnaPelea(carta));
}

/**
 * ¿Esta carta le cambia algo a ESTE peleador, o el tope se la come entera?
 *
 * Un atributo no pasa de LIMITES_ATRIBUTO.max (99). Con un atributo ya en el
 * tope, una carta que le suma queda en cero: se aplica, no rompe nada, y no
 * pasa absolutamente nada — el jugador gasta una decisión de las tres que
 * tiene por año a cambio de nada. Eso fue exactamente lo reportado ("tengo 93
 * de fuerza y al elegir cualquier tarjeta que aumente la fuerza no hace
 * nada": 93 era la BASE, el entrenador ponía los otros 6, y el total ya
 * estaba en 99).
 *
 * Se pregunta corriendo la carta de verdad contra una copia del peleador, no
 * reimplementando la cuenta: así incluye el clamp, el talento y cualquier
 * regla que `aplicarCarta` agregue mañana, sin quedar nunca desincronizada.
 *
 * Una carta que solo RESTA sí hace algo (algo malo, pero algo): es una
 * decisión legítima, no una carta muerta, y por eso también pasa este filtro.
 */
export function cartaRindeAlgo(jugador, carta) {
  return Object.keys(aplicarCarta(jugador, carta).deltas).length > 0;
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

// Bug reportado (v7, "una acción me aparece constantemente, la de 'El video
// antes de dormir', fácil se habrá repetido 5 o 6 veces seguidas"): la causa
// real no es que el pool sea chico (CARTAS_CAMPAMENTO tiene 17 cartas
// elegibles en cualquier etapa) sino que `elegirPorRareza` no tiene NINGUNA
// memoria de qué se mostró hace un instante — cada tirada es 100%
// independiente de la anterior, así que nada le impide a la MISMA carta
// salir de nuevo enseguida (dentro del mismo campamento, o en el que sigue).
// Con pocas decenas de tiradas por carrera y una carta memorable (ese título
// en particular llama la atención), un par de repeticiones cercanas alcanzan
// para sentirse como "esto sale todo el tiempo".
//
// `excluirRecientes`/`recordarCarta` son el arreglo genérico (lo usan
// elegirEvento/elegirCartaRedes/elegirCartaCampamento, los tres pools que
// muestran UNA sola carta elegida — a diferencia de repartirMejoras, que
// ofrece varias en simultáneo y ya garantiza "sin repetir entre sí" con
// sortearPorRareza): una memoria CORTA (últimas `ventana` cartas vistas de
// ESE pool) que se excluye del sorteo. Nunca vacía el pool — si excluir deja
// cero elegibles (pool chico + ventana grande, o casi todo recién visto), se
// cae con gracia devolviendo el pool sin filtrar, mismo criterio que
// `conSalvaguardaDeCondiciones` (ver más arriba): más vale una repetición
// ocasional que una pantalla sin nada para mostrar.
//
// La memoria viaja en la partida (`partida.memoriaCartas`, career.js) como un
// array de ids por pool — plano, serializable, sin referencias circulares —
// así el autoguardado la persiste sin problema y una partida retomada desde
// localStorage sigue recordando qué vio hace un rato.
export const MEMORIA_CARTAS_VENTANA = 4;

export function excluirRecientes(pool, recientes = []) {
  if (!recientes || recientes.length === 0) return pool;
  const filtrado = pool.filter((carta) => !recientes.includes(carta.id));
  return filtrado.length > 0 ? filtrado : pool;
}

export function recordarCarta(recientes = [], id, ventana = MEMORIA_CARTAS_VENTANA) {
  if (!id) return recientes;
  const actualizada = [...recientes, id];
  return actualizada.length > ventana ? actualizada.slice(actualizada.length - ventana) : actualizada;
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

// Pedido 3 (v14, "ojo con mostrar tarjetas donde una es claramente mejor"):
// una carta DOMINA a otra cuando da el mismo o mayor beneficio en cada
// atributo Y el mismo o menor costo — nunca hay una razón real para elegir
// la dominada. En `mods` el beneficio y el costo viven en el MISMO número con
// signo (+3 Fuerza es beneficio, -1 Agilidad es costo), así que "mismo o
// mayor beneficio y mismo o menor costo" se reduce a una sola comparación por
// atributo: el valor de A tiene que ser >= al de B en TODOS, con al menos uno
// estrictamente mayor (si son idénticas, es un empate — nadie domina a
// nadie, no hay tarjeta de sobra). Ejemplo real que motivó esto: "La bolsa
// pesada hasta que duela" (fuerza+4, agilidad-1) domina a "Pesas en serio,
// por primera vez" (fuerza+3, agilidad-1, antes del rebalanceo) — mismo
// costo, menos beneficio, cero motivo para elegir la segunda.
export function domina(cartaA, cartaB, atributos = ATRIBUTOS) {
  let algunaEstricta = false;
  for (const atributo of atributos) {
    const valorA = cartaA.mods?.[atributo] ?? 0;
    const valorB = cartaB.mods?.[atributo] ?? 0;
    if (valorA < valorB) return false;
    if (valorA > valorB) algunaEstricta = true;
  }
  return algunaEstricta;
}

// Primer par (ganadora, perdedora) dentro de un ramillete de cartas ya
// repartidas donde una domina a la otra, o `null` si no hay ninguno. El orden
// de recorrido es siempre el mismo para un mismo array (determinístico), así
// que a igual entrada esto siempre encuentra el mismo par primero.
function primerParDominante(cartas) {
  for (const ganadora of cartas) {
    for (const perdedora of cartas) {
      if (ganadora !== perdedora && domina(ganadora, perdedora)) return { ganadora, perdedora };
    }
  }
  return null;
}

// Reemplazar la carta DOMINADA (nunca la ganadora: perder de la mano una
// legendaria/rara solo porque compartió mesa con la carta equivocada sería
// peor que el problema que se quiere arreglar) por otra del pool elegible que
// no cree un nuevo par dominante con el resto de la mano. Si ninguna
// candidata queda libre de conflicto, se deja el par tal cual —misma
// salvaguarda de siempre: mejor una elección poco interesante que repartir
// menos cartas de las pedidas o dejar el pool en cero.
function sinConflictoCon(candidata, resto) {
  return !resto.some((otra) => domina(candidata, otra) || domina(otra, candidata));
}

// Reemplazo DETERMINISTA (nunca consume `rng`): a igualdad de todo lo demás
// se prefiere una candidata de la MISMA rareza que la perdedora (así la
// distribución 70/25/5 de más arriba no se resiente por esta corrección), y
// entre esas, la primera en el orden del catálogo — estable, sin azar.
//
// Importante por qué esto NO tira de `rng`: `repartirMejoras` corre una vez
// por bloque, DENTRO de la misma secuencia de tiradas que después decide
// rivales/eventos/todo lo demás de la carrera (career.js). Una versión
// anterior de este arreglo elegía el reemplazo con `elegirPorRareza(rng,
// ...)` — funcionaba en aislado, pero cada vez que el sorteo por rareza
// dejaba un par dominante (no es raro: pasa cada vez que toca una
// legendaria/rara junto a la normal que domina), esa tirada EXTRA corría la
// secuencia entera del resto de la carrera para adelante. Un cambio de
// contenido (agregarle un mod a una carta) terminaba cambiando qué rival te
// tocaba tres bloques después — se vio en tests/ui/main-shell.test.js, que
// arma partidas de prueba buscando un beat puntual con una semilla fija: con
// la tirada extra, esa semilla dejaba de llegar al mismo beat. Sin consumir
// `rng`, esta corrección es invisible para el resto de la secuencia: mismo
// resultado en todo lo que no sea la mano de mejora de ESTE bloque.
function elegirReemplazoDeterminista(candidatas, rarezaPerdedora) {
  return candidatas.find((c) => rarezaDe(c) === rarezaPerdedora) ?? candidatas[0];
}

// `conBono` (por defecto, identidad) tiene que ser el MISMO transformador que
// ya se le aplicó a `elegidas` antes de llamar acá: el bonus de etapa
// temprana excluye a propósito a las legendarias ("no aplanes su varianza",
// ver más abajo) — sin aplicárselo también a cada candidata de reemplazo, una
// rara con bonus podía terminar pareciendo mejor en el papel que una
// legendaria SIN bonus y colarse como reemplazo "seguro" que en realidad
// también domina a la carta que se quería proteger.
function sinParesDominantes(elegidas, elegibles, conBono = (c) => c) {
  let actuales = [...elegidas];
  // Tope de intentos generoso pero finito: con a lo sumo 3 cartas por mano
  // nunca hacen falta tantas vueltas, esto solo evita un loop infinito si
  // algún día el catálogo cambia de forma que lo permita.
  for (let vuelta = 0; vuelta < 10; vuelta += 1) {
    const par = primerParDominante(actuales);
    if (!par) break;
    const resto = actuales.filter((c) => c !== par.perdedora);
    const idsEnMano = new Set(actuales.map((c) => c.id));
    const candidatas = elegibles
      .filter((c) => !idsEnMano.has(c.id))
      .map(conBono)
      .filter((c) => sinConflictoCon(c, resto));
    if (candidatas.length === 0) break;
    const reemplazo = elegirReemplazoDeterminista(candidatas, par.perdedora.rareza);
    actuales = actuales.map((c) => (c === par.perdedora ? reemplazo : c));
  }
  return actuales;
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
  const elegiblesBase = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina, estado }));
  const porCondiciones = conSalvaguardaDeCondiciones(elegiblesBase, jugador);
  // Las cartas que el tope se comería enteras salen del sorteo. Con la misma
  // salvaguarda que el resto de los filtros de este archivo: si NINGUNA rinde
  // (un peleador con los cuatro atributos en 99 — existe, y es el final feliz
  // de una carrera muy buena), se vuelve al pool entero en vez de dejar la
  // pantalla sin nada. Para ese caso la píldora de la tarjeta avisa "al tope"
  // (ver efectosDeMods, main.js): la carta ya no miente aunque toque ofrecerla.
  const rinden = porCondiciones.filter((c) => cartaRindeAlgo(jugador, c));
  const elegibles = rinden.length > 0 ? rinden : porCondiciones;

  const bonusEtapa = BONUS_ETAPA_TEMPRANA[etapa] ?? 0;
  // El bono (entrenador de elite y/o etapa temprana) se define ACÁ como una
  // función, para poder aplicárselo tanto a lo sorteado como a cualquier
  // candidata de reemplazo (ver el comentario de `sinParesDominantes`): si se
  // aplicara solo a `sorteadas` y no a los reemplazos, una carta con bono
  // podía colarse como "segura" sin serlo de verdad.
  function conBono(carta) {
    if (bonus.bonusValor === 0 && bonusEtapa === 0) return carta;
    let mods = carta.mods;
    if (bonus.bonusValor > 0) mods = conBonusEnTodos(mods, bonus.bonusValor);
    // El bonus de etapa temprana NUNCA toca una legendaria (pedido explícito
    // y repetido: "no aplanes la varianza de las legendarias").
    if (bonusEtapa > 0 && carta.rareza !== 'legendaria') mods = conBonusEnElMasGrande(mods, bonusEtapa);
    return mods === carta.mods ? carta : { ...carta, mods };
  }

  const sorteadas = sortearPorRareza(rng, elegibles, cantidadBase, pesos).map(conBono);
  // Pedido 3 (v14): que el sorteo por rareza haya dejado dos cartas donde una
  // domina a la otra en la misma mano no es aceptable — se corrige DESPUÉS
  // del sorteo Y del bono (una rara con bono de etapa temprana puede terminar
  // superando en el papel a una legendaria SIN bono, que a propósito queda
  // afuera de ese bono). La distribución 70/25/5 y la compensación legendaria
  // de arriba siguen intactas: esto solo puede reemplazar a la carta
  // perdedora, nunca cambia cuántas ni con qué pesos se sortearon — y no
  // consume ninguna tirada nueva de `rng` (ver el comentario grande de
  // `elegirReemplazoDeterminista`), así que el resto de la secuencia
  // aleatoria de la carrera queda intacto pase o no pase esta corrección.
  return sinParesDominantes(sorteadas, elegibles, conBono);
}

// v13: los mods de una carta van SOLO a los cuatro atributos. Ya no hay
// `especiales` (mentón, disciplina personal) ni estados numéricos (forma,
// moral, fatiga) que repartir — desaparecieron con la simplificación, y un
// mod que apunte a una clave inexistente simplemente no se aplica.
export function aplicarCarta(jugador, carta) {
  const nuevo = {
    ...jugador,
    atributos: { ...jugador.atributos },
    estado: { ...jugador.estado },
  };

  // El talento (v13) multiplica lo que RINDE una mejora: a un peleador que
  // aprende rápido la misma carta le da más. Solo se aplica a los mods
  // POSITIVOS — que el talento te salvara de tus propias malas decisiones
  // sería raro, y encima haría que un crack no pudiera arruinarse nunca.
  const rendimiento = rendimientoDeMejora(jugador, jugador.edad);
  const paraAtributos = {};
  for (const [clave, valor] of Object.entries(carta.mods)) {
    if (!(clave in nuevo.atributos)) continue;
    paraAtributos[clave] = valor > 0 ? Math.max(1, Math.round(valor * rendimiento)) : valor;
  }

  const a = aplicarModificadores(nuevo.atributos, paraAtributos);
  nuevo.atributos = a.resultado;

  return { jugador: nuevo, deltas: a.deltas, texto: formatearMods(a.deltas).join(' · ') };
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
