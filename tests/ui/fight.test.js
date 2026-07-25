import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea, simularRound, tarjetasJurados } from '../../src/core/fight.js';
import { abrirGolpeDeGracia, ZONAS_GOLPE } from '../../src/core/fight-interactive.js';
import {
  renderOferta, renderPlan, renderPelea, actualizarMarcador,
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
const peleaBase = () => crearPelea({ jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(1) });

function noop() {}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('renderOferta', () => {
  it('muestra rival, bolsa, riesgo y que esta en juego', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: noop, onRechazar: noop });
    expect(cont.textContent).toContain('Dyke Tyzon');
    expect(cont.textContent).toContain('15-2');
    expect(cont.textContent).toContain('US$ 25K');
    expect(cont.textContent.toLowerCase()).toContain('alto');
    expect(cont.textContent).toContain('Título regional');
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
  it('ofrece los tres planes con voz de entrenador y efectos', () => {
    renderPlan(cont, { oferta, onElegirPlan: noop });
    expect(cont.querySelectorAll('[data-plan]')).toHaveLength(3);
    expect(cont.textContent.toLowerCase()).toContain('entrenador');
  });

  it('devuelve el plan elegido', () => {
    let plan = null;
    renderPlan(cont, { oferta, onElegirPlan: (p) => { plan = p; } });
    cont.querySelector('[data-plan="frente"]').click();
    expect(plan).toBe('frente');
  });
});

describe('renderPelea — marcador', () => {
  it('pinta banderas, apodos, aguante/fatiga con icono, jurados y golpes', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    expect(marcador).toBeTruthy();
    expect(marcador.querySelector('.bandera-svg')).toBeTruthy();
    expect(marcador.textContent).toContain('El Relámpago');
    expect(marcador.textContent).toContain('El Ciclón');
    expect(marcador.querySelector('[data-stat="aguante-jugador"] svg')).toBeTruthy();
    expect(marcador.querySelector('[data-stat="fatiga-jugador"] svg')).toBeTruthy();
    expect(marcador.querySelector('[data-juez="0"]')).toBeTruthy();
    expect(marcador.querySelector('[data-golpes="jugador"]')).toBeTruthy();
  });

  it('el marcador no se vuelve a crear al cambiar de panel (misma identidad de nodo)', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador1 = cont.querySelector('[data-bloque="marcador"]');

    const { pelea: pelea2 } = simularRound(pelea);
    renderPelea(cont, { pelea: pelea2, momentos: [], pendiente: pelea2.pendiente });
    const marcador2 = cont.querySelector('[data-bloque="marcador"]');

    expect(marcador2).toBe(marcador1);
  });

  it('actualizarMarcador refresca numeros y barras sin recrear el nodo', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');

    const modificada = { ...pelea, aguante: { jugador: 40, rival: 55 }, fatiga: { jugador: 70, rival: 20 } };
    actualizarMarcador(marcador, modificada);

    expect(cont.querySelector('[data-bloque="marcador"]')).toBe(marcador);
    expect(marcador.querySelector('[data-stat="aguante-jugador"] .valor').textContent).toBe('40');
    expect(marcador.querySelector('[data-stat="aguante-jugador"] .barra > i').style.width).toBe('40%');
    expect(marcador.querySelector('[data-stat="fatiga-rival"] .valor').textContent).toBe('20');
  });

  it('actualizarMarcador refleja las tarjetas de los jurados', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    const { pelea: peleaConHistorial } = simularRound(pelea);
    actualizarMarcador(marcador, peleaConHistorial);
    const { jueces } = tarjetasJurados(peleaConHistorial);
    expect(marcador.querySelector('[data-juez="0"] .valor').textContent).toBe(`${jueces[0].jugador}-${jueces[0].rival}`);
  });
});

