import { el, mount } from './dom.js';

// El shell persistente: la reforma central de la v2. En vez de que cada beat
// reemplace `#app` entero (como en la v1), acá se monta un esqueleto de tres
// regiones UNA sola vez, y de ahí en más solo se reemplaza el contenido de
// la región central (`montarCentro`). Las columnas laterales (izquierda:
// personaje/rincón/categoría; derecha: calendario/dinero/próxima
// pelea/noticias) nunca se vuelven a dibujar como nodo: siguen siendo el
// mismo `aside` durante toda la partida, así el jugador nunca las pierde de
// vista mientras decide — ver montarTablero en main.js.
//
// Grilla 3×3 (v4, feedback del usuario: "en PC está muy en vertical y no se
// aprovecha bien el ancho"): en vez de una sola grilla CSS con filas
// compartidas entre las tres columnas, cada región sigue siendo su propia
// columna independiente que apila sus 2-3 módulos (ver theme.css, `.shell`
// en el media query de escritorio). Es la misma garantía que pedía el
// usuario ("nada se mueve"), pero más estricta: si un módulo de la columna
// central crece (una decisión con más opciones, por ejemplo), eso nunca
// empuja ni reacomoda nada de las columnas izquierda o derecha — cosa que sí
// pasaría con una grilla de filas compartidas, donde una fila más alta
// estira a TODOS sus vecinos de esa fila, aunque su contenido no haya
// cambiado.
//
// Antes, la región derecha se colapsaba entera detrás de un botón en
// celular ("Próxima pelea y noticias"). Con calendario y dinero mudándose acá
// (mockup: "Calendario + Botón tienda, ahí dentro se ve el dinero"), esconder
// TODA la columna detrás de un botón dejaría esa información permanente
// fuera de vista en celular — lo mismo que ya se evitaba a propósito con el
// calendario en la v2/v3. Se sacó ese botón: en celular las tres columnas se
// apilan igual que siempre, y las noticias (lo único realmente largo) siguen
// "detrás de su botón" con el acordeón propio que ya tenía panel-noticias.js
// (independiente del shell, no se tocó).

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

  raiz.appendChild(izquierda);
  raiz.appendChild(centro);
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
