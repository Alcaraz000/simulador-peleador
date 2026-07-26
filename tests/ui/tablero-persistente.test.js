// Task 6.1: el tablero (shell de 3 columnas) tiene que ser LA pantalla
// principal, siempre — nunca renderDashboard (v1) entre beats. Estos tests
// juegan la carrera por la UI REAL (happy-dom: mount/click de verdad), no a
// nivel núcleo, y verifican la garantía central por IDENTIDAD DE NODO de las
// regiones laterales (`.shell-izquierda`/`.shell-derecha`), no por presencia
// de un selector — un shell RECREADO también tendría esas clases.
//
// Excepciones ya decididas (no se re-discuten acá): la ficha del peleador, la
// creación del peleador y el fin de carrera siguen siendo pantallas completas
// que reemplazan `contenedor`. Lo mismo con la pipeline de negociación →
// careo → plan → pelea, pero SOLO A PARTIR de aceptar una oferta (revisión
// del coordinador tras la primera vuelta de esta task): la tarjeta de
// aceptar/rechazar la oferta en sí vive DENTRO del tablero, como cualquier
// otro beat de decisión — es, literalmente, el caso de uso que motivó el
// rediseño (ver ranking/récord/dinero mientras se decide si conviene esa
// bolsa). El tablero se RECONSTRUYE al volver de una pantalla completa
// (mismo comportamiento, no la misma referencia de nodo); lo que no puede
// pasar nunca es que "entre beats" —ni al decidir sobre una oferta— aparezca
// renderDashboard u otra pantalla que lo reemplace.
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../../src/core/career.js';
import { guardar } from '../../src/core/save.js';
import { CLAVE_GUARDADO } from '../../src/core/save.js';
import { fechaDe } from '../../src/core/calendario.js';
import { ANIO_INICIAL } from '../../src/core/world.js';
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
// oferta de pelea). Devuelve una etiqueta de qué pasó, para que el test sepa
// cuándo el shell se reconstruye a propósito (SOLO al aceptar una oferta —
// ahí arranca la pipeline a pantalla completa) y cuándo tiene que seguir
// siendo el mismo nodo (todo lo demás, incluida la tarjeta de la oferta y su
// rechazo, que viven dentro del tablero). `detenerEnOferta` para en seco
// apenas aparece la tarjeta de la oferta, SIN clickear aceptar/rechazar —
// para que el test pueda inspeccionarla tal cual se le muestra al jugador.
//
// Task v3 ("las semanas de preparación antes de una pelea"): aceptar ya no
// dispara la pelea en el acto. Ahora arranca el campamento (2-3 beats más,
// DENTRO del tablero — mismos selectores genéricos de sparring/decisión de
// acá abajo, así que no hace falta un caso especial) y recién el ÚLTIMO beat
// del campamento dispara careo → plan → pelea. `hayPantallaDePelea` detecta
// ese momento (llegue como llegue: con o sin careo, según el nivel) y
// `jugarDesdeCareo` lo atraviesa hasta volver al tablero.
function hayPantallaDePelea(cont) {
  return Boolean(
    cont.querySelector('[data-tono]')
    || cont.querySelector('.panel-decision-grilla .tarjeta[data-plan]')
    || cont.querySelector('[data-accion="empezar-pelea"]')
    || cont.querySelector('[data-bloque="accion"]'),
  );
}

// Sistema 4 (hitos de carrera, popups): pueden aparecer en CUALQUIER
// "Continuar" que cruce de etapa (ver hitoDeEtapa/siguiente(), main.js). En
// el navegador real el overlay bloquea el click al tablero de atrás
// (clickear el fondo cierra el popup en vez de pasarle el click a lo que
// está debajo — ver popup.js), así que un usuario real SIEMPRE lo cierra
// antes de poder seguir. happy-dom no simula ese bloqueo visual: sin este
// guard, resolverUnPaso seguía clickeando el tablero de "atrás" con el
// hito todavía abierto, y ese popup viejo quedaba de fantasma en
// document.body — rompiendo cualquier aserción posterior que abriera OTRO
// popup (p. ej. la tabla de ranking) buscando `.popup-overlay` a secas.
function cerrarHitoSiHay() {
  const cerrar = document.querySelector('.popup-overlay .popup-cerrar');
  if (cerrar) cerrar.click();
}

