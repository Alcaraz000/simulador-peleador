import { crearPeleador, peleadorAleatorio, mediaDe } from './fighter.js';
import { PARODIAS } from '../content/parodies.js';

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
export function crearRoster(rng, {
  disciplina, categoria, cantidad = 10, apodosReservados = [],
}) {
  const roster = [];
  const nombresUsados = new Set();
  // El pool de APODOS (names.js) es chico (16) frente a un roster típico de
  // 10-12: sin este control, dos rivales activos con el MISMO apodo ("La
  // Bestia" Fulano contra "La Bestia" Mengano) salía en ~97% de las carreras
  // medidas — se sentía como un bug de contenido, no una coincidencia real de
  // boxeo. Mismo patrón que `nombresUsados` de acá arriba, aplicado también
  // al apodo.
  const apodosUsados = new Set(apodosReservados.filter(Boolean));

  for (const parodia of parodiasDe(disciplina, categoria, 'activo')) {
    if (roster.length >= cantidad) break;
    const peleador = crearDesdeParodia(parodia);
    roster.push(peleador);
    nombresUsados.add(peleador.nombre);
    if (peleador.apodo) apodosUsados.add(peleador.apodo);
  }

  let intentos = 0;
  while (roster.length < cantidad && intentos < cantidad * 50) {
    intentos += 1;
    const candidato = peleadorAleatorio(rng, {
      disciplina,
      categoria,
      media: rng.int(45, 75),
      personalidad: rng.pick(PERSONALIDADES),
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
  disciplina, categoria, cantidad, existente = [],
}) {
  const nuevos = [];
  const nombresUsados = new Set(existente.map((p) => p.nombre));
  const apodosUsados = new Set(existente.map((p) => p.apodo).filter(Boolean));

  let intentos = 0;
  while (nuevos.length < cantidad && intentos < Math.max(cantidad, 1) * 50) {
    intentos += 1;
    const candidato = peleadorAleatorio(rng, {
      disciplina,
      categoria,
      edad: rng.int(EDAD_DEBUT_MIN, EDAD_DEBUT_MAX),
      media: rng.int(MEDIA_DEBUT_MIN, MEDIA_DEBUT_MAX),
      personalidad: rng.pick(PERSONALIDADES),
    });
    intentarSumar(candidato, { roster: nuevos, nombresUsados, apodosUsados });
  }

  return nuevos;
}
