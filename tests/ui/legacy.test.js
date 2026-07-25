import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { renderLegado } from '../../src/ui/screens/legacy.js';
import { renderNoticias } from '../../src/ui/screens/news.js';
import { renderFicha } from '../../src/ui/screens/profile.js';

function jugadorConCarrera() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 70, esJugador: true,
  });
  jugador.record = { v: 25, d: 4, e: 1, ko: 18, sub: 0, dec: 7 };
  jugador.titulos = ['Título regional'];
  jugador.defensas = 3;
  jugador.dinero = 1500000;
  jugador.fama = 78;
  jugador.historial = [{
    rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón',
    resultado: 'v', metodo: 'ko', round: 4, bolsa: 90000, enJuego: 'Título regional', esTitulo: true,
  }];
  return jugador;
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderLegado', () => {
  it('muestra record, titulos y los cinco legados', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.textContent).toContain('25-4-1');
    expect(cont.textContent).toContain('Título regional');
    expect(cont.querySelectorAll('[data-legado]')).toHaveLength(5);
  });

  it('muestra la biografia generada', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.textContent).toContain('Lucas Ortiz');
  });

  it('ofrece empezar otra carrera', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    let nueva = false;
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => { nueva = true; } });
    cont.querySelector('[data-accion="nueva"]').click();
    expect(nueva).toBe(true);
  });

  it('ofrece ver las estadisticas de la carrera', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    let vistas = false;
    renderLegado(cont, {
      legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {}, onVerEstadisticas: () => { vistas = true; },
    });
    cont.querySelector('[data-accion="estadisticas"]').click();
    expect(vistas).toBe(true);
  });

  it('muestra la bandera del peleador y el trofeo de sus titulos', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.textContent).toContain('🇦🇷');
    expect(cont.textContent).toContain('🏆');
  });
});

describe('renderNoticias', () => {
  it('lista los titulares', () => {
    const noticias = [
      { id: 'n1', tipo: 'victoria', titular: 'Fulano noqueó a Mengano.', fecha: 2030 },
      { id: 'n2', tipo: 'retiro', titular: 'Zutano se retira.', fecha: 2030 },
    ];
    renderNoticias(cont, { noticias, onContinuar: () => {} });
    expect(cont.querySelectorAll('[data-noticia]')).toHaveLength(2);
    expect(cont.textContent).toContain('Zutano se retira.');
  });

  it('con el feed vacio avisa que no pasó nada', () => {
    renderNoticias(cont, { noticias: [], onContinuar: () => {} });
    expect(cont.textContent.length).toBeGreaterThan(0);
    expect(cont.querySelector('[data-accion="continuar"]')).toBeTruthy();
  });
});

describe('renderFicha', () => {
  it('muestra todos los atributos', () => {
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'atributos', onCerrar: () => {} });
    expect(cont.querySelectorAll('[data-atributo-full]').length).toBeGreaterThanOrEqual(6);
  });

  it('muestra el historial de peleas', () => {
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'historial', onCerrar: () => {} });
    expect(cont.textContent).toContain('Dyke Tyzon');
  });

  it('cerrar dispara el callback', () => {
    let cerrado = false;
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'atributos', onCerrar: () => { cerrado = true; } });
    cont.querySelector('[data-accion="cerrar"]').click();
    expect(cerrado).toBe(true);
  });
});
