import { el, mount } from '../dom.js';
import { etiquetaTipo } from '../../core/news.js';

export function renderNoticias(contenedor, { noticias, onContinuar }) {
  const items = noticias.slice(0, 8).map((n) => el('div', {
    class: 'panel', 'data-noticia': n.id,
  }, [
    el('div', { class: 'fila', style: 'justify-content:space-between;align-items:center' }, [
      el('div', { class: 'etiqueta', text: `${n.fecha} · ${etiquetaTipo(n.tipo)}` }),
      n.nueva ? el('span', { class: 'chip rojo', text: 'ÚLTIMO MOMENTO' }) : null,
    ]),
    el('div', { style: 'font-weight:700;margin-top:4px', text: n.titular }),
    n.cuerpo ? el('p', { class: 'medio', style: 'margin:4px 0 0;font-size:12.5px', text: n.cuerpo }) : null,
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'El mundo sigue girando' }),
    el('h1', { text: 'Noticias' }),
    items.length > 0 ? el('div', { class: 'stack' }, items)
      : el('p', { class: 'medio', text: 'Semana tranquila. Nadie habló de nadie.' }),
    el('button', { class: 'boton', 'data-accion': 'continuar', text: 'Continuar', onClick: onContinuar }),
  ]));
}
