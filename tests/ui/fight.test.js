import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea } from '../../src/core/fight.js';
import { abrirGolpeDeGracia, ZONAS_GOLPE } from '../../src/core/fight-interactive.js';
import {
  renderOferta, renderPlan, renderPelea, renderRincon, renderGolpeDeGracia, detenerAuto,
} from '../../src/ui/screens/fight.js';

const jugador = crearPeleador({
  nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
});
const rival = crearPeleador({
  nombre: 'Dyke Tyzon', apodo: 'El Ciclón', nacionalidad: 'US', disciplina: 'boxeo',
  estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 70,
});
const oferta = {
  id: 'of_1', rivalId: rival.id, rivalNombre: rival.nombre, rivalApodo: rival.apodo,
  rivalMedia: 70, rivalRecord: '15-2', rivalEstilo: 'noqueador', rivalPersonalidad: 'agresivo',
  nivel: 'titulo', nivelPelea: 'titulo', bolsa: 25000, riesgo: 'alto',
  enJuego: 'Título regional', esTitulo: true, esObligatoria: false, esRevancha: false,
  famaBase: 15, textoGancho: 'Dyke Tyzon te quiere cruzar.',
};
const pelea = () => crearPelea({ jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(1) });

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});
afterEach(() => {
  detenerAuto();
  vi.useRealTimers();
});

describe('renderOferta', () => {
  it('muestra rival, bolsa, riesgo y que esta en juego', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: () => {}, onRechazar: () => {} });
    expect(cont.textContent).toContain('Dyke Tyzon');
    expect(cont.textContent).toContain('15-2');
    expect(cont.textContent).toContain('US$ 25K');
    expect(cont.textContent.toLowerCase()).toContain('alto');
    expect(cont.textContent).toContain('Título regional');
  });

  it('en una defensa obligatoria muestra el progreso de defensas exigidas', () => {
    const defensa = {
      ...oferta, esObligatoria: true, defensasObligatorias: 3, enJuego: 'Cinturón regional',
    };
    renderOferta(cont, { oferta: defensa, jugador: { ...jugador, defensas: 1 }, onAceptar: () => {}, onRechazar: () => {} });
    expect(cont.textContent).toContain('2 de 3');
  });

  it('aceptar y rechazar disparan sus callbacks', () => {
    let aceptado = false; let rechazado = false;
    renderOferta(cont, { oferta, jugador, onAceptar: () => { aceptado = true; }, onRechazar: () => { rechazado = true; } });
    cont.querySelector('[data-accion="aceptar"]').click();
    cont.querySelector('[data-accion="rechazar"]').click();
    expect(aceptado).toBe(true);
    expect(rechazado).toBe(true);
  });
});

describe('renderPlan', () => {
  it('ofrece los tres planes', () => {
    renderPlan(cont, { oferta, onElegirPlan: () => {} });
    expect(cont.querySelectorAll('[data-plan]')).toHaveLength(3);
  });

  it('devuelve el plan elegido', () => {
    let plan = null;
    renderPlan(cont, { oferta, onElegirPlan: (p) => { plan = p; } });
    cont.querySelector('[data-plan="frente"]').click();
    expect(plan).toBe('frente');
  });
});

