import { buscarRival } from './world.js';
import {
  mediaDe, recordTexto, apodoParaMostrar, nombreConApodo,
} from './fighter.js';
import { clamp } from './stats.js';
import { OPINIONES_ENTRENADOR, OPINIONES_ENTRENADOR_TITULO } from '../content/coach-opinions.js';

export const NIVELES = {
  local: { id: 'local', nombre: 'Torneo local', nivelPelea: 'amateur', multiplicadorBolsa: 0.4, famaBase: 2 },
  regional: { id: 'regional', nombre: 'Cartelera regional', nivelPelea: 'profesional', multiplicadorBolsa: 1, famaBase: 4 },
  // `nivelPelea: 'eliminatoria'` (Pedido 4, barrida de experto en boxeo): antes
  // era 'profesional' a secas, así que se peleaba a 8 rounds — la misma
  // distancia que una regional de trámite. Es la pelea que define el ascenso
  // al puesto de retador: en el boxeo real, un final eliminator se juega a
  // distancia de campeonato, no a la de una cartelera cualquiera (ver
  // roundsPorNivel en disciplines.js, ahora con su propia entrada).
  eliminatoria: { id: 'eliminatoria', nombre: 'Eliminatoria', nivelPelea: 'eliminatoria', multiplicadorBolsa: 1.8, famaBase: 7 },
  titulo: { id: 'titulo', nombre: 'Pelea de título', nivelPelea: 'titulo', multiplicadorBolsa: 4, famaBase: 15 },
  defensa: { id: 'defensa', nombre: 'Defensa obligatoria', nivelPelea: 'titulo', multiplicadorBolsa: 3.2, famaBase: 10 },
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
export const CINTURONES = [
  { id: 'regional', nombre: 'Cinturón regional', rankingMax: 28, multiplicador: 1, famaExtra: 8, defensasObligatorias: 2 },
  { id: 'nacional', nombre: 'Cinturón nacional', rankingMax: 15, multiplicador: 1.8, famaExtra: 14, defensasObligatorias: 3 },
  { id: 'mundial', nombre: 'Cinturón mundial', rankingMax: 7, multiplicador: 3.5, famaExtra: 25, defensasObligatorias: 4 },
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
export const PELEAS_MINIMAS_TITULO = { regional: 8, nacional: 13, mundial: 18 };

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

/** ¿Puede pelear por ese cinturón? Hace falta ranking Y un mínimo de peleas profesionales. */
export function puedeDisputar(jugador, cinturon) {
  if (!cinturon) return false;
  if (!cumpleMinimoDePeleas(jugador, cinturon)) return false;
  return (jugador.ranking ?? 99) <= cinturon.rankingMax;
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
// con la del rival y castiga el puntaje si llegás golpeado (forma baja,
// fatiga alta, lesión) — exactamente los mismos datos que ya evalúa
// `evaluarRiesgo`, pero acá se traduce a una opinión hablada, no a un chip.
function ventajaPercibida(jugador, oferta) {
  const estado = jugador.estado ?? {};
  let ventaja = mediaDe(jugador) - oferta.rivalMedia;
  if ((estado.forma ?? 60) < 40) ventaja -= 8;
  if ((estado.fatiga ?? 0) > 60) ventaja -= 8;
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

function decidirNivel({
  jugador, etapa, forzarTitulo, rng, soloRegional,
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
    if (proximo && puedeDisputar(jugador, proximo)) {
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
  if (proximo && cumpleMinimoDePeleas(jugador, proximo) && (forzarTitulo || puedeDisputar(jugador, proximo))) {
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
  const calificaParaEliminatoria = (jugador.ranking ?? 99) <= 6
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
  const {
    nivel, cinturon,
  } = decidirNivel({
    jugador, etapa, forzarTitulo, rng, soloRegional,
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
  const disputaAlgoGrande = nivel.id === 'titulo' || nivel.id === 'defensa' || nivel.id === 'eliminatoria';
  const rankingObjetivo = disputaAlgoGrande
    ? clamp((jugador.ranking ?? 10) - rng.int(0, 3), 1, 12)
    : clamp((jugador.ranking ?? Math.round(mundo.roster.length / 2)) + rng.int(0, 6), 1, mundo.roster.length);
  const rival = (archirrival && !archirrivalEsElUltimo && !soloRegional && !excluirIdsExtra.includes(archirrival.rivalId) && rng.chance(0.3)
    ? mundo.roster.find((p) => p.id === archirrival.rivalId && !p.retirado)
    : null) ?? buscarRival(mundo, {
    excluirIds: [jugador.id, ultimoRivalId, ...excluirIdsExtra].filter(Boolean),
    rankingCerca: rankingObjetivo,
  });

  if (!rival) return null;

  const riesgo = evaluarRiesgo(jugador, rival);
  const multiplicadorCinturon = cinturon ? cinturon.multiplicador : 1;
  const bolsaBase = Math.round(
    BOLSA_BASE * nivel.multiplicadorBolsa * multiplicadorCinturon
    * (1 + jugador.fama / 60) * (1 + mediaDe(rival) / 120) * rng.float(0.9, 1.15),
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
      ? `Es por el ${cinturon.nombre.toLowerCase()}. ${mote} tiene lo que querés.`
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
    famaBase: nivel.famaBase + (cinturon ? cinturon.famaExtra : 0),
    // Solo tiene sentido en una defensa: cuántas defensas exitosas hacen falta
    // para consolidarse en ese cinturón (ver CINTURONES). Se usa para mostrarle
    // al jugador su progreso ("defensa 2 de 3") antes de la pelea.
    defensasObligatorias: nivel.id === 'defensa' ? cinturon.defensasObligatorias : null,
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
// sola (ver armarLotePeleas/resumenLote en tramite.js). Cuatro condiciones,
// CUALQUIERA alcanza:
//   - esTitulo: cubre tanto disputar un cinturón como defenderlo — lo más
//     grande que le puede pasar a una carrera.
//   - esRevancha: ya se cruzaron antes; hay una historia en juego, no un
//     desconocido más.
//   - esArchirrival: el rival de tu vida, aunque esta pelea puntual no
//     tenga cinturón en juego.
//   - nivel === 'eliminatoria': la pelea que define el ascenso — ganarla es
//     lo que te pone en carrera por el título (ver decidirNivel: solo se
//     ofrece con ranking top-6, o forzada en la etiqueta de sabor
//     "veterano", ver tagContenido en career.js).
//
// Se descartó a propósito un quinto criterio ("riesgo alto": rival
// claramente mejor) que estuvo en un borrador de esta misma ronda — medido
// con scripts/balance-sim.mjs, disparaba en CASI CUALQUIER matchup temprano
// (el matchmaking normal ya sesga hacia arriba, ver rankingObjetivo más
// abajo) y volvía "jugable" la mitad de los años de la carrera, reventando
// el presupuesto de ~20 minutos sin sumar nada al eje de cinturones (una
// pelea de trámite ganada suma exactamente lo mismo al récord). Los cuatro
// criterios que quedan son, literalmente, los que pidió el brief: "peleas de
// título, defensas, tu archirrival, revanchas, y las que definen tu
// ascenso" — ni más ni menos.
//
// Todo lo que NO cumple ninguna de estas cuatro es "trámite": un combate
// regional, parejo o cómodo, que no cambia la historia de la carrera — se
// resuelve solo, en lote, con sabor (ver resumenLote, tramite.js).
export function esPeleaImportante(oferta) {
  return Boolean(
    oferta.esTitulo || oferta.esRevancha || oferta.esArchirrival || oferta.nivel === 'eliminatoria',
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

export function rechazarOferta(jugador, oferta) {
  const nuevo = clonarJugador(jugador);
  const costo = oferta.esObligatoria ? 12 : 4;
  nuevo.fama = clamp(nuevo.fama - costo, 0, 100);
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

  const famaDelta = gano ? oferta.famaBase : empate ? Math.round(oferta.famaBase / 3) : -Math.round(oferta.famaBase / 2);
  nuevo.fama = clamp(nuevo.fama + famaDelta, 0, 100);
  // El psicólogo deportivo (money.js) promete que "la mala racha te dura
  // menos": amortigua el golpe de moral de una derrota (no toca el envión de
  // ganar ni el empate).
  const tienePsicologo = (jugador.staff ?? []).includes('psicologo');
  const golpeDerrota = tienePsicologo ? -6 : -12;
  nuevo.estado.moral = clamp(nuevo.estado.moral + (gano ? 10 : empate ? 0 : golpeDerrota), 0, 100);

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
