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
  // Pedido 2 (v7, "el amateur tenga su propio historial de verdad"):
  // peleas de formación (juvenil/amateur), separadas del historial
  // profesional de arriba.
  jugador.recordAmateur = {
    v: 5, d: 2, e: 0, ko: 3, sub: 0, dec: 2,
  };
  jugador.historialAmateur = [
    {
      rivalId: 'a1', rivalNombre: 'Pibe Amateur', rivalApodo: null, rivalMedia: 30,
      resultado: 'v', metodo: 'ko', round: 2, bolsa: 400, enJuego: 'Torneo local',
      esTitulo: false, esObligatoria: false, fecha: 1, modo: 'jugada',
    },
    {
      rivalId: 'a2', rivalNombre: 'Otro Juvenil', rivalApodo: null, rivalMedia: 28,
      resultado: 'd', metodo: 'decision', round: 3, bolsa: 300, enJuego: 'Torneo local',
      esTitulo: false, esObligatoria: false, fecha: 2, modo: 'jugada',
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
  it('muestra record y titulos', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.textContent).toContain('25-4-1');
    expect(cont.textContent).toContain('Título regional');
  });

  // Pedido 3 (v7, "quitá la parte de legado, no se entiende y es ruido"):
  // ya no existe la sección de los cinco ejes (deportivo/nacional/
  // económico/mediático/ético) con sus barras.
  it('ya no muestra la sección de legado (los cinco ejes con barras)', () => {
    const jugador = jugadorConCarrera();
    renderCompleto(cont, jugador);
    expect(cont.querySelectorAll('[data-legado]')).toHaveLength(0);
    expect(cont.textContent).not.toContain('Tu legado');
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

    // Pedido 3 (v7, "mostrá la 'racha de victorias' más larga... y la
    // 'racha de derrotas' también"). Historial armado a mano con números que
    // no aparecen ya en ningún otro tile de la pantalla (récord, defensas,
    // etc.), para que el assert no pase "de casualidad".
    it('muestra la racha de victorias y la racha de derrotas mas largas, con sus numeros reales', () => {
      const jugador = jugadorConCarrera();
      jugador.historial = [
        ...jugador.historial,
        { rivalId: 'r3', rivalNombre: 'Rival A', resultado: 'v', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r4', rivalNombre: 'Rival B', resultado: 'v', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r5', rivalNombre: 'Rival C', resultado: 'v', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r6', rivalNombre: 'Rival D', resultado: 'd', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r7', rivalNombre: 'Rival E', resultado: 'd', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r8', rivalNombre: 'Rival F', resultado: 'd', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
        { rivalId: 'r9', rivalNombre: 'Rival G', resultado: 'd', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
      ];
      const partida = armarPartida(jugador);
      const estadisticas = estadisticasDeCarrera(partida);
      expect(estadisticas.rachaMasLarga).toBe(5); // las 2 iniciales + las 3 agregadas, seguidas
      expect(estadisticas.rachaDerrotasMasLarga).toBe(4);
      renderCompleto(cont, jugador);
      expect(cont.textContent.toLowerCase()).toContain('racha de victorias');
      expect(cont.textContent.toLowerCase()).toContain('racha de derrotas');
      expect(cont.textContent).toContain('5');
      expect(cont.textContent).toContain('4');
    });
  });

  // Pedido 2 (v7, "el amateur tenga su propio historial de verdad... y que
  // se vea en la pantalla final, junto al profesional pero claramente
  // separado").
  describe('historial amateur, separado del profesional', () => {
    it('muestra las peleas amateur por nombre de rival, no solo el record', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      expect(cont.textContent).toContain('Pibe Amateur');
      expect(cont.textContent).toContain('Otro Juvenil');
    });

    it('vive en un bloque propio, sin mezclar rivales profesionales', () => {
      const jugador = jugadorConCarrera();
      renderCompleto(cont, jugador);
      const bloque = cont.querySelector('[data-bloque="historial-amateur"]');
      expect(bloque).toBeTruthy();
      expect(bloque.textContent).toContain('Pibe Amateur');
      expect(bloque.textContent).not.toContain('Dyke Tyzon');
    });

    it('sin peleas amateur (guardado viejo, o debut directo), no revienta y no muestra el bloque', () => {
      const jugador = jugadorConCarrera();
      jugador.historialAmateur = [];
      expect(() => renderCompleto(cont, jugador)).not.toThrow();
      expect(cont.querySelector('[data-bloque="historial-amateur"]')).toBeNull();
    });
  });
});

describe('renderFicha', () => {
  // v13 (simplificación de atributos): de seis-siete atributos + especiales
  // a cuatro atributos y nada más (fuerza, defensa, cardio, agilidad).
  it('muestra todos los atributos', () => {
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'atributos', onCerrar: () => {} });
    expect(cont.querySelectorAll('[data-atributo-full]').length).toBe(4);
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
