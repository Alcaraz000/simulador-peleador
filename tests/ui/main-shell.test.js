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
//
// Pedido 3 (v7, "no quiero que se vea 'lo que viene ahora'"): `iniciar()`
// sobre una partida guardada ya NO pasa por una pantalla intermedia con un
// botón "Continuar" — muestra derecho el beat que estaba pendiente cuando se
// guardó. Por eso estos tests ya no necesitan un paso previo de "continuar":
// el beat buscado por `avanzarHasta` aparece apenas se llama a `iniciar()`.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../../src/core/career.js';
import { guardar, cargar } from '../../src/core/save.js';
import { CLAVE_ACCESO } from '../../src/ui/screens/login.js';
import { iniciar } from '../../src/main.js';
import { fmtDinero } from '../../src/ui/dom.js';

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
// un beat que cumpla `predicado` (con ese beat todavía a la cabeza de la
// cola), para que al cargarla y jugar "Continuar" aparezca ese mismo beat.
function avanzarHastaQue(partidaInicial, predicado, maxBloques = 500) {
  let partida = partidaInicial;
  for (let i = 0; i < maxBloques; i += 1) {
    if (partida.terminada) break;
    const paso = siguienteBeat(partida);
    if (paso.beat && predicado(paso.beat)) return partida;
    partida = paso.partida;
  }
  throw new Error(`no aparecio un beat buscado en ${maxBloques} bloques (semilla de prueba a revisar)`);
}

