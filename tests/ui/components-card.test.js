import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crearTarjeta, RAREZAS } from '../../src/ui/components/card.js';
import { icono } from '../../src/ui/icons.js';

describe('crearTarjeta', () => {
  it('la rareza normal no renderiza etiqueta de rareza', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'Pesas', descripcion: 'x', efectos: [] });
    expect(nodo.querySelector('.tarjeta-etiqueta')).toBeNull();
  });

  it('rara renderiza la etiqueta RARA', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'x', rareza: 'rara', efectos: [] });
    const etiqueta = nodo.querySelector('.tarjeta-etiqueta');
    expect(etiqueta).toBeTruthy();
    expect(etiqueta.textContent).toBe('RARA');
  });

  it('legendaria renderiza la etiqueta con el símbolo', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'x', rareza: 'legendaria', efectos: [] });
    const etiqueta = nodo.querySelector('.tarjeta-etiqueta');
    expect(etiqueta.textContent).toBe('✦ LEGENDARIA');
  });

  it('un efecto con probabilidad muestra el porcentaje', () => {
    const nodo = crearTarjeta({
      icono: icono('pesa'),
      titulo: 'x',
      efectos: [{ texto: '+5 Cardio', signo: 'positivo', probabilidad: 70 }],
    });
    const pill = nodo.querySelector('.tarjeta-efecto');
    expect(pill.textContent).toContain('70%');
    expect(pill.textContent).toContain('+5 Cardio');
  });

  it('un efecto sin probabilidad no muestra "SEGURO" ni ningún texto de probabilidad', () => {
    const nodo = crearTarjeta({
      icono: icono('pesa'),
      titulo: 'x',
      efectos: [{ texto: '+4 Mentón', signo: 'positivo' }],
    });
    const pill = nodo.querySelector('.tarjeta-efecto');
    expect(pill.textContent.toUpperCase()).not.toContain('SEGURO');
    expect(pill.textContent).not.toContain('%');
    expect(pill.textContent).toContain('+4 Mentón');
  });

  it('un efecto "leve" (malo pero leve, ej. fatiga) usa su propia clase de color', () => {
    const nodo = crearTarjeta({
      icono: icono('pesa'),
      titulo: 'x',
      efectos: [{ texto: '+2 Fatiga', signo: 'leve' }],
    });
    const pill = nodo.querySelector('.tarjeta-efecto');
    expect(pill.classList.contains('leve')).toBe(true);
  });

  it('el ícono y la etiqueta de rareza no comparten fila, y la etiqueta va primero', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'x', rareza: 'legendaria', efectos: [] });
    const filaEtiqueta = nodo.querySelector('.tarjeta-etiqueta-fila');
    const cuadroIcono = nodo.querySelector('.tarjeta-icono');
    expect(filaEtiqueta).toBeTruthy();
    expect(cuadroIcono).toBeTruthy();
    expect(filaEtiqueta.contains(cuadroIcono)).toBe(false);
    expect(cuadroIcono.contains(filaEtiqueta)).toBe(false);
    const posicion = filaEtiqueta.compareDocumentPosition(cuadroIcono);
    // eslint-disable-next-line no-bitwise
    expect(Boolean(posicion & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('la fila reservada para la etiqueta existe también en las normales, para que todas midan igual', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'x', efectos: [] });
    expect(nodo.querySelector('.tarjeta-etiqueta-fila')).toBeTruthy();
  });

  it('onElegir se dispara al hacer click', () => {
    let elegido = false;
    const nodo = crearTarjeta({
      icono: icono('pesa'), titulo: 'x', efectos: [], onElegir: () => { elegido = true; },
    });
    nodo.click();
    expect(elegido).toBe(true);
  });

  it('deshabilitada no dispara onElegir y queda marcada como disabled', () => {
    let elegido = false;
    const nodo = crearTarjeta({
      icono: icono('pesa'), titulo: 'x', efectos: [], deshabilitada: true, onElegir: () => { elegido = true; },
    });
    nodo.click();
    expect(elegido).toBe(false);
    expect(nodo.disabled).toBe(true);
  });

  it('RAREZAS expone las tres rarezas con sus etiquetas', () => {
    expect(RAREZAS.normal.etiqueta).toBeFalsy();
    expect(RAREZAS.rara.etiqueta).toBe('RARA');
    expect(RAREZAS.legendaria.etiqueta).toBe('✦ LEGENDARIA');
  });

  it('muestra título y descripción', () => {
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'Trabajo de cuello', descripcion: 'Te salva de un nocaut.', efectos: [] });
    expect(nodo.textContent).toContain('Trabajo de cuello');
    expect(nodo.textContent).toContain('Te salva de un nocaut.');
  });

  // v17: la fila de rareza pasó a estar FUERA DEL FLUJO. Antes reservaba 18px
  // fijos para que el ícono arrancara a la misma altura en toda la fila de
  // tarjetas, tuviera etiqueta o no; el costo era que esos 18px entraban en el
  // centrado vertical y empujaban el contenido visible hacia abajo ("no está
  // centrado todavía", pedido v17). Anclada arriba a la derecha se ve igual
  // que siempre y ya no desbalancea el eje.
  //
  // Se comprueba por `height`/`top` y no por `position`: happy-dom le filtra a
  // un descendiente de <button> el `position` del padre (devuelve el
  // `relative` de `.tarjeta`), pero sí resuelve bien el resto de la regla.
  it('la etiqueta de rareza ya no reserva alto propio, y su texto sigue chico (~7px)', () => {
    const CSS = readFileSync(join(process.cwd(), 'src/ui/theme.css'), 'utf-8');
    document.head.innerHTML = `<style>${CSS}</style>`;
    document.body.innerHTML = '';
    const nodo = crearTarjeta({ icono: icono('pesa'), titulo: 'x', rareza: 'legendaria', efectos: [] });
    document.body.appendChild(nodo);

    const estiloFila = window.getComputedStyle(nodo.querySelector('.tarjeta-etiqueta-fila'));
    const fuenteEtiqueta = parseFloat(window.getComputedStyle(nodo.querySelector('.tarjeta-etiqueta')).fontSize);

    expect(estiloFila.height).toBe('auto');
    expect(estiloFila.top).toBe('10px');
    expect(fuenteEtiqueta).toBeLessThanOrEqual(8);
  });
});
