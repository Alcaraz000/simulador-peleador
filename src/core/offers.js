import { buscarRival } from './world.js';
import {
  mediaDe, recordTexto, apodoParaMostrar, nombreConApodo,
} from './fighter.js';
import { clamp } from './stats.js';
import { OPINIONES_ENTRENADOR, OPINIONES_ENTRENADOR_TITULO } from '../content/coach-opinions.js';
import { campeonDe, rankingsProfesionales, puestoEn } from './divisiones.js';
import { DIVISIONES_PUNTUABLES } from './puntos-ranking.js';

/**
 * En qué puestos divisionales está parado un peleador: `{ regional: 4,
 * nacional: 9 }`, solo las divisiones donde de verdad figura (nunca claves en
 * `null`).
 *
 * Es el dato central del rediseño v18 y se usa para dos cosas: mostrarle al
 * jugador contra quién se está midiendo (ver `rivalPuestos`, más abajo) y
 * decidir para qué cinturón califica (ver `puedeDisputar`).
 */
export function puestosDivisionalesDe(mundo, jugador, id) {
  return puestosEn(rankingsProfesionales(mundo, jugador), id);
}

/**
 * La misma cuenta pero sobre unos rankings YA calculados. `rankingsProfesionales`
 * recorre el roster entero y ordena varias veces, así que quien necesite los
 * puestos de dos peleadores (una oferta necesita los del jugador y los del
 * rival) los saca de una sola foto en vez de armarla dos veces.
 */
function puestosEn(rankings, id) {
  return Object.fromEntries(
    DIVISIONES_PUNTUABLES
      .map((division) => [division, puestoEn(rankings, division, id)])
      .filter(([, puesto]) => puesto !== null),
  );
}

/** Los puestos divisionales del propio jugador. */
export function puestosDelJugador(mundo, jugador) {
  return puestosDivisionalesDe(mundo, jugador, jugador.id);
}

export const NIVELES = {
  local: { id: 'local', nombre: 'Torneo local', nivelPelea: 'amateur', multiplicadorBolsa: 0.4 },
  regional: { id: 'regional', nombre: 'Cartelera regional', nivelPelea: 'profesional', multiplicadorBolsa: 1 },
  // `nivelPelea: 'eliminatoria'` (Pedido 4, barrida de experto en boxeo): antes
  // era 'profesional' a secas, así que se peleaba a 8 rounds — la misma
  // distancia que una regional de trámite. Es la pelea que define el ascenso
  // al puesto de retador: en el boxeo real, un final eliminator se juega a
  // distancia de campeonato, no a la de una cartelera cualquiera (ver
  // roundsPorNivel en disciplines.js, ahora con su propia entrada).
  eliminatoria: { id: 'eliminatoria', nombre: 'Eliminatoria', nivelPelea: 'eliminatoria', multiplicadorBolsa: 1.8 },
  titulo: { id: 'titulo', nombre: 'Pelea de título', nivelPelea: 'titulo', multiplicadorBolsa: 4 },
  defensa: { id: 'defensa', nombre: 'Defensa obligatoria', nivelPelea: 'titulo', multiplicadorBolsa: 3.2 },
};

/**
 * Progresión de cinturones. Se pelea por el siguiente que no tenés,
 * en orden; cada uno exige más ranking y paga más.
 *
 * Pedido 1 (v6, roster de 12 -> 100, "el ranking tiene que ser una
 * montaña"): estos `rankingMax` se calibraron para un roster de 12 (top 8 =
 * 67% de la tabla, top 5 = 42%, top 3 = 25%). Escalarlos a la misma
 * PROPORCIÓN sobre 100 rivales (66/42/25) los habría dejado casi sin filo —
 * calificar para el título regional con solo estar en la mitad de la tabla
 * no se siente como una montaña. En cambio, se ajustaron para que cada
 * escalón siga siendo un salto real de exigencia sobre una categoría de 100:
 * top 20 (un puesto que hay que ganarse con una racha de verdad), top 10, y
 * top 5 para el mundial. Ver el informe de balance (scripts/balance-sim.mjs)
 * para la tasa de "consigue los tres cinturones" medida con estos números.
 */
// v18 — `rankingMax` YA NO ES UN PUESTO GLOBAL. Antes era la posición entre los
// ~180 activos del mundo (top 20 / 10 / 3 de esa lista única). Ahora es el
// puesto DENTRO DE LA DIVISIÓN de ese mismo cinturón, que es una tabla mucho
// más chica: el regional tiene 20 lugares, el nacional 10 y el mundial 30 (ver
// los CUPO_* en divisiones.js). O sea que el número significa otra cosa y hubo
// que recalibrarlo entero — no se puede leer contra los valores viejos.
//
// El criterio es el mismo de siempre: cada escalón tiene que ser un salto real
// de exigencia. Estar en la mitad de arriba de la escalera de tu país habilita
// el regional; ser de los mejores de la elite nacional habilita el nacional; y
// para el mundial hay que ser de los tres mejores del planeta.
export const CINTURONES = [
  { id: 'regional', nombre: 'Cinturón regional', rankingMax: 12, multiplicador: 1, defensasObligatorias: 2 },
  { id: 'nacional', nombre: 'Cinturón nacional', rankingMax: 5, multiplicador: 1.8, defensasObligatorias: 3 },
  // El mundial pide estar entre los diez mejores del planeta, no entre los
  // tres. Con el ranking viejo (un puesto entre los ~180 activos, sacado de una
  // fórmula) el top-3 era alcanzable ganando todo; con puntos que los NPC
  // acumulan a lo largo de carreras enteras, un jugador de ~31 peleas no llega
  // nunca — medido: la tasa de mundial se caía al 4,5% contra el 18-28%
  // pedido. Diez es además el número del boxeo real: se disputa un título
  // mundial siendo contendiente rankeado, no siendo el aspirante número uno.
  { id: 'mundial', nombre: 'Cinturón mundial', rankingMax: 12, multiplicador: 3.5, defensasObligatorias: 4 },
];

