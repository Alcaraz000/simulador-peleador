import { el, mount } from '../dom.js';
import { bandera } from '../flags.js';
import { semanasHastaPelea } from '../../core/calendario.js';

// Columna derecha: la próxima pelea (o el estado vacío si todavía no hay
// nada firmado). El calendario (mes/semana) se mudó al centro del tablero
// (revisión de la Task 6.1: es información permanente del jugador, y acá en
// celular esta columna entera se colapsa detrás de un botón — justo donde
// más cuesta orientarse). Ver panel-calendario.js.

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
  const contenido = [partida.proximaPelea ? bloquePelea(partida, onVerRival) : bloqueVacio()];
  mount(region, el('div', { class: 'stack' }, contenido));
}
