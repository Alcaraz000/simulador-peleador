import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '../../src/core/rng.js';
import {
  crearNegociacion, jugarMovida, LIMITE_APRIETES,
} from '../../src/core/negotiation.js';
import { renderNegociacion } from '../../src/ui/screens/negotiation.js';

const oferta = { id: 'of_1', bolsa: 8000, enJuego: 'Título regional' };

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

function noop() {}

function cargarCSS() {
  const CSS = readFileSync(join(process.cwd(), 'src/ui/theme.css'), 'utf-8');
  document.head.innerHTML = `<style>${CSS}</style>`;
}

describe('renderNegociacion', () => {
  it('muestra la bolsa, la barra de paciencia (pista gruesa, no la barrita fina) y las 4 movidas', () => {
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    expect(cont.textContent).toContain('US$ 8K');
    expect(cont.querySelector('.barra-paciencia-pista')).toBeTruthy();
    expect(cont.querySelectorAll('[data-movida]')).toHaveLength(4);
  });

  it('las movidas son tarjetas de tamaño fijo del sistema de tarjetas del juego', () => {
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    for (const nodo of cont.querySelectorAll('[data-movida]')) {
      expect(nodo.classList.contains('tarjeta')).toBe(true);
    }
  });

  // Feedback repetido del usuario ("las opciones se ven muy grandes"): la
  // negociación vive FUERA del shell (pantalla completa, #app vuelve a su
  // max-width angosto), así que en escritorio la grilla de 2 columnas de
  // siempre (.panel-decision-grilla-2) estiraba cada tarjeta mucho más ancha
  // que la referencia del sistema de tarjetas (~206px, mockups-v2.html). Se
  // acerca sin tocar crearTarjeta (tamaño fijo de título/desc en todos
  // lados): un tope de ancho + centrado en la propia celda de la grilla.
  it('las tarjetas de movida tienen un ancho tope (mas compactas que estirarse a toda la columna)', () => {
    cargarCSS();
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    const tarjetas = [...cont.querySelectorAll('[data-movida]')];
    expect(tarjetas.length).toBe(4);
    for (const t of tarjetas) {
      const maxWidth = window.getComputedStyle(t).maxWidth;
      expect(maxWidth).not.toBe('none');
      expect(parseInt(maxWidth, 10)).toBeLessThanOrEqual(220);
    }
  });

  // Segunda vez que se reporta: "APRIETES 0/3 está desalineado". Causa real:
  // `.fila > * { flex:1 }` (theme.css) hace que el span de la derecha se
  // estire a la mitad de la fila (como el bloque de paciencia de la
  // izquierda, que sí fija flex:0 0 auto) y el texto quede flotando en el
  // medio de esa mitad en vez de pegado al borde derecho, contra
  // `justify-content:space-between`.
  it('el contador de aprietes no se estira: queda pegado a la derecha, alineado con la paciencia', () => {
    cargarCSS();
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    const contador = [...cont.querySelectorAll('.etiqueta')]
      .find((n) => n.textContent.includes('Aprietes'));
    expect(contador).toBeTruthy();
    expect(window.getComputedStyle(contador).flexGrow).toBe('0');
  });

  it('el boton de rechazar siempre esta presente y dispara el callback', () => {
    let rechazado = false;
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: () => { rechazado = true; },
    });
    const boton = cont.querySelector('[data-accion="rechazar"]');
    expect(boton).toBeTruthy();
    expect(boton.disabled).toBeFalsy();
    boton.click();
    expect(rechazado).toBe(true);
  });

  it('elegir una movida dispara el callback con su id', () => {
    let elegida = null;
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: (id) => { elegida = id; }, onCerrar: noop, onRechazar: noop,
    });
    cont.querySelector('[data-movida="masPlata"]').click();
    expect(elegida).toBe('masPlata');
  });

  it('muestra el ultimo evento (que acaba de pasar) despues de una movida', () => {
    const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(2));
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    expect(cont.querySelector('.negociacion-evento')).toBeTruthy();
    expect(cont.textContent).toContain(negociacion.ultimoEvento.texto);
  });

  it('no muestra el campo de evento antes de la primera movida', () => {
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    expect(cont.querySelector('.negociacion-evento')).toBeNull();
  });

  it('cuando la negociacion queda bloqueada, las 3 movidas de presion quedan apagadas pero cerrar sigue activo', () => {
    let negociacion = crearNegociacion(oferta);
    for (let s = 1; s <= 60 && !negociacion.bloqueada; s++) {
      negociacion = jugarMovida(negociacion, 'apretar', createRng(s)).negociacion;
    }
    expect(negociacion.bloqueada).toBe(true);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    for (const id of ['masPlata', 'taquilla', 'apretar']) {
      expect(cont.querySelector(`[data-movida="${id}"]`).disabled).toBe(true);
    }
    expect(cont.querySelector('[data-movida="cerrar"]').disabled).toBe(false);
  });

  it('cuando la negociacion queda bloqueada, el boton de rechazar sigue disponible (rechazar no desaparecio)', () => {
    let negociacion = crearNegociacion(oferta);
    for (let s = 1; s <= 60 && !negociacion.bloqueada; s++) {
      negociacion = jugarMovida(negociacion, 'apretar', createRng(s)).negociacion;
    }
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    const boton = cont.querySelector('[data-accion="rechazar"]');
    expect(boton).toBeTruthy();
    expect(boton.disabled).toBeFalsy();
  });

  it('despues de agotar los 3 intentos (sin fallar ninguno), las movidas de presion tambien quedan apagadas', () => {
    let logrado = false;
    for (let base = 1; base <= 300 && !logrado; base++) {
      let negociacion = crearNegociacion(oferta, { tieneManager: true });
      let sinFallos = true;
      for (let i = 0; i < LIMITE_APRIETES; i++) {
        const paso = jugarMovida(negociacion, 'masPlata', createRng(base + i * 700));
        if (paso.evento?.tipo !== 'acepta') { sinFallos = false; break; }
        negociacion = paso.negociacion;
      }
      if (sinFallos) {
        logrado = true;
        renderNegociacion(cont, {
          negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
        });
        expect(cont.querySelector('[data-movida="masPlata"]').disabled).toBe(true);
        expect(cont.querySelector('[data-movida="cerrar"]').disabled).toBe(false);
      }
    }
    expect(logrado).toBe(true);
  });

  it('al cerrar, muestra el resultado y el boton de continuar, sin movidas ni boton de rechazar', () => {
    const { negociacion } = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(1));
    let siguio = false;
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: () => { siguio = true; }, onRechazar: noop,
    });
    expect(cont.textContent).toContain('Cerrado');
    expect(cont.querySelectorAll('[data-movida]')).toHaveLength(0);
    expect(cont.querySelector('[data-accion="rechazar"]')).toBeNull();
    cont.querySelector('[data-accion="seguir"]').click();
    expect(siguio).toBe(true);
  });
});
