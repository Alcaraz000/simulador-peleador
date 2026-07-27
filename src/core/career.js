import { createRng } from './rng.js';
import { crearMundo, avanzarMundo, rankingDelJugador, ANIO_INICIAL } from './world.js';
import { EDAD_INICIAL } from './fighter.js';
import { repartirMejoras, recordarCarta } from './cards.js';
import { elegirEvento, elegirCartaRedes } from './events.js';
import { CINTURONES } from './offers.js';
import { intentosDePelea, permiteMarqueeEsteAnio, armarLotePeleas } from './tramite.js';
import { crearSparring } from './sparring.js';
import {
  noticiasDeSucesos, agregarNoticias, marcarLeidas, recortarSucesos,
} from './news.js';
import { cobrarSponsor, tieneStaff } from './money.js';
import { clamp } from './stats.js';
import { semanasDeBloque, fechaDe } from './calendario.js';
import { armarBeatsCampamento } from './campamento.js';
import {
  iniciarRegistroAnio, registrarMuestraMedia as registrarMuestraMediaEnRegistro,
  registrarDecision as registrarDecisionEnRegistro, peleasDelAnio, anioTieneAlgoQueContar,
} from './year-summary.js';

// Pedido 1 (v6, "el ranking está muy pobre... debe de haber al menos 100
// peleadores, la montaña a subir tiene que sentirse alta"): antes 12.
export const CANTIDAD_MUNDO = 100;

// El jugador también sufre el declive de "las piernas" por la edad, igual que
// los NPC en world.js (ahí es un roll de rng; acá es determinístico para no
// alterar la racha de tiradas que ya calibra el ritmo de la carrera). El
// 'preparador físico' (money.js) cumple su promesa ("el declive de las
// piernas llega más tarde") corriendo el umbral unos años.
//
// Sistema 2 (feedback del usuario, SEGUNDA vez: "se supone que hay una edad
// donde [el prime] va bajando"): un único escalón fijo (32 años, -2
// velocidad/-1 cardio por bloque hasta el final de la carrera) no se sentía
// como un arco — era un interruptor, no una curva. Ahora hay DOS escalones:
// uno suave a partir de EDAD_DECLIVE_JUGADOR (32, sin tocar) y uno duro a
// partir de EDAD_DECLIVE_DURO_JUGADOR (36 — a propósito la MISMA edad en que
// el juego empieza a narrar el tono "veterano", ver `tagContenido` más abajo:
// "Cada pelea puede ser la última. Elegí bien." — la mecánica y la narrativa
// caen juntas, aunque "veterano" ya no sea una etapa real de ETAPAS, solo una
// etiqueta de sabor). El escalón duro pega más fuerte Y empieza a tocar también la
// potencia, no solo piernas y pulmón: el jugador tiene que SENTIR que ya no
// es el mismo. `faseFisicaJugador` (exportada, más abajo) es la versión
// "para mostrar en el tablero" de estos mismos umbrales — el jugador puede
// ver venir la caída antes de que llegue.
//
// Pedido 4 (v6, TERCERA vez que reporta que la media sube lento: "quiero que
// por año los atributos también vayan subiendo, sin acciones de por medio,
// hasta llegar al prime y después vayan bajando gradualmente"): el arco de
// acá abajo ahora es COMPLETO, no solo declive. Antes del prime (ver
// EDAD_FIN_CRECIMIENTO más abajo) los atributos crecen solos, cada bloque,
// determinísticamente — igual criterio que el declive: no puede tirar del
// rng compartido (correría la racha de tiradas que calibra el ritmo de toda
// la carrera). Es el PISO de la progresión, no el motor: las cartas de
// mejora (con su rareza y su suerte legendaria) siguen siendo lo que separa
// una carrera con suerte de una sin ella — ver CRECIMIENTO_MAX_POR_BLOQUE.
export const EDAD_DECLIVE_JUGADOR = 32;
const EDAD_DECLIVE_DURO_JUGADOR = 36;
const DEMORA_DECLIVE_PREPARADOR = 3;
const PERDIDA_VELOCIDAD_DECLIVE = 2;
const PERDIDA_CARDIO_DECLIVE = 1;
const PERDIDA_VELOCIDAD_DECLIVE_DURO = 3;
const PERDIDA_CARDIO_DECLIVE_DURO = 2;
const PERDIDA_POTENCIA_DECLIVE_DURO = 1;

// Edad en la que se frena el crecimiento pasivo (ver crecimientoPorEdadJugador,
// más abajo): a partir de acá empieza la meseta ("tu prime"). El usuario lo
// puso en palabras — "a los 27-30 estás en tu mejor momento" — así que
// MARGEN_PRIME (de acá abajo) se redefine para que el prime mostrado en el
// tablero arranque EXACTAMENTE acá: no tendría sentido que el juego siguiera
// narrando "todavía hay margen para crecer" (fase 'ascenso') más allá del
// punto en el que, mecánicamente, ya se dejó de crecer.
const EDAD_FIN_CRECIMIENTO = 27;

// Años de margen antes del umbral suave que todavía se consideran "el prime"
// (meseta): ni en ascenso ni declinando todavía, el mejor momento de la
// carrera — lo bastante cerca del declive como para que el jugador sepa que
// se viene, pero sin que haya empezado. Se deriva de EDAD_FIN_CRECIMIENTO
// (arriba) para que la fase mostrada en el tablero y el crecimiento pasivo de
// verdad coincidan siempre: sin preparador, el prime dura de los 27 a los 31.
const MARGEN_PRIME = EDAD_DECLIVE_JUGADOR - EDAD_FIN_CRECIMIENTO;

function umbralesDeclive(jugador) {
  const demora = tieneStaff(jugador, 'preparador') ? DEMORA_DECLIVE_PREPARADOR : 0;
  return {
    suave: EDAD_DECLIVE_JUGADOR + demora,
    duro: EDAD_DECLIVE_DURO_JUGADOR + demora,
  };
}

// Fase física del jugador para comunicar el arco en el tablero: 'ascenso'
// (todavía hay margen para crecer), 'prime' (el mejor momento, a las
// puertas del declive), 'declive' (ya se siente) y 'declive_duro' (pasado
// el segundo escalón, se siente fuerte). Pura y determinista — los mismos
// umbrales que usa `declivePorEdadJugador`, así el tablero nunca puede
// mostrar una fase que no coincide con lo que en verdad está pasando.
export function faseFisicaJugador(jugador) {
  const { suave, duro } = umbralesDeclive(jugador);
  if (jugador.edad >= duro) {
    return { id: 'declive_duro', etiqueta: 'En declive', detalle: 'Ya no es lo que era: el cuerpo pasa factura en serio.' };
  }
  if (jugador.edad >= suave) {
    return { id: 'declive', etiqueta: 'En declive', detalle: 'Empezaste a sentir el paso de los años.' };
  }
  if (suave - jugador.edad <= MARGEN_PRIME) {
    return { id: 'prime', etiqueta: 'En tu prime', detalle: 'Tu mejor momento. Que rinda.' };
  }
  return { id: 'ascenso', etiqueta: 'En ascenso', detalle: 'Todavía hay margen para crecer.' };
}