describe('renderPelea', () => {
  it('muestra el round y los apodos', () => {
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('El Relámpago');
    expect(cont.textContent).toContain('El Ciclón');
    expect(cont.textContent).toMatch(/round\s*1/i);
  });

  it('muestra el log de eventos', () => {
    const eventos = [{ round: 1, tipo: 'dominio', texto: 'Lo tiene contra las cuerdas.' }];
    renderPelea(cont, { pelea: pelea(), eventos, onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('Lo tiene contra las cuerdas.');
  });

  it('el boton avanza el round', () => {
    let avances = 0;
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => { avances += 1; }, onFin: () => {} });
    cont.querySelector('[data-accion="round"]').click();
    expect(avances).toBe(1);
  });

  it('al terminar muestra el resultado y el boton de cierre', () => {
    const terminada = {
      ...pelea(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 4, texto: 'El Relámpago gana por KO en el round 4.' },
    };
    renderPelea(cont, { pelea: terminada, eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('gana por KO');
    expect(cont.querySelector('[data-accion="fin"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="round"]')).toBeNull();
  });

  it('si termino por nocaut, el panel del log tiene la clase de sacudon', () => {
    const terminada = {
      ...pelea(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 4, texto: 'El Relámpago gana por KO en el round 4.' },
    };
    renderPelea(cont, { pelea: terminada, eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.querySelector('.pelea-ko')).toBeTruthy();
  });

  it('si termino por decision, el panel del log NO tiene la clase de sacudon', () => {
    const terminada = {
      ...pelea(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'decision', round: 8, texto: 'El Relámpago gana por decisión.' },
    };
    renderPelea(cont, { pelea: terminada, eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.querySelector('.pelea-ko')).toBeNull();
  });

  it('ofrece un boton de avance automatico mientras la pelea sigue', () => {
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.querySelector('[data-accion="auto"]')).toBeTruthy();
  });

  it('la pelea terminada no ofrece el boton de avance automatico', () => {
    const terminada = {
      ...pelea(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'decision', round: 8, texto: 'El Relámpago gana por decisión.' },
    };
    renderPelea(cont, { pelea: terminada, eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.querySelector('[data-accion="auto"]')).toBeNull();
  });

  it('el modo automatico dispara onSiguienteRound solo despues de 1400ms', () => {
    vi.useFakeTimers();
    let avances = 0;
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => { avances += 1; }, onFin: () => {} });
    cont.querySelector('[data-accion="auto"]').click();
    expect(avances).toBe(0);
    vi.advanceTimersByTime(1400);
    expect(avances).toBe(1);
  });

  it('detenerAuto corta el temporizador y no dispara mas avances', () => {
    vi.useFakeTimers();
    let avances = 0;
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => { avances += 1; }, onFin: () => {} });
    cont.querySelector('[data-accion="auto"]').click();
    detenerAuto();
    vi.advanceTimersByTime(5000);
    expect(avances).toBe(0);
  });

  it('al pasar al rincon el modo automatico se corta (no queda un temporizador vivo)', () => {
    vi.useFakeTimers();
    let avances = 0;
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => { avances += 1; }, onFin: () => {} });
    cont.querySelector('[data-accion="auto"]').click();
    renderRincon(cont, { pelea: { ...pelea(), pendiente: 'rincon' }, onInstruccion: () => {} });
    vi.advanceTimersByTime(5000);
    expect(avances).toBe(0);
  });
});

describe('renderRincon', () => {
  it('muestra el estado y las tres instrucciones', () => {
    const enRincon = { ...pelea(), roundActual: 3, pendiente: 'rincon', tarjetas: { jugador: 1, rival: 2 } };
    renderRincon(cont, { pelea: enRincon, onInstruccion: () => {} });
    expect(cont.querySelectorAll('[data-instruccion]')).toHaveLength(3);
    expect(cont.textContent.toLowerCase()).toContain('rincón');
  });

  it('devuelve la instruccion elegida', () => {
    let instruccion = null;
    const enRincon = { ...pelea(), pendiente: 'rincon' };
    renderRincon(cont, { pelea: enRincon, onInstruccion: (i) => { instruccion = i; } });
    cont.querySelector('[data-instruccion="cuerpo"]').click();
    expect(instruccion).toBe('cuerpo');
  });
});

describe('renderGolpeDeGracia', () => {
  it('muestra las tres zonas y cual esta abierta', () => {
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: () => {}, ventanaMs: 3000 });
    expect(cont.querySelectorAll('[data-zona]')).toHaveLength(3);
    expect(cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).textContent.toLowerCase()).toContain('abierto');
  });

  it('elegir una zona reporta el golpe a tiempo', () => {
    let golpe = null;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: (g) => { golpe = g; }, ventanaMs: 3000 });
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).click();
    expect(golpe.aTiempo).toBe(true);
    expect(golpe.zonaElegida).toBe(info.zonaAbierta);
    expect(golpe.precision).toBeGreaterThanOrEqual(0);
    expect(golpe.precision).toBeLessThanOrEqual(1);
  });

  it('si se acaba la ventana reporta que no llegaste', async () => {
    vi.useFakeTimers();
    let golpe = null;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: (g) => { golpe = g; }, ventanaMs: 1000 });
    vi.advanceTimersByTime(1200);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(false);
    vi.useRealTimers();
  });

  it('no reporta dos veces si ya elegiste', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    cont.querySelector('[data-zona="higado"]').click();
    vi.advanceTimersByTime(1500);
    expect(llamadas).toBe(1);
    vi.useRealTimers();
  });
});
