import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { renderPanelPeleador } from '../../src/ui/screens/panel-peleador.js';

function partidaBase({ media = 55 } = {}) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 1 });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderPanelPeleador', () => {
  it('el color y el nombre del rango de MEDIA cambian segun la MEDIA', () => {
    const bajo = partidaBase({ media: 30 });
    renderPanelPeleador(cont, { partida: bajo });
    expect(cont.textContent).toContain('Hierro');
    const cuadro = cont.querySelector('[data-rango-media]');
    expect(cuadro.style.getPropertyValue('--rango-color') || cuadro.style.color || cuadro.style.background)
      .toBeTruthy();

    const alto = partidaBase({ media: 92 });
    renderPanelPeleador(cont, { partida: alto });
    expect(cont.textContent).toContain('Platino');
  });

  it('muestra el entrenador y su aporte resaltado', () => {
    const p = partidaBase();
    p.jugador.entrenador = {
      nombre: 'Don Pepe',
      iniciales: 'DP',
      escuela: 'escuela técnica',
      frase: 'Pensá antes de tirar.',
      aporte: { tecnica: 6, defensa: 4 },
    };
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Don Pepe');
    expect(cont.textContent).toContain('Pensá antes de tirar.');
    const filaTecnica = cont.querySelector('[data-atributo="tecnica"]');
    expect(filaTecnica.classList.contains('con-aporte')).toBe(true);
    expect(filaTecnica.textContent).toContain('+6');
    const filaCardio = cont.querySelector('[data-atributo="cardio"]');
    expect(filaCardio.classList.contains('con-aporte')).toBe(false);
  });

  // Regresión de la revisión del Bloque 5: el aporte del entrenador se
  // hornea en `jugador.atributos` (crearPeleador) para que la pelea, el
  // ranking y las ofertas lo usen de verdad. El panel mostraba ese valor YA
  // horneado y encima le sumaba el badge "+N" al lado, duplicando el aporte
  // a la vista ("64 +6" cuando el atributo real es 64, no 70). El número
  // grande tiene que ser la BASE sin entrenador; el badge, lo que él aporta.
  it('el numero base que se pinta NO incluye el aporte del entrenador (no lo duplica)', () => {
    // partidaBase() usa estilo 'tecnico', que trae a El Profesor Aldana con
    // aporte real {tecnica: 6, iq: 2} ya horneado en jugador.atributos.
    const p = partidaBase();
    const { jugador } = p;
    expect(jugador.entrenador).toBeTruthy();
    const aporteTecnica = jugador.entrenador.aporte.tecnica;
    expect(aporteTecnica).toBeGreaterThan(0);

    renderPanelPeleador(cont, { partida: p });

    const filaTecnica = cont.querySelector('[data-atributo="tecnica"]');
    const baseMostrada = Number(filaTecnica.querySelector('.valor').textContent);

    // La base pintada NO es el atributo horneado (no está duplicando el
    // aporte encima de un valor que ya lo incluye)...
    expect(baseMostrada).not.toBe(jugador.atributos.tecnica);
    // ...y base + aporte da EXACTAMENTE el atributo real que usa la pelea
    // (la invariante documentada en atributosConEntrenador, coach.js).
    expect(baseMostrada + aporteTecnica).toBe(jugador.atributos.tecnica);
    expect(filaTecnica.textContent).toContain(`+${aporteTecnica}`);
  });

  it('sin peleas todavia, el ranking dice "Sin clasificar"', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Sin clasificar');
  });

  it('despues de la primera pelea, muestra un numero de ranking', () => {
    const p = partidaBase();
    p.jugador.record = { v: 1, d: 0, e: 0, ko: 1, sub: 0, dec: 0 };
    p.jugador.ranking = 7;
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).not.toContain('Sin clasificar');
    expect(cont.textContent).toContain('#7');
  });

  it('dice "Dinero", nunca "Plata"', () => {
    const p = partidaBase();
    p.jugador.dinero = 45000;
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Dinero');
    expect(cont.textContent).not.toMatch(/\bPlata\b/);
  });

  it('usa la bandera SVG y no el emoji', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(cont.textContent).not.toContain('🇦🇷');
  });

  it('no rompe con un peleador recien creado (sin historial, sin titulos, sin entrenador)', () => {
    const p = partidaBase();
    expect(() => renderPanelPeleador(cont, { partida: p })).not.toThrow();
    expect(cont.textContent).toContain('Sin clasificar');
  });

  it('muestra los cinturones cuando los tiene', () => {
    const p = partidaBase();
    p.jugador.titulos = ['Cinturón regional'];
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Cinturón regional');
  });

  it('dispara los callbacks de ficha, tienda e historial', () => {
    const p = partidaBase();
    let ficha = 0; let tienda = 0; let historial = 0;
    renderPanelPeleador(cont, {
      partida: p,
      onFicha: () => { ficha += 1; },
      onTienda: () => { tienda += 1; },
      onHistorial: () => { historial += 1; },
    });
    cont.querySelector('[data-accion="ficha"]').click();
    cont.querySelector('[data-accion="tienda"]').click();
    cont.querySelector('[data-accion="historial"]').click();
    expect(ficha).toBe(1);
    expect(tienda).toBe(1);
    expect(historial).toBe(1);
  });
});
