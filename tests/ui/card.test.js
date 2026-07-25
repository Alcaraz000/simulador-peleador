import { describe, it, expect, beforeEach } from 'vitest';
import { renderResultadoTarjeta } from '../../src/ui/screens/card.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderResultadoTarjeta', () => {
  it('muestra el resultado y los deltas', () => {
    renderResultadoTarjeta(cont, { titulo: 'Resultado', texto: 'Salió bien.', deltas: ['+3 Cardio'], onContinuar: () => {} });
    expect(cont.textContent).toContain('Salió bien.');
    expect(cont.textContent).toContain('+3 Cardio');
  });

  it('continuar dispara el callback', () => {
    let sigue = false;
    renderResultadoTarjeta(cont, { titulo: 'R', texto: 't', deltas: [], onContinuar: () => { sigue = true; } });
    cont.querySelector('[data-accion="continuar"]').click();
    expect(sigue).toBe(true);
  });
});
