import { describe, it, expect } from 'vitest';
import { el, clear, mount, fmtDinero, fmtDelta } from '../../src/ui/dom.js';
import { icono } from '../../src/ui/icons.js';

describe('el', () => {
  it('crea un elemento con clase y texto', () => {
    const nodo = el('div', { class: 'tile', text: 'Hola' });
    expect(nodo.tagName).toBe('DIV');
    expect(nodo.className).toBe('tile');
    expect(nodo.textContent).toBe('Hola');
  });

  it('acepta hijos sueltos y en array', () => {
    const nodo = el('div', {}, [el('span', { text: 'a' }), 'b', null]);
    expect(nodo.children).toHaveLength(1);
    expect(nodo.textContent).toBe('ab');
  });

  it('setea dataset y atributos', () => {
    const nodo = el('button', { dataset: { id: 'x' }, 'aria-label': 'Cerrar' });
    expect(nodo.dataset.id).toBe('x');
    expect(nodo.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('conecta onClick', () => {
    let clicks = 0;
    const nodo = el('button', { onClick: () => { clicks += 1; } });
    nodo.click();
    expect(clicks).toBe(1);
  });
});

describe('clear y mount', () => {
  it('clear vacia el nodo', () => {
    const nodo = el('div', {}, [el('span'), el('span')]);
    clear(nodo);
    expect(nodo.children).toHaveLength(0);
  });

  it('mount limpia y agrega', () => {
    const cont = el('div', {}, [el('span')]);
    mount(cont, el('p'), el('p'));
    expect(cont.children).toHaveLength(2);
  });
});

describe('fmtDinero', () => {
  it('formatea miles y millones', () => {
    expect(fmtDinero(940)).toBe('US$ 940');
    expect(fmtDinero(66000)).toBe('US$ 66K');
    expect(fmtDinero(1200000)).toBe('US$ 1,2M');
  });

  it('cero se muestra completo', () => {
    expect(fmtDinero(0)).toBe('US$ 0');
  });
});

describe('fmtDelta', () => {
  it('agrega el signo', () => {
    expect(fmtDelta(3)).toBe('+3');
    expect(fmtDelta(-2)).toBe('-2');
    expect(fmtDelta(0)).toBe('0');
  });
});

describe('icono', () => {
  it('devuelve un svg sin emojis', () => {
    const svg = icono('trofeo');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.outerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('respeta tamano y color', () => {
    const svg = icono('guante', { tamano: 24, color: '#ef4444' });
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('stroke')).toBe('#ef4444');
  });

  it('tira error con un nombre desconocido', () => {
    expect(() => icono('inventado')).toThrow(/inventado/);
  });
});
