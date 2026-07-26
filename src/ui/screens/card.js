import { el, mount } from '../dom.js';

export function renderResultadoTarjeta(contenedor, { titulo, texto, deltas = [], onContinuar }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('div', { class: 'panel' }, [
      el('p', { text: texto }),
      deltas.length > 0 ? el('div', { class: 'mods', text: deltas.join(' · ') }) : null,
    ]),
    el('button', { class: 'boton', 'data-accion': 'continuar', text: 'Continuar', onClick: onContinuar }),
  ]));
}
