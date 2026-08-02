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

  // Pedido 3 (v14, golpe de gracia como popup — "quiero que dé la sensación
  // de que es un momento de urgencia y crítico"): una clase extra opcional
  // en el panel para que un llamador puntual pueda darle su propio look
  // (el golpe de gracia la usa para un borde/resplandor rojo, ver
  // fight.js/theme.css) sin tocar el resto de los popups, que no la pasan.
  it('con claseExtra, se la suma a .popup-panel (sin pisar la clase base)', () => {
    abrirPopup({ titulo: 'T', contenido: el('p'), claseExtra: 'popup-critico' });
    const panel = document.querySelector('.popup-panel');
    expect(panel.classList.contains('popup-panel')).toBe(true);
    expect(panel.classList.contains('popup-critico')).toBe(true);
  });

  it('sin claseExtra (el resto de los popups), el panel no lleva ninguna clase de más', () => {
    abrirPopup({ titulo: 'T', contenido: el('p') });
    const panel = document.querySelector('.popup-panel');
    expect(panel.className.trim()).toBe('popup-panel');
  });

  // Pedido 3 (v14, golpe de gracia como popup): "no quiero que se pueda
  // cerrar con Escape ni clickeando afuera — si te vas, perdés la chance, y
  // eso tiene que ser una decisión explícita, no un accidente". Los otros
  // consumidores (tienda, ranking, hitos, nacionalidad) no pasan estas
  // opciones — por default siguen cerrando con las tres vías de siempre
  // (los tests de arriba ya lo prueban sin pasar nada nuevo).
  describe('con cerrableConEscape/cerrableClickAfuera en false (popup "sin salida fácil")', () => {
    it('Escape NO cierra el popup', () => {
      let cerrado = false;
      abrirPopup({
        titulo: 'T', contenido: el('p'), onCerrar: () => { cerrado = true; }, cerrableConEscape: false,
      });
      dispatchEscape();
      expect(cerrado).toBe(false);
      expect(document.querySelector('.popup-overlay')).toBeTruthy();
    });

    it('clickear afuera (el fondo) NO cierra el popup', () => {
      let cerrado = false;
      abrirPopup({
        titulo: 'T', contenido: el('p'), onCerrar: () => { cerrado = true; }, cerrableClickAfuera: false,
      });
      document.querySelector('.popup-overlay').click();
      expect(cerrado).toBe(false);
      expect(document.querySelector('.popup-overlay')).toBeTruthy();
    });

    it('la X SIGUE cerrando el popup (la única salida es explícita)', () => {
      let cerrado = false;
      abrirPopup({
        titulo: 'T',
        contenido: el('p'),
        onCerrar: () => { cerrado = true; },
        cerrableConEscape: false,
        cerrableClickAfuera: false,
      });
      document.querySelector('.popup-cerrar').click();
      expect(cerrado).toBe(true);
      expect(document.querySelector('.popup-overlay')).toBeNull();
    });

    it('llamar a cerrar() a mano sigue funcionando (para que el propio llamador pueda cerrarlo por código)', () => {
      let cerrado = false;
      const popup = abrirPopup({
        titulo: 'T',
        contenido: el('p'),
        onCerrar: () => { cerrado = true; },
        cerrableConEscape: false,
        cerrableClickAfuera: false,
      });
      popup.cerrar();
      expect(cerrado).toBe(true);
    });

    it('no deja el listener de Escape colgado aunque Escape no cierre nada mientras estuvo abierto', () => {
      let veces = 0;
      const popup = abrirPopup({
        titulo: 'T', contenido: el('p'), onCerrar: () => { veces += 1; }, cerrableConEscape: false,
      });
      dispatchEscape();
      expect(veces).toBe(0);
      popup.cerrar();
      expect(veces).toBe(1);
      dispatchEscape();
      expect(veces).toBe(1); // el listener ya se sacó, Escape no hace nada
    });
  });
});
