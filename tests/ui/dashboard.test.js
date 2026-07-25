import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { renderDashboard } from '../../src/ui/screens/dashboard.js';

function partida() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  });
  jugador.record = { v: 9, d: 3, e: 0, ko: 7, sub: 0, dec: 2 };
  jugador.dinero = 66000;
  jugador.fama = 11;
  return crearPartida({ jugador, semilla: 1 });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderDashboard', () => {
  it('muestra MEDIA, apodo y record', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.querySelector('[data-media]').textContent).toMatch(/\d+/);
    expect(cont.textContent).toContain('EL RELÁMPAGO');
    expect(cont.querySelector('[data-record]').textContent).toBe('9-3');
  });

  it('muestra los seis atributos compactos', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.querySelectorAll('[data-atributo]')).toHaveLength(6);
  });

  it('en boxeo no muestra grappling', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    const nombres = [...cont.querySelectorAll('[data-atributo]')].map((n) => n.dataset.atributo);
    expect(nombres).not.toContain('grappling');
    expect(nombres).toContain('iq');
  });

  it('formatea el dinero', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent).toContain('US$ 66K');
  });

  it('el historial es clickeable', () => {
    let abierto = false;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {}, onFicha: () => { abierto = true; } });
    cont.querySelector('[data-accion="historial"]').click();
    expect(abierto).toBe(true);
  });

  it('la cabecera del peleador abre la ficha', () => {
    let abierto = false;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {}, onFicha: () => { abierto = true; } });
    cont.querySelector('[data-accion="ficha"]').click();
    expect(abierto).toBe(true);
  });

  it('el boton principal dispara onSiguiente', () => {
    let siguiente = 0;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => { siguiente += 1; } });
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(siguiente).toBe(1);
  });

  it('muestra la etapa actual', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent.toUpperCase()).toContain('JUVENIL');
  });

  it('muestra la categoria y la mano con texto legible, no el id crudo', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent).toContain('Peso pluma · Derecha · Boxeo');
    expect(cont.textContent).not.toContain('pluma · derecha');
  });

  it('muestra la bandera de la nacionalidad', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent).toContain('🇦🇷');
  });

  it('muestra los cinturones cuando los tiene', () => {
    const p = partida();
    p.jugador.titulos = ['Cinturón regional'];
    renderDashboard(cont, { partida: p, onSiguiente: () => {} });
    expect(cont.textContent).toContain('Cinturón regional');
  });

  it('sin lesion no muestra panel de lesion ni boton de curar', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent.toLowerCase()).not.toContain('lesion');
    expect(cont.querySelector('[data-accion="curar"]')).toBeNull();
  });

  it('con lesion muestra el nombre y los bloques que faltan', () => {
    const p = partida();
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 22000, texto: 'x',
    };
    renderDashboard(cont, { partida: p, onSiguiente: () => {} });
    expect(cont.textContent).toContain('Mano fracturada');
    expect(cont.textContent).toContain('2');
  });

  it('con lesion ofrece pagar para curarse por el costo que define la lesion', () => {
    const p = partida();
    p.jugador.dinero = 100000;
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 22000, texto: 'x',
    };
    let curado = false;
    renderDashboard(cont, { partida: p, onSiguiente: () => {}, onCurar: () => { curado = true; } });
    expect(cont.textContent).toContain('US$ 22K');
    cont.querySelector('[data-accion="curar"]').click();
    expect(curado).toBe(true);
  });

  it('el boton de curar esta deshabilitado si no alcanza la plata', () => {
    const p = partida();
    p.jugador.dinero = 100;
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 22000, texto: 'x',
    };
    renderDashboard(cont, { partida: p, onSiguiente: () => {} });
    expect(cont.querySelector('[data-accion="curar"]').disabled).toBe(true);
  });
});
