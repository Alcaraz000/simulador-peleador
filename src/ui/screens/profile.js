import { el, mount, fmtDinero } from '../dom.js';
import { ATRIBUTOS, ETIQUETAS } from '../../core/stats.js';
import { recordTexto, recordAmateurTexto, nombreConApodo } from '../../core/fighter.js';
import { fechaDe } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';

const METODOS = { ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Decisión', descalificacion: 'DQ' };

// Pedido 1 (v14, "falta agregar, en el historial de peleas, el mes y año de
// cuando se peleó cada una"): `pelea.fecha` es la semanaGlobal en que ocurrió
// (offers.js ya la guarda al cerrar la pelea) — `fechaDe` (calendario.js) la
// traduce a mes/año. Puede haber peleas viejas guardadas antes de que este
// campo existiera (`fecha` ausente): en vez de mostrar "undefined"/"NaN", se
// omite el dato de fecha para esa fila (mismo criterio que ya usa el popup de
// cinturón en panel-peleador.js).
function mesAnioDe(pelea) {
  if (pelea.fecha == null) return null;
  const fecha = fechaDe(pelea.fecha, ANIO_INICIAL);
  return `${fecha.nombreMes.slice(0, 3)} ${fecha.anio}`;
}

// v13 (simplificación de atributos): la Ficha mostraba los 6-7 atributos de
// combate MÁS los "especiales" (mentón, disciplina personal, `jugador.
// especiales`) — ambos grupos desaparecieron con la reforma a cuatro
// atributos (fuerza, defensa, cardio, agilidad, `ATRIBUTOS` de stats.js): ya
// no hay disciplinas con grappling ni especiales que mostrar aparte, así que
// esta pantalla se reduce a una sola lista de cuatro filas.
export function renderFicha(contenedor, { jugador, seccion = 'atributos', onCerrar }) {
  const atributos = el('div', { class: 'stack' }, ATRIBUTOS.map((c) => el('div', {
    class: 'panel', 'data-atributo-full': c, style: 'display:flex;justify-content:space-between',
  }, [
    el('span', { text: ETIQUETAS[c].larga }),
    el('span', { style: 'font-weight:800', text: String(jugador.atributos[c]) }),
  ])));

  const historial = jugador.historial.length === 0
    ? el('p', { class: 'medio', text: 'Todavía no subiste al ring.' })
    : el('div', { class: 'stack' }, jugador.historial.map((p, i) => el('div', {
      class: 'panel', style: 'display:flex;justify-content:space-between;gap:8px',
    }, [
      el('div', {}, [
        el('div', { style: 'font-weight:800', text: `${i + 1}. ${p.rivalNombre}` }),
        el('div', {
          class: 'etiqueta',
          text: [mesAnioDe(p), `${METODOS[p.metodo] ?? p.metodo} · round ${p.round}`, p.enJuego].filter(Boolean).join(' · '),
        }),
      ]),
      el('div', {
        class: p.resultado === 'v' ? 'verde' : p.resultado === 'd' ? 'rojo' : 'sutil',
        style: 'font-weight:800',
        text: p.resultado === 'v' ? 'Ganó' : p.resultado === 'd' ? 'Perdió' : 'Empate',
      }),
    ])));

  // v6 ("las peleas amateur no cuentan ni en el ranking ni en el
  // historial... si querés mostrar el récord amateur por separado en algún
  // lado, dale, pero que no se mezcle"): una línea aparte, chica, solo si
  // hubo alguna pelea de formación — nunca sumada al récord profesional de
  // arriba.
  const totalAmateur = jugador.recordAmateur
    ? jugador.recordAmateur.v + jugador.recordAmateur.d + jugador.recordAmateur.e
    : 0;

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Ficha del peleador' }),
    el('h1', { text: nombreConApodo(jugador).toUpperCase() }),
    el('div', { class: 'etiqueta', text: `Récord ${recordTexto(jugador)} · ${fmtDinero(jugador.dinero)} ganados` }),
    totalAmateur > 0
      ? el('div', { class: 'medio', style: 'font-size:11px', text: `Amateur (no cuenta para el ranking): ${recordAmateurTexto(jugador)}` })
      : null,
    seccion === 'historial' ? historial : atributos,
    el('button', { class: 'boton', 'data-accion': 'cerrar', text: 'Volver', onClick: onCerrar }),
  ]));
}
