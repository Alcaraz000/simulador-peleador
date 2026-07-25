import { el, mount } from '../dom.js';
import { TONOS } from '../../core/presser.js';

export function renderCareo(contenedor, { careo, onResponder, onTerminar }) {
  const pregunta = careo.preguntas[Math.min(careo.ronda - 1, careo.preguntas.length - 1)];

  const barraHype = el('div', { class: 'barra dorada', 'data-hype': String(careo.hype) }, [
    el('i', { style: `width:${careo.hype}%` }),
  ]);

  const respuestas = careo.terminado ? [] : pregunta.respuestas.map((r) => el('button', {
    class: 'carta', 'data-tono': r.tono, onClick: () => onResponder(r.tono),
  }, [
    el('div', { class: 'etiqueta', text: TONOS[r.tono].nombre }),
    el('div', { class: 'desc', text: r.texto }),
    el('div', { class: 'etiqueta', text: TONOS[r.tono].pistaEfecto }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Careo · previa de la pelea' }),
    el('h1', { text: 'La conferencia' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Hype de la pelea — ${careo.hype}/100` }),
      barraHype,
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Ventaja mental: ${careo.ventajaMental > 0 ? 'a tu favor' : careo.ventajaMental < 0 ? 'en contra' : 'pareja'}` }),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: `Lo incomoda: ${TONOS[careo.tell.incomoda].nombre}` }),
      el('div', { class: 'medio', style: 'font-size:12px', text: careo.tell.texto }),
    ]),
    el('div', { class: 'etiqueta', text: `Ronda ${Math.min(careo.ronda, careo.rondas)} de ${careo.rondas}` }),
    careo.terminado ? null : el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: `${careo.rivalApodo}, mirándote fijo:` }),
      el('p', { style: 'font-style:italic', text: pregunta.texto }),
    ]),
    ...respuestas,
    careo.terminado
      ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Terminar el careo', onClick: onTerminar })
      : null,
  ]));
}