// "Veterano" no es una etapa mecánica (v6, pedido textual: "'Veterano' no es
// una categoría nueva... el peleador sigue siendo profesional"): ETAPAS (más
// abajo) tiene una sola entrada profesional, de punta a punta de la carrera —
// el tablero siempre muestra "Profesional" desde el debut hasta el retiro.
// Pero el CONTENIDO (qué carta de mejora/evento/campamento sale, y el tono de
// las peleas de trámite — ver tramite.js) sigue queriendo saber si el
// jugador está en el tramo final: esta función deriva esa etiqueta de SABOR
// a partir de la edad, nunca de una etapa real. Mismo umbral que el escalón
// duro del declive físico (EDAD_DECLIVE_DURO_JUGADOR, arriba): a propósito
// la misma edad en la que el cuerpo empieza a fallar de verdad.
function tagContenido(etapaId, jugador) {
  if (etapaId === 'profesional' && jugador.edad >= EDAD_DECLIVE_DURO_JUGADOR) return 'veterano';
  return etapaId;
}

// Nombre del cinturón que el mundo narra como "el campeonato" (mundo.campeonId
// en world.js): mientras el jugador lo tiene puesto, el mundo no debe coronar
// ni declarar vacante a nadie más (ver avanzarMundo).
const NOMBRE_CINTURON_MUNDIAL = CINTURONES.find((c) => c.id === 'mundial').nombre;

// La noticia de sponsor se arma acá mismo (no sale de PLANTILLAS en
// news-templates.js: el titular ya viene armado desde money.js). El cuerpo
// es atmosférico, sin marcadores, para cumplir el mismo contrato de
// "toda noticia tiene titular y cuerpo" que las demás.
const CUERPOS_SPONSOR = [
  'La plata entra sola: para eso están los contratos de imagen.',
  'Nada como un buen cheque para bajar la presión antes de la próxima pelea.',
  'El mánager ya está pidiendo que le manden el logo para el pantalón.',
];

// Puntos por atributo que suma el crecimiento pasivo en el PRIMER bloque de
// la carrera (15 años) — decae lineal hasta 0 en EDAD_FIN_CRECIMIENTO. Un
// chico de 15 tiene que crecer rápido: acá es donde más rinde. El número se
// calibró con scripts/_tune.mjs para que la MEDIA a mitad de carrera y al
// final suban de forma sentida sin volver irrelevantes las cartas de mejora
// (que siguen siendo lo que separa una carrera con suerte de una sin ella).
const CRECIMIENTO_MAX_POR_BLOQUE = 3;

// Los mismos seis atributos "core" que pesan en la MEDIA de boxeo (ver
// pesosDe en disciplines.js) — no toca grappling (en boxeo vale 1 fijo) ni
// los "especiales" (menton/disciplinaPersonal, que no forman parte de la
// media). Crecen todos parejo: una versión más simple que separar "físico"
// de "técnico" por edad, y ya alcanza para que la MEDIA suba sola de forma
// sentida.
const ATRIBUTOS_CON_CRECIMIENTO = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];

// Pedido 4 (v6, TERCERA vez: "quiero que por año los atributos también vayan
// subiendo, sin acciones de por medio, hasta llegar al prime"): crecimiento
// pasivo, determinístico (no tira del rng compartido, mismo criterio que
// declivePorEdadJugador — ver el comentario grande más arriba). Se frena del
// todo en EDAD_FIN_CRECIMIENTO (la meseta del prime): antes de eso, decae
// lineal desde CRECIMIENTO_MAX_POR_BLOQUE (a los 15) hasta 0. Es el PISO de
// la progresión: las cartas de mejora (con su rareza y su suerte legendaria)
// siguen siendo lo que de verdad separa una carrera con suerte de una sin
// ella — esto solo garantiza que ALGO suba incluso si nunca tocás una carta
// buena.
function crecimientoPorEdadJugador(jugador) {
  if (jugador.edad >= EDAD_FIN_CRECIMIENTO) return jugador.atributos;
  const progreso = clamp(
    (EDAD_FIN_CRECIMIENTO - jugador.edad) / (EDAD_FIN_CRECIMIENTO - EDAD_INICIAL),
    0,
    1,
  );
  const delta = Math.round(CRECIMIENTO_MAX_POR_BLOQUE * progreso);
  if (delta <= 0) return jugador.atributos;
  const atributos = { ...jugador.atributos };
  for (const clave of ATRIBUTOS_CON_CRECIMIENTO) {
    atributos[clave] = clamp(atributos[clave] + delta, 1, 99);
  }
  return atributos;
}

function declivePorEdadJugador(jugador) {
  const { suave, duro } = umbralesDeclive(jugador);
  if (jugador.edad < suave) return jugador.atributos;
  if (jugador.edad < duro) {
    return {
      ...jugador.atributos,
      velocidad: clamp(jugador.atributos.velocidad - PERDIDA_VELOCIDAD_DECLIVE, 1, 99),
      cardio: clamp(jugador.atributos.cardio - PERDIDA_CARDIO_DECLIVE, 1, 99),
    };
  }
  return {
    ...jugador.atributos,
    velocidad: clamp(jugador.atributos.velocidad - PERDIDA_VELOCIDAD_DECLIVE_DURO, 1, 99),
    cardio: clamp(jugador.atributos.cardio - PERDIDA_CARDIO_DECLIVE_DURO, 1, 99),
    potencia: clamp(jugador.atributos.potencia - PERDIDA_POTENCIA_DECLIVE_DURO, 1, 99),
  };
}

