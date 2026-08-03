import { crearPeleador, peleadorAleatorio, mediaDe } from './fighter.js';
import { PARODIAS } from '../content/parodies.js';
import { clamp } from './stats.js';

export const PERSONALIDADES = [
  'respetuoso', 'provocador', 'tramposo', 'showman', 'mentor', 'agresivo', 'mercenario',
];

// Agrega `candidato` a `roster` si su nombre no está en `nombresUsados`
// (se descarta y se avisa con `false` para que el llamador reintente); si su
// apodo ya está tomado, el candidato entra igual pero sin apodo — mismo
// criterio en crearRoster (altas iniciales) y generarDebutantes (altas a
// mitad de carrera, Pedido 2), factorizado acá para no duplicar la regla.
function intentarSumar(candidato, { roster, nombresUsados, apodosUsados }) {
  if (nombresUsados.has(candidato.nombre)) return false;
  nombresUsados.add(candidato.nombre);
  if (candidato.apodo) {
    if (apodosUsados.has(candidato.apodo)) {
      candidato.apodo = null;
    } else {
      apodosUsados.add(candidato.apodo);
    }
  }
  roster.push(candidato);
  return true;
}

export function parodiasDe(disciplina, categoria, rol = null) {
  return PARODIAS.filter(
    (p) => p.disciplina === disciplina && p.categoria === categoria && (rol === null || p.rol === rol),
  );
}

export function leyendasDe(disciplina) {
  return PARODIAS.filter((p) => p.rol === 'leyenda' && p.disciplina === disciplina);
}

/** Las máximas leyendas de un país — se usan en noticias, récords a superar y menciones. */
export function leyendasDeNacionalidad(codigo) {
  return PARODIAS.filter((p) => p.rol === 'leyenda' && p.nacionalidad === codigo);
}

export function crearDesdeParodia(parodia) {
  const peleador = crearPeleador({
    nombre: parodia.nombre,
    apodo: parodia.apodo,
    nacionalidad: parodia.nacionalidad,
    disciplina: parodia.disciplina,
    estilo: parodia.estilo,
    categoria: parodia.categoria,
    origen: 'familia',
    edad: parodia.edad,
    media: parodia.media,
    personalidad: parodia.personalidad,
  });
  peleador.esParodia = true;
  peleador.referencia = parodia.referencia;
  peleador.parodiaId = parodia.id;
  peleador.frase = parodia.frase;
  peleador.retirado = parodia.rol === 'leyenda';
  return peleador;
}

// `apodosReservados` (Task 6.3): además de los apodos que se van usando
// DENTRO del roster, el llamador puede reservar apodos de afuera — el caso
// real es el del jugador (career.js pasa `[jugador.apodo]`), para que un
// rival aleatorio no termine compartiendo apodo con el propio jugador (el
// pool "normal" de NICKNAMES, que arma el apodo del jugador, se superpone
// case por caso con el pool APODOS de los rivales).
// Qué proporción del roster comparte nacionalidad con el jugador. Sin esto
// las nacionalidades salían repartidas parejo (medido con 100 rivales: 18 del
// país del jugador contra 19+19+16+16+12 del resto), y una escalera NACIONAL
// de 18 peleadores no da para partirla en "elite del país" y "el resto" con
// sentido. Con ~40% local, el ranking nacional y el regional tienen cuerpo
// propio y el mundial sigue siendo mayoría extranjeros — que es exactamente
// el reparto que pidió el usuario para las cuatro divisiones.
export const FRACCION_LOCAL = 0.4;

