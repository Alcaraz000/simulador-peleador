import {
  recordTexto, mediaDe, nombreConApodo,
} from './fighter.js';
import { h2hTexto } from './rivalry.js';
import { LUJOS } from './money.js';
import { clamp } from './stats.js';
import { fechaDe } from './calendario.js';
import { ANIO_INICIAL } from './world.js';
import { CINTURONES } from './offers.js';
import { edadDeDeclive, EDAD_DECLIVE_JUGADOR } from './career.js';
import { estadisticasDeCarrera } from './stats-carrera.js';
import { MOMENTOS, EMOJI_MOMENTO, CIERRE } from '../content/legacy-lines.js';

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
// Cada momento sale con el emoji de SU tipo adelante (pedido v17.3: "agregá
// emojis en las frases de Momentos memorables según el momento"): un título
// ganado y uno perdido ya no se leen igual de un vistazo. El emoji lo elige
// el tipo de hito, nunca el texto — dos variantes del mismo tipo llevan el
// mismo emoji, que es justo lo que lo vuelve una viñeta y no un adorno.
function conEmoji(tipo, frase) {
  const emoji = EMOJI_MOMENTO[tipo];
  return emoji ? `${emoji} ${frase}` : frase;
}

function momentosDe(jugador) {
  const momentos = [];
  for (const pelea of jugador.historial ?? []) {
    const datos = { rival: pelea.rivalNombre, enJuego: pelea.enJuego };
    const semilla = `${pelea.rivalNombre}|${pelea.enJuego}|${pelea.fecha ?? ''}`;
    if (pelea.esTitulo && pelea.resultado === 'v' && pelea.esObligatoria) {
      momentos.push(conEmoji('tituloDefendido', fraseDe(MOMENTOS.tituloDefendido, `${semilla}|defendido`, datos)));
    } else if (pelea.esTitulo && pelea.resultado === 'v') {
      momentos.push(conEmoji('tituloGanado', fraseDe(MOMENTOS.tituloGanado, `${semilla}|ganado`, datos)));
    } else if (pelea.esTitulo && pelea.resultado === 'd') {
      momentos.push(conEmoji('tituloPerdido', fraseDe(MOMENTOS.tituloPerdido, `${semilla}|perdido`, datos)));
    } else if (pelea.metodo === 'ko' && pelea.round === 1 && pelea.resultado === 'v') {
      momentos.push(conEmoji('koPrimerRound', fraseDe(MOMENTOS.koPrimerRound, `${semilla}|ko1`, datos)));
    }
  }
  if (momentos.length === 0 && (jugador.historial ?? []).length > 0) {
    const primera = jugador.historial[0];
    momentos.push(conEmoji('debut', fraseDe(MOMENTOS.debut, `${primera.rivalNombre}|debut`, { rival: primera.rivalNombre })));
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
 * perdió.
 *
 * Un cinturón puede tener VARIOS reinados: ganarlo, perderlo y
 * reconquistarlo es una de las mejores historias que puede dar una carrera.
 * Antes se guardaba un solo reinado por cinturón y la reconquista pisaba al
 * anterior, así que la primera vez que lo ganaste —y la noche que lo
 * perdiste— desaparecían del cierre (reportado por el usuario con captura).
 * Ahora cada reinado se guarda entero, en orden cronológico.
 */
function titulosDetalleDe(jugador) {
  const porCinturon = new Map();
  for (const pelea of jugador.historial ?? []) {
    if (!pelea.esTitulo) continue;
    const clave = pelea.enJuego;
    if (!porCinturon.has(clave)) porCinturon.set(clave, []);
    const reinados = porCinturon.get(clave);
    const actual = reinados[reinados.length - 1] ?? null;

    if (pelea.resultado === 'v' && !pelea.esObligatoria) {
      // Conquista: abre un reinado NUEVO, sin tocar los anteriores.
      reinados.push({
        nombre: clave, fechaGanado: fechaTextoDe(pelea), defensas: [], fechaPerdido: null,
      });
    } else if (pelea.resultado === 'v' && pelea.esObligatoria && actual) {
      actual.defensas.push({ rivalNombre: pelea.rivalNombre, fecha: fechaTextoDe(pelea) });
    } else if (pelea.resultado === 'd' && actual) {
      actual.fechaPerdido = fechaTextoDe(pelea);
    }
  }
  // AGRUPADO POR CINTURÓN (v17.10, reportado con captura: "fijate cómo
  // aparece dos veces el cinturón mundial, ¿no debería estar agrupado?").
  // Antes se devolvía aplanado y la pantalla dibujaba un bloque por reinado,
  // así que un cinturón reconquistado salía dos veces con el mismo título
  // repetido. Ahora cada cinturón es UNA entrada con todos sus reinados
  // adentro, en orden: la reconquista se lee como lo que es —el mismo
  // cinturón, dos veces— y no como dos cinturones distintos.
  return [...porCinturon.entries()].map(([nombre, reinados]) => ({ nombre, reinados }));
}

// Task 6.2 ("La carrera que no llegó también se cuenta"): con el nuevo
// balance de rejugabilidad, 3 de cada 4 carreras no llegan al mundial (ver
// docs/superpowers/specs/2026-07-28-simplificacion-y-progresion.md). El
// cierre no puede tratar esas carreras como un fracaso — se arma sobre lo
// que el peleador SÍ hizo, nunca sobre lo que le faltó.
//
// Nivel máximo de título ALGUNA VEZ conquistado (no el que tiene puesto al
// retirarse: un campeón que perdió el cinturón antes de colgar los guantes
// sigue teniendo esa historia para toda la vida). Se lee de `titulosDetalle`
// (line de tiempo completa, arriba), no de `jugador.titulos` (solo lo que
// conserva HOY).
const ORDEN_CINTURONES = CINTURONES.map((c) => c.nombre);

function nivelMaximoDe(titulosDetalle) {
  let mejorIndice = -1;
  for (const t of titulosDetalle) {
    const indice = ORDEN_CINTURONES.indexOf(t.nombre);
    if (indice > mejorIndice) mejorIndice = indice;
  }
  return mejorIndice === -1 ? null : CINTURONES[mejorIndice].id;
}

// Umbrales de lo que hace que un hecho de la carrera valga la pena contarlo
// en el cierre. Calibrados sobre el rango de diseño (72 decisiones, ~20-32
// peleas profesionales, declive base a los 34 — ver el spec).
const RACHA_NOTABLE = 6;
const MEDIA_RIVAL_GRANDE = 80;
const DEFENSAS_NOTABLES = 3;
const PELEAS_CARRERA_LARGA = 24;
const ADELANTO_DECLIVE_NOTABLE = 3;

// El rival más duro al que de verdad le GANÓ (no el más duro que enfrentó:
// ver mejorVictoria en stats-carrera.js — perder contra un crack no es
// "vencer a alguien grande").
function hechosDeCierre(jugador, nivelMaximo, titulosDetalle, estadisticas) {
  const { v, d, e } = jugador.record ?? { v: 0, d: 0, e: 0 };
  const peleas = v + d + e;
  const tituloMaximoNombre = nivelMaximo
    ? CINTURONES.find((c) => c.id === nivelMaximo).nombre
    : null;
  // El ÚLTIMO reinado de ese cinturón: lo que decide si la carrera cerró con
  // el cetro puesto o si se le escapó. Con la agrupación por cinturón
  // (v17.10) un título puede tener varios reinados, y el que cuenta para el
  // cierre es cómo terminó el último.
  const cinturonMaximo = tituloMaximoNombre
    ? titulosDetalle.find((t) => t.nombre === tituloMaximoNombre)
    : null;
  const reinadoMaximo = cinturonMaximo?.reinados?.[cinturonMaximo.reinados.length - 1] ?? null;
  const mejorVictoria = estadisticas.mejorVictoria;

  return {
    peleas,
    invicto: peleas > 0 && d === 0,
    racha: estadisticas.rachaMasLarga,
    rachaNotable: estadisticas.rachaMasLarga >= RACHA_NOTABLE,
    rivalGrande: mejorVictoria && mejorVictoria.media >= MEDIA_RIVAL_GRANDE ? mejorVictoria : null,
    cuerpoCastigado: edadDeDeclive(jugador) <= EDAD_DECLIVE_JUGADOR - ADELANTO_DECLIVE_NOTABLE,
    defensas: jugador.defensas ?? 0,
    defensasNotables: (jugador.defensas ?? 0) >= DEFENSAS_NOTABLES,
    perdioElCetro: Boolean(reinadoMaximo?.fechaPerdido),
    carreraLarga: peleas >= PELEAS_CARRERA_LARGA,
  };
}

// Hash chico y estable, mismo criterio que `indiceEstable`/`fraseDe` de más
// abajo (usados también para "momentos memorables"): se arma con los datos
// REALES de la carrera (nombre, récord, títulos, defensas, última pelea) —
// nunca con Math.random() ni con el rng de la partida (esto es sabor de
// texto, no una decisión de juego). La MISMA carrera siempre cierra con el
// MISMO texto; dos carreras distintas, casi siempre con uno distinto.
function semillaCierreDe(jugador) {
  const { v, d, e } = jugador.record ?? { v: 0, d: 0, e: 0 };
  const historial = jugador.historial ?? [];
  const ultima = historial[historial.length - 1];
  const huella = ultima ? `${ultima.rivalNombre}|${ultima.fecha ?? ''}|${ultima.metodo ?? ''}` : 'sin-huella';
  return `${jugador.nombre}|${jugador.apodo ?? ''}|${v}-${d}-${e}|${(jugador.titulos ?? []).join(',')}|${jugador.defensas ?? 0}|${historial.length}|${huella}`;
}

const APERTURA_POR_NIVEL = {
  mundial: CIERRE.aperturaMundial,
  nacional: CIERRE.aperturaNacional,
  regional: CIERRE.aperturaRegional,
};
const CIERRE_POR_NIVEL = {
  mundial: CIERRE.cierreMundial,
  nacional: CIERRE.cierreNacional,
  regional: CIERRE.cierreRegional,
};

function biografiaDe(jugador, nivelMaximo, hechos) {
  if (hechos.peleas === 0) {
    // Caso límite (una partida guardada antes del debut profesional, o un
    // fixture de test): no hay carrera profesional todavía que narrar. No es
    // un final real del juego (la carrera SIEMPRE llega a la etapa
    // profesional), pero tiene que existir un texto neutro, sin inventar
    // datos, en vez de reventar.
    return `${nombreConApodo(jugador)} todavía no debutó como profesional.`;
  }

  const datos = {
    nombre: nombreConApodo(jugador),
    record: recordTexto(jugador),
    peleas: hechos.peleas,
    racha: hechos.racha,
    defensas: hechos.defensas,
    rival: hechos.rivalGrande ? nombreConApodo({ nombre: hechos.rivalGrande.nombre, apodo: hechos.rivalGrande.apodo }) : '',
  };
  const semilla = semillaCierreDe(jugador);

  const aperturaPool = APERTURA_POR_NIVEL[nivelMaximo] ?? CIERRE.aperturaSinTitulo;
  const cierrePool = CIERRE_POR_NIVEL[nivelMaximo] ?? CIERRE.cierreSinTitulo;

  const hitos = [];
  if (hechos.invicto) hitos.push(fraseDe(CIERRE.invicto, `${semilla}|invicto`, datos));
  else if (hechos.perdioElCetro) hitos.push(fraseDe(CIERRE.perdioElCetro, `${semilla}|perdioElCetro`, datos));
  if (hechos.rivalGrande) hitos.push(fraseDe(CIERRE.rivalGrande, `${semilla}|rivalGrande`, datos));
  if (hechos.defensasNotables) hitos.push(fraseDe(CIERRE.defensasNotables, `${semilla}|defensas`, datos));
  if (hechos.cuerpoCastigado) hitos.push(fraseDe(CIERRE.cuerpoCastigado, `${semilla}|cuerpo`, datos));
  if (hechos.rachaNotable) hitos.push(fraseDe(CIERRE.racha, `${semilla}|racha`, datos));
  if (hechos.carreraLarga) hitos.push(fraseDe(CIERRE.carreraLarga, `${semilla}|larga`, datos));

  const apertura = fraseDe(aperturaPool, `${semilla}|apertura`, datos);
  const cierre = fraseDe(cierrePool, `${semilla}|cierre`, datos);

  return [apertura, ...hitos.slice(0, 3), cierre].join(' ');
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

  const titulosDetalle = titulosDetalleDe(jugador);
  const nivelMaximo = nivelMaximoDe(titulosDetalle);
  const estadisticas = estadisticasDeCarrera(partida);
  const hechos = hechosDeCierre(jugador, nivelMaximo, titulosDetalle, estadisticas);

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
    titulosDetalle,
    // Nivel más alto de título ALGUNA VEZ conquistado ('mundial' | 'nacional'
    // | 'regional' | null) — Task 6.2: distingue el cierre de una carrera
    // de campeón mundial, nacional o regional (aunque el cinturón ya no lo
    // tenga puesto) de una que nunca ganó ninguno.
    nivelMaximo,
    biografia: biografiaDe(jugador, nivelMaximo, hechos),
    legados,
  };
}