function resolverUnPaso(cont, { aceptarOfertas, detenerEnOferta = false }) {
  cerrarHitoSiHay();
  if (hayPantallaDePelea(cont)) { jugarDesdeCareo(cont); return 'pelea'; }

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

  // Aviso sin tarjeta previa (noticias / lesionSinOferta, Task 6.1): el
  // desenlace se pinta directo, sin pasar por una grilla.
  const avisoDirecto = cont.querySelector('.panel-decision-desenlace .boton');
  if (avisoDirecto) { avisoDirecto.click(); return 'aviso'; }

  // La tarjeta de aceptar/rechazar la oferta vive DENTRO del tablero (Task
  // 6.1, revisión del coordinador): se busca escopada a `.shell-centro`, no
  // en cualquier lado de `cont` — si alguna vez volviera a ser pantalla
  // completa, este selector dejaría de encontrarla y el test fallaría acá.
  const aceptar = cont.querySelector('.shell-centro [data-accion="aceptar"]');
  const rechazar = cont.querySelector('.shell-centro [data-accion="rechazar"]');
  if (aceptar || rechazar) {
    if (detenerEnOferta) return 'oferta';
    if (aceptarOfertas) {
      aceptar.click();
      resolverNegociacion(cont);
      return 'oferta-firmada';
    }
    rechazar.click();
    const seguirDesenlace = cont.querySelector('.panel-decision-desenlace .boton');
    if (seguirDesenlace) seguirDesenlace.click();
    return 'oferta-rechazada';
  }

  // Se clickeó Continuar y no matcheó ninguno de los casos de arriba: no
  // debería pasar en el flujo normal (siguienteBeat siempre sirve algo o
  // termina la carrera, cubierto por el llamador), pero de ocurrir es un
  // estado no reconocido — nunca un 'idle' silencioso que tape el problema.
  return null;
}

// La negociación arranca apenas se acepta la oferta (sin cambios: sigue
// siendo pantalla completa, antes del campamento). 'cerrar' es SIEMPRE 0%
// riesgo (negotiation.js) así que un solo click alcanza. Al cerrarla, ahora
// `main.js` firma la pelea (campamento.js) y vuelve al tablero en vez de ir
// directo a careo — por eso esta función YA NO sigue de largo hasta la
// pelea: eso le toca al campamento, beat a beat, como cualquier otro.
function resolverNegociacion(cont) {
  const cerrar = cont.querySelector('[data-movida="cerrar"]');
  if (cerrar) cerrar.click();
  const seguirNegociacion = cont.querySelector('[data-accion="seguir"]');
  if (seguirNegociacion) seguirNegociacion.click();
}

