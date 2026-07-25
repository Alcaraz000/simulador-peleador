import { el } from '../dom.js';
import { icono } from '../icons.js';

// Popup genérico (Task 5.3/5.4): overlay centrado sobre document.body, usado
// tanto por la creación (el picker de nacionalidad) como por la tienda (el
// popup entero). Se cierra con la X, con Escape o clickeando afuera del
// panel — nunca clickeando adentro. Al cerrarse, SIEMPRE (por cualquiera de
// esas tres vías, o llamando `cerrar()` a mano) devuelve el foco a donde
// estaba antes de abrir y saca el listener global de Escape: no puede quedar
// colgado, porque es el único listener de este componente que vive en
// `document` en vez de en el propio popup.

/**
 * @param {{ titulo?: string, contenido: Node, onCerrar?: () => void }} props
 * @returns {{ cerrar: () => void, overlay: HTMLElement, panel: HTMLElement, cuerpo: HTMLElement }}
 */
export function abrirPopup({ titulo = '', contenido, onCerrar = () => {} }) {
  const focoPrevio = document.activeElement;
  let cerrado = false;

  const cuerpo = el('div', { class: 'popup-cuerpo' }, [contenido]);

  const botonCerrar = el('button', {
    class: 'popup-cerrar', type: 'button', 'aria-label': 'Cerrar',
    onClick: () => cerrar(),
  }, [icono('cruz', { tamano: 16 })]);

  const panel = el('div', { class: 'popup-panel', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'popup-cabecera' }, [
      titulo ? el('div', { class: 'popup-titulo', text: titulo }) : el('div'),
      botonCerrar,
    ]),
    cuerpo,
  ]);

  const overlay = el('div', { class: 'popup-overlay' }, [panel]);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) cerrar();
  });

  function alTecla(ev) {
    if (ev.key === 'Escape') cerrar();
  }
  document.addEventListener('keydown', alTecla);

  // A propósito NO se usa `mount` acá: mount() limpia el contenedor entero,
  // y el popup se tiene que SUMAR sobre lo que ya está montado (el tablero,
  // la pantalla de creación) sin pisarlo — nunca reemplazarlo.
  document.body.appendChild(overlay);

  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    document.removeEventListener('keydown', alTecla);
    overlay.remove();
    if (focoPrevio && typeof focoPrevio.focus === 'function') focoPrevio.focus();
    onCerrar();
  }

  return { cerrar, overlay, panel, cuerpo };
}
