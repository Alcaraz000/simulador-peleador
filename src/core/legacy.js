import { recordTexto, mediaDe } from './fighter.js';
import { h2hTexto } from './rivalry.js';
import { LUJOS } from './money.js';
import { clamp } from './stats.js';
import { fechaDe } from './calendario.js';
import { ANIO_INICIAL } from './world.js';
import { MOMENTOS } from '../content/legacy-lines.js';

const ESCALA = [
  [85, 'Leyenda'],
  [65, 'Grande'],
  [45, 'Respetado'],
  [25, 'Un nombre más'],
  [0, 'Olvidable'],
];

function etiquetaDe(puntaje) {
  for (const [umbral, etiqueta] of ESCALA) if (puntaje >= umbral) return etiqueta;
  return 'Olvidable';
}

function puntajeDeportivo(jugador) {
  const { v, d } = jugador.record;
  const peleas = v + d + jugador.record.e;
  const ratio = peleas === 0 ? 0 : v / peleas;
  return clamp(
    Math.round(v * 1.2 + jugador.titulos.length * 18 + jugador.defensas * 4 + ratio * 20),
    0, 100,
  );
}

function puntajeEconomico(jugador) {
  const porLujos = (jugador.lujos ?? []).reduce(
    (acc, id) => acc + (LUJOS.find((l) => l.id === id)?.legado ?? 0), 0,
  );
  return clamp(Math.round(Math.log10(Math.max(1, jugador.dinero)) * 12 + porLujos * 4), 0, 100);
}

// v13: sin fama, "cuánto se habló de vos" se arma con lo que de verdad da
// que hablar — cinturones, defensas y nocauts.
function puntajeMediatico(jugador) {
  const titulos = (jugador.titulos?.length ?? 0) * 18;
  const defensas = (jugador.defensas ?? 0) * 6;
  const nocauts = (jugador.record?.ko ?? 0) * 3;
  return clamp(Math.round(titulos + defensas + nocauts), 0, 100);
}

// v13: se armaba con `disciplinaPersonal` y `moral`, que dejaron de existir
// (y con el `?? 40` quedaba igual para todos). Ahora sale de cómo hiciste las
// cosas: pelear seguido y ganar limpio suma; que te descalifiquen, resta.
function puntajeEtico(jugador) {
  const record = jugador.record ?? { v: 0, d: 0, e: 0 };
  const peleas = record.v + record.d + record.e;
  const porTrayectoria = Math.min(60, peleas * 2);
  const porDecisiones = Math.min(25, (record.dec ?? 0) * 2);
  const porDefensas = Math.min(15, (jugador.defensas ?? 0) * 5);
  return clamp(Math.round(porTrayectoria + porDecisiones + porDefensas), 0, 100);
}

function puntajeNacional(jugador, deportivo, mediatico) {
  const bonusLocal = jugador.nacionalidad === 'AR' ? 10 : 0;
  return clamp(Math.round(deportivo * 0.5 + mediatico * 0.4 + bonusLocal), 0, 100);
}

// Hash chico y estable (mismo patrón que `indiceEstable`/`hashTexto` en
// offers.js/news.js): elige una variante de frase sin rng y sin contador de
// módulo aparte, así el MISMO hito siempre trae la MISMA frase. No consume
// del rng compartido de la carrera (esto es sabor de texto, no una decisión
// de juego) y es determinista entre corridas y al recargar una partida
// guardada.
function indiceEstable(texto, modulo) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 100000;
  return h % modulo;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

function fraseDe(pool, semilla, datos) {
  const plantilla = pool[indiceEstable(semilla, pool.length)];
  return rellenar(plantilla, datos);
}