// ===== RONDA v6 — SEGUNDA VUELTA (pedido de fondo): "no todas las peleas se
// juegan igual" ==============================================================
//
// La frase que gobierna esta ronda, textual del usuario: "este juego NO es
// un simulador, son partidas cortas, 20 min máximo" — y a la vez "un
// peleador debe tener entre 30 y 40 peleas en toda su carrera profesional".
// Esas dos cosas NO entraban juntas mientras cada pelea (oferta, negociación,
// careo, campamento de 3-5 beats, crónica ronda a ronda, golpe de gracia) se
// jugara completa: 30-40 peleas jugadas de punta a punta son varias HORAS,
// no minutos.
//
// La solución (decisión de diseño central de esta ronda, ver `esPeleaImportante`
// en offers.js y `armarLotePeleas`/`resumenLote` en tramite.js): NO TODAS LAS
// PELEAS SE JUEGAN IGUAL.
//   - Las peleas que IMPORTAN se juegan completas: título (disputarlo o
//     defenderlo), revancha, tu archirrival, y la eliminatoria que define tu
//     ascenso al puesto de retador. Ver `esPeleaImportante` — se probó
//     sumar un quinto criterio ("riesgo alto": un rival claramente mejor) y
//     se descartó: el matchmaking normal ya sesga hacia arriba, así que
//     disparaba en casi cualquier matchup temprano y volvía "jugable" la
//     mitad de los años de la carrera sin sumarle nada al eje de cinturones.
//     Los cuatro criterios que quedaron son, literalmente, los del brief.
//   - Las peleas de TRÁMITE se resuelven solas: sin careo, sin campamento,
//     sin ronda a ronda — un resultado calculado (mismo criterio que el
//     combate NPC-vs-NPC de `avanzarMundo`, world.js) y un resumen con sabor
//     ("Tres peleas en el año: 3-0, dos por nocaut"), nunca un renglón de
//     log. Ver `armarLotePeleas`/`resumenLote` (tramite.js) y el beat
//     'peleasResueltas' (main.js).
// El RÉCORD que se muestra suma TODAS: el jugador llega a 35-2 como un
// boxeador de verdad, aunque solo haya jugado con el mando ocho o diez veces.
//
// Un freno extra hizo falta para que la cuenta cerrara: un "jugando bien"
// que corona los tres cinturones a mitad de carrera pasaba el resto (a veces
// 8-10 años más) defendiendo el mundial año a año SIN EXCEPCIÓN — cada
// defensa es esTitulo, así que cada uno de esos años se volvía una pelea
// jugable más, sin sumarle nada al eje de cinturones (ya resuelto). Ver
// `permiteMarqueeEsteAnio` (tramite.js): un campeón indiscutido, la mayoría
// de los años, elige no arriesgar nada — los cupos de pelea de ese año
// siguen existiendo (la cuenta de peleas profesionales no se toca), pero se
// resuelven todos como trámite.
//
// Pedido 2 (v6, "las peleas amateur no cuentan ni en el ranking ni en el
// historial"): juvenil/amateur dejan de generar el beat 'oferta' del todo —
// TODA pelea de esas dos etapas es de formación, se resuelve sola (ver
// `armarLotePeleas` con `permiteJugable:false`) y va a `recordAmateur`/
// `historialAmateur` (fighter.js/offers.js), nunca a `record`/`historial`.
// El día del debut profesional el récord real arranca en 0-0, como en la
// vida real — y de yapa, el ranking deja de mostrarse durante la etapa
// amateur SOLO (panel-peleador.js ya lo resolvía gratis: muestra "Sin
// clasificar" mientras `record` esté en 0 peleas).
//
// Pedido 3 (v6, "'Veterano' no es una categoría nueva... el peleador sigue
// siendo profesional"): ETAPAS pasa de CUATRO entradas a TRES — profesional
// dura de punta a punta de la carrera pro (debut a los 21, hasta el retiro).
// El tablero muestra "Profesional" siempre, del debut al retiro (ver
// bloqueEtapa, panel-peleador.js, que ahora usa `fraseDeEtapa` en vez de
// `etapa.frase` directo). "Veterano" sigue existiendo como ETIQUETA DE
// SABOR (ver `tagContenido`, arriba): el tono de las cartas/eventos/
// campamento y de las peleas de trámite cambia a partir de
// EDAD_DECLIVE_DURO_JUGADOR (36 — la misma edad en la que el cuerpo empieza
// a fallar de verdad), pero la mecánica de la carrera no distingue nada.
//
// Pedido 4 (v6, "de joven se pelea más seguido... un pibe de 21 pelea cuatro
// o cinco veces al año; un campeón de 34 pelea dos, y son todas grandes"):
// `probPelea` (un número fijo por etapa) no alcanza para esto — un año de
// carrera profesional ahora puede traer VARIOS cupos de pelea, no uno solo.
// `intentosDePelea` (tramite.js) decide cuántos según la edad (bandas que
// declinan de 3 a los 21-22 hasta 1 pasados los 33) y sube el techo si hay
// mucho en juego (cinturón puesto, o ranking que ya califica para el
// próximo). La enorme mayoría de esos cupos, sobre todo de joven, van a ser
// trámite — exactamente lo que hace que "pelear varias veces al año" y
// "30-40 peleas en TODA la carrera" convivan sin reventar el presupuesto de
// minutos.
//
// Con esto, `ETAPAS.profesional` deja de tener `probPelea` (reemplazado por
// `intentosDePelea`, edad-dependiente) y pasa de 11 bloques × 1.3 años +
// veterano (3 × 1.3) a UNA sola entrada de 18 bloques × 1 año — mismo rango
// de edad de cierre (~39), granularidad más fina (1 año por bloque, para que
// la frecuencia por edad tenga sentido bloque a bloque).
//
// LOS NÚMEROS MEDIDOS — dos metodologías, ambas sobre "jugando bien" (acepta
// y gana toda oferta jugable; las de trámite se resuelven solas):
//
// scripts/_tune.mjs (3000 semillas, jugador fijo, SIN cartas de mejora — el
// mismo método que el test 'progresión de cinturones' de career.test.js):
//   3 cinturones: 99.3% | sin ninguna defensa obligatoria: 3.1%
//   peleas profesionales totales/carrera: avg=34.7 | p10=32 p90=37 |
//     dentro de [30,40] en 99.5% de las 3000 semillas.
//   peleas JUGABLES/carrera (careo+campamento+ronda a ronda): avg=6.4
//   beats estructurales/carrera: avg=77.1
//
// scripts/balance-sim.mjs (300 semillas, "creación real" — SÍ aplica cartas
// de mejora/evento, la MEDIA sube de verdad; además corre el motor de pelea
// real -sombra- para medir cuántas rondas/decisiones tiene cada pelea
// jugable, no una estimación):
//   3 cinturones: 100% | sin ninguna defensa obligatoria: 11.7%
//   peleas profesionales totales/carrera: avg=36.4 (dentro de [30,40] en 97%)
//   peleas JUGABLES/carrera: avg=5.9
//   ACCIONES JUGADAS/carrera (beats estructurales + negociación/careo/
//     rounds/rincón/golpe de cada pelea jugable — lo que el jugador
//     realmente resuelve con el mando): avg=158.4
//   => minutos estimados, con el supuesto de 8 segundos por acción (ver
//     SEGUNDOS_POR_BEAT, balance-sim.mjs — el propio juego está diseñado
//     para ese ritmo: textos cortos, ventana del golpe de gracia de 3.2s):
//     avg=21.1 minutos.
//
// Los tres objetivos de ritmo, con lo medido:
//   - 30-40 peleas PROFESIONALES por carrera: CUMPLIDO (avg 34.7-36.4).
//   - ~20 minutos de partida: CUMPLIDO con margen chico (avg 21.1 min, con
//     el supuesto de 8s/acción declarado arriba).
//   - ≥85% de carreras bien jugadas consiguen los tres cinturones: CUMPLIDO
//     con margen amplio (99.3-100%, no negociable, sigue siendo la
//     condición de victoria).
// "Sin ninguna defensa obligatoria" sube de ~3.1% a ~11.7% entre ambas
// medidas — es el costo esperado de `permiteMarqueeEsteAnio`: con cartas de
// mejora (balance-sim), la MEDIA sube más rápido, los tres cinturones se
// coronan antes, y quedan más años de "campeón indiscutido que elige
// descansar" en los que ninguna defensa llega a jugarse. Sigue lejos de
// cualquier lectura de "nunca aparece una defensa" (~9 de cada 10 carreras
// SÍ ven una) y no es la métrica que el brief pidió proteger como
// no-negociable (esa es el eje de cinturones, arriba).
export const ETAPAS = [
  {
    id: 'juvenil', nombre: 'Juvenil', bloques: 3, aniosPorBloque: 1, edadDesde: 15,
    probPelea: 0.18, probEvento: 0.15, probRedes: 0, probSparring: 0.08,
    frase: 'Nadie sabe quién sos. Todavía.',
  },
  {
    id: 'amateur', nombre: 'Amateur', bloques: 3, aniosPorBloque: 1, edadDesde: 18,
    probPelea: 0.4, probEvento: 0.12, probRedes: 0.06, probSparring: 0.04,
    frase: 'El ascenso no consagra ídolos. Ganate el salto.',
  },
  {
    // v6, segunda vuelta: profesional pasa a ser la ÚNICA etapa desde el
    // debut hasta el retiro — "veterano" ya no es una etapa mecánica (ver el
    // comentario grande de arriba y `tagContenido`). `probPelea` desaparece:
    // la frecuencia de pelea ahora depende de la edad, ver `intentosDePelea`
    // (tramite.js), llamada desde `armarCola` más abajo.
    id: 'profesional', nombre: 'Profesional', bloques: 18, aniosPorBloque: 1, edadDesde: 21,
    probEvento: 0.03, probRedes: 0.02, probSparring: 0,
    frase: 'Acá se cobra y se sangra. Bienvenido.',
  },
];

export function etapaActual(partida) {
  return ETAPAS[Math.min(partida.etapaIndice, ETAPAS.length - 1)];
}

