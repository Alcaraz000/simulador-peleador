import { el, mount } from '../dom.js';
import { etiquetaTipo, marcarLeidas } from '../../core/news.js';

// Panel de noticias en la columna derecha: alto fijo con scroll interno (no
// crece indefinidamente con la carrera). El botón de cabecera hace doble
// función: en PC simplemente abre/cierra el acordeón; en celular es lo único
// visible de esta región hasta que el jugador lo toca (el resto de la región
// derecha ya se colapsa detrás del botón del shell — ver shell.js — pero acá
// además se marcan las noticias como leídas recién cuando el jugador las abre).
const ALTO_LISTA_PX = 320;

function itemNoticia(n) {
  return el('div', { class: `panel noticia-item${n.nueva ? ' nueva' : ''}`, dataset: { noticia: n.id } }, [
    n.nueva ? el('span', { class: 'chip rojo', style: 'margin-bottom:4px', text: 'ÚLTIMO MOMENTO' }) : null,
    el('div', { class: 'etiqueta', text: etiquetaTipo(n.tipo) }),
    el('div', { style: 'font-weight:800;margin-top:3px;font-size:12.5px', text: n.titular }),
    n.cuerpo ? el('p', { class: 'medio', style: 'margin:4px 0 0;font-size:11.5px', text: n.cuerpo }) : null,
  ]);
}

export function renderPanelNoticias(region, { noticias = [], onLeidas = () => {} }) {
  const hayNuevas = noticias.some((n) => n.nueva);

  const lista = el('div', {
    class: 'panel-noticias-lista',
    style: `max-height:${ALTO_LISTA_PX}px;overflow-y:auto`,
  }, noticias.length > 0
    ? noticias.map(itemNoticia)
    : [el('p', { class: 'medio', style: 'font-size:12px', text: 'Semana tranquila. Nadie habló de nadie.' })]);

  const raiz = el('div', { class: 'panel panel-noticias' });

  const boton = el('button', {
    class: 'panel-noticias-boton',
    type: 'button',
    dataset: { accion: 'abrir-noticias' },
  }, [
    el('span', { class: 'etiqueta', text: 'Noticias' }),
    hayNuevas ? el('span', { class: 'chip rojo', text: 'ÚLTIMO MOMENTO' }) : null,
  ]);

  boton.addEventListener('click', () => {
    raiz.classList.toggle('panel-noticias-abierta');
    if (hayNuevas) onLeidas(marcarLeidas(noticias));
  });

  raiz.appendChild(boton);
  raiz.appendChild(lista);
  mount(region, raiz);
}
