import { el, mount } from '../dom.js';

export function renderTarjeta(contenedor, { titulo, bajada = '', texto, opciones, onElegir, pie = null }) {
  const botones = opciones.map((opcion) => el('button', {
    class: 'carta', 'data-opcion': opcion.id, onClick: () => onElegir(opcion.id),
  }, [
    opcion.etiqueta ? el('div', { class: 'etiqueta', text: opcion.etiqueta }) : null,
    el('div', { class: 'titulo', text: opcion.titulo }),
    opcion.desc ? el('div', { class: 'desc', text: opcion.desc }) : null,
    opcion.mods && opcion.mods.length > 0
      ? el('div', { class: 'mods', text: opcion.mods.join(' · ') })
      : null,
    opcion.nota ? el('div', { class: 'etiqueta', text: opcion.nota }) : null,
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    bajada ? el('h1', { text: bajada }) : null,
    el('p', { class: 'medio', text: texto }),
    ...botones,
    pie ? el('div', { class: 'etiqueta', text: pie }) : null,
  ]));
}

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
