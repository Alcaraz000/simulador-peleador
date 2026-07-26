import { crearAtributos, crearEstado, calcularMedia, aplicarModificadores, clamp } from './stats.js';
import { getDisciplina, pesosDe } from './disciplines.js';
import { ESTILOS, estilosDisponibles } from './styles.js';
import { NOMBRES, APELLIDOS, APODOS, NACIONALIDADES, NOMBRES_POR_PAIS, GIMNASIOS } from '../content/names.js';
import { crearEntrenadorDe } from './coach.js';
import { NICKNAMES } from '../content/nicknames.js';
import { sortearPorRareza } from './cards.js';

export const CATEGORIAS = {
  pluma: { id: 'pluma', nombre: 'Peso pluma', pesoMin: 55, pesoMax: 57, alturaMedia: 170 },
  mediano: { id: 'mediano', nombre: 'Peso mediano', pesoMin: 70, pesoMax: 73, alturaMedia: 180 },
};

// Pool de orígenes (Paso 2 de la creación): rareza + efectos distintos.
// Los normales quedan como en la v1 (sin tocarles los mods); se suman dos
// normales, dos raros y un legendario nuevos. Las legendarias no se
// nerfean: son raras (5% en repartirOrigenes) y pegan fuerte cuando tocan.
export const ORIGENES = [
  { id: 'barrio', nombre: 'El barrio', descripcion: 'Aprendiste a la mala, en la calle.', rareza: 'normal', mods: { potencia: 3, menton: 3, tecnica: -3 } },
  { id: 'club', nombre: 'El club del barrio', descripcion: 'Escuelita, disciplina y horarios.', rareza: 'normal', mods: { tecnica: 4, disciplinaPersonal: 5, potencia: -2 } },
  { id: 'familia', nombre: 'Familia de peleadores', descripcion: 'Lo tenés en la sangre.', rareza: 'normal', mods: { iq: 5, tecnica: 2, menton: -2 } },
  { id: 'tarde', nombre: 'Arrancaste tarde', descripcion: 'Llegaste de grande, con hambre.', rareza: 'normal', mods: { cardio: 4, disciplinaPersonal: 3, iq: -3 } },
  { id: 'amateur_de_toda_la_vida', nombre: 'Amateur de toda la vida', descripcion: 'Torneos federados desde los diez años: subiste a un cuadrilátero antes que a un colectivo solo.', rareza: 'normal', mods: { tecnica: 3, iq: 2, potencia: -2 } },
  { id: 'videos_viejos', nombre: 'VHS y madrugadas', descripcion: 'Aprendiste mirando peleas grabadas mil veces, cuadro por cuadro.', rareza: 'normal', mods: { tecnica: 3, defensa: 2, cardio: -2 } },
  { id: 'sangre_importada', nombre: 'Sangre importada', descripcion: 'Un familiar boxeó afuera y te dejó mañas que acá nadie enseña.', rareza: 'rara', mods: { tecnica: 4, velocidad: 3, disciplinaPersonal: -3 } },
  { id: 'becado_desde_pibe', nombre: 'Becado desde pibe', descripcion: 'Un sponsor te becó temprano: nutrición y material que la mayoría ni sueña.', rareza: 'rara', mods: { cardio: 4, potencia: 3, iq: -2 } },
  { id: 'sangre_de_campeon', nombre: 'Sangre de campeón', descripcion: 'Tu apellido ya es un cinturón colgado en la pared del gimnasio. Ahora te toca a vos.', rareza: 'legendaria', mods: { tecnica: 5, potencia: 4, iq: 4, cardio: -3 } },
];

/**
 * Reparte 2 orígenes sin repetir para el Paso 2 de la creación, respetando
 * la distribución de rarezas del proyecto (ver sortearPorRareza en cards.js
 * — el mismo algoritmo que ya usa repartirMejoras, reusado en vez de
 * reimplementado).
 */
export function repartirOrigenes(rng) {
  return sortearPorRareza(rng, ORIGENES, 2);
}

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
    // `apellido` es el contrato nuevo (v2: "solo apellido, no nombre
    // completo"); `nombre` sigue existiendo tal cual para no romper a los
    // NPCs (parodies.js, roster.js) ni ~20 archivos de test que ya lo usan.
    // Si viene `apellido`, gana: el peleador queda con `nombre = apellido`.
    nombre, apellido, apodo, apodoId, nacionalidad, disciplina, estilo, categoria,
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

  let nick = null;
  if (apodoId) {
    nick = NICKNAMES.find((n) => n.id === apodoId);
    if (!nick) throw new Error(`Apodo desconocido: ${apodoId}`);
  }

  // Cada estilo trae su entrenador (coach.js). Su aporte se hornea acá abajo
  // en `atributos`, exactamente igual que el estilo/origen/apodo: NO es un
  // overlay que solo pinte la UI. `entrenador.aporte` se conserva tal cual
  // en el peleador devuelto como desglose informativo ("de estos 69, 6 los
  // pone tu entrenador" — ver atributosConEntrenador en coach.js), pero el
  // número que de verdad pelea (media, ranking, ofertas) ya lo incluye.
  const entrenador = crearEntrenadorDe(estilo);

  let atributos = baseAtributos(disciplina, media);
  let especiales = { disciplinaPersonal: 40, menton: 40 };

  for (const mods of [est.mods, orig.mods, nick?.mods ?? {}, entrenador?.aporte ?? {}]) {
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
    nombre: apellido ?? nombre,
    apellido: apellido ?? null,
    apodo: apodo ?? nick?.nombre ?? null,
    apodoId: nick?.id ?? null,
    nacionalidad,
    disciplina, estilo, categoria,
    mano,
    altura: altura ?? cat.alturaMedia,
    alcance: alcance ?? (altura ?? cat.alturaMedia) + 6,
    origen,
    edad,
    atributos,
    especiales,
    entrenador,
    estado: crearEstado(),
    record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
    dinero: 0,
    fama: 0,
    titulos: [],
    defensas: 0,
    // Defensas exitosas del cinturón que tiene puesto AHORA MISMO, por id de
    // cinturón (ver CINTURONES en offers.js). A diferencia de `defensas`
    // (contador de por vida, usado en legacy.js/stats-carrera.js), este se
    // resetea a 0 cada vez que conquista ese cinturón, así el chip de
    // "defensa N de M" en la oferta (ui/screens/fight.js) siempre refleja el
    // reinado actual y no arrastra defensas de un cinturón distinto.
    defensasCinturon: {},
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

// "Apodo" Nombre — el formato que usan tablero, ficha, ranking y legado para
// presentar a un peleador. `apodo` puede faltar (guardado de antes de que
// existiera el sistema de apodos, o un rival generado sin uno): antes, media
// docena de pantallas interpolaban `jugador.apodo` sin resguardo y, con
// apodo null/undefined, mostraban literalmente `"null" Nombre` en pantalla
// (barrida final, cierre de ronda v3). Centralizar el formato acá hace que
// el resguardo valga para todos los lugares a la vez, no pantalla por
// pantalla.
export function nombreConApodo(peleador) {
  return peleador.apodo ? `"${peleador.apodo}" ${peleador.nombre}` : peleador.nombre;
}
