import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { fechaDe } from '../../src/core/calendario.js';
import { ANIO_INICIAL } from '../../src/core/world.js';
import { renderCalendario } from '../../src/ui/screens/panel-calendario.js';

// El calendario vive en la columna CENTRAL del tablero (pedido del
// coordinador tras la revisión de la Task 6.1): es información permanente
// del jugador (en qué mes/semana está), y la derecha se colapsa detrás de un
// botón en celular — justo donde más falta orientarse. Antes vivía adentro
// de panel-proxima.js (derecha); ahora es su propio panel chico, reusable
// tanto arriba del panel de avance como arriba de cualquier decisión.

function partidaBase() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 1 });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderCalendario', () => {
  it('muestra el mes y la semana actual', () => {
    renderCalendario(cont, { partida: partidaBase() });
    expect(cont.textContent).toContain('2026');
    expect(cont.textContent).toContain('Semana');
  });

  it('avanza con semanaGlobal (no queda pegado al arranque de la carrera)', () => {
    const p = partidaBase();
    p.semanaGlobal = 60;
    renderCalendario(cont, { partida: p });
    expect(cont.textContent).toContain(fechaDe(60, ANIO_INICIAL).texto);
  });
});
