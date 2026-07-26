import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderCreacion } from '../../src/ui/screens/create.js';
import { createRng } from '../../src/core/rng.js';
import { mediaDe } from '../../src/core/fighter.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

function irAPaso1(overrides = {}) {
  let recibido = null;
  renderCreacion(cont, { onComenzar: (p) => { recibido = p; }, rng: createRng(1), ...overrides });
  return { obtenerRecibido: () => recibido };
}

// Avanza los 4 pasos eligiendo siempre la primera tarjeta ofrecida en cada
// uno, y devuelve justo antes de clickear "Empezar la carrera".
function completarHastaEstilo(apellido = 'Ortiz') {
  cont.querySelector('[data-campo="apellido"]').value = apellido;
  cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
  cont.querySelector('[data-accion="siguiente"]').click();

  cont.querySelector('[data-paso="2"] [data-opcion]').click();
  cont.querySelector('[data-paso="3"] [data-opcion]').click();
  cont.querySelector('[data-paso="4"] [data-opcion]').click();
}

describe('renderCreacion — Paso 1 (los datos)', () => {
  it('muestra el paso 1 con todos los campos', () => {
    irAPaso1();
    expect(cont.querySelector('[data-campo="apellido"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="mano"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="disciplina"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="nacionalidad"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="categoria"]')).toBeTruthy();
  });

  it('rotula el paso como "PASO 1"', () => {
    irAPaso1();
    expect(cont.textContent).toContain('PASO 1');
  });

  it('la nacionalidad es un botón, no un <select> con emoji', () => {
    irAPaso1();
    const campo = cont.querySelector('[data-campo="nacionalidad"]');
    expect(campo.tagName).toBe('BUTTON');
    expect(campo.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(campo.textContent).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  it('no deja avanzar sin apellido', () => {
    irAPaso1();
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(cont.querySelector('[data-paso="2"]')).toBeNull();
    expect(cont.querySelector('[data-error]').textContent.length).toBeGreaterThan(0);
  });

  it('con apellido, "Siguiente" revela el paso 2 (ORIGEN)', () => {
    irAPaso1();
    cont.querySelector('[data-campo="apellido"]').value = 'Sosa';
    cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(cont.querySelector('[data-paso="2"]')).toBeTruthy();
    expect(cont.textContent).toContain('PASO 2');
  });

  it('todos los controles del paso 1 miden lo mismo (46px)', () => {
    const CSS = readFileSync(join(process.cwd(), 'src/ui/theme.css'), 'utf-8');
    document.head.innerHTML = `<style>${CSS}</style>`;
    irAPaso1();
    for (const campo of ['apellido', 'mano', 'disciplina', 'nacionalidad', 'categoria']) {
      const nodo = cont.querySelector(`[data-campo="${campo}"]`);
      expect(window.getComputedStyle(nodo).height).toBe('46px');
    }
  });
});

describe('renderCreacion — el picker de nacionalidad (popup)', () => {
  it('el botón de nacionalidad abre un popup con las 6 banderas en grilla 3×2', () => {
    irAPaso1();
    cont.querySelector('[data-campo="nacionalidad"]').click();
    const grilla = document.querySelector('.popup-banderas-grilla');
    expect(grilla).toBeTruthy();
    const botones = grilla.querySelectorAll('.popup-bandera-boton');
    expect(botones).toHaveLength(6);
    for (const codigo of ['AR', 'MX', 'US', 'ES', 'IT', 'JP']) {
      expect(grilla.querySelector(`[data-pais="${codigo}"]`)).toBeTruthy();
    }
  });

  it('elegir una bandera del popup actualiza el botón y cierra el popup', () => {
    irAPaso1();
    cont.querySelector('[data-campo="nacionalidad"]').click();
    document.querySelector('[data-pais="MX"]').click();

    expect(document.querySelector('.popup-overlay')).toBeNull();
    expect(cont.querySelector('[data-campo="nacionalidad"]').textContent).toContain('México');
  });
});

describe('renderCreacion — pasos 2/3/4 se revelan de a uno, en orden', () => {
  it('el paso 2 (origen) ofrece exactamente 2 tarjetas', () => {
    irAPaso1();
    completarHastaEstiloParcial();
    function completarHastaEstiloParcial() {
      cont.querySelector('[data-campo="apellido"]').value = 'Ortiz';
      cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
      cont.querySelector('[data-accion="siguiente"]').click();
    }
    expect(cont.querySelectorAll('[data-paso="2"] [data-opcion]')).toHaveLength(2);
    expect(cont.querySelector('[data-paso="3"]')).toBeNull();
  });

  it('elegir un origen revela el paso 3 (apodo) con 3 tarjetas, y no antes', () => {
    const { } = irAPaso1();
    cont.querySelector('[data-campo="apellido"]').value = 'Ortiz';
    cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
    cont.querySelector('[data-accion="siguiente"]').click();

    expect(cont.querySelector('[data-paso="3"]')).toBeNull();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();

    expect(cont.textContent).toContain('PASO 3');
    expect(cont.querySelectorAll('[data-paso="3"] [data-opcion]')).toHaveLength(3);
    expect(cont.querySelector('[data-paso="4"]')).toBeNull();
  });

  it('elegir un apodo revela el paso 4 (estilo), con el entrenador de cada estilo', () => {
    irAPaso1();
    cont.querySelector('[data-campo="apellido"]').value = 'Ortiz';
    cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
    cont.querySelector('[data-accion="siguiente"]').click();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();

    expect(cont.textContent).toContain('PASO 4');
    const tarjetasEstilo = cont.querySelectorAll('[data-paso="4"] [data-opcion]');
    expect(tarjetasEstilo.length).toBeGreaterThan(0);
    // Cada estilo trae su entrenador: nombre y frase visibles en la tarjeta.
    expect(cont.querySelector('[data-paso="4"]').textContent).toContain('Tu entrenador');
  });

  it('no hay botón de "Empezar la carrera" hasta elegir un estilo', () => {
    irAPaso1();
    cont.querySelector('[data-campo="apellido"]').value = 'Ortiz';
    cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
    cont.querySelector('[data-accion="siguiente"]').click();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();
    expect(cont.querySelector('[data-accion="comenzar"]')).toBeNull();

    cont.querySelector('[data-paso="4"] [data-opcion]').click();
    expect(cont.querySelector('[data-accion="comenzar"]')).toBeTruthy();
  });
});

describe('renderCreacion — se puede volver atrás a un paso ya resuelto', () => {
  it('elegir otra tarjeta de origen ya revelado cambia la elección sin romper el paso 3/4', () => {
    irAPaso1();
    cont.querySelector('[data-campo="apellido"]').value = 'Ortiz';
    cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
    cont.querySelector('[data-accion="siguiente"]').click();

    const opcionesOrigen = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    opcionesOrigen[0].click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();
    cont.querySelector('[data-paso="4"] [data-opcion]').click();

    // El jugador se arrepiente y vuelve a tocar el otro origen: el paso 2
    // sigue interactivo (no se deshabilitó al elegir) y los pasos 3/4 no
    // desaparecen. Cada click re-pinta todo el árbol (mismo patrón que el
    // resto de las pantallas), así que hay que volver a buscar los nodos
    // después de cada click en vez de guardar la referencia vieja.
    const idOriginal = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')][0].dataset.opcion;
    const idOtra = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')][1].dataset.opcion;
    cont.querySelectorAll('[data-paso="2"] [data-opcion]')[1].click();

    expect(cont.querySelector('[data-paso="3"]')).toBeTruthy();
    expect(cont.querySelector('[data-paso="4"]')).toBeTruthy();
    const otraOpcionDeNuevo = cont.querySelector(`[data-paso="2"] [data-opcion="${idOtra}"]`);
    const primeraDeNuevo = cont.querySelector(`[data-paso="2"] [data-opcion="${idOriginal}"]`);
    expect(otraOpcionDeNuevo.classList.contains('tarjeta-elegida')).toBe(true);
    expect(primeraDeNuevo.classList.contains('tarjeta-elegida')).toBe(false);
  });
});

describe('renderCreacion — el resultado', () => {
  it('entrega un peleador válido al completar los 4 pasos', () => {
    const { obtenerRecibido } = irAPaso1();
    completarHastaEstilo('Ortiz');
    cont.querySelector('[data-accion="comenzar"]').click();

    const recibido = obtenerRecibido();
    expect(recibido).toBeTruthy();
    expect(recibido.apellido).toBe('Ortiz');
    expect(recibido.nombre).toBe('Ortiz');
    expect(recibido.apodo).toBeTruthy();
    expect(recibido.origen).toBeTruthy();
    expect(recibido.estilo).toBeTruthy();
    expect(recibido.entrenador).toBeTruthy();
    expect(recibido.esJugador).toBe(true);
    expect(recibido.edad).toBe(15);
    expect(mediaDe(recibido)).toBeGreaterThan(0);
  });

  it('recorta espacios del apellido', () => {
    const { obtenerRecibido } = irAPaso1();
    completarHastaEstilo('  Vera  ');
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(obtenerRecibido().apellido).toBe('Vera');
  });
});
