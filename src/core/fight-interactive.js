import { createRng } from './rng.js';
import { clamp } from './stats.js';
import { simularRound } from './fight.js';

export const UMBRAL_GROGGY = 22;
export const VENTANA_MS = 3200;

export const INSTRUCCIONES_RINCON = {
  acelerar: {
    id: 'acelerar',
    nombre: 'Pisá el acelerador',
    texto: 'Ir a buscarlo. Das vuelta las tarjetas si aguantás el gas.',
    plan: 'frente',
    mods: { aguanteRival: -4, fatigaJugador: 6, ventanaGolpe: 0.05 },
  },
  respirar: {
    id: 'respirar',
    nombre: 'Boxeá y respirá',
    texto: 'Movés y tocás sin arriesgar. Recuperás fatiga.',
    plan: 'aguantar',
    mods: { aguanteRival: 0, fatigaJugador: -10, ventanaGolpe: 0 },
  },
  cuerpo: {
    id: 'cuerpo',
    nombre: 'Todo al cuerpo',
    texto: 'Castigás el cuerpo. Le abrís la puerta al nocaut.',
    plan: 'afuera',
    mods: { aguanteRival: -8, fatigaJugador: 3, ventanaGolpe: 0.18 },
  },
};

export const ZONAS_GOLPE = {
  menton: { id: 'menton', nombre: 'Mentón', dificultad: 0.75, danoBase: 60 },
  sien: { id: 'sien', nombre: 'Sien', dificultad: 0.5, danoBase: 42 },
  higado: { id: 'higado', nombre: 'Hígado', dificultad: 0.3, danoBase: 34 },
};

// Posturas del rival groggy: cada una decide qué zona queda `abierto`
// (la que se puede clavar), cuál `riesgoso` y cuál `tapado`. Exactamente una
// zona abierta y una tapada por postura (el resto, riesgosa) — así el golpe
// de gracia siempre tiene una lectura clara: "acá está la abertura".
export const POSTURAS = {
  guardia_alta: {
    id: 'guardia_alta',
    nombre: 'Guardia alta',
    descripcion: 'Guardia bien alta. Tiene la cara cerrada, pero el cuerpo quedó solo.',
    zonas: { menton: 'tapado', sien: 'riesgoso', higado: 'abierto' },
  },
  manos_abajo: {
    id: 'manos_abajo',
    nombre: 'Manos abajo',
    descripcion: 'Se le cayeron las manos de puro cansancio. El mentón quedó servido.',
    zonas: { menton: 'abierto', sien: 'tapado', higado: 'riesgoso' },
  },
  cubre_un_lado: {
    id: 'cubre_un_lado',
    nombre: 'Cubierto de un lado',
    descripcion: 'Se cubre de un costado nada más. Del otro lado no tiene nada.',
    zonas: { menton: 'riesgoso', sien: 'tapado', higado: 'abierto' },
  },
  contra_cuerdas: {
    id: 'contra_cuerdas',
    nombre: 'Contra las cuerdas',
    descripcion: 'Está contra las cuerdas, encogido, buscando dónde esconderse.',
    zonas: { menton: 'riesgoso', sien: 'abierto', higado: 'tapado' },
  },
};

const LISTA_POSTURAS = Object.values(POSTURAS);

// Compartido entre `abrirGolpeDeGracia` (previsualización) y
// `resolverGolpeDeGracia` (resolución real): ambos arrancan del mismo estado
// de RNG sin consumirlo (abrirGolpeDeGracia nunca persiste su rng), así que
// sortean siempre la misma postura para una misma pelea.
function sortearPostura(rng) {
  return rng.pick(LISTA_POSTURAS).id;
}

function zonaAbiertaDe(posturaId) {
  const { zonas } = POSTURAS[posturaId];
  return Object.keys(zonas).find((z) => zonas[z] === 'abierto');
}

function clonar(pelea) {
  return {
    ...pelea,
    aguante: { ...pelea.aguante },
    fatiga: { ...pelea.fatiga },
    tarjetas: { ...pelea.tarjetas },
    caidas: { ...pelea.caidas },
  };
}

