import { createRng } from './rng.js';
import { crearMundo, avanzarMundo, rankingDelJugador, ANIO_INICIAL } from './world.js';
import { repartirMejoras } from './cards.js';
import { elegirEvento, elegirCartaRedes } from './events.js';
import { generarOferta, CINTURONES } from './offers.js';
import { crearSparring } from './sparring.js';
import {
  noticiasDeSucesos, agregarNoticias, marcarLeidas,
} from './news.js';
import { recuperar, puedePelear } from './injuries.js';
import { cobrarSponsor, tieneStaff } from './money.js';
import { clamp } from './stats.js';
import { semanasDeBloque, fechaDe } from './calendario.js';
import { armarBeatsCampamento } from './campamento.js';

// El jugador también sufre el declive de "las piernas" por la edad, igual que
// los NPC en world.js (ahí es un roll de rng; acá es determinístico para no
// alterar la racha de tiradas que ya calibra el ritmo de la carrera). El
// 'preparador físico' (money.js) cumple su promesa ("el declive de las
// piernas llega más tarde") corriendo el umbral unos años.
export const EDAD_DECLIVE_JUGADOR = 32;
const DEMORA_DECLIVE_PREPARADOR = 3;
const PERDIDA_VELOCIDAD_DECLIVE = 2;
const PERDIDA_CARDIO_DECLIVE = 1;

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

function declivePorEdadJugador(jugador) {
  const umbral = tieneStaff(jugador, 'preparador')
    ? EDAD_DECLIVE_JUGADOR + DEMORA_DECLIVE_PREPARADOR
    : EDAD_DECLIVE_JUGADOR;
  if (jugador.edad < umbral) return jugador.atributos;
  return {
    ...jugador.atributos,
    velocidad: clamp(jugador.atributos.velocidad - PERDIDA_VELOCIDAD_DECLIVE, 1, 99),
    cardio: clamp(jugador.atributos.cardio - PERDIDA_CARDIO_DECLIVE, 1, 99),
  };
}

// Probabilidades por etapa recalibradas respecto del brief original. El primer ajuste
// (Task 17, primera vuelta) tocó solo estas probabilidades para bajar el total de
// beats a 30-60, pero dejó el eje de cinturones casi inalcanzable (~5 ofertas de pelea
// en toda la carrera). La causa real era el beat de 'noticias' incondicional en cada
// bloque (comiéndose 20 de los 40 beats de piso). Con 'noticias' periódico el
// presupuesto se liberó y estas probabilidades se recalibraron de nuevo con doble
// objetivo: 30-60 beats totales Y 12-22 ofertas de pelea por carrera (nunca menos de
// 8). Segundo ajuste (Task v3, "las semanas de preparación"): el campamento le puso
// 2-3 beats a CADA pelea aceptada.
// Tercer ajuste (Task v3, "cartas nuevas + progresión"): se sacó el beat 'noticias'
// DEL TODO (las noticias ya viven siempre visibles en la columna derecha, así que
// interrumpir la carrera para mostrarlas de nuevo era presupuesto de ritmo gastado en
// algo que el jugador ya podía ver) y se devolvió la mejora garantizada a TODOS los
// bloques (el bloque que seguía a una pelea firmada se la saltaba — iba en contra
// de la progresión sentida: un jugador que peleaba mucho terminaba viendo MENOS
// cartas de mejora, no más).
//
// Esto tensiona el presupuesto de ritmo de una forma que no tiene una solución limpia
// con las cuatro metas a la vez (30-60 beats, 12-22 peleas, ≥85% tres cinturones,
// progresión de MEDIA sentida). Medido con `node scripts/balance-sim.mjs` y con
// `scripts/_tune.mjs` (mismo helper "sin crecimiento por cartas" que usa
// career.test.js para medir cinturones, más estricto que balance-sim porque ahí la
// MEDIA nunca sube): con 20 bloques fijos de mejora garantizada + 1 (oferta) + 2-3
// (campamento) beats por cada pelea aceptada, bajar `probPelea` lo suficiente para
// que el promedio de beats entre en 30-60 hunde el eje de cinturones bien por debajo
// del 85% (menos peleas = menos chances de escalar el ranking y de defender el
// título). El eje de cinturones es la condición de victoria del juego, así que se
// priorizó: `probPelea` de profesional/veterano quedó cerca de los valores
// originales (necesarios para volver a superar el 85%, con margen — medido en 87-88%
// sobre 3000 semillas), y el promedio de beats por carrera quedó en ~65-67 (por
// encima de 60 en la mayoría de las carreras, pero lejos del ~81 que daba la primera
// combinación sin calibrar). `probEvento`/`probRedes` subieron respecto del recorte
// anterior (aunque no llegan al brief pre-campamento) usando el margen que dejó
// `probSparring` en profesional/veterano (en 0: ahí el campamento YA garantiza
// sparring en cada pelea).
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
    id: 'profesional', nombre: 'Profesional', bloques: 11, aniosPorBloque: 1.3, edadDesde: 21,
    probPelea: 1, probEvento: 0.02, probRedes: 0.02, probSparring: 0,
    frase: 'Acá se cobra y se sangra. Bienvenido.',
  },
  {
    id: 'veterano', nombre: 'Veterano', bloques: 3, aniosPorBloque: 1.3, edadDesde: 36,
    probPelea: 0.7, probEvento: 0.02, probRedes: 0.01, probSparring: 0,
    frase: 'Cada pelea puede ser la última. Elegí bien.',
  },
];

