import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearBarraPrecision, zonaResultado } from '../../../src/ui/components/barra-precision.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('crearBarraPrecision', () => {
  it('monta una barra con la flecha adentro del contenedor', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    expect(cont.querySelector('.barra-precision')).toBeTruthy();
    expect(cont.querySelector('.barra-precision-flecha')).toBeTruthy();
  });

  it('la franja verde es mas ancha cuanto menor la dificultad', () => {
    const facil = crearBarraPrecision({ dificultad: 0.3, onResultado: () => {} }); // higado
    const dificil = crearBarraPrecision({ dificultad: 0.75, onResultado: () => {} }); // menton
    const anchoFacil = Number(facil.nodo.querySelector('.franja-verde').style.width.replace('%', ''));
    const anchoDificil = Number(dificil.nodo.querySelector('.franja-verde').style.width.replace('%', ''));
    expect(anchoFacil).toBeGreaterThan(anchoDificil);
  });

  // Pedido v6: al frenar la flecha ya no se avisa `onResultado` en el mismo
  // instante — primero se pinta el desenlace (clase + texto) y recién tras
  // una pausa breve (bien por debajo de medio segundo, ver
  // PAUSA_RESULTADO_MS en barra-precision.js) se llama a `onResultado`. Los
  // tests de acá abajo avanzan el reloj falso más allá de esa pausa antes de
  // revisar el resultado.
  it('clickear resuelve con una precision entre 0 y 1 (tras la pausa de feedback)', () => {
    let resultado = null;
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: (r) => { resultado = r; } });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    // Antes de que termine la pausa, todavía no se avisó hacia afuera.
    expect(resultado).toBeNull();
    vi.advanceTimersByTime(500);

    expect(resultado).not.toBeNull();
    expect(resultado.precision).toBeGreaterThanOrEqual(0);
    expect(resultado.precision).toBeLessThanOrEqual(1);
  });

  it('resuelve una sola vez aunque se clickee varias veces', () => {
    let llamadas = 0;
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => { llamadas += 1; } });
    cont.appendChild(nodo);
    const pista = nodo.querySelector('.barra-precision-pista');
    vi.advanceTimersByTime(30);
    pista.dispatchEvent(new Event('click', { bubbles: true }));
    pista.dispatchEvent(new Event('click', { bubbles: true }));
    pista.dispatchEvent(new Event('click', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(llamadas).toBe(1);
  });

  it('no deja timers colgados una vez que termina la pausa de feedback', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    // Justo después del click queda pendiente el timer de la pausa de
    // feedback (a propósito: ver el comentario grande arriba del archivo).
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener limpia los timers sin disparar onResultado (antes de clickear)', () => {
    let llamadas = 0;
    const { nodo, detener } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => { llamadas += 1; } });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    detener();
    expect(vi.getTimerCount()).toBe(0);
    expect(llamadas).toBe(0);
  });

  // Mismo contrato, pero durante la pausa de feedback (después de clickear):
  // el jugador se puede ir de la pantalla justo en ese instante y no puede
  // quedar ni el timer ni un onResultado tardío.
  it('detener durante la pausa de feedback tambien cancela sin disparar onResultado', () => {
    let llamadas = 0;
    const { nodo, detener } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => { llamadas += 1; } });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    detener();
    vi.advanceTimersByTime(500);

    expect(vi.getTimerCount()).toBe(0);
    expect(llamadas).toBe(0);
  });

  it('una dificultad mas alta mueve la flecha con pasos mas grandes (mas rapido)', () => {
    let posFacil = null;
    let posDificil = null;
    const facil = crearBarraPrecision({
      dificultad: 0.3,
      onResultado: () => {},
      onCuadro: (pos) => { posFacil = pos; },
    });
    cont.appendChild(facil.nodo);
    vi.advanceTimersByTime(200);
    const facilTrasAvance = posFacil;

    document.body.innerHTML = '<div id="app2"></div>';
    const cont2 = document.getElementById('app2');
    const dificil = crearBarraPrecision({
      dificultad: 0.75,
      onResultado: () => {},
      onCuadro: (pos) => { posDificil = pos; },
    });
    cont2.appendChild(dificil.nodo);
    vi.advanceTimersByTime(200);

    expect(Math.abs(posDificil)).toBeGreaterThan(Math.abs(facilTrasAvance));
  });

  it('respeta prefers-reduced-motion: no arranca timers de movimiento', () => {
    const matchMediaOriginal = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    try {
      const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
      cont.appendChild(nodo);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      window.matchMedia = matchMediaOriginal;
    }
  });

  // Con movimiento reducido la flecha queda fija en el centro del verde: el
  // click tiene que resolver YA, sin la pausa de feedback (nadie que
  // desactivó las animaciones debería tener que esperar un efecto visual que
  // además no va a ver moverse).
  it('con prefers-reduced-motion, clickear resuelve de inmediato (sin pausa)', () => {
    const matchMediaOriginal = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    try {
      let resultado = null;
      const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: (r) => { resultado = r; } });
      cont.appendChild(nodo);
      nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

      expect(resultado).not.toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      window.matchMedia = matchMediaOriginal;
    }
  });
});

