// Peleas de "trámite" (v6, rediseño de ritmo: "no todas las peleas se juegan
// igual" — la decisión de diseño central de esta ronda). Este módulo decide
// CUÁNTAS peleas caen en un bloque y resuelve las que no ameritan crónica
// completa (ver esPeleaImportante, offers.js) en un lote — nunca pinta nada,
// eso sigue siendo trabajo de main.js.
//
// El criterio completo (documentado también en el comentario grande de
// ETAPAS, career.js, y en esPeleaImportante, offers.js): una pelea se JUEGA
// COMPLETA (careo, campamento, ronda a ronda) cuando es de título, defensa,
// revancha, contra el archirrival, o una eliminatoria (define el ascenso al
// puesto de retador). Todo lo demás es trámite: se resuelve solo, en lote,
// con sabor (ver resumenLote), sin gastar los minutos del jugador.

import { clamp } from './stats.js';
import { getDisciplina } from './disciplines.js';
import { mediaDe } from './fighter.js';
import {
  generarOferta, aplicarResultado, esPeleaImportante,
  cinturonActual, proximoCinturon, puedeDisputar, CINTURONES,
} from './offers.js';
import { recuperar, puedePelear } from './injuries.js';
import { POOLS_TRAMITE } from '../content/tramite-lines.js';

// Cuántos cupos de pelea trae un año de carrera profesional, según la edad
// (Pedido 3, v6: "de joven se pelea más seguido... un pibe de 21 pelea
// cuatro o cinco veces al año; un campeón de 34 pelea dos"). La MAYORÍA de
// estos cupos van a ser trámite (ver armarLotePeleas): un pibe de 21 con
// cuatro o cinco peleas en el año casi siempre tiene UNA que importa (o
// ninguna) y el resto son cartelera de relleno que ni el jugador necesita
// jugar. Calibrado con scripts/_tune.mjs (ver el comentario de ETAPAS en
// career.js para los números medidos).
const BANDAS_FRECUENCIA_PRO = [
  { hasta: 22, min: 3, max: 3 },
  { hasta: 25, min: 2, max: 2 },
  { hasta: 29, min: 2, max: 2 },
  { hasta: 33, min: 1, max: 1 },
  { hasta: Infinity, min: 1, max: 1 },
];

function bandaDe(edad) {
  return BANDAS_FRECUENCIA_PRO.find((b) => edad <= b.hasta) ?? BANDAS_FRECUENCIA_PRO.at(-1);
}

// "Sube con lo que está en juego": defendiendo un cinturón (o ya calificado
// por ranking para el próximo) el circuito no te deja quieto — un campeón
// sigue activo, no descansa la temporada entera. Se refleja subiendo el TECHO
// del rango en vez de mover el piso: el mínimo de la banda de edad no
// cambia, pero el año puede estirarse uno más si hay algo grande en juego.
function conMuchoEnJuego(jugador) {
  return Boolean(cinturonActual(jugador)) || puedeDisputar(jugador, proximoCinturon(jugador));
}

export function intentosDePelea(rng, jugador) {
  const banda = bandaDe(Math.floor(jugador.edad));
  const max = conMuchoEnJuego(jugador) ? banda.max + 1 : banda.max;
  return rng.int(banda.min, max);
}

// Un campeón indiscutido (los tres cinturones puestos) ya escaló todo lo que
// el ranking le podía pedir. Sin este freno, medido con
// scripts/balance-sim.mjs: un "jugando bien" que corona los tres cinturones
// a mitad de carrera pasa el resto (a veces 8-10 años más) con CADA cupo de
// pelea convertido en una defensa del mundial — esPeleaImportante la marca
// esTitulo siempre, así que cada año de campeón indiscutido se volvía una
// pelea JUGABLE más, dispuesto el presupuesto de minutos muy por encima de
// los ~20 declarados sin sumarle nada al eje de cinturones (ya los tiene
// los tres). La cuenta de peleas PROFESIONALES totales no se toca (el año
// sigue trayendo sus cupos de trámite, ver intentosDePelea arriba) — lo que
// se apaga es la posibilidad de que ESTE año en particular sea la excepción
// que se juega completa: el campeón, la mayoría de los años, elige no
// arriesgar el cinturón en nada que no sea trámite. Esto no toca la
// frecuencia mientras el reinado todavía se está construyendo (subir a
// buscar el próximo cinturón, o la primera defensa recién ganado el
// mundial) — sólo el tramo final, ya consagrado.
const PROB_DESCANSO_CAMPEON_INDISCUTIDO = 0.8;

