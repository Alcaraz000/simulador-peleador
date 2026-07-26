import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { animarDado } from '../../src/ui/components/dado.js';

// El dado al tocar "Continuar" (v3): el juego se llama así por algo, es su
// gesto de transición entre beats. Mismo patrón que animarRoll/animarNumero
// (temporizador cancelable, respeta prefers-reduced-motion), pero sobre un
// <button> en vez de una tarjeta: reemplaza su contenido por el ícono del
// dado mientras dura, y lo restaura si se cancela antes de tiempo.

let matchMediaOriginal;

function crearBotonFalso(textoOriginal = 'Continuar') {
  const boton = document.createElement('button');
  boton.textContent = textoOriginal;
  document.body.appendChild(boton);
  return boton;
}

beforeEach(() => {
  document.body.innerHTML = '';
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
});

describe('animarDado', () => {
  it('reemplaza el contenido del boton por un dado mientras dura, y llama a onFin al terminar', () => {
    const boton = crearBotonFalso();
    const onFin = vi.fn();
    animarDado(boton, { onFin });

    expect(boton.querySelector('svg')).toBeTruthy();
    expect(onFin).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('dura entre 600 y 900 ms (pedido textual del usuario)', () => {
    const boton = crearBotonFalso();
    const inicio = Date.now();
    let fin = null;
    animarDado(boton, { onFin: () => { fin = Date.now(); } });

    vi.runAllTimers();

    expect(fin).not.toBeNull();
    const duracion = fin - inicio;
    expect(duracion).toBeGreaterThanOrEqual(600);
    expect(duracion).toBeLessThanOrEqual(900);
  });

  it('no deja temporizadores vivos al terminar', () => {
    const boton = crearBotonFalso();
    animarDado(boton, { onFin: () => {} });

    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('deshabilita el boton mientras dura', () => {
    const boton = crearBotonFalso();
    animarDado(boton, { onFin: () => {} });
    expect(boton.disabled).toBe(true);
  });

  it('con prefers-reduced-motion resuelve inmediato, sin animar', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const boton = crearBotonFalso();
    const onFin = vi.fn();

    animarDado(boton, { onFin });

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener() cancela antes de tiempo, no dispara onFin y restaura el contenido original', () => {
    const boton = crearBotonFalso('Continuar');
    const onFin = vi.fn();
    const { detener } = animarDado(boton, { onFin });

    vi.advanceTimersByTime(100);
    detener();

    expect(vi.getTimerCount()).toBe(0);
    expect(onFin).not.toHaveBeenCalled();
    expect(boton.textContent).toBe('Continuar');
    expect(boton.disabled).toBe(false);

    // avanzar más tiempo no debería revivir nada
    vi.advanceTimersByTime(5000);
    expect(onFin).not.toHaveBeenCalled();
  });
});