// Frase de sabor por ETIQUETA DE CONTENIDO, no por ETAPAS real (v6: con
// profesional durando toda la carrera pro, `etapaActual(partida).frase` se
// quedaría diciendo "Acá se cobra y se sangra. Bienvenido." incluso a los 38
// años). `bloqueEtapa` (panel-peleador.js) usa ESTA función, no
// `etapaActual().frase` directo, para que el tono narrado en el tablero
// también envejezca con el jugador.
const FRASES_POR_TAG = {
  juvenil: 'Nadie sabe quién sos. Todavía.',
  amateur: 'El ascenso no consagra ídolos. Ganate el salto.',
  profesional: 'Acá se cobra y se sangra. Bienvenido.',
  veterano: 'Cada pelea puede ser la última. Elegí bien.',
};

export function fraseDeEtapa(partida) {
  const etapa = etapaActual(partida);
  return FRASES_POR_TAG[tagContenido(etapa.id, partida.jugador)] ?? etapa.frase;
}

export function crearPartida({ jugador, semilla }) {
  const rng = createRng(semilla);
  const mundo = crearMundo(rng, {
    disciplina: jugador.disciplina,
    categoria: jugador.categoria,
    // Pedido 1 (v6, "el ranking está muy pobre, debe de haber al menos 100
    // peleadores, la montaña a subir tiene que sentirse alta"): antes 12.
    cantidad: CANTIDAD_MUNDO,
    // El pool "normal" de apodos del jugador (nicknames.js) se superpone con
    // el pool de apodos de los rivales (names.js): sin reservar el propio,
    // un rival al azar podía terminar con el MISMO apodo que el jugador
    // (ver crearRoster en roster.js).
    apodosReservados: jugador.apodo ? [jugador.apodo] : [],
  });
  return {
    version: 1,
    semilla,
    rngEstado: rng.estado(),
    jugador: { ...jugador, ranking: rankingDelJugador(mundo, jugador) },
    mundo,
    rivalidades: [],
    noticias: [],
    etapaIndice: 0,
    bloque: 1,
    bloqueGlobal: 1,
    // Calendario del tablero (v2): semana 1-indexada desde el arranque de la
    // carrera (ver calendario.js). `proximaPelea` es SOLO la pelea firmada
    // (ver firmarPelea, más abajo): es lo único que lee el panel de próxima
    // pelea (panel-proxima.js). `ofertaPendiente` es un dato interno aparte:
    // guarda la oferta que este bloque ya armó en la cola pero que el
    // jugador todavía no vio ni decidió — sirve para que cancelarProximaPelea
    // (las cartas de riesgo) sepa que hay algo que sacar de la cola. El panel
    // nunca lee `ofertaPendiente` (bug reportado: mostraba al rival antes de
    // aceptar la oferta).
    semanaGlobal: 1,
    // Calendario (v12, "que el resumen aparezca en cada enero"): dónde
    // arrancó el bloque que se está viviendo AHORA MISMO — ver el comentario
    // grande en avanzarBloque. Sin esto, un campamento (que avanza
    // semanaGlobal semana a semana, siguienteBeat) corría el calendario para
    // siempre: avanzarBloque sumaba `semanasDeBloque` sobre la semana YA
    // adelantada por el campamento, así que cada uno agregaba semanas de más
    // que nunca se recuperaban.
    semanaInicioBloque: 1,
    proximaPelea: null,
    ofertaPendiente: null,
    cola: [],
    beatActual: null,
    historialBeats: 0,
    terminada: false,
    legado: null,
    // Bug v7 ("una carta me aparece constantemente, se habrá repetido 5 o 6
    // veces seguidas" — ver el comentario grande de excluirRecientes,
    // cards.js): memoria CORTA de los últimos ids mostrados por cada pool de
    // "una sola carta elegida" (evento/redes/campamento — repartirMejoras NO
    // entra: ofrece varias a la vez y ya se garantiza sin repetir ENTRE SÍ).
    // Plana y serializable (arrays de strings): viaja en la partida, así el
    // autoguardado la persiste y una carrera retomada sigue recordando qué
    // vio hace un rato, no vuelve a arrancar en blanco.
    memoriaCartas: { evento: [], redes: [], campamento: [] },
    // Resumen de fin de año (pedido textual del usuario): `registroAnioActual`
    // acumula la media y las decisiones del año que se está viviendo ahora
    // mismo — ver el comentario grande de year-summary.js. `beatsResumenAnio`
    // es un dato SIEMPRE transitorio (lo llena `cerrarAniosCruzados` apenas
    // detecta que un avance de `semanaGlobal` cruzó uno o más años calendario,
    // lo consume `siguienteBeat` en el mismo golpe): nunca debería sobrevivir
    // a un autoguardado, pero viaja en la partida (serializable, JSON-safe,
    // SIEMPRE un array — puede traer más de un beat si el avance cruzó más
    // de un año de una sola vez) para que una partida guardada justo en ese
    // instante no pierda nada si algo interrumpe el ciclo.
    registroAnioActual: iniciarRegistroAnio(1, jugador, mundo),
    beatsResumenAnio: [],
  };
}

function rngDe(partida) {
  const rng = createRng(partida.semilla);
  rng.restaurar(partida.rngEstado);
  return rng;
}

function clonarPartida(partida) {
  return {
    ...partida,
    jugador: {
      ...partida.jugador,
      atributos: { ...partida.jugador.atributos },
      especiales: { ...partida.jugador.especiales },
      estado: { ...partida.jugador.estado },
      record: { ...partida.jugador.record },
      recordAmateur: { ...(partida.jugador.recordAmateur ?? { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 }) },
      titulos: [...partida.jugador.titulos],
      staff: [...partida.jugador.staff],
      lujos: [...partida.jugador.lujos],
      historial: [...partida.jugador.historial],
      historialAmateur: [...(partida.jugador.historialAmateur ?? [])],
    },
    rivalidades: partida.rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] })),
    noticias: [...partida.noticias],
    cola: [...partida.cola],
    memoriaCartas: {
      evento: [...(partida.memoriaCartas?.evento ?? [])],
      redes: [...(partida.memoriaCartas?.redes ?? [])],
      campamento: [...(partida.memoriaCartas?.campamento ?? [])],
    },
    // Resumen de fin de año: `?? null`/`?? []` (en vez de asumir que siempre
    // existe) es la migración silenciosa para una partida guardada de un
    // esquema anterior a esta ronda — sin el campo, `registrarDecision`/
    // `registrarMuestraMedia` no hacen nada (ver el resguardo en
    // year-summary.js) hasta que el próximo cruce de año abre un registro
    // nuevo solo; nunca revienta.
    registroAnioActual: clonarRegistroAnio(partida.registroAnioActual),
    beatsResumenAnio: (partida.beatsResumenAnio ?? []).map(clonarBeatResumenAnio),
  };
}

function clonarRegistroAnio(registro) {
  if (!registro) return null;
  return {
    ...registro,
    muestrasMedia: [...registro.muestrasMedia],
    decisiones: [...registro.decisiones],
  };
}

function clonarBeatResumenAnio(beat) {
  return {
    ...beat,
    datos: {
      ...beat.datos,
      muestrasMedia: [...beat.datos.muestrasMedia],
      decisiones: [...beat.datos.decisiones],
      peleas: [...beat.datos.peleas],
    },
  };
}

