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

    // Referencias de nodo capturadas ANTES de elegir: son la garantía central
    // del rediseño (spec: "el tablero nunca desaparece"). Si el shell se
    // recrea en vez de reutilizarse, estas referencias quedan viejas y las
    // comparaciones de identidad de abajo fallan aunque `.shell` exista.
    const refIzquierda = cont.querySelector('.shell-izquierda');
    const refDerecha = cont.querySelector('.shell-derecha');

    const grilla = cont.querySelector('.panel-decision-grilla');
    const tarjetaAzar = grilla.querySelector('[data-opcion="cambiar"]');
    expect(tarjetaAzar).toBeTruthy();
    expect(tarjetaAzar.querySelectorAll('.tarjeta-efecto').length).toBe(2);

    tarjetaAzar.click();

    // Todavía en pleno roll (antes de vaciar los temporizadores): el tablero
    // lateral tiene que seguir siendo EXACTAMENTE el mismo nodo.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);

    vi.runAllTimers();

    // con prefers-reduced-motion el roll resuelve directo, pero de todos
    // modos deja fijo el resultado ganador iluminado en la propia tarjeta.
    const iluminados = tarjetaAzar.querySelectorAll('.tarjeta-efecto.iluminado');
    expect(iluminados).toHaveLength(1);

    expect(cont.querySelector('.shell')).toBeTruthy();
    // Después del roll y de mostrar el desenlace (que repinta el panel
    // izquierdo con los valores finales y lo anima), el nodo `aside` de cada
    // región lateral sigue siendo el mismo: solo cambió su CONTENIDO interno,
    // nunca la región en sí ni el `.shell` que la contiene.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    expect(cont.querySelectorAll('.shell')).toHaveLength(1);

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
    // desmonta, a diferencia de lo que pasaba antes de esta revisión.
    expect(cont.querySelector('.shell-izquierda')).toBe(refIzquierda);
    expect(cont.querySelector('.shell-derecha')).toBe(refDerecha);
    const seguir = cont.querySelector('.panel-decision-desenlace .boton');
    expect(seguir).toBeTruthy();
    seguir.click();
    expect(cont.querySelector('[data-accion="siguiente"]')).toBeTruthy();
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
    // (200000 - 90000 del kinesiólogo = 110000).
    const dineroDespues = cont.querySelector('.shell-izquierda').textContent.match(/US\$\s?[\d.,]+[A-Z]?/)?.[0];
    expect(dineroDespues).not.toBe(dineroAntes);
    expect(dineroDespues).toBe('US$ 110K');

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
