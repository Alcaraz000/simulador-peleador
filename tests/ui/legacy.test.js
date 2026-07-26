import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { estadisticasDeCarrera } from '../../src/core/stats-carrera.js';
import { renderLegado } from '../../src/ui/screens/legacy.js';
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
  jugador.edad = 39;
  jugador.historial = [
    {
      rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', rivalMedia: 88,
      resultado: 'v', metodo: 'ko', round: 4, bolsa: 90000, enJuego: 'Título regional',
      esTitulo: true, esObligatoria: false, fecha: 20,
    },
    {
      rivalId: 'r2', rivalNombre: 'Nico Salas', rivalApodo: 'El Nico', rivalMedia: 60,
      resultado: 'v', metodo: 'decision', round: 12, bolsa: 50000, enJuego: 'Título regional',
      esTitulo: true, esObligatoria: true, fecha: 70,
    },
  ];
  return jugador;
}

function armarPartida(jugador) {
  return { ...crearPartida({ jugador, semilla: 1 }), jugador };
}

function renderCompleto(cont, jugador, overrides = {}) {
  const partida = armarPartida(jugador);
  renderLegado(cont, {
    legado: calcularLegado(partida),
    estadisticas: estadisticasDeCarrera(partida),
    jugador,
    onNuevaCarrera: () => {},
    ...overrides,
  });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderLegado', () => {
  it('muestra record, titulos y los cinco legados', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.textContent).toContain('25-4-1');
    expect(cont.textContent).toContain('Título regional');
    expect(cont.querySelectorAll('[data-legado]')).toHaveLength(5);
  });

  it('muestra la biografia generada', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.textContent).toContain('Lucas Ortiz');
  });

  it('ofrece empezar otra carrera', () => {
    const jugador = jugadorConCarrera();
    let nueva = false;
    renderCompleto(cont, jugador, { onNuevaCarrera: () => { nueva = true; } });
    cont.querySelector('[data-accion="nueva"]').click();
    expect(nueva).toBe(true);
  });

  it('ya no esconde las estadisticas detras de un boton: no existe "Ver estadisticas"', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.querySelector('[data-accion="estadisticas"]')).toBeNull();
    expect(cont.textContent).not.toContain('Ver estadísticas');
  });

  it('muestra la bandera del peleador como SVG (no emoji) y el trofeo de sus titulos', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(cont.textContent).not.toContain('🇦🇷');
    expect(cont.textContent).toContain('🏆');
  });

  describe('los cinco ejes del legado: iconos y barras de progreso', () => {
    it('cada eje trae un icono (svg) junto al nombre', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      const paneles = cont.querySelectorAll('[data-legado]');
      for (const panel of paneles) {
        expect(panel.querySelector('svg')).toBeTruthy();
      }
    });

    it('cada eje trae una barra de progreso con el ancho del puntaje, no solo el numero', () => {
      const jugador = jugadorConCarrera();
      const partida = armarPartida(jugador);
      const legado = calcularLegado(partida);
      renderLegado(cont, {
        legado, estadisticas: estadisticasDeCarrera(partida), jugador, onNuevaCarrera: () => {},
      });
      for (const l of legado.legados) {
        const panel = cont.querySelector(`[data-legado="${l.id}"]`);
        const relleno = panel.querySelector('.barra > i');
        expect(relleno).toBeTruthy();
        expect(relleno.style.width).toBe(`${l.puntaje}%`);
      }
    });

    it('el eje nacional se entiende sin explicacion (no dice solo "Legado nacional")', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      const panelNacional = cont.querySelector('[data-legado="nacional"]');
      expect(panelNacional.textContent).not.toContain('¿');
      expect(panelNacional.textContent.toLowerCase()).toContain('país');
    });
  });

  describe('titulos: fechas de conquista y defensa', () => {
    it('muestra cuando gano el titulo y cuando lo defendio', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      const panelTitulos = cont.querySelector('[data-bloque="titulos"]');
      expect(panelTitulos).toBeTruthy();
      expect(panelTitulos.textContent).toContain('Nico Salas');
      // fechaDe con semanaGlobal 20 y 70 cae en años distintos del arranque:
      // alcanza con confirmar que aparece un año de 4 dígitos, no que sea uno puntual.
      expect(panelTitulos.textContent).toMatch(/20\d{2}/);
    });

    it('sin ningun titulo, muestra el mensaje de siempre y no revienta', () => {
      const jugador = crearPeleador({
        nombre: 'Novato', apodo: 'El Novato', nacionalidad: 'AR', disciplina: 'boxeo',
        estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 40, esJugador: true,
      });
      expect(() => renderCompleto(cont, jugador)).not.toThrow();
      expect(cont.textContent).toContain('Nunca se colgó un cinturón');
    });
  });

  describe('estadisticas de la carrera, visibles directamente en la pantalla', () => {
    it('muestra los tiles principales sin necesidad de ningun click', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      expect(cont.textContent).toContain('Peleas');
      expect(cont.textContent).toContain('Ganadas');
      expect(cont.textContent).toContain('% KO');
    });

    it('muestra al rival mas duro que enfrento', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      expect(cont.textContent).toContain('Dyke Tyzon');
    });

    it('no explota ni muestra undefined/NaN con una carrera sin peleas', () => {
      const jugador = crearPeleador({
        nombre: 'Novato', apodo: 'El Novato', nacionalidad: 'AR', disciplina: 'boxeo',
        estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 40, esJugador: true,
      });
      expect(() => renderCompleto(cont, jugador)).not.toThrow();
      expect(cont.textContent).not.toContain('undefined');
      expect(cont.textContent).not.toContain('NaN');
    });
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