// Resumen de fin de año (v12, pedido textual: "que se muestre al principio
// de cada año, en cada enero"): el disparador del resumen deja de ser "se
// terminó un bloque" y pasa a ser "se cruzó un año calendario" — lo mismo da
// si ese cruce lo produjo el salto grande de `avanzarBloque` o el avance
// semana a semana de un beat de campamento (`campCarta`/`campSparring`, ver
// `siguienteBeat`): CUALQUIER avance de `semanaGlobal` puede terminar de
// cruzar un año, y acá es donde se lo detecta y se cierra.
//
// `semanaAntes`/`semanaDespues` son las dos puntas del avance YA calculado
// por quien llama (esta función nunca suma semanas por su cuenta: solo
// compara, para no duplicar la lógica de cuánto avanzar en cada uno de los
// dos caminos). Si no cruzó ningún año (caso normal, semana a semana dentro
// del mismo año), devuelve el registro tal cual y ningún beat.
//
// Si cruzó uno o más años, la decisión de diseño (pedido explícito: "decidí
// cómo — emitir uno por año, o fusionar, y documentá el criterio") es EMITIR
// UNO POR AÑO, nunca fusionar: cada año conserva sus propias peleas,
// decisiones y muestras de media en su propia pantalla, en vez de mezclar
// dos años en un solo resumen. El primer año que se cierra (`semanaAntes`)
// es el que de verdad estaba corriendo — trae el registro real acumulado.
// Si el salto alcanzó a cruzar MÁS de un año de una sola vez (hoy no pasa
// con los `aniosPorBloque` actuales, siempre 1 — ver ETAPAS —, pero un beat
// de campamento en teoría también podría si esas constantes cambiaran), los
// años intermedios nunca llegaron a tener su propio registro abierto: se
// cierran con un registro vacío (sin muestras ni decisiones, porque nadie
// jugó nada mientras "estaban" esos años) y quedan sujetos al mismo filtro
// `anioTieneAlgoQueContar` — en la práctica, solo sus peleas (si hubo alguna
// fechada ahí) pueden salvarlos de quedar en silencio. Así ningún año se
// pierde: o bien aparece su resumen, o bien de verdad no tuvo nada que
// contar.
function cerrarAniosCruzados({
  semanaAntes, semanaDespues, registroAnioActual, jugador, mundo,
}) {
  const anioAntes = fechaDe(semanaAntes, ANIO_INICIAL).anio;
  const anioDespues = fechaDe(semanaDespues, ANIO_INICIAL).anio;
  if (anioDespues <= anioAntes) {
    return { registroAnioActual, beatsResumen: [] };
  }
  const beatsResumen = [];
  for (let anio = anioAntes; anio < anioDespues; anio += 1) {
    const registro = anio === anioAntes
      ? registroAnioActual
      : { anio, muestrasMedia: [], decisiones: [] };
    if (anioTieneAlgoQueContar(registro, jugador)) {
      beatsResumen.push({
        tipo: 'resumenAnio',
        datos: {
          anio,
          // Copias defensivas (no una referencia directa a los arrays de
          // `registro`): para el primer año cerrado, `registro` ES el
          // `registroAnioActual` que recibió esta función — el beat no puede
          // compartir array con nada que un llamador todavía pueda tener
          // agarrado en otro lado (mismo criterio de pureza que
          // `clonarBeatResumenAnio`, más abajo).
          muestrasMedia: [...registro.muestrasMedia],
          decisiones: [...registro.decisiones],
          peleas: peleasDelAnio(jugador, anio),
        },
      });
    }
  }
  return {
    registroAnioActual: iniciarRegistroAnio(semanaDespues, jugador, mundo),
    beatsResumen,
  };
}