// v7 (pedido textual del usuario: "un debutante NO puede pelear por el
// título con 0 peleas"): antes `puedeDisputar` miraba SOLO el ranking (media
// + récord, ver rankingDelJugador en world.js) — como el ranking se calcula
// por MEDIA, un prodigio de origen/apodo legendario podía rankear top-3 con
// 0 peleas profesionales (bonusRecord es 0 sin récord) y saltar derecho a
// disputar un cinturón. Acá se suma un mínimo de peleas PROFESIONALES (las
// que cuentan para `jugador.record` — jugables + trámite; las amateurs NO
// cuentan, van a `recordAmateur`, ver aplicarResultado más abajo) escalonado
// con criterio de boxeo: un regional se gana con un puñado de peleas de
// verdad (más de un año de actividad pro), un nacional pide un historial ya
// construido, y un mundial exige un currículum probado — ni el prodigio con
// más suerte se salta la fila entera.
//
// El mismo mínimo también frena la vieja salida de "eliminatoria" en
// `decidirNivel` (más abajo): antes, un ranking top-6 sin título alcanzaba
// para ofrecer eliminatorias (SIEMPRE jugables, ver esPeleaImportante) sin
// límite mientras el jugador esperaba calificar — con el mínimo de peleas
// ahora exigido ahí también, un prodigio sin currículum vuelve a la
// cartelera regional de trámite hasta cumplirlo.
//
// Números calibrados con `node scripts/balance-sim.mjs 400` para no
// disparar el presupuesto de ~20 minutos de la partida: escalones más altos
// (probado: 8/16/24) empujan a un jugador "jugando bien" a pasar más años
// defendiendo cada cinturón intermedio en vez de coronarlos rápido y
// descansar como campeón indiscutido (permiteMarqueeEsteAnio, tramite.js) —
// cada uno de esos años extra es una defensa JUGABLE de más. Con 8/13/18 el
// promedio de "creación real" queda en ~22 min (antes de este cambio: ~21
// min) y >=99% de peleas profesionales totales dentro de [30,40] — el mismo
// margen que ya tenía la ronda anterior. Con el promedio de 30-40 peleas
// profesionales por carrera completa (ver ETAPAS, career.js), estos mínimos
// dejan margen de sobra para coronar los tres cinturones jugando bien: 3
// cinturones sigue en 100% sobre 400 semillas, y el piso de 85% sobre 3000
// semillas del jugador más débil del proyecto (career.test.js, "progresión
// de cinturones") también se mantiene — ver el informe de balance entregado
// con esta ronda.
// v17.11: mundial 18 -> 28, y los rankingMax de arriba 28/15/7 -> 20/10/3.
// Con el ranking nuevo (donde el récord manda: ver puntajeDe, divisiones.js)
// un jugador que gana todo llega al #1 del mundo con la mitad de la carrera
// por delante, y la tasa de cinturón mundial se disparó de ~23% a 49%. Ajustar
// solo el puesto no alcanzaba (con rankingMax 2 seguía en 33% y el eje de "al
// menos un cinturón" se derrumbaba): lo que faltaba era EXPERIENCIA. Con 28
// peleas profesionales exigidas, el mundial vuelve a ser el techo de una
// carrera larga y no un trámite de mitad de camino.
// v18: mundial 28 -> 21. Los 28 se pusieron en v17.11 para frenar a un jugador
// que llegaba al top del ranking con media carrera por delante — el ranking de
// entonces salía de una fórmula y se trepaba rápido. Ahora el puesto se gana
// peleando contra gente de esa división, que ya es un freno de por sí: con los
// dos a la vez, y un promedio de ~31 peleas profesionales por carrera, el
// jugador recién quedaba habilitado para el mundial en las últimas tres peleas
// y casi nunca le daba el tiempo (medido: 10% contra el 18-28% pedido).
export const PELEAS_MINIMAS_TITULO = { regional: 8, nacional: 13, mundial: 21 };

function peleasProfesionales(jugador) {
  const record = jugador.record ?? { v: 0, d: 0, e: 0 };
  return record.v + record.d + record.e;
}

/** El próximo cinturón que el jugador puede disputar, o null si los tiene todos. */
export function proximoCinturon(jugador) {
  return CINTURONES.find((c) => !jugador.titulos.includes(c.nombre)) ?? null;
}

/** ¿Ya peleó lo suficiente como para que el ranking solo pueda decidir? */
function cumpleMinimoDePeleas(jugador, cinturon) {
  if (!cinturon) return false;
  const minimo = PELEAS_MINIMAS_TITULO[cinturon.id] ?? 0;
  return peleasProfesionales(jugador) >= minimo;
}

/**
 * ¿Puede pelear por ese cinturón? Hace falta puesto Y un mínimo de peleas
 * profesionales.
 *
 * v18 — DE QUÉ RANKING HABLAMOS. Hasta acá esto leía `jugador.ranking`: un
 * único número global, el puesto entre los ~180 activos del mundo calculado con
 * una fórmula sobre media y récord. O sea que el rediseño por puntos cambiaba
 * lo que el jugador VE (las cuatro tablas) pero no lo que decide CUÁNDO pelea
 * por un cinturón, y las dos cosas podían contradecirse: ser #2 del mundial por
 * puntos y no calificar para el mundial, o al revés.
 *
 * Ahora cada cinturón mira SU propia división: el regional pide puesto en la
 * tabla regional, el nacional en la nacional y el mundial en la mundial. Es la
 * misma tabla que el jugador abre en el ranking, y se gana como dice el
 * rediseño — peleando contra gente de esa división.
 *
 * `misPuestos` es `{ regional, nacional, mundial }` con solo las divisiones
 * donde figura (ver puestosDelJugador). Sin puesto en la división del cinturón,
 * no califica: todavía no entró a esa escalera.
 */
