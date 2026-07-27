// Resumen de fin de año (pedido textual del usuario): "cada vez que termina
// un año calendario, quiero que aparezca un resumen de lo ocurrido y
// gráficos que muestren cómo fueron cambiando con los meses la media, debe
// mostrar las decisiones tomadas y las peleas hechas (contrincante, fecha,
// resultado, modo de victoria)". Vive DENTRO de la región central del
// tablero, como cualquier otro beat (ver beatResumenAnio, main.js) — nunca
// una pantalla aparte ni un popup con su propio ciclo de vida: cerrarlo es
// UN solo click ("Seguir"), sin animaciones, para no gastar presupuesto de
// minutos (ver el informe de balance entregado con esta ronda).
//
// v8 (pedido textual: "hay que mejorar esta sección, más compacta"): antes
// cada decisión y cada pelea vivía en su propio `.panel` con padding grande,
// icono circular e ícono+3 líneas apiladas — mucho aire para poco dato. Ahora
// son FILAS de una sola tabla compacta (un `.panel` por sección, filas
// separadas por un hairline — ver `.resumen-anio-fila` en theme.css), y se
// suman: íconos en el encabezado y en la crónica, el gráfico de media
// SIEMPRE de enero a diciembre (antes se achicaba al tramo con datos, ver
// grafico-media.js), un gráfico nuevo de evolución en el ranking, y la
// bandera del rival (SVG, nunca emoji) en cada pelea.
import { el, mount } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { graficoMedia, graficoRanking } from '../components/grafico-media.js';
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
  return fechaDe(semana, ANIO_INICIAL).nombreMes;
}

// Fila compacta de una decisión: etiqueta de tipo (con su ícono) + título +
// descripción, todo en un renglón — reemplaza al panel apilado de antes
// (Pedido 2, v8: "mucho más compacto"). Título y descripción pueden envolver
// a una segunda línea si no entran (nunca se recortan con "…").
function itemDecision(d) {
  return el('div', { class: 'resumen-anio-fila' }, [
    el('span', { class: 'resumen-anio-fila-tag' }, [
      icono(ICONO_TIPO[d.tipo] ?? 'pesa', { tamano: 10 }),
      el('span', { text: TITULO_TIPO[d.tipo] ?? 'Decisión' }),
    ]),
    el('span', { class: 'resumen-anio-fila-titulo', text: d.titulo }),
    el('span', { class: 'resumen-anio-fila-desc medio', text: d.opcion }),
  ]);
}

// Fila compacta de una pelea: mes + bandera del rival (SVG, nunca emoji,
// `bandera()` de flags.js) + nombre + método + veredicto. `p.rivalNacionalidad`
// lo agrega main.js buscando al rival en el roster del mundo (el historial de
// peleas no guarda la nacionalidad — ver el comentario en beatResumenAnio).
function itemPelea(p) {
  const rival = p.rivalApodo ?? p.rivalNombre;
  const metodo = `${METODOS[p.metodo] ?? p.metodo}${p.esTitulo ? ' · título' : ''}`;
  const mes = p.fecha !== null && p.fecha !== undefined ? mesDe(p.fecha) : '';
  return el('div', { class: 'resumen-anio-fila' }, [
    el('span', { class: 'resumen-anio-fila-tag', text: mes }),
    el('span', { class: 'resumen-anio-fila-rival' }, [
      bandera(p.rivalNacionalidad, { ancho: 15 }),
      el('span', { text: rival }),
    ]),
    el('span', { class: 'resumen-anio-fila-metodo medio', text: metodo }),
    el('span', {
      // Pedido 6 (v9, "columnas alineadas"): ancho fijo (ver
      // .resumen-anio-fila-resultado, theme.css) en vez del inline style de
      // antes — mismo motivo que el resto de las columnas de esta fila.
      class: `resumen-anio-fila-resultado ${RESULTADO_CLASE[p.resultado] ?? 'sutil'}`,
      text: RESULTADO_TEXTO[p.resultado] ?? p.resultado,
    }),
  ]);
}

// Una sección entera es UN solo `.panel` con todas sus filas adentro,
// separadas por un hairline (ver `.resumen-anio-fila + .resumen-anio-fila`,
// theme.css) — antes cada item era su PROPIO panel con borde y padding
// completo; ahora el borde solo rodea la sección, no cada fila.
function seccion(titulo, items) {
  if (items.length === 0) return null;
  return el('div', { class: 'stack resumen-anio-seccion' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('div', { class: 'panel resumen-anio-filas' }, items),
  ]);
}

// Un gráfico con su propia etiqueta chica arriba (Media / Ranking) — antes el
// gráfico de media vivía solo, sin nombre propio, porque era el único; ahora
// que hay dos apilados hace falta distinguirlos de un vistazo.
//
// v9 (feedback del usuario: "sacar la leyenda 'Más arriba, mejor puesto' del
// gráfico de ranking [...] la inversión de la escala se tiene que entender
// por el diseño del gráfico, no por un cartel"): este bloque ya NO recibe una
// nota aparte — el propio eje Y del gráfico de ranking (grafico-media.js)
// ahora dibuja sus valores en orden decreciente de arriba hacia abajo, así
// que la inversión se lee sola, sin texto adicional.
function bloqueGrafico(titulo, nodoGrafico) {
  return el('div', { class: 'panel' }, [
    el('span', { class: 'etiqueta', style: 'display:block;margin-bottom:4px', text: titulo }),
    nodoGrafico,
  ]);
}

/**
 * @param {HTMLElement} region - normalmente `centroContenido()` (main.js).
 * @param {{
 *   anio: number,
 *   muestrasMedia: Array<{semana:number, media:number, ranking:number|null}>,
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
      el('div', { class: 'resumen-anio-icono' }, [icono('grafico', { tamano: 18 })]),
      // v9 (feedback del usuario: "(Resumen del año) tiene que estar pegado
      // al año, no flotando a la derecha"): esto YA vivía en una `fila` con
      // gap chico — el bug real era que `.fila > *` (regla genérica,
      // theme.css) le da `flex:1` a CUALQUIER hijo directo de una `.fila`,
      // así que el h1 y la etiqueta se repartían el ancho disponible 50/50
      // en vez de pegarse uno al otro (la etiqueta terminaba arrancando a
      // mitad de camino del contenedor, lejos del año). Clase dedicada
      // (`resumen-anio-cabecera-anio`, ver theme.css) que fija sus hijos en
      // `flex:0 0 auto`: ambos miden su propio contenido, nunca más.
      el('div', { class: 'resumen-anio-cabecera-anio' }, [
        el('h1', { style: 'margin:0', text: String(anio) }),
        el('span', { class: 'etiqueta', text: '(Resumen del año)' }),
      ]),
    ]),
    narrativa ? el('div', { class: 'fila', style: 'align-items:center;gap:8px' }, [
      el('div', { class: 'resumen-anio-icono resumen-anio-icono-chico' }, [icono('microfono', { tamano: 13 })]),
      el('p', { class: 'medio', style: 'margin:0;flex:1;min-width:0', text: narrativa }),
    ]) : null,
    bloqueGrafico('Media', graficoMedia({ muestras: muestrasMedia, anio })),
    bloqueGrafico('Ranking', graficoRanking({ muestras: muestrasMedia, anio })),
    seccion('Decisiones', decisiones.map(itemDecision)),
    seccion('Peleas del año', peleas.map(itemPelea)),
    el('button', {
      class: 'boton', type: 'button', text: 'Seguir', onClick: () => onContinuar(),
    }),
  ]);

  mount(region, cuerpo);
}
