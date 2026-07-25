import { el, mount, fmtDinero } from '../dom.js';
import { banderaDe } from '../../content/names.js';

export function renderLegado(contenedor, { legado, jugador, onNuevaCarrera, onVerEstadisticas = () => {} }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Fin de la carrera' }),
    el('h1', { text: `${banderaDe(jugador.nacionalidad)} "${jugador.apodo}" ${jugador.nombre}`.toUpperCase() }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'fila' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: legado.record }),
          el('div', { class: 'nombre', text: 'Récord' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor dorado', text: String(legado.titulos.length) }),
          el('div', { class: 'nombre', text: 'Títulos' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: String(legado.defensas) }),
          el('div', { class: 'nombre', text: 'Defensas' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor verde', text: fmtDinero(legado.dineroTotal) }),
          el('div', { class: 'nombre', text: 'Ganado' }),
        ]),
      ]),
      legado.titulos.length > 0
        ? el('div', { style: 'margin-top:8px' }, legado.titulos.map((t) => el('span', { class: 'chip dorado', text: `🏆 ${t}` })))
        : el('div', { class: 'etiqueta', style: 'margin-top:8px', text: 'Nunca se colgó un cinturón.' }),
    ]),
    legado.archirrival ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: 'Archirrival' }),
      el('div', { style: 'font-weight:800', text: `"${legado.archirrival.apodo}" ${legado.archirrival.nombre}` }),
      el('div', { class: 'etiqueta', text: `Cara a cara: ${legado.archirrival.h2h}` }),
    ]) : null,
    legado.momentos.length > 0 ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Momentos memorables' }),
      el('div', { class: 'log' }, legado.momentos.map((m) => el('p', { text: m }))),
    ]) : null,
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Biografía' }),
      el('p', { text: legado.biografia }),
    ]),
    el('div', { class: 'etiqueta', text: 'Tu legado' }),
    ...legado.legados.map((l) => el('div', {
      class: 'panel', 'data-legado': l.id, style: 'display:flex;justify-content:space-between;gap:10px',
    }, [
      el('div', {}, [
        el('div', { style: 'font-weight:800', text: l.nombre }),
        el('div', { class: 'etiqueta', text: l.texto }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'dorado', style: 'font-weight:800', text: l.etiqueta }),
        el('div', { class: 'etiqueta', text: `${l.puntaje}/100` }),
      ]),
    ])),
    el('button', {
      class: 'boton secundario', 'data-accion': 'estadisticas',
      text: 'Ver estadísticas', onClick: onVerEstadisticas,
    }),
    el('button', { class: 'boton', 'data-accion': 'nueva', text: 'Nueva carrera', onClick: onNuevaCarrera }),
  ]));
}
