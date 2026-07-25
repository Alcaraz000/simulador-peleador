// Verificación de punta a punta del cableado de main.js pedido en la Task
// 3.2: los beats mejora/evento/redes/sparring se montan en la región central
// del shell con los tres paneles laterales dibujados, y ya no hay pantalla de
// resultado (se reemplaza por el desenlace dentro de la misma región).
//
// Para llegar de forma determinista a cada tipo de beat sin depender de una
// semilla particular "que dé la casualidad", se hace avanzar la carrera a
// nivel de núcleo (siguienteBeat) hasta que el próximo beat de la cola sea el
// buscado, y esa partida (todavía CON ese beat pendiente) se guarda en un
// storage falso: iniciar() la carga igual que cargaría cualquier partida
// guardada de verdad.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../../src/core/career.js';
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

function nuevaPartida(semilla) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

// Devuelve la partida en el estado JUSTO ANTES de que `siguienteBeat` sirva
// un beat de tipo `tipoObjetivo` (con ese beat todavía a la cabeza de la
// cola), para que al cargarla y jugar "Continuar" aparezca ese mismo beat.
function avanzarHasta(partidaInicial, tipoObjetivo, maxBloques = 500) {
  let partida = partidaInicial;
  for (let i = 0; i < maxBloques; i += 1) {
    if (partida.terminada) break;
    const paso = siguienteBeat(partida);
    if (paso.beat && paso.beat.tipo === tipoObjetivo) return partida;
    partida = paso.partida;
  }
  throw new Error(`no aparecio un beat "${tipoObjetivo}" en ${maxBloques} bloques (semilla de prueba a revisar)`);
}

function prepararPartidaGuardada(tipo, semilla = 1) {
  const storage = crearStorageFalso();
  // El login es solo un portón de acceso (ver login.js), no autenticación
  // real: marcarlo como ya pasado deja probar el tablero directamente, igual
  // que haría un jugador que ya inició sesión antes.
  storage.setItem(CLAVE_ACCESO, '1');
  const partida = avanzarHasta(nuevaPartida(semilla), tipo);
  guardar(partida, storage);
  return storage;
}

let cont;
let matchMediaOriginal;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
  matchMediaOriginal = window.matchMedia;
  // prefers-reduced-motion activado a propósito: así el roll y la animación
  // de atributos resuelven en el acto y el test no depende de temporizadores
  // reales encadenados.
  window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
});

function continuar() {
  const boton = cont.querySelector('[data-accion="siguiente"]');
  expect(boton).toBeTruthy();
  boton.click();
}

describe('main.js: mejora/evento/redes/sparring viven en el shell (Task 3.2)', () => {
  it('mejora: el shell se monta con los 3 paneles y 3 tarjetas; elegir anima y muestra el desenlace en el centro', () => {
    iniciar(cont, prepararPartidaGuardada('mejora'));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-derecha')).toBeTruthy();

    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta');
    expect(tarjetas).toHaveLength(3);

    tarjetas[0].click();
    vi.runAllTimers();

    // no hay pantalla de resultado: el desenlace vive en la MISMA región
    // central del MISMO shell, no se navegó a otra pantalla.
    expect(cont.querySelector('.shell')).toBeTruthy();
    const seguir = cont.querySelector('.panel-decision-desenlace .boton');
    expect(seguir).toBeTruthy();

    seguir.click();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('evento sin azar: aplica directo y muestra el desenlace, sin navegar a otra pantalla', () => {
    // semilla 1 -> carta "cancelacion", ninguna opcion tiene probabilidades
    // (verificado aparte con el catalogo real): ejercita el camino sin roll.
    iniciar(cont, prepararPartidaGuardada('evento', 1));
    continuar();

    const grilla = cont.querySelector('.panel-decision-grilla');
    expect(grilla).toBeTruthy();
    const tarjetas = [...grilla.querySelectorAll('.tarjeta')];
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);

    tarjetas[0].click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    const seguir = cont.querySelector('.panel-decision-desenlace .boton');
    expect(seguir).toBeTruthy();
    seguir.click();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('evento con azar: la opcion elegida corre el roll (queda iluminado el desenlace ganador) y despues aplica y anima', () => {
    // semilla 10 -> carta "entrenador", la primera opcion ("cambiar") SI
    // tiene probabilidades (verificado aparte): ejercita el camino con roll.
    iniciar(cont, prepararPartidaGuardada('evento', 10));
    continuar();

    const grilla = cont.querySelector('.panel-decision-grilla');
    const tarjetaAzar = grilla.querySelector('[data-opcion="cambiar"]');
    expect(tarjetaAzar).toBeTruthy();
    expect(tarjetaAzar.querySelectorAll('.tarjeta-efecto').length).toBe(2);

    tarjetaAzar.click();
    vi.runAllTimers();

    // con prefers-reduced-motion el roll resuelve directo, pero de todos
    // modos deja fijo el resultado ganador iluminado en la propia tarjeta.
    const iluminados = tarjetaAzar.querySelectorAll('.tarjeta-efecto.iluminado');
    expect(iluminados).toHaveLength(1);

    expect(cont.querySelector('.shell')).toBeTruthy();
    const seguir = cont.querySelector('.panel-decision-desenlace .boton');
    expect(seguir).toBeTruthy();
    // el texto del desenlace tiene que ser una de las dos crónicas posibles
    // de esa rama de azar, no el genérico "Listo."
    expect(cont.querySelector('.panel-decision-desenlace').textContent).toMatch(/aprendés cosas nuevas|No enganchaste con el método/);

    seguir.click();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('redes: se monta en el shell con 3 tarjetas y resolver una opcion no navega a otra pantalla', () => {
    iniciar(cont, prepararPartidaGuardada('redes'));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta');
    expect(tarjetas).toHaveLength(3);

    tarjetas[2].click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.panel-decision-desenlace .boton')).toBeTruthy();
  });

  it('sparring: se monta en el shell (grilla de paos) y terminar el drill lleva al desenlace, sin pantalla aparte', () => {
    iniciar(cont, prepararPartidaGuardada('sparring'));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.grilla-paos')).toBeTruthy();

    let guardia = 0;
    while (!cont.querySelector('[data-accion="terminar"]') && guardia < 100) {
      const empezar = cont.querySelector('[data-accion="empezar"]');
      if (empezar) { empezar.click(); guardia += 1; continue; }
      const activo = cont.querySelector('.pao.activo');
      if (!activo) break;
      activo.click();
      guardia += 1;
    }

    const terminar = cont.querySelector('[data-accion="terminar"]');
    expect(terminar).toBeTruthy();
    terminar.click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    const seguir = cont.querySelector('.panel-decision-desenlace .boton');
    expect(seguir).toBeTruthy();
    seguir.click();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('ir a la ficha desde dentro de una decision descarta el shell, y volver lo reconstruye sin perder el beat pendiente', () => {
    iniciar(cont, prepararPartidaGuardada('mejora'));
    continuar();

    expect(cont.querySelectorAll('.panel-decision-grilla .tarjeta')).toHaveLength(3);

    cont.querySelector('[data-accion="ficha"]').click();
    expect(cont.querySelector('.shell')).toBeNull();

    cont.querySelector('[data-accion="cerrar"]').click();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelectorAll('.panel-decision-grilla .tarjeta')).toHaveLength(3);
  });
});
