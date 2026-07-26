import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { crearTarjeta } from '../components/card.js';
import {
  MOVIDAS, LIMITE_APRIETES, riesgoDe, resultadoNegociacion,
} from '../../core/negotiation.js';

const ICONO_MOVIDA = {
  cerrar: 'check', masPlata: 'billete', taquilla: 'balanza', apretar: 'rayo',
};

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

function barraPaciencia(negociacion) {
  const color = colorDePaciencia(negociacion.paciencia);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'fila', style: 'align-items:center;justify-content:space-between' }, [
      el('div', { class: 'fila', style: 'align-items:center;gap:6px;flex:0 0 auto' }, [
        icono('balanza', { tamano: 14, color }),
        el('b', { style: `color:${color}`, text: `Paciencia del promotor: ${negociacion.paciencia}/100` }),
      ]),
      // flex:0 0 auto (segunda vez reportado: "APRIETES 0/3 está
      // desalineado"): sin esto, `.fila > * { flex:1 }` (theme.css) estira
      // este span a la mitad de la fila igual que el bloque de paciencia de
      // al lado (que sí fija flex:0 0 auto), y el texto queda flotando en el
      // medio de esa mitad en vez de pegado al borde derecho contra
      // justify-content:space-between.
      el('span', {
        class: 'etiqueta',
        style: 'flex:0 0 auto',
        text: `Aprietes: ${negociacion.intentosApriete}/${LIMITE_APRIETES}`,
      }),
    ]),
    el('div', { class: 'barra-paciencia-pista', style: 'margin-top:8px' }, [
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

function tarjetaMovida(negociacion, movida, onMovida) {
  const esCierre = movida.id === 'cerrar';
  const sinMargen = negociacion.bloqueada || negociacion.intentosApriete >= LIMITE_APRIETES;
  const deshabilitada = !esCierre && sinMargen;
  const riesgo = esCierre ? null : Math.round(riesgoDe(negociacion, movida.id) * 100);

  const tarjeta = crearTarjeta({
    icono: icono(ICONO_MOVIDA[movida.id] ?? 'billete'),
    titulo: movida.nombre,
    descripcion: movida.texto,
    efectos: esCierre ? [] : [{ texto: `Riesgo que se levante: ${riesgo}%`, signo: signoDeRiesgo(riesgo) }],
    deshabilitada,
    onElegir: () => onMovida(movida.id),
  });
  tarjeta.dataset.movida = movida.id;
  return tarjeta;
}

export function renderNegociacion(contenedor, {
  negociacion, oferta, onMovida, onCerrar, onRechazar = () => {},
}) {
  const cerrada = negociacion.cerrada;
  const resultado = cerrada ? resultadoNegociacion(negociacion) : null;

  const movidas = cerrada ? [] : Object.values(MOVIDAS).map((movida) => tarjetaMovida(negociacion, movida, onMovida));

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
    cerrada ? null : el('div', { class: 'panel-decision-grilla-2 negociacion-movidas' }, movidas),
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
