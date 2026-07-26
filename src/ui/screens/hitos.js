import { el } from '../dom.js';
import { icono } from '../icons.js';
import { abrirPopup } from '../components/popup.js';
import { textoDeHito } from '../../core/hitos.js';

// Popups de hitos de carrera (Sistema 4, feedback del usuario: "faltan
// popups cuando pasen cosas importantes"). Capa fina: `textoDeHito`
// (core/hitos.js) ya resolvió título/texto/ícono/tono — acá solo se arma el
// contenido y se abre con `abrirPopup`, mismo componente que ya usan la
// tienda y el picker de nacionalidad. Sin título en la cabecera del popup
// (a diferencia de la tienda): el título GRANDE va adentro, como parte de
// la celebración (o el golpe), no como una etiqueta chica arriba.

const CLASE_TONO = { positivo: 'dorado', negativo: 'rojo', neutro: 'medio' };

function contenidoHito(resuelto) {
  const clase = CLASE_TONO[resuelto.tono] ?? 'medio';
  return el('div', { class: 'stack hito-popup' }, [
    el('div', { class: `hito-popup-icono ${clase}` }, [icono(resuelto.icono, { tamano: 40 })]),
    el('h1', { class: `hito-popup-titulo ${clase}`, text: resuelto.titulo }),
    el('p', { class: 'medio hito-popup-texto', text: resuelto.texto }),
  ]);
}

/**
 * Abre el popup de un hito ya detectado (hitosDePelea/hitoDeEtapa,
 * core/hitos.js). Si el tipo no se reconoce, no hace nada — nunca revienta
 * la carrera por un hito raro o mal formado.
 *
 * @param {object} hito
 * @param {{ onCerrar?: () => void }} [opciones]
 * @returns el handle de abrirPopup, o null si el hito no se reconoció.
 */
export function mostrarHito(hito, { onCerrar = () => {} } = {}) {
  const resuelto = textoDeHito(hito);
  if (!resuelto) return null;
  return abrirPopup({ contenido: contenidoHito(resuelto), onCerrar });
}