export function puedeDisputar(jugador, cinturon, misPuestos = {}) {
  if (!cinturon) return false;
  if (!cumpleMinimoDePeleas(jugador, cinturon)) return false;
  const puesto = misPuestos[cinturon.id];
  return puesto != null && puesto <= cinturon.rankingMax;
}

const BOLSA_BASE = 3000;

// Cuánto infla la bolsa el 'manager' (money.js): promete "bolsas más gordas"
// además de reducir el riesgo de negociación.
const BONUS_MANAGER_BOLSA = 0.12;

export function evaluarRiesgo(jugador, rival) {
  const diferencia = mediaDe(rival) - mediaDe(jugador);
  if (diferencia >= 8) return 'alto';
  if (diferencia <= -8) return 'bajo';
  return 'medio';
}

// --- Opinión del entrenador sobre ESTA pelea puntual (Task v3) -------------
// Pedido textual del usuario: "una frase de tu entrenador (si recomienda, si
// no, si cree que NO se puede ganar, si cree que hay pocas chances...)".
// Pura y determinista (nada de rng: el criterio siempre da lo mismo para los
// mismos números, así el jugador puede aprender a leerlo). Compara tu media
// con la del rival y castiga el puntaje si llegás golpeado — exactamente los
// mismos datos que ya evalúa `evaluarRiesgo`, pero acá se traduce a una
// opinión hablada, no a un chip. v13: forma y fatiga dejaron de existir como
// estados, así que lo único que queda para "llegás golpeado" es la lesión.
function ventajaPercibida(jugador, oferta) {
  const estado = jugador.estado ?? {};
  let ventaja = mediaDe(jugador) - oferta.rivalMedia;
  if (estado.lesion) ventaja -= 15;
  return ventaja;
}

// De más a menos favorable: cada escalón es una categoría de contenido en
// content/coach-opinions.js (OPINIONES_ENTRENADOR). El orden importa para
// los tests de "empeora/mejora" — se recorre de arriba a abajo y gana el
// primer umbral que la ventaja alcanza.
const ESCALONES_OPINION = [
  { min: 18, id: 'muy_confiado' },
  { min: 7, id: 'confiado' },
  { min: -7, id: 'parejo' },
  { min: -18, id: 'cauteloso' },
  { min: -30, id: 'desafio' },
  { min: -Infinity, id: 'no_recomendado' },
];

/** Categoría de opinión ('muy_confiado' ... 'no_recomendado') para esta pelea. */
export function opinionEntrenador(jugador, oferta) {
  const ventaja = ventajaPercibida(jugador, oferta);
  return ESCALONES_OPINION.find((e) => ventaja >= e.min).id;
}

// Hash chico y estable (mismo idioma que `hashTexto` en news.js): elige una
// variante de texto sin rng y sin contador de módulo aparte, así la MISMA
// oferta siempre trae la MISMA frase (en cualquier corrida, o al recargar
// una partida guardada) sin robarle una tirada al hilo de azar de la
// carrera — acá no hay `rng` disponible ni hace falta: la variedad no es una
// decisión de juego, es sabor.
function indiceEstable(texto, modulo) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 100000;
  return h % modulo;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Frase completa del entrenador para esta oferta puntual: elige la
 * categoría (`opinionEntrenador`) y una variante de texto de
 * content/coach-opinions.js, ya con los marcadores rellenos. En una pelea de
 * título usa el pool que además nombra el cinturón en juego, para que la
 * opinión tenga en cuenta lo que está en juego, no solo el matchup.
 */
export function fraseEntrenador(jugador, oferta) {
  const categoria = opinionEntrenador(jugador, oferta);
  const pool = (oferta.esTitulo && OPINIONES_ENTRENADOR_TITULO[categoria]?.length > 0)
    ? OPINIONES_ENTRENADOR_TITULO[categoria]
    : OPINIONES_ENTRENADOR[categoria];
  // Semilla del hash: NUNCA `oferta.id` (sale de un contador global, no del
  // rng inyectado — ver el comentario de "es determinista" en
  // offers.test.js) ni `rivalId` (mismo problema, viene de fighter.js). Con
  // el apodo + la bolsa + lo que está en juego alcanza para variar sin
  // depender de esos contadores.
  // El marcador {rival} se usa siempre SOLO (nunca junto al nombre): con el
  // roster de 100 (Pedido 1) la mayoría de los rivales de relleno no tienen
  // apodo, así que cae al nombre — `rellenar` (más abajo) ya resguarda contra
  // null/undefined con un `?? ''`, pero eso dejaba la frase sin el rival
  // ("...mano a mano con ."), no solo evitaba el "null" literal.
  const mote = oferta.rivalApodo ?? oferta.rivalNombre;
  const indice = indiceEstable(`${mote}|${oferta.bolsa}|${oferta.enJuego}|${categoria}`, pool.length);
  return rellenar(pool[indice], {
    rival: mote,
    bolsa: `US$ ${Math.round(oferta.bolsa).toLocaleString('es-AR')}`,
    enJuego: oferta.enJuego,
  });
}

