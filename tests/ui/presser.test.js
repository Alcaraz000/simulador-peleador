import { describe, it, expect, beforeEach } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearCareo, responderCareo } from '../../src/core/presser.js';
import { renderCareo } from '../../src/ui/screens/presser.js';

const oferta = {
  id: 'of_1', rivalId: 'riv_1', rivalApodo: 'El Ciclón', rivalNombre: 'Dyke Tyzon',
  rivalPersonalidad: 'agresivo', esTitulo: true,
};

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

function noop() {}

describe('renderCareo', () => {
  it('muestra la pregunta en una grilla 2x2 de 4 tarjetas con icono, una por tono', () => {
    const careo = crearCareo(createRng(1), { oferta });
    renderCareo(cont, { careo, onResponder: noop, onTerminar: noop });

    const grilla = cont.querySelector('.panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    const tarjetas = grilla.querySelectorAll('.tarjeta');
    expect(tarjetas).toHaveLength(4);
    for (const tarjeta of tarjetas) {
      expect(tarjeta.querySelector('svg')).toBeTruthy();
      expect(['provocador', 'frio', 'humilde', 'canchero']).toContain(tarjeta.dataset.tono);
    }
  });

  it('cada tarjeta de respuesta tiene tamaño fijo (usa el sistema de tarjetas del juego)', () => {
    const careo = crearCareo(createRng(1), { oferta });
    renderCareo(cont, { careo, onResponder: noop, onTerminar: noop });
    for (const tarjeta of cont.querySelectorAll('.panel-decision-grilla-2 .tarjeta')) {
      expect(tarjeta.querySelector('.tarjeta-titulo')).toBeTruthy();
      expect(tarjeta.querySelector('.tarjeta-desc')).toBeTruthy();
    }
  });

  it('distingue con claridad si habla el rival o un periodista', () => {
    const careoRival = crearCareo(createRng(1), { oferta });
    const conPreguntaRival = { ...careoRival, preguntas: [{ id: 'x', hablante: 'rival', texto: 'x', respuestas: careoRival.preguntas[0].respuestas }] };
    renderCareo(cont, { careo: conPreguntaRival, onResponder: noop, onTerminar: noop });
    expect(cont.textContent).toContain('El Ciclón');

    const conPreguntaPeriodista = { ...careoRival, preguntas: [{ id: 'y', hablante: 'periodista', texto: 'y', respuestas: careoRival.preguntas[0].respuestas }] };
    renderCareo(cont, { careo: conPreguntaPeriodista, onResponder: noop, onTerminar: noop });
    expect(cont.textContent.toLowerCase()).toContain('cronista');
  });

  it('elegir una respuesta dispara el callback con el tono', () => {
    let tonoElegido = null;
    const careo = crearCareo(createRng(1), { oferta });
    renderCareo(cont, { careo, onResponder: (t) => { tonoElegido = t; }, onTerminar: noop });
    cont.querySelector('[data-tono="frio"]').click();
    expect(tonoElegido).toBe('frio');
  });

  it('al terminar, muestra un resumen con una fila por ronda y las consecuencias finales', () => {
    let careo = crearCareo(createRng(2), { oferta });
    const tonos = ['provocador', 'frio', 'humilde'];
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, tonos[i], createRng(i)).careo;
    expect(careo.terminado).toBe(true);

    renderCareo(cont, { careo, onResponder: noop, onTerminar: noop });

    const filas = cont.querySelectorAll('.careo-resumen-fila');
    expect(filas).toHaveLength(3);
    expect(cont.textContent).toContain('Fama');
    expect(cont.textContent).toContain('Moral');
    expect(cont.textContent).toContain('Calentura');
    // Ya no se ofrecen mas respuestas ni pregunta nueva.
    expect(cont.querySelectorAll('.panel-decision-grilla-2 .tarjeta')).toHaveLength(0);
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });

  it('terminar dispara el callback', () => {
    let terminado = false;
    let careo = crearCareo(createRng(3), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'frio', createRng(i)).careo;
    renderCareo(cont, { careo, onResponder: noop, onTerminar: () => { terminado = true; } });
    cont.querySelector('[data-accion="terminar"]').click();
    expect(terminado).toBe(true);
  });
});
