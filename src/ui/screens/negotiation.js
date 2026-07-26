import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import {
  MOVIDAS, LIMITE_APRIETES, riesgoDe, resultadoNegociacion,
} from '../../core/negotiation.js';

const ICONO_MOVIDA = {
  cerrar: 'check', masPlata: 'billete', taquilla: 'balanza', apretar: 'rayo',
};

const FLECHA_RIESGO = { positivo: '↗', negativo: '↘', leve: '→' };

// Semáforo de paciencia: mismo lenguaje verde/dorado/rojo que el resto del
// juego (tiles de riesgo de la oferta, efectos de las tarjetas), aplicado acá
// a cuánto le queda de aguante al promotor.
function colorDePaciencia(paciencia) {
  if (paciencia >= 60) return 'var(--verde)';
  if (paciencia >= 30) return 'var(--dorado)';
  return 'var(--rojo)';
}

function signoDeRiesgo(pctRiesgo) {
  if (pctRiesgo >= 50) return 'negativo';
  if (pctRiesgo >= 25) return 'leve';
  return 'positivo';
}

// v6 (rediseño integral, pedido textual: "la barra de paciencia es muy
// grande, y ancha... da la impresión de que toda esta sección debe
// rearmarse"): pasa de una pista gruesa con borde propio (22px, sección
// aparte casi tan protagonista como las movidas) a una franja de estado
// chica — ícono en su propia placa (antes un SVG de 14px suelto, "se ven muy
// chicos" fue la queja puntual) + número, y la barra fina de siempre
// (`.barra`, 8px) en vez de una pista nueva. El foco visual pasa a la LISTA
// de movidas, que es lo importante de la pantalla (pedido explícito: "con
// enfoque en las cosas importantes").
function barraPaciencia(negociacion) {
  const color = colorDePaciencia(negociacion.paciencia);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'paciencia-fila' }, [
      el('div', { class: 'paciencia-info' }, [
        el('div', { class: 'paciencia-icono' }, [icono('balanza', { tamano: 18, color })]),
        el('div', { class: 'paciencia-textos' }, [
          el('div', { class: 'etiqueta', text: 'Paciencia del promotor' }),
          el('div', { class: 'paciencia-valor', style: `color:${color}`, text: `${negociacion.paciencia}/100` }),
        ]),
      ]),
      el('span', {
        class: 'etiqueta paciencia-aprietes',
        text: `Aprietes: ${negociacion.intentosApriete}/${LIMITE_APRIETES}`,
      }),
    ]),
    el('div', { class: 'barra', style: 'margin-top:8px' }, [
      el('i', { style: `width:${negociacion.paciencia}%;background:${color}` }),
    ]),
  ]);
}

// El campo que le faltaba a la pantalla (Task v3, pedido textual): qué
// acaba de pasar en la última movida — qué pediste, cómo reaccionó el
// promotor, cuánto subió (o no) la bolsa.
function bloqueEvento(negociacion) {
  if (!negociacion.ultimoEvento) return null;
  return el('div', { class: 'negociacion-evento', text: negociacion.ultimoEvento.texto });
}

// Fila de movida (v6): "más anchas que altas, en formato lista, todas del
// mismo tamaño, con su ícono a la izquierda" (pedido textual, con el ejemplo
// exacto "[ícono] Cerrá el trato / [ícono] Firmás lo que hay sobre la
// mesa..."). Ya no usa `crearTarjeta` (esa es la tarjeta CUADRADA del resto
// del juego, pensada para grillas de decisión, no para una lista angosta):
// acá es un <button> propio con su propia anatomía horizontal, ver
// `.movida-fila` en theme.css.
function filaMovida(negociacion, movida, onMovida) {
  const esCierre = movida.id === 'cerrar';
  const sinMargen = negociacion.bloqueada || negociacion.intentosApriete >= LIMITE_APRIETES;
  const deshabilitada = !esCierre && sinMargen;

  let riesgoNodo;
  if (esCierre) {
    // "Cerrá el trato" no tiene riesgo real, pero se le da un chip propio
    // ("Sin riesgo") en vez de dejar un hueco: las 4 filas comparten la
    // misma anatomía, ninguna se ve "incompleta" al lado de las otras.
    riesgoNodo = el('span', { class: 'movida-riesgo positivo', text: 'Sin riesgo' });
  } else {
    const riesgo = Math.round(riesgoDe(negociacion, movida.id) * 100);
    const signo = signoDeRiesgo(riesgo);
    riesgoNodo = el('span', {
      class: `movida-riesgo ${signo}`,
      text: `${FLECHA_RIESGO[signo]} Riesgo que se levante: ${riesgo}%`,
    });
  }

  const fila = el('button', {
    class: 'movida-fila',
    type: 'button',
    dataset: { movida: movida.id },
    disabled: deshabilitada ? '' : null,
    onClick: () => { if (!deshabilitada) onMovida(movida.id); },
  }, [
    el('div', { class: 'movida-icono' }, [icono(ICONO_MOVIDA[movida.id] ?? 'billete', { tamano: 21 })]),
    el('div', { class: 'movida-cuerpo' }, [
      el('div', { class: 'movida-titulo', text: movida.nombre }),
      el('div', { class: 'movida-desc', text: movida.texto }),
      riesgoNodo,
    ]),
  ]);
  return fila;
}

export function renderNegociacion(contenedor, {
  negociacion, oferta, onMovida, onCerrar, onRechazar = () => {},
}) {
  const cerrada = negociacion.cerrada;
  const resultado = cerrada ? resultadoNegociacion(negociacion) : null;

  const movidas = cerrada ? [] : Object.values(MOVIDAS).map((movida) => filaMovida(negociacion, movida, onMovida));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Firma del contrato' }),
    el('h1', { text: 'La negociación' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Bolsa sobre la mesa' }),
      el('div', { class: 'verde', style: 'font-size:30px;font-weight:800', text: fmtDinero(negociacion.bolsa) }),
      el('div', { class: 'etiqueta', text: `Empezó en ${fmtDinero(negociacion.bolsaInicial)} · ${oferta.enJuego}` }),
      negociacion.condiciones.length > 0
        ? el('div', { class: 'mods', text: negociacion.condiciones.join(' · ') })
        : null,
    ]),
    cerrada ? null : barraPaciencia(negociacion),
    cerrada ? null : bloqueEvento(negociacion),
    cerrada ? null : el('div', { class: 'negociacion-lista' }, movidas),
    // Rechazar la pelea entera (Task v3, pedido textual: "falta el botón de
    // rechazar, tiene que estar siempre disponible") — nunca se apaga, ni
    // siquiera con la negociación bloqueada por un apriete fallido.
    cerrada ? null : el('button', {
      class: 'boton secundario', dataset: { accion: 'rechazar' }, text: 'Rechazar la pelea', onClick: onRechazar,
    }),
    cerrada ? el('div', { class: 'panel' }, [
      el('p', { class: 'verde', text: `Cerrado: ${fmtDinero(resultado.bolsa)}.` }),
      negociacion.ultimoEvento ? el('p', { class: 'medio', style: 'font-style:italic;margin-top:6px', text: negociacion.ultimoEvento.texto }) : null,
    ]) : null,
    cerrada
      ? el('button', { class: 'boton', dataset: { accion: 'seguir' }, text: 'A entrenar', onClick: onCerrar })
      : null,
  ]));
}
