import { el, mount, fmtDinero } from '../dom.js';
import { ATRIBUTOS, ETIQUETAS } from '../../core/stats.js';
import { recordTexto, recordAmateurTexto, nombreConApodo } from '../../core/fighter.js';

const METODOS = { ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Decisión', descalificacion: 'DQ' };

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
        el('div', { class: 'etiqueta', text: `${METODOS[p.metodo] ?? p.metodo} · round ${p.round} · ${p.enJuego}` }),
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
