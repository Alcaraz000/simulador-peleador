import { describe, it, expect, beforeEach } from 'vitest';
import { abrirPopup } from '../../../src/ui/components/popup.js';
import { el, mount } from '../../../src/ui/dom.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

function dispatchEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('abrirPopup', () => {
  it('muestra el título y el contenido, montado sobre document.body', () => {
    abrirPopup({ titulo: 'La tienda', contenido: el('p', { text: 'Todo lo que necesitás.' }) });
    expect(document.body.textContent).toContain('La tienda');
    expect(document.body.textContent).toContain('Todo lo que necesitás.');
  });

  it('la X cierra el popup y dispara onCerrar', () => {
    let cerrado = false;
    abrirPopup({ titulo: 'T', contenido: el('p'), onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-cerrar').click();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('Escape cierra el popup', () => {
    let cerrado = false;
    abrirPopup({ titulo: 'T', contenido: el('p'), onCerrar: () => { cerrado = true; } });
    dispatchEscape();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('clickear afuera (el fondo) cierra el popup', () => {
    let cerrado = false;
    abrirPopup({ titulo: 'T', contenido: el('p'), onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-overlay').click();
    expect(cerrado).toBe(true);
  });

  it('clickear DENTRO del panel no lo cierra', () => {
    let cerrado = false;
    abrirPopup({ titulo: 'T', contenido: el('p', { text: 'contenido' }), onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-panel').click();
    expect(cerrado).toBe(false);
    expect(document.querySelector('.popup-overlay')).toBeTruthy();
  });

  it('al cerrar devuelve el foco a donde estaba antes de abrir', () => {
    const boton = el('button', { text: 'Abrir' });
    mount(document.getElementById('app'), boton);
    boton.focus();
    expect(document.activeElement).toBe(boton);

    abrirPopup({ titulo: 'T', contenido: el('p') });
    document.querySelector('.popup-cerrar').click();

    expect(document.activeElement).toBe(boton);
  });

  it('no deja un listener de Escape colgado: cerrado el popup, Escape no vuelve a llamar onCerrar', () => {
    let veces = 0;
    abrirPopup({ titulo: 'T', contenido: el('p'), onCerrar: () => { veces += 1; } });
    document.querySelector('.popup-cerrar').click();
    expect(veces).toBe(1);

    dispatchEscape();
    expect(veces).toBe(1);
  });

  it('cerrar() es idempotente: llamarlo dos veces no rompe ni duplica onCerrar', () => {
    let veces = 0;
    const popup = abrirPopup({ titulo: 'T', contenido: el('p'), onCerrar: () => { veces += 1; } });
    popup.cerrar();
    popup.cerrar();
    expect(veces).toBe(1);
  });

  it('onCerrar es opcional', () => {
    const popup = abrirPopup({ titulo: 'T', contenido: el('p') });
    expect(() => popup.cerrar()).not.toThrow();
  });

  it('expone un nodo `cuerpo` donde se puede volver a montar contenido (refrescar en el lugar)', () => {
    const popup = abrirPopup({ titulo: 'T', contenido: el('p', { text: 'viejo' }) });
    expect(document.body.textContent).toContain('viejo');
    mount(popup.cuerpo, el('p', { text: 'nuevo' }));
    expect(document.body.textContent).toContain('nuevo');
    expect(document.body.textContent).not.toContain('viejo');
  });

  it('sin título, no rompe (el título es opcional)', () => {
    expect(() => abrirPopup({ contenido: el('p', { text: 'x' }) })).not.toThrow();
  });
});