export function crearRoster(rng, {
  disciplina, categoria, cantidad = 10, apodosReservados = [], nacionalidadLocal = null,
  // Nombres que este roster NO puede usar. Lo usa el roster AMATEUR para no
  // compartir un solo nombre con el profesional (pedido v17.5: "en el ranking
  // amateur no se comparten nombres con ninguno de los otros tres").
  nombresReservados = [],
  // Las parodias (leyendas y activos con nombre propio) son del circuito
  // profesional: el amateur se arma solo con peleadores generados.
  usarParodias = true,
}) {
  const roster = [];
  const nombresUsados = new Set(nombresReservados.filter(Boolean));
  // El pool de APODOS (names.js) es chico (16) frente a un roster típico de
  // 10-12: sin este control, dos rivales activos con el MISMO apodo ("La
  // Bestia" Fulano contra "La Bestia" Mengano) salía en ~97% de las carreras
  // medidas — se sentía como un bug de contenido, no una coincidencia real de
  // boxeo. Mismo patrón que `nombresUsados` de acá arriba, aplicado también
  // al apodo.
  const apodosUsados = new Set(apodosReservados.filter(Boolean));

  for (const parodia of usarParodias ? parodiasDe(disciplina, categoria, 'activo') : []) {
    if (roster.length >= cantidad) break;
    if (nombresUsados.has(parodia.nombre)) continue;
    const peleador = crearDesdeParodia(parodia);
    roster.push(peleador);
    nombresUsados.add(peleador.nombre);
    if (peleador.apodo) apodosUsados.add(peleador.apodo);
  }

  let intentos = 0;
  while (roster.length < cantidad && intentos < cantidad * 50) {
    intentos += 1;
    // La tirada de nacionalidad se consume SIEMPRE (aunque no haya país local),
    // para que el rng avance igual y una partida vieja no cambie de rumbo por
    // el simple hecho de existir esta rama.
    const tiradaLocal = rng.next();
    const candidato = peleadorAleatorio(rng, {
      disciplina,
      categoria,
      media: rng.int(45, 75),
      personalidad: rng.pick(PERSONALIDADES),
      nacionalidad: nacionalidadLocal && tiradaLocal < FRACCION_LOCAL ? nacionalidadLocal : undefined,
    });
    // Pedido 1 (v6, "el ranking tiene que ser una montaña", cantidad 12->100):
    // el pool de APODOS (names.js) tiene solo 16 entradas. Rechazar (continue)
    // un candidato con apodo repetido, como antes, agotaba `intentos` mucho
    // antes de llegar a 100 y dejaba el roster corto. `intentarSumar` ahora
    // deja entrar al candidato IGUAL pero sin apodo (null) en ese caso — no
    // repite ninguno (mismo espíritu que el fix original) y no le pone techo
    // al tamaño del roster: realista además, no todo boxeador en actividad
    // tiene un mote que lo siga. Solo el nombre repetido sigue rechazando.
    intentarSumar(candidato, { roster, nombresUsados, apodosUsados });
  }

  // Récord de arranque. Antes todo el roster nacía 0-0-0: un mundo entero de
  // profesionales sin una sola pelea, y con las divisiones nuevas (que ordenan
  // por media Y récord, ver divisiones.js) eso dejaba el puntaje reducido otra
  // vez a los atributos. Se deriva del peleador, no se sortea a lo loco: los
  // años sobre el ring dan la cantidad de peleas y la media manda el porcentaje
  // de victorias, así que el que es mejor tiene mejor récord y el veterano
  // tiene más historia. Determinista con la semilla, como todo acá.
  for (const peleador of roster) {
    if (!peleador.record) continue;
    const anios = Math.max(0, (peleador.edad ?? 22) - 20);
    const peleas = Math.min(42, Math.round(anios * rng.float(2.0, 3.4)));
    // Tasa de victorias de un profesional en actividad: un peleador de media
    // 70 anda por el 70%, uno de 85 casi no pierde y uno de 50 pierde más de
    // lo que gana. Con la tasa anterior (~53% en la media del roster) el
    // mundo entero quedaba cerca del 50%, y un jugador 3-0 se les ponía
    // arriba a todos de una: nadie tenía un récord que defender.
    const tasa = clamp(0.55 + (mediaDe(peleador) - 60) / 70, 0.42, 0.93);
    const v = Math.round(peleas * tasa);
    peleador.record = {
      ...peleador.record, v, d: peleas - v, e: 0, ko: Math.round(v * rng.float(0.2, 0.55)),
    };
  }

  roster.sort((a, b) => mediaDe(b) - mediaDe(a));
  roster.forEach((peleador, indice) => {
    peleador.ranking = indice + 1;
  });
  return roster;
}