/** El cinturón más alto que el jugador tiene puesto (el que se defiende). */
export function cinturonActual(jugador) {
  const puestos = CINTURONES.filter((c) => jugador.titulos.includes(c.nombre));
  return puestos.length > 0 ? puestos[puestos.length - 1] : null;
}

// Con cinturón puesto y ranking suficiente para el próximo, la chance de que le
// ofrezcan esa pelea (en vez de una defensa del cinturón actual). Tiene que ser
// alta: un campeón rankeado 1-2 va detrás del título más grande, no se queda
// defendiendo el chico hasta que se le acaba la carrera. Pero no puede ser TAN
// alta que "defender el cinturón" deje de sentirse presente en la carrera: en
// 0.95 casi el 20% de las carreras jugadas de punta a punta no ofrecían ninguna
// defensa obligatoria. Medido sobre 150 semillas (Task 25): en 0.8 sigue
// cumpliendo el >=90% de "consigue los tres cinturones" jugando perfecto, y
// baja el "cero defensas en toda la carrera" a ~8% jugando de forma realista.
const PROB_ASCENSO_PRIORITARIO = 0.8;

// Hasta qué puesto de la división del PRÓXIMO cinturón se ofrecen
// eliminatorias (v18). Antes era `ranking <= 6` sobre la tabla global de ~180;
// ahora es el puesto dentro de esa división puntual, que es mucho más chica
// (20 / 10 / 30 lugares), así que el número tiene otro significado: es "estar
// en la mitad de arriba de la fila de retadores".
const PUESTO_MAXIMO_ELIMINATORIA = 6;

// Qué proporción de las peleas del jugador son contra compatriotas (v18), según
// qué cinturón está buscando.
//
// Mientras va por el regional o el nacional pelea casi siempre de local: esas
// dos son escaleras de SU país y solo se sube en ellas contra compatriotas (ver
// `buscarRival`, world.js). Una vez que va por el mundial, la cartelera se le
// da vuelta — el mundial es una tabla que cruza países, así que ahí lo que
// suma es cruzar la frontera. Es el arco de cualquier boxeador: te hacés en el
// circuito de casa y después salís a buscar al mundo.
//
// Sin esta segunda mitad el jugador se quedaba encerrado en su país: medido con
// 0,75 fijo, "al menos un cinturón" volvía a su rango pero la tasa de mundial
// se desplomaba a 5% (contra el 18-28% pedido), porque casi nunca enfrentaba a
// nadie de la tabla mundial y no podía juntar puntos ahí.
const FRACCION_RIVAL_LOCAL = { regional: 0.85, nacional: 0.8, mundial: 0.25 };
const FRACCION_RIVAL_LOCAL_SIN_META = 0.5;

function decidirNivel({
  jugador, etapa, forzarTitulo, rng, soloRegional, misPuestos = {},
}) {
  if (etapa === 'juvenil' || etapa === 'amateur') {
    return { nivel: NIVELES.local, cinturon: null };
  }

  // Peleas de "trámite" (v6, ver esPeleaImportante más abajo y el criterio
  // documentado en career.js): un cupo de pelea que se resuelve solo, sin
  // pasar por careo/campamento. Nunca puede ser de título/defensa/eliminatoria
  // — esas SIEMPRE se juegan completas — así que se corta acá, antes de
  // cualquier otra consideración de ranking/cinturón.
  if (soloRegional) return { nivel: NIVELES.regional, cinturon: null };

  const puesto = cinturonActual(jugador);
  const proximo = proximoCinturon(jugador);

  if (puesto) {
    // Si ya califica por ranking para el próximo escalón, escalar le gana a
    // estancarse: la mayoría de las veces le ofrecen ir por el título grande,
    // y solo a veces le cae la defensa del que ya tiene.
    if (proximo && puedeDisputar(jugador, proximo, misPuestos)) {
      if (rng.chance(PROB_ASCENSO_PRIORITARIO)) {
        return { nivel: NIVELES.titulo, cinturon: proximo };
      }
      return { nivel: NIVELES.defensa, cinturon: puesto };
    }
    // Todavía no califica para el siguiente: sigue defendiendo el que tiene.
    if (rng.chance(0.55)) {
      return { nivel: NIVELES.defensa, cinturon: puesto };
    }
  }

  // Sin cinturón puesto (o sin defensa/ascenso este turno): pelea por el próximo
  // si está rankeado lo suficiente. `forzarTitulo` (career.js: ranking top-3,
  // sin título todavía) solo se salta la CHANCE probabilística de más abajo,
  // nunca el mínimo de peleas — un prodigio con ranking altísimo pero 0
  // peleas profesionales no puede saltar la fila (ver PELEAS_MINIMAS_TITULO,
  // arriba), por más que su ranking ya alcance.
  if (proximo && cumpleMinimoDePeleas(jugador, proximo)
    && (forzarTitulo || puedeDisputar(jugador, proximo, misPuestos))) {
    return { nivel: NIVELES.titulo, cinturon: proximo };
  }

  if (etapa === 'veterano') return { nivel: NIVELES.eliminatoria, cinturon: null };
  // v7: una eliminatoria es "la pelea que define el ascenso al puesto de
  // retador" — sin sentido para alguien que ni siquiera tiene el mínimo de
  // peleas para disputar ese título todavía (ver PELEAS_MINIMAS_TITULO,
  // arriba). Sin este freno, un prodigio rankeado top-6 pero con pocas
  // peleas quedaba atrapado ofreciéndole eliminatoria tras eliminatoria
  // (SIEMPRE jugable, ver esPeleaImportante) mientras esperaba cumplir el
  // mínimo — medido con scripts/balance-sim.mjs: reventaba el presupuesto de
  // ~20 minutos (peleas jugables/carrera subía de ~6 a ~8-9) sin sumarle
  // nada al eje de cinturones, que ya lo esperaba de todos modos. `!proximo`
  // (ya tiene los tres cinturones) preserva el comportamiento de siempre: no
  // hay "próximo mínimo" contra el cual medir.
  //
  // v18: "estar cerca" ya no es un puesto global sino el puesto EN LA DIVISIÓN
  // del cinturón que se está buscando — que es contra la que se va a medir para
  // disputarlo (ver puedeDisputar). Entrar a esa tabla es lo que te pone en la
  // fila de retadores; una eliminatoria es la pelea que define quién de esa
  // fila va primero.
  const puestoEnSuDivision = proximo ? misPuestos[proximo.id] : null;
  const calificaParaEliminatoria = (puestoEnSuDivision ?? 99) <= PUESTO_MAXIMO_ELIMINATORIA
    && (!proximo || cumpleMinimoDePeleas(jugador, proximo));
  return { nivel: calificaParaEliminatoria ? NIVELES.eliminatoria : NIVELES.regional, cinturon: null };
}

