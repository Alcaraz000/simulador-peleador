import { el, mount, fmtDinero } from '../dom.js';
import { ETIQUETAS } from '../../core/stats.js';
import { getDisciplina } from '../../core/disciplines.js';
import { recordTexto, nombreConApodo } from '../../core/fighter.js';

const METODOS = { ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Decisión', descalificacion: 'DQ' };

export function renderFicha(contenedor, { jugador, seccion = 'atributos', onCerrar }) {
  const disciplina = getDisciplina(jugador.disciplina);
  const claves = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];
  if (disciplina.usaGrappling) claves.push('grappling');

  const atributos = el('div', { class: 'stack' }, [
    ...claves.map((c) => el('div', { class: 'panel', 'data-atributo-full': c, style: 'display:flex;justify-content:space-between' }, [
      el('span', { text: ETIQUETAS[c].larga }),
      el('span', { style: 'font-weight:800', text: String(jugador.atributos[c]) }),
    ])),
    ...['disciplinaPersonal', 'menton'].map((c) => el('div', { class: 'panel', 'data-atributo-full': c, style: 'display:flex;justify-content:space-between' }, [
      el('span', { text: ETIQUETAS[c].larga }),
      el('span', { style: 'font-weight:800', text: String(jugador.especiales[c]) }),
    ])),
  ]);

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

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Ficha del peleador' }),
    el('h1', { text: nombreConApodo(jugador).toUpperCase() }),
    el('div', { class: 'etiqueta', text: `Récord ${recordTexto(jugador)} · ${fmtDinero(jugador.dinero)} ganados` }),
    seccion === 'historial' ? historial : atributos,
    el('button', { class: 'boton', 'data-accion': 'cerrar', text: 'Volver', onClick: onCerrar }),
  ]));
}