export function avanzarBloque(partida) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);

  nueva.jugador.edad += etapa.aniosPorBloque;
  // Resumen de fin de año: se guarda la semana ANTES de este salto (ver
  // `cerrarAniosCruzados`, más abajo, que compara las dos puntas para saber
  // cuántos años calendario cruzó este bloque — nunca asume que un bloque es
  // siempre exactamente un año).
  const semanaAntes = nueva.semanaGlobal ?? 1;
  // Calendario (v12, "que el resumen aparezca en cada enero" — causa real
  // medida DESPUÉS de arreglar el cruce de años: los primeros resúmenes
  // caían en enero, pero después se corrían a marzo, junio, octubre...): el
  // próximo bloque NO arranca `semanasDeBloque` semanas después de donde
  // ESTÁ `semanaGlobal` ahora mismo — arranca esa cantidad de semanas
  // después de donde ARRANCÓ este bloque (`semanaInicioBloque`). Si un
  // campamento (siguienteBeat) ya adelantó `semanaGlobal` DENTRO de este
  // bloque preparando una pelea, esas semanas son PARTE del año de este
  // bloque, no un agregado extra: sumarlas de nuevo acá (como hacía antes)
  // corría el calendario hacia adelante para siempre, sin que ningún bloque
  // futuro lo recuperara jamás.
  //
  // Bug encontrado en revisión de código: `?? 1` (en vez de `?? semanaAntes`)
  // rompía la migración de una partida guardada ANTES de este fix (esquema
  // v2 ya publicado, ver save.js — a esas partidas nunca les existió este
  // campo): la primera vez que una de esas partidas cargadas avanzaba de
  // bloque, el calendario saltaba HACIA ATRÁS a la semana 1+52, sin importar
  // cuántos años llevara la carrera. `?? semanaAntes` es el mismo criterio de
  // migración silenciosa que ya usa `registroAnioActual: ?? null` (más
  // abajo, clonarPartida): sin drift conocido para reclamar, el resultado es
  // IDÉNTICO al comportamiento de antes de este fix (sumar sobre la semana
  // actual) — nunca revienta ni retrocede.
  const inicioBloqueActual = nueva.semanaInicioBloque ?? semanaAntes;
  nueva.semanaGlobal = inicioBloqueActual + semanasDeBloque(etapa.aniosPorBloque);
  nueva.semanaInicioBloque = nueva.semanaGlobal;
  nueva.jugador.estado.fatiga = clamp(nueva.jugador.estado.fatiga - 25, 0, 100);
  // Sistema 1 (feedback del usuario: "¿Qué efecto tienen las lesiones?
  // Parecería que no afecta en nada"): este +5 pasivo de forma corría TODOS
  // los bloques, incluso mientras seguías lesionado. Mientras la lesión
  // sigue activa AL ARRANCAR este bloque (el estado tal cual quedó al
  // cierre del bloque anterior — la recuperación de ESTE bloque todavía no
  // corrió, ver más abajo), el descanso pasivo se frena: la forma se queda
  // baja de verdad.
  if (!nueva.jugador.estado.lesion) {
    nueva.jugador.estado.forma = clamp(nueva.jugador.estado.forma + 5, 0, 100);
  }
  // Crecimiento pasivo primero (Pedido 4): nunca se solapan (uno termina en
  // EDAD_FIN_CRECIMIENTO, el otro arranca recién en EDAD_DECLIVE_JUGADOR,
  // más tarde), pero el orden importa igual para que la edad ya incrementada
  // arriba sea la que ambos lean.
  nueva.jugador.atributos = crecimientoPorEdadJugador(nueva.jugador);
  nueva.jugador.atributos = declivePorEdadJugador(nueva.jugador);

  // v7, corrección del coordinador ("las lesiones tienen que costar de
  // verdad, evaluadas semana a semana, no una vez por bloque"): antes ACÁ se
  // descontaban de un saque las 52 semanas del bloque entero, así que
  // CUALQUIER lesión de 52 semanas o menos ya aparecía curada la primera vez
  // que armarCola la revisaba — cero costo real. La recuperación ya no se
  // toca en avanzarBloque: ahora se descuenta cupo por cupo, dentro de
  // armarCola/armarLotePeleas (tramite.js), al ritmo real de cuántas semanas
  // representa cada intento de pelea del año — así una lesión corta pierde
  // solo los cupos que caen mientras sigue activa, no el bloque entero.

  const sponsor = cobrarSponsor(nueva.jugador, rng);
  if (sponsor) nueva.jugador = sponsor.jugador;

  const paso = avanzarMundo(nueva.mundo, rng, {
    aniosPasados: Math.round(etapa.aniosPorBloque),
    jugadorEsCampeon: nueva.jugador.titulos.includes(NOMBRE_CINTURON_MUNDIAL),
    // El año lo manda el calendario, no el conteo del mundo: los bloques duran
    // 1 a 1.3 años y acumular enteros dejaba al mundo ~4 años atrás del
    // tablero y de la edad del jugador al final de la carrera.
    anio: fechaDe(nueva.semanaGlobal, ANIO_INICIAL).anio,
  });
  nueva.mundo = paso.mundo;

  // El ranking del jugador se recalcula cada bloque: es lo que habilita
  // las peleas de título y las defensas obligatorias.
  nueva.jugador.ranking = rankingDelJugador(nueva.mundo, nueva.jugador);

  // Pedido 3 (v9, "aparecen muchas noticias de golpe, quiero que no sean
  // tantas, más esporádicas"): `recortarSucesos` (news.js) recorta la tanda
  // ANTES de convertirla en noticias — ver el comentario grande ahí. Los
  // sucesos de título nunca se tocan; retiro/debut/victoria (el grueso con
  // el roster de 100) se recortan a un puñado cada uno.
  const nuevas = noticiasDeSucesos(rng, recortarSucesos(paso.sucesos), { anio: paso.mundo.anio });
  if (sponsor) {
    nuevas.unshift({
      id: `noticia_sponsor_${nueva.bloqueGlobal}`,
      // Es una buena noticia (te firmó un sponsor): iba tipada 'escandalo'
      // por error, lo que la mostraba como si fuera algo malo.
      tipo: 'sponsor',
      titular: sponsor.texto,
      // No consume del rng compartido (ver el comentario en noticiasDeSucesos,
      // news.js): el ritmo de la carrera está calibrado contra esa secuencia
      // exacta, y esto es solo variedad de texto, no una decisión de juego.
      cuerpo: CUERPOS_SPONSOR[nueva.bloqueGlobal % CUERPOS_SPONSOR.length],
      fecha: paso.mundo.anio,
      nueva: true,
    });
  }
  // Causa real del bug reportado ("todas las noticias dicen ÚLTIMO MOMENTO,
  // aunque sean de antes"): `marcarLeidas` (news.js) apaga la marca "nueva",
  // pero antes de este fix el ÚNICO lugar que la llamaba era el click del
  // acordeón en panel-noticias.js — un gesto que en PC no hace falta nunca
  // (la lista ya está siempre visible debajo del botón, ver
  // `.panel-noticias-lista` en theme.css, sin display:none salvo en celular)
  // y que en celular casi nadie toca ANTES de que llegue la próxima tanda.
  // Sin ese click, "nueva" nunca se apagaba: cada tanda se sumaba encima de
  // las anteriores y TODO el feed quedaba marcado como último momento para
  // siempre. La marca tiene que apagarse sola cuando deja de ser la tanda más
  // reciente: acá, al sumar esta tanda nueva, la anterior ya tuvo su
  // bloque entero para mostrarse como tal — a partir de ahora es "vieja".
  nueva.noticias = agregarNoticias(marcarLeidas(nueva.noticias), nuevas);

  nueva.rngEstado = rng.estado();

  // Resumen de fin de año (v12: el disparador es el cruce de año calendario,
  // no el fin del bloque en sí — ver el comentario grande de
  // `cerrarAniosCruzados`, arriba). `semanaAntes`/`nueva.semanaGlobal` son
  // las dos puntas del salto que este bloque acaba de dar: casi siempre es
  // exactamente un año (aniosPorBloque=1 en las tres ETAPAS de hoy), pero la
  // función no lo asume — si llegara a cruzar más de uno, cierra cada año
  // por separado, ninguno se pierde. Los beats ya armados y filtrados
  // (`anioTieneAlgoQueContar`) quedan en `beatsResumenAnio` — un dato
  // transitorio que `siguienteBeat` consume en el mismo golpe (los prepende
  // a la cola del bloque nuevo) y después limpia. `registroAnioActual` queda
  // reabierto para el año que arranca, con la MEDIA ya recalculada después
  // del crecimiento/declive pasivo de este bloque (arriba).
  const cierre = cerrarAniosCruzados({
    semanaAntes,
    semanaDespues: nueva.semanaGlobal,
    registroAnioActual: nueva.registroAnioActual,
    jugador: nueva.jugador,
    mundo: nueva.mundo,
  });
  nueva.registroAnioActual = cierre.registroAnioActual;
  nueva.beatsResumenAnio = [...nueva.beatsResumenAnio, ...cierre.beatsResumen];

  return nueva;
}

/** Envoltorio a nivel partida de `registrarDecision` (year-summary.js): usa
 * la semana actual de la partida. Lo llama main.js (y scripts/balance-sim.mjs)
 * cada vez que el jugador elige una opción en una tarjeta (mejora/evento/
 * redes/campamento) — nunca el núcleo por su cuenta, para no acoplar
 * career.js a CADA punto donde eso pasa en la UI. */
export function registrarDecision(partida, { tipo, titulo, opcion }) {
  return {
    ...partida,
    registroAnioActual: registrarDecisionEnRegistro(partida.registroAnioActual, {
      tipo, titulo, opcion, semana: partida.semanaGlobal,
    }),
  };
}

/** Envoltorio a nivel partida de `registrarMuestraMedia` (year-summary.js):
 * usa el jugador, el mundo y la semana actuales de la partida (el mundo suma
 * el puesto de ranking a la misma muestra, v8). Lo llama main.js en el único
 * punto que YA centraliza "se acaba de aplicar un efecto sobre el jugador"
 * (aplicarEfectoYSeguir) — así que cubre mejora/evento/redes/sparring/
 * campamento de una sola vez, sin tener que tocar cada beat. */
export function registrarMuestraMedia(partida) {
  return {
    ...partida,
    registroAnioActual: registrarMuestraMediaEnRegistro(
      partida.registroAnioActual, partida.semanaGlobal, partida.jugador, partida.mundo,
    ),
  };
}

