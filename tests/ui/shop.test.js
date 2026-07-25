import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderTienda } from '../../src/ui/screens/shop.js';
import { crearPeleador } from '../../src/core/fighter.js';

const CSS = readFileSync(join(process.cwd(), 'src/ui/theme.css'), 'utf-8');

const jugador = (extra = {}) => ({
  ...crearPeleador({
    apellido: 'Test', apodoId: 'toro', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  }),
  ...extra,
});

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  document.head.innerHTML = '';
});

describe('renderTienda — se abre y cierra como popup', () => {
  it('se monta como un popup sobre document.body, con staff y lujos', () => {
    renderTienda({ jugador: jugador({ dinero: 200000 }), onComprar: () => jugador({ dinero: 200000 }), onCerrar: () => {} });
    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    expect(document.body.textContent).toContain('La tienda');
    expect(document.querySelectorAll('[data-item]').length).toBeGreaterThanOrEqual(10);
    expect(document.body.textContent).toContain('Entrenador de elite');
  });

  it('muestra la plata disponible', () => {
    renderTienda({ jugador: jugador({ dinero: 1200000 }), onComprar: () => {}, onCerrar: () => {} });
    expect(document.body.textContent).toContain('US$ 1,2M');
  });

  it('la X del popup cierra la tienda y dispara onCerrar', () => {
    let cerrado = false;
    renderTienda({ jugador: jugador(), onComprar: () => {}, onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-cerrar').click();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('Escape también cierra la tienda (comportamiento heredado del popup)', () => {
    let cerrado = false;
    renderTienda({ jugador: jugador(), onComprar: () => {}, onCerrar: () => { cerrado = true; } });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cerrado).toBe(true);
  });
});

describe('renderTienda — comprar', () => {
  it('comprar dispara el callback con el id del item', () => {
    let comprado = null;
    const rico = jugador({ dinero: 999999 });
    renderTienda({
      jugador: rico,
      onComprar: (id) => { comprado = id; return rico; },
      onCerrar: () => {},
    });
    document.querySelector('[data-item="kinesiologo"]').click();
    expect(comprado).toBe('kinesiologo');
  });

  it('después de comprar, el popup se refresca en el lugar (no se cierra ni se duplica)', () => {
    let dinero = 999999;
    function estadoJugador() { return jugador({ dinero, staff: dinero < 999999 ? ['kinesiologo'] : [] }); }
    renderTienda({
      jugador: estadoJugador(),
      onComprar: () => {
        dinero -= 90000;
        return jugador({ dinero, staff: ['kinesiologo'] });
      },
      onCerrar: () => {},
    });
    document.querySelector('[data-item="kinesiologo"]').click();

    expect(document.querySelectorAll('.popup-overlay')).toHaveLength(1);
    expect(document.querySelector('[data-item="kinesiologo"]').textContent).toMatch(/equipo/i);
  });
});

describe('renderTienda — lo que no se puede pagar se ve claramente apagado', () => {
  it('un item impagable queda disabled y con su propia clase (no-alcanza)', () => {
    renderTienda({ jugador: jugador({ dinero: 0 }), onComprar: () => {}, onCerrar: () => {} });
    const caros = [...document.querySelectorAll('[data-item]')].filter((b) => b.disabled);
    expect(caros.length).toBeGreaterThan(0);
    for (const boton of caros) {
      expect(boton.classList.contains('no-alcanza')).toBe(true);
    }
  });

  it('clickear un item impagable NO dispara el callback', () => {
    let comprado = null;
    renderTienda({ jugador: jugador({ dinero: 0 }), onComprar: (id) => { comprado = id; }, onCerrar: () => {} });
    document.querySelector('[data-item="manager"]').click();
    expect(comprado).toBeNull();
  });

  it('el precio de un item impagable NO se pinta en verde (antes seguía verde y no se leía apagado)', () => {
    document.head.innerHTML = `<style>${CSS}</style>`;
    renderTienda({ jugador: jugador({ dinero: 0 }), onComprar: () => {}, onCerrar: () => {} });
    const item = document.querySelector('[data-item="manager"]');
    const precio = item.querySelector('.tienda-precio');
    const colorVerde = getComputedStyle(document.querySelector('.tienda-disponible .verde')).color;
    expect(getComputedStyle(precio).color).not.toBe(colorVerde);
  });

  it('un item impagable tiene una opacidad reducida (afordancia real de .carta:disabled)', () => {
    document.head.innerHTML = `<style>${CSS}</style>`;
    renderTienda({ jugador: jugador({ dinero: 0 }), onComprar: () => {}, onCerrar: () => {} });
    const item = document.querySelector('[data-item="manager"]');
    expect(Number(getComputedStyle(item).opacity)).toBeLessThan(1);
  });

  it('un item ya comprado NO se ve apagado (se distingue de "no alcanza")', () => {
    document.head.innerHTML = `<style>${CSS}</style>`;
    renderTienda({
      jugador: jugador({ dinero: 999999, staff: ['entrenador'] }),
      onComprar: () => {},
      onCerrar: () => {},
    });
    const item = document.querySelector('[data-item="entrenador"]');
    expect(item.textContent).toMatch(/equipo/i);
    expect(item.classList.contains('comprado')).toBe(true);
    expect(Number(getComputedStyle(item).opacity)).toBe(1);
  });
});

describe('renderTienda — staff con ícono a la izquierda, lujos en grilla con ícono', () => {
  it('cada fila de staff trae un ícono propio', () => {
    renderTienda({ jugador: jugador({ dinero: 500000 }), onComprar: () => {}, onCerrar: () => {} });
    const fila = document.querySelector('[data-item="entrenador"]');
    expect(fila.querySelector('.tienda-item-icono svg')).toBeTruthy();
  });

  it('los lujos viven en una grilla, cada uno con su ícono', () => {
    renderTienda({ jugador: jugador({ dinero: 500000 }), onComprar: () => {}, onCerrar: () => {} });
    const grilla = document.querySelector('.tienda-lujos-grilla');
    expect(grilla).toBeTruthy();
    expect(grilla.querySelector('[data-item="auto"] .tienda-item-icono svg')).toBeTruthy();
  });
});