// Edad de debut de una promesa nueva (Pedido 2, v6: "que aparezcan peleadores
// nuevos"): jóvenes que recién arrancan, muy por debajo de la media de un
// activo cualquiera (rng.int(45,75) en el relleno de arriba) — tienen que
// crecer, no llegar ya hechos.
const EDAD_DEBUT_MIN = 17;
const EDAD_DEBUT_MAX = 20;
const MEDIA_DEBUT_MIN = 30;
const MEDIA_DEBUT_MAX = 48;

/**
 * Genera `cantidad` peleadores nuevos ("debutantes"): promesas jóvenes y
 * flojas para reemplazar a quienes se retiran (ver avanzarMundo, world.js —
 * Pedido 2, "el ranking se achica solo, tienen que ir apareciendo nuevos").
 * Mismo criterio de dedup de nombre/apodo que `crearRoster`, pero contra un
 * roster YA EXISTENTE (`existente`, activo o retirado — un nombre no vuelve a
 * usarse ni siquiera si el original ya colgó los guantes) en vez de arrancar
 * de cero. No asigna `ranking` (eso lo hace `recalcularRankings`, que corre
 * sobre el roster completo después) ni retira a nadie: son altas, no bajas.
 */
export function generarDebutantes(rng, {
  disciplina, categoria, cantidad, existente = [], nacionalidadLocal = null,
  // Cuántos de esta camada TIENEN que ser del país local, pase lo que pase.
  // El sesgo probabilístico solo no alcanza: los locales se retiran en camada
  // (entraron juntos, envejecen juntos) y medido a 12 años el pool local se
  // caía de 25 a 11, con lo que el ranking nacional se desarmaba. Quien llama
  // (world.js) calcula cuántos faltan para el piso y los pide explícitos.
  forzarLocales = 0,
}) {
  const nuevos = [];
  const nombresUsados = new Set(existente.map((p) => p.nombre));
  const apodosUsados = new Set(existente.map((p) => p.apodo).filter(Boolean));

  let intentos = 0;
  while (nuevos.length < cantidad && intentos < Math.max(cantidad, 1) * 50) {
    intentos += 1;
    // Mismo sesgo local que el roster inicial (FRACCION_LOCAL). Sin esto la
    // camada nueva salía de cualquier país y, con los años, el pool local se
    // secaba: medido a 14 años, el ranking nacional se caía de 22 peleadores a
    // 11 y el regional quedaba con uno solo.
    const tiradaLocal = rng.next();
    // Insistir con el país local tiene un límite: el pool de nombres por país
    // es finito y, con el roster lleno, los candidatos repetidos se rechazan
    // uno tras otro. Pasada la mitad de los intentos se afloja y se acepta
    // cualquier nacionalidad — que el mundo NO se quede sin peleadores importa
    // más que el reparto por país (medido: sin esta salida, el roster activo
    // se caía de 100 a 6 en veinte temporadas).
    const insistiendo = intentos < Math.max(cantidad, 1) * 25;
    const debeSerLocal = Boolean(nacionalidadLocal) && insistiendo
      && (nuevos.length < forzarLocales || tiradaLocal < FRACCION_LOCAL);
    const candidato = peleadorAleatorio(rng, {
      disciplina,
      categoria,
      edad: rng.int(EDAD_DEBUT_MIN, EDAD_DEBUT_MAX),
      media: rng.int(MEDIA_DEBUT_MIN, MEDIA_DEBUT_MAX),
      personalidad: rng.pick(PERSONALIDADES),
      nacionalidad: debeSerLocal ? nacionalidadLocal : undefined,
    });
    intentarSumar(candidato, { roster: nuevos, nombresUsados, apodosUsados });
  }

  return nuevos;
}
