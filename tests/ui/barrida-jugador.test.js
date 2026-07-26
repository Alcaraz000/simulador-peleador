// Task 6.3 (v2): barrida final "con ojo de jugador". Juega carreras enteras
// por la UI real (happy-dom: login -> creación -> tablero -> pipeline de
// pelea -> legado), incluida la creación de personaje completa por sus 4
// pasos (algo que tests/ui/tablero-persistente.test.js no cubre: ahí las
// carreras arrancan de una partida ya armada a mano).
//
// Qué se vigila en cada paso, no solo al final:
//   - console.error / console.warn: cualquier excepción atrapada por un
//     handler o un warning silencioso cuenta como bug.
//   - marcadores de plantilla sin reemplazar ("{clave}") visibles en pantalla.
//   - "NaN" / "undefined" / "null" / "[object Object]" visibles en pantalla
//     (números mal formateados o estados imposibles).
//   - toda excepción sin atrapar durante el autoplay (guardia contra pantallas
//     colgadas: si nada matchea, el helper devuelve null y el test falla ahí,
//     no en un timeout silencioso).
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { iniciar } from '../../src/main.js';
import { CLAVE_ACCESO } from '../../src/ui/screens/login.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { guardar } from '../../src/core/save.js';

function crearStorageFalso() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: (clave) => { datos.delete(clave); },
  };
}

function storageConAcceso() {
  const storage = crearStorageFalso();
  storage.setItem(CLAVE_ACCESO, '1');
  return storage;
}

// --- Detección de anomalías -------------------------------------------
const anomalias = [];

function revisarTexto(cont, etiqueta) {
  const texto = cont.textContent;
  const marcador = texto.match(/\{[a-zA-Z_]+\}/);
  if (marcador) anomalias.push(`[${etiqueta}] marcador sin reemplazar: "${marcador[0]}" en: ${texto.slice(Math.max(0, marcador.index - 40), marcador.index + 40)}`);
  if (/\bNaN\b/.test(texto)) anomalias.push(`[${etiqueta}] "NaN" visible en pantalla`);
  if (/\bundefined\b/.test(texto)) anomalias.push(`[${etiqueta}] "undefined" visible en pantalla`);
  // 'null' aparece legítimamente en jugador.apodo === null internamente, pero
  // NUNCA debería llegar a textContent (la UI siempre cae a otro valor).
  if (/\bnull\b/.test(texto)) anomalias.push(`[${etiqueta}] "null" visible en pantalla`);
  if (/\[object Object\]/.test(texto)) anomalias.push(`[${etiqueta}] "[object Object]" visible en pantalla`);
}

function revisarEdad(cont, etiqueta) {
  const match = cont.textContent.match(/(\d+)\s*años/);
  if (match) {
    const edad = Number(match[1]);
    if (edad < 15 || edad > 42) anomalias.push(`[${etiqueta}] edad fuera de rango esperado (15-42): ${edad}`);
  }
}

