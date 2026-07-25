import { el, mount } from '../dom.js';
import { fechaDe } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';

// El calendario vive en la columna CENTRAL del tablero (revisión de la Task
// 6.1): es información permanente del jugador — en qué mes y semana está —,
// y no puede quedar detrás del botón que colapsa la columna derecha en
// celular, justo donde más cuesta orientarse. Se pinta arriba de lo que sea
// que esté pasando en el centro (el panel de avance, una decisión, el
// sparring): siempre visible, se refresca en cada transición del tablero
// junto con los paneles laterales, nunca en cada micro-render.

export function renderCalendario(region, { partida }) {
  const fecha = fechaDe(partida.semanaGlobal, ANIO_INICIAL);
  mount(region, el('div', { class: 'panel panel-calendario' }, [
    el('div', { class: 'etiqueta', text: 'Calendario' }),
    el('div', { style: 'font-weight:800;margin-top:4px;font-size:13px', text: fecha.texto }),
  ]));
}
