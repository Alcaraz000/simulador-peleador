import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring, registrarGolpe } from '../../src/core/sparring.js';
import { crearCareo } from '../../src/core/presser.js';
import { crearNegociacion } from '../../src/core/negotiation.js';
import { renderCareo } from '../../src/ui/screens/presser.js';
import { renderSparring, DURACION_RONDA_MS } from '../../src/ui/screens/sparring.js';
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

// Pedido v6 ("quiero que el timer sea por todo el juego, no solo por cada
// golpe [...] no quiero que se reinicie"): antes (Task v4) cada pao
// encendido tenía su propio DURACION_MS de 1500ms que se reiniciaba con cada
// golpe. Ahora hay UN SOLO reloj (DURACION_RONDA_MS, 7000ms) para toda la
// sesión: arranca con el primer "Empezar" y no se reinicia con los golpes
// siguientes; si se acaba, el minijuego corta con onTiempoAgotado (no con un
// onGolpe más).
describe('renderSparring — un solo reloj para toda la ronda (Pedido v6)', () => {
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
    // desde el ancho de arranque un instante antes — ver sparring.js): lo
    // que se puede verificar sin un browser real es que quedó armada una
    // transición de `width` con duración, no un salto instantáneo.
    expect(relleno.style.width).toBe('0%');
    expect(relleno.style.transition).toMatch(/width/);
  });

  it('antes de empezar, la barra arranca llena y sin animar', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const relleno = cont.querySelector('.barra-sparring > i');
    expect(relleno.style.width).toBe('100%');
  });

  it('un golpe NO reinicia el reloj: la duración restante de la barra baja, no vuelve a los 7000ms totales', () => {
    let sp = sparring();
    renderSparring(cont, { sparring: sp, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();

    vi.advanceTimersByTime(2000);

    // Simula lo que hace main.js tras un golpe: registrarlo y volver a
    // montar sobre el MISMO contenedor (nunca uno nuevo) — así sobrevive el
    // reloj de ronda entre golpes en el juego real.
    sp = registrarGolpe(sp, { acerto: true, ms: 300 });
    renderSparring(cont, { sparring: sp, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });

    const relleno = cont.querySelector('.barra-sparring > i');
    const match = relleno.style.transition.match(/width (\d+)ms/);
    expect(match).toBeTruthy();
    const msRestante = Number(match[1]);
    // Si el reloj se hubiera reiniciado con el golpe, esto volvería a leer
    // ~7000ms. Como es uno solo para toda la ronda, tiene que reflejar lo
    // que de verdad queda de los 7000ms originales (~5000, con margen).
    expect(msRestante).toBeLessThan(6000);
    expect(msRestante).toBeGreaterThan(3000);
  });

  it('pegarle a un pao no corta el reloj de la ronda: si se agota el tiempo total, igual termina', () => {
    let sp = sparring();
    let tiempoAgotado = false;
    function montar() {
      renderSparring(cont, {
        sparring: sp,
        jugador: jugador(),
        onGolpe: (e) => { sp = registrarGolpe(sp, e); montar(); },
        onTiempoAgotado: () => { tiempoAgotado = true; },
        onTerminar: () => {},
      });
    }
    montar();
    cont.querySelector('[data-accion="empezar"]').click();

    vi.advanceTimersByTime(3000);
    cont.querySelector('.pao.activo').click(); // acierta un golpe: vuelve a montar, el reloj sigue

    // Del presupuesto total (7000ms) ya se gastaron 3000ms antes del golpe;
    // si el reloj se hubiera reiniciado harían falta otros 7000ms enteros.
    // Como es uno solo, con lo que resta del original alcanza.
    vi.advanceTimersByTime(4001);
    expect(tiempoAgotado).toBe(true);
  });

  it('si se acaba el tiempo de la ronda sin completar los golpes, se dispara onTiempoAgotado (no onGolpe)', () => {
    let golpeLlamado = false;
    let tiempoAgotado = false;
    renderSparring(cont, {
      sparring: sparring(),
      jugador: jugador(),
      onGolpe: () => { golpeLlamado = true; },
      onTiempoAgotado: () => { tiempoAgotado = true; },
      onTerminar: () => {},
    });
    cont.querySelector('[data-accion="empezar"]').click();

    expect(tiempoAgotado).toBe(false);
    vi.advanceTimersByTime(DURACION_RONDA_MS - 1);
    expect(tiempoAgotado).toBe(false);

    vi.advanceTimersByTime(1);
    expect(tiempoAgotado).toBe(true);
    expect(golpeLlamado).toBe(false);
  });

  it('al completar todos los golpes antes de que se acabe el tiempo, no queda el reloj de ronda colgado', () => {
    let sp = sparring();
    function montar() {
      renderSparring(cont, {
        sparring: sp,
        jugador: jugador(),
        onGolpe: (e) => { sp = registrarGolpe(sp, e); montar(); },
        onTiempoAgotado: () => {},
        onTerminar: () => {},
      });
    }
    montar();
    cont.querySelector('[data-accion="empezar"]').click();

    for (let i = 0; i < sp.objetivos; i++) {
      cont.querySelector('.pao.activo').click();
    }

    expect(sp.terminado).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  // "No dejes timers colgados si el jugador se va de la pantalla a mitad":
  // quien monta renderSparring (main.js) necesita poder cancelar el reloj de
  // ronda pendiente sin que eso dispare onGolpe ni onTiempoAgotado (mismo
  // contrato que crearBarraPrecision/animarRoll: `detener()` corta en seco).
  it('devuelve un handle con detener() que cancela el reloj de ronda sin disparar onGolpe ni onTiempoAgotado', () => {
    let golpeLlamado = false;
    let tiempoAgotado = false;
    const handle = renderSparring(cont, {
      sparring: sparring(),
      jugador: jugador(),
      onGolpe: () => { golpeLlamado = true; },
      onTiempoAgotado: () => { tiempoAgotado = true; },
      onTerminar: () => {},
    });
    cont.querySelector('[data-accion="empezar"]').click();

    handle.detener();
    vi.runAllTimers();

    expect(golpeLlamado).toBe(false);
    expect(tiempoAgotado).toBe(false);
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
