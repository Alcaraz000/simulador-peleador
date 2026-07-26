import { el } from '../dom.js';
import { bandera } from '../flags.js';
import { abrirPopup } from '../components/popup.js';
import { nombreConApodo } from '../../core/fighter.js';

// Tabla de posiciones como popup (Task v3, feedback textual del usuario:
// "ranking aparece, pero no puedo ver quiénes están por encima o por debajo
// de mí"). `filas` ya viene armada por `tablaRanking` (core/world.js): el
// roster activo con el jugador insertado en su puesto real, coherente con
// los rivales que ofrece `buscarRival` — mismos nombres, misma media, mismo
// récord.
//
// Bug reportado (v4): "no sé cómo, pero en el ranking ahora solo muestra 3
// peleadores" (con el roster completo de 12 + el jugador). La lista SIEMPRE
// tenía las filas completas en el DOM (tablaRanking nunca truncó nada) — lo
// que faltaba era un contenedor de scroll propio para la lista, acotado y
// separado de la cabecera del popup (mismo patrón que panel-noticias.js):
// dejar que el popup entero (cabecera + lista) fuera el único scroll,
// gigante y sin tope visible salvo el borde de la ventana, no daba ninguna
// pista de que había más filas debajo. Ahora la lista tiene su propio
// `max-height` con `overflow-y:auto` (`.tabla-ranking-lista`, theme.css), y
// al abrir se hace scroll automático hasta la fila del jugador para que
// quede visible sin que haya que buscarla.
//
// v6 (rediseño integral, pedido textual: "el popup de ranking desperdicia
// espacio... que sea una lista compacta: NÚMERO | BANDERA | NOMBRE |
// HISTORIAL. La media NO va"): con el roster de 100 peleadores cada fila se
// repite cien veces, así que un dato de más (MEDIA, que ya no aporta nada
// que el puesto no diga) se paga cien veces en alto de scroll. La fila baja
// a una sola línea de verdad (antes tenía nombre arriba + "MEDIA · récord"
// abajo): puesto, bandera, nombre y récord comparten la misma fila.
function filaRanking(fila) {
  return el('div', {
    class: `tabla-ranking-fila${fila.esJugador ? ' tabla-ranking-fila-jugador' : ''}`,
    dataset: { peleador: fila.id },
  }, [
    el('span', { class: 'tabla-ranking-puesto', text: `#${fila.ranking}` }),
    bandera(fila.nacionalidad, { ancho: 20 }),
    el('span', { class: 'tabla-ranking-nombre', text: nombreConApodo(fila) }),
    el('span', { class: 'tabla-ranking-record etiqueta', text: fila.record }),
  ]);
}

/**
 * @param {{ filas: Array, onCerrar?: () => void }} props
 * @returns el handle de abrirPopup (mismo contrato que renderTienda).
 */
export function renderRanking({ filas = [], onCerrar = () => {} } = {}) {
  const lista = el('div', { class: 'stack tabla-ranking-lista' }, filas.length > 0
    ? filas.map(filaRanking)
    : [el('p', { class: 'medio', text: 'Todavía no hay ranking para mostrar.' })]);
  const contenido = el('div', { class: 'tabla-ranking' }, [lista]);

  const popup = abrirPopup({ titulo: 'Ranking', contenido, onCerrar });

  // Deja al jugador visible de entrada, sin que tenga que scrollear para
  // encontrarse (pedido textual: "si está en el puesto 9, que se vea sin
  // tener que buscarlo"). Sin `behavior: 'smooth'` a propósito: es la
  // posición inicial del popup recién abierto, no algo que se mueve solo
  // después de que el jugador ya lo está mirando.
  const filaJugador = lista.querySelector('.tabla-ranking-fila-jugador');
  if (filaJugador) filaJugador.scrollIntoView({ block: 'center' });

  return popup;
}