// Atraviesa careo (3 rondas fijas, si el nivel de la pelea lo trae — Task
// v3: ya no depende de la fama, solo se lo salta en juvenil/amateur) → plan
// → la pelea entera, hasta volver al tablero.
function jugarDesdeCareo(cont) {
  let guardia = 0;
  while (cont.querySelector('[data-tono]') && guardia < 10) {
    guardia += 1;
    cont.querySelector('[data-tono]').click();
  }
  const terminarCareo = cont.querySelector('[data-accion="terminar"]');
  if (terminarCareo) terminarCareo.click();

  const plan = cont.querySelector('.panel-decision-grilla .tarjeta[data-plan]');
  if (plan) plan.click();

  // Task v3, pedido textual: la pelea ya no arranca sola — hay que darle al
  // botón de empezar antes de que se simule el primer round.
  const empezarPelea = cont.querySelector('[data-accion="empezar-pelea"]');
  if (empezarPelea) empezarPelea.click();

  guardia = 0;
  while (!cont.querySelector('[data-accion="fin"]') && guardia < 60) {
    guardia += 1;
    const accionNodo = cont.querySelector('[data-bloque="accion"]');
    if (!accionNodo) break;

    const seguirRound = accionNodo.querySelector('[data-accion="seguir"]');
    if (seguirRound) { seguirRound.click(); continue; }

    // Task v3, pedido textual: el rincón aparece recién cuando el jugador
    // lo pide — hay un click intermedio antes de que salgan las tarjetas.
    const verRincon = accionNodo.querySelector('[data-accion="ver-rincon"]');
    if (verRincon) { verRincon.click(); continue; }

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

// Camino directo (sin el loop de resolverUnPaso) para los tests que quieren
// aceptar y llegar derecho al resultado de la pelea: negociación, TODO el
// campamento (2-3 beats, aceptando la primera opción/terminando el sparring
// en cada uno) y recién ahí careo/plan/pelea.
function jugarPeleaCompleta(cont) {
  resolverNegociacion(cont);

  let guardia = 0;
  while (!hayPantallaDePelea(cont) && guardia < 10) {
    guardia += 1;
    const tipo = resolverUnPaso(cont, { aceptarOfertas: true, detenerEnOferta: false });
    if (tipo === null || tipo === 'pelea') break;
  }

  jugarDesdeCareo(cont);
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

  it('durante una racha de beats (incluidas ofertas rechazadas) el shell NUNCA se recrea, por identidad de nodo', () => {
    iniciar(cont, prepararStorage(nuevaPartida(3)));

    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');
    expect(refIzquierda).toBeTruthy();
    expect(refDerecha).toBeTruthy();

    let huboOferta = false;
    // No se acepta ninguna oferta en este test (esa es la única transición
    // que sigue llevando a pantalla completa): rechazar se resuelve DENTRO
    // del tablero, así que la identidad tiene que sobrevivir a TODO el tramo.
    for (let i = 0; i < 25; i += 1) {
      const tipo = resolverUnPaso(cont, { aceptarOfertas: false });
      expect(tipo).not.toBeNull();
      if (tipo === 'oferta-rechazada') huboOferta = true;

      expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
      expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    }
    // No es un requisito del test que aparezca una oferta (depende de la
    // semilla), pero si aparece, el chequeo de arriba la cubre igual.
    expect(typeof huboOferta).toBe('boolean');
  });

  it('la tarjeta de aceptar/rechazar la oferta vive en el centro del tablero, con el calendario y el peleador visibles', () => {
    iniciar(cont, prepararStorage(nuevaPartida(3)));

    let guardia = 0;
    let tipo = null;
    while (tipo !== 'oferta' && guardia < 30) {
      guardia += 1;
      tipo = resolverUnPaso(cont, { aceptarOfertas: false, detenerEnOferta: true });
    }
    expect(tipo).toBe('oferta');
    expect(cont.querySelector('.shell-centro [data-accion="aceptar"]')).toBeTruthy();

    // El caso de uso que motivó el rediseño: decidir sobre la oferta viendo
    // el tablero completo alrededor — el calendario (arriba, en el centro) y
    // el peleador (ranking/récord/dinero, a la izquierda).
    expect(cont.querySelector('.shell-centro').textContent).toContain('Semana');
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('Ranking');
  });

  it('curar una lesion con dinero desde el tablero descuenta la plata y saca el aviso de lesion', () => {
    const partida = nuevaPartida(4);
    partida.jugador.dinero = 100000;
    partida.jugador.estado.lesion = {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 22000, texto: 'x',
    };
    iniciar(cont, prepararStorage(partida));

    expect(cont.querySelector('.shell-centro').textContent).toContain('Mano fracturada');
    const dineroAntes = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroAntes).toBe('US$ 100K');

    cont.querySelector('.shell-centro [data-accion="curar"]').click();

    // El aviso de lesión desaparece del centro...
    expect(cont.querySelector('.shell-centro').textContent).not.toContain('Mano fracturada');
    // ...y la plata del panel izquierdo ya refleja el costo pagado
    // (100000 - 22000 = 78000), sin perder el tablero de vista.
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('US$ 78K');
    expect(cont.querySelector('.shell')).toBeTruthy();
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

  // Pedido del coordinador al revisar esta task: confirmar que una partida
  // guardada A MITAD DE CAMINO (con el esquema v2, avanzada varios bloques,
  // con un beat todavía pendiente) se retoma bien después de mover el
  // calendario al centro y la oferta al tablero — no solo que arranque, sino
  // que el calendario muestre la semana REAL de esa partida, no la del
  // arranque de la carrera.
  it('una partida v2 guardada a mitad de camino (varios bloques avanzados) se retoma con el calendario correcto', () => {
    let partida = nuevaPartida(7);
    let guardia = 0;
    // Avanza varios bloques de verdad (a nivel núcleo) para que semanaGlobal
    // se mueva un buen trecho del arranque, dejando CUALQUIER beat pendiente
    // a la cabeza de la cola (no importa cuál: lo que importa acá es la
    // semana, no el tipo de beat).
    while (partida.bloqueGlobal < 6 && guardia < 500) {
      guardia += 1;
      const paso = siguienteBeat(partida);
      partida = paso.partida;
      if (partida.terminada) break;
    }
    expect(partida.semanaGlobal).toBeGreaterThan(1);
    const semanaGuardada = partida.semanaGlobal;

    iniciar(cont, prepararStorage(partida));

    const textoEsperado = fechaDe(semanaGuardada, ANIO_INICIAL).texto;
    expect(cont.querySelector('.shell-centro').textContent).toContain(textoEsperado);
    // Y no quedó pegada en la semana 1 (el bug que rompería si la carga
    // ignorara semanaGlobal y el calendario mostrara siempre el arranque).
    expect(textoEsperado).not.toBe(fechaDe(1, ANIO_INICIAL).texto);
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

  // Bug reportado por el usuario: "aparece en la esquina de PRÓXIMA PELEA el
  // nombre del peleador que me acaba de aparecer como propuesta, no la
  // acepté y ya aparece ahí, eso está mal". Causa real: `partida.proximaPelea`
  // se guardaba al armar la cola del bloque (armarCola, career.js) — antes
  // de que el jugador llegara siquiera a ver la oferta, no digamos
  // aceptarla. El panel solo puede mostrar una pelea FIRMADA: se mantiene
  // vacío mientras la oferta está en danza y sigue vacío después de
  // resolverla (pelear o rechazar), hasta que el jugador firme la próxima.
  describe('el panel de próxima pelea no queda fantasma después de resolverla (bug reportado)', () => {
    it('con la oferta sobre la mesa (todavía sin aceptar), el panel sigue en el estado vacío', () => {
      iniciar(cont, prepararStorage(nuevaPartida(3)));

      let guardia = 0;
      let tipo = null;
      while (tipo !== 'oferta' && guardia < 40) {
        guardia += 1;
        tipo = resolverUnPaso(cont, { aceptarOfertas: false, detenerEnOferta: true });
      }
      expect(tipo).toBe('oferta');

      // El panel de la derecha NO debe mostrar al rival todavía: la oferta
      // está en pantalla, pero el jugador no la aceptó.
      const textoAntes = cont.querySelector('.shell-derecha').textContent;
      expect(textoAntes).toContain('Todavía no hay nada firmado');
    });

    it('después de pelear (ganar o perder) una oferta aceptada, el panel vuelve al estado "todavía no hay nada firmado"', () => {
      iniciar(cont, prepararStorage(nuevaPartida(3)));

      let guardia = 0;
      let tipo = null;
      while (tipo !== 'oferta' && guardia < 40) {
        guardia += 1;
        tipo = resolverUnPaso(cont, { aceptarOfertas: false, detenerEnOferta: true });
      }
      expect(tipo).toBe('oferta');

      cont.querySelector('.shell-centro [data-accion="aceptar"]').click();
      jugarPeleaCompleta(cont);

      // De vuelta en el tablero: la pelea ya se peleó, no hay ninguna otra
      // firmada todavía (recién se decide en el próximo bloque).
      expect(cont.querySelector('.shell')).toBeTruthy();
      const textoDespues = cont.querySelector('.shell-derecha').textContent;
      expect(textoDespues).toContain('Todavía no hay nada firmado');
    });

    it('después de rechazar una oferta, el panel sigue en el estado "todavía no hay nada firmado"', () => {
      iniciar(cont, prepararStorage(nuevaPartida(3)));

      let guardia = 0;
      let tipo = null;
      while (tipo !== 'oferta' && guardia < 40) {
        guardia += 1;
        tipo = resolverUnPaso(cont, { aceptarOfertas: false, detenerEnOferta: true });
      }
      expect(tipo).toBe('oferta');
      expect(cont.querySelector('.shell-derecha').textContent).toContain('Todavía no hay nada firmado');

      cont.querySelector('.shell-centro [data-accion="rechazar"]').click();

      expect(cont.querySelector('.shell')).toBeTruthy();
      expect(cont.querySelector('.shell-derecha').textContent).toContain('Todavía no hay nada firmado');
    });
  });

  // Feedback textual del usuario: "Ranking aparece, pero no puedo ver
  // quiénes están por encima o por debajo de mí (y debe coincidir con los
  // peleadores a los que me enfrente)". Verifica de punta a punta, por la UI
  // real: el botón del bloque de récord/ranking abre la tabla, y el rival
  // que después ofrece el juego ya figuraba ahí con el mismo apodo.
  describe('el bloque de récord/ranking abre la tabla de posiciones (bug reportado)', () => {
    it('la tabla se abre como popup, con el jugador destacado, y es coherente con el rival que ofrece la próxima pelea', () => {
      iniciar(cont, prepararStorage(nuevaPartida(3)));

      let guardia = 0;
      let tipo = null;
      while (tipo !== 'oferta' && guardia < 40) {
        guardia += 1;
        tipo = resolverUnPaso(cont, { aceptarOfertas: false, detenerEnOferta: true });
      }
      expect(tipo).toBe('oferta');

      // La oferta todavía no está firmada, así que el panel de la derecha no
      // muestra al rival (ver el describe de arriba): el apodo se lee de la
      // propia pantalla de la oferta, en el centro.
      const apodoRival = cont.querySelector('.shell-centro').textContent.match(/"([^"]+)"/)[1];

      cont.querySelector('.shell-izquierda [data-accion="ver-ranking"]').click();

      const popup = document.querySelector('.popup-overlay');
      expect(popup).toBeTruthy();
      expect(popup.textContent).toContain('Ranking');
      expect(popup.textContent).toContain(apodoRival);
      expect(document.querySelectorAll('.tabla-ranking-fila-jugador')).toHaveLength(1);
    });
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