describe('renderPelea — narracion y avance de round', () => {
  it('mientras narra el boton dice SALTAR y no ofrece SEGUIR', () => {
    vi.useFakeTimers();
    const pelea = peleaBase();
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Primer momento.' },
      { round: 1, tipo: 'campana', texto: 'Segundo momento.' },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    expect(cont.querySelector('[data-accion="saltar"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeNull();
  });

  it('saltar completa la narracion y pasa a SEGUIR', () => {
    vi.useFakeTimers();
    const pelea = peleaBase();
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Primer momento.' },
      { round: 1, tipo: 'campana', texto: 'Segundo momento.' },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    cont.querySelector('[data-accion="saltar"]').click();
    expect(cont.textContent).toContain('Primer momento.');
    expect(cont.textContent).toContain('Segundo momento.');
    expect(cont.querySelector('[data-accion="saltar"]')).toBeNull();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('no se puede avanzar antes de que termine: click en saltar no dispara onSeguir directamente', () => {
    vi.useFakeTimers();
    let avances = 0;
    const pelea = peleaBase();
    const momentos = [{ round: 1, tipo: 'jab', texto: 'Uno.' }, { round: 1, tipo: 'campana', texto: 'Dos.' }];
    renderPelea(cont, { pelea, momentos, onSeguir: () => { avances += 1; } });
    cont.querySelector('[data-accion="saltar"]').click();
    expect(avances).toBe(0); // saltar termina la narracion, no avanza el round por si solo
    cont.querySelector('[data-accion="seguir"]').click();
    expect(avances).toBe(1);
  });

  it('con momentos vacios (modo todo/instantaneo) se resuelve directo a SEGUIR', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [], onSeguir: noop });
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('el marcador se actualiza en vivo con el snapshot de cada momento', () => {
    vi.useFakeTimers();
    // El último snapshot SIEMPRE coincide con el estado real de la pelea
    // (garantía del núcleo, ver fight.js) — por eso `pelea` ya trae el
    // aguante final (80) que también trae el snapshot del último momento.
    const pelea = { ...peleaBase(), aguante: { jugador: 100, rival: 80 } };
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Uno.', snapshot: { aguante: { jugador: 100, rival: 90 }, fatiga: { jugador: 5, rival: 5 }, golpes: { jugador: { lanzados: 3, conectados: 1, significativos: 0 }, rival: { lanzados: 2, conectados: 0, significativos: 0 } } } },
      { round: 1, tipo: 'campana', texto: 'Dos.', snapshot: { aguante: { jugador: 100, rival: 80 }, fatiga: { jugador: 10, rival: 10 }, golpes: { jugador: { lanzados: 6, conectados: 2, significativos: 1 }, rival: { lanzados: 4, conectados: 1, significativos: 0 } } } },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    expect(marcador.querySelector('[data-stat="aguante-rival"] .valor').textContent).toBe('90');
    vi.advanceTimersByTime(700);
    expect(marcador.querySelector('[data-stat="aguante-rival"] .valor').textContent).toBe('80');
  });
});

describe('renderPelea — rincon', () => {
  function peleaEnRincon() {
    const { pelea } = simularRound(peleaBase());
    return { ...pelea, pendiente: 'rincon' };
  }

  it('el rincon convive con el marcador (no lo desmonta)', () => {
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [] });
    expect(cont.querySelector('[data-bloque="marcador"]')).toBeTruthy();
    expect(cont.querySelectorAll('[data-instruccion]')).toHaveLength(3);
    expect(cont.textContent.toLowerCase()).toContain('rincón');
  });

  it('devuelve la instruccion elegida', () => {
    let instruccion = null;
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [], onInstruccion: (i) => { instruccion = i; } });
    cont.querySelector('[data-instruccion="cuerpo"]').click();
    expect(instruccion).toBe('cuerpo');
  });
});