export function permiteMarqueeEsteAnio(rng, jugador) {
  const esCampeonIndiscutido = (jugador.titulos?.length ?? 0) >= CINTURONES.length;
  if (esCampeonIndiscutido && rng.chance(PROB_DESCANSO_CAMPEON_INDISCUTIDO)) return false;
  return true;
}

// Resultado rápido de una pelea de trámite: mismo criterio que el combate
// NPC-vs-NPC de `avanzarMundo` (world.js) — la diferencia de MEDIA empuja la
// probabilidad, con piso/techo para que ni el más flojo ni el más fuerte sea
// un resultado 100% cantado. Nunca hay empate (mismo criterio que
// avanzarMundo): un trámite es un resultado seco, no una pelea completa
// round a round. Deliberadamente NO tira lesión: el riesgo de lesión de
// verdad vive en las peleas que el jugador SÍ juega (ver cerrarPelea,
// main.js) — un combate de trámite lo maneja tu equipo, no vos.
function resolverResultadoRapido(rng, { jugador, oferta }) {
  const fuerza = mediaDe(jugador) - oferta.rivalMedia;
  const probJugador = clamp(0.5 + fuerza * 0.02, 0.12, 0.88);
  const ganaJugador = rng.chance(probJugador);
  const porKo = rng.chance(0.35);
  const disc = getDisciplina(jugador.disciplina);
  const tope = disc.roundsPorNivel[oferta.nivelPelea] ?? disc.roundsPorNivel.profesional;
  return {
    ganador: ganaJugador ? 'jugador' : 'rival',
    metodo: porKo ? 'ko' : 'decision',
    round: porKo ? rng.int(1, tope) : tope,
  };
}

// ===== Minijuego de trámite (Pedido 2, v7): "que se juegue un poco" ========
//
// Pedido textual del usuario: una tarjeta con el rival (media/rango/récord/
// estadísticas) y un botón "Simular pelea" que dispara un piedra-papel-
// tijera al mejor de 5, traducido a boxeo — y "según el minijuego el
// resultado de la pelea será diferente". Esto último es la parte que
// importa de verdad: el pick del jugador en cada ronda TIENE que pesar en
// el resultado, no ser una animación con botones sobre un marcador ya
// decidido de antemano. El ciclo de tres reusa el que YA existe entre
// estilos (styles.js: tecnico > noqueador > menton > tecnico, un triángulo
// cerrado dentro del grafo más grande de ESTILOS) — acá no es el estilo
// permanente del peleador, es la decisión TÁCTICA de una ronda puntual:
// boxear a distancia (tecnico), ir a buscar el nocaut (noqueador) o
// cerrarte en guardia a resistir (menton). Mismo lenguaje que el resto del
// juego ya le enseñó al jugador, no una mecánica pegada con cinta.
export const ACCIONES_MINIJUEGO = ['tecnico', 'noqueador', 'menton'];

const LE_GANA_A_MINIJUEGO = { tecnico: 'noqueador', noqueador: 'menton', menton: 'tecnico' };

/**
 * La acción del RIVAL que hace falta mostrar para que la ronda cierre con el
 * resultado ya decidido (`gana`): si el jugador ganó, el rival tiene que
 * haber jugado la acción que la del jugador vence; si perdió, la que lo
 * vence a él. El ciclo de 3 solo tiene una respuesta posible para cada caso,
 * así que esto no consume rng — es pura consecuencia del ciclo.
 */
export function accionRivalDe(accionJugador, gana) {
  if (gana) return LE_GANA_A_MINIJUEGO[accionJugador];
  return ACCIONES_MINIJUEGO.find((a) => LE_GANA_A_MINIJUEGO[a] === accionJugador);
}

