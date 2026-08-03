import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring, registrarGolpe } from '../../src/core/sparring.js';
import { crearCareo } from '../../src/core/presser.js';
import { crearNegociacion } from '../../src/core/negotiation.js';
import { renderCareo } from '../../src/ui/screens/presser.js';
import { renderSparring, DURACION_RONDA_MS, DURACION_FEEDBACK_MS } from '../../src/ui/screens/sparring.js';
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

  // Rework v17: pegarle a un pao ya no avisa `onGolpe` en el mismo instante
  // del click — primero se pinta el golpe/error SINCRÓNICAMENTE (ver el
  // describe de animaciones más abajo) y recién tras una pausa breve
  // (DURACION_FEEDBACK_MS, bien por debajo de 200ms) se avisa hacia afuera.
  // Mismo patrón ya establecido en este proyecto para el golpe de gracia
  // (ver crearBarraPrecision, ui/components/barra-precision.js).
  it('pegarle al pao activo reporta acierto (tras la pausa de feedback)', () => {
    let evento = null;
    vi.useFakeTimers();
    try {
      renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
      cont.querySelector('[data-accion="empezar"]').click();
      cont.querySelector('.pao.activo').click();
      expect(evento).toBeNull();
      vi.advanceTimersByTime(DURACION_FEEDBACK_MS);
      expect(evento.acerto).toBe(true);
      expect(typeof evento.ms).toBe('number');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pegarle a un pao apagado reporta error (tras la pausa de feedback)', () => {
    let evento = null;
    vi.useFakeTimers();
    try {
      renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
      cont.querySelector('[data-accion="empezar"]').click();
      const apagado = [...cont.querySelectorAll('.pao')].find((p) => !p.classList.contains('activo'));
      apagado.click();
      vi.advanceTimersByTime(DURACION_FEEDBACK_MS);
      expect(evento.acerto).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('muestra la grilla de seis paos', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelectorAll('.pao')).toHaveLength(6);
  });

  // Rework v17: puño cerrado al centro de cada luz (pedido textual), tanto
  // apagada como encendida.
  it('cada pao trae el icono de puño adentro', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const paos = cont.querySelectorAll('.pao');
    expect(paos).toHaveLength(6);
    paos.forEach((p) => expect(p.querySelector('svg')).toBeTruthy());
  });

  it('al terminar ofrece continuar', () => {
    const listo = { ...sparring(), terminado: true, aciertos: 8, indice: 10 };
    renderSparring(cont, { sparring: listo, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });
});

// Rework visual v17 (pedido textual, con mockup en mano): "faltan animaciones
// cuando se clickea bien la luz, faltan animaciones cuando se clickea MAL la
// luz [...] dos sensaciones distintas y tienen que leerse al instante".
describe('renderSparring — animaciones de acierto/error', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('pegarle al pao activo le suma la clase pao-acierto de inmediato (antes de la pausa)', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    const activo = cont.querySelector('.pao.activo');
    activo.click();
    expect(activo.classList.contains('pao-acierto')).toBe(true);
    expect(activo.classList.contains('pao-error')).toBe(false);
  });

  it('pegarle a un pao apagado le suma la clase pao-error de inmediato', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    const apagado = [...cont.querySelectorAll('.pao')].find((p) => !p.classList.contains('activo'));
    apagado.click();
    expect(apagado.classList.contains('pao-error')).toBe(true);
    expect(apagado.classList.contains('pao-acierto')).toBe(false);
  });

  it('clickear de nuevo durante la pausa de feedback no cuenta un segundo golpe', () => {
    let llamadas = 0;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => { llamadas += 1; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    const activo = cont.querySelector('.pao.activo');
    activo.click();
    // Durante la pausa, ya no queda ningun pao marcado "activo" para
    // clickear encima (mismo criterio que `resuelto` en barra-precision):
    // clickear cualquier pao ahora no debe hacer nada.
    [...cont.querySelectorAll('.pao')].forEach((p) => p.click());
    vi.advanceTimersByTime(DURACION_FEEDBACK_MS);
    expect(llamadas).toBe(1);
  });

  it('detener() durante la pausa de feedback cancela sin disparar onGolpe', () => {
    let llamadas = 0;
    const handle = renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => { llamadas += 1; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('.pao.activo').click();
    handle.detener();
    vi.advanceTimersByTime(DURACION_FEEDBACK_MS);
    expect(llamadas).toBe(0);
  });

  it('con prefers-reduced-motion, el golpe se resuelve de inmediato (sin pausa)', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    try {
      let evento = null;
      renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
      cont.querySelector('[data-accion="empezar"]').click();
      cont.querySelector('.pao.activo').click();
      expect(evento).not.toBeNull();
      expect(evento.acerto).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
});

// Rework visual v17: los tres contadores en fila (mockup: "x7 COMBO",
// "0,24s REACCIÓN", "7/10 GOLPES").
describe('renderSparring — contadores (combo/reaccion/golpes)', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  it('arranca en x0 combo y 0/10 golpes', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.textContent).toMatch(/x0/);
    expect(cont.textContent).toContain('0/10');
  });

  it('tras un par de golpes muestra la racha y el conteo actualizados', () => {
    let sp = registrarGolpe(sparring(), { acerto: true, ms: 300 });
    sp = registrarGolpe(sp, { acerto: true, ms: 300 });
    renderSparring(cont, { sparring: sp, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.textContent).toMatch(/x2/);
    expect(cont.textContent).toContain('2/10');
  });
});

