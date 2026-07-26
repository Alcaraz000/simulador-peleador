import { el, mount, fmtDelta } from '../dom.js';
import { icono } from '../icons.js';
import { crearTarjeta } from '../components/card.js';
import { TONOS, resultadoCareo } from '../../core/presser.js';

// Un ícono por tono, reusando el mismo set del resto del juego (Task v3,
// pedido textual: "agregar iconos a Provocador, Frío/Técnico, Humilde y
// Canchero"). El color de cada uno lo pone el CSS por `data-tono` en la
// propia tarjeta (ver theme.css), no acá.
const ICONO_TONO = {
  provocador: 'rayo', frio: 'cerebro', humilde: 'corazon', canchero: 'estrella',
};

// Quién habla en cada ronda (Task v3, pedido textual): el careo mezcla
// chicanas del propio rival con preguntas de la prensa (ver PREGUNTAS_CAREO
// en content/cards-presser.js) — el jugador tiene que poder distinguir
// claramente quién le está hablando en cada línea.
function prefacioHablante(pregunta, rivalApodo) {
  return pregunta.hablante === 'periodista'
    ? el('div', { class: 'etiqueta', text: 'Un cronista, micrófono en mano:' })
    : el('div', { class: 'etiqueta dorado', text: `${rivalApodo}, cara a cara:` });
}

function textoVentaja(v) {
  return v > 0 ? 'a tu favor' : v < 0 ? 'en contra' : 'pareja';
}

function filaResumen(h) {
  return el('div', { class: 'panel careo-resumen-fila' }, [
    el('div', { class: 'fila', style: 'align-items:center;gap:8px' }, [
      el('span', { class: `careo-resumen-tono ${h.tono}`, text: TONOS[h.tono].nombre }),
      el('span', {
        class: 'etiqueta',
        style: 'flex:1;text-align:right',
        text: `Ronda ${h.ronda} · ${h.hablante === 'periodista' ? 'Prensa' : 'Rival'}`,
      }),
    ]),
    el('p', { class: 'medio', style: 'font-style:italic;margin-top:6px;font-size:12px', text: h.respuestaTexto }),
    el('div', { class: 'desc', style: 'margin-top:4px;font-size:11px', text: h.evento.texto }),
  ]);
}

// Resumen final (Task v3, pedido textual: "al terminar el careo, mostrar un
// resumen de las respuestas y qué consecuencias tuvo"): qué respondiste
// ronda por ronda, cómo quedó parado el careo (hype/ventaja) y qué
// consecuencias de verdad tuvo (fama, moral, calentura del rival).
function bloqueResumen(careo) {
  const resultado = resultadoCareo(careo);
  return el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Cómo quedó el careo' }),
    ...careo.historial.map(filaResumen),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Consecuencias' }),
      el('div', {
        class: 'medio',
        style: 'margin-top:6px;font-size:12px',
        text: `Terminaste con ${careo.hype}/100 de hype y la ventaja mental ${textoVentaja(careo.ventajaMental)}.`,
      }),
      el('div', { class: 'fila', style: 'margin-top:10px' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor dorado', text: fmtDelta(resultado.bonusFama) }),
          el('div', { class: 'nombre', text: 'Fama' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: `valor ${resultado.bonusMoral >= 0 ? 'verde' : 'rojo'}`, text: fmtDelta(resultado.bonusMoral) }),
          el('div', { class: 'nombre', text: 'Moral' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor rojo', text: `+${resultado.heatRival}` }),
          el('div', { class: 'nombre', text: `Calentura de ${careo.rivalApodo}` }),
        ]),
      ]),
    ]),
  ]);
}

export function renderCareo(contenedor, { careo, onResponder, onTerminar }) {
  const pregunta = careo.preguntas[Math.min(careo.ronda - 1, careo.preguntas.length - 1)];

  const barraHype = el('div', { class: 'barra dorada', 'data-hype': String(careo.hype) }, [
    el('i', { style: `width:${careo.hype}%` }),
  ]);

  // Grilla 2×2 (Task v3, pedido textual: "las opciones deben verse como una
  // grilla de 2x2"): reusa `.panel-decision-grilla-2`, la misma que ya arma
  // un 2×2 prolijo para 4 tarjetas en el resto del juego (creación del
  // peleador). Cada respuesta es una tarjeta de tamaño fijo del sistema de
  // tarjetas (crearTarjeta), con su ícono y el título coloreado por tono
  // (ver `.tarjeta[data-tono]` en theme.css).
  const respuestas = careo.terminado ? [] : pregunta.respuestas.map((r) => {
    const tarjeta = crearTarjeta({
      icono: icono(ICONO_TONO[r.tono] ?? 'guante'),
      titulo: TONOS[r.tono].nombre,
      descripcion: r.texto,
      efectos: [{ texto: TONOS[r.tono].pistaEfecto, signo: 'leve' }],
      onElegir: () => onResponder(r.tono),
    });
    tarjeta.dataset.tono = r.tono;
    return tarjeta;
  });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Careo · previa de la pelea' }),
    el('h1', { text: 'La conferencia' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Hype de la pelea — ${careo.hype}/100` }),
      barraHype,
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Ventaja mental: ${textoVentaja(careo.ventajaMental)}` }),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: `Lo incomoda: ${TONOS[careo.tell.incomoda].nombre}` }),
      el('div', { class: 'medio', style: 'font-size:12px', text: careo.tell.texto }),
    ]),
    careo.terminado ? null : el('div', { class: 'etiqueta', text: `Ronda ${Math.min(careo.ronda, careo.rondas)} de ${careo.rondas}` }),
    // `.careo-pregunta-texto` reserva el alto de 2 líneas (pedido general
    // del usuario, "todo quieto"): cada ronda trae una pregunta distinta y
    // de largo distinto — sin el mínimo reservado, la grilla de respuestas
    // de abajo salta de posición ronda a ronda según cuánto texto tocó.
    careo.terminado ? null : el('div', { class: 'panel' }, [
      prefacioHablante(pregunta, careo.rivalApodo),
      el('p', { class: 'careo-pregunta-texto', style: 'font-style:italic', text: pregunta.texto }),
    ]),
    careo.terminado ? null : el('div', { class: 'panel-decision-grilla-2' }, respuestas),
    careo.terminado ? bloqueResumen(careo) : null,
    careo.terminado
      ? el('button', { class: 'boton', dataset: { accion: 'terminar' }, text: 'Terminar el careo', onClick: onTerminar })
      : null,
  ]));
}
