import { el, mount } from '../dom.js';

// Cuánto queda encendido cada pao antes de contar como error automático
// (Task v4, dos bugs reportados: "falta el timer con la barra decreciendo"
// y "el minijuego de sparring, ¿tiene algún efecto? No parece"). Antes un
// pao podía quedar prendido para siempre — sin presión de tiempo real,
// cualquiera terminaba acertando casi todo tarde o temprano, y MS_BIEN
// (core/sparring.js) nunca se llegaba a exigir en la práctica. Ahora
// tardarse cuenta como error real: mismo `onGolpe({acerto:false, ms:...})`
// que un click errado, así que el promedio de reacción por fin refleja cómo
// jugaste, no solo cuánta paciencia tuviste.
//
// La barra reusa `.barra > i` (theme.css) con un `transition` de ancho CSS
// puro: la regla global de prefers-reduced-motion (al final de theme.css,
// `transition-duration: 0.01ms !important`) ya la deja sin animar sola,
// mismo mecanismo que cualquier otra `.barra` del juego (aguante, fatiga) —
// no hace falta lógica aparte acá para respetarla.
const DURACION_MS = 1500;

export function renderSparring(contenedor, {
  sparring, jugador, onGolpe, onTerminar,
  titulo = `Entrenamiento · ${jugador.gimnasio}`, bajada = 'Sparring de reflejos',
}) {
  let activo = null;
  let desde = 0;
  let timerId = null;

  function limpiarTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  const relleno = el('i', { style: 'width:100%' });
  const barraTiempo = el('div', { class: 'barra barra-sparring' }, [relleno]);

  // <button> (no <div>): antes no se podía llegar a un pao con el teclado
  // (sin tabindex/role, Tab lo saltaba entero). aria-label describe el
  // número — el color/animación de "activo" ya avisa cuál pegar, pero un
  // lector de pantalla no ve el resplandor dorado.
  const paos = Array.from({ length: 6 }, (_, i) => el('button', {
    type: 'button',
    class: 'pao', 'data-pao': String(i), 'aria-label': `Pao ${i + 1}`,
    onClick: () => {
      if (activo === null) return;
      const acerto = i === activo;
      const ms = Math.max(1, Date.now() - desde);
      resolverGolpe({ acerto, ms });
    },
  }));

  function resolverGolpe(evento) {
    limpiarTimer();
    prender(null);
    onGolpe(evento);
  }

  function prender(indice) {
    activo = indice;
    paos.forEach((pao, i) => pao.classList.toggle('activo', i === indice));
    limpiarTimer();

    if (indice === null) {
      relleno.style.transition = 'none';
      relleno.style.width = '100%';
      return;
    }

    desde = Date.now();
    // Deja la barra llena SIN transición primero (y fuerza el reflow) para
    // que el navegador la registre así ANTES de animar hacia 0 — sin este
    // paso el cambio se funde con el próximo estilo y la barra nunca se ve
    // llena de arranque.
    relleno.style.transition = 'none';
    relleno.style.width = '100%';
    void relleno.offsetWidth;
    relleno.style.transition = `width ${DURACION_MS}ms linear`;
    relleno.style.width = '0%';

    timerId = setTimeout(() => resolverGolpe({ acerto: false, ms: DURACION_MS }), DURACION_MS);
  }

  function empezar() {
    const posicion = sparring.secuencia[sparring.indice] ?? 0;
    prender(posicion);
    boton.remove();
  }

  const boton = sparring.terminado
    ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Continuar', onClick: onTerminar })
    : el('button', { class: 'boton', 'data-accion': 'empezar', text: 'Empezar', onClick: empezar });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('h1', { text: bajada }),
    el('p', { class: 'medio', text: '"Pegá el que se prende. Rápido, que en el ring no avisan."' }),
    el('div', { class: 'fila' }, [
      el('div', { class: 'tile' }, [
        el('div', { class: 'valor dorado', text: String(sparring.aciertos) }),
        el('div', { class: 'nombre', text: 'Aciertos' }),
      ]),
      el('div', { class: 'tile' }, [
        el('div', { class: 'valor', text: `${sparring.indice}/${sparring.objetivos}` }),
        el('div', { class: 'nombre', text: 'Golpes' }),
      ]),
    ]),
    sparring.terminado ? null : barraTiempo,
    el('div', { class: 'panel' }, [el('div', { class: 'grilla-paos' }, paos)]),
    boton,
  ]));

  if (!sparring.terminado && sparring.indice > 0) empezar();

  // `detener()` corta el timer pendiente SIN disparar onGolpe (mismo
  // contrato que crearBarraPrecision/animarRoll): lo usa quien monta este
  // componente (main.js) si el jugador se va de la pantalla a mitad de un
  // golpe — nunca se deja el timer corriendo en segundo plano.
  return {
    detener() {
      limpiarTimer();
    },
  };
}