// Pedido v6: "hacer algún efecto al intentar pelear (y que varíe, según si
// clickeaste en el verde, amarillo o si erraste)... que se lea de inmediato
// si la clavaste o la erraste". Tres desenlaces distintos, cada uno con su
// propia clase (para el efecto visual, ver theme.css) y su propio texto,
// pintados SINCRÓNICAMENTE con el click (antes de la pausa que demora
// onResultado — ver el describe de arriba).
describe('zonaResultado (clasificación pura, sin DOM)', () => {
  it('el centro exacto del verde siempre es "verde"', () => {
    for (const dificultad of [0, 0.3, 0.5, 0.75, 1]) {
      expect(zonaResultado(dificultad, 50)).toBe('verde');
    }
  });

  it('bien lejos del centro (extremos de la pista) siempre es "errado"', () => {
    for (const dificultad of [0, 0.3, 0.5, 0.75, 1]) {
      expect(zonaResultado(dificultad, 0)).toBe('errado');
      expect(zonaResultado(dificultad, 100)).toBe('errado');
    }
  });
});

describe('crearBarraPrecision — el desenlace se lee de inmediato en el DOM', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clavarla en el centro del verde (click inmediato, sin mover la flecha) marca resultado-verde', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    // Sin avanzar el reloj: la flecha sigue exactamente en el centro del verde.
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    expect(nodo.classList.contains('resultado-verde')).toBe(true);
    expect(nodo.querySelector('.barra-precision-resultado').textContent.length).toBeGreaterThan(0);
  });

  it('rozar el borde (dificultad 0.5: franja roza ~120ms de recorrido) marca resultado-roza', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(120); // 4 ticks × 2.5%/tick = pos 60 (dentro de la franja roza 58-67)
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    expect(nodo.classList.contains('resultado-roza')).toBe(true);
    expect(nodo.classList.contains('resultado-verde')).toBe(false);
  });

  it('errar del todo (más allá de la franja roza) marca resultado-errado', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(210); // 7 ticks × 2.5%/tick = pos 67.5 (fuera de roza, que termina en 67)
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));

    expect(nodo.classList.contains('resultado-errado')).toBe(true);
    expect(nodo.classList.contains('resultado-verde')).toBe(false);
    expect(nodo.classList.contains('resultado-roza')).toBe(false);
  });

  it('los tres desenlaces posibles tienen textos distintos entre si', () => {
    const textos = new Set();
    const casos = [
      { avance: 0, dificultad: 0.5 }, // verde
      { avance: 120, dificultad: 0.5 }, // roza
      { avance: 210, dificultad: 0.5 }, // errado
    ];
    for (const { avance, dificultad } of casos) {
      document.body.innerHTML = '<div id="caso"></div>';
      const contCaso = document.getElementById('caso');
      const { nodo } = crearBarraPrecision({ dificultad, onResultado: () => {} });
      contCaso.appendChild(nodo);
      vi.advanceTimersByTime(avance);
      nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
      textos.add(nodo.querySelector('.barra-precision-resultado').textContent);
    }
    expect(textos.size).toBe(3);
  });
});
