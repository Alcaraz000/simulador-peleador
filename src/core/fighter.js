import { crearAtributos, crearEstado, calcularMedia, aplicarModificadores, clamp } from './stats.js';
import { getDisciplina, pesosDe } from './disciplines.js';
import { ESTILOS, estilosDisponibles } from './styles.js';
import { NOMBRES, APELLIDOS, APODOS, NACIONALIDADES, NOMBRES_POR_PAIS, GIMNASIOS } from '../content/names.js';

export const CATEGORIAS = {
  pluma: { id: 'pluma', nombre: 'Peso pluma', pesoMin: 55, pesoMax: 57, alturaMedia: 170 },
  mediano: { id: 'mediano', nombre: 'Peso mediano', pesoMin: 70, pesoMax: 73, alturaMedia: 180 },
};

export const ORIGENES = [
  { id: 'barrio', nombre: 'El barrio', descripcion: 'Aprendiste a la mala, en la calle.', mods: { potencia: 3, menton: 3, tecnica: -3 } },
  { id: 'club', nombre: 'El club del barrio', descripcion: 'Escuelita, disciplina y horarios.', mods: { tecnica: 4, disciplinaPersonal: 5, potencia: -2 } },
  { id: 'familia', nombre: 'Familia de peleadores', descripcion: 'Lo tenés en la sangre.', mods: { iq: 5, tecnica: 2, menton: -2 } },
  { id: 'tarde', nombre: 'Arrancaste tarde', descripcion: 'Llegaste de grande, con hambre.', mods: { cardio: 4, disciplinaPersonal: 3, iq: -3 } },
];

export const EDAD_INICIAL = 15;

let contadorId = 0;
function nuevoId(prefijo = 'ftr') {
  contadorId += 1;
  return `${prefijo}_${Date.now().toString(36)}_${contadorId}`;
}

function baseAtributos(disciplina, mediaObjetivo) {
  const nivel = clamp(Math.round(mediaObjetivo), 1, 99);
  const valores = {};
  for (const clave of ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq']) {
    valores[clave] = nivel;
  }
  valores.grappling = getDisciplina(disciplina).usaGrappling ? nivel : 1;
  return crearAtributos(valores);
}

export function crearPeleador(opciones) {
  const {
    nombre, apodo, nacionalidad, disciplina, estilo, categoria,
    mano = 'derecha', altura, alcance, origen = 'barrio',
    esJugador = false, edad = EDAD_INICIAL, media = 40,
    gimnasio = GIMNASIOS[0], personalidad = 'respetuoso',
  } = opciones;

  if (!CATEGORIAS[categoria]) throw new Error(`Categoría desconocida: ${categoria}`);
  const disc = getDisciplina(disciplina);
  const est = ESTILOS[estilo];
  if (!est) throw new Error(`Estilo desconocido: ${estilo}`);
  if (!est.disciplinas.includes(disciplina)) {
    throw new Error(`El estilo ${estilo} no está disponible en ${disciplina}`);
  }
  const orig = ORIGENES.find((o) => o.id === origen);
  if (!orig) throw new Error(`Origen desconocido: ${origen}`);

  let atributos = baseAtributos(disciplina, media);
  let especiales = { disciplinaPersonal: 40, menton: 40 };

  for (const mods of [est.mods, orig.mods]) {
    const soloAtributos = {};
    const soloEspeciales = {};
    for (const [clave, valor] of Object.entries(mods)) {
      if (clave in atributos) soloAtributos[clave] = valor;
      else if (clave in especiales) soloEspeciales[clave] = valor;
    }
    atributos = aplicarModificadores(atributos, soloAtributos).resultado;
    especiales = aplicarModificadores(especiales, soloEspeciales).resultado;
  }

  if (!disc.usaGrappling) atributos.grappling = 1;

  const cat = CATEGORIAS[categoria];
  return {
    id: nuevoId(esJugador ? 'jug' : 'riv'),
    esJugador,
    nombre, apodo, nacionalidad,
    disciplina, estilo, categoria,
    mano,
    altura: altura ?? cat.alturaMedia,
    alcance: alcance ?? (altura ?? cat.alturaMedia) + 6,
    origen,
    edad,
    atributos,
    especiales,
    estado: crearEstado(),
    record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
    dinero: 0,
    fama: 0,
    titulos: [],
    defensas: 0,
    ranking: null,
    gimnasio,
    staff: [],
    lujos: [],
    historial: [],
    retirado: false,
    personalidad,
  };
}

export function peleadorAleatorio(rng, opciones = {}) {
  const disciplina = opciones.disciplina ?? 'boxeo';
  const categoria = opciones.categoria ?? rng.pick(Object.keys(CATEGORIAS));
  const estilo = opciones.estilo ?? rng.pick(estilosDisponibles(disciplina)).id;
  const nacionalidad = opciones.nacionalidad ?? rng.pick(NACIONALIDADES).codigo;
  const cat = CATEGORIAS[categoria];
  const altura = opciones.altura ?? cat.alturaMedia + rng.int(-6, 6);
  const pool = NOMBRES_POR_PAIS[nacionalidad] ?? { nombres: NOMBRES, apellidos: APELLIDOS };

  return crearPeleador({
    nombre: opciones.nombre ?? `${rng.pick(pool.nombres)} ${rng.pick(pool.apellidos)}`,
    apodo: opciones.apodo ?? rng.pick(APODOS),
    nacionalidad,
    disciplina,
    estilo,
    categoria,
    mano: opciones.mano ?? (rng.chance(0.2) ? 'zurda' : 'derecha'),
    altura,
    alcance: altura + rng.int(2, 10),
    origen: opciones.origen ?? rng.pick(ORIGENES).id,
    edad: opciones.edad ?? rng.int(19, 33),
    media: opciones.media ?? rng.int(40, 70),
    gimnasio: opciones.gimnasio ?? rng.pick(GIMNASIOS),
    personalidad: opciones.personalidad ?? 'respetuoso',
    esJugador: false,
  });
}

export function mediaDe(peleador) {
  return calcularMedia(peleador.atributos, pesosDe(peleador.disciplina));
}

export function recordTexto(peleador) {
  const { v, d, e } = peleador.record;
  return e > 0 ? `${v}-${d}-${e}` : `${v}-${d}`;
}