export function avanzarPelea(pelea) {
  const paso = simularRound(pelea);
  if (paso.pelea.terminada) return { pelea: { ...paso.pelea, pendiente: null }, eventos: paso.eventos };

  const bonus = pelea.bonusVentana ?? 0;
  const rivalGroggy = paso.pelea.aguante.rival <= UMBRAL_GROGGY;
  const rng = createRng(paso.pelea.semilla);
  rng.restaurar(paso.pelea.rngEstado);
  const seAbre = rivalGroggy && rng.chance(clamp(0.45 + bonus, 0, 0.9));
  const rngEstado = rng.estado();

  return {
    pelea: { ...paso.pelea, rngEstado, pendiente: seAbre ? 'golpe' : 'rincon', bonusVentana: 0 },
    eventos: paso.eventos,
  };
}

// Qué instrucción es OBJETIVAMENTE la mejor jugada según cómo viene la
// pelea (diferencia en tarjetas + fatiga del jugador) — la lectura "de
// libro", la que tendría un entrenador perfecto e infalible. Cuatro casos:
//   - abajo en tarjetas y sin gas: hay que primero recuperar el aliento.
//   - abajo en tarjetas pero con gas: presionar para dar vuelta el marcador.
//   - arriba (o empatado) y sin gas: cuidar la ventaja, no regalar nada.
//   - arriba (o empatado) y con gas: buscar el nocaut mientras se puede.
//
// Esto NO es lo que el jugador ve en pantalla: es el criterio interno que
// alimenta a `consejoRincon` de abajo, que decide si tu entrenador de carne
// y hueso llega a leerla así (o ni siquiera abre la boca). Que esta función
// sea pura y determinista es justamente lo que la hace testeable con casos
// exactos (ver fight-interactive.test.js).
export function instruccionRecomendada(pelea) {
  const { jugador, rival } = pelea.tarjetas;
  const diferencia = jugador - rival;
  const cansado = pelea.fatiga.jugador > 60;
  if (diferencia < 0) return cansado ? 'respirar' : 'acelerar';
  return cansado ? 'respirar' : 'cuerpo';
}

// Techo del catálogo de entrenadores (src/content/coaches.js): la suma de
// aporte de Nicolino Lecho (tecnica 8 + iq 6 + velocidad 4 = 18), el
// entrenador legendario. Se usa para normalizar "qué tan bueno es ESTE
// cuerpo técnico" a 0-1 sin importar qué se agregue al catálogo más
// adelante (un entrenador más fuerte simplemente empuja el tope).
const APORTE_ENTRENADOR_TOPE = 18;

// Qué tan buena es la lectura del cuerpo técnico actual del jugador (Task
// v4, pedido textual: "fijate si el entrenador puede ser lo que determine
// qué tan seguido acierta ... sería coherente con que elegir entrenador
// importe"). Se deriva del aporte TOTAL que ya trae `crearPeleador`
// horneado en los atributos (coach.js) — sin inventar un stat nuevo: un
// entrenador que aporta más puntos en total es, por definición, uno mejor.
// Piso en 0.2 (nunca completamente ciego) y techo en 1 (nunca infalible por
// sí solo: la claridad de la situación también pesa, ver abajo).
function calidadEntrenador(pelea) {
  const aporte = pelea.snapshot?.jugador?.entrenador?.aporte ?? {};
  const total = Object.values(aporte).reduce((acc, v) => acc + Math.abs(v), 0);
  return clamp(total / APORTE_ENTRENADOR_TOPE, 0.2, 1);
}

// Qué tan clara está la pelea de leer, más allá de quién la mire: una
// diferencia grande en tarjetas o una fatiga bien lejos del umbral de
// "cansado" (60) es una lectura fácil hasta para un rincón mediocre. Cerca
// del empate y cerca del umbral, hasta el mejor entrenador puede leerla
// para cualquier lado.
function claridadSituacion(pelea) {
  const { jugador, rival } = pelea.tarjetas;
  const porTarjetas = clamp(Math.abs(jugador - rival) / 3, 0, 1);
  const porFatiga = clamp(Math.abs(pelea.fatiga.jugador - 60) / 40, 0, 1);
  return Math.max(porTarjetas, porFatiga);
}