let contadorOferta = 0;

export function generarOferta(rng, {
  jugador, mundo, etapa, rivalidades = [], forzarTitulo = false,
  // v6 ("las peleas de trámite se resuelven solas"): un cupo forzado a
  // NIVELES.regional, sin título/defensa/eliminatoria posible — ver
  // decidirNivel. Lo usa career.js para los intentos de pelea "de más" del
  // año, más allá del primero (el único que puede ser una pelea que
  // importa).
  soloRegional = false,
  // Rivales a excluir además del propio jugador y el último rival peleado
  // (más abajo): career.js lo usa para que, dentro del MISMO bloque, dos
  // cupos de pelea distintos nunca terminen ofreciendo al mismo rival.
  excluirIdsExtra = [],
}) {
  // Los rankings se arman UNA sola vez por oferta: de esa misma foto salen los
  // puestos del jugador (que deciden para qué cinturón califica, ver
  // decidirNivel) y los del rival (que se le muestran en la pantalla).
  const rankings = rankingsProfesionales(mundo, jugador);
  const misPuestos = puestosEn(rankings, jugador.id);
  const {
    nivel, cinturon,
  } = decidirNivel({
    jugador, etapa, forzarTitulo, rng, soloRegional, misPuestos,
  });

  // Pedido 3 (v6, "nada de revancha inmediata después de una pelea. Que pase
  // tiempo"): el último rival que de verdad peleó (jugador.historial, el
  // registro que arma aplicarResultado) queda excluido de ESTA oferta — la
  // primera que se arma después de esa pelea. Una vez que el jugador firma y
  // resuelve OTRA pelea, el historial avanza y este mismo rival vuelve a
  // quedar disponible (incluida la revancha que rivalidades.js narra más
  // adelante): el cierre es "no inmediata", no "nunca más".
  const ultimoRivalId = jugador.historial?.length > 0
    ? jugador.historial[jugador.historial.length - 1].rivalId
    : null;

  const archirrival = rivalidades.find((r) => r.esArchirrival);
  const archirrivalEsElUltimo = archirrival?.rivalId === ultimoRivalId;
  // v6 (peleas de trámite/importantes, tramite.js y esPeleaImportante): el
  // matchmaking "duro" de acá abajo (cerca de la cima del ranking, sesgo
  // histórico del proyecto de cuando el roster tenía 12 rivales) solo tiene
  // sentido cuando de verdad hay algo en juego — título, defensa,
  // eliminatoria. Para un nivel 'regional' (sea porque es trámite forzado, o
  // porque el jugador todavía no calificó para nada más), el manager arma
  // una cartelera SEGURA — el objetivo de ranking se corre hacia rivales
  // IGUALES o PEOR rankeados, mismo criterio que un promotor de verdad
  // "construyendo" un récord. Sin este ajuste, TODA oferta (incluida la
  // regional más chica) se sesgaba hacia la cima, así que `riesgo === 'alto'`
  // (uno de los criterios de esPeleaImportante) salía casi siempre —
  // volviendo "jugable" casi cualquier año de la carrera, no solo los que de
  // verdad definen el ascenso — y de paso el lote de trámite perdía de forma
  // sistemática combates que el jugador ni siquiera podía elegir jugar,
  // hundiendo el eje de cinturones incluso jugando perfecto (medido: 3
  // cinturones caía a ~30%, luego a 0% mientras se depuraba esta misma
  // medición).
  // Cuánto de local es la cartelera hoy: depende del cinturón que está
  // buscando (ver FRACCION_RIVAL_LOCAL, arriba). Con los tres ya puestos no
  // queda meta, y el reparto se vuelve mitad y mitad.
  const metaActual = proximoCinturon(jugador);
  const fraccionLocal = metaActual
    ? FRACCION_RIVAL_LOCAL[metaActual.id] ?? FRACCION_RIVAL_LOCAL_SIN_META
    : FRACCION_RIVAL_LOCAL_SIN_META;
  const disputaAlgoGrande = nivel.id === 'titulo' || nivel.id === 'defensa' || nivel.id === 'eliminatoria';
  const rankingObjetivo = disputaAlgoGrande
    ? clamp((jugador.ranking ?? 10) - rng.int(0, 3), 1, 12)
    : clamp((jugador.ranking ?? Math.round(mundo.roster.length / 2)) + rng.int(0, 6), 1, mundo.roster.length);
  // Una pelea POR un cinturón se pelea contra QUIEN LO TIENE PUESTO. Antes el
  // rival de un título salía del mismo matchmaking que cualquier otra pelea
  // (alguien bien rankeado), así que se podía "disputar el mundial" contra un
  // peleador que nunca lo había ganado — el bug que reportó el usuario. El
  // campeón vive en `mundo.campeones` (divisiones.js) y cambia solo peleando.
  //
  // Si el campeón no está disponible (se retiró, o es el propio jugador que ya
  // lo tiene puesto), se cae al matchmaking de siempre: mejor una pelea que
  // una oferta rota.
  const campeonDelCinturon = nivel.id === 'titulo' && cinturon
    ? (mundo.roster ?? []).find((p) => (
      p.id === campeonDe(mundo, cinturon.id) && !p.retirado && p.id !== jugador.id
    ))
    : null;

  // v18: la carrera se construye en el circuito de casa. Regional y nacional
  // son escaleras de UN país (ver divisiones.js), así que pelear contra
  // extranjeros no mueve ninguna de las dos — y sin peleas locales el jugador
  // no podía entrar a las tablas que le habilitan los cinturones. Es además lo
  // que hace el boxeo de verdad: se sube por el ranking de tu país y recién
  // arriba se cruza la frontera. El resto de las veces sale una internacional,
  // que mueve el mundial (donde sí conviven todos) y le da variedad a la
  // cartelera. Una pelea POR un cinturón se salta esto por completo: se pelea
  // contra quien lo tiene puesto, sea de donde sea (`campeonDelCinturon`).
  const rival = campeonDelCinturon ?? (archirrival && !archirrivalEsElUltimo && !soloRegional && !excluirIdsExtra.includes(archirrival.rivalId) && rng.chance(0.3)
    ? mundo.roster.find((p) => p.id === archirrival.rivalId && !p.retirado)
    : null) ?? buscarRival(mundo, {
    excluirIds: [jugador.id, ultimoRivalId, ...excluirIdsExtra].filter(Boolean),
    rankingCerca: rankingObjetivo,
    soloNacionalidad: rng.chance(fraccionLocal) ? jugador.nacionalidad : null,
  });

  if (!rival) return null;

  const riesgo = evaluarRiesgo(jugador, rival);
  const multiplicadorCinturon = cinturon ? cinturon.multiplicador : 1;
  const bolsaBase = Math.round(
    BOLSA_BASE * nivel.multiplicadorBolsa * multiplicadorCinturon
    * (1 + (jugador.titulos?.length ?? 0) * 0.35) * (1 + mediaDe(rival) / 120) * rng.float(0.9, 1.15),
  );
  // El manager (money.js) promete "bolsas más gordas" además de bajar el
  // riesgo de negociación (ver REDUCCION_MANAGER en negotiation.js).
  const bolsa = (jugador.staff ?? []).includes('manager')
    ? Math.round(bolsaBase * (1 + BONUS_MANAGER_BOLSA))
    : bolsaBase;

  const cruce = rivalidades.find((r) => r.rivalId === rival.id);
  const esRevancha = Boolean(cruce && (cruce.h2h.v + cruce.h2h.d + cruce.h2h.e) > 0);
  const esTitulo = nivel.id === 'titulo' || nivel.id === 'defensa';
  const enJuego = esTitulo
    ? cinturon.nombre
    : nivel.id === 'eliminatoria' ? 'Puesto de retador' : 'Subís al ranking si ganás';

  // Con el roster de 100 (Pedido 1), la mayoría de los rivales de relleno no
  // tienen apodo (null, pool de solo 16 nombres): `mote` se usa SOLO (nunca
  // "null" en pantalla) y `nombreConApodo` arma el combo "Apodo" Nombre sin
  // duplicar el nombre cuando no hay apodo.
  const mote = apodoParaMostrar(rival);
  contadorOferta += 1;
  const gancho = nivel.id === 'defensa'
    ? `Defensa obligatoria del ${cinturon.nombre.toLowerCase()}. ${mote} es el retador oficial.`
    : nivel.id === 'titulo'
      ? `Es por el ${cinturon.nombre.toLowerCase()}. ${mote} lo tiene puesto${campeonDelCinturon ? ' y no lo piensa soltar' : ''}.`
      : esRevancha
        ? `${mote} quiere la revancha. Vos sabés lo que pasó la última vez.`
        : rival.esParodia
          ? `${rival.nombre} te nombró en una entrevista. El teléfono no para.`
          : `${nombreConApodo(rival)} te quiere cruzar.`;

  const oferta = {
    id: `of_${contadorOferta}`,
    rivalId: rival.id,
    rivalNombre: rival.nombre,
    rivalApodo: rival.apodo,
    rivalMedia: mediaDe(rival),
    rivalRecord: recordTexto(rival),
    rivalEstilo: rival.estilo,
    rivalPersonalidad: rival.personalidad,
    // Puesto del rival en el ranking (Task v3, pedido textual): junto a su
    // nombre en la oferta, para que el jugador no tenga que ir a buscarlo a
    // la tabla de posiciones (ver world.js: crearRoster ya lo asigna).
    rivalRanking: rival.ranking ?? null,
    // v18: los puestos DIVISIONALES del rival — `{ regional: 4, nacional: 9 }`,
    // solo las divisiones donde de verdad está. `rivalRanking` (arriba) es el
    // índice global del roster ordenado por media: un número que no corresponde
    // a ninguna de las cuatro tablas que el jugador puede abrir, así que verlo
    // en la oferta no le decía nada. Estos sí son los puestos que va a
    // encontrar si abre el ranking — y son los que deciden cuántos puntos vale
    // la pelea (ver puntos-ranking.js), que es justo lo que hace que elegir
    // rival sea una decisión y no un trámite.
    rivalPuestos: puestosEn(rankings, rival.id),
    // Los puestos del propio jugador en el momento de la oferta: sirven para
    // que la pantalla pueda contrastar "él está #3, vos #11" sin recalcular
    // nada, y son los mismos que decidieron el nivel de esta pelea.
    misPuestos,
    nivel: nivel.id,
    nivelPelea: nivel.nivelPelea,
    bolsa,
    riesgo,
    enJuego,
    esTitulo,
    esObligatoria: nivel.id === 'defensa',
    esRevancha,
    // v6 ("las peleas que importan se juegan completas: [...] tu archirrival"):
    // true cuando el rival de ESTA oferta es el archirrival vigente — no
    // solo cuando se lo buscó a propósito (el matchmaking normal también
    // puede cruzarlo). Lo usa `esPeleaImportante` (más abajo).
    esArchirrival: Boolean(archirrival && archirrival.rivalId === rival.id),
    cinturonId: cinturon ? cinturon.id : null,
    // Solo tiene sentido en una defensa: cuántas defensas exitosas hacen falta
    // para consolidarse en ese cinturón (ver CINTURONES). Se usa para mostrarle
    // al jugador su progreso ("defensa 2 de 3") antes de la pelea.
    defensasObligatorias: nivel.id === 'defensa' ? cinturon.defensasObligatorias : null,
    // Bloque 6 ("no toda defensa es un evento"): true cuando esta defensa es
    // la PRIMERA del reinado actual de este cinturón (jugador.defensasCinturon
    // todavía en 0 o sin entrada — se resetea a 0 cada vez que se conquista el
    // cinturón, ver aplicarResultado más abajo). Es la única defensa que
    // `esPeleaImportante` trata como grande por sí sola; las siguientes son
    // rutina — ver el comentario grande ahí.
    esPrimeraDefensa: nivel.id === 'defensa' && (jugador.defensasCinturon?.[cinturon.id] ?? 0) === 0,
    textoGancho: gancho,
  };

  // La opinión del entrenador (Task v3) se calcula sobre la oferta YA armada
  // (necesita id/rivalApodo/bolsa/enJuego/esTitulo) y se hornea acá mismo,
  // igual que `textoGancho`: no consume rng (ver el comentario en
  // `indiceEstable`), así que no mueve la secuencia de azar de la carrera.
  oferta.opinionEntrenador = opinionEntrenador(jugador, oferta);
  oferta.fraseEntrenador = fraseEntrenador(jugador, oferta);

  return oferta;
}

