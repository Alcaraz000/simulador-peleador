import {
  ATRIBUTOS, crearAtributos, crearEstado, aplicarModificadores,
} from './stats.js';
import { getDisciplina } from './disciplines.js';
import { ESTILOS, estilosDisponibles } from './styles.js';
import { NOMBRES, APELLIDOS, APODOS, NACIONALIDADES, NOMBRES_POR_PAIS, GIMNASIOS } from '../content/names.js';
import { crearEntrenadorDe } from './coach.js';
import { NICKNAMES } from '../content/nicknames.js';
import { sortearTalento } from './talento.js';
import { sortearPorRareza } from './cards.js';
import { createRng } from './rng.js';

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

// Cuánta variación (en puntos, antes de recentrar la suma en 0) recibe cada
// atributo al repartir el nivel inicial de un peleador. Calibrado a mano
// (Task 1.2) para que, con la misma media objetivo, dos peleadores salgan
// con perfiles bien distintos (ej.: 55 de fuerza y 28 de cardio) sin que la
// media objetivo se corra más de un punto entero.
const DESVIO_ATRIBUTO_INICIAL = 22;

/**
 * Reparte los cuatro atributos alrededor de `mediaObjetivo`, DESIGUAL: ya no
 * arranca parejo (v13). Es la primera de las cuatro palancas de rejugabilidad
 * de la spec ("el reparto inicial"): un peleador puede salir con 55 de
 * fuerza y 28 de cardio, y esa asimetría obliga a elegir si tapar el agujero
 * o potenciar lo que ya tiene.
 *
 * Cada atributo recibe un desvío = promedio de dos tiradas uniformes (más
 * campana que una sola uniforme, para que lo típico sea "desigual pero no
 * extremo"). Los cuatro desvíos se recentran para sumar 0 antes de
 * aplicarlos, así el promedio de los cuatro atributos resultantes queda
 * dentro de un punto de `mediaObjetivo` (crearAtributos redondea y clampea
 * cada uno por separado: ahí puede colarse hasta 1 punto de resto).
 */
export function repartirAtributosIniciales(rng, mediaObjetivo) {
  const desvios = ATRIBUTOS.map(() => {
    const a = rng.float(-1, 1);
    const b = rng.float(-1, 1);
    return ((a + b) / 2) * DESVIO_ATRIBUTO_INICIAL;
  });
  const promedioDesvio = desvios.reduce((suma, d) => suma + d, 0) / desvios.length;
  const valores = {};
  ATRIBUTOS.forEach((clave, indice) => {
    valores[clave] = mediaObjetivo + (desvios[indice] - promedioDesvio);
  });
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
    // Todo el azar de acá adentro (el reparto inicial desigual, más abajo)
    // pasa por este rng — nunca por Math.random(). Sin uno explícito
    // (llamadas legacy, ~20 archivos de test, la creación del jugador en
    // create.js) cae a una semilla fija: determinista, sin sorpresas, hasta
    // que el Bloque 5/7 haga viajar un rng de verdad por esos caminos.
    rng = createRng(1),
  } = opciones;

  if (!CATEGORIAS[categoria]) throw new Error(`Categoría desconocida: ${categoria}`);
  // Solo valida que la disciplina exista (tira si no) — el reparto de
  // atributos ya no depende de ella (grappling dejó de ser un atributo
  // separado, se fundió en los cuatro nuevos).
  getDisciplina(disciplina);
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

  let atributos = repartirAtributosIniciales(rng, media);

  for (const mods of [est.mods, orig.mods, nick?.mods ?? {}, entrenador?.aporte ?? {}]) {
    const soloAtributos = {};
    for (const [clave, valor] of Object.entries(mods)) {
      if (clave in atributos) soloAtributos[clave] = valor;
    }
    atributos = aplicarModificadores(atributos, soloAtributos).resultado;
  }

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
    entrenador,
    // Talento (v13): cuánto le rinde entrenar y cuándo llega a su mejor
    // momento. Es la palanca principal de rejugabilidad — dos peleadores con
    // la misma media inicial pueden tener carreras completamente distintas.
    // NUNCA se muestra como número: el jugador lo intuye por lo que le dice
    // el entrenador y por lo que ve arriba del ring.
    talento: sortearTalento(rng),
    estado: crearEstado(),
    record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
    // Récord AMATEUR (v6, "las peleas amateur no cuentan ni en el ranking ni
    // en el historial"): las peleas de juvenil/amateur (formación, antes de
    // debutar profesional) suman ACÁ, nunca en `record`/`historial` de
    // arriba — así el récord que se muestra en el tablero (ranking, ficha,
    // legado) arranca en 0-0 el día del debut profesional, como en la vida
    // real. Ver `aplicarResultado` (offers.js): decide el destino mirando
    // `oferta.nivelPelea === 'amateur'`.
    recordAmateur: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
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
    // Historial amateur, mismo criterio que `recordAmateur` de arriba: las
    // peleas de formación (juvenil/amateur) viven acá, separadas del
    // historial profesional.
    historialAmateur: [],
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
    // Los NPC también necesitan el reparto inicial desigual (Task 1.2): se
    // arma con el mismo rng con semilla que ya viaja por roster.js, no con
    // uno nuevo — así el roster entero sigue siendo determinista con la
    // semilla de la partida.
    rng,
    esJugador: false,
  });
}

// v13: la media es el promedio simple de los cuatro atributos, redondeado.
// Deja de usar pesos por disciplina (calcularMedia, stats.js, ya no existe):
// esa es la aritmética que hace que "+4 en un atributo = +1 de media exacto".
export function mediaDe(peleador) {
  const suma = ATRIBUTOS.reduce((acc, clave) => acc + peleador.atributos[clave], 0);
  return Math.round(suma / ATRIBUTOS.length);
}

function textoDeRecord(record) {
  const { v, d, e } = record;
  return e > 0 ? `${v}-${d}-${e}` : `${v}-${d}`;
}

export function recordTexto(peleador) {
  return textoDeRecord(peleador.record);
}

// Récord amateur por separado (v6): mismo formato que `recordTexto`, pero
// sobre `recordAmateur` — para mostrarlo en algún lado (ficha, legado) sin
// mezclarlo nunca con el profesional.
export function recordAmateurTexto(peleador) {
  return textoDeRecord(peleador.recordAmateur ?? { v: 0, d: 0, e: 0 });
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

// Mismo resguardo que `nombreConApodo`, para los lugares que muestran SOLO
// el mote (sin el nombre al lado): marcador de pelea, chip de archirrival,
// título del campamento. Pedido 1 (v6, roster de 100): con un pool de solo
// 16 apodos posibles para ~95 rivales de relleno, la mayoría de los NPC
// generados quedan sin apodo (null) — antes, cualquier NPC tenía uno
// garantizado, así que este caso nunca pasaba en producción para un rival de
// verdad (solo para partidas guardadas viejas). Ahora es el camino normal.
export function apodoParaMostrar(peleador) {
  return peleador.apodo ?? peleador.nombre;
}