// Rework visual v17 (pedido central del pedido): "que se vaya 'llenando' una
// barra a medida que se clickean correctamente las luces y que esa barra
// tenga una marca de qué ventaja tiene".
describe('renderSparring — barra de reflejos con marca de tramo', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  it('arranca vacia y en el tramo flojo', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const relleno = cont.querySelector('.sparring-reflejos-pista .barra > i');
    expect(relleno.style.width).toBe('0%');
    expect(cont.querySelector('[data-tramo="flojo"]').classList.contains('alcanzado')).toBe(true);
  });

  it('se va llenando a medida que se acumulan aciertos', () => {
    let sp = sparring();
    for (let i = 0; i < 5; i++) sp = registrarGolpe(sp, { acerto: true, ms: 200 });
    renderSparring(cont, { sparring: sp, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const relleno = cont.querySelector('.sparring-reflejos-pista .barra > i');
    expect(relleno.style.width).toBe('50%');
  });

  it('con una sesion perfecta hasta ahora, el tramo alcanzado es "perfecto" y la barra llega al 100%', () => {
    let sp = sparring();
    for (let i = 0; i < 10; i++) sp = registrarGolpe(sp, { acerto: true, ms: 220 });
    renderSparring(cont, { sparring: sp, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    const relleno = cont.querySelector('.sparring-reflejos-pista .barra > i');
    expect(relleno.style.width).toBe('100%');
    expect(cont.querySelector('[data-tramo="perfecto"]').classList.contains('alcanzado')).toBe(true);
    expect(cont.querySelector('[data-tramo="flojo"]').classList.contains('alcanzado')).toBe(false);
  });

  it('los tres tramos de recompensa estan siempre presentes, incluso antes de empezar', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-tramo="perfecto"]')).toBeTruthy();
    expect(cont.querySelector('[data-tramo="bien"]')).toBeTruthy();
    expect(cont.querySelector('[data-tramo="flojo"]')).toBeTruthy();
  });
});

// Rework visual v17: el mockup traía una tarjeta del entrenador, pero el
// sparring vive DENTRO del tablero y "Tu rincón" (columna izquierda) ya la
// muestra fija, con los mismos datos. Repetirla acá costaba ~85px y empujaba
// la barra de reflejos, los tramos y el botón fuera del hueco disponible.
describe('renderSparring — no repite lo que el tablero ya muestra', () => {
  it('no vuelve a dibujar la tarjeta del entrenador (ya está en la columna izquierda)', () => {
    const j = jugador();
    renderSparring(cont, { sparring: crearSparring(createRng(1), { jugador: j }), jugador: j, onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('.rincon-iniciales')).toBeNull();
    expect(cont.textContent).not.toContain(j.entrenador.frase);
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

  it('un golpe NO reinicia el reloj: la duración restante de la barra baja, no vuelve al total', () => {
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
    // Si el reloj se hubiera reiniciado con el golpe, esto volvería a leer el
    // presupuesto entero. Como es uno solo para toda la ronda, tiene que
    // reflejar lo que de verdad queda. Expresado CONTRA la constante y no
    // contra un número escrito a mano: el presupuesto se recalibró en v17
    // (los 150ms de feedback por golpe salen del mismo reloj) y estas dos
    // aserciones se rompían por el cambio de número sin que el invariante que
    // prueban —"el reloj no se reinicia"— hubiera dejado de valer.
    expect(msRestante).toBeLessThan(DURACION_RONDA_MS - 1000);
    expect(msRestante).toBeGreaterThan(DURACION_RONDA_MS - 3000);
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

    // Ya se gastaron 3000ms del presupuesto antes del golpe; si el reloj se
    // hubiera reiniciado harían falta otros DURACION_RONDA_MS enteros. Como es
    // uno solo, con lo que resta del original alcanza.
    vi.advanceTimersByTime(DURACION_RONDA_MS - 3000 + 1);
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

    // Rework v17: cada golpe ahora resuelve tras una pausa breve de
    // feedback (ver DURACION_FEEDBACK_MS) — hay que dejarla correr entre
    // click y click para que el próximo pao quede "activo" y clickeable.
    for (let i = 0; i < sp.objetivos; i++) {
      cont.querySelector('.pao.activo').click();
      vi.advanceTimersByTime(DURACION_FEEDBACK_MS);
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
