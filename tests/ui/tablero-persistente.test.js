// Task 6.1: el tablero (shell de 3 columnas) tiene que ser LA pantalla
// principal, siempre — nunca renderDashboard (v1) entre beats. Estos tests
// juegan la carrera por la UI REAL (happy-dom: mount/click de verdad), no a
// nivel núcleo, y verifican la garantía central por IDENTIDAD DE NODO de las
// regiones laterales (`.shell-izquierda`/`.shell-derecha`), no por presencia
// de un selector — un shell RECREADO también tendría esas clases.
//
// Excepción ya decidida (no se re-discute acá): la pelea y su previa
// (oferta/negociación/careo/plan) y la ficha del peleador siguen siendo
// pantallas completas que reemplazan `contenedor` — igual que la creación del
// peleador y el fin de carrera. El tablero se RECONSTRUYE al volver de ahí
// (mismo comportamiento, no la misma referencia de nodo); lo que no puede
// pasar nunca es que "entre beats" aparezca renderDashboard.
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { guardar } from '../../src/core/save.js';
import { CLAVE_GUARDADO } from '../../src/core/save.js';
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

function prepararStorage(partida) {
  const storage = crearStorageFalso();
  storage.setItem(CLAVE_ACCESO, '1');
  guardar(partida, storage);
  return storage;
}

// --- El "autoplayer" de la UI real ----------------------------------------
// Resuelve UN turno completo: si hay boton de Continuar (estado ocioso), lo
// clickea y ACTO SEGUIDO resuelve lo que haya resultado de eso — nunca
// devuelve 'idle' a ciegas justo después de clickear, porque ese click puede
// haber disparado cualquier cosa (una decisión, sparring, un aviso, o una
// oferta de pelea a pantalla completa). Devuelve una etiqueta de qué pasó,
// para que el test sepa cuándo el shell se reconstruye a propósito (una
// oferta, pantalla completa) y cuándo tiene que seguir siendo el mismo nodo.
function resolverUnPaso(cont, { aceptarOfertas }) {
  const botonIdle = cont.querySelector('.shell-centro [data-accion="siguiente"]');
  if (botonIdle) botonIdle.click();

  // El último "Continuar" de la carrera no sirve un beat más: va directo al
  // legado (pantalla completa, fin de carrera — decisión ya tomada, no se
  // toca en esta task). El llamador corta el loop al ver esto.
  if (cont.querySelector('[data-accion="nueva"]')) return 'legado';

  if (cont.querySelector('.grilla-paos')) {
    let guardia = 0;
    while (!cont.querySelector('[data-accion="terminar"]') && guardia < 300) {
      guardia += 1;
      const empezar = cont.querySelector('[data-accion="empezar"]');
      if (empezar) { empezar.click(); continue; }
      const activo = cont.querySelector('.pao.activo');
      if (!activo) break;
      activo.click();
    }
    const terminar = cont.querySelector('[data-accion="terminar"]');
    if (terminar) terminar.click();
    const seguirDesenlace = cont.querySelector('.panel-decision-desenlace .boton');
    if (seguirDesenlace) seguirDesenlace.click();
    return 'sparring';
  }

  const tarjetaDecision = cont.querySelector('.panel-decision-grilla .tarjeta');
  if (tarjetaDecision) {
    tarjetaDecision.click();
    vi.runAllTimers();
    const seguirDesenlace = cont.querySelector('.panel-decision-desenlace .boton');
    if (seguirDesenlace) seguirDesenlace.click();
    return 'decision';
  }

  // Aviso sin tarjeta previa (noticias / lesionSinOferta, Task 6.1): el
  // desenlace se pinta directo, sin pasar por una grilla.
  const avisoDirecto = cont.querySelector('.panel-decision-desenlace .boton');
  if (avisoDirecto) { avisoDirecto.click(); return 'aviso'; }

  const aceptar = cont.querySelector('[data-accion="aceptar"]');
  const rechazar = cont.querySelector('[data-accion="rechazar"]');
  if (aceptar || rechazar) {
    if (aceptarOfertas) {
      aceptar.click();
      jugarPeleaCompleta(cont);
      return 'pelea';
    }
    rechazar.click();
    const continuar = cont.querySelector('[data-accion="continuar"]');
    if (continuar) continuar.click();
    return 'oferta-rechazada';
  }

  // Se clickeó Continuar y no matcheó ninguno de los casos de arriba: no
  // debería pasar en el flujo normal (siguienteBeat siempre sirve algo o
  // termina la carrera, cubierto por el llamador), pero de ocurrir es un
  // estado no reconocido — nunca un 'idle' silencioso que tape el problema.
  return null;
}

