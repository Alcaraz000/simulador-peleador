import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { abrirPopup } from '../components/popup.js';
import { catalogo } from '../../core/money.js';

// Tienda (Task 5.4): decisión #1 del brief — se abre como POPUP desde el
// tablero, nunca como pantalla aparte. Staff en lista con ícono a la
// izquierda; lujos en grilla con ícono. Lo que no se puede pagar queda
// claramente apagado (antes el precio de un ítem impagable se seguía
// mostrando en verde — el color de "sí podés" — así que no se leía como
// deshabilitado de verdad; ver el CSS de `.tienda-item.no-alcanza`).

const ICONOS_STAFF = {
  entrenador: 'pesa',
  kinesiologo: 'corazon',
  psicologo: 'cerebro',
  preparador: 'rayo',
  manager: 'maletin',
};

const ICONOS_LUJO = {
  auto: 'auto',
  casa: 'casa',
  mansion: 'estrella',
  yate: 'ancla',
  isla: 'globo',
};

function estadoItem(item) {
  if (item.comprado) return 'comprado';
  if (!item.alcanza) return 'no-alcanza';
  return 'disponible';
}

function nodoPrecio(item, estado, textoComprado) {
  if (estado === 'comprado') {
    return el('div', { class: 'tienda-precio dorado' }, [
      icono('check', { tamano: 12 }),
      el('span', { text: textoComprado }),
    ]);
  }
  const clase = estado === 'no-alcanza' ? 'sutil' : 'verde';
  return el('div', { class: `tienda-precio ${clase}`, text: fmtDinero(item.precio) });
}

function filaStaff(item, onComprar) {
  const estado = estadoItem(item);
  return el('button', {
    class: `carta tienda-item tienda-item-staff ${estado}`,
    'data-item': item.id,
    type: 'button',
    disabled: estado === 'disponible' ? null : '',
    onClick: () => { if (estado === 'disponible') onComprar(item.id); },
  }, [
    el('div', { class: 'tienda-item-icono' }, [icono(ICONOS_STAFF[item.id] ?? 'pesa', { tamano: 18 })]),
    el('div', { class: 'tienda-item-info' }, [
      el('div', { class: 'tienda-item-nombre', text: item.nombre }),
      el('div', { class: 'tienda-item-desc', text: item.descripcion }),
    ]),
    nodoPrecio(item, estado, 'En el equipo'),
  ]);
}

function filaLujo(item, onComprar) {
  const estado = estadoItem(item);
  return el('button', {
    class: `carta tienda-item tienda-item-lujo ${estado}`,
    'data-item': item.id,
    type: 'button',
    disabled: estado === 'disponible' ? null : '',
    onClick: () => { if (estado === 'disponible') onComprar(item.id); },
  }, [
    el('div', { class: 'tienda-item-icono' }, [icono(ICONOS_LUJO[item.id] ?? 'estrella', { tamano: 22 })]),
    el('div', { class: 'tienda-item-nombre', text: item.nombre }),
    nodoPrecio(item, estado, 'Ya lo tenés'),
  ]);
}

function contenidoTienda(jugador, onComprar) {
  const { staff, lujos } = catalogo(jugador);
  return el('div', { class: 'stack' }, [
    el('div', { class: 'tienda-disponible' }, [
      el('div', { class: 'etiqueta', text: 'Disponible' }),
      el('div', { class: 'verde', style: 'font-size:18px;font-weight:800', text: fmtDinero(jugador.dinero) }),
    ]),
    el('div', { class: 'etiqueta dorado tienda-seccion-titulo', text: 'Staff · te mejoran el juego' }),
    el('div', { class: 'stack' }, staff.map((i) => filaStaff(i, onComprar))),
    el('div', { class: 'etiqueta dorado tienda-seccion-titulo', text: 'Lujo · date el gusto' }),
    el('div', { class: 'tienda-lujos-grilla' }, lujos.map((i) => filaLujo(i, onComprar))),
  ]);
}

/**
 * Abre la tienda como popup. `onComprar(id)` hace la compra afuera (es quien
 * tiene el estado real de `partida.jugador`, ver main.js) y devuelve el
 * jugador ya actualizado; acá adentro solo se usa ese valor para refrescar
 * el popup EN EL LUGAR, sin cerrarlo y volver a abrirlo.
 *
 * @param {{ jugador: object, onComprar: (id: string) => object, onCerrar?: () => void }} props
 * @returns el handle de abrirPopup (para poder cerrarlo desde afuera si hiciera falta).
 */
export function renderTienda({ jugador, onComprar, onCerrar = () => {} }) {
  let actual = jugador;
  const cuerpo = el('div', {});

  function pintar() {
    mount(cuerpo, contenidoTienda(actual, comprar));
  }

  function comprar(id) {
    const nuevo = onComprar(id);
    if (nuevo) actual = nuevo;
    pintar();
  }

  pintar();
  return abrirPopup({ titulo: 'La tienda', contenido: cuerpo, onCerrar });
}
