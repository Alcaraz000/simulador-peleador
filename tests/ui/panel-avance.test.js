import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { renderPanelAvance } from '../../src/ui/screens/panel-avance.js';

// Panel de avance (v2, Task 6.1): lo que se pinta en la región CENTRAL del
// shell cuando no hay una decisión pendiente — el "entre beats" que antes
// mostraba el renderDashboard de la v1 (pantalla completa). Vive DENTRO del
// tablero, nunca lo reemplaza: por eso monta sobre una `region` (como los
// demás panel-*), no sobre un `contenedor` de pantalla completa.

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

describe('renderPanelAvance', () => {
  // La etapa actual (nombre + frase) se mudó al bloque permanente de
  // categoría/ranking del panel izquierdo (v4, grilla 3×3) — ver
  // panel-peleador.test.js. Acá ya no se duplica: este panel es solo lo que
  // cambia según haya o no una lesión, más el botón de avanzar.
  it('no duplica la etapa (ya vive siempre visible en el panel izquierdo)', () => {
    renderPanelAvance(cont, { partida: partidaBase(), onSiguiente: () => {} });
    expect(cont.textContent).not.toContain('Nadie sabe quién sos. Todavía.');
  });

  it('el boton principal dispara onSiguiente', () => {
    let veces = 0;
    renderPanelAvance(cont, { partida: partidaBase(), onSiguiente: () => { veces += 1; } });
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(veces).toBe(1);
  });

  it('sin lesion no muestra panel de lesion ni boton de curar', () => {
    renderPanelAvance(cont, { partida: partidaBase(), onSiguiente: () => {} });
    expect(cont.textContent.toLowerCase()).not.toContain('lesion');
    expect(cont.querySelector('[data-accion="curar"]')).toBeNull();
  });

  it('con lesion muestra el nombre y las semanas que faltan', () => {
    const p = partidaBase();
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 22000, texto: 'x',
    };
    renderPanelAvance(cont, { partida: p, onSiguiente: () => {} });
    expect(cont.textContent).toContain('Mano fracturada');
    expect(cont.textContent).toContain('10');
    expect(cont.textContent.toLowerCase()).toContain('semana');
  });

  it('con lesion ofrece pagar para curarse por el costo que define la lesion', () => {
    const p = partidaBase();
    p.jugador.dinero = 100000;
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 22000, texto: 'x',
    };
    let curado = false;
    renderPanelAvance(cont, { partida: p, onSiguiente: () => {}, onCurar: () => { curado = true; } });
    expect(cont.textContent).toContain('US$ 22K');
    cont.querySelector('[data-accion="curar"]').click();
    expect(curado).toBe(true);
  });

  it('el boton de curar esta deshabilitado si no alcanza la plata', () => {
    const p = partidaBase();
    p.jugador.dinero = 100;
    p.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 22000, texto: 'x',
    };
    renderPanelAvance(cont, { partida: p, onSiguiente: () => {} });
    expect(cont.querySelector('[data-accion="curar"]').disabled).toBe(true);
  });
});