// Con un cuerpo técnico flojo y una pelea muy pareja, el consejo puede
// directamente no llegar (silencio) casi 2 de cada 3 rounds; con el mejor
// entrenador y la pelea clarísima, casi siempre va a decir algo — pero
// nunca con el 100% de certeza (techo 0.9): el silencio también le puede
// tocar al mejor rincón alguna vez.
function probabilidadHabla(calidad, claridad) {
  return clamp(0.35 + calidad * 0.3 + claridad * 0.25, 0.15, 0.9);
}

// Cuando SÍ habla, esta es la chance de que acierte la jugada objetivamente
// correcta (`instruccionRecomendada`) en vez de tirar una de las otras dos.
// Ni el mejor entrenador con la lectura más clara es infalible (techo
// 0.97) — y un rincón mediocre en una pelea confusa puede estar más cerca
// de acertar por moneda al aire que por criterio (piso 0.35, apenas por
// encima de 1/3 al azar entre las tres opciones).
function probabilidadAcierta(calidad, claridad) {
  return clamp(0.5 + calidad * 0.3 + claridad * 0.2, 0.35, 0.97);
}

// El consejo que de verdad dice tu rincón este round — a diferencia de
// `instruccionRecomendada` (la jugada ideal, siempre la misma para un
// estado dado), esto puede no decir nada, o puede equivocarse. Task v4,
// pedido textual: "no quiero que [el tip] aparezca siempre ... que cuando
// lo haya no sea infalible". Usa el mismo patrón que `abrirGolpeDeGracia`
// (ver más abajo): arranca del rngEstado YA guardado en la pelea sin
// consumirlo/persistirlo, así que llamar esto varias veces sobre la MISMA
// pelea siempre da el mismo resultado (estable mientras se está mirando el
// rincón; solo cambia cuando avanza el round siguiente y el rngEstado real
// se mueve).
export function consejoRincon(pelea) {
  const entrenador = pelea.snapshot?.jugador?.entrenador ?? null;
  if (!entrenador) return null; // sin cuerpo técnico, no hay quién hable

  const calidad = calidadEntrenador(pelea);
  const claridad = claridadSituacion(pelea);

  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);

  if (!rng.chance(probabilidadHabla(calidad, claridad))) return null;

  const correcta = instruccionRecomendada(pelea);
  const acierta = rng.chance(probabilidadAcierta(calidad, claridad));
  const id = acierta
    ? correcta
    : rng.pick(Object.keys(INSTRUCCIONES_RINCON).filter((otro) => otro !== correcta));

  return { id, entrenadorNombre: entrenador.nombre };
}

export function estadoRincon(pelea) {
  const { jugador, rival } = pelea.tarjetas;
  const diferencia = jugador - rival;
  const tarjetasTexto = diferencia === 0
    ? `Empatado ${jugador}-${rival}`
    : diferencia > 0 ? `Vas ${jugador}-${rival} arriba` : `Vas ${jugador}-${rival} abajo`;

  let consejo;
  if (diferencia < 0 && pelea.fatiga.jugador > 60) {
    consejo = 'Te está afanando los rounds y venís sin gas. Elegí con qué te la juegás.';
  } else if (diferencia < 0) {
    consejo = 'Te está afanando los rounds con el jab. O le metés presión o esto se va en las tarjetas.';
  } else if (pelea.fatiga.jugador > 60) {
    consejo = 'Vas bien, pero estás fundido. Cuidá el gas y no regales nada.';
  } else {
    consejo = 'Lo tenés medido. Sostené el plan y no te apures.';
  }

  return {
    tarjetasTexto,
    fatigaJugador: Math.round(pelea.fatiga.jugador),
    fatigaRival: Math.round(pelea.fatiga.rival),
    aguanteRival: Math.round(pelea.aguante.rival),
    consejo,
    // El tip puntual ("tirá tal cosa"), aparte del comentario general de
    // arriba: puede venir null (el rincón no dice nada este round) o traer
    // una jugada que no sea la ideal (ver consejoRincon). `null` cuando no
    // hay entrenador o cuando no le tocó hablar.
    tip: consejoRincon(pelea),
  };
}

