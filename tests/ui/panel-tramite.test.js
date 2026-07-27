import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { renderCardTramite, opcionesMinijuego, renderMinijuegoRonda } from '../../src/ui/screens/panel-tramite.js';
import { DURACION_BARAJADO_MS } from '../../src/ui/components/roll.js';
import { crearPeleador } from '../../src/core/fighter.js';

function ofertaDeMuestra() {
  return {
    rivalId: 'riv_1',
    rivalNombre: 'Tyrell Carter',
    rivalApodo: 'El Tanque',
    rivalMedia: 61,
    rivalRecord: '10-2',
    rivalRanking: 14,
    bolsa: 4200,
    fraseEntrenador: 'Va a ser una pelea pareja, prestá atención.',
  };
}

function rivalDeMuestra() {
  return crearPeleador({
    nombre: 'Tyrell Carter', apodo: 'El Tanque', nacionalidad: 'MX', disciplina: 'boxeo',
    estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 61,
  });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div><div id="afuera">intacto</div>';
  cont = document.getElementById('region');
});

describe('renderCardTramite', () => {
  it('muestra nombre con apodo, récord, ranking y media del rival', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.textContent).toContain('"El Tanque" Tyrell Carter');
    expect(cont.textContent).toContain('10-2');
    expect(cont.textContent).toContain('#14');
    expect(cont.textContent).toContain('61');
  });

  it('muestra la bandera del rival como SVG (nunca un emoji)', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(cont.textContent).not.toMatch(/🇲🇽|🏳/);
  });

  it('muestra un resumen de las estadisticas del rival', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.querySelectorAll('.panel-peleador-atributo').length).toBe(6);
  });

  it('sin rival (dato no disponible), no rompe y sigue mostrando lo que trae la oferta', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: null });
    expect(cont.textContent).toContain('Tyrell Carter');
    expect(cont.querySelectorAll('.panel-peleador-atributo').length).toBe(0);
  });

  it('sin apodo, muestra solo el nombre (nunca "null")', () => {
    const oferta = { ...ofertaDeMuestra(), rivalApodo: null };
    renderCardTramite(cont, { oferta, rival: null });
    expect(cont.textContent).not.toContain('null');
    expect(cont.textContent).toContain('Tyrell Carter');
  });

  // Pedido 1 (v7, "que se anuncie antes"): la voz del entrenador, la bolsa y
  // cuánto falta viven en la MISMA tarjeta que el rival (no una pantalla
  // aparte — ver el comentario grande del archivo sobre el presupuesto de
  // minutos).
  it('incluye la voz del entrenador, la bolsa y cuanto falta (Pedido 1, fusionado en la misma tarjeta)', () => {
    renderCardTramite(cont, {
      oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), semanas: 6, apertura: 'Ya hay rival para la próxima.',
    });
    expect(cont.textContent).toContain('Ya hay rival para la próxima.');
    expect(cont.textContent).toContain('Va a ser una pelea pareja, prestá atención.');
    expect(cont.textContent).toContain('US$ 4K');
    expect(cont.textContent).toContain('Faltan 6 semanas');
  });

  it('con 0 semanas, dice que es esta semana (no "Faltan 0 semanas")', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), semanas: 0 });
    expect(cont.textContent).toContain('Es esta semana');
  });

  it('sin apertura, no deja un parrafo vacio ni "undefined"', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.textContent).not.toContain('undefined');
  });

  it('el boton "Simular pelea" dispara onSimular', () => {
    let veces = 0;
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), onSimular: () => { veces += 1; } });
    cont.querySelector('[data-accion="simular-pelea"]').click();
    expect(veces).toBe(1);
  });

  it('se monta dentro de la region sin tocar el resto del documento', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(document.getElementById('afuera').textContent).toBe('intacto');
  });
});

describe('opcionesMinijuego', () => {
  it('devuelve las 3 acciones tacticas del ciclo, cada una con titulo, descripcion e icono', () => {
    const opciones = opcionesMinijuego();
    expect(opciones).toHaveLength(3);
    expect(opciones.map((o) => o.id).sort()).toEqual(['menton', 'noqueador', 'tecnico']);
    for (const o of opciones) {
      expect(o.titulo.length).toBeGreaterThan(0);
      expect(o.descripcion.length).toBeGreaterThan(0);
      expect(o.icono).toBeInstanceOf(SVGElement);
    }
  });

  it('cada llamada arma nodos de icono NUEVOS (no comparte referencias entre rondas)', () => {
    const primera = opcionesMinijuego();
    const segunda = opcionesMinijuego();
    for (let i = 0; i < primera.length; i += 1) {
      expect(primera[i].icono).not.toBe(segunda[i].icono);
    }
  });
});

