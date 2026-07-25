import { el, mount, fmtDinero } from '../dom.js';
import { catalogo } from '../../core/money.js';

function itemBoton(item, onComprar) {
  return el('button', {
    class: 'carta', 'data-item': item.id, disabled: item.comprado || !item.alcanza ? '' : null,
    onClick: () => { if (!item.comprado && item.alcanza) onComprar(item.id); },
  }, [
    el('div', { class: 'titulo', text: item.nombre }),
    item.descripcion ? el('div', { class: 'desc', text: item.descripcion }) : null,
    el('div', {
      class: item.comprado ? 'mods' : 'desc verde',
      text: item.comprado ? 'En el equipo' : fmtDinero(item.precio),
    }),
  ]);
}

export function renderTienda(contenedor, { jugador, onComprar, onCerrar }) {
  const { staff, lujos } = catalogo(jugador);
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'fila', style: 'align-items:baseline' }, [
      el('div', {}, [
        el('div', { class: 'etiqueta', text: 'Tu equipo' }),
        el('h1', { text: 'La tienda' }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'etiqueta', text: 'Disponible' }),
        el('div', { class: 'verde', style: 'font-size:20px;font-weight:800', text: fmtDinero(jugador.dinero) }),
      ]),
    ]),
    el('div', { class: 'etiqueta dorado', text: 'Staff · te mejoran el juego' }),
    ...staff.map((i) => itemBoton(i, onComprar)),
    el('div', { class: 'etiqueta dorado', text: 'Lujo · date el gusto' }),
    ...lujos.map((i) => itemBoton(i, onComprar)),
    el('button', { class: 'boton verde-cta', 'data-accion': 'cerrar', text: 'Listo, cerrar', onClick: onCerrar }),
  ]));
}
