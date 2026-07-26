import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring } from '../../src/core/sparring.js';
import { crearCareo } from '../../src/core/presser.js';
import { crearNegociacion } from '../../src/core/negotiation.js';
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

// Bug reportado por el usuario: "minijuego de sparring: falta el timer con
// la barra decreciendo". Antes un pao encendido se quedaba prendido para
// siempre (sin límite de tiempo real, cualquiera terminaba acertando casi
// todo tarde o temprano — ver también el bug de resultadoSparring, que
// dependía de un límite de reacción que nunca se hacía cumplir). Con el
// timer, tardarse cuenta como error automático: mismo `onGolpe` que un click
// errado.
describe('renderSparring — timer con barra decreciendo (bug reportado)', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('al empezar, aparece la barra de tiempo animando el vaciado (ancho objetivo 0%, con transición)', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();

    const relleno = cont.querySelector('.barra-sparring > i');
    expect(relleno).toBeTruthy();
    // El ancho ya quedó apuntando a 0% (el navegador anima la transición
    // desde el 100% forzado un instante antes — ver sparring.js): lo que se
    // puede verificar sin un browser real es que quedó armada una
    // transición de `width` con duración, no un salto instantáneo.
    expect(relleno.style.width).toBe('0%');
    expect(relleno.style.transition).toMatch(/width/);
  });

  it('antes de empezar, la barra arranca llena y sin animar', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const relleno = cont.querySelector('.barra-sparring > i');
    expect(relleno.style.width).toBe('100%');
  });

  it('si se deja pasar el tiempo sin pegarle, cuenta como error automático (mismo evento que un click errado)', () => {
    let evento = null;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();

    expect(evento).toBeNull();
    vi.runAllTimers();

    expect(evento).not.toBeNull();
    expect(evento.acerto).toBe(false);
    expect(typeof evento.ms).toBe('number');
  });

  it('pegarle a tiempo cancela el timer pendiente: no llega un segundo evento por timeout', () => {
    let llamadas = 0;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => { llamadas += 1; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('.pao.activo').click();

    expect(llamadas).toBe(1);
    vi.runAllTimers();
    expect(llamadas).toBe(1);
  });

  // "No dejes timers colgados si el jugador se va de la pantalla a mitad":
  // quien monta renderSparring (main.js) necesita poder cancelar el timer
  // pendiente sin que eso dispare onGolpe (mismo contrato que
  // crearBarraPrecision/animarRoll: `detener()` corta en seco, sin avisar).
  it('devuelve un handle con detener() que cancela el timer sin disparar onGolpe', () => {
    let llamadas = 0;
    const handle = renderSparring(cont, {
      sparring: sparring(), jugador: jugador(), onGolpe: () => { llamadas += 1; }, onTerminar: () => {},
    });
    cont.querySelector('[data-accion="empezar"]').click();

    handle.detener();
    vi.runAllTimers();

    expect(llamadas).toBe(0);
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
