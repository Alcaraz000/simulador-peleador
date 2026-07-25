import { el, mount, fmtDinero } from '../dom.js';
import { MOVIDAS, riesgoDe, resultadoNegociacion } from '../../core/negotiation.js';

export function renderNegociacion(contenedor, { negociacion, oferta, onMovida, onCerrar }) {
  const cerrada = negociacion.cerrada || negociacion.perdida;
  const resultado = cerrada ? resultadoNegociacion(negociacion) : null;

  const movidas = cerrada ? [] : Object.values(MOVIDAS).map((movida) => {
    const riesgo = Math.round(riesgoDe(negociacion, movida.id) * 100);
    return el('button', {
      class: 'carta', 'data-movida': movida.id, onClick: () => onMovida(movida.id),
    }, [
      el('div', { class: movida.id === 'cerrar' ? 'titulo verde' : 'titulo dorado', text: movida.nombre }),
      el('div', { class: 'desc', text: movida.texto }),
      el('div', {
        class: 'etiqueta',
        text: movida.id === 'cerrar' ? 'Seguro' : `Riesgo que se levante: ${riesgo}%`,
      }),
    ]);
  });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Firma del contrato' }),
    el('h1', { text: 'La negociación' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Bolsa sobre la mesa' }),
      el('div', { class: 'verde', style: 'font-size:30px;font-weight:800', text: fmtDinero(negociacion.bolsa) }),
      el('div', { class: 'etiqueta', text: `Empezó en ${fmtDinero(negociacion.bolsaInicial)} · ${oferta.enJuego}` }),
      negociacion.condiciones.length > 0
        ? el('div', { class: 'mods', text: negociacion.condiciones.join(' · ') })
        : null,
    ]),
    el('div', {}, [
      el('div', { class: 'etiqueta', text: `Paciencia del promotor: ${negociacion.paciencia}/100` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${negociacion.paciencia}%` })]),
    ]),
    ...movidas,
    cerrada ? el('div', { class: 'panel' }, [
      el('p', {
        class: negociacion.perdida ? 'rojo' : 'verde',
        text: negociacion.perdida
          ? `El promotor se levantó. Firmás una peor: ${fmtDinero(resultado.bolsa)}.`
          : `Cerrado: ${fmtDinero(resultado.bolsa)}.`,
      }),
    ]) : null,
    cerrada
      ? el('button', { class: 'boton', 'data-accion': 'seguir', text: 'A entrenar', onClick: onCerrar })
      : null,
  ]));
}