function armarCola(partida) {
  const rng = rngDe(partida);
  const etapa = etapaActual(partida);
  const tag = tagContenido(etapa.id, partida.jugador);
  const cola = [];
  // Si este bloque trae una oferta de pelea JUGABLE, se guarda acá (dato
  // INTERNO, nunca leído por el panel de próxima pelea): sirve para que
  // cancelarProximaPelea pueda sacarla de la cola si una carta de riesgo la
  // hace caer antes de que el jugador llegue a decidir sobre ella. La oferta
  // recién se vuelve "próxima pelea" de verdad (lo que muestra el tablero)
  // cuando el jugador la acepta y firma — ver firmarPelea, más abajo. Las
  // peleas de trámite (ver más abajo) nunca pasan por acá: no hay nada que
  // decidir, ya se resolvieron solas.
  let ofertaPendiente = null;
  // El lote de peleas de este bloque (más abajo) puede resolver una o varias
  // peleas de trámite EN EL ACTO — eso cambia jugador/rivalidades antes de
  // que el jugador vea ningún beat. `jugadorActual`/`rivalidadesActuales`
  // acarrean ese cambio para que el resto de esta función (y el retorno)
  // trabajen siempre con el estado más fresco.
  let jugadorActual = partida.jugador;
  let rivalidadesActuales = partida.rivalidades;

  // Mejora garantizada en TODOS los bloques (Task v3, "progresión"): un
  // intento anterior la salteaba en el bloque que seguía a una pelea firmada
  // (el campamento ya trae sus propias cartas), pero eso castigaba justo al
  // jugador que más pelea — menos cartas de mejora, no más. La progresión de
  // MEDIA tiene que sentirse pase lo que pase con el calendario de peleas.
  cola.push({
    tipo: 'mejora',
    datos: { cartas: repartirMejoras(rng, { jugador: jugadorActual, etapa: tag }) },
  });

  if (rng.chance(etapa.probSparring)) {
    cola.push({ tipo: 'sparring', datos: { sparring: crearSparring(rng, { jugador: jugadorActual }) } });
  }

  // Bug v7 ("una carta se repite tan seguido"): cada pool de "una sola carta
  // elegida" lleva su propia memoria corta (memoriaCartas, ver el comentario
  // grande en crearPartida) — se lee de `partida` (todavía no tocada por
  // esta función) y se escribe de vuelta apenas se elige, así que si AMBOS
  // pools disparan en el mismo bloque cada uno actualiza su propia lista sin
  // pisar a la otra.
  let memoriaEvento = partida.memoriaCartas?.evento ?? [];
  let memoriaRedes = partida.memoriaCartas?.redes ?? [];

  if (rng.chance(etapa.probEvento)) {
    const categoria = rng.chance(0.5) ? 'vida' : 'evento';
    const carta = elegirEvento(rng, {
      jugador: jugadorActual, etapa: tag, categoria, recientes: memoriaEvento,
    });
    memoriaEvento = recordarCarta(memoriaEvento, carta.id);
    cola.push({ tipo: 'evento', datos: { carta } });
  }

  if (rng.chance(etapa.probRedes)) {
    const carta = elegirCartaRedes(rng, { jugador: jugadorActual, recientes: memoriaRedes });
    memoriaRedes = recordarCarta(memoriaRedes, carta.id);
    cola.push({ tipo: 'redes', datos: { carta } });
  }

  // v6, segunda vuelta ("no todas las peleas se juegan igual"): en
  // profesional, un año puede traer VARIOS cupos de pelea (intentosDePelea,
  // tramite.js — declina con la edad, sube si hay mucho en juego). En
  // juvenil/amateur sigue siendo el viejo gate de un solo intento
  // (`etapa.probPelea`), pero ninguno de esos intentos puede volverse
  // jugable (`permiteJugable:false` más abajo): TODA pelea de formación se
  // resuelve sola — ver el comentario grande de ETAPAS.
  //
  // v7, corrección del coordinador ("las lesiones tienen que costar de
  // verdad"): el gate de lesión YA NO se revisa acá, de una sola vez para
  // todo el año (ver `puedePelear`, injuries.js) — se mudó DENTRO de
  // `armarLotePeleas` (tramite.js), cupo por cupo, así que armarLotePeleas
  // se llama siempre que haya intentos, esté o no lesionado el jugador AL
  // ARRANCAR el bloque.
  const esProfesional = etapa.id === 'profesional';
  const intentos = esProfesional
    ? intentosDePelea(rng, jugadorActual)
    : (rng.chance(etapa.probPelea) ? 1 : 0);

  if (intentos > 0) {
    const forzarTitulo = esProfesional
      && jugadorActual.titulos.length === 0
      && (jugadorActual.ranking ?? 99) <= 3;
    // Un campeón indiscutido (los tres cinturones) elige, la mayoría de
    // los años, no arriesgar nada — ver permiteMarqueeEsteAnio (tramite.js)
    // para el porqué: sin este freno, "jugando bien" convierte cada año
    // que le queda de carrera en una defensa jugable más, reventando el
    // presupuesto de minutos sin sumarle nada al eje de cinturones (ya
    // resuelto). Los cupos de ESTE año siguen existiendo igual (la cuenta
    // de peleas profesionales totales no se toca) — se resuelven todos
    // como trámite.
    const permiteJugable = esProfesional && permiteMarqueeEsteAnio(rng, jugadorActual);
    // Cuántas semanas de calendario representa CADA cupo (ver el comentario
    // grande de armarLotePeleas, tramite.js): con más intentos en el año, el
    // año se reparte en ventanas más chicas — una lesión corta puede caer
    // entera dentro de una sola ventana y no costar nada; con pocos
    // intentos (veterano), cada ventana es casi el año entero.
    const semanasPorIntento = Math.round(semanasDeBloque(etapa.aniosPorBloque) / intentos);

    const lote = armarLotePeleas(rng, {
      jugador: jugadorActual,
      mundo: partida.mundo,
      etapa: tag,
      rivalidades: rivalidadesActuales,
      forzarTitulo,
      intentos,
      permiteJugable,
      tono: tag,
      semanasPorIntento,
      // Resumen de fin de año: la fecha de cada pelea de trámite (ver el
      // comentario grande en armarLotePeleas, tramite.js).
      semanaGlobal: partida.semanaGlobal,
    });

    jugadorActual = lote.jugador;
    rivalidadesActuales = lote.rivalidades;
    // Las peleas de trámite (si hubo) van ANTES que la jugable: narran "el
    // año fue pasando" antes de llegar a la que de verdad importa.
    //
    // Pedidos 1/2 (v7): si el lote sacó un destacado (armarLotePeleas,
    // tramite.js — a lo sumo uno por lote, ver PROB_DESTACADO_TRAMITE), su
    // oferta todavía NO está resuelta (mismo criterio que `marqueeOferta`:
    // se juega de verdad, acá con el minijuego en vez de la crónica
    // completa) — se encola como su propio beat 'tramiteDestacado', que
    // main.js resuelve con card+minijuego y recién ahí aplica el resultado.
    // El resto del lote (si lo hay) NO se encola aparte: viaja DENTRO del
    // mismo beat como `resumenResto` (recortar un "Seguir" de más que no
    // aportaba nada — pedido del coordinador). Sin destacado, es la
    // síntesis de siempre.
    if (lote.destacadoOferta) {
      cola.push({
        tipo: 'tramiteDestacado',
        datos: {
          oferta: lote.destacadoOferta,
          alMejorDe: lote.alMejorDeDestacado,
          semanasPorIntento,
          resumenResto: lote.beatTramite ? lote.beatTramite.datos : null,
        },
      });
    } else if (lote.beatTramite) {
      cola.push(lote.beatTramite);
    }
    if (lote.marqueeOferta) {
      cola.push({ tipo: 'oferta', datos: { oferta: lote.marqueeOferta } });
      ofertaPendiente = { oferta: lote.marqueeOferta };
    }
    // El ranking se recalcula ACÁ (no solo una vez por bloque en
    // avanzarBloque): si el lote resolvió peleas de trámite, el próximo
    // cupo de este mismo bloque (o el forzarTitulo del bloque siguiente)
    // tiene que verlas reflejadas, no el ranking de antes de pelear. El
    // destacado (si lo hay) todavía no se resolvió, así que no participa acá
    // — su resultado recalcula el ranking recién en el próximo bloque
    // (avanzarBloque), igual que cualquier oferta jugable normal.
    if (lote.beatTramite) {
      jugadorActual = { ...jugadorActual, ranking: rankingDelJugador(partida.mundo, jugadorActual) };
    }
    // v7: si NINGÚN cupo de este año llegó a jugarse (todos se perdieron
    // por seguir lesionado en su momento — ver `bloqueados`, tramite.js), el
    // juego avisa por qué no llegó ninguna oferta. Si al menos uno se
    // recuperó a tiempo y sí hubo pelea (jugable, trámite, o el destacado
    // todavía pendiente de jugarse), no hace falta este aviso.
    if (!lote.marqueeOferta && !lote.destacadoOferta && !lote.beatTramite && lote.bloqueados > 0) {
      cola.push({ tipo: 'lesionSinOferta', datos: { lesion: jugadorActual.estado.lesion } });
    }
    // Cuántas ofertas le costó la lesión en total en la carrera (contador
    // acumulado, mismo criterio que `lesionesSufridas` en main.js): la
    // métrica real de si la regla "cualquier lesión bloquea" pesa de
    // verdad — ver el informe de balance de esta ronda.
    if (lote.bloqueados > 0) {
      jugadorActual = {
        ...jugadorActual,
        ofertasPerdidasPorLesion: (jugadorActual.ofertasPerdidasPorLesion ?? 0) + lote.bloqueados,
      };
    }
  }

  return {
    cola,
    rngEstado: rng.estado(),
    ofertaPendiente,
    jugador: jugadorActual,
    rivalidades: rivalidadesActuales,
    memoriaCartas: { evento: memoriaEvento, redes: memoriaRedes },
  };
}