// Causa real de "frases repetidas" (queja textual del usuario: la misma
// línea "Le ganó a Julio Barrera y se quedó con el Cinturón regional."
// aparecía dos veces): ganar un título por primera vez (nivel 'titulo') y
// defenderlo con éxito (nivel 'defensa') comparten `esTitulo:true` +
// `resultado:'v'` en el historial — antes de este fix, la única condición
// que se miraba, así que las dos ramas producían la MISMA frase de "se
// quedó con el cinturón" aunque la segunda fuera, en realidad, una defensa.
// `esObligatoria` (guardado en el historial por offers.js) es lo que
// distingue un hito del otro.
function momentosDe(jugador) {
  const momentos = [];
  for (const pelea of jugador.historial ?? []) {
    const datos = { rival: pelea.rivalNombre, enJuego: pelea.enJuego };
    const semilla = `${pelea.rivalNombre}|${pelea.enJuego}|${pelea.fecha ?? ''}`;
    if (pelea.esTitulo && pelea.resultado === 'v' && pelea.esObligatoria) {
      momentos.push(fraseDe(MOMENTOS.tituloDefendido, `${semilla}|defendido`, datos));
    } else if (pelea.esTitulo && pelea.resultado === 'v') {
      momentos.push(fraseDe(MOMENTOS.tituloGanado, `${semilla}|ganado`, datos));
    } else if (pelea.esTitulo && pelea.resultado === 'd') {
      momentos.push(fraseDe(MOMENTOS.tituloPerdido, `${semilla}|perdido`, datos));
    } else if (pelea.metodo === 'ko' && pelea.round === 1 && pelea.resultado === 'v') {
      momentos.push(fraseDe(MOMENTOS.koPrimerRound, `${semilla}|ko1`, datos));
    }
  }
  if (momentos.length === 0 && (jugador.historial ?? []).length > 0) {
    const primera = jugador.historial[0];
    momentos.push(fraseDe(MOMENTOS.debut, `${primera.rivalNombre}|debut`, { rival: primera.rivalNombre }));
  }
  return momentos.slice(0, 6);
}

// Fecha legible del hito (ver calendario.js): `pelea.fecha` es la
// semanaGlobal que offers.js estampa EN el momento del hito (Task v3,
// pedido textual: "incluir las fechas de cuándo se ganaron/defendieron
// títulos" — el dato se guarda ahí, no se reconstruye acá). Con historial
// viejo (sin `fecha`) devuelve null en vez de mostrar una fecha inventada.
function fechaTextoDe(pelea) {
  if (pelea.fecha === null || pelea.fecha === undefined) return null;
  return fechaDe(pelea.fecha, ANIO_INICIAL).texto;
}

/**
 * Línea de tiempo de cada título alguna vez conquistado: cuándo se ganó,
 * cada defensa exitosa (con rival y fecha) y, si corresponde, cuándo se
 * perdió. Si el cinturón se perdió y se volvió a conquistar más adelante,
 * se muestra el reinado MÁS RECIENTE (gala el historial completo de
 * reinados sería mucho ruido para esta pantalla de cierre).
 */
function titulosDetalleDe(jugador) {
  const reinados = new Map();
  for (const pelea of jugador.historial ?? []) {
    if (!pelea.esTitulo) continue;
    const clave = pelea.enJuego;
    if (!reinados.has(clave)) {
      reinados.set(clave, {
        nombre: clave, fechaGanado: null, defensas: [], fechaPerdido: null,
      });
    }
    const reinado = reinados.get(clave);
    if (pelea.resultado === 'v' && !pelea.esObligatoria) {
      // Arranca un reinado nuevo (primera conquista o reconquista): pisa lo
      // que hubiera de un reinado anterior de este mismo cinturón.
      reinado.fechaGanado = fechaTextoDe(pelea);
      reinado.defensas = [];
      reinado.fechaPerdido = null;
    } else if (pelea.resultado === 'v' && pelea.esObligatoria) {
      reinado.defensas.push({ rivalNombre: pelea.rivalNombre, fecha: fechaTextoDe(pelea) });
    } else if (pelea.resultado === 'd') {
      reinado.fechaPerdido = fechaTextoDe(pelea);
    }
  }
  return [...reinados.values()];
}