describe('renderPelea — golpe de gracia', () => {
  function peleaGroggy() {
    const { pelea } = simularRound(peleaBase());
    return { ...pelea, aguante: { ...pelea.aguante, rival: 12 }, pendiente: 'golpe' };
  }

  it('el golpe de gracia convive con el marcador y muestra la silueta', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    expect(cont.querySelector('[data-bloque="marcador"]')).toBeTruthy();
    expect(cont.querySelector('svg.silueta-rival')).toBeTruthy();
    expect(cont.querySelectorAll('[data-zona]')).toHaveLength(3);
  });

  it('elegir una zona muestra la barra de precision', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    expect(cont.querySelector('.barra-precision-pista')).toBeTruthy();
    expect(cont.querySelector('svg.silueta-rival')).toBeNull();
  });

  it('frenar la barra reporta el golpe a tiempo con la zona elegida', () => {
    vi.useFakeTimers();
    let golpe = null;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: (g) => { golpe = g; } });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    vi.advanceTimersByTime(50);
    cont.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(true);
    expect(golpe.zonaElegida).toBe(info.zonaAbierta);
    expect(golpe.precision).toBeGreaterThanOrEqual(0);
    expect(golpe.precision).toBeLessThanOrEqual(1);
  });

  it('si se acaba la ventana sin elegir zona, reporta que no llego a tiempo', () => {
    vi.useFakeTimers();
    let golpe = null;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: (g) => { golpe = g; }, ventanaMs: 1000 });
    vi.advanceTimersByTime(1200);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(false);
  });

  it('si se re-renderiza mientras la ventana del golpe esta pendiente, no queda un timer colgado', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    // El jugador (o el flujo) vuelve a pintar la pantalla para otro estado
    // antes de que la ventana del golpe se cumpla o se elija una zona.
    renderPelea(cont, { pelea: { ...pelea, pendiente: null }, momentos: [], onSeguir: () => {} });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(llamadas).toBe(0); // el onGolpe viejo nunca se dispara
  });

  it('no reporta el golpe dos veces', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    cont.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    vi.advanceTimersByTime(1500);
    expect(llamadas).toBe(1);
  });

  it('la dificultad de la barra corresponde a la zona elegida', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    const info = abrirGolpeDeGracia(pelea);
    // fuerzo el mentón (mas dificil, franja mas fina) si no es la abierta, o
    // comparo directamente la zona abierta contra higado si aplica.
    const zonaElegida = Object.keys(ZONAS_GOLPE).find((z) => z !== info.zonaAbierta) ?? info.zonaAbierta;
    cont.querySelector(`[data-zona="${zonaElegida}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    const anchoVerde = Number(cont.querySelector('.franja-verde').style.width.replace('%', ''));
    // higado (0.3) siempre da la franja mas ancha de las tres posibles.
    if (zonaElegida === 'higado') {
      expect(anchoVerde).toBeGreaterThan(15);
    } else {
      expect(anchoVerde).toBeLessThan(24);
    }
  });
});

describe('renderPelea — fin de la pelea', () => {
  function peleaTerminadaKo() {
    const pelea = peleaBase();
    return {
      ...pelea, terminada: true,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 4, texto: 'El Relámpago gana por KO en el round 4.' },
    };
  }

  it('muestra el resultado y el boton de cierre, sin boton de seguir', () => {
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.textContent).toContain('gana por KO');
    expect(cont.querySelector('[data-accion="fin"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeNull();
  });

  it('el boton de cierre dispara onFin', () => {
    let terminado = false;
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: () => { terminado = true; } });
    cont.querySelector('[data-accion="fin"]').click();
    expect(terminado).toBe(true);
  });

  it('si termino por nocaut, la cronica tiene la clase de sacudon', () => {
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.querySelector('[data-bloque="cronica"].pelea-ko')).toBeTruthy();
  });

  it('si termino por decision, la cronica NO tiene la clase de sacudon', () => {
    const pelea = {
      ...peleaBase(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'decision', round: 8, texto: 'El Relámpago gana por decisión.' },
    };
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.querySelector('[data-bloque="cronica"].pelea-ko')).toBeNull();
  });
});
