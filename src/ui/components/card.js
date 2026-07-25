import { el } from '../dom.js';

/**
 * Rarezas del sistema de tarjetas. `normal` no lleva etiqueta (se sobreentiende);
 * `rara` y `legendaria` sí, en una fila reservada arriba del ícono que nunca
 * lo toca. Las legendarias son deliberadamente potentes: no se nerfean.
 */
export const RAREZAS = {
  normal: { id: 'normal', etiqueta: null, color: null },
  rara: { id: 'rara', etiqueta: 'RARA', color: '#7fa6e0' },
  legendaria: { id: 'legendaria', etiqueta: '✦ LEGENDARIA', color: '#f2c14e' },
};

const FLECHAS = { positivo: '↗', negativo: '↘', leve: '→' };

function labelEfecto(efecto) {
  if (efecto.probabilidad !== undefined && efecto.probabilidad !== null) {
    return `${efecto.probabilidad}% ${efecto.texto}`;
  }
  const flecha = FLECHAS[efecto.signo] ?? '';
  return flecha ? `${flecha} ${efecto.texto}` : efecto.texto;
}

/**
 * Tarjeta unificada: usada para mejoras, eventos, redes, apodos, orígenes,
 * estilos y opciones de golpe de gracia. Misma anatomía en todos lados:
 * fila de etiqueta (rareza) → ícono centrado → título → descripción → efectos.
 */
export function crearTarjeta({
  icono = null,
  titulo,
  descripcion = '',
  efectos = [],
  rareza = 'normal',
  deshabilitada = false,
  onElegir = () => {},
}) {
  const meta = RAREZAS[rareza] ?? RAREZAS.normal;

  const filaEtiqueta = el('div', { class: 'tarjeta-etiqueta-fila' }, [
    meta.etiqueta ? el('span', { class: `tarjeta-etiqueta ${meta.id}`, text: meta.etiqueta }) : null,
  ]);

  const cuadroIcono = el('div', { class: 'tarjeta-icono' }, icono ? [icono] : null);

  const listaEfectos = efectos.length > 0
    ? el('div', { class: 'tarjeta-efectos' }, efectos.map((efecto) => el('div', {
      class: `tarjeta-efecto ${efecto.signo}`,
      text: labelEfecto(efecto),
    })))
    : null;

  return el('button', {
    class: `tarjeta ${meta.id === 'normal' ? '' : meta.id}`.trim(),
    type: 'button',
    dataset: { rareza: meta.id },
    disabled: deshabilitada ? '' : null,
    onClick: () => { if (!deshabilitada) onElegir(); },
  }, [
    filaEtiqueta,
    cuadroIcono,
    el('div', { class: 'tarjeta-titulo', text: titulo }),
    descripcion ? el('div', { class: 'tarjeta-desc', text: descripcion }) : null,
    listaEfectos,
  ]);
}
