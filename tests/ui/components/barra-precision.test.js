import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearBarraPrecision } from '../../../src/ui/components/barra-precision.js';

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

  it('clickear resuelve con una precision entre 0 y 1', () => {
    let resultado = null;
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: (r) => { resultado = r; } });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
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
    expect(llamadas).toBe(1);
  });

  it('no deja timers colgados despues de resolver', () => {
    const { nodo } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => {} });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    nodo.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener limpia los timers sin disparar onResultado', () => {
    let llamadas = 0;
    const { nodo, detener } = crearBarraPrecision({ dificultad: 0.5, onResultado: () => { llamadas += 1; } });
    cont.appendChild(nodo);
    vi.advanceTimersByTime(50);
    detener();
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
});
