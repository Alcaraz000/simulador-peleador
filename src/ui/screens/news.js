import { el, mount } from '../dom.js';

export function renderNoticias(contenedor, { noticias, onContinuar }) {
  const items = noticias.slice(0, 8).map((n) => el('div', {
    class: 'panel', 'data-noticia': n.id,
  }, [
    el('div', { class: 'etiqueta', text: `${n.fecha} · ${n.tipo}` }),
    el('div', { text: n.titular }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'El mundo sigue girando' }),
    el('h1', { text: 'Noticias' }),
    items.length > 0 ? el('div', { class: 'stack' }, items)
      : el('p', { class: 'medio', text: 'Semana tranquila. Nadie habló de nadie.' }),
    el('button', { class: 'boton', 'data-accion': 'continuar', text: 'Continuar', onClick: onContinuar }),
  ]));
}
