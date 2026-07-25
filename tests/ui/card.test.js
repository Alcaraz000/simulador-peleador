import { describe, it, expect, beforeEach } from 'vitest';
import { renderTarjeta, renderResultadoTarjeta } from '../../src/ui/screens/card.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

const opciones = [
  { id: 'a', titulo: 'Pelota parada', desc: 'Tiros libres sin apuro.', mods: ['+3 Técnica'] },
  { id: 'b', titulo: 'Piernas nuevas', desc: 'Doble turno.', mods: ['+3 Velocidad'] },
  { id: 'c', titulo: 'Referente', desc: 'Primero en llegar.', mods: ['+3 IQ de pelea'] },
];

describe('renderTarjeta', () => {
  it('muestra titulo, texto y todas las opciones', () => {
    renderTarjeta(cont, { titulo: 'Pretemporada', bajada: 'Elegí una.', texto: 'El campamento rindió.', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('Pretemporada');
    expect(cont.textContent).toContain('El campamento rindió.');
    expect(cont.querySelectorAll('[data-opcion]')).toHaveLength(3);
  });

  it('muestra los modificadores de cada opcion', () => {
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('+3 Técnica');
  });

  it('devuelve el id de la opcion elegida', () => {
    let elegido = null;
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones, onElegir: (id) => { elegido = id; } });
    cont.querySelector('[data-opcion="b"]').click();
    expect(elegido).toBe('b');
  });

  it('funciona con dos opciones', () => {
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones: opciones.slice(0, 2), onElegir: () => {} });
    expect(cont.querySelectorAll('[data-opcion]')).toHaveLength(2);
  });

  it('acepta una etiqueta opcional por opcion', () => {
    renderTarjeta(cont, {
      titulo: 'T', texto: 't', onElegir: () => {},
      opciones: [{ id: 'a', titulo: 'X', etiqueta: 'PROVOCADOR' }, { id: 'b', titulo: 'Y' }],
    });
    expect(cont.textContent).toContain('PROVOCADOR');
  });
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