// renderMinijuegoRonda (v8, "que se vea cómo se rollea"): envuelve
// renderPanelDecision con el barajado de suspenso (animarBarajado, roll.js)
// entre el click del jugador y el momento en que main.js se entera de qué
// eligió — main.js sigue resolviendo la ronda con el rng de sesión en su
// propio onElegir, sin cambios; lo único que se retrasa acá es CUÁNDO se lo
// llama, nunca CÓMO se resuelve. Reusa animarBarajado tal cual, así que la
// mayoría de su comportamiento (duración, prefers-reduced-motion, sin
// timers colgados) ya está cubierto en roll.test.js — estos tests verifican
// la integración puntual: que el click deshabilite ya mismo, que el
// callback llegue después del barajado (no antes, no dos veces), y que
// "irse a mitad de camino" (detener) resuelva sin perder la ronda.
describe('renderMinijuegoRonda', () => {
  let matchMediaOriginal;

  beforeEach(() => {
    matchMediaOriginal = window.matchMedia;
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.matchMedia = matchMediaOriginal;
  });

  function montar(onElegir = () => {}) {
    return renderMinijuegoRonda(cont, {
      titulo: 'Ronda 1 de hasta 5',
      bajada: 'Vos 0 - 0 Rival',
      texto: 'Elegí cómo boxear esta ronda.',
      opciones: opcionesMinijuego(),
      onElegir,
    });
  }

  it('muestra titulo, bajada, texto y las 3 tarjetas, igual que renderPanelDecision', () => {
    montar();
    expect(cont.textContent).toContain('Ronda 1 de hasta 5');
    expect(cont.textContent).toContain('Vos 0 - 0 Rival');
    expect(cont.textContent).toContain('Elegí cómo boxear esta ronda.');
    expect(cont.querySelectorAll('.tarjeta')).toHaveLength(3);
  });

  it('el marcador (bajada) hace su pop de entrada al montar ("que se mueva")', () => {
    montar();
    const marcador = cont.querySelector('.panel-decision-cabecera h1');
    expect(marcador.classList.contains('marcador-pop')).toBe(true);
  });

  it('al elegir, deshabilita las 3 tarjetas de inmediato (no se puede clickear otra durante el barajado)', () => {
    montar();
    cont.querySelectorAll('.tarjeta')[0].click();
    const tarjetas = [...cont.querySelectorAll('.tarjeta')];
    expect(tarjetas.every((t) => t.disabled)).toBe(true);
  });

  it('marca la tarjeta elegida (mismo lenguaje que .tarjeta-elegida) durante todo el barajado', () => {
    montar();
    const tarjetas = [...cont.querySelectorAll('.tarjeta')];
    tarjetas[1].click();
    expect(tarjetas[1].classList.contains('tarjeta-elegida')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(tarjetas[1].classList.contains('tarjeta-elegida')).toBe(true);
  });

  it('el callback recién se dispara cuando termina el barajado, con el id elegido', () => {
    let elegido = null;
    montar((id) => { elegido = id; });
    const tarjetas = [...cont.querySelectorAll('.tarjeta')];
    const idElegido = tarjetas[1].dataset.opcion;
    tarjetas[1].click();

    expect(elegido).toBeNull(); // todavía no, está barajando

    vi.runAllTimers();

    expect(elegido).toBe(idElegido);
  });

  it('el barajado dura poco (pensado para repetirse varias rondas): no más que el margen de animarBarajado', () => {
    let fin = null;
    const inicio = Date.now();
    montar(() => { fin = Date.now(); });
    cont.querySelectorAll('.tarjeta')[0].click();

    vi.runAllTimers();

    expect(fin).not.toBeNull();
    expect(fin - inicio).toBeLessThanOrEqual(DURACION_BARAJADO_MS + 250);
  });

  it('un segundo click durante el barajado no dispara el callback dos veces', () => {
    let veces = 0;
    montar(() => { veces += 1; });
    const tarjetas = [...cont.querySelectorAll('.tarjeta')];
    tarjetas[0].click();
    tarjetas[1].click(); // ya deshabilitadas: no hace nada
    tarjetas[0].click();

    vi.runAllTimers();

    expect(veces).toBe(1);
  });

  it('con prefers-reduced-motion, resuelve directo: el callback llega en el mismo click', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    let elegido = null;
    montar((id) => { elegido = id; });
    const idElegido = cont.querySelectorAll('.tarjeta')[2].dataset.opcion;

    cont.querySelectorAll('.tarjeta')[2].click();

    expect(elegido).toBe(idElegido);
    expect(vi.getTimerCount()).toBe(0);
  });

  // Mismo criterio que cancelarRollPendiente (main.js) / raiz._limpiarAccion
  // (fight.js): si el jugador abandona el tablero a mitad del barajado, la
  // ronda YA se decidió (el click ya pasó) — no puede quedar un timer vivo
  // ni una ronda sin resolver esperando a que vuelva.
  it('detener() a mitad del barajado resuelve la ronda ya, sin timers colgados y sin duplicar el callback', () => {
    let veces = 0;
    let elegido = null;
    const controlador = montar((id) => { veces += 1; elegido = id; });
    const tarjetas = [...cont.querySelectorAll('.tarjeta')];
    const idElegido = tarjetas[0].dataset.opcion;
    tarjetas[0].click();

    vi.advanceTimersByTime(200);
    controlador.detener();

    expect(veces).toBe(1);
    expect(elegido).toBe(idElegido);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(5000);
    expect(veces).toBe(1);
  });

  it('detener() sin haber elegido nada todavía no rompe ni llama al callback', () => {
    let veces = 0;
    const controlador = montar(() => { veces += 1; });
    controlador.detener();
    expect(veces).toBe(0);
  });

  it('se monta dentro de la region sin tocar el resto del documento', () => {
    montar();
    expect(document.getElementById('afuera').textContent).toBe('intacto');
  });

  // El barajado ATERRIZA en la jugada del rival: el pedido fue "quiero que se
  // vea cómo se rollea", y lo que hace satisfactorio un rolleo es ver dónde
  // cae. Antes terminaba en neutro y el rival solo se sabía por el texto.
  describe('aterrizaje en la jugada del rival', () => {
    function montarConRonda(eleccionRival, onElegir = () => {}) {
      return renderMinijuegoRonda(cont, {
        titulo: 'Ronda 1 de hasta 5',
        opciones: opcionesMinijuego(),
        resolverRonda: () => ({ eleccionRival, resultado: 'rival' }),
        onElegir,
      });
    }

    it('marca la tarjeta que eligio el rival al terminar el barajado', () => {
      const tarjetasIniciales = [...cont.querySelectorAll('.tarjeta')];
      expect(tarjetasIniciales).toHaveLength(0);

      const control = montarConRonda('noqueador');
      const tarjetas = [...cont.querySelectorAll('.tarjeta')];
      tarjetas[0].click();
      control.detener();

      const marcada = cont.querySelector('.tarjeta-rival');
      expect(marcada).not.toBeNull();
      expect(marcada.dataset.opcion).toBe('noqueador');
    });

    it('le pasa a onElegir los datos de la ronda ya resuelta, sin volver a resolverla', () => {
      let vueltas = 0;
      let recibido = null;
      const control = renderMinijuegoRonda(cont, {
        titulo: 'Ronda 1 de hasta 5',
        opciones: opcionesMinijuego(),
        resolverRonda: () => { vueltas += 1; return { eleccionRival: 'tecnico', resultado: 'jugador' }; },
        onElegir: (id, datos) => { recibido = datos; },
      });
      cont.querySelector('.tarjeta').click();
      control.detener();

      expect(vueltas).toBe(1);
      expect(recibido).toEqual({ eleccionRival: 'tecnico', resultado: 'jugador' });
    });

    it('sin resolverRonda termina en neutro, sin marcar ninguna', () => {
      const control = montar();
      cont.querySelector('.tarjeta').click();
      control.detener();
      expect(cont.querySelector('.tarjeta-rival')).toBeNull();
    });
  });
});