// Juega la previa (negociación + careo opcional + plan) y la pelea entera
// hasta volver al tablero. 'cerrar' en la negociación es SIEMPRE 0% riesgo
// (negotiation.js) así que un solo click alcanza. El careo (3 rondas fijas)
// solo aparece en pelea de título o con fama >= 20 — con el jugador recién
// creado casi nunca, pero el loop lo maneja igual si aparece.
function jugarPeleaCompleta(cont) {
  const cerrar = cont.querySelector('[data-movida="cerrar"]');
  if (cerrar) cerrar.click();
  const seguirNegociacion = cont.querySelector('[data-accion="seguir"]');
  if (seguirNegociacion) seguirNegociacion.click();

  let guardia = 0;
  while (cont.querySelector('[data-tono]') && guardia < 10) {
    guardia += 1;
    cont.querySelector('[data-tono]').click();
  }
  const terminarCareo = cont.querySelector('[data-accion="terminar"]');
  if (terminarCareo) terminarCareo.click();

  const plan = cont.querySelector('.panel-decision-grilla .tarjeta[data-plan]');
  if (plan) plan.click();

  guardia = 0;
  while (!cont.querySelector('[data-accion="fin"]') && guardia < 60) {
    guardia += 1;
    const accionNodo = cont.querySelector('[data-bloque="accion"]');
    if (!accionNodo) break;

    const seguirRound = accionNodo.querySelector('[data-accion="seguir"]');
    if (seguirRound) { seguirRound.click(); continue; }

    const instruccion = accionNodo.querySelector('.tarjeta[data-instruccion]');
    if (instruccion) { instruccion.click(); continue; }

    const zona = accionNodo.querySelector('.silueta-zona');
    if (zona) {
      zona.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const pista = accionNodo.querySelector('.barra-precision-pista');
      if (pista) pista.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      continue;
    }
    break;
  }
  const fin = cont.querySelector('[data-accion="fin"]');
  if (fin) fin.click();

  const continuarResultado = cont.querySelector('[data-accion="continuar"]');
  if (continuarResultado) continuarResultado.click();
}

let cont;
let matchMediaOriginal;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
  matchMediaOriginal = window.matchMedia;
  // prefers-reduced-motion activado: la narración de la pelea, el roll de
  // azar y la barra de precisión resuelven en el acto, sin depender de
  // temporizadores reales encadenados durante una carrera larga.
  window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
});

