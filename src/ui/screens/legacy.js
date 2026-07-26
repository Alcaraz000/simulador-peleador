import { el, mount, fmtDinero } from '../dom.js';
import { bandera } from '../flags.js';
import { icono } from '../icons.js';
import { nombreConApodo } from '../../core/fighter.js';

// Un ícono SVG por eje del legado (Task v3, pedido textual: "Faltan iconos
// en la parte de legado"). 'nacional' no está acá: usa la bandera del
// peleador (flags.js) en vez de un ícono de icons.js — tiene más sentido
// para un eje que mide "cuánto representaste a tu país" y de paso refuerza
// visualmente qué significa (el usuario preguntó textual "¿Legado nacional?
// ¿Qué quiere decir eso?").
const ICONO_LEGADO = {
  deportivo: 'guante',
  economico: 'billete',
  mediatico: 'microfono',
  etico: 'balanza',
};

function tile(nombre, valor, clase = '') {
  return el('div', { class: 'tile' }, [
    el('div', { class: `valor ${clase}`, text: String(valor) }),
    el('div', { class: 'nombre', text: nombre }),
  ]);
}

// Fila de una defensa/conquista dentro del panel de títulos: fecha en chip
// + texto. Si la fecha no está disponible (historial viejo, guardado antes
// de este cambio) se omite el chip en vez de mostrar algo inventado. El color
// va como segunda clase ("chip dorado"/"chip rojo"), igual que en
// fight.js/panel-peleador.js: ya no hace falta el color inline que tenía esta
// pantalla, porque el bug de especificidad de .chip en theme.css (cierre de
// ronda v3) se arregló de raíz para toda la app.
function filaFecha(fecha, texto, clase = '') {
  return el('div', { class: 'etiqueta', style: 'margin-top:2px' }, [
    fecha ? el('span', { class: `chip ${clase}`.trim(), style: 'margin-right:6px', text: fecha }) : null,
    texto,
  ]);
}

function bloqueTitulo(t) {
  return el('div', { style: 'margin-top:10px' }, [
    el('div', { style: 'font-weight:800', text: `🏆 ${t.nombre}` }),
    filaFecha(t.fechaGanado, 'Conquistado', 'dorado'),
    ...t.defensas.map((d) => filaFecha(d.fecha, `Defendido ante ${d.rivalNombre}`)),
    t.fechaPerdido ? filaFecha(t.fechaPerdido, 'Perdido', 'rojo') : null,
  ]);
}

function panelTitulos(titulosDetalle) {
  if (titulosDetalle.length === 0) {
    return el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Títulos' }),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: 'Nunca se colgó un cinturón.' }),
    ]);
  }
  return el('div', { class: 'panel', 'data-bloque': 'titulos' }, [
    el('div', { class: 'etiqueta dorado', text: 'Títulos' }),
    ...titulosDetalle.map(bloqueTitulo),
  ]);
}

function filaLegado(l, jugador) {
  const icon = l.id === 'nacional' ? bandera(jugador.nacionalidad, { ancho: 20 }) : icono(ICONO_LEGADO[l.id]);
  return el('div', { class: 'panel', 'data-legado': l.id }, [
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' }, [
      el('div', { style: 'display:flex;align-items:center;gap:8px;min-width:0' }, [
        icon,
        el('div', {}, [
          el('div', { style: 'font-weight:800', text: l.nombre }),
          el('div', { class: 'etiqueta', text: l.texto }),
        ]),
      ]),
      el('div', { style: 'text-align:right;flex-shrink:0' }, [
        el('div', { class: 'dorado', style: 'font-weight:800', text: l.etiqueta }),
        el('div', { class: 'etiqueta', text: `${l.puntaje}/100` }),
      ]),
    ]),
    el('div', { class: 'barra dorada', style: 'margin-top:8px' }, [
      el('i', { style: `width:${l.puntaje}%` }),
    ]),
  ]);
}

// Estadísticas de carrera, integradas de punta a punta en la pantalla de
// legado (Task v3, pedido textual: "las estadísticas también deben estar
// acá, no al clickear en el botón 'Ver estadísticas'"). Antes vivían en una
// pantalla aparte (ui/screens/stats.js, ya eliminada) detrás de un botón.
function bloqueEstadisticas(e) {
  return el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Los números de la carrera' }),
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
        ? el('div', { class: 'medio', style: 'margin-top:6px', text: `El rival más duro que enfrentaste: ${nombreConApodo(e.rivalMasDuro)} (media ${e.rivalMasDuro.media}).` })
        : null,
    ]),
  ]);
}

export function renderLegado(contenedor, {
  legado, estadisticas, jugador, onNuevaCarrera,
}) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Fin de la carrera' }),
    el('h1', { style: 'display:flex;align-items:center;gap:7px' }, [
      bandera(jugador.nacionalidad, { ancho: 20 }),
      nombreConApodo(jugador).toUpperCase(),
    ]),
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
    ]),
    panelTitulos(legado.titulosDetalle),
    bloqueEstadisticas(estadisticas),
    legado.archirrival ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: 'Archirrival' }),
      el('div', { style: 'font-weight:800', text: nombreConApodo(legado.archirrival) }),
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
    ...legado.legados.map((l) => filaLegado(l, jugador)),
    el('button', { class: 'boton', 'data-accion': 'nueva', text: 'Nueva carrera', onClick: onNuevaCarrera }),
  ]));
}