// Firma la pelea que el jugador acaba de aceptar (y, si hubo negociación, ya
// tiene la bolsa final — ver main.js): en vez de ir directo al combate, arma
// el campamento de preparación (campamento.js: 2 o 3 beats, siempre con
// sparring) y lo mete AL FRENTE de lo que quede en la cola de este bloque.
// Deja `proximaPelea` con el semanaObjetivo real del campamento (unas pocas
// semanas, nunca un bloque entero) — recién ACÁ nace `proximaPelea`: es la
// única fuente que lee el panel de próxima pelea (panel-proxima.js). También
// limpia `ofertaPendiente`: la oferta que estaba "en camino" ya se resolvió
// (se firmó), así que deja de estar pendiente de decisión.
export function firmarPelea(partida, { oferta }) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);
  const { beats, semanaObjetivo, recientes } = armarBeatsCampamento(rng, {
    jugador: nueva.jugador,
    etapa: tagContenido(etapa.id, nueva.jugador),
    oferta,
    semanaInicial: nueva.semanaGlobal ?? 1,
    recientes: nueva.memoriaCartas?.campamento ?? [],
  });
  nueva.cola = [...beats, ...nueva.cola];
  nueva.proximaPelea = { oferta, semanaObjetivo };
  nueva.ofertaPendiente = null;
  nueva.memoriaCartas = { ...nueva.memoriaCartas, campamento: recientes };
  nueva.rngEstado = rng.estado();
  return nueva;
}

// Cancela la oferta que estuviera en danza este bloque (si la hay, todavía
// SIN firmar): la usan las cartas de riesgo (CARTAS_EVENTO/CARTAS_REDES,
// Task v3 "cartas nuevas") cuyo desenlace malo es "se te cae la pelea" — ver
// `caePelea` en resolverOpcion (events.js). armarCola siempre pone
// 'evento'/'redes' ANTES que 'oferta' en la cola del mismo bloque, así que si
// hay una oferta pendiente cuando se resuelve una de estas cartas, es SIEMPRE
// la que este mismo bloque acaba de generar (todavía no llegó el jugador a
// ese beat, mucho menos la firmó) — nunca una pelea ya firmada en curso de
// campamento (esos beats no son 'evento'/'redes'). Basta con sacar el beat
// 'oferta' de la cola y limpiar `ofertaPendiente`; si no había ninguna oferta
// en danza (`ofertaPendiente` ya null), no hace nada. No toca `proximaPelea`:
// a esta altura siempre es null (todavía no se firmó nada este bloque).
export function cancelarProximaPelea(partida) {
  if (!partida.ofertaPendiente) return partida;
  const nueva = clonarPartida(partida);
  nueva.cola = nueva.cola.filter((beat) => beat.tipo !== 'oferta');
  nueva.ofertaPendiente = null;
  return nueva;
}

export function siguienteBeat(partida) {
  if (partida.terminada) return { partida, beat: null };

  let nueva = clonarPartida(partida);

  if (nueva.cola.length === 0) {
    const etapa = etapaActual(nueva);
    if (nueva.bloque > etapa.bloques) {
      if (nueva.etapaIndice >= ETAPAS.length - 1) {
        nueva.terminada = true;
        nueva.beatActual = null;
        return { partida: nueva, beat: null };
      }
      nueva.etapaIndice += 1;
      nueva.bloque = 1;
    }
    if (nueva.bloqueGlobal > 1) nueva = avanzarBloque(nueva);

    // Resumen de fin de año (v12: el cruce de año calendario, no el fin de
    // bloque en sí — ver `cerrarAniosCruzados`): si avanzarBloque acaba de
    // cerrar uno o más años (siempre que bloqueGlobal>1, arriba), sus beats
    // ya vienen armados y filtrados en `beatsResumenAnio`, en orden
    // cronológico. Van AL FRENTE de la cola del bloque que arranca — antes
    // que la mejora obligatoria — y `beatsResumenAnio` se limpia ACÁ: es un
    // dato puramente transitorio, nunca debe sobrevivir más de este golpe.
    const beatsResumenAnio = nueva.beatsResumenAnio;
    nueva.beatsResumenAnio = [];

    const armado = armarCola(nueva);
    nueva.cola = [...beatsResumenAnio, ...armado.cola];
    nueva.rngEstado = armado.rngEstado;
    nueva.ofertaPendiente = armado.ofertaPendiente;
    // v6: armarCola puede resolver una o varias peleas de trámite EN EL ACTO
    // (ver armarLotePeleas, tramite.js) — jugador/rivalidades vuelven ya
    // actualizados, antes de que el jugador vea ningún beat de este bloque.
    nueva.jugador = armado.jugador;
    nueva.rivalidades = armado.rivalidades;
    nueva.memoriaCartas = { ...nueva.memoriaCartas, ...armado.memoriaCartas };
    nueva.bloque += 1;
    nueva.bloqueGlobal += 1;
  }

  const beat = nueva.cola.shift() ?? null;
  // Los beats de campamento (firmarPelea, más arriba) representan semanas de
  // verdad pasando mientras se prepara la pelea firmada: cada uno avanza el
  // calendario del tablero (semanaGlobal, calendario.js) lo que le toca, así
  // "faltan N semanas" en el panel de próxima pelea baja de verdad beat a
  // beat en vez de quedarse fijo hasta el próximo bloque.
  //
  // Resumen de fin de año (v12): este es el SEGUNDO lugar donde semanaGlobal
  // avanza (el primero es el salto grande de avanzarBloque, arriba) — y
  // antes de esta ronda era el que se escapaba: un campamento podía empujar
  // el calendario a un año calendario nuevo sin que nadie lo notara hasta el
  // próximo avanzarBloque, mucho más tarde. Se chequea el cruce ACÁ, en el
  // momento exacto en que pasa, con el mismo `cerrarAniosCruzados` que usa
  // avanzarBloque: si cruzó uno o más años, sus beats van AL FRENTE de lo
  // que quede en la cola (antes que el resto del campamento), así el
  // jugador los ve apenas terminen de cruzar, no al final del bloque.
  if (beat && (beat.tipo === 'campCarta' || beat.tipo === 'campSparring')) {
    const semanaAntes = nueva.semanaGlobal ?? 1;
    nueva.semanaGlobal = semanaAntes + (beat.datos.semanas ?? 0);
    const cierre = cerrarAniosCruzados({
      semanaAntes,
      semanaDespues: nueva.semanaGlobal,
      registroAnioActual: nueva.registroAnioActual,
      jugador: nueva.jugador,
      mundo: nueva.mundo,
    });
    nueva.registroAnioActual = cierre.registroAnioActual;
    if (cierre.beatsResumen.length > 0) {
      nueva.cola = [...cierre.beatsResumen, ...nueva.cola];
    }
  }
  nueva.beatActual = beat;
  nueva.historialBeats += beat ? 1 : 0;
  return { partida: nueva, beat };
}
