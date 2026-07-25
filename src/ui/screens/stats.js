import { el, mount, fmtDinero } from '../dom.js';

function tile(nombre, valor, clase = '') {
  return el('div', { class: 'tile' }, [
    el('div', { class: `valor ${clase}`, text: String(valor) }),
    el('div', { class: 'nombre', text: nombre }),
  ]);
}

export function renderEstadisticas(contenedor, { estadisticas: e, onCerrar }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Los números de tu carrera' }),
    el('h1', { text: 'Estadísticas' }),
    el('div', { class: 'fila' }, [
      tile('Peleas', e.peleas),
      tile('Ganadas', e.victorias, 'verde'),
      tile('Perdidas', e.derrotas, 'rojo'),
      tile('Empates', e.empates),
    ]),
    el('div', { class: 'fila' }, [
      tile('% KO', `${e.porcentajeKO}%`, 'dorado'),
      tile('Mejor racha', e.rachaMasLarga),
      tile('Rounds', e.roundsPeleados),
      tile('Prom. rounds', e.promedioRoundPorPelea),
    ]),
    el('div', { class: 'fila' }, [
      tile('🏆 Títulos', e.titulosGanados, 'dorado'),
      tile('Defensas', e.defensasExitosas),
      tile('Mejor bolsa', fmtDinero(e.bolsaMayor), 'verde'),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Carrera' }),
      el('div', { text: `Debutaste a los ${e.edadDebut} y colgaste los guantes a los ${e.edadRetiro}.` }),
      e.rivalMasDuro
        ? el('div', { class: 'medio', style: 'margin-top:6px', text: `El rival más duro que enfrentaste: "${e.rivalMasDuro.apodo}" ${e.rivalMasDuro.nombre} (media ${e.rivalMasDuro.media}).` })
        : null,
    ]),
    el('button', { class: 'boton', 'data-accion': 'cerrar', text: 'Volver', onClick: onCerrar }),
  ]));
}