function biografiaDe(jugador, legados, archirrival) {
  const { v, d, e } = jugador.record;
  const peleas = v + d + e;
  const deportivo = legados.find((l) => l.id === 'deportivo').puntaje;

  // Con apodo, "Nombre, "Apodo", cerró..."; sin apodo (guardado viejo, o un
  // rival sin apodo asignado), se omite la coma extra en vez de mostrar
  // "Nombre, "null", cerró...".
  const apertura = jugador.apodo
    ? `${jugador.nombre}, "${jugador.apodo}", cerró su carrera con ${v} victorias y ${d} derrotas en ${peleas} peleas.`
    : `${jugador.nombre} cerró su carrera con ${v} victorias y ${d} derrotas en ${peleas} peleas.`;
  const medio = jugador.titulos.length > 0
    ? ` Se colgó ${jugador.titulos.length === 1 ? 'un cinturón' : `${jugador.titulos.length} cinturones`} y defendió ${jugador.defensas} ${jugador.defensas === 1 ? 'vez' : 'veces'}.`
    : ' Nunca llegó a colgarse un cinturón, aunque estuvo cerca más de una vez.';
  const rival = archirrival
    ? ` Su historia quedó atada a ${archirrival.nombre}: ${archirrival.h2h} en los cara a cara.`
    : ' Nunca encontró un rival que lo marcara de por vida.';
  const cierre = deportivo >= 65
    ? ' En el gimnasio del barrio todavía cuelga su foto.'
    : deportivo >= 35
      ? ' Los que lo vieron pelear se acuerdan. Los demás, no tanto.'
      : ' Fue uno de los miles que lo intentaron. Y eso ya es algo.';

  return apertura + medio + rival + cierre;
}

export function calcularLegado(partida) {
  const { jugador } = partida;
  const deportivo = puntajeDeportivo(jugador);
  const economico = puntajeEconomico(jugador);
  const mediatico = puntajeMediatico(jugador);
  const etico = puntajeEtico(jugador);
  const nacional = puntajeNacional(jugador, deportivo, mediatico);

  // Nombres y bajadas pensados para entenderse sin explicación (el usuario
  // preguntó textualmente "¿Legado nacional? ¿Qué quiere decir eso?"): cada
  // uno dice, en la bajada, con QUÉ datos de la carrera se arma el puntaje.
  const legados = [
    {
      id: 'deportivo',
      nombre: 'Legado deportivo',
      puntaje: deportivo,
      texto: 'Lo que construiste arriba del ring: victorias, cinturones, defensas.',
    },
    {
      id: 'nacional',
      nombre: 'Orgullo nacional',
      puntaje: nacional,
      texto: 'Cuánto llegaste a representar a tu país, no solo a vos mismo.',
    },
    {
      id: 'economico',
      nombre: 'Legado económico',
      puntaje: economico,
      texto: 'La fortuna que te llevás de la carrera: bolsas cobradas y lujos comprados.',
    },
    {
      id: 'mediatico',
      nombre: 'Legado mediático',
      puntaje: mediatico,
      texto: 'Cuánto se habló de vos: cinturones, defensas y nocauts que dieron que hablar.',
    },
    {
      id: 'etico',
      nombre: 'Legado ético',
      puntaje: etico,
      texto: 'Con qué códigos hiciste el camino: disciplina y cabeza, no solo puños.',
    },
  ].map((l) => ({ ...l, etiqueta: etiquetaDe(l.puntaje) }));

  const rivalidad = (partida.rivalidades ?? []).find((r) => r.esArchirrival);
  const datosRival = rivalidad
    ? partida.mundo.roster.find((p) => p.id === rivalidad.rivalId)
    : null;
  const archirrival = rivalidad && datosRival
    ? { nombre: datosRival.nombre, apodo: datosRival.apodo, h2h: h2hTexto(rivalidad) }
    : null;

  const { v, d, e } = jugador.record;

  return {
    record: recordTexto(jugador),
    peleas: v + d + e,
    titulos: [...jugador.titulos],
    defensas: jugador.defensas,
    dineroTotal: jugador.dinero,
    lesionesGraves: (jugador.lesionesSufridas ?? []).filter((l) => l.severidad === 3).length,
    mediaFinal: mediaDe(jugador),
    archirrival,
    momentos: momentosDe(jugador),
    titulosDetalle: titulosDetalleDe(jugador),
    biografia: biografiaDe(jugador, legados, archirrival),
    legados,
  };
}
