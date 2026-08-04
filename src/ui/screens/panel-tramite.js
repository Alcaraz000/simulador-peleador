import { el, mount, fmtDinero } from '../dom.js';
import { bandera } from '../flags.js';
import { icono } from '../icons.js';
import { ATRIBUTOS, rangoDeMedia, ETIQUETAS } from '../../core/stats.js';
import { renderPanelDecision } from './panel-decision.js';
import { chipsDePuestos } from './fight.js';
import { animarBarajado } from '../components/roll.js';

// Pedidos 1 y 2 (v7): las peleas de trámite ya no aparecen resueltas de la
// nada. Dos pantallas, siempre en la región central del tablero (nunca
// pantalla completa, mismo criterio que cualquier otro beat) — main.js
// orquesta las dos, reusando componentes ya existentes donde alcanza:
//   1. renderCardTramite (Pedidos 1 y 2) — UNA sola tarjeta que junta el
//      anuncio del entrenador (quién sigue, cuánto se cobra, cuánto falta —
//      Pedido 1, activa panel-proxima.js) CON la ficha del rival
//      (media/rango/bandera/récord/estadísticas — Pedido 2, item 1) y el
//      botón "Simular pelea". Separarlos en dos pantallas (como en un
//      primer borrador de esta ronda) sumaba un "Seguir" que no aportaba
//      nada nuevo — medido con scripts/balance-sim.mjs, esa sola pantalla de
//      más costaba ~15% de las acciones extra del minijuego sobre la
//      carrera entera.
//   2. Minijuego (Pedido 2, items 2-4) — reusa `renderPanelDecision` (mismas
//      tarjetas de tamaño fijo que cualquier decisión, "una tarjeta como las
//      decisiones", pedido textual): `opcionesMinijuego()` arma las 3
//      opciones tácticas. El resultado final reusa `renderDesenlace`.

// Las tres acciones del minijuego, mismo orden que ACCIONES_MINIJUEGO
// (core/tramite.js): un ciclo cerrado de boxeo, no una piedra-papel-tijera
// calcada — cada una es la decisión TÁCTICA de esta ronda puntual, no un
// estilo permanente de personaje (reusa el mismo ciclo de ventajas que ya
// existe entre estilos, ver el comentario grande en tramite.js).
const ICONO_ACCION = { tecnico: 'balanza', noqueador: 'rayo', menton: 'escudo' };
// Exportado (no solo local): main.js lo reusa para narrar en una línea qué
// pasó en cada ronda ya jugada del minijuego (ver beatPeleasResueltas).
export const NOMBRE_ACCION = { tecnico: 'Boxear a distancia', noqueador: 'Ir al humo', menton: 'Cerrarte en guardia' };
const DESC_ACCION = {
  tecnico: 'Le gana a "ir al humo".',
  noqueador: 'Le gana a "cerrarte en guardia".',
  menton: 'Le gana a "boxear a distancia".',
};

/**
 * Las 3 opciones del minijuego, listas para `renderPanelDecision`. Función
 * (no una constante): `icono()` arma un nodo SVG nuevo cada vez, y un nodo
 * DOM no puede reusarse en dos montajes — cada ronda necesita su propio
 * juego de nodos.
 */
export function opcionesMinijuego() {
  return Object.keys(ICONO_ACCION).map((accion) => ({
    id: accion,
    titulo: NOMBRE_ACCION[accion],
    descripcion: DESC_ACCION[accion],
    icono: icono(ICONO_ACCION[accion]),
  }));
}

function tileAtributo(clave, valor) {
  return el('div', { class: 'panel-peleador-atributo' }, [
    el('span', { class: 'nombre sutil', text: ETIQUETAS[clave].corta }),
    el('b', { class: 'valor', text: String(valor) }),
  ]);
}

