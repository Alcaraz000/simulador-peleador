import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { renderPanelProxima } from '../../src/ui/screens/panel-proxima.js';

function partidaBase() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 1 });
}

function ofertaDeMuestra(rivalId) {
  return {
    id: 'of_1',
    rivalId,
    rivalNombre: 'Tyrell Carter',
    rivalApodo: 'El Tanque',
    rivalMedia: 61,
    rivalRecord: '10-2',
    nivel: 'regional',
    enJuego: 'Subís al ranking si ganás',
    esTitulo: false,
  };
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderPanelProxima', () => {
  it('muestra el calendario (mes y semana) sin importar si hay pelea firmada', () => {
    const p = partidaBase();
    renderPanelProxima(cont, { partida: p });
    expect(cont.textContent).toContain('2026');
    expect(cont.textContent).toContain('Semana');
  });

  it('sin pelea firmada, muestra el estado vacío', () => {
    const p = partidaBase();
    p.proximaPelea = null;
    renderPanelProxima(cont, { partida: p });
    expect(cont.textContent).toContain('Todavía no hay nada firmado');
  });

  it('con pelea firmada, muestra que está en juego, cuánto falta y el rival', () => {
    const p = partidaBase();
    const rivalId = p.mundo.roster[0].id;
    p.mundo.roster[0].nacionalidad = 'MX';
    const oferta = ofertaDeMuestra(rivalId);
    p.proximaPelea = { oferta, semanaObjetivo: p.semanaGlobal + 20 };

    renderPanelProxima(cont, { partida: p });

    expect(cont.textContent).toContain('Subís al ranking si ganás');
    expect(cont.textContent).toContain('El Tanque');
    expect(cont.textContent).toContain('61');
    expect(cont.textContent).toContain('10-2');
    expect(cont.textContent).not.toContain('Todavía no hay nada firmado');
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
  });

  it('el rival es clickeable y dispara onVerRival con su id', () => {
    const p = partidaBase();
    const rivalId = p.mundo.roster[0].id;
    p.proximaPelea = { oferta: ofertaDeMuestra(rivalId), semanaObjetivo: p.semanaGlobal + 10 };

    let visto = null;
    renderPanelProxima(cont, { partida: p, onVerRival: (id) => { visto = id; } });
    cont.querySelector('[data-accion="ver-rival"]').click();
    expect(visto).toBe(rivalId);
  });
});