export function aplicarInstruccionRincon(pelea, instruccionId) {
  const instruccion = INSTRUCCIONES_RINCON[instruccionId];
  if (!instruccion) throw new Error(`Instrucción desconocida: ${instruccionId}`);
  const nueva = clonar(pelea);
  nueva.plan = instruccion.plan;
  nueva.aguante.rival = clamp(nueva.aguante.rival + instruccion.mods.aguanteRival, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + instruccion.mods.fatigaJugador, 0, 100);
  nueva.bonusVentana = instruccion.mods.ventanaGolpe;
  nueva.pendiente = null;
  return nueva;
}

export function abrirGolpeDeGracia(pelea) {
  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);
  const postura = sortearPostura(rng);
  const zonaAbierta = zonaAbiertaDe(postura);
  const zonas = Object.values(ZONAS_GOLPE).map((zona) => ({
    ...zona,
    estado: POSTURAS[postura].zonas[zona.id],
  }));
  return { postura, zonaAbierta, zonas, ventanaMs: VENTANA_MS };
}

export function resolverGolpeDeGracia(pelea, { zonaElegida, precision, aTiempo }) {
  const nueva = clonar(pelea);
  nueva.pendiente = null;
  nueva.bonusVentana = 0;
  const eventos = [];
  const round = nueva.roundActual;
  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  if (!aTiempo) {
    nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 8, 0, 100);
    nueva.aguante.rival = clamp(nueva.aguante.rival + 8, 0, 100);
    eventos.push({
      round,
      tipo: 'ventana_perdida',
      texto: `${apodoJ} duda medio segundo de más y ${apodoR} se recompone. Perdiste la chance.`,
    });
    return { pelea: nueva, eventos };
  }

  const rng = createRng(nueva.semilla);
  rng.restaurar(nueva.rngEstado);
  const postura = sortearPostura(rng);
  const zonaAbierta = zonaAbiertaDe(postura);
  const zona = ZONAS_GOLPE[zonaElegida] ?? ZONAS_GOLPE.higado;
  const acerto = zonaElegida === zonaAbierta;

  // v13: la FUERZA del que pega contra la DEFENSA del que la recibe — defensa
  // absorbió al mentón, así que "este tipo aguanta" vive ahí. Ojo con el
  // nombre: `ZONAS_GOLPE.menton` sigue existiendo, pero es la parte del
  // cuerpo a la que apuntás, no el atributo que desapareció.
  const fuerza = nueva.snapshot.jugador.atributos.fuerza;
  const defensaRival = nueva.snapshot.rival.atributos.defensa;
  const base = clamp(precision, 0, 1) * (acerto ? 1 : 0.35) * (1 - zona.dificultad * 0.4);
  const probKo = clamp(base * 1.5 + (fuerza - defensaRival) / 300, 0, 0.97);

  const dano = Math.round(zona.danoBase * clamp(precision, 0, 1) * (acerto ? 1 : 0.4));
  nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 5, 0, 100);

  if (nueva.aguante.rival <= 0 || rng.chance(probKo)) {
    nueva.terminada = true;
    nueva.resultado = {
      ganador: 'jugador',
      metodo: nueva.caidas.rival >= 1 ? 'tko' : 'ko',
      round,
      texto: `${apodoJ} gana por nocaut en el round ${round}.`,
    };
    eventos.push({
      round,
      tipo: 'ko',
      texto: acerto
        ? `${apodoJ} la manda al ${zona.nombre.toLowerCase()} y ${apodoR} se dobla. ¡Se terminó!`
        : `${apodoJ} pega donde puede y ${apodoR} igual se cae. ¡Nocaut!`,
    });
  } else {
    nueva.caidas.rival += acerto ? 1 : 0;
    eventos.push({
      round,
      tipo: 'golpe_fallado',
      texto: acerto
        ? `${apodoJ} conecta al ${zona.nombre.toLowerCase()} pero ${apodoR} aguanta y se rearma.`
        : `${apodoJ} apunta al ${zona.nombre.toLowerCase()} y encuentra la guardia. ${apodoR} se recompone.`,
    });
  }

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}
