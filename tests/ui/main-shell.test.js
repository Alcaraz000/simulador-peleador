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
  // "Continuar" tira el dado (Task v3) antes de revelar la siguiente
  // decisión: con prefers-reduced-motion resuelve en el momento (este avance
  // es un no-op), pero los bloques que prueban temporizadores reales
  // (motion sin reducir) necesitan pasar los 600-900ms de esa animación
  // antes de que el próximo beat aparezca. 900ms cubre de sobra el máximo.
  vi.advanceTimersByTime(900);
}

describe('main.js: mejora/evento/redes/sparring viven en el shell (Task 3.2)', () => {
  it('mejora: el shell se monta con los 3 paneles y 3 tarjetas; elegir aplica el efecto y vuelve derecho al estado ocioso, sin pantalla de resultado', () => {
    iniciar(cont, prepararPartidaGuardada('mejora'));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-derecha')).toBeTruthy();

    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta');
    expect(tarjetas).toHaveLength(3);

    tarjetas[0].click();
    vi.runAllTimers();

    // Sin pantalla de resultado ni botón "Seguir" (pedido v3): se vuelve
    // DIRECTO al estado ocioso, en la MISMA región central del MISMO shell —
    // nunca se navegó a otra pantalla.
    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('evento sin azar: aplica directo y vuelve al estado ocioso, sin navegar a otra pantalla ni mostrar un desenlace', () => {
    // semilla 2 -> carta "escuela_o_gimnasio", ninguna opcion tiene
    // probabilidades (verificado aparte con el catalogo real): ejercita el
    // camino sin roll. (Antes era la semilla 1 con "cancelacion": las cartas
    // de riesgo nuevas de Task v3 — ver cards-events.js — corren la secuencia
    // de rng de 'evento' y esa semilla dejó de llegar a esa carta puntual.)
    iniciar(cont, prepararPartidaGuardada('evento', 2));
    continuar();

    const grilla = cont.querySelector('.panel-decision-grilla, .panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    const tarjetas = [...grilla.querySelectorAll('.tarjeta')];
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);

    tarjetas[0].click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('evento con azar: la opcion elegida corre el roll (queda iluminada la crónica ganadora sobre la propia tarjeta) y despues aplica el efecto y vuelve al estado ocioso', () => {
    // semilla 5 -> el PRIMER beat 'evento' de esta carrera es justo la carta
    // "desafio_de_la_vereda" (Task v3, cartas nuevas con azar — ver
    // cards-events.js), cuya opción "aceptar" tiene probabilidades
    // (verificado aparte): ejercita el camino con roll. (Antes era la
    // semilla 52 con "entrenador"/"cambiar": las cartas nuevas de riesgo
    // corren la secuencia de rng de 'evento' y esa semilla dejó de llegar a
    // esa carta puntual.)
    iniciar(cont, prepararPartidaGuardada('evento', 5));
    continuar();

    // Referencias de nodo capturadas ANTES de elegir: son la garantía central
    // del rediseño (spec: "el tablero nunca desaparece"). Si el shell se
    // recrea en vez de reutilizarse, estas referencias quedan viejas y las
    // comparaciones de identidad de abajo fallan aunque `.shell` exista.
    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');

    // "desafio_de_la_vereda" tiene exactamente 2 opciones -> grilla de 2
    // columnas (fix v3), no la de 3 de siempre.
    const tarjetaAzar = cont.querySelector('[data-opcion="aceptar"]');
    expect(tarjetaAzar).toBeTruthy();
    expect(tarjetaAzar.querySelectorAll('.tarjeta-efecto').length).toBe(2);

    tarjetaAzar.click();

    // Todavía en pleno roll (antes de vaciar los temporizadores): el tablero
    // lateral tiene que seguir siendo EXACTAMENTE el mismo nodo.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);

    // con prefers-reduced-motion el roll resuelve directo (mismo tick), pero
    // de todos modos deja fijo el resultado ganador iluminado Y la crónica
    // de esa rama SOBRE la propia tarjeta — sin pantalla intermedia (pedido
    // v3: "el jugador sí tiene que poder ver qué desenlace le tocó").
    const iluminados = tarjetaAzar.querySelectorAll('.tarjeta-efecto.iluminado');
    expect(iluminados).toHaveLength(1);
    const resultado = tarjetaAzar.querySelector('.tarjeta-resultado');
    expect(resultado).toBeTruthy();
    expect(resultado.textContent).toMatch(/El barrio entero se entera|la lección aprendida/);

    // Todavía no se aplicó el efecto ni se volvió al estado ocioso: la
    // tarjeta con el resultado se deja un momento a la vista (pausa de
    // lectura) antes de seguir.
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeNull();

    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    // Después del roll y de aplicar el efecto (que repinta el panel
    // izquierdo con los valores finales y lo anima), el nodo `aside` de cada
    // región lateral sigue siendo el mismo: solo cambió su CONTENIDO interno,
    // nunca la región en sí ni el `.shell` que la contiene.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.querySelectorAll('.shell')).toHaveLength(1);

    // Sin pantalla de resultado: derecho al estado ocioso.
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('redes: se monta en el shell con 3 tarjetas y resolver una opcion no navega a otra pantalla', () => {
    // semilla 2: con el rebalance del campamento (Task v3), la semilla 1 por
    // defecto ya no llega a un beat "redes" dentro de su propia carrera
    // (probRedes bajó bastante en varias etapas, ver ETAPAS en career.js).
    iniciar(cont, prepararPartidaGuardada('redes', 2));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta');
    expect(tarjetas).toHaveLength(3);

    tarjetas[2].click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  // Revisión del coordinador tras la Task 6.1: aceptar o rechazar una oferta
  // es la decisión más importante del juego, y es donde más rinde ver el
  // tablero (ranking, récord, dinero, estado físico) mientras se decide. Deja
  // de ser pantalla completa; vive en el centro como cualquier otro beat de
  // decisión. Solo AL ACEPTAR arranca la pipeline a pantalla completa
  // (negociación → careo → plan → pelea), que sigue intacta.
  it('oferta: la tarjeta de aceptar/rechazar vive en el centro del tablero (con calendario y peleador visibles); rechazar resuelve ahi mismo', () => {
    iniciar(cont, prepararPartidaGuardada('oferta'));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-izquierda').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-centro').textContent).toContain('Semana');
    expect(cont.querySelector('.shell-centro [data-accion="aceptar"]')).toBeTruthy();
    expect(cont.querySelector('.shell-centro [data-accion="rechazar"]')).toBeTruthy();

    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');

    cont.querySelector('.shell-centro [data-accion="rechazar"]').click();

    // Rechazar resuelve DENTRO del mismo tablero (mismo nodo): nunca se
    // desmonta, a diferencia de lo que pasaba antes de esta revisión. Y
    // (Task v3) sin pantalla de resultado: derecho al estado ocioso.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });

  it('sparring: se monta en el shell (grilla de paos) y terminar el drill aplica el resultado y vuelve al estado ocioso, sin pantalla aparte', () => {
    // semilla 3: con el rebalance del campamento (Task v3), probSparring
    // bajó fuerte (0 en profesional/veterano — el campamento ya lo garantiza
    // en cada pelea, ver campamento.js), así que la semilla 1 por defecto ya
    // no llega a un beat "sparring" suelto dentro de su propia carrera.
    iniciar(cont, prepararPartidaGuardada('sparring', 3));
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
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
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

// Task v3 ("cartas nuevas con azar"): la consecuencia "se cae la pelea" tiene
// que ser real de punta a punta, no solo un texto en la tarjeta — este
// bloque verifica el camino completo por la UI (main.js), no solo la lógica
// pura de career.js/events.js (ya cubierta en sus propios tests). Para que el
// resultado sea determinístico sin depender de la suerte del roll interno
// (que usa un rng aparte, sembrado en `iniciar()`), la carta real que salió
// se reemplaza por una sintética con una sola rama posible (peso 0 en la
// segura, peso 1 en la de `caePelea: true`) — el resto de la partida (la
// oferta pendiente de verdad, generada por `armarCola`) queda intacto.
describe('main.js: "se cae la pelea" cancela de verdad la oferta pendiente (no solo en el texto)', () => {
  function partidaConOfertaYCartaDeRiesgo() {
    const storage = crearStorageFalso();
    storage.setItem(CLAVE_ACCESO, '1');
    const jugador = crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
    });
    // Semilla 4, etapa profesional (probPelea: 1): el bloque trae un 'evento'
    // Y, más adelante en la misma cola, una 'oferta' — ofertaPendiente (dato
    // interno) ya queda seteado antes de llegar a ninguno de los dos
    // (verificado aparte); proximaPelea (lo que muestra el panel) sigue null
    // porque todavía no se firmó nada.
    const inicial = { ...crearPartida({ jugador, semilla: 4 }), etapaIndice: 2 };
    const partida = avanzarHasta(inicial, 'evento');
    expect(partida.ofertaPendiente).not.toBeNull();
    expect(partida.proximaPelea).toBeNull();
    expect(partida.cola.map((b) => b.tipo)).toEqual(['evento', 'oferta']);

    const cartaSintetica = {
      id: 'riesgo_de_prueba', categoria: 'evento', titulo: 'Riesgo de prueba', texto: 'x',
      etapas: ['profesional'], rareza: 'normal',
      opciones: [
        { id: 'aceptar', texto: 'Arriesgarse', probabilidades: [
          { peso: 0, mods: {}, texto: 'no sale nunca en este test' },
          { peso: 1, mods: {}, efectos: { fama: -10 }, caePelea: true, texto: 'Se cayó la pelea, de verdad.' },
        ] },
        { id: 'rechazar', texto: 'No arriesgarse', mods: {} },
      ],
    };
    const conCartaSintetica = {
      ...partida,
      cola: [{ tipo: 'evento', datos: { carta: cartaSintetica } }, partida.cola[1]],
    };
    guardar(conCartaSintetica, storage);
    return storage;
  }

  it('elegir la rama que cae la pelea saca la oferta de la cola de verdad (no solo del texto); el panel de la derecha nunca mostró al rival sin firmar', () => {
    iniciar(cont, partidaConOfertaYCartaDeRiesgo());
    continuar();

    // Antes de elegir: la oferta todavía no se firmó (sigue sin decidir), así
    // que el panel de "próxima pelea" (columna derecha) sigue en el estado
    // vacío — bug reportado: antes mostraba al rival apenas aparecía la
    // oferta, sin que el jugador la hubiera aceptado.
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Todavía no hay nada firmado');

    const tarjetaRiesgo = cont.querySelector('[data-opcion="aceptar"]');
    expect(tarjetaRiesgo).toBeTruthy();
    tarjetaRiesgo.click();
    vi.runAllTimers();

    // Después: la pelea se cayó de verdad. El panel de la derecha sigue en
    // el estado vacío, y "Continuar" no lleva a ningún beat de tipo 'oferta'
    // — se sacó de la cola, no solo del texto.
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Todavía no hay nada firmado');
    expect(cont.querySelector('.shell-centro [data-accion="aceptar"]')).toBeNull();
    expect(cont.querySelector('.shell-centro [data-accion="rechazar"]')).toBeNull();
  });
});

// Hallazgo 1 de la revisión final (antes de publicar la v2): el timer del
// roll de una carta con azar (dopaje/chantaje/entrenador) nunca se cancela.
// Si el jugador entra a la Ficha ANTES de que el roll termine, el timer
// dispara igual en segundo plano: aplicarEfectoYSeguir() llama a
// asegurarShell(), que detecta que el shell ya no está dentro de
// `contenedor` (la Ficha lo reemplazó) y lo RECONSTRUYE con mount() —
// borrando la pantalla de Ficha sin que el jugador haya tocado "Cerrar".
// Este bloque necesita el roll REAL (con
// temporizador), no el atajo de prefers-reduced-motion del resto del
// archivo: con motion reducido el roll resuelve en el mismo tick del click y
// nunca queda "en curso" para poder irse a la Ficha a mitad de camino.
describe('main.js: el roll de una carta con azar no le puede robar la pantalla al jugador (hallazgo 1, revisión final v2)', () => {
  it('entrar a la Ficha durante el roll y dejar que el timer termine en segundo plano no borra la Ficha', () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });

    // semilla 5 -> carta "desafio_de_la_vereda", la opción "aceptar" SI tiene
    // probabilidades (mismo caso ya usado más arriba para probar el roll).
    iniciar(cont, prepararPartidaGuardada('evento', 5));
    continuar();

    const tarjetaAzar = cont.querySelector('[data-opcion="aceptar"]');
    expect(tarjetaAzar).toBeTruthy();

    tarjetaAzar.click();

    // El roll está en curso (dura entre 1200 y 1800ms, ver DURACION_MS en
    // roll.js): a los 400ms todavía no llegó al desenlace.
    vi.advanceTimersByTime(400);
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();

    // El jugador se va a la Ficha ANTES de que el roll termine.
    cont.querySelector('[data-accion="ficha"]').click();
    expect(cont.querySelector('.shell')).toBeNull();
    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();

    // Se deja correr el timer del roll en segundo plano (2000ms cubre de
    // sobra los 1500ms de duración nominal): la Ficha tiene que seguir en
    // pantalla, intacta, hasta que el jugador toque "Cerrar" — nunca antes.
    vi.advanceTimersByTime(2000);

    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();
    expect(cont.querySelector('.shell')).toBeNull();
  });

  // El comportamiento elegido para no sorprender al jugador (ver el
  // comentario en main.js junto a `cancelarRollPendiente`): el roll es
  // cosmético, el resultado real ya se decidió de forma síncrona al elegir
  // la carta. Si el jugador se va a la Ficha a mitad del roll (o durante la
  // pausa de lectura posterior), al volver el efecto ya tiene que estar
  // aplicado y el tablero en el estado ocioso (Task v3: nunca una pantalla
  // de resultado) — ni pierde la carta ni el resultado que le tocó, y no
  // vuelve a ver las 3 tarjetas de la carta.
  it('volver de la Ficha después de interrumpir el roll aplica el efecto y deja el tablero en el estado ocioso, no la carta de nuevo', () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });

    iniciar(cont, prepararPartidaGuardada('evento', 5));
    continuar();

    const tarjetaAzar = cont.querySelector('[data-opcion="aceptar"]');
    tarjetaAzar.click();
    vi.advanceTimersByTime(400);

    cont.querySelector('[data-accion="ficha"]').click();
    vi.advanceTimersByTime(2000); // no queda nada pendiente en segundo plano, en la Ficha

    cont.querySelector('[data-accion="cerrar"]').click();

    // De vuelta en el tablero: directo al estado ocioso (no las 3 tarjetas
    // de la carta de nuevo, ni ninguna pantalla de resultado).
    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.panel-decision-grilla')).toBeNull();
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
  });
});

// Bug reportado por el usuario: "minijuego de sparring: falta el timer con
// la barra decreciendo". Al agregarlo (ui/screens/sparring.js), cada pao
// prendido programa un setTimeout que cuenta como error si no le pegás a
// tiempo — mismo riesgo de timer colgado que ya se resolvió para el roll y
// el dado (hallazgo 1, más arriba): si el jugador se va a la Ficha con un
// pao prendido, ese timer no puede seguir corriendo en segundo plano contra
// un `centroContenido()` que la Ficha ya reemplazó.
describe('main.js: el timer del sparring no le puede robar la pantalla al jugador (bug reportado: falta el timer)', () => {
  it('entrar a la Ficha con un pao prendido y dejar que el timer expire en segundo plano no borra la Ficha', () => {
    // semilla 3: mismo caso ya usado más arriba para llegar a un beat
    // "sparring" suelto (en profesional/veterano probSparring es 0 — el
    // campamento ya lo garantiza en cada pelea).
    iniciar(cont, prepararPartidaGuardada('sparring', 3));
    continuar();

    expect(cont.querySelector('.grilla-paos')).toBeTruthy();
    cont.querySelector('[data-accion="empezar"]').click();
    expect(cont.querySelector('.pao.activo')).toBeTruthy();

    // El jugador se va a la Ficha con el pao todavía prendido, sin pegarle.
    cont.querySelector('[data-accion="ficha"]').click();
    expect(cont.querySelector('.shell')).toBeNull();
    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();

    // Se deja correr el timer del pao en segundo plano (bien por encima de
    // su duración nominal, 1500ms): la Ficha tiene que seguir en pantalla,
    // intacta, hasta que el jugador toque "Cerrar" — nunca antes.
    vi.advanceTimersByTime(5000);

    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();
    expect(cont.querySelector('.shell')).toBeNull();
  });

  // Verificación más fuerte que la de arriba: sin cancelar el timer, un pao
  // que vence mientras el jugador está en la Ficha vuelve a encender el
  // siguiente automáticamente (mismo `empezar()` que dispara el propio
  // renderSparring al reanudar un sparring "en curso") — y ESE timer, sin
  // cancelar tampoco, sigue la cadena. Con 5000ms de sobra (más de 3 rondas
  // de 1500ms) el drill avanzaría solo varios golpes en segundo plano, todos
  // errados, sin que el jugador tocara nada. Al volver del tablero, el
  // contador de "Golpes" tiene que seguir en 0: el timer pendiente se corta
  // ANTES de que la Ficha reemplace la pantalla (abandonarSparringPendiente).
  it('el sparring no avanza solo en segundo plano mientras el jugador está en la Ficha', () => {
    iniciar(cont, prepararPartidaGuardada('sparring', 3));
    continuar();

    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('[data-accion="ficha"]').click();
    vi.advanceTimersByTime(5000);

    cont.querySelector('[data-accion="cerrar"]').click();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.grilla-paos')).toBeTruthy();
    // "Golpes" es el segundo `.tile .valor` del panel de sparring (el
    // primero es "Aciertos") — ver renderSparring, ui/screens/sparring.js.
    const golpes = [...cont.querySelectorAll('.tile .valor')][1];
    expect(golpes.textContent).toBe('0/10');
  });
});

// Regresión pedida en la revisión de las Tasks 5.3/5.4: con la tienda como
// popup, el tablero queda VISIBLE detrás mientras se compra. Que la plata
// del panel izquierdo quedara congelada ahí rompía las dos reglas de la v2
// ("el tablero nunca desaparece" y "los cambios se ven ocurrir") — antes no
// se notaba porque las pantallas se reemplazaban enteras, pero acá el
// tablero sigue a la vista. `abrirTienda`/`propsPanelIzquierda` en main.js
// ahora refrescan SOLO el panel izquierdo del shell en cada compra.
describe('main.js: la tienda abierta durante un beat refresca el panel izquierdo detrás del popup', () => {
  function partidaConBeatYPlata(dinero) {
    const storage = crearStorageFalso();
    storage.setItem(CLAVE_ACCESO, '1');
    const jugadorRico = {
      ...crearPeleador({
        nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
        estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
      }),
      dinero,
    };
    const partida = avanzarHasta(crearPartida({ jugador: jugadorRico, semilla: 1 }), 'mejora');
    guardar(partida, storage);
    return storage;
  }

  it('comprar dentro del popup actualiza la plata detrás, sin cerrar el popup ni tocar el centro/derecha del shell', () => {
    iniciar(cont, partidaConBeatYPlata(200000));
    continuar();

    expect(cont.querySelector('.shell')).toBeTruthy();
    const refCentro = cont.querySelector('.shell-centro');
    const refDerecha = cont.querySelector('.shell-derecha');
    const dineroAntes = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroAntes).toBeTruthy();

    cont.querySelector('.shell-izquierda [data-accion="tienda"]').click();
    expect(document.querySelector('.popup-overlay')).toBeTruthy();

    document.querySelector('[data-item="kinesiologo"]').click();

    // El popup sigue abierto (uno solo, no se cerró ni se duplicó)...
    expect(document.querySelectorAll('.popup-overlay')).toHaveLength(1);
    // ...el foco no se escapó hacia atrás, al panel que se acaba de repintar...
    expect(cont.querySelector('.shell-izquierda').contains(document.activeElement)).toBe(false);
    // ...y el panel izquierdo, DETRÁS del popup, ya muestra la plata nueva
    // (200000 - 16000 del kinesiólogo, precio recalibrado en Sistema 3 = 184000).
    const dineroDespues = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroDespues).not.toBe(dineroAntes);
    expect(dineroDespues).toBe('US$ 184K');

    // El centro y la derecha del shell no se tocaron: la garantía del shell
    // (montarCentro nunca toca las columnas laterales) sigue en pie aunque
    // ahora también se repinte la izquierda por una compra.
    expect(cont.querySelector('.shell-centro')).toBe(refCentro);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
  });

  it('un item impagable dentro del popup no rompe nada y el panel de atrás sigue mostrando la misma plata', () => {
    iniciar(cont, partidaConBeatYPlata(0));
    continuar();

    cont.querySelector('.shell-izquierda [data-accion="tienda"]').click();
    const dineroAntes = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];

    document.querySelector('[data-item="manager"]').click();

    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    const dineroDespues = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroDespues).toBe(dineroAntes);
  });
});