function revisarRanking(cont, etiqueta) {
  const idx = cont.textContent.indexOf('Ranking');
  if (idx === -1) return;
  const alrededor = cont.textContent.slice(idx, idx + 30);
  const match = alrededor.match(/#(\d+)/);
  if (match) {
    const ranking = Number(match[1]);
    if (ranking < 1 || ranking > 30) anomalias.push(`[${etiqueta}] ranking implausible: #${ranking}`);
  }
}

function revisarTodo(cont, etiqueta) {
  revisarTexto(cont, etiqueta);
  revisarEdad(cont, etiqueta);
  revisarRanking(cont, etiqueta);
}

// --- Autoplayer de la UI real (mismo patrón que tests/ui/tablero-persistente,
// copiado acá porque ese helper no se exporta) ---------------------------
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

function resolverUnPaso(cont, { aceptarOfertas }) {
  const botonIdle = cont.querySelector('.shell-centro [data-accion="siguiente"]');
  if (botonIdle) botonIdle.click();

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

  // Con exactamente 2 opciones, la decisión usa `.panel-decision-grilla-2`
  // en vez de la de 3 columnas de siempre (fix v3: no dejar una tercera
  // columna vacía) — hay que buscar en ambas.
  const tarjetaDecision = cont.querySelector('.panel-decision-grilla .tarjeta, .panel-decision-grilla-2 .tarjeta');
  if (tarjetaDecision) {
    tarjetaDecision.click();
    vi.runAllTimers();
    const seguirDesenlace = cont.querySelector('.panel-decision-desenlace .boton');
    if (seguirDesenlace) seguirDesenlace.click();
    return 'decision';
  }

  const avisoDirecto = cont.querySelector('.panel-decision-desenlace .boton');
  if (avisoDirecto) { avisoDirecto.click(); return 'aviso'; }

  const aceptar = cont.querySelector('.shell-centro [data-accion="aceptar"]');
  const rechazar = cont.querySelector('.shell-centro [data-accion="rechazar"]');
  if (aceptar || rechazar) {
    if (aceptarOfertas) {
      aceptar.click();
      jugarPeleaCompleta(cont);
      return 'pelea';
    }
    rechazar.click();
    const seguirDesenlace = cont.querySelector('.panel-decision-desenlace .boton');
    if (seguirDesenlace) seguirDesenlace.click();
    return 'oferta-rechazada';
  }

  return null;
}

function crearPersonajePorUI(cont, { apellido = 'Pruebas', estiloPreferido = null } = {}) {
  const campoApellido = cont.querySelector('[data-campo="apellido"]');
  campoApellido.value = apellido;
  campoApellido.dispatchEvent(new Event('input'));
  cont.querySelector('[data-accion="siguiente"]').click();
  revisarTodo(cont, 'creacion-paso2');

  cont.querySelector('[data-paso="2"] .tarjeta').click();
  revisarTodo(cont, 'creacion-paso3');

  cont.querySelector('[data-paso="3"] .tarjeta').click();
  revisarTodo(cont, 'creacion-paso4');

  const tarjetasEstilo = [...cont.querySelectorAll('[data-paso="4"] .tarjeta')];
  const elegida = (estiloPreferido && tarjetasEstilo.find((t) => t.dataset.opcion === estiloPreferido)) ?? tarjetasEstilo[0];
  elegida.click();
  revisarTodo(cont, 'creacion-estilo-elegido');

  cont.querySelector('[data-accion="comenzar"]').click();
}

function jugarCarreraCompletaPorUI(cont, { semilla, estiloPreferido, aceptarOfertas = true, rechazarUnaDeCada = 0 }) {
  const dateNowOriginal = Date.now;
  Date.now = () => semilla;
  try {
    iniciar(cont, storageConAcceso());
    expect(cont.querySelector('[data-paso="1"]')).toBeTruthy();
    crearPersonajePorUI(cont, { estiloPreferido });
    expect(cont.querySelector('.shell')).toBeTruthy();
    revisarTodo(cont, `tablero-inicial-${semilla}`);

    let guardia = 0;
    let ofertasVistas = 0;
    while (!cont.querySelector('[data-accion="nueva"]') && guardia < 400) {
      guardia += 1;
      let aceptar = aceptarOfertas;
      if (rechazarUnaDeCada > 0 && cont.querySelector('.shell-centro [data-accion="aceptar"]')) {
        ofertasVistas += 1;
        if (ofertasVistas % rechazarUnaDeCada === 0) aceptar = false;
      }
      const tipo = resolverUnPaso(cont, { aceptarOfertas: aceptar });
      if (tipo === null) {
        anomalias.push(`[carrera-${semilla}] resolverUnPaso no reconoció el estado en el paso ${guardia} (posible pantalla colgada). HTML: ${cont.innerHTML.slice(0, 500)}`);
        break;
      }
      revisarTodo(cont, `carrera-${semilla}-paso${guardia}`);
    }
    expect(cont.querySelector('[data-accion="nueva"]')).toBeTruthy();
    revisarTodo(cont, `legado-${semilla}`);
  } finally {
    Date.now = dateNowOriginal;
  }
}

let cont;
let matchMediaOriginal;
let erroresConsola;
let avisosConsola;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
  erroresConsola = [];
  avisosConsola = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => { erroresConsola.push(args); });
  vi.spyOn(console, 'warn').mockImplementation((...args) => { avisosConsola.push(args); });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
  vi.restoreAllMocks();
});