export function etapaActual(partida) {
  return ETAPAS[Math.min(partida.etapaIndice, ETAPAS.length - 1)];
}

export function crearPartida({ jugador, semilla }) {
  const rng = createRng(semilla);
  const mundo = crearMundo(rng, {
    disciplina: jugador.disciplina,
    categoria: jugador.categoria,
    cantidad: 12,
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
    // carrera (ver calendario.js). proximaPelea guarda la oferta que ya está
    // "en camino" este bloque (aunque el jugador todavía no llegó a ese beat
    // en la cola), para que el panel de próxima pelea pueda mostrarla.
    semanaGlobal: 1,
    proximaPelea: null,
    cola: [],
    beatActual: null,
    historialBeats: 0,
    terminada: false,
    legado: null,
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
      titulos: [...partida.jugador.titulos],
      staff: [...partida.jugador.staff],
      lujos: [...partida.jugador.lujos],
      historial: [...partida.jugador.historial],
    },
    rivalidades: partida.rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] })),
    noticias: [...partida.noticias],
    cola: [...partida.cola],
  };
}

export function avanzarBloque(partida) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);

  nueva.jugador.edad += etapa.aniosPorBloque;
  nueva.semanaGlobal = (nueva.semanaGlobal ?? 1) + semanasDeBloque(etapa.aniosPorBloque);
  nueva.jugador.estado.fatiga = clamp(nueva.jugador.estado.fatiga - 25, 0, 100);
  nueva.jugador.estado.forma = clamp(nueva.jugador.estado.forma + 5, 0, 100);
  nueva.jugador.atributos = declivePorEdadJugador(nueva.jugador);

  const recuperacion = recuperar(nueva.jugador, { bloques: 1 });
  nueva.jugador = recuperacion.peleador;

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

  const nuevas = noticiasDeSucesos(rng, paso.sucesos, { anio: paso.mundo.anio });
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
  return nueva;
}

