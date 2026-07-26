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
  it('muestra la bolsa, la franja de paciencia (barra fina, ya no la pista gruesa) y las 4 movidas', () => {
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    expect(cont.textContent).toContain('US$ 8K');
    // v6 (rediseño integral, pedido textual: "la barra de paciencia es muy
    // grande, y ancha"): la pista gruesa con borde propio desaparece, la
    // paciencia ahora usa la barra fina de siempre (`.barra`, 8px).
    expect(cont.querySelector('.barra-paciencia-pista')).toBeNull();
    expect(cont.querySelector('.paciencia-fila')).toBeTruthy();
    expect(cont.querySelector('.barra')).toBeTruthy();
    expect(cont.querySelectorAll('[data-movida]')).toHaveLength(4);
  });

  // v6 (rediseño integral, pedido textual: "las opciones más anchas que
  // altas, en formato lista, todas del mismo tamaño, con su ícono a la
  // izquierda"): reemplaza a la vieja tarjeta cuadrada (`.tarjeta`, pensada
  // para grillas de decisión) por una fila propia de ancho completo.
  it('las movidas son filas de lista (.movida-fila), ya no la tarjeta cuadrada del sistema de decisiones', () => {
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    for (const nodo of cont.querySelectorAll('[data-movida]')) {
      expect(nodo.classList.contains('movida-fila')).toBe(true);
      expect(nodo.classList.contains('tarjeta')).toBe(false);
      expect(nodo.querySelector('.movida-icono')).toBeTruthy();
      expect(nodo.querySelector('.movida-titulo')).toBeTruthy();
    }
  });

  // Pedido textual: "todas del mismo tamaño" — las 4 filas comparten el
  // mismo `min-height` (reservado de antemano, no depende de si esa fila en
  // particular trae un label de riesgo más largo o más corto) y son de
  // ancho completo (formato lista, no la tarjeta angosta de antes).
  it('las 4 filas de movida reservan el mismo alto minimo, a todo el ancho (formato lista)', () => {
    cargarCSS();
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    const filas = [...cont.querySelectorAll('[data-movida]')];
    expect(filas.length).toBe(4);
    const minAltos = filas.map((f) => window.getComputedStyle(f).minHeight);
    expect(new Set(minAltos).size).toBe(1);
    expect(minAltos[0]).not.toBe('0px');
    for (const f of filas) {
      expect(window.getComputedStyle(f).width).toBe('100%');
    }
  });

  // Pedido textual: "los labels de riesgo tienen que entrar (cuando la
  // opción los tiene) y ningún texto puede quedar cortado". Se verifica que
  // el nodo del riesgo no recorta su propio texto (sin ellipsis/line-clamp)
  // y que las 3 movidas de presión lo muestran, mientras "cerrar" muestra su
  // propio chip ("Sin riesgo") en vez de quedar vacía.
  it('el label de riesgo entra completo (sin recortarse) en las 3 movidas de presion; "cerrar" muestra "Sin riesgo"', () => {
    cargarCSS();
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    for (const id of ['masPlata', 'taquilla', 'apretar']) {
      const riesgo = cont.querySelector(`[data-movida="${id}"] .movida-riesgo`);
      expect(riesgo).toBeTruthy();
      expect(riesgo.textContent).toMatch(/Riesgo que se levante: \d+%/);
      expect(window.getComputedStyle(riesgo).textOverflow).not.toBe('ellipsis');
    }
    const cerrar = cont.querySelector('[data-movida="cerrar"] .movida-riesgo');
    expect(cerrar).toBeTruthy();
    expect(cerrar.textContent).toContain('Sin riesgo');
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

  // v6 (rediseño integral): la paciencia ya no es una sola frase larga
  // ("Paciencia del promotor: 100/100") apretada en una fila angosta — el
  // ícono vive en su propia placa (antes un SVG suelto de 14px, "se ven muy
  // chicos" fue la queja puntual) y la etiqueta/valor se separan en dos
  // renglones propios, así que ninguno de los dos corre riesgo de partirse a
  // mitad de palabra por falta de ancho.
  it('la paciencia muestra el icono en su propia placa, con la etiqueta y el valor legibles', () => {
    cargarCSS();
    const negociacion = crearNegociacion(oferta);
    renderNegociacion(cont, {
      negociacion, oferta, onMovida: noop, onCerrar: noop, onRechazar: noop,
    });
    const icono = cont.querySelector('.paciencia-icono');
    expect(icono).toBeTruthy();
    expect(icono.querySelector('svg')).toBeTruthy();
    const valor = cont.querySelector('.paciencia-valor');
    expect(valor).toBeTruthy();
    expect(valor.textContent).toContain('100/100');
    expect(cont.textContent).toContain('Paciencia del promotor');
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