describe('barrida final: varias carreras completas por la UI real (Task 6.3)', () => {
  it('carrera con estilo normal (técnico), aceptando todas las ofertas, sin errores ni marcadores rotos', () => {
    jugarCarreraCompletaPorUI(cont, { semilla: 1001, estiloPreferido: 'tecnico', aceptarOfertas: true });
    expect(erroresConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });

  it('carrera con el estilo legendario (contragolpeador), a propósito, sin que romper nada por ser el camino "de lujo"', () => {
    document.body.innerHTML = '<div id="app"></div>';
    cont = document.getElementById('app');
    jugarCarreraCompletaPorUI(cont, { semilla: 1002, estiloPreferido: 'contragolpeador', aceptarOfertas: true });
    expect(erroresConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });

  it('carrera rechazando una oferta de cada tres (mezcla aceptar/rechazar, no solo el camino feliz)', () => {
    document.body.innerHTML = '<div id="app"></div>';
    cont = document.getElementById('app');
    jugarCarreraCompletaPorUI(cont, {
      semilla: 1003, estiloPreferido: 'noqueador', aceptarOfertas: true, rechazarUnaDeCada: 3,
    });
    expect(erroresConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });

  it('carrera con estilo mentón de hierro, visita la ficha y la tienda a mitad de camino, revisa estadísticas al final', () => {
    document.body.innerHTML = '<div id="app"></div>';
    cont = document.getElementById('app');
    const dateNowOriginal = Date.now;
    Date.now = () => 1004;
    try {
      iniciar(cont, storageConAcceso());
      crearPersonajePorUI(cont, { estiloPreferido: 'menton' });

      // Visita la ficha desde el estado ocioso y vuelve.
      const botonFicha = cont.querySelector('[data-accion="ficha"]');
      if (botonFicha) {
        botonFicha.click();
        revisarTodo(cont, 'ficha');
        cont.querySelector('[data-accion="cerrar"]').click();
      }

      // Abre la tienda (popup) y la cierra sin comprar nada (fondos casi
      // siempre insuficientes al arranque; alcanza con que abra/cierre limpio).
      const botonTienda = cont.querySelector('[data-accion="tienda"]');
      if (botonTienda) {
        botonTienda.click();
        revisarTodo(cont, 'tienda');
        const cerrarPopup = cont.querySelector('.popup-cerrar');
        if (cerrarPopup) cerrarPopup.click();
      }

      let guardia = 0;
      while (!cont.querySelector('[data-accion="nueva"]') && guardia < 400) {
        guardia += 1;
        const tipo = resolverUnPaso(cont, { aceptarOfertas: true });
        if (tipo === null) {
          anomalias.push(`[carrera-1004] resolverUnPaso no reconoció el estado en el paso ${guardia}`);
          break;
        }
        revisarTodo(cont, `carrera-1004-paso${guardia}`);
      }
      expect(cont.querySelector('[data-accion="nueva"]')).toBeTruthy();

      // Fin de carrera: ver estadísticas y volver.
      const botonEstadisticas = cont.querySelector('[data-accion="estadisticas"]');
      if (botonEstadisticas) {
        botonEstadisticas.click();
        revisarTodo(cont, 'estadisticas');
        const volver = cont.querySelector('[data-accion="cerrar"]');
        if (volver) volver.click();
      }
    } finally {
      Date.now = dateNowOriginal;
    }
    expect(erroresConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });

  it('el login real (usuario/contraseña incorrectos y luego correctos) no rompe nada antes de entrar a jugar', () => {
    document.body.innerHTML = '<div id="app"></div>';
    cont = document.getElementById('app');
    const storage = crearStorageFalso(); // sin acceso guardado: fuerza la pantalla real
    iniciar(cont, storage);

    expect(cont.querySelector('[data-accion="entrar"]')).toBeTruthy();

    // Intento fallido primero.
    cont.querySelector('[data-campo="usuario"]').value = 'quien-sea';
    cont.querySelector('[data-campo="clave"]').value = 'mal';
    cont.querySelector('[data-accion="entrar"]').click();
    expect(cont.querySelector('[data-error]').textContent).toContain('incorrectos');
    revisarTodo(cont, 'login-fallido');

    // Ahora sí, credenciales correctas.
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    cont.querySelector('[data-accion="entrar"]').click();

    expect(cont.querySelector('[data-paso="1"]')).toBeTruthy();
    expect(erroresConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });
});

// --- Barrida ancha: muchas semillas, camino rápido (arranca de una partida
// ya armada, sin repetir los 4 pasos de creación) para cubrir mucho más
// terreno de contenido — sobre todo cartas/eventos/rivalidades legendarios
// que solo salen por azar durante la carrera, no en la creación. Task 6.3
// pide "jugar varias carreras completas": esto además de los 5 casos de
// arriba (que sí cubren creación + login + tienda + ficha).
function nuevaPartidaBase(semilla) {
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

describe('barrida ancha: muchas semillas por la UI real, camino rápido (Task 6.3)', () => {
  const SEMILLAS = [101, 102, 103, 104];

  it(`${SEMILLAS.length} carreras completas de punta a punta, todas las ofertas aceptadas, sin errores ni marcadores rotos`, () => {
    for (const semilla of SEMILLAS) {
      document.body.innerHTML = '<div id="app"></div>';
      cont = document.getElementById('app');
      iniciar(cont, prepararStorage(nuevaPartidaBase(semilla)));
      revisarTodo(cont, `ancha-${semilla}-inicio`);

      let guardia = 0;
      while (!cont.querySelector('[data-accion="nueva"]') && guardia < 400) {
        guardia += 1;
        const tipo = resolverUnPaso(cont, { aceptarOfertas: true });
        if (tipo === null) {
          anomalias.push(`[ancha-${semilla}] resolverUnPaso no reconoció el estado en el paso ${guardia}. HTML: ${cont.innerHTML.slice(0, 500)}`);
          break;
        }
        revisarTodo(cont, `ancha-${semilla}-paso${guardia}`);
      }
      expect(cont.querySelector('[data-accion="nueva"]')).toBeTruthy();
    }
    expect(erroresConsola).toEqual([]);
    expect(avisosConsola).toEqual([]);
    expect(anomalias).toEqual([]);
  });
});
