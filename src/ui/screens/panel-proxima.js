import { el, mount } from '../dom.js';
import { bandera } from '../flags.js';
import { fechaDe, semanasHastaPelea } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';

// Parte de arriba de la columna derecha: el calendario (siempre visible,
// haya o no pelea firmada) y la próxima pelea. El jugador tiene que saber
// siempre en qué momento del año está y cuánto falta para pelear de nuevo.

function bloqueCalendario(partida) {
  const fecha = fechaDe(partida.semanaGlobal, ANIO_INICIAL);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'etiqueta', text: 'Calendario' }),
    el('div', { style: 'font-weight:800;margin-top:4px;font-size:13px', text: fecha.texto }),
  ]);
}

function bloqueVacio() {
  return el('div', { class: 'panel' }, [
    el('div', { class: 'etiqueta', text: 'Próxima pelea' }),
    el('p', { class: 'medio', style: 'margin:8px 0 0;font-size:12px', text: 'Todavía no hay nada firmado.' }),
  ]);
}

function textoFaltan(faltan) {
  if (faltan === null) return '';
  if (faltan === 0) return 'Es esta semana';
  return `Faltan ${faltan} ${faltan === 1 ? 'semana' : 'semanas'}`;
}

function bloquePelea(partida, onVerRival) {
  const { oferta } = partida.proximaPelea;
  const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
  const faltan = semanasHastaPelea(partida);

  return el('div', { class: 'panel' }, [
    el('div', { class: 'etiqueta', text: 'Próxima pelea' }),
    el('div', { style: 'font-weight:800;margin-top:4px', text: oferta.enJuego }),
    el('div', { class: 'etiqueta', style: 'margin-top:2px', text: textoFaltan(faltan) }),
    el('button', {
      class: 'carta', type: 'button', style: 'margin-top:10px',
      dataset: { accion: 'ver-rival' },
      onClick: () => onVerRival(oferta.rivalId),
    }, [
      el('div', { class: 'fila', style: 'align-items:center;gap:8px' }, [
        rival ? bandera(rival.nacionalidad, { ancho: 18 }) : null,
        el('div', { style: 'flex:1;min-width:0' }, [
          el('div', { class: 'titulo', text: `"${oferta.rivalApodo}" ${oferta.rivalNombre}` }),
          el('div', { class: 'desc', text: `MEDIA ${oferta.rivalMedia} · ${oferta.rivalRecord}` }),
        ]),
      ]),
    ]),
  ]);
}

export function renderPanelProxima(region, { partida, onVerRival = () => {} }) {
  const contenido = [bloqueCalendario(partida)];
  contenido.push(partida.proximaPelea ? bloquePelea(partida, onVerRival) : bloqueVacio());
  mount(region, el('div', { class: 'stack' }, contenido));
}
