import { describe, it, expect, beforeEach } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring } from '../../src/core/sparring.js';
import { crearCareo } from '../../src/core/presser.js';
import { crearNegociacion } from '../../src/core/negotiation.js';
import { renderTienda } from '../../src/ui/screens/shop.js';
import { renderCareo } from '../../src/ui/screens/presser.js';
import { renderSparring } from '../../src/ui/screens/sparring.js';
import { renderNegociacion } from '../../src/ui/screens/negotiation.js';

const jugador = (extra = {}) => ({
  ...crearPeleador({
    nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  }),
  ...extra,
});

const oferta = {
  id: 'of_1', rivalId: 'riv_1', rivalApodo: 'El Ciclón', rivalNombre: 'Dyke Tyzon',
  rivalPersonalidad: 'agresivo', esTitulo: true, bolsa: 8000, enJuego: 'Título regional',
};

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderTienda', () => {
  it('lista staff y lujos', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 200000 }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.querySelectorAll('[data-item]').length).toBeGreaterThanOrEqual(10);
    expect(cont.textContent).toContain('Entrenador de elite');
  });

  it('muestra la plata disponible', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 1200000 }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toContain('US$ 1,2M');
  });

  it('deshabilita lo que no se puede pagar', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 0 }), onComprar: () => {}, onCerrar: () => {} });
    const caros = [...cont.querySelectorAll('[data-item]')].filter((b) => b.disabled);
    expect(caros.length).toBeGreaterThan(0);
  });

  it('marca lo ya comprado', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 999999, staff: ['entrenador'] }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-item="entrenador"]').textContent).toMatch(/equipo/i);
  });

  it('comprar devuelve el id', () => {
    let comprado = null;
    renderTienda(cont, { jugador: jugador({ dinero: 999999 }), onComprar: (id) => { comprado = id; }, onCerrar: () => {} });
    cont.querySelector('[data-item="kinesiologo"]').click();
    expect(comprado).toBe('kinesiologo');
  });

  it('cerrar dispara el callback', () => {
    let cerrado = false;
    renderTienda(cont, { jugador: jugador(), onComprar: () => {}, onCerrar: () => { cerrado = true; } });
    cont.querySelector('[data-accion="cerrar"]').click();
    expect(cerrado).toBe(true);
  });
});

describe('renderCareo', () => {
  const careo = () => crearCareo(createRng(1), { oferta });

  it('muestra hype, tell y cuatro respuestas', () => {
    renderCareo(cont, { careo: careo(), onResponder: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-hype]')).toBeTruthy();
    expect(cont.textContent).toContain('El Ciclón');
    expect(cont.querySelectorAll('[data-tono]')).toHaveLength(4);
  });

  it('muestra la ronda actual', () => {
    renderCareo(cont, { careo: careo(), onResponder: () => {}, onTerminar: () => {} });
    expect(cont.textContent).toMatch(/1\s*(de|\/)\s*3/i);
  });

  it('elegir un tono lo reporta', () => {
    let tono = null;
    renderCareo(cont, { careo: careo(), onResponder: (t) => { tono = t; }, onTerminar: () => {} });
    cont.querySelector('[data-tono="frio"]').click();
    expect(tono).toBe('frio');
  });

  it('al terminar muestra el boton de cierre', () => {
    const terminado = { ...careo(), terminado: true };
    renderCareo(cont, { careo: terminado, onResponder: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });
});

describe('renderSparring', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  it('arranca con boton Empezar y sin paos activos', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="empezar"]')).toBeTruthy();
    expect(cont.querySelector('.pao.activo')).toBeNull();
  });

  it('al empezar se prende un pao', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    expect(cont.querySelector('.pao.activo')).toBeTruthy();
  });

  it('pegarle al pao activo reporta acierto', () => {
    let evento = null;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('.pao.activo').click();
    expect(evento.acerto).toBe(true);
    expect(typeof evento.ms).toBe('number');
  });

  it('pegarle a un pao apagado reporta error', () => {
    let evento = null;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    const apagado = [...cont.querySelectorAll('.pao')].find((p) => !p.classList.contains('activo'));
    apagado.click();
    expect(evento.acerto).toBe(false);
  });

  it('muestra la grilla de seis paos', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelectorAll('.pao')).toHaveLength(6);
  });

  it('al terminar ofrece continuar', () => {
    const listo = { ...sparring(), terminado: true, aciertos: 8, indice: 10 };
    renderSparring(cont, { sparring: listo, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });
});

describe('renderNegociacion', () => {
  const negociacion = () => crearNegociacion(oferta);

  it('muestra la bolsa y las cuatro movidas', () => {
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toContain('US$ 8K');
    expect(cont.querySelectorAll('[data-movida]')).toHaveLength(4);
  });

  it('muestra el riesgo de cada movida arriesgada', () => {
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-movida="apretar"]').textContent).toMatch(/\d+%/);
  });

  it('elegir una movida la reporta', () => {
    let movida = null;
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: (m) => { movida = m; }, onCerrar: () => {} });
    cont.querySelector('[data-movida="masPlata"]').click();
    expect(movida).toBe('masPlata');
  });

  it('al cerrarse muestra el resultado y el boton de seguir', () => {
    const cerrada = { ...negociacion(), cerrada: true };
    renderNegociacion(cont, { negociacion: cerrada, oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('al perderla lo avisa', () => {
    const perdida = { ...negociacion(), perdida: true };
    renderNegociacion(cont, { negociacion: perdida, oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toMatch(/levant|perdi/i);
  });
});
