import { el, mount } from './dom.js';

// El shell persistente: la reforma central de la v2. En vez de que cada beat
// reemplace `#app` entero (como en la v1), acá se monta un esqueleto de tres
// regiones UNA sola vez, y de ahí en más solo se reemplaza el contenido de
// la región central (`montarCentro`). Las columnas laterales (el tablero del
// peleador y la próxima pelea/noticias) nunca se vuelven a dibujar: siguen
// siendo el mismo nodo del DOM durante toda la partida, así el jugador nunca
// las pierde de vista mientras decide.

/**
 * Monta el esqueleto de 3 regiones dentro de `contenedor` y devuelve los
 * handles para pintar sobre él.
 *
 * @param {HTMLElement} contenedor
 * @returns {{
 *   regiones: { izquierda: HTMLElement, centro: HTMLElement, derecha: HTMLElement },
 *   montarCentro: (nodo: Node) => void,
 *   montarDerecha: (nodo: Node) => void,
 *   destacar: (region: 'izquierda'|'centro'|'derecha') => void,
 * }}
 */
export function crearShell(contenedor) {
  const izquierda = el('aside', { class: 'shell-region shell-izquierda' });
  const centro = el('main', { class: 'shell-region shell-centro' });
  const derecha = el('aside', { class: 'shell-region shell-derecha' });

  const raiz = el('div', { class: 'shell' });

  const botonDerecha = el('button', {
    class: 'shell-boton-derecha',
    type: 'button',
    text: 'Próxima pelea y noticias',
    onClick: () => raiz.classList.toggle('shell-derecha-abierta'),
  });

  raiz.appendChild(izquierda);
  raiz.appendChild(centro);
  raiz.appendChild(botonDerecha);
  raiz.appendChild(derecha);

  // `mount` limpia el contenedor antes de montar: si `crearShell` se llama
  // dos veces sobre el mismo contenedor, el esqueleto anterior se descarta
  // en vez de acumularse (el shell "se crea una sola vez" a la vez).
  mount(contenedor, raiz);

  const regiones = { izquierda, centro, derecha };

  function montarCentro(nodo) {
    mount(centro, nodo);
  }

  function montarDerecha(nodo) {
    mount(derecha, nodo);
  }

  function destacar(nombreRegion) {
    const nodo = regiones[nombreRegion];
    if (!nodo) return;
    nodo.classList.remove('shell-destacada');
    // Fuerza un reflow para poder re-disparar la animación si se llama de
    // nuevo antes de que termine la anterior (p. ej. dos noticias seguidas).
    void nodo.offsetWidth;
    nodo.classList.add('shell-destacada');
  }

  return { regiones, montarCentro, montarDerecha, destacar };
}
