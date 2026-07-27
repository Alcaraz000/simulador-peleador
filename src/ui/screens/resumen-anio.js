// Resumen de fin de año (pedido textual del usuario): "cada vez que termina
// un año calendario, quiero que aparezca un resumen de lo ocurrido y
// gráficos que muestren cómo fueron cambiando con los meses la media, debe
// mostrar las decisiones tomadas y las peleas hechas (contrincante, fecha,
// resultado, modo de victoria)". Vive DENTRO de la región central del
// tablero, como cualquier otro beat (ver beatResumenAnio, main.js) — nunca
// una pantalla aparte ni un popup con su propio ciclo de vida: cerrarlo es
// UN solo click ("Seguir"), sin animaciones, para no gastar presupuesto de
// minutos (ver el informe de balance entregado con esta ronda).
import { el, mount } from '../dom.js';
import { icono } from '../icons.js';
import { graficoMedia } from '../components/grafico-media.js';
import { fechaDe } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';

// "Modo de victoria (puntos, tko, etc.)" — pedido textual: 'decision' se
// muestra como "Puntos" (no "Decisión" a secas), la palabra que el usuario
// usó.
const METODOS = {
  ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Puntos', descalificacion: 'DQ',
};

const RESULTADO_TEXTO = { v: 'Ganó', d: 'Perdió', e: 'Empató' };
const RESULTADO_CLASE = { v: 'verde', d: 'rojo', e: 'sutil' };

// Mismo ícono que ya usa cada tipo de tarjeta en el tablero (beatCarta/
// beatMejora/beatCampCarta, main.js) — la lista del resumen se lee de un
// vistazo porque reusa el mismo lenguaje visual, no uno nuevo.
const ICONO_TIPO = {
  mejora: 'pesa', evento: 'alerta', redes: 'microfono', campamento: 'pesa',
};
const TITULO_TIPO = {
  mejora: 'Mejora', evento: 'Decisión', redes: 'Redes sociales', campamento: 'Campamento',
};

function mesDe(semana) {
  const { nombreMes, anio } = fechaDe(semana, ANIO_INICIAL);
  return `${nombreMes} ${anio}`;
}

function itemDecision(d) {
  return el('div', { class: 'panel resumen-anio-item' }, [
    el('div', { class: 'resumen-anio-item-icono' }, [icono(ICONO_TIPO[d.tipo] ?? 'pesa', { tamano: 16 })]),
    el('div', { style: 'flex:1;min-width:0' }, [
      el('div', { class: 'etiqueta', text: TITULO_TIPO[d.tipo] ?? 'Decisión' }),
      el('div', { style: 'font-weight:800;font-size:12.5px', text: d.titulo }),
      el('div', { class: 'medio', style: 'font-size:11.5px', text: d.opcion }),
    ]),
  ]);
}

function itemPelea(p) {
  const rival = p.rivalApodo ?? p.rivalNombre;
  const metodo = METODOS[p.metodo] ?? p.metodo;
  const fecha = p.fecha !== null && p.fecha !== undefined ? mesDe(p.fecha) : '';
  return el('div', { class: 'panel resumen-anio-item' }, [
    el('div', { style: 'flex:1;min-width:0' }, [
      el('div', { class: 'etiqueta', text: fecha }),
      el('div', { style: 'font-weight:800;font-size:12.5px', text: rival }),
      el('div', { class: 'medio', style: 'font-size:11.5px', text: `${metodo}${p.esTitulo ? ' · título en juego' : ''}` }),
    ]),
    el('div', {
      class: RESULTADO_CLASE[p.resultado] ?? 'sutil',
      style: 'font-weight:800;flex:0 0 auto',
      text: RESULTADO_TEXTO[p.resultado] ?? p.resultado,
    }),
  ]);
}

function seccion(titulo, items) {
  if (items.length === 0) return null;
  return el('div', { class: 'stack resumen-anio-seccion' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('div', { class: 'stack', style: 'gap:6px' }, items),
  ]);
}

/**
 * @param {HTMLElement} region - normalmente `centroContenido()` (main.js).
 * @param {{
 *   anio: number,
 *   muestrasMedia: Array<{semana:number, media:number}>,
 *   decisiones: Array<{tipo:string, titulo:string, opcion:string, semana:number}>,
 *   peleas: Array<object>,
 *   narrativa: string,
 *   onContinuar: () => void,
 * }} props
 */
export function renderResumenAnio(region, {
  anio, muestrasMedia = [], decisiones = [], peleas = [], narrativa = '', onContinuar = () => {},
}) {
  const cuerpo = el('div', { class: 'stack resumen-anio' }, [
    el('div', { class: 'fila', style: 'align-items:center;gap:8px' }, [
      el('div', { class: 'resumen-anio-icono' }, [icono('grafico', { tamano: 20 })]),
      el('div', {}, [
        el('div', { class: 'etiqueta', text: 'Resumen del año' }),
        el('h1', { style: 'margin:0', text: String(anio) }),
      ]),
    ]),
    narrativa ? el('p', { class: 'medio', text: narrativa }) : null,
    el('div', { class: 'panel' }, [graficoMedia({ muestras: muestrasMedia })]),
    seccion('Decisiones tomadas', decisiones.map(itemDecision)),
    seccion('Peleas del año', peleas.map(itemPelea)),
    el('button', {
      class: 'boton', type: 'button', text: 'Seguir', onClick: () => onContinuar(),
    }),
  ]);

  mount(region, cuerpo);
}