// Probabilidad "de fondo" de ganar CADA ronda del minijuego, según la
// diferencia de MEDIA: mismo criterio que `resolverResultadoRapido`, con un
// factor más suave (0.016 en vez de 0.02) y un piso/techo más angosto
// (16%-84% en vez de 12%-88%) porque esto se compone hasta 5 veces (una
// pelea puede necesitar hasta 5 rondas para definirse) — con el factor "por
// pelea" de resolverResultadoRapido, aplicado ronda a ronda, una diferencia
// de media moderada ya da un resultado casi cantado de punta a punta (0.7^3
// es 34%). Esto NO es la probabilidad de ganar la RONDA a secas — ver
// `resolverRondaMinijuego`, más abajo: es el sesgo con el que el RIVAL
// "adivina" tu jugada, corrección del coordinador ("la media entra como
// sesgo en la elección del rival, no como resultado predeterminado").
const PISO_PROB_RONDA = 0.16;
const TECHO_PROB_RONDA = 0.84;
const FACTOR_PROB_RONDA = 0.016;

function probRondaJugador(jugador, rivalMedia) {
  const fuerza = mediaDe(jugador) - rivalMedia;
  return clamp(0.5 + fuerza * FACTOR_PROB_RONDA, PISO_PROB_RONDA, TECHO_PROB_RONDA);
}

// Corrección del coordinador ("el pick del jugador no puede ser cosmético"):
// la ronda se juega de verdad, piedra-papel-tijera contra lo que elige el
// rival — el resultado sale de comparar las dos elecciones en el ciclo, no
// de un marcador ya decidido de antemano. La MEDIA entra como sesgo en la
// elección del RIVAL (un rival muy superior "adivina" más seguido la acción
// que te gana; uno inferior se equivoca más), nunca fijando el resultado
// directo — así el pick del jugador de verdad mueve la aguja: un pibe
// parejo puede robarse una ronda, y hasta la pelea entera.
//
// Reparto de probabilidad para la acción del rival, dado el pick del
// jugador: con EMPATE_BASE fija (misma que le tocaría a un empate si las
// tres opciones fueran elegidas al azar, 1/3) y el resto repartido según
// `probRondaJugador` — con la media pareja (p=0.5) esto reproduce EXACTO un
// piedra-papel-tijera al azar (1/3, 1/3, 1/3): la ventaja de media no hace
// nada raro cuando no hay ventaja. Un empate (el rival elige lo mismo que
// vos) no se le muestra al jugador como tal: se define en el momento con el
// mismo criterio de siempre (probRondaJugador), y se traduce a la acción
// del rival que sea consistente con ESE desenlace — nunca un segundo golpe
// de rng "visible" ni un round extra que no cuenta.
const EMPATE_BASE_MINIJUEGO = 1 / 3;

/**
 * Resuelve UNA ronda del minijuego de verdad: el rival "elige" con el rng
 * (con semilla, nunca Math.random) sesgado por la diferencia de media, y el
 * resultado sale de comparar esa elección con la del jugador en el ciclo.
 * Quien llama (main.js) es responsable de pasar el rng de sesión (mismo
 * criterio que la pelea completa real, fight-interactive.js vía
 * crearPelea/avanzarPelea: el rng de una sesión interactiva no necesita
 * viajar en `partida.rngEstado`, porque su EFECTO se hornea en el jugador
 * recién al cerrar la pelea — ver aplicarResultado).
 */
export function resolverRondaMinijuego(rng, { jugador, rivalMedia, eleccionJugador }) {
  const p = probRondaJugador(jugador, rivalMedia);
  const pesoJugador = (1 - EMPATE_BASE_MINIJUEGO) * p;
  const pesoRival = (1 - EMPATE_BASE_MINIJUEGO) * (1 - p);
  const desenlace = rng.weighted([
    { valor: 'jugador', peso: pesoJugador },
    { valor: 'rival', peso: pesoRival },
    { valor: 'empate', peso: EMPATE_BASE_MINIJUEGO },
  ]);
  const ganaJugador = desenlace === 'empate' ? rng.chance(p) : desenlace === 'jugador';
  const eleccionRival = accionRivalDe(eleccionJugador, ganaJugador);
  return { eleccionRival, resultado: ganaJugador ? 'jugador' : 'rival' };
}

