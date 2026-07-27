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
    const fecha = fechaDe(60, ANIO_INICIAL);
    expect(cont.textContent).toContain(String(fecha.anio));
    expect(cont.textContent).toContain(fecha.nombreMes);
    expect(cont.textContent).toContain(`Semana ${fecha.semanaDelMes}`);
  });

  // Pedido 2 (v9, "no hace falta la etiqueta 'calendario' (se sobreentiende)"
  // + visual nueva "(2024) Septiembre    Semana 3"): sin el título del
  // módulo, el año como chip con fondo (mismo lenguaje que el resto del
  // tablero) separado del mes y la semana.
  it('no muestra la etiqueta "Calendario" (se sobreentiende)', () => {
    renderCalendario(cont, { partida: partidaBase() });
    expect(cont.textContent).not.toContain('Calendario');
  });

  it('el año se muestra como un chip con fondo, no como texto suelto', () => {
    renderCalendario(cont, { partida: partidaBase() });
    const chipAnio = cont.querySelector('.calendario-anio');
    expect(chipAnio).toBeTruthy();
    expect(chipAnio.classList.contains('chip')).toBe(true);
    expect(chipAnio.textContent).toBe('2026');
  });

  it('mes y semana viven en sus propios elementos, separados del año', () => {
    const p = partidaBase();
    p.semanaGlobal = 60;
    renderCalendario(cont, { partida: p });
    const fecha = fechaDe(60, ANIO_INICIAL);
    expect(cont.querySelector('.calendario-mes').textContent).toBe(fecha.nombreMes);
    expect(cont.querySelector('.calendario-semana').textContent).toBe(`Semana ${fecha.semanaDelMes}`);
  });
});
