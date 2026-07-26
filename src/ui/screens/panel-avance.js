import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';

// Panel de avance (v2, Task 6.1): lo que ocupa la región CENTRAL del shell
// cuando NO hay una decisión pendiente — el estado "entre beats" de la
// carrera. Antes de esta task, ese momento mostraba renderDashboard (v1,
// pantalla completa): el jugador perdía de vista el tablero. Ahora es un
// panel más, montado sobre `shell.regiones.centro` como cualquier otro
// panel-*, así que el tablero nunca se mueve.
//
// La etapa actual (nombre + frase de sabor) vivía acá hasta la reforma de
// grilla 3×3 (v4, feedback: "en PC no se aprovecha bien el ancho"): el
// mockup la pide como bloque PERMANENTE junto a la categoría/ranking (columna
// izquierda), no solo visible en el estado ocioso — ver bloqueCategoria en
// panel-peleador.js. Acá solo queda la posibilidad de curar una lesión
// pagando (con el botón deshabilitado si no alcanza la plata) y el botón de
// avanzar el bloque.

function bloqueLesion(jugador, onCurar) {
  const lesion = jugador.estado.lesion;
  if (!lesion) return null;
  return el('div', { class: 'panel', style: 'display:flex;align-items:center;gap:10px' }, [
    icono('alerta', { color: '#e05252' }),
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'rojo', style: 'font-weight:800', text: lesion.nombre }),
      el('div', {
        class: 'etiqueta',
        text: `Te quedan ${lesion.bloquesRestantes} ${lesion.bloquesRestantes === 1 ? 'bloque' : 'bloques'} para recuperarte`,
      }),
    ]),
    el('button', {
      class: 'boton secundario', dataset: { accion: 'curar' },
      disabled: jugador.dinero >= lesion.costo ? null : '',
      style: 'width:auto;padding:10px 14px;flex:0 0 auto', onClick: onCurar,
      text: `Curar · ${fmtDinero(lesion.costo)}`,
    }),
  ]);
}

export function renderPanelAvance(region, { partida, onSiguiente = () => {}, onCurar = () => {} }) {
  const { jugador } = partida;

  mount(region, el('div', { class: 'stack panel-avance' }, [
    bloqueLesion(jugador, onCurar),
    el('div', { class: 'etiqueta', text: 'Lo que viene ahora' }),
    el('button', { class: 'boton', dataset: { accion: 'siguiente' }, text: 'Continuar', onClick: onSiguiente }),
  ]));
}