// El criterio central del rediseño de ritmo v6 ("no todas las peleas se
// juegan igual"): decide si ESTA oferta merece la crónica completa (careo,
// campamento, pelea round a round) o si es una de trámite que se resuelve
// sola (ver armarLotePeleas/resumenLote en tramite.js).
//
// Bloque 6 (spec v13, "la partida dura 44,6 minutos, el objetivo es 27-30"):
// la causa medida era que un campeón pelea una vez al año, pero ANTES de
// este cambio "esTitulo" cubría TANTO disputar un cinturón COMO defenderlo
// — así que, jugando bien, casi todas las peleas de la segunda mitad de la
// carrera (10-13 años como campeón) se jugaban COMPLETAS (careo + campamento
// + ronda a ronda + rincón + golpe de gracia), aunque fueran la quinta o
// sexta defensa del mismo cinturón contra un retador cualquiera. Eso llevó
// las peleas jugables de ~6 a ~11,9 por carrera y la partida a 44,6 minutos.
//
// La regla de diseño "al que le va bien no puede tocarle jugar menos" NO
// pide que cada defensa sea un evento — pide que el campeón siga teniendo SU
// pelea del año, visible y jugada, nunca resuelta en silencio. Se separan
// dos niveles:
//   - GRANDE (se juega completa): conquistar un cinturón nuevo (incluida la
//     "unificación" de ir por el próximo escalón mientras tenés el actual
//     puesto), la PRIMERA defensa de un reinado (`esPrimeraDefensa`, arriba:
//     ese primer desafío después de coronarte SÍ es un evento), una
//     revancha, el archirrival, o la eliminatoria que define el ascenso.
//   - RUTINA (se juega con el minijuego, nunca en silencio): la segunda
//     defensa en adelante del mismo cinturón contra un retador sin historia
//     — `armarLotePeleas` (tramite.js) la fuerza SIEMPRE al camino
//     "destacado" (tarjeta + piedra-papel-tijera de 3-5 rondas), nunca a la
//     resolución muda de `resolverResultadoRapido` ni al ~10% al azar que
//     rige el resto del trámite — ver el comentario grande ahí.
//
// Se descartó a propósito un criterio más viejo ("riesgo alto": rival
// claramente mejor) — medido con scripts/balance-sim.mjs, disparaba en CASI
// CUALQUIER matchup temprano y volvía "jugable" la mitad de los años de la
// carrera sin sumar nada al eje de cinturones.
export function esPeleaImportante(oferta) {
  const esTituloNuevo = oferta.nivel === 'titulo';
  const esDefensaGrande = oferta.nivel === 'defensa' && oferta.esPrimeraDefensa;
  return Boolean(
    esTituloNuevo || esDefensaGrande || oferta.esRevancha || oferta.esArchirrival || oferta.nivel === 'eliminatoria',
  );
}