describe('el tablero es la pantalla principal siempre (Task 6.1)', () => {
  it('al cargar una carrera en curso, la primera pantalla YA es el tablero (no renderDashboard)', () => {
    iniciar(cont, prepararStorage(nuevaPartida(1)));

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-izquierda')).toBeTruthy();
    expect(cont.querySelector('.shell-derecha')).toBeTruthy();
    // El botón de avanzar la carrera y la etapa actual viven en el CENTRO
    // del shell, no en una pantalla aparte.
    const boton = cont.querySelector('.shell-centro [data-accion="siguiente"]');
    expect(boton).toBeTruthy();
    expect(boton.textContent).toContain('Continuar');
    expect(cont.querySelector('.shell-centro').textContent.toUpperCase()).toContain('JUVENIL');
  });

  it('durante una racha de beats el shell NUNCA se recrea (identidad de nodo); tras una oferta se reconstruye limpio', () => {
    iniciar(cont, prepararStorage(nuevaPartida(3)));

    let refIzquierda = cont.querySelector('.shell-izquierda');
    let refDerecha = cont.querySelector('.shell-derecha');
    expect(refIzquierda).toBeTruthy();
    expect(refDerecha).toBeTruthy();

    let huboOferta = false;
    for (let i = 0; i < 25; i += 1) {
      const tipo = resolverUnPaso(cont, { aceptarOfertas: false });
      expect(tipo).not.toBeNull();

      if (tipo === 'oferta-rechazada') {
        huboOferta = true;
        // Categoría "pantalla completa" (misma decisión que la ficha/pelea):
        // se vuelve a un tablero funcionando, pero NO se exige la misma
        // referencia de nodo — se abre un nuevo tramo a chequear desde acá.
        expect(cont.querySelector('.shell')).toBeTruthy();
        refIzquierda = cont.querySelector('.shell-izquierda');
        refDerecha = cont.querySelector('.shell-derecha');
        continue;
      }

      // idle / decision / sparring / aviso: SIEMPRE el mismo shell.
      expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
      expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    }
    // No es un requisito del test que aparezca una oferta (depende de la
    // semilla), pero si aparece, el chequeo de arriba la cubre.
    expect(typeof huboOferta).toBe('boolean');
  });

  it('abrir la ficha desde el estado ocioso y volver reconstruye el tablero (con el boton Continuar), no queda en blanco', () => {
    iniciar(cont, prepararStorage(nuevaPartida(2)));

    expect(cont.querySelector('.shell-centro [data-accion="siguiente"]')).toBeTruthy();

    cont.querySelector('[data-accion="ficha"]').click();
    expect(cont.querySelector('.shell')).toBeNull();
    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();

    cont.querySelector('[data-accion="cerrar"]').click();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-centro [data-accion="siguiente"]')).toBeTruthy();
  });

  it('una carrera completa jugada por la UI real (aceptando las peleas) llega al legado sin excepciones', () => {
    for (const semilla of [11, 22]) {
      document.body.innerHTML = '<div id="app"></div>';
      cont = document.getElementById('app');
      iniciar(cont, prepararStorage(nuevaPartida(semilla)));

      let guardia = 0;
      while (!cont.querySelector('[data-accion="nueva"]') && guardia < 400) {
        guardia += 1;
        const tipo = resolverUnPaso(cont, { aceptarOfertas: true });
        expect(tipo).not.toBeNull();
      }

      expect(cont.querySelector('[data-accion="nueva"]')).toBeTruthy();
    }
  });

  it('una partida v1 guardada (sin semanaGlobal/apellido/entrenador) no rompe: arranca una carrera nueva', () => {
    const storage = crearStorageFalso();
    storage.setItem(CLAVE_ACCESO, '1');
    const partidaV1 = {
      version: 1,
      semilla: 5,
      rngEstado: { s0: 1, s1: 2, s2: 3, s3: 4 },
      jugador: {
        nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR',
        disciplina: 'boxeo', estilo: 'tecnico', categoria: 'pluma',
      },
      mundo: { roster: [], anio: 2024 },
      rivalidades: [], noticias: [], etapaIndice: 0, bloque: 1, bloqueGlobal: 1,
      cola: [], beatActual: null, historialBeats: 0, terminada: false, legado: null,
    };
    storage.setItem(CLAVE_GUARDADO, JSON.stringify(partidaV1));

    expect(() => iniciar(cont, storage)).not.toThrow();

    // Arranca una carrera nueva (pantalla de creación, paso 1), no una
    // pantalla en blanco ni el tablero con datos rotos.
    expect(cont.querySelector('[data-paso="1"]')).toBeTruthy();
    expect(cont.querySelector('.shell')).toBeNull();
    // El guardado incompatible ya se limpió (mismo camino que uno corrupto).
    expect(storage.getItem(CLAVE_GUARDADO)).toBeNull();
  });
});
