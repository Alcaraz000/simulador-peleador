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
//
// Pedido 2 (v9): se saca la etiqueta "Calendario" (se sobreentiende: es lo
// único que vive en este panel) y se cambia la visual a una sola fila —
// `(AÑO) Mes    Semana N` — con el año como un chip con fondo (mismo
// lenguaje que el resto del tablero, `.chip`), separado del mes por un
// espacio chico y del mes a la semana por uno más grande, proporcionado
// (`.calendario-mes`/`.calendario-semana`, theme.css) — nunca apretados
// entre sí como quedaban antes con "Mes Año · Semana N" corrido.
export function renderCalendario(region, { partida }) {
  const fecha = fechaDe(partida.semanaGlobal, ANIO_INICIAL);
  mount(region, el('div', { class: 'panel panel-calendario' }, [
    el('div', { class: 'calendario-fila' }, [
      el('span', { class: 'chip dorado calendario-anio', text: String(fecha.anio) }),
      el('span', { class: 'calendario-mes', text: fecha.nombreMes }),
      el('span', { class: 'calendario-semana', text: `Semana ${fecha.semanaDelMes}` }),
    ]),
  ]));
}
