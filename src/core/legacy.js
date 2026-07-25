import { recordTexto, mediaDe } from './fighter.js';
import { h2hTexto } from './rivalry.js';
import { LUJOS } from './money.js';
import { clamp } from './stats.js';

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

function puntajeMediatico(jugador) {
  return clamp(Math.round(jugador.fama * 0.85 + jugador.titulos.length * 5), 0, 100);
}

function puntajeEtico(jugador) {
  const disciplina = jugador.especiales?.disciplinaPersonal ?? 40;
  return clamp(Math.round(disciplina * 0.9 + (jugador.estado?.moral ?? 50) * 0.2), 0, 100);
}

function puntajeNacional(jugador, deportivo, mediatico) {
  const bonusLocal = jugador.nacionalidad === 'AR' ? 10 : 0;
  return clamp(Math.round(deportivo * 0.5 + mediatico * 0.4 + bonusLocal), 0, 100);
}

function momentosDe(jugador) {
  const momentos = [];
  for (const pelea of jugador.historial ?? []) {
    if (pelea.esTitulo && pelea.resultado === 'v') {
      momentos.push(`Le ganó a ${pelea.rivalNombre} y se quedó con el ${pelea.enJuego}.`);
    } else if (pelea.metodo === 'ko' && pelea.round === 1 && pelea.resultado === 'v') {
      momentos.push(`Durmió a ${pelea.rivalNombre} en el primer round.`);
    } else if (pelea.esTitulo && pelea.resultado === 'd') {
      momentos.push(`Perdió el ${pelea.enJuego} contra ${pelea.rivalNombre}.`);
    }
  }
  if (momentos.length === 0 && (jugador.historial ?? []).length > 0) {
    const primera = jugador.historial[0];
    momentos.push(`Su debut fue contra ${primera.rivalNombre}.`);
  }
  return momentos.slice(0, 6);
}

function biografiaDe(jugador, legados, archirrival) {
  const { v, d, e } = jugador.record;
  const peleas = v + d + e;
  const deportivo = legados.find((l) => l.id === 'deportivo').puntaje;

  const apertura = `${jugador.nombre}, "${jugador.apodo}", cerró su carrera con ${v} victorias y ${d} derrotas en ${peleas} peleas.`;
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

  const legados = [
    { id: 'deportivo', nombre: 'Legado deportivo', puntaje: deportivo, texto: 'Lo que hiciste arriba del ring.' },
    { id: 'nacional', nombre: 'Legado nacional', puntaje: nacional, texto: 'Lo que significaste para tu país.' },
    { id: 'economico', nombre: 'Legado económico', puntaje: economico, texto: 'Lo que construiste con la plata.' },
    { id: 'mediatico', nombre: 'Legado mediático', puntaje: mediatico, texto: 'Cuánto se habló de vos.' },
    { id: 'etico', nombre: 'Legado ético', puntaje: etico, texto: 'Cómo hiciste las cosas.' },
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
    biografia: biografiaDe(jugador, legados, archirrival),
    legados,
  };
}
