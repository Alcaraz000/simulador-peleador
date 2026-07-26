import { crearPeleador, peleadorAleatorio, mediaDe } from './fighter.js';
import { PARODIAS } from '../content/parodies.js';

export const PERSONALIDADES = [
  'respetuoso', 'provocador', 'tramposo', 'showman', 'mentor', 'agresivo', 'mercenario',
];

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
    if (nombresUsados.has(candidato.nombre)) continue;
    if (candidato.apodo && apodosUsados.has(candidato.apodo)) continue;
    nombresUsados.add(candidato.nombre);
    if (candidato.apodo) apodosUsados.add(candidato.apodo);
    roster.push(candidato);
  }

  roster.sort((a, b) => mediaDe(b) - mediaDe(a));
  roster.forEach((peleador, indice) => {
    peleador.ranking = indice + 1;
  });
  return roster;
}
