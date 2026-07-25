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

export function crearRoster(rng, { disciplina, categoria, cantidad = 10 }) {
  const roster = [];
  const nombresUsados = new Set();

  for (const parodia of parodiasDe(disciplina, categoria, 'activo')) {
    if (roster.length >= cantidad) break;
    const peleador = crearDesdeParodia(parodia);
    roster.push(peleador);
    nombresUsados.add(peleador.nombre);
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
    nombresUsados.add(candidato.nombre);
    roster.push(candidato);
  }

  roster.sort((a, b) => mediaDe(b) - mediaDe(a));
  roster.forEach((peleador, indice) => {
    peleador.ranking = indice + 1;
  });
  return roster;
}
