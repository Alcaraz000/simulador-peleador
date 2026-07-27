import { el, mount, fmtDinero } from '../dom.js';
import { bandera } from '../flags.js';
import { icono } from '../icons.js';
import { rangoDeMedia, ETIQUETAS } from '../../core/stats.js';

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

const ATRIBUTOS_RESUMEN = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];

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
    el('div', { class: 'panel' }, [
      el('div', { class: 'fila', style: 'align-items:center;gap:10px' }, [
        rival ? bandera(rival.nacionalidad, { ancho: 24 }) : null,
        el('div', { style: 'flex:3;min-width:0' }, [
          el('div', { style: 'font-weight:800;font-size:15px;overflow-wrap:break-word', text: nombreMostrado }),
          el('div', { class: 'etiqueta', text: `Récord ${oferta.rivalRecord}${oferta.rivalRanking ? ` · #${oferta.rivalRanking}` : ''}` }),
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
        ATRIBUTOS_RESUMEN.map((c) => tileAtributo(c, rival.atributos[c]))) : null,
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