// Corrección del coordinador (punto 2, "bajar los minutos"): antes de tocar
// la frecuencia de destacados, la primera palanca es que una paliza no
// necesite cinco rondas — con una diferencia de media grande (>=15, la
// misma magnitud que evaluarRiesgo en offers.js ya trata como riesgo "alto"
// con la mitad de eso) el combate se juega al mejor de 3 en vez de 5. Con
// media pareja sigue siendo al mejor de 5, que es donde el vaivén ronda a
// ronda se disfruta más.
const UMBRAL_PALIZA = 15;

/** Al mejor de cuántas rondas se juega el minijuego: 3 si la diferencia de
 * media es grande (>=UMBRAL_PALIZA, para cualquiera de los dos lados), 5 si
 * es pareja. Puro — no consume rng. */
export function alMejorDeCuantos(jugador, rivalMedia) {
  const diferencia = Math.abs(mediaDe(jugador) - rivalMedia);
  return diferencia >= UMBRAL_PALIZA ? 3 : 5;
}

/** Cuántas rondas hace falta ganar para cerrar el combate, según `alMejorDe`
 * (3 o 5 — ver alMejorDeCuantos). Exportada: main.js la usa para saber
 * cuándo cortar el loop de rondas del minijuego. */
export function rondasParaGanar(alMejorDe) {
  return Math.ceil(alMejorDe / 2);
}

// La tabla marcador -> resultado que pidió el usuario, textual: "3 a 0 es un
// KO, 3 a 1 es por puntos (decisión unánime), 3 a 2 es decisión dividida" —
// simétrica para la derrota. Generalizada para cualquier "mejor de N"
// (`alMejorDe`, ver UMBRAL_PALIZA arriba): 0 rondas para el perdedor es
// siempre KO; el margen más angosto posible (el perdedor se quedó a una
// ronda de forzar un empate) es "dividida"; cualquier otro es "unánime". En
// el mejor de 3 esto da solo dos desenlaces posibles (KO o dividida, nunca
// "unánime" — con tan pocas rondas no hay margen para un intermedio), y en
// el mejor de 5 reproduce EXACTO la tabla que pidió el usuario (0->ko,
// 1->unánime, 2->dividida).
function detalleDeMarcador(rondasPerdedor, alMejorDe) {
  const necesarias = rondasParaGanar(alMejorDe);
  if (rondasPerdedor === 0) return 'ko';
  if (rondasPerdedor === necesarias - 1) return 'dividida';
  return 'unanime';
}

/** Traduce un marcador ({jugador,rival}, cantidad de rondas ganadas por
 * cada uno) al resultado de la pelea, según `alMejorDe` (3 o 5). */
export function resultadoDeMarcador(marcador, alMejorDe) {
  const ganaJugador = marcador.jugador > marcador.rival;
  const rondasPerdedor = ganaJugador ? marcador.rival : marcador.jugador;
  const detalle = detalleDeMarcador(rondasPerdedor, alMejorDe);
  return {
    ganador: ganaJugador ? 'jugador' : 'rival',
    metodo: detalle === 'ko' ? 'ko' : 'decision',
    detalle,
  };
}

/** El round en que "cae" el historial, para el registro: un KO puede caer
 * en cualquier round hasta el tope de la disciplina/nivel; una decisión
 * llega justo al tope — mismo criterio que `resolverResultadoRapido`. Lo
 * arma quien cierra el minijuego (main.js), con el rng de sesión. */
export function roundDeCierreMinijuego(rng, { jugador, oferta, metodo }) {
  const disc = getDisciplina(jugador.disciplina);
  const tope = disc.roundsPorNivel[oferta.nivelPelea] ?? disc.roundsPorNivel.profesional;
  return metodo === 'ko' ? rng.int(1, tope) : tope;
}

