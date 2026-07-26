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
//
// OBJETIVO DECLARADO DE BEATS/CARRERA — actualizado (cierre de ronda v3): el
// "30-60 beats" de acá arriba era una meta del PLAN original (brief pre-
// campamento), nunca un pedido textual del usuario — el usuario sí pidió,
// explícitamente, las semanas de preparación (el campamento) y "más
// progresión de media" (la mejora garantizada en todo bloque). Ambos pedidos
// suman beats de forma estructural (1-3 por pelea aceptada, ~20 mejoras
// garantizadas), así que el 30-60 dejó de ser alcanzable SIN pisar el eje de
// cinturones (ver el párrafo de arriba) — y como ese eje es la condición de
// victoria del juego, no es negociable. Mantener 30-60 como "objetivo" habría
// dejado un número que la propia mecánica pedida por el usuario garantiza
// incumplir siempre; eso no es un objetivo, es un bug de documentación.
//
// El rango honesto, medido sobre 3000 semillas con el mismo método que el
// test de ritmo (tests/core/career.test.js, jugarGanandoTodo: acepta y gana
// TODA oferta, con su campamento — el camino "de punta a punta" real):
//   avg=66.4 | p10=60 | p50=66 (mediana) | p90=72 | min=49 | max=83
// El promedio es muy estable entre muestras (varía <1 punto incluso
// comparando ventanas de 200 semillas distintas tomadas de zonas separadas
// del espacio de semillas) porque el grueso del conteo sale de estructura
// fija, no de azar: 20 bloques × 1 mejora garantizada + 1-3 beats de
// campamento por cada una de las ~14-15 peleas de una carrera típica. NO es
// un número inventado ni un ajuste cosmético del test — es lo que da jugar
// exactamente como el usuario pidió. Si algún cambio futuro corre este
// promedio bien afuera de [60,73], el test de ritmo lo va a marcar: hay que
// revisar el cambio, no "arreglar" el test corriéndolo para que pase nomás.
// Los otros dos objetivos de ritmo NO cambiaron: 12-22 peleas/carrera y
// ≥85% de carreras bien jugadas con los tres cinturones (ver el test
// 'progresión de cinturones' en career.test.js).
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
    // carrera (ver calendario.js). `proximaPelea` es SOLO la pelea firmada
    // (ver firmarPelea, más abajo): es lo único que lee el panel de próxima
    // pelea (panel-proxima.js). `ofertaPendiente` es un dato interno aparte:
    // guarda la oferta que este bloque ya armó en la cola pero que el
    // jugador todavía no vio ni decidió — sirve para que cancelarProximaPelea
    // (las cartas de riesgo) sepa que hay algo que sacar de la cola. El panel
    // nunca lee `ofertaPendiente` (bug reportado: mostraba al rival antes de
    // aceptar la oferta).
    semanaGlobal: 1,
    proximaPelea: null,
    ofertaPendiente: null,
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
  // Sistema 1 (feedback del usuario: "¿Qué efecto tienen las lesiones?
  // Parecería que no afecta en nada"): este +5 pasivo de forma corría TODOS
  // los bloques, incluso mientras seguías lesionado — así que una lesión leve
  // (1 bloque) quedaba borrada de la forma antes de que `recuperar()` (más
  // abajo) te diera de alta. Mientras la lesión sigue activa AL ARRANCAR este
  // bloque, el descanso pasivo se frena: la forma se queda baja de verdad. El
  // bonus de curación de `recuperar()` (+10, en el bloque que te da de alta)
  // no se toca: sigue siendo la recompensa de terminar la recuperación, no el
  // descanso de rutina.
  if (!nueva.jugador.estado.lesion) {
    nueva.jugador.estado.forma = clamp(nueva.jugador.estado.forma + 5, 0, 100);
  }
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
  // Si este bloque trae una oferta de pelea, se guarda acá (dato INTERNO,
  // nunca leído por el panel de próxima pelea): sirve para que
  // cancelarProximaPelea pueda sacarla de la cola si una carta de riesgo la
  // hace caer antes de que el jugador llegue a decidir sobre ella. La oferta
  // recién se vuelve "próxima pelea" de verdad (lo que muestra el tablero)
  // cuando el jugador la acepta y firma — ver firmarPelea, más abajo.
  let ofertaPendiente = null;

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
        ofertaPendiente = { oferta };
      }
    } else {
      // Le tocaba pelea pero está lesionado grave (ver puedePelear en
      // injuries.js): en vez de no ofrecer nada en silencio, el juego avisa
      // por qué no llegan ofertas.
      cola.push({ tipo: 'lesionSinOferta', datos: { lesion: partida.jugador.estado.lesion } });
    }
  }

  return { cola, rngEstado: rng.estado(), ofertaPendiente };
}

// Firma la pelea que el jugador acaba de aceptar (y, si hubo negociación, ya
// tiene la bolsa final — ver main.js): en vez de ir directo al combate, arma
// el campamento de preparación (campamento.js: 2 o 3 beats, siempre con
// sparring) y lo mete AL FRENTE de lo que quede en la cola de este bloque.
// Deja `proximaPelea` con el semanaObjetivo real del campamento (unas pocas
// semanas, nunca un bloque entero) — recién ACÁ nace `proximaPelea`: es la
// única fuente que lee el panel de próxima pelea (panel-proxima.js). También
// limpia `ofertaPendiente`: la oferta que estaba "en camino" ya se resolvió
// (se firmó), así que deja de estar pendiente de decisión.
export function firmarPelea(partida, { oferta }) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);
  const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
    jugador: nueva.jugador, etapa: etapa.id, oferta, semanaInicial: nueva.semanaGlobal ?? 1,
  });
  nueva.cola = [...beats, ...nueva.cola];
  nueva.proximaPelea = { oferta, semanaObjetivo };
  nueva.ofertaPendiente = null;
  nueva.rngEstado = rng.estado();
  return nueva;
}

// Cancela la oferta que estuviera en danza este bloque (si la hay, todavía
// SIN firmar): la usan las cartas de riesgo (CARTAS_EVENTO/CARTAS_REDES,
// Task v3 "cartas nuevas") cuyo desenlace malo es "se te cae la pelea" — ver
// `caePelea` en resolverOpcion (events.js). armarCola siempre pone
// 'evento'/'redes' ANTES que 'oferta' en la cola del mismo bloque, así que si
// hay una oferta pendiente cuando se resuelve una de estas cartas, es SIEMPRE
// la que este mismo bloque acaba de generar (todavía no llegó el jugador a
// ese beat, mucho menos la firmó) — nunca una pelea ya firmada en curso de
// campamento (esos beats no son 'evento'/'redes'). Basta con sacar el beat
// 'oferta' de la cola y limpiar `ofertaPendiente`; si no había ninguna oferta
// en danza (`ofertaPendiente` ya null), no hace nada. No toca `proximaPelea`:
// a esta altura siempre es null (todavía no se firmó nada este bloque).
export function cancelarProximaPelea(partida) {
  if (!partida.ofertaPendiente) return partida;
  const nueva = clonarPartida(partida);
  nueva.cola = nueva.cola.filter((beat) => beat.tipo !== 'oferta');
  nueva.ofertaPendiente = null;
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
    nueva.ofertaPendiente = armado.ofertaPendiente;
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
