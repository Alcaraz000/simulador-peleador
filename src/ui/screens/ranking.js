import { el } from '../dom.js';
import { bandera } from '../flags.js';
import { abrirPopup } from '../components/popup.js';

// Tabla de posiciones como popup (Task v3, feedback textual del usuario:
// "ranking aparece, pero no puedo ver quiénes están por encima o por debajo
// de mí"). `filas` ya viene armada por `tablaRanking` (core/world.js): el
// roster activo con el jugador insertado en su puesto real, coherente con
// los rivales que ofrece `buscarRival` — mismos nombres, misma media, mismo
// récord.

function filaRanking(fila) {
  return el('div', {
    class: `panel fila tabla-ranking-fila${fila.esJugador ? ' tabla-ranking-fila-jugador' : ''}`,
    style: 'align-items:center;gap:10px',
    dataset: { peleador: fila.id },
  }, [
    el('div', { class: 'tabla-ranking-puesto', text: `#${fila.ranking}` }),
    bandera(fila.nacionalidad, { ancho: 20 }),
    el('div', { style: 'flex:1;min-width:0' }, [
      el('div', { style: 'font-weight:800', text: `"${fila.apodo}" ${fila.nombre}` }),
      el('div', { class: 'etiqueta', text: `MEDIA ${fila.media} · ${fila.record}` }),
    ]),
  ]);
}

/**
 * @param {{ filas: Array, onCerrar?: () => void }} props
 * @returns el handle de abrirPopup (mismo contrato que renderTienda).
 */
export function renderRanking({ filas = [], onCerrar = () => {} } = {}) {
  const contenido = el('div', { class: 'stack tabla-ranking' }, filas.length > 0
    ? filas.map(filaRanking)
    : [el('p', { class: 'medio', text: 'Todavía no hay ranking para mostrar.' })]);

  return abrirPopup({ titulo: 'Ranking', contenido, onCerrar });
}
