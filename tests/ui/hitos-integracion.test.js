// Verificación de punta a punta del cableado de hitos (Sistema 4, feedback
// del usuario: "faltan popups cuando pasen cosas importantes [...] cuando se
// avanza de categoría"). Mismo criterio que main-shell.test.js: para llegar
// de forma determinista al momento exacto que hace falta, se arma la
// partida a nivel de núcleo (en vez de jugar bloques y bloques esperando que
// "toque" solo) y se guarda como si fuera una partida real cargada.
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { guardar } from '../../src/core/save.js';
import { CLAVE_ACCESO } from '../../src/ui/screens/login.js';
import { iniciar } from '../../src/main.js';

function crearStorageFalso() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: (clave) => { datos.delete(clave); },
  };
}

function nuevoJugador() {
  return crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
}

// Partida a UN paso de cruzar de "juvenil" (3 bloques) a "amateur": con
// `bloque` ya por encima de `etapa.bloques` y la cola vacía, el próximo
// `siguienteBeat` (disparado por "Continuar") va a disparar la transición de
// etapa — ver el bloque `if (nueva.bloque > etapa.bloques)` en
// siguienteBeat, career.js.
function partidaAlBordeDeEtapa(semilla) {
  const partida = crearPartida({ jugador: nuevoJugador(), semilla });
  return { ...partida, etapaIndice: 0, bloque: 4 };
}

function prepararStorage(partida) {
  const storage = crearStorageFalso();
  storage.setItem(CLAVE_ACCESO, '1');
  guardar(partida, storage);
  return storage;
}

let cont;
let matchMediaOriginal;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
  document.body.innerHTML = '';
});

describe('Sistema 4: popup de "pasar de etapa" cableado de punta a punta', () => {
  // Pedido 3 (v7): `iniciar()` sobre una partida guardada ya no pasa por una
  // pantalla intermedia con un botón "Continuar" — retomarla (arrancar() ->
  // siguiente()) ya dispara el cruce de etapa apenas se carga, así que el
  // popup de hito aparece derecho, sin ningún click previo.
  it('al cruzar de juvenil a amateur, aparece un popup con el nombre de la nueva etapa', () => {
    iniciar(cont, prepararStorage(partidaAlBordeDeEtapa(1)));

    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    expect(document.body.textContent).toContain('Amateur');

    // El tablero sigue montado y visible detrás (mismo criterio que la
    // tienda): el popup no reemplazó nada, solo se sumó encima.
    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-izquierda')).toBeTruthy();
    expect(cont.querySelector('.shell-derecha')).toBeTruthy();

    // Se puede cerrar con la X y el juego sigue: el beat real (la mejora de
    // la nueva etapa) queda debajo, listo para jugarse.
    document.querySelector('.popup-cerrar').click();
    expect(document.querySelector('.popup-overlay')).toBeNull();
    expect(cont.querySelector('.shell')).toBeTruthy();
  });

  it('retomar una partida normal (sin cruzar de etapa) no abre ningun popup de hito', () => {
    const partida = crearPartida({ jugador: nuevoJugador(), semilla: 1 });
    iniciar(cont, prepararStorage(partida));

    expect(document.querySelector('.popup-overlay')).toBeNull();
  });
});