// Qué tan seguido un lote de trámite saca un destacado jugable con
// card+minijuego (ver el comentario grande en `armarLotePeleas`, más abajo,
// para el porqué del número). Corrección del coordinador (punto 2, "bajá
// hasta acercarte a 21-22 minutos como techo"): con 0.3 (~6 destacados por
// carrera) el estimado quedaba en ~26 min incluso con `alMejorDeCuantos`
// (mejor de 3 para las palizas) ya aplicado — la baseline SIN ningún
// destacado (Pedidos 1/2 apagados del todo) ya mide ~22.3 min por su cuenta
// (ver el informe de balance entregado con esta ronda), así que ~21-22 de
// TECHO total deja casi cero margen para el minijuego. Ante esa disyuntiva,
// "menos destacados y que los que salgan se sientan" (pedido explícito del
// coordinador) es la prioridad: 0.1 deja ~2 destacados por carrera.
const PROB_DESTACADO_TRAMITE = 0.1;

const NUMERO = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'];
const numero = (n) => NUMERO[n] ?? String(n);
const capitalizar = (s) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1));

function cantidadTexto(n) {
  return n === 1 ? 'Una pelea' : `${capitalizar(numero(n))} peleas`;
}

function koTexto(kos, victorias) {
  if (kos === 0) return '';
  if (kos === 1) return ', una por nocaut';
  if (kos === victorias) return ', todas por nocaut';
  return `, ${numero(kos)} por nocaut`;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Resumen con sabor de un lote de peleas de trámite ya resueltas. `tono`
 * ('amateur' | 'juvenil' | 'profesional' | 'veterano') elige la voz — ver
 * content/tramite-lines.js. Puro (no consume rng para nada que no sea elegir
 * la variante de texto — mismo criterio que el resto del "sabor" del juego,
 * p.ej. LINEAS en fight.js).
 */
export function resumenLote(rng, { resultados, tono = 'profesional' }) {
  const victorias = resultados.filter((r) => r.resultado === 'v').length;
  const derrotas = resultados.length - victorias;
  const kos = resultados.filter(
    (r) => r.resultado === 'v' && (r.metodo === 'ko' || r.metodo === 'tko'),
  ).length;

  const poolKey = tono === 'juvenil' ? 'amateur' : tono;
  const pool = POOLS_TRAMITE[poolKey] ?? POOLS_TRAMITE.profesional;

  let categoria;
  if (resultados.length === 1) {
    categoria = victorias === 1 ? 'unaGanada' : 'unaPerdida';
  } else if (derrotas === 0) {
    categoria = 'perfecta';
  } else if (victorias === 0) {
    categoria = 'derrotas';
  } else {
    categoria = 'mixta';
  }

  const datos = {
    cantidad: cantidadTexto(resultados.length),
    record: `${victorias}-${derrotas}`,
    ko: koTexto(kos, victorias),
  };

  return {
    titulo: poolKey === 'amateur' ? 'Circuito amateur' : 'Mientras tanto...',
    texto: rellenar(rng.pick(pool[categoria]), datos),
    victorias,
    derrotas,
  };
}

// v7, corrección del coordinador ("las lesiones tienen que costar de
// verdad, evaluadas semana a semana, no una vez por bloque"): antes, el
// gate de lesión vivía ENTERO en career.js/armarCola, evaluado UNA sola vez
// por bloque, contra el estado de la lesión tal cual quedó al CIERRE del
// bloque anterior — así que un salto instantáneo de 52 semanas (avanzarBloque)
// siempre corría ANTES de esa única revisión, y cualquier lesión de 52
// semanas o menos ya aparecía curada la primera vez que se la miraba. Cero
// costo real para ceja/nariz/costillas/mano/hombro; la cirugía no cambiaba
// nada.
//
// Ahora cada CUPO (`intentos`, más abajo) representa una porción del año —
// `semanasPorIntento` semanas, calculadas en career.js como
// `semanasDeBloque(...) / intentos` — y la revisión de "¿puede pelear
// AHORA?" pasa a hacerse cupo por cupo, en el momento puntual en que ese
// cupo se juega, no una vez para todo el año. Si el jugador sigue
// lesionado EN ESE MOMENTO, el cupo se pierde del todo (ni oferta ni
// trámite: nadie te ofrece nada estando de baja) y esas semanas se
// descuentan de lo que falta para recuperarse (`recuperar`, injuries.js) —
// si con eso alcanza para curarse, el PRÓXIMO cupo del mismo bloque (si lo
// hay) ya lo encuentra sano y genera una oferta real. Consecuencia directa:
// un pibe de 21 con tres cupos por año pierde SOLO los cupos que caen
// mientras sigue de baja, nunca el año entero salvo que la lesión sea larga
// de verdad; un veterano con un único cupo por año, en cambio, pierde el
// año completo si le toca estar lesionado justo en ese momento — igual que
// en el boxeo real, menos actividad significa menos margen para el error.
function cupoBloqueadoPorLesion(jugadorActual, semanasPorIntento) {
  if (puedePelear(jugadorActual)) return { bloqueado: false, jugador: jugadorActual };
  const paso = recuperar(jugadorActual, { semanas: semanasPorIntento });
  return { bloqueado: true, jugador: paso.peleador };
}

/**
 * Arma (y resuelve la mayoría de) el lote de peleas de un bloque: hasta
 * `intentos` cupos, de los cuales como MUCHO el primero que de verdad se
 * juega puede terminar siendo una pelea que importa (ver esPeleaImportante)
 * — el resto son siempre de trámite (nivel regional forzado, ver
 * `soloRegional` en generarOferta). Si ese cupo SÍ importa, se lo deja
 * afuera del lote (`marqueeOferta`): esa la juega el jugador de verdad
 * (career.js la encola como beat 'oferta'). Si no, y el lote sacó destacado
 * esta vez (PROB_DESTACADO_TRAMITE, ver arriba), el primer cupo de trámite
 * TAMPOCO se resuelve acá — se devuelve sin resolver (`destacadoOferta`,
 * junto con `alMejorDeDestacado`): el jugador lo juega de verdad con el
 * minijuego (career.js lo encola como beat 'tramiteDestacado'). El resto de
 * los cupos (si los hay) sí se resuelven acá mismo, en el momento.
 *
 * `permiteJugable=false` (juvenil/amateur): NINGÚN cupo puede volverse
 * jugable — la etapa de formación entera se resuelve sola (ver el criterio
 * en el comentario grande de ETAPAS, career.js). Esas etapas tampoco pueden
 * tener una lesión activa (nunca juegan una pelea de verdad, único origen de
 * una lesión — ver cerrarPelea, main.js), así que el gate de acá abajo nunca
 * las afecta en la práctica.
 *
 * `semanasPorIntento` (v7): cuántas semanas de calendario representa CADA
 * cupo, para el gate de lesión (ver `cupoBloqueadoPorLesion`, arriba). El
 * default (52) es una red de seguridad para llamadores que no lo pasen
 * (equivale al viejo comportamiento "un cupo = el año entero").
 *
 * No muta `jugador` ni `rivalidades`; el `rng` sí viaja mutado (mismo
 * contrato que el resto de career.js: quien llama guarda `rng.estado()`).
 *
 * Devuelve además `bloqueados`: cuántos cupos de ESTE lote se perdieron por
 * seguir lesionado en ese momento — es la métrica real de "cuántas ofertas
 * le costó la lesión" (career.js la usa para decidir si hace falta avisar
 * con el beat 'lesionSinOferta', y scripts/balance-sim.mjs la suma para
 * medir el costo de la regla sobre una carrera completa).
 */
export function armarLotePeleas(rng, {
  jugador, mundo, etapa, rivalidades = [], forzarTitulo = false, intentos, permiteJugable = true, tono = 'profesional',
  semanasPorIntento = 52,
}) {
  let jugadorActual = jugador;
  const excluidos = [];
  let marqueeOferta = null;
  const resultados = [];
  let bloqueados = 0;
  // Reemplaza al viejo `i === 0`: el "primer cupo" (el único que puede
  // volverse jugable/forzar título) ahora es el primero que de verdad se
  // JUEGA — si los primeros cupos del año se pierden por lesión, el que
  // sigue en cuanto se cura hereda esa chance, no se pierde para siempre.
  let primerCupoDisponible = true;
  // Pedidos 1/2 (v7, "que se anuncie antes" + "que se juegue un poco"): DE
  // TODO el lote, a lo sumo el primer combate que de verdad se resuelve como
  // trámite (no marquee) se aparta como "destacado" — mismo criterio que
  // `marqueeOferta`: su oferta se devuelve SIN resolver (`destacadoOferta`,
  // más abajo) para que el jugador la juegue de verdad con el minijuego
  // (ver beatTramiteDestacado, main.js) — acá NO se le aplica ningún
  // resultado. El resto, si el año trae más de un cupo de trámite, se sigue
  // resolviendo en el momento con el viejo resultado seco
  // (resolverResultadoRapido).
  //
  // Y ni siquiera CADA lote saca uno: medido con scripts/balance-sim.mjs,
  // "un destacado por cada lote que tenga trámite" salía a ~19 por carrera
  // — reventaba el presupuesto de ~20 minutos por completo (quedaba en
  // ~36). Bajarlo a "a veces" (PROB_DESTACADO_TRAMITE) es la palanca que de
  // verdad importa acá: sigue cumpliendo "no aparece de la nada" para los
  // que SÍ salen destacados, sin convertir cada año de trámite en su propia
  // mini-pelea. 0.3 deja ~6-7 destacados por carrera (sumado a las ~6
  // jugables de siempre) — ver el informe de balance entregado con esta
  // ronda para el número final, ajustado también con `alMejorDeCuantos`
  // (menos rondas cuando la diferencia de media es grande).
  let faltaElegirDestacado = rng.chance(PROB_DESTACADO_TRAMITE);
  let destacadoOferta = null;
  let alMejorDeDestacado = null;

  for (let i = 0; i < intentos; i += 1) {
    const { bloqueado, jugador: jugadorTrasChequeo } = cupoBloqueadoPorLesion(jugadorActual, semanasPorIntento);
    jugadorActual = jugadorTrasChequeo;
    if (bloqueado) {
      bloqueados += 1;
      continue;
    }

    const primerCupo = primerCupoDisponible && permiteJugable && !marqueeOferta;
    const oferta = generarOferta(rng, {
      jugador: jugadorActual,
      mundo,
      etapa,
      rivalidades,
      forzarTitulo: primerCupo && forzarTitulo,
      soloRegional: !primerCupo,
      excluirIdsExtra: excluidos,
    });
    if (!oferta) continue; // sin rivales disponibles (rarísimo, roster agotado)
    primerCupoDisponible = false;
    excluidos.push(oferta.rivalId);

    if (primerCupo && esPeleaImportante(oferta)) {
      marqueeOferta = oferta;
      continue;
    }

    if (faltaElegirDestacado) {
      destacadoOferta = oferta;
      alMejorDeDestacado = alMejorDeCuantos(jugadorActual, oferta.rivalMedia);
      faltaElegirDestacado = false;
      continue;
    }

    const resultado = resolverResultadoRapido(rng, { jugador: jugadorActual, oferta });
    const paso = aplicarResultado(jugadorActual, { oferta, resultado, modo: 'tramite' });
    jugadorActual = paso.jugador;
    resultados.push({
      rivalNombre: oferta.rivalNombre,
      rivalApodo: oferta.rivalApodo,
      resultado: resultado.ganador === 'jugador' ? 'v' : 'd',
      metodo: resultado.metodo,
      bolsa: oferta.bolsa,
    });
  }

  const beatTramite = resultados.length > 0
    ? { tipo: 'peleasResueltas', datos: { resultados, ...resumenLote(rng, { resultados, tono }) } }
    : null;

  return {
    marqueeOferta, destacadoOferta, alMejorDeDestacado, beatTramite, jugador: jugadorActual, rivalidades, bloqueados,
  };
}