function avanzarHasta(partidaInicial, tipoObjetivo, maxBloques = 500) {
  return avanzarHastaQue(partidaInicial, (beat) => beat.tipo === tipoObjetivo, maxBloques);
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

// Una partida guardada parada en un beat 'evento' cuya carta tenga al menos
// una opción CON azar (`probabilidades`, ver resolverOpcion en events.js), que
// es el camino que ejercita el roll.
//
// Antes esto era una semilla escrita a mano, y se rompía cada vez que algo
// consumía tiradas distintas en el camino: la secuencia entera de la carrera
// se corre y esa semilla deja de caer en la carta puntual. Se persiguió seis
// veces (6->10->16->11->30->83) hasta que quedó claro que el número no es el
// invariante que el test quiere probar — lo que importa es "una carta con
// roll", no "la semilla 83". Ahora la busca sola: recorre semillas hasta dar
// con una que sirva, así cualquier cambio de contenido futuro se acomoda solo.
// Devuelve además QUÉ opción trae el roll y cuáles son sus ramas, sacadas de
// la carta que de verdad salió: así los tests afirman sobre la estructura (una
// rama iluminada, la crónica de esa rama sobre la tarjeta) en vez de sobre el
// texto de una carta puntual, que era la otra mitad del acoplamiento.
function prepararPartidaGuardadaEventoConAzar(maxSemillas = 200) {
  for (let semilla = 1; semilla <= maxSemillas; semilla += 1) {
    let partida = nuevaPartida(semilla);
    for (let i = 0; i < 500 && !partida.terminada; i += 1) {
      const paso = siguienteBeat(partida);
      const carta = paso.beat?.tipo === 'evento' ? paso.beat.datos.carta : null;
      const opcion = (carta?.opciones ?? []).find((o) => o.probabilidades);
      if (opcion) {
        const storage = crearStorageFalso();
        // El login es solo un portón de acceso (ver login.js), no
        // autenticación real: marcarlo como ya pasado deja probar el tablero
        // directamente, igual que haría un jugador que ya inició sesión antes.
        storage.setItem(CLAVE_ACCESO, '1');
        guardar(partida, storage);
        return {
          storage,
          opcionId: opcion.id,
          ramas: opcion.probabilidades.length,
          textos: opcion.probabilidades.map((r) => r.texto),
        };
      }
      partida = paso.partida;
    }
  }
  throw new Error(`ninguna de las primeras ${maxSemillas} semillas llega a un evento con azar`);
}

// Pedido del coordinador (v4, "el mazo de mejora también"): repartirMejoras
// (cards.js) a veces reparte 2 cartas en vez de 3 (~1 de cada 5, ver
// decidirCantidadMejoras). Busca el PRIMER 'mejora' que salió con 2, para
// probar que el tablero lo renderiza bien (texto dinámico + grilla de 2).
function prepararPartidaGuardadaMejoraReducida(semilla = 1) {
  const storage = crearStorageFalso();
  storage.setItem(CLAVE_ACCESO, '1');
  const partida = avanzarHastaQue(
    nuevaPartida(semilla),
    (beat) => beat.tipo === 'mejora' && beat.datos.cartas.length === 2,
  );
  guardar(partida, storage);
  return storage;
}

// v13 (Bloque 5.1, "el ritmo"): el beat suelto 'sparring' (una decisión
// más, independiente de cualquier pelea) desapareció de `armarCola` —
// `elegirTipoDecision` solo reparte mejora/evento/redes. El único sparring
// que sigue existiendo es 'campSparring', DENTRO del campamento de
// preparación de una pelea ya firmada (firmarPelea, career.js) — mismo
// componente de UI (`renderSparring`), pero solo alcanzable firmando una
// oferta primero. Se arma a mano (mismo patrón que `firmarPelea` en
// tests/core/career.test.js): una oferta sintética alcanza, porque
// `beatCampSparring` (main.js) no necesita buscar al rival en el roster.
function ofertaDePruebaCampamento() {
  return {
    id: 'of_prueba', rivalId: 'r1', rivalApodo: 'El Zurdo', rivalNombre: 'El Zurdo', esTitulo: false,
  };
}

function prepararPartidaGuardadaCampSparring(semilla = 1) {
  const storage = crearStorageFalso();
  storage.setItem(CLAVE_ACCESO, '1');
  let actual = firmarPelea({ ...nuevaPartida(semilla), etapaIndice: 2 }, { oferta: ofertaDePruebaCampamento() });
  let guardia = 0;
  // El campamento trae 2-3 beats (campamento.js), mezclando campCarta y
  // campSparring: se consume uno por vez hasta que el PRÓXIMO a servir sea
  // el sparring (sin consumirlo todavía — mismo criterio que avanzarHastaQue,
  // más arriba: la partida se guarda CON ese beat aún pendiente en la cola).
  while (actual.cola[0]?.tipo !== 'campSparring' && guardia < 10) {
    actual = siguienteBeat(actual).partida;
    guardia += 1;
  }
  if (actual.cola[0]?.tipo !== 'campSparring') {
    throw new Error('no aparecio un campSparring en el campamento (semilla de prueba a revisar)');
  }
  guardar(actual, storage);
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

describe('main.js: mejora/evento/redes/sparring viven en el shell (Task 3.2)', () => {
  it('mejora: el shell se monta con los 3 paneles y tarjetas de mejora; elegir aplica el efecto y pasa derecho a la próxima tarjeta, sin pantalla de resultado', () => {
    iniciar(cont, prepararPartidaGuardada('mejora'));

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-derecha')).toBeTruthy();

    // No se fija un número exacto de cartas (decidirCantidadMejoras reparte
    // 3 la gran mayoría de las veces, pero a veces 2 — Cambio 1: el bonus de
    // etapa temprana/entrenador ya no agrega cartas de más, tope duro de 3,
    // ver OPCIONES_EXTRA_ETAPA_TEMPRANA en cards.js) — por eso se buscan
    // tarjetas en las DOS variantes de grilla (3 o 2 columnas).
    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta, .panel-decision-grilla-2 .tarjeta');
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);

    const tarjetaElegida = tarjetas[0];
    tarjetaElegida.click();
    vi.runAllTimers();

    // Sin pantalla de resultado ni pantalla intermedia (Pedido 3, v7): se
    // pasa DIRECTO a la próxima tarjeta de acción, en la MISMA región
    // central del MISMO shell — nunca se navegó a otra pantalla, y el
    // bloque de contenido ya no muestra la grilla de mejora que se acaba de
    // resolver.
    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(tarjetaElegida)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  it('mejora con cantidad reducida (2 cartas): el texto dice "dos" y usa la grilla de 2 columnas (pedido del coordinador, v4)', () => {
    iniciar(cont, prepararPartidaGuardadaMejoraReducida(1));

    expect(cont.textContent).toContain('El dado trajo dos mejoras. Elegí una.');
    expect(cont.textContent).not.toContain('trajo tres mejoras');
    const grilla = cont.querySelector('.panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    expect(grilla.querySelectorAll('.tarjeta')).toHaveLength(2);

    grilla.querySelectorAll('.tarjeta')[0].click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  it('evento sin azar: aplica directo y pasa a la próxima tarjeta, sin navegar a otra pantalla ni mostrar un desenlace', () => {
    // semilla 2 -> carta "amigos", ninguna opcion tiene probabilidades
    // (verificado aparte con el catalogo real): ejercita el camino sin roll.
    // (Antes era la semilla 6: la Ronda v6 -roster de 100, Pedido 1- corrió
    // la secuencia de rng de TODA la carrera desde el arranque -crearRoster
    // consume muchas más tiradas con 100 rivales que con 12-, así que 6 dejó
    // de llegar a esta carta puntual; 2 sí.)
    iniciar(cont, prepararPartidaGuardada('evento', 2));

    const grilla = cont.querySelector('.panel-decision-grilla, .panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    const tarjetas = [...grilla.querySelectorAll('.tarjeta')];
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);

    const tarjetaElegida = tarjetas[0];
    tarjetaElegida.click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(tarjetaElegida)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  it('evento con azar: la opcion elegida corre el roll (queda iluminada la crónica ganadora sobre la propia tarjeta) y despues aplica el efecto y pasa a la próxima tarjeta', () => {
    // Una carta con `probabilidades` (Task v3, cartas nuevas con azar — ver
    // cards-events.js): ejercita el camino con roll. La semilla y la opción
    // las busca el helper, no están escritas acá — ver
    // prepararPartidaGuardadaEventoConAzar.
    const { storage, opcionId, ramas, textos } = prepararPartidaGuardadaEventoConAzar();
    iniciar(cont, storage);

    // Referencias de nodo capturadas ANTES de elegir: son la garantía central
    // del rediseño (spec: "el tablero nunca desaparece"). Si el shell se
    // recrea en vez de reutilizarse, estas referencias quedan viejas y las
    // comparaciones de identidad de abajo fallan aunque `.shell` exista.
    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');

    // Una tarjeta de efecto por rama posible del roll.
    const tarjetaAzar = cont.querySelector(`[data-opcion="${opcionId}"]`);
    expect(tarjetaAzar).toBeTruthy();
    expect(tarjetaAzar.querySelectorAll('.tarjeta-efecto').length).toBe(ramas);

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
    // Cualquiera de las ramas de la carta es una crónica válida para este
    // test: lo que importa es que la tarjeta muestre ALGUNA, no cuál en
    // particular ganó el roll.
    expect(textos).toContain(resultado.textContent.trim());

    // Todavía no se aplicó el efecto ni se pasó a la próxima tarjeta: la
    // tarjeta con el resultado se deja un momento a la vista (pausa de
    // lectura) antes de seguir — la propia tarjeta elegida sigue montada tal
    // cual.
    expect(cont.contains(tarjetaAzar)).toBe(true);

    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    // Después del roll y de aplicar el efecto (que repinta el panel
    // izquierdo con los valores finales y lo anima), el nodo `aside` de cada
    // región lateral sigue siendo el mismo: solo cambió su CONTENIDO interno,
    // nunca la región en sí ni el `.shell` que la contiene.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.querySelectorAll('.shell')).toHaveLength(1);

    // Sin pantalla de resultado propia de ESTA carta: derecho a la próxima
    // tarjeta de acción (Pedido 3, v7) — sea cual sea su forma (puede, de
    // hecho, ser otro desenlace: un aviso, o el anuncio de un trámite).
    expect(cont.contains(tarjetaAzar)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  // Bug reportado (v9, "el roll de los dados ocurre demasiado rápido, no da
  // margen a ver qué fue lo que pasó"): con `prefers-reduced-motion` (el modo
  // por defecto de este archivo, ver beforeEach) el roll en sí resuelve en el
  // mismo tick — el único temporizador real en juego es PAUSA_RESULTADO_MS
  // (main.js), que deja la tarjeta con el resultado a la vista antes de
  // seguir. Antes de este fix eran 1100ms: muy poco para registrar y leer una
  // frase nueva que recién apareció. Este test fija una cota INFERIOR muy por
  // encima de esos 1100ms viejos (falla contra el código sin arreglar) y una
  // cota SUPERIOR para que la lectura no se vuelva tediosa (el roll se repite
  // varias veces por carrera).
  it('la pausa de lectura tras el roll dura bastante más que antes (1100ms), sin volverse tediosa', () => {
    const { storage, opcionId } = prepararPartidaGuardadaEventoConAzar();
    iniciar(cont, storage);
    const tarjetaAzar = cont.querySelector(`[data-opcion="${opcionId}"]`);
    tarjetaAzar.click();

    // El roll resolvió en el mismo tick (reduced motion): el resultado ya
    // está pintado sobre la tarjeta.
    expect(tarjetaAzar.querySelector('.tarjeta-resultado')).toBeTruthy();

    // A 1500ms de la pausa (bien por encima del viejo PAUSA_RESULTADO_MS de
    // 1100ms): con el bug sin arreglar, ya se habría aplicado el efecto y la
    // tarjeta habría desaparecido. Con el fix, todavía tiene que estar.
    vi.advanceTimersByTime(1500);
    expect(cont.contains(tarjetaAzar)).toBe(true);

    // Pero tampoco se vuelve tediosa: a los 3000ms totales de pausa, ya se
    // tiene que haber aplicado el efecto y pasado a la próxima tarjeta.
    vi.advanceTimersByTime(1500);
    expect(cont.contains(tarjetaAzar)).toBe(false);
  });

  it('redes: se monta en el shell con 3 tarjetas y resolver una opcion no navega a otra pantalla', () => {
    // semilla 6: la corrección del coordinador ("el pick del jugador no
    // puede ser cosmético") rehizo el minijuego de trámite entero —
    // resolverRondaMinijuego consume otras tiradas de rng dentro de
    // armarLotePeleas, así que corre la secuencia entera de la carrera de
    // nuevo (mismo motivo que ya movió esta semilla varias veces antes) — la
    // semilla 4 usada hasta acá dejó de llegar a un beat "redes" dentro de
    // las 500 iteraciones de avanzarHasta; 6 sí (carta "post_rival", 3
    // opciones).
    iniciar(cont, prepararPartidaGuardada('redes', 6));

    expect(cont.querySelector('.shell')).toBeTruthy();
    const tarjetas = cont.querySelectorAll('.panel-decision-grilla .tarjeta');
    expect(tarjetas).toHaveLength(3);

    const tarjetaElegida = tarjetas[2];
    tarjetaElegida.click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(tarjetaElegida)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  // Revisión del coordinador tras la Task 6.1: aceptar o rechazar una oferta
  // es la decisión más importante del juego, y es donde más rinde ver el
  // tablero (ranking, récord, dinero, estado físico) mientras se decide. Deja
  // de ser pantalla completa; vive en el centro como cualquier otro beat de
  // decisión. Solo AL ACEPTAR arranca la pipeline a pantalla completa
  // (negociación → careo → plan → pelea), que sigue intacta.
  it('oferta: la tarjeta de aceptar/rechazar vive en el centro del tablero (con calendario y peleador visibles); rechazar resuelve ahi mismo', () => {
    iniciar(cont, prepararPartidaGuardada('oferta'));

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Dinero');
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Semana');
    expect(cont.querySelector('.shell-centro [data-accion="aceptar"]')).toBeTruthy();
    expect(cont.querySelector('.shell-centro [data-accion="rechazar"]')).toBeTruthy();

    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');
    const contenidoAntes = cont.querySelector('[data-bloque="contenido"]');

    cont.querySelector('.shell-centro [data-accion="rechazar"]').click();

    // Rechazar resuelve DENTRO del mismo tablero (mismo nodo): nunca se
    // desmonta, a diferencia de lo que pasaba antes de esta revisión. Y
    // (Pedido 3, v7) sin pantalla de resultado propia: derecho a la próxima
    // tarjeta — el bloque de contenido se repintó de punta a punta.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.contains(contenidoAntes)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  // v6: el lote de trámite (cuando NO sacó destacado, ver tramiteDestacado
  // más abajo) sigue siendo el resumen de siempre: título + texto + Seguir,
  // sin ninguna tarjeta interactiva.
  it('peleasResueltas: muestra el resumen de tramite (con detalle de cada combate) y Seguir pasa a la próxima tarjeta', () => {
    iniciar(cont, prepararPartidaGuardada('peleasResueltas', 3));

    const desenlace = cont.querySelector('.panel-decision-desenlace');
    expect(desenlace).toBeTruthy();
    expect(desenlace.textContent.length).toBeGreaterThan(0);

    desenlace.querySelector('.boton').click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(desenlace)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  // Pedidos 1 y 2 (v7, "que se anuncie antes" + "que se juegue un poco"): el
  // destacado del lote de trámite (a lo sumo uno por lote, ver
  // PROB_DESTACADO_TRAMITE en tramite.js) ya no aparece resuelto de la
  // nada. Es su PROPIO beat ('tramiteDestacado', corrección del coordinador:
  // antes vivía adentro de 'peleasResueltas' con un marcador precalculado —
  // ahora cada ronda se juega de verdad, en el momento). Se juega en dos
  // fases: la tarjeta del rival (con el anuncio del entrenador ya adentro —
  // activa panel-proxima.js) -> minijuego (piedra/papel/tijera de boxeo,
  // ronda a ronda de verdad) -> resultado, con Seguir pasando derecho a la
  // próxima tarjeta (Pedido 3).
  it('tramiteDestacado: muestra la tarjeta del destacado (con el anuncio adentro, activa próxima pelea), se juega el minijuego ronda a ronda de verdad y el resultado pasa a la próxima tarjeta', () => {
    const storage = prepararPartidaGuardada('tramiteDestacado', 1);
    iniciar(cont, storage);

    // Fase 1: la tarjeta del rival, con la voz del entrenador, la bolsa y
    // cuánto falta ya adentro — activa panel-proxima.js (columna derecha).
    const boton = cont.querySelector('[data-accion="simular-pelea"]');
    expect(boton).toBeTruthy();
    expect(cont.querySelector('.cabecera-media')).toBeTruthy();
    expect(cont.querySelector('.shell-derecha').textContent).not.toContain('Todavía no hay nada firmado');
    boton.click();

    // Fase 2: el minijuego — al mejor de 3 o de 5 (alMejorDeCuantos). Se
    // juega hasta que aparezca el resultado final (mismo patrón que el
    // drill de sparring más abajo en este archivo). Cada click resuelve una
    // ronda DE VERDAD (resolverRondaMinijuego, con el rng de sesión) — no
    // hay ningún marcador precalculado esperando a mostrarse.
    let guardia = 0;
    while (!cont.querySelector('.panel-decision-desenlace') && guardia < 10) {
      const grilla = cont.querySelector('.panel-decision-grilla');
      expect(grilla).toBeTruthy();
      const tarjetas = grilla.querySelectorAll('.tarjeta');
      expect(tarjetas).toHaveLength(3);
      tarjetas[0].click();
      guardia += 1;
    }
    expect(guardia).toBeLessThan(10);

    // Fase 3: el resultado — Seguir pasa DIRECTO a la próxima tarjeta (sin
    // pantalla intermedia, Pedido 3) y la próxima pelea ya se limpió.
    const resultado = cont.querySelector('.panel-decision-desenlace');
    expect(resultado.textContent.length).toBeGreaterThan(0);
    expect(cont.querySelector('.shell-derecha').textContent).toContain('Todavía no hay nada firmado');

    resultado.querySelector('.boton').click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(resultado)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);

    // Resumen de fin de año (pedido del usuario): el destacado de trámite
    // tiene que quedar fechado en el historial, igual que cualquier otra
    // pelea — antes de este fix (main.js pasa `semanaGlobal` a
    // aplicarResultado), quedaba con `fecha: null`, invisible para el filtro
    // por año (peleasDelAnio, year-summary.js). Puede haber caído en
    // `historial` (profesional) o `historialAmateur` (formación, si el
    // destacado salió en juvenil/amateur — ambos casos son válidos, ver
    // aplicarResultado en offers.js) — se busca en los dos.
    const guardado = cargar(storage);
    const ultima = guardado.jugador.historial.at(-1) ?? guardado.jugador.historialAmateur.at(-1);
    expect(ultima).toBeTruthy();
    expect(typeof ultima.fecha).toBe('number');
  });

  // Resumen de fin de año (pedido textual del usuario): al cerrar un año con
  // al menos una pelea, aparece este beat ANTES que la mejora del año nuevo
  // (ver siguienteBeat, career.js) — con el grafico de media, las decisiones
  // tomadas y las peleas del año, y un solo "Seguir" que pasa derecho a la
  // próxima tarjeta, sin pantalla intermedia (mismo criterio que el resto
  // del tablero, Pedido 3 v7).
  it('resumenAnio: muestra el resumen del año que cerró y "Seguir" pasa derecho a la próxima tarjeta', () => {
    iniciar(cont, prepararPartidaGuardada('resumenAnio', 2));

    expect(cont.querySelector('.grafico-media, .grafico-media-vacio')).toBeTruthy();
    // Pedido 2 (v8, "las peleas llevan la bandera del rival"): main.js busca
    // al rival en `partida.mundo.roster` para sumarle la bandera SVG — de
    // punta a punta, con el juego real (no un prop inyectado a mano).
    expect(cont.querySelector('.resumen-anio-fila-rival svg.bandera-svg')).toBeTruthy();
    const boton = [...cont.querySelectorAll('button')].find((b) => b.textContent === 'Seguir');
    expect(boton).toBeTruthy();
    const contenidoAntes = cont.querySelector('[data-bloque="contenido"]');

    boton.click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(contenidoAntes)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  // Pedido 3 (v8, "cuando se muestre el resumen del año, está permitido
  // 'ocultar' la sección de estado y atributos temporalmente"): los bloques
  // siguen montados (con su contenido real adentro — ver montarTablero,
  // main.js) pero marcados `.oculto` mientras el resumen está en pantalla, y
  // vuelven a mostrarse solos al seguir a la próxima tarjeta — sin que las
  // columnas laterales se muevan un pixel (identidad de nodo, misma garantía
  // que tablero-persistente.test.js).
  it('resumenAnio: oculta atributos/estado mientras se ve, y los restaura solos al seguir (sin mover las columnas laterales)', () => {
    iniciar(cont, prepararPartidaGuardada('resumenAnio', 2));

    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');
    expect(cont.querySelector('[data-bloque="atributos"]').classList.contains('oculto')).toBe(true);
    expect(cont.querySelector('[data-bloque="estado"]').classList.contains('oculto')).toBe(true);
    // Ocultos con CSS, no borrados: el contenido real sigue adentro.
    expect(cont.querySelector('[data-bloque="atributos"] .panel-peleador-atributo')).toBeTruthy();

    const boton = [...cont.querySelectorAll('button')].find((b) => b.textContent === 'Seguir');
    boton.click();
    vi.runAllTimers();

    expect(cont.querySelector('[data-bloque="atributos"]').classList.contains('oculto')).toBe(false);
    expect(cont.querySelector('[data-bloque="estado"]').classList.contains('oculto')).toBe(false);
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
  });

  it('sparring: se monta en el shell (grilla de paos) y terminar el drill aplica el resultado y vuelve al estado ocioso, sin pantalla aparte', () => {
    // v13 (Bloque 5.1): el 'sparring' suelto ya no existe (ver el comentario
    // grande de prepararPartidaGuardadaCampSparring, más arriba) — el mismo
    // minijuego se sigue jugando igual, ahora solo dentro del campamento de
    // una pelea firmada.
    iniciar(cont, prepararPartidaGuardadaCampSparring(3));

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
    const contenidoAntes = cont.querySelector('[data-bloque="contenido"]');
    terminar.click();
    vi.runAllTimers();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(contenidoAntes)).toBe(false);
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });

  it('ir a la ficha desde dentro de una decision descarta el shell, y volver lo reconstruye sin perder el beat pendiente', () => {
    iniciar(cont, prepararPartidaGuardada('mejora'));

    // No se fija un número exacto de tarjetas (decidirCantidadMejoras reparte
    // 2 o 3, ver cards.js) — lo que este test verifica es la navegación a la
    // Ficha y de vuelta, no la cantidad; por eso se buscan tarjetas en las
    // DOS variantes de grilla. Cambio 4 ("clickear el personaje ya no abre la
    // ficha"): el click que dispara la navegación es ahora el del bloque de
    // historial (dataset accion="historial"), no el de la cabecera.
    expect(cont.querySelectorAll('.panel-decision-grilla .tarjeta, .panel-decision-grilla-2 .tarjeta').length).toBeGreaterThan(0);

    cont.querySelector('[data-accion="historial"]').click();
    expect(cont.querySelector('.shell')).toBeNull();

    cont.querySelector('[data-accion="cerrar"]').click();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelectorAll('.panel-decision-grilla .tarjeta, .panel-decision-grilla-2 .tarjeta').length).toBeGreaterThan(0);
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
    // v6, segunda vuelta: en profesional ya no todos los bloques traen una
    // oferta JUGABLE (la mayoría de los cupos de pelea se resuelven solos,
    // ver armarLotePeleas en tramite.js), así que ya no alcanza con buscar
    // una semilla fija que "dé la casualidad" de traer 'evento' y 'oferta'
    // juntos en la misma cola natural — se arma a mano: se avanza bloque a
    // bloque hasta encontrar uno con una oferta jugable pendiente (mismo
    // criterio que primerPasoConOfertaPendiente en career.test.js), y se le
    // ANTEPONE el 'evento' sintético a esa oferta real ya encontrada. Lo que
    // importa para este test es la MECÁNICA (cancelar la oferta pendiente
    // de verdad, no solo en el texto), no la composición natural de la cola.
    //
    // v13 (Bloque 5/6, "el ritmo"): las peleas jugables (título, revancha,
    // archirrival, eliminatoria — esPeleaImportante, offers.js) le exigen al
    // jugador haberse ganado ese lugar (ranking, historial); forzar
    // `etapaIndice` a 'profesional' desde el bloque 1 (como hacía esta
    // función antes de esta ronda) deja un jugador de 15 años sin ninguna
    // pelea encima, así que nunca califica para una — y encima el reloj de
    // "profesional dura 18 años" corre igual, retirándolo antes de que
    // aparezca. Se avanza la carrera DE VERDAD, desde el arranque, con un
    // presupuesto de bloques generoso (500, mismo criterio que
    // avanzarHastaQue en el resto de este archivo) en vez del atajo viejo.
    let actual = crearPartida({ jugador, semilla: 14 });
    for (let intentos = 0; intentos < 500 && !actual.ofertaPendiente; intentos += 1) {
      const primerPaso = siguienteBeat(actual);
      if (primerPaso.partida.ofertaPendiente) { actual = primerPaso.partida; break; }
      let siguiente = primerPaso.partida;
      while (siguiente.cola.length > 0) siguiente = siguienteBeat(siguiente).partida;
      actual = siguiente;
    }
    const partida = actual;
    expect(partida.ofertaPendiente).not.toBeNull();
    expect(partida.proximaPelea).toBeNull();
    const ofertaBeat = partida.cola.find((b) => b.tipo === 'oferta');
    expect(ofertaBeat).toBeTruthy();

    const cartaSintetica = {
      id: 'riesgo_de_prueba', categoria: 'evento', titulo: 'Riesgo de prueba', texto: 'x',
      etapas: ['profesional'], rareza: 'normal',
      opciones: [
        { id: 'aceptar', texto: 'Arriesgarse', probabilidades: [
          { peso: 0, mods: {}, texto: 'no sale nunca en este test' },
          { peso: 1, mods: {}, caePelea: true, texto: 'Se cayó la pelea, de verdad.' },
        ] },
        { id: 'rechazar', texto: 'No arriesgarse', mods: {} },
      ],
    };
    const conCartaSintetica = {
      ...partida,
      cola: [{ tipo: 'evento', datos: { carta: cartaSintetica } }, ofertaBeat],
    };
    guardar(conCartaSintetica, storage);
    return storage;
  }

  it('elegir la rama que cae la pelea saca la oferta de la cola de verdad (no solo del texto); el panel de la derecha nunca mostró al rival sin firmar', () => {
    iniciar(cont, partidaConOfertaYCartaDeRiesgo());

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

    // semilla 11 -> carta "desafio_de_la_vereda", la opción "aceptar" SI
    // tiene probabilidades (mismo caso ya usado más arriba para probar el
    // roll — ver el comentario grande ahí).
    const { storage, opcionId } = prepararPartidaGuardadaEventoConAzar();
    iniciar(cont, storage);

    const tarjetaAzar = cont.querySelector(`[data-opcion="${opcionId}"]`);
    expect(tarjetaAzar).toBeTruthy();

    tarjetaAzar.click();

    // El roll está en curso (dura entre 1200 y 1800ms, ver DURACION_MS en
    // roll.js): a los 400ms todavía no llegó al desenlace.
    vi.advanceTimersByTime(400);
    expect(cont.querySelector('.panel-decision-desenlace')).toBeNull();

    // El jugador se va a la Ficha ANTES de que el roll termine (Cambio 4: el
    // click que abre la Ficha ahora vive en el bloque de historial, no en la
    // cabecera del peleador).
    cont.querySelector('[data-accion="historial"]').click();
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

    // Mismo caso que arriba (una carta con roll).
    const { storage, opcionId } = prepararPartidaGuardadaEventoConAzar();
    iniciar(cont, storage);

    const tarjetaAzar = cont.querySelector(`[data-opcion="${opcionId}"]`);
    tarjetaAzar.click();
    vi.advanceTimersByTime(400);

    cont.querySelector('[data-accion="historial"]').click();
    vi.advanceTimersByTime(2000); // no queda nada pendiente en segundo plano, en la Ficha

    cont.querySelector('[data-accion="cerrar"]').click();

    // De vuelta en el tablero: la carta que ya se resolvió NO vuelve a
    // aparecer, y lo que se muestra es el beat siguiente.
    //
    // La comprobación es por identidad de nodo, no por "no hay una grilla de
    // tarjetas": el beat que sigue puede ser perfectamente una mejora (tres
    // tarjetas), y de hecho lo es con la semilla actual. Lo que no puede pasar
    // es volver a la MISMA carta.
    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.contains(tarjetaAzar)).toBe(false);
    expect(cont.querySelector(`[data-opcion="${opcionId}"]`)).toBeNull();
    expect(cont.querySelector('[data-bloque="contenido"]').children.length).toBeGreaterThan(0);
  });
});

// Bug reportado por el usuario: "minijuego de sparring: falta el timer con
// la barra decreciendo". Al agregarlo (ui/screens/sparring.js), el primer
// "Empezar" programa un setTimeout de toda la ronda (DURACION_RONDA_MS,
// 7000ms desde el Pedido v6: un solo reloj para todo el minijuego, no por
// golpe) que fuerza el fin si se acaba el tiempo — mismo riesgo de timer
// colgado que ya se resolvió para el roll y el dado (hallazgo 1, más
// arriba): si el jugador se va a la Ficha con un pao prendido, ese timer no
// puede seguir corriendo en segundo plano contra un `centroContenido()` que
// la Ficha ya reemplazó.
describe('main.js: el timer del sparring no le puede robar la pantalla al jugador (bug reportado: falta el timer)', () => {
  it('entrar a la Ficha con un pao prendido y dejar que el timer expire en segundo plano no borra la Ficha', () => {
    // semilla 3: mismo caso ya usado más arriba para llegar a un campSparring
    // (ver prepararPartidaGuardadaCampSparring, más arriba: el 'sparring'
    // suelto ya no existe, v13/Bloque 5.1).
    iniciar(cont, prepararPartidaGuardadaCampSparring(3));

    expect(cont.querySelector('.grilla-paos')).toBeTruthy();
    cont.querySelector('[data-accion="empezar"]').click();
    expect(cont.querySelector('.pao.activo')).toBeTruthy();

    // El jugador se va a la Ficha con el pao todavía prendido, sin pegarle.
    cont.querySelector('[data-accion="historial"]').click();
    expect(cont.querySelector('.shell')).toBeNull();
    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();

    // Se deja correr el reloj de ronda en segundo plano (bien por encima de
    // su duración nominal, 7000ms): la Ficha tiene que seguir en pantalla,
    // intacta, hasta que el jugador toque "Cerrar" — nunca antes.
    vi.advanceTimersByTime(9000);

    expect(cont.querySelector('[data-accion="cerrar"]')).toBeTruthy();
    expect(cont.querySelector('.shell')).toBeNull();
  });

  // Verificación más fuerte que la de arriba: sin cancelar el timer, que se
  // acabe el tiempo mientras el jugador está en la Ficha terminaría el
  // minijuego solo (onTiempoAgotado), en segundo plano, sin que el jugador
  // tocara nada. Con 9000ms de sobra (por encima de los 7000ms totales) el
  // drill se daría por terminado solo. Al volver del tablero, el contador de
  // "Golpes" tiene que seguir en 0: el timer pendiente se corta ANTES de que
  // la Ficha reemplace la pantalla (abandonarSparringPendiente).
  it('el sparring no avanza solo en segundo plano mientras el jugador está en la Ficha', () => {
    iniciar(cont, prepararPartidaGuardadaCampSparring(3));

    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('[data-accion="historial"]').click();
    vi.advanceTimersByTime(9000);

    cont.querySelector('[data-accion="cerrar"]').click();

    expect(cont.querySelector('.shell')).toBeTruthy();
    expect(cont.querySelector('.grilla-paos')).toBeTruthy();
    // Rework v17: la fila de contadores del sparring pasó de 2 a 3 tiles
    // (Combo/Reacción/Golpes, mockup) — "Golpes" ahora es el TERCER
    // `.tile .valor` del panel, no el segundo. Ver renderSparring,
    // ui/screens/sparring.js.
    const golpes = [...cont.querySelectorAll('.tile .valor')][2];
    expect(golpes.textContent).toBe('0/10');
  });
});

// Regresión pedida en la revisión de las Tasks 5.3/5.4: con la tienda como
// popup, el tablero queda VISIBLE detrás mientras se compra. Que la plata
// quedara congelada ahí rompía las dos reglas de la v2 ("el tablero nunca
// desaparece" y "los cambios se ven ocurrir") — antes no se notaba porque las
// pantallas se reemplazaban enteras, pero acá el tablero sigue a la vista.
// Dinero se mudó a la columna derecha con la reforma de grilla 3×3 (v4):
// `abrirTienda`/`refrescarDinero` en main.js ahora refrescan quirúrgicamente
// SOLO ese sub-nodo (`[data-bloque="dinero"]`), no toda la columna derecha —
// calendario/recursos/próxima/noticias, que viven al lado, no se tocan.
describe('main.js: la tienda abierta durante un beat refresca el panel de dinero (derecha) detrás del popup', () => {
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

  it('comprar dentro del popup actualiza la plata detrás, sin cerrar el popup ni tocar el centro del shell ni el resto de la derecha', () => {
    const storage = partidaConBeatYPlata(200000);
    // v13: `avanzarHasta` (más arriba) puede resolver de paso alguna pelea de
    // trámite de formación (juvenil/amateur, `etapa.probPelea`) antes de
    // llegar al primer 'mejora' — esa bolsa (chica, pero real) ya está sumada
    // al dinero cuando se guarda la partida. Se lee el dinero YA GUARDADO
    // (no los 200000 de arranque) para no depender de que ese intento
    // aleatorio de pelea haya salido o no en esta semilla puntual.
    const dineroInicial = cargar(storage).jugador.dinero;
    iniciar(cont, storage);

    expect(cont.querySelector('.shell')).toBeTruthy();
    const refCentro = cont.querySelector('.shell-centro');
    const refDerecha = cont.querySelector('.shell-derecha');
    // Referencia de un sub-nodo VECINO del dinero, dentro de la misma columna
    // (calendario): tiene que sobrevivir intacto, prueba de que el refresco
    // es quirúrgico y no repinta toda la columna derecha.
    const refCalendario = cont.querySelector('.shell-derecha [data-bloque="calendario"]');
    expect(refCalendario).toBeTruthy();
    const dineroAntes = cont.querySelector('.shell-derecha').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroAntes).toBeTruthy();

    cont.querySelector('.shell-derecha [data-accion="tienda"]').click();
    expect(document.querySelector('.popup-overlay')).toBeTruthy();

    document.querySelector('[data-item="kinesiologo"]').click();

    // El popup sigue abierto (uno solo, no se cerró ni se duplicó)...
    expect(document.querySelectorAll('.popup-overlay')).toHaveLength(1);
    // ...el foco no se escapó hacia atrás, al panel que se acaba de repintar...
    expect(cont.querySelector('.shell-derecha').contains(document.activeElement)).toBe(false);
    // ...y el panel de dinero, DETRÁS del popup, ya muestra la plata nueva
    // (dineroInicial - 16000 del kinesiólogo, precio recalibrado en Sistema 3).
    const dineroDespues = cont.querySelector('.shell-derecha').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroDespues).not.toBe(dineroAntes);
    expect(dineroDespues).toBe(fmtDinero(dineroInicial - 16000));

    // El centro no se tocó, la región derecha sigue siendo el mismo nodo, y
    // su vecino (calendario) ni se repintó: solo el sub-nodo de dinero
    // cambió.
    expect(cont.querySelector('.shell-centro')).toBe(refCentro);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.querySelector('.shell-derecha [data-bloque="calendario"]')).toBe(refCalendario);
  });

  it('un item impagable dentro del popup no rompe nada y el panel de atrás sigue mostrando la misma plata', () => {
    iniciar(cont, partidaConBeatYPlata(0));

    cont.querySelector('.shell-derecha [data-accion="tienda"]').click();
    const dineroAntes = cont.querySelector('.shell-derecha').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];

    document.querySelector('[data-item="manager"]').click();

    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    const dineroDespues = cont.querySelector('.shell-derecha').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroDespues).toBe(dineroAntes);
  });
});