function armarCola(partida) {
  const rng = rngDe(partida);
  const etapa = etapaActual(partida);
  const cola = [];
  // Si este bloque trae una oferta de pelea, se guarda acá para que el
  // tablero (panel-proxima.js) pueda mostrarla incluso antes de que el
  // jugador llegue a ese beat puntual dentro de la cola.
  let proximaPelea = null;

  // Mejora garantizada en TODOS los bloques (Task v3, "progresión"): un
  // intento anterior la salteaba en el bloque que seguía a una pelea firmada
  // (el campamento ya trae sus propias cartas), pero eso castigaba justo al
  // jugador que más pelea — menos cartas de mejora, no más. La progresión de
  // MEDIA tiene que sentirse pase lo que pase con el calendario de peleas.
  cola.push({
    tipo: 'mejora',
    datos: { cartas: repartirMejoras(rng, { jugador: partida.jugador, etapa: etapa.id }) },
  });

  if (rng.chance(etapa.probSparring)) {
    cola.push({ tipo: 'sparring', datos: { sparring: crearSparring(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probEvento)) {
    const categoria = rng.chance(0.5) ? 'vida' : 'evento';
    cola.push({ tipo: 'evento', datos: { carta: elegirEvento(rng, { jugador: partida.jugador, etapa: etapa.id, categoria }) } });
  }

  if (rng.chance(etapa.probRedes)) {
    cola.push({ tipo: 'redes', datos: { carta: elegirCartaRedes(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probPelea)) {
    if (puedePelear(partida.jugador)) {
      const forzarTitulo = etapa.id === 'profesional'
        && partida.jugador.titulos.length === 0
        && (partida.jugador.ranking ?? 99) <= 3;
      const oferta = generarOferta(rng, {
        jugador: partida.jugador,
        mundo: partida.mundo,
        etapa: etapa.id,
        rivalidades: partida.rivalidades,
        forzarTitulo,
      });
      if (oferta) {
        cola.push({ tipo: 'oferta', datos: { oferta } });
        proximaPelea = {
          oferta,
          semanaObjetivo: (partida.semanaGlobal ?? 1) + semanasDeBloque(etapa.aniosPorBloque),
        };
      }
    } else {
      // Le tocaba pelea pero está lesionado grave (ver puedePelear en
      // injuries.js): en vez de no ofrecer nada en silencio, el juego avisa
      // por qué no llegan ofertas.
      cola.push({ tipo: 'lesionSinOferta', datos: { lesion: partida.jugador.estado.lesion } });
    }
  }

  return { cola, rngEstado: rng.estado(), proximaPelea };
}

// Firma la pelea que el jugador acaba de aceptar (y, si hubo negociación, ya
// tiene la bolsa final — ver main.js): en vez de ir directo al combate, arma
// el campamento de preparación (campamento.js: 2 o 3 beats, siempre con
// sparring) y lo mete AL FRENTE de lo que quede en la cola de este bloque.
// Deja `proximaPelea` con el semanaObjetivo real del campamento: el módulo de
// "próxima pelea" del tablero (panel-proxima.js) ya sabe leer esto tal cual,
// sin ningún cambio — usa el mismo `semanasHastaPelea` de siempre.
export function firmarPelea(partida, { oferta }) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);
  const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
    jugador: nueva.jugador, etapa: etapa.id, oferta, semanaInicial: nueva.semanaGlobal ?? 1,
  });
  nueva.cola = [...beats, ...nueva.cola];
  nueva.proximaPelea = { oferta, semanaObjetivo };
  nueva.rngEstado = rng.estado();
  return nueva;
}

// Cancela la pelea que estuviera en danza este bloque (si la hay): la usan
// las cartas de riesgo (CARTAS_EVENTO/CARTAS_REDES, Task v3 "cartas nuevas")
// cuyo desenlace malo es "se te cae la pelea" — ver `caePelea` en
// resolverOpcion (events.js). armarCola siempre pone 'evento'/'redes' ANTES
// que 'oferta' en la cola del mismo bloque, así que si hay una pelea en
// danza cuando se resuelve una de estas cartas, es SIEMPRE la que este mismo
// bloque acaba de generar (todavía no llegó el jugador a ese beat) — nunca
// una de un campamento en curso (esos beats no son 'evento'/'redes'). Basta
// con sacar el beat 'oferta' de la cola y limpiar `proximaPelea`; si no
// había ninguna pelea en danza (proximaPelea ya null), no hace nada.
export function cancelarProximaPelea(partida) {
  if (!partida.proximaPelea) return partida;
  const nueva = clonarPartida(partida);
  nueva.cola = nueva.cola.filter((beat) => beat.tipo !== 'oferta');
  nueva.proximaPelea = null;
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
    const armado = armarCola(nueva);
    nueva.cola = armado.cola;
    nueva.rngEstado = armado.rngEstado;
    nueva.proximaPelea = armado.proximaPelea;
    nueva.bloque += 1;
    nueva.bloqueGlobal += 1;
  }

  const beat = nueva.cola.shift() ?? null;
  // Los beats de campamento (firmarPelea, más arriba) representan semanas de
  // verdad pasando mientras se prepara la pelea firmada: cada uno avanza el
  // calendario del tablero (semanaGlobal, calendario.js) lo que le toca, así
  // "faltan N semanas" en el panel de próxima pelea baja de verdad beat a
  // beat en vez de quedarse fijo hasta el próximo bloque.
  if (beat && (beat.tipo === 'campCarta' || beat.tipo === 'campSparring')) {
    nueva.semanaGlobal = (nueva.semanaGlobal ?? 1) + (beat.datos.semanas ?? 0);
  }
  nueva.beatActual = beat;
  nueva.historialBeats += beat ? 1 : 0;
  return { partida: nueva, beat };
}

export function totalBeatsEstimado() {
  return ETAPAS.reduce((total, etapa) => {
    const porBloque = 1 + etapa.probSparring + etapa.probEvento + etapa.probRedes + etapa.probPelea;
    return total + etapa.bloques * porBloque;
  }, 0);
}
