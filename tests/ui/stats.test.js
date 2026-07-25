import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { estadisticasDeCarrera } from '../../src/core/stats-carrera.js';
import { renderEstadisticas } from '../../src/ui/screens/stats.js';

function jugadorConCarrera() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 70, esJugador: true,
  });
  jugador.record = { v: 20, d: 3, e: 1, ko: 14, sub: 0, dec: 6 };
  jugador.titulos = ['Cinturón regional'];
  jugador.defensas = 2;
  jugador.edad = 39;
  jugador.historial = [
    {
      rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', rivalMedia: 88,
      resultado: 'v', metodo: 'ko', round: 4, bolsa: 90000, enJuego: 'Cinturón regional', esTitulo: true,
    },
    {
      rivalId: 'r2', rivalNombre: 'Flaco Robles', rivalApodo: 'El Flaco', rivalMedia: 50,
      resultado: 'v', metodo: 'decision', round: 8, bolsa: 12000, enJuego: 'Ranking', esTitulo: false,
    },
  ];
  return jugador;
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderEstadisticas', () => {
  it('muestra los tiles principales de la carrera', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderEstadisticas(cont, { estadisticas: estadisticasDeCarrera(partida), onCerrar: () => {} });
    expect(cont.textContent).toContain('Estadísticas');
    expect(cont.textContent).toContain('Peleas');
    expect(cont.textContent).toContain('🏆 Títulos');
  });

  it('muestra al rival mas duro que enfrento', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderEstadisticas(cont, { estadisticas: estadisticasDeCarrera(partida), onCerrar: () => {} });
    expect(cont.textContent).toContain('Dyke Tyzon');
  });

  it('no explota con una carrera sin peleas', () => {
    const jugador = crearPeleador({
      nombre: 'Novato', apodo: 'El Novato', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 40, esJugador: true,
    });
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    expect(() => renderEstadisticas(cont, {
      estadisticas: estadisticasDeCarrera(partida), onCerrar: () => {},
    })).not.toThrow();
    expect(cont.textContent).not.toContain('undefined');
    expect(cont.textContent).not.toContain('NaN');
  });

  it('volver dispara el callback', () => {
    let cerrado = false;
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderEstadisticas(cont, { estadisticas: estadisticasDeCarrera(partida), onCerrar: () => { cerrado = true; } });
    cont.querySelector('[data-accion="cerrar"]').click();
    expect(cerrado).toBe(true);
  });
});