function clonarJugador(jugador) {
  return {
    ...jugador,
    record: { ...jugador.record },
    recordAmateur: { ...(jugador.recordAmateur ?? { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 }) },
    estado: { ...jugador.estado },
    titulos: [...jugador.titulos],
    historial: [...jugador.historial],
    historialAmateur: [...(jugador.historialAmateur ?? [])],
  };
}

// v13: rechazar costaba fama, que ya no existe. El costo real es el que
// siempre estuvo: la pelea que no diste no suma récord ni ranking, y una
// obligatoria rechazada te puede costar el cinturón (lo maneja la comisión,
// más arriba). No hace falta un número aparte para castigarlo.
export function rechazarOferta(jugador, oferta) {
  const nuevo = clonarJugador(jugador);
  const texto = oferta.esObligatoria
    ? `Rechazaste una defensa obligatoria. La comisión te la va a hacer pagar.`
    : `Le dijiste que no a ${oferta.rivalApodo}. Algunos dicen que le escapaste.`;
  return { jugador: nuevo, texto };
}

// `semanaGlobal` (el reloj de la partida, ver calendario.js) llega opcional
// para no romper a los llamadores que todavía no lo pasan (scripts/
// balance-sim.mjs, algunos tests): sin él, el hito queda con `fecha: null`
// en vez de reventar. `main.js` sí lo manda siempre (partida.semanaGlobal en
// el momento en que se cierra la pelea), que es el dato que necesita
// legacy.js para mostrar cuándo se ganó/defendió cada título (Task v3,
// pedido textual del usuario) — se guarda ACÁ, en el momento del hito, en
// vez de reconstruirlo después con datos que ya no están disponibles.
// v6 ("las peleas amateur no cuentan ni en el ranking ni en el historial"):
// `oferta.nivelPelea === 'amateur'` (NIVELES.local, la única que decidirNivel
// ofrece en juvenil/amateur) manda el resultado a los acumuladores AMATEUR
// (recordAmateur/historialAmateur) en vez de a los profesionales — así el
// récord que lee el ranking/ficha/legado arranca en 0-0 el día del debut,
// sin importar cuántas peleas de formación hubo antes.
//
// `modo` (v6, "medí los beats que el jugador realmente resuelve con el
// mando"): 'jugada' (default, una crónica completa: careo + campamento +
// pelea) o 'tramite' (career.js, resolverPeleaTramite — se resolvió sola, en
// lote). Se guarda en el historial para que las estadísticas de fin de
// carrera puedan distinguir cuántas de las peleas del récord el jugador
// jugó de verdad con el mando.
export function aplicarResultado(jugador, {
  oferta, resultado, semanaGlobal = null, modo = 'jugada',
}) {
  const nuevo = clonarJugador(jugador);
  const titulosGanados = [];
  const gano = resultado.ganador === 'jugador';
  const empate = resultado.ganador === 'empate';
  const esAmateur = oferta.nivelPelea === 'amateur';
  const record = esAmateur ? nuevo.recordAmateur : nuevo.record;

  if (gano) {
    record.v += 1;
    if (resultado.metodo === 'ko' || resultado.metodo === 'tko') record.ko += 1;
    else if (resultado.metodo === 'sumision') record.sub += 1;
    else record.dec += 1;
  } else if (empate) {
    record.e += 1;
  } else {
    record.d += 1;
  }

  nuevo.dinero += oferta.bolsa;

  // v13: acá se movía la moral tras cada pelea. La moral dejó de existir
  // como estado — el impacto de ganar o perder se siente en el ranking, en
  // las ofertas que llegan y en el castigo acumulado que adelanta el declive
  // (career.js), no en un número aparte.

  if (!esAmateur && oferta.esTitulo) {
    if (gano) {
      if (oferta.esObligatoria) {
        nuevo.defensas += 1;
        if (oferta.cinturonId) {
          nuevo.defensasCinturon = {
            ...nuevo.defensasCinturon,
            [oferta.cinturonId]: (nuevo.defensasCinturon?.[oferta.cinturonId] ?? 0) + 1,
          };
        }
      } else if (!nuevo.titulos.includes(oferta.enJuego)) {
        nuevo.titulos.push(oferta.enJuego);
        titulosGanados.push(oferta.enJuego);
        // Arranca un reinado nuevo de ese cinturón: el contador de defensas
        // de ESTE cinturón se resetea (aunque `defensas`, el total de toda
        // la carrera, sigue acumulando).
        if (oferta.cinturonId) {
          nuevo.defensasCinturon = { ...nuevo.defensasCinturon, [oferta.cinturonId]: 0 };
        }
      }
    } else if (!empate) {
      nuevo.titulos = nuevo.titulos.filter((t) => t !== oferta.enJuego);
    }
  }

  const historial = esAmateur ? nuevo.historialAmateur : nuevo.historial;
  historial.push({
    rivalId: oferta.rivalId,
    rivalNombre: oferta.rivalNombre,
    rivalApodo: oferta.rivalApodo,
    rivalMedia: oferta.rivalMedia,
    resultado: gano ? 'v' : empate ? 'e' : 'd',
    metodo: resultado.metodo,
    round: resultado.round,
    bolsa: oferta.bolsa,
    enJuego: oferta.enJuego,
    esTitulo: oferta.esTitulo,
    // Distingue "conquistó el título" de "lo defendió" (ambos son
    // esTitulo+resultado:'v'): legacy.js lo necesita para no ponerles a los
    // dos la misma frase de "se quedó con el cinturón" (ver el comentario
    // de la causa real en legacy.js).
    esObligatoria: oferta.esObligatoria ?? false,
    fecha: semanaGlobal,
    modo,
  });

  const texto = gano
    ? `Le ganaste a ${oferta.rivalApodo} por ${resultado.metodo.toUpperCase()}.`
    : empate
      ? `Empataste con ${oferta.rivalApodo}. Nadie quedó conforme.`
      : `${oferta.rivalApodo} te ganó por ${resultado.metodo.toUpperCase()}.`;

  return { jugador: nuevo, titulosGanados, texto };
}
