import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { animarNumero, animarAtributos } from '../../src/ui/components/animar-numero.js';

let matchMediaOriginal;

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

function nodoValor(texto = '') {
  const nodo = document.createElement('div');
  nodo.textContent = texto;
  document.body.appendChild(nodo);
  return nodo;
}

describe('animarNumero', () => {
  it('llega exactamente al valor "hasta"', () => {
    const nodo = nodoValor();
    animarNumero(nodo, { desde: 60, hasta: 65 });

    vi.runAllTimers();

    expect(nodo.textContent).toBe('65');
  });

  it('no deja temporizadores vivos al terminar', () => {
    const nodo = nodoValor();
    animarNumero(nodo, { desde: 60, hasta: 65 });

    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('con prefers-reduced-motion escribe el valor final directo, sin animar', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const nodo = nodoValor();

    animarNumero(nodo, { desde: 60, hasta: 65 });

    expect(nodo.textContent).toBe('65');
    expect(vi.getTimerCount()).toBe(0);
    expect(nodo.classList.contains('verde')).toBe(false);
    expect(nodo.classList.contains('rojo')).toBe(false);
  });

  it('colorea de verde mientras sube y quita el color al terminar', () => {
    const nodo = nodoValor();
    animarNumero(nodo, { desde: 60, hasta: 65 });

    expect(nodo.classList.contains('verde')).toBe(true);

    vi.runAllTimers();

    expect(nodo.classList.contains('verde')).toBe(false);
    expect(nodo.classList.contains('rojo')).toBe(false);
  });

  it('colorea de rojo mientras baja y quita el color al terminar', () => {
    const nodo = nodoValor();
    animarNumero(nodo, { desde: 65, hasta: 58 });

    expect(nodo.classList.contains('rojo')).toBe(true);

    vi.runAllTimers();

    expect(nodo.textContent).toBe('58');
    expect(nodo.classList.contains('rojo')).toBe(false);
  });

  it('si "desde" y "hasta" son iguales no anima ni deja timers ni colorea', () => {
    const nodo = nodoValor();
    animarNumero(nodo, { desde: 50, hasta: 50 });

    expect(nodo.textContent).toBe('50');
    expect(vi.getTimerCount()).toBe(0);
    expect(nodo.classList.contains('verde')).toBe(false);
    expect(nodo.classList.contains('rojo')).toBe(false);
  });

  it('detener() cancela antes de tiempo y limpia el temporizador', () => {
    const nodo = nodoValor();
    const { detener } = animarNumero(nodo, { desde: 0, hasta: 100, duracion: 1000 });

    vi.advanceTimersByTime(100);
    detener();

    expect(vi.getTimerCount()).toBe(0);
    const valorTrasDetener = nodo.textContent;

    vi.advanceTimersByTime(5000);
    expect(nodo.textContent).toBe(valorTrasDetener); // no siguió cambiando
  });
});

describe('animarAtributos', () => {
  function tile(clave, valorFinal) {
    const contenedorTile = document.createElement('div');
    contenedorTile.dataset.atributo = clave;
    const valor = document.createElement('div');
    valor.className = 'valor';
    valor.textContent = String(valorFinal);
    contenedorTile.appendChild(valor);
    return contenedorTile;
  }

  function armarContenedor() {
    const contenedor = document.createElement('div');
    contenedor.appendChild(tile('potencia', 65)); // ya renderizado con el valor final
    contenedor.appendChild(tile('cardio', 58));
    document.body.appendChild(contenedor);
    return contenedor;
  }

  it('anima cada atributo desde su valor previo (final - delta) hasta el valor ya pintado', () => {
    const contenedor = armarContenedor();

    animarAtributos(contenedor, { potencia: 5, cardio: -3 });

    const potencia = contenedor.querySelector('[data-atributo="potencia"] .valor');
    const cardio = contenedor.querySelector('[data-atributo="cardio"] .valor');

    // arranca en "desde" = hasta - delta
    expect(potencia.textContent).toBe('60');
    expect(cardio.textContent).toBe('61');

    vi.runAllTimers();

    expect(potencia.textContent).toBe('65');
    expect(cardio.textContent).toBe('58');
  });

  it('no deja temporizadores vivos', () => {
    const contenedor = armarContenedor();
    animarAtributos(contenedor, { potencia: 5, cardio: -3 });

    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignora deltas en cero o de atributos que no están en el contenedor, sin romper', () => {
    const contenedor = armarContenedor();

    expect(() => animarAtributos(contenedor, { potencia: 0, iq: 4, cardio: -3 })).not.toThrow();

    vi.runAllTimers();
    expect(vi.getTimerCount()).toBe(0);
  });
});