function textoFaltan(semanas) {
  if (semanas <= 0) return 'Es esta semana';
  return `Faltan ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
}

/**
 * Pedidos 1 y 2 (v7): la tarjeta única del combate de trámite destacado —
 * la voz del entrenador (quién sigue, cuánto se cobra, cuánto falta) SOBRE
 * la ficha del rival (nombre, bandera, media, rango, récord, estadísticas),
 * con el botón "Simular pelea" al pie. `oferta.fraseEntrenador` ya viene
 * armada por `generarOferta` (offers.js, misma opinión que usan las peleas
 * grandes); `apertura` es la frase corta que le da pie (ANUNCIO_TRAMITE,
 * content/tramite-lines.js) — quien llama (main.js) la elige, este
 * componente no decide nada de juego, solo pinta.
 *
 * `rival` es el peleador completo del roster (para las estadísticas); puede
 * faltar en tests aislados o si el roster ya no lo tiene (retirado), en cuyo
 * caso se omiten la bandera y la fila de estadísticas sin romper nada — el
 * resto de la tarjeta sale entero de `oferta`, que siempre está completa.
 */
export function renderCardTramite(region, {
  oferta, rival = null, semanas = 0, apertura = '', onSimular = () => {},
}) {
  const media = oferta.rivalMedia;
  const rango = rangoDeMedia(media);
  const nombreMostrado = oferta.rivalApodo ? `"${oferta.rivalApodo}" ${oferta.rivalNombre}` : oferta.rivalNombre;

  mount(region, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Tu rincón' }),
    el('div', { class: 'panel' }, [
      apertura ? el('p', { class: 'medio', style: 'margin:0 0 4px', text: apertura }) : null,
      el('p', { class: 'medio', style: 'margin:0', text: oferta.fraseEntrenador }),
    ]),
    // El panel del rival es el elástico de esta pantalla (ver `data-crece` en
    // theme.css): con el centro estirado al piso, sin esto quedaban ~366px de
    // vacío entre la ficha del rival y el botón de simular.
    el('div', { class: 'panel', dataset: { crece: 'espaciado' } }, [
      el('div', { class: 'fila', style: 'align-items:center;gap:10px' }, [
        rival ? bandera(rival.nacionalidad, { ancho: 24 }) : null,
        el('div', { style: 'flex:3;min-width:0' }, [
          el('div', { style: 'font-weight:800;font-size:15px;overflow-wrap:break-word', text: nombreMostrado }),
          el('div', { class: 'etiqueta', text: `Récord ${oferta.rivalRecord}` }),
          // Mismos chips de puesto que la pantalla de oferta (v18): el
          // destacado de trámite también mueve las tablas, así que el jugador
          // necesita el mismo dato para saber qué se juega.
          chipsDePuestos(oferta.rivalPuestos),
        ]),
        el('div', {
          class: 'cabecera-media',
          style: `background:${rango.color}22;border-color:${rango.color};color:${rango.color};flex:0 0 auto`,
        }, [
          el('div', { class: 'cabecera-media-num', text: String(media) }),
          el('div', { class: 'etiqueta', style: `color:${rango.color}`, text: rango.nombre }),
        ]),
      ]),
      rival ? el('div', { class: 'panel-peleador-atributos', style: 'margin-top:12px' },
        ATRIBUTOS.map((c) => tileAtributo(c, rival.atributos[c]))) : null,
      el('div', {
        class: 'etiqueta',
        style: 'margin-top:12px;font-size:11px',
        text: `Bolsa: ${fmtDinero(oferta.bolsa)} · ${textoFaltan(semanas)}`,
      }),
    ]),
    el('button', {
      class: 'boton', type: 'button', dataset: { accion: 'simular-pelea' }, text: 'Simular pelea', onClick: onSimular,
    }),
  ]));
}

/**
 * Una ronda del minijuego (Pedido v8, "que se vea cómo se rollea"): mismo
 * layout y mismas 3 tarjetas que `renderPanelDecision` (de hecho lo llama
 * tal cual, sin duplicar nada de su HTML), pero el click no dispara
 * `onElegir` en el acto — primero corre un barajado de suspenso
 * (`animarBarajado`, roll.js) sobre las propias tarjetas, y recién cuando
 * termina se avisa qué eligió el jugador.
 *
 * Por qué el retraso es seguro: quien resuelve la ronda de verdad (main.js,
 * `resolverRondaMinijuego` con el rng de sesión) sigue viviendo enteramente
 * en el `onElegir` que se recibe acá — no se lo llama antes, no se lo llama
 * dos veces, y las tarjetas quedan deshabilitadas apenas se clickea una
 * (mismo guard `elegido` de `renderPanelDecision`), así que no hay forma de
 * elegir de nuevo ni de saltear el barajado. Lo único que cambia es CUÁNDO
 * se invoca ese callback (al terminar el barajado, no en el click), nunca
 * CÓMO se decide la ronda.
 *
 * `detener()` (mismo criterio que `cancelarRollPendiente` en main.js /
 * `raiz._limpiarAccion` en fight.js, ver el comentario grande de
 * `animarBarajado`): si el jugador ya eligió y se va del tablero a mitad
 * del barajado, resuelve la ronda YA (sin esperar el resto de la
 * animación) en vez de dejar un timer colgado o una ronda sin cerrar. Si
 * todavía no eligió nada, no hace nada — no hay ninguna ronda pendiente
 * que resolver.
 *
 * `resolverRonda` es lo que hace que el barajado ATERRICE. Se llama en el
 * click (antes de animar) y devuelve la jugada del rival: el barajado frena
 * ahí, así el jugador ve dónde cayó el rolleo en vez de terminar en neutro
 * y enterarse solo por texto. La ronda se sigue decidiendo afuera, con el
 * rng con semilla — acá no se decide nada, solo se muestra.
 *
 * @param {HTMLElement} region
 * @param {{
 *   titulo: string, bajada?: string, texto?: string,
 *   opciones: Array<{id:string, titulo:string, descripcion?:string, icono?:Node}>,
 *   resolverRonda?: (id:string) => ({eleccionRival?:string}|null),
 *   onElegir?: (id:string, datos:object|null) => void,
 * }} opciones
 * @returns {{detener: () => void}}
 */
export function renderMinijuegoRonda(region, {
  titulo, bajada = '', texto = '', opciones, resolverRonda = null, onElegir = () => {},
}) {
  let controlador = { detener: () => {} };

  renderPanelDecision(region, {
    titulo,
    bajada,
    texto,
    opciones,
    onElegir: (accionId) => {
      const tarjetas = [...region.querySelectorAll('.tarjeta')];
      const elegida = tarjetas.find((t) => t.dataset.opcion === accionId);
      if (elegida) elegida.classList.add('tarjeta-elegida');

      // La ronda se resuelve ACÁ, antes de animar, para saber en qué tarjeta
      // frenar. El resultado se guarda y se entrega tal cual al terminar el
      // barajado: consumir el rng una sola vez, por ronda, sigue siendo
      // responsabilidad de quien pasó `resolverRonda`.
      const datos = resolverRonda ? resolverRonda(accionId) : null;
      const indiceFinal = datos && datos.eleccionRival
        ? tarjetas.findIndex((t) => t.dataset.opcion === datos.eleccionRival)
        : -1;

      controlador = animarBarajado(tarjetas, {
        indiceFinal,
        onFin: () => onElegir(accionId, datos),
      });
    },
  });

  // "Que el marcador se mueva" (pedido textual): cada ronda es un remount
  // entero (no hay nodo previo para animar un conteo de verdad), así que la
  // versión honesta es un pop corto de entrada sobre el propio <h1> de la
  // cabecera (la `bajada`, "Vos N - M Rival") apenas se monta — mismo
  // tratamiento en la primera ronda (0-0) que en las siguientes, sin
  // necesidad de que quien llama distinga "primera vez" de "ya cambió".
  const marcador = region.querySelector('.panel-decision-cabecera h1');
  if (marcador) marcador.classList.add('marcador-pop');

  return { detener: () => controlador.detener() };
}
