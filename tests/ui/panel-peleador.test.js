import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { createRng } from '../../src/core/rng.js';
import { crearPartida } from '../../src/core/career.js';
import { rankingDelJugador, tablaRanking } from '../../src/core/world.js';
import { STAFF } from '../../src/core/money.js';
import { DECISIONES_ANTES_DE_OPINAR } from '../../src/content/senales-talento.js';
import {
  renderPanelPeleador, renderPanelAtributos, renderPanelEstado, renderPanelDinero,
} from '../../src/ui/screens/panel-peleador.js';

// Grilla 3×3 (v4, feedback del usuario: "en PC no se aprovecha bien el
// ancho"): el que antes era un solo panel-peleador larguísimo (columna
// izquierda entera) se repartió en varios paneles persistentes, cada uno con
// su celda fija — ver el comentario largo al principio de panel-peleador.js.
// Este archivo prueba cada exportación por separado, agrupada según qué
// celda del tablero pinta ahora.
//
// v13 (simplificación de atributos y progresión): de seis atributos + cinco
// estados a cuatro atributos y nada más (fuerza, defensa, cardio, agilidad),
// sin fama. Este archivo se reescribió para probar el diseño nuevo — ya no
// hay "renderPanelEstado" con mentón/disciplina/forma/moral (ver su propio
// describe, más abajo: ahora solo pinta la lesión).

function partidaBase({ media = 55 } = {}) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 1 });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderPanelPeleador (columna izquierda: personaje, rincón, categoría/ranking)', () => {
  it('el color y el nombre del rango de MEDIA cambian segun la MEDIA', () => {
    const bajo = partidaBase({ media: 30 });
    renderPanelPeleador(cont, { partida: bajo });
    expect(cont.textContent).toContain('Hierro');
    const cuadro = cont.querySelector('[data-rango-media]');
    expect(cuadro.style.getPropertyValue('--rango-color') || cuadro.style.color || cuadro.style.background)
      .toBeTruthy();

    const alto = partidaBase({ media: 92 });
    renderPanelPeleador(cont, { partida: alto });
    expect(cont.textContent).toContain('Platino');
  });

  it('sin peleas todavia, el ranking dice "Sin clasificar"', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Sin clasificar');
  });

  // El puesto se calcula EN VIVO (rankingDelJugador, world.js), no leyendo
  // jugador.ranking: ese campo cacheado se deja deliberadamente "stale" acá
  // (999, un valor que nunca daría el cálculo real) para probar que el panel
  // no confía en él.
  it('despues de la primera pelea, muestra un numero de ranking calculado en vivo', () => {
    const p = partidaBase();
    p.jugador.record = { v: 1, d: 0, e: 0, ko: 1, sub: 0, dec: 0 };
    p.jugador.ranking = 999;
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).not.toContain('Sin clasificar');
    expect(cont.textContent).not.toContain('#999');
    const puestoReal = rankingDelJugador(p.mundo, p.jugador);
    expect(cont.textContent).toContain(`#${puestoReal}`);
  });

  // Regresión Fix 2 (cierre de ronda v3, feedback del usuario: el ranking del
  // panel y el de la tabla podían no coincidir). `jugador.ranking` se
  // recalculaba una sola vez por bloque (avanzarBloque, career.js) mientras
  // que el popup de tablaRanking recalculaba en vivo cada vez que se abría:
  // si algo cambiaba la media del jugador a mitad de bloque (una carta, el
  // campamento), el "#N" del panel quedaba viejo. Ahora ambos salen de la
  // MISMA función (rankingDelJugador) con el mismo mundo/jugador, así que
  // nunca pueden discrepar — se prueba forzando un jugador.ranking cacheado
  // bien distinto del puesto real.
  it('el ranking del panel coincide siempre con el puesto del jugador en tablaRanking', () => {
    const p = partidaBase();
    p.jugador.record = { v: 3, d: 1, e: 0, ko: 2, sub: 0, dec: 0 };
    p.jugador.atributos.fuerza = Math.min(99, p.jugador.atributos.fuerza + 15);
    p.jugador.ranking = 1; // deliberadamente stale, no el puesto real

    renderPanelPeleador(cont, { partida: p });
    const filaJugador = tablaRanking(p.mundo, p.jugador).find((f) => f.esJugador);
    expect(cont.textContent).toContain(`#${filaJugador.ranking}`);
  });

  it('usa la bandera SVG y no el emoji', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(cont.textContent).not.toContain('🇦🇷');
  });

  it('no rompe con un peleador recien creado (sin historial, sin titulos, sin entrenador)', () => {
    const p = partidaBase();
    expect(() => renderPanelPeleador(cont, { partida: p })).not.toThrow();
    expect(cont.textContent).toContain('Sin clasificar');
  });

  // Pedido 5 (v9): las 3 cajas (Regional/Nacional/Mundial) están SIEMPRE,
  // "apagadas" de entrada, no solo cuando el jugador ya tiene algún título —
  // eso era, además, el mismo bug de tamaño variable del Pedido 1.
  describe('cinturones (Pedido 5, v9: 3 cajas fijas, apagadas/encendidas)', () => {
    it('muestra las 3 cajas siempre, incluso sin ningún título todavía', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      const cajas = cont.querySelectorAll('.cinturon-caja');
      expect(cajas).toHaveLength(3);
      expect(cont.querySelector('[data-cinturon="regional"]')).toBeTruthy();
      expect(cont.querySelector('[data-cinturon="nacional"]')).toBeTruthy();
      expect(cont.querySelector('[data-cinturon="mundial"]')).toBeTruthy();
      for (const caja of cajas) expect(caja.classList.contains('encendida')).toBe(false);
    });

    it('enciende solo la caja del cinturón que el jugador tiene puesto', () => {
      const p = partidaBase();
      p.jugador.titulos = ['Cinturón regional'];
      renderPanelPeleador(cont, { partida: p });
      expect(cont.querySelector('[data-cinturon="regional"]').classList.contains('encendida')).toBe(true);
      expect(cont.querySelector('[data-cinturon="nacional"]').classList.contains('encendida')).toBe(false);
      expect(cont.querySelector('[data-cinturon="mundial"]').classList.contains('encendida')).toBe(false);
    });

    it('se apaga si el jugador ya no lo tiene (perdió una defensa)', () => {
      const p = partidaBase();
      p.jugador.titulos = [];
      renderPanelPeleador(cont, { partida: p });
      expect(cont.querySelector('[data-cinturon="regional"]').classList.contains('encendida')).toBe(false);
    });

    it('al clickear una caja, abre un popup con el historial de ese cinturón (más reciente primero)', () => {
      const p = partidaBase();
      p.jugador.titulos = ['Cinturón regional'];
      p.jugador.historial = [
        {
          rivalId: 'r1', rivalNombre: 'Viejo Rival', rivalApodo: 'El Viejo', resultado: 'v',
          metodo: 'ko', round: 3, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 10,
        },
        {
          rivalId: 'r2', rivalNombre: 'Nuevo Rival', rivalApodo: 'El Nuevo', resultado: 'v',
          metodo: 'decision', round: 8, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 60,
        },
      ];
      renderPanelPeleador(cont, { partida: p });
      cont.querySelector('[data-cinturon="regional"]').click();

      const popup = document.querySelector('.popup-panel');
      expect(popup).toBeTruthy();
      expect(popup.textContent).toContain('Cinturón regional');
      const filas = popup.querySelectorAll('.historial-cinturon-fila');
      expect(filas).toHaveLength(2);
      // Más reciente (fecha 60, la defensa) primero.
      expect(filas[0].textContent).toContain('El Nuevo');
      expect(filas[1].textContent).toContain('El Viejo');
      popup.parentElement.querySelector('.popup-cerrar').click();
    });

    it('el popup avisa si todavía no hay peleas por ese cinturón, en vez de quedar vacío', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      cont.querySelector('[data-cinturon="mundial"]').click();
      const popup = document.querySelector('.popup-panel');
      expect(popup.textContent.length).toBeGreaterThan('Cinturón mundial'.length);
      popup.querySelector('.popup-cerrar').click();
    });
  });

  it('muestra el entrenador (tu rincón), con su frase', () => {
    const p = partidaBase();
    p.jugador.entrenador = {
      nombre: 'Don Pepe',
      iniciales: 'DP',
      escuela: 'escuela técnica',
      frase: 'Pensá antes de tirar.',
      aporte: { defensa: 6, agilidad: 4 },
    };
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Don Pepe');
    expect(cont.textContent).toContain('Pensá antes de tirar.');
  });

  // v13, spec ("el talento se intuye, no se lee"): el entrenador va tirando
  // señales sobre cómo viene rindiendo el pibe, en el mismo rincón donde ya
  // habla. Antes de la quinta decisión (DECISIONES_ANTES_DE_OPINAR) no hay
  // con qué opinar todavía.
  describe('señal de talento (Tu rincón)', () => {
    it('no aparece todavia si el jugador arranco la carrera (pocas decisiones tomadas)', () => {
      const p = partidaBase();
      p.bloqueGlobal = 1; // decisionesTomadas = 0
      renderPanelPeleador(cont, { partida: p });
      expect(cont.querySelector('.rincon-senal-talento')).toBeNull();
    });

    it('aparece una vez que hubo suficientes decisiones, sin mostrar nunca un numero', () => {
      const p = partidaBase();
      p.bloqueGlobal = DECISIONES_ANTES_DE_OPINAR + 5;
      renderPanelPeleador(cont, { partida: p });
      const senal = cont.querySelector('.rincon-senal-talento');
      expect(senal).toBeTruthy();
      expect(senal.textContent.length).toBeGreaterThan(0);
      expect(senal.textContent).not.toMatch(/\d/);
    });

    it('no reemplaza la frase fija del entrenador: las dos conviven', () => {
      const p = partidaBase();
      p.bloqueGlobal = DECISIONES_ANTES_DE_OPINAR + 5;
      p.jugador.entrenador = {
        nombre: 'Don Pepe', iniciales: 'DP', escuela: 'escuela técnica', frase: 'Pensá antes de tirar.', aporte: {},
      };
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain('Pensá antes de tirar.');
      expect(cont.querySelector('.rincon-senal-talento')).toBeTruthy();
    });
  });

  // Cabecera rearmada (Cambio 3): PESO | MANO HÁBIL | EDAD, sin fama (v13: se
  // va del juego, ver stats.js) ni forma (ídem).
  describe('cabecera rearmada (Cambio 3: media + identidad + datos)', () => {
    it('muestra peso (categoría) y mano hábil', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain('Peso');
      expect(cont.textContent).toContain('Pluma');
      expect(cont.textContent).toContain('Mano hábil');
      expect(cont.textContent).toContain('Derecha');
    });

    it('muestra la edad', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain(`${Math.floor(p.jugador.edad)} años`);
    });

    // Pedido 4 (v9, "dice 'En Punto' pero también dice 'En Declive' ¿no es
    // contradictorio?"): la cabecera ya NO muestra el estado de forma
    // ("En Punto"/"Normal"/"Oxidado") — se saca de acá para no convivir con
    // la fase física (ver describe "fase física" más abajo), que es la que
    // queda. v13: la forma desapareció del todo del juego, así que esta
    // garantía ahora es incondicional.
    it('ya NO muestra el estado de forma ("En Punto"/"Normal"/"Oxidado"): esa lectura ya no existe', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      const cabecera = cont.querySelector('.panel-peleador-cabecera');
      expect(cabecera.textContent).not.toContain('Forma');
      expect(cabecera.textContent).not.toContain('NORMAL');
      expect(cabecera.textContent).not.toContain('EN PUNTO');
      expect(cabecera.textContent).not.toContain('OXIDADO');
    });

    // v13 (spec, "se va la fama: no hacía nada relevante"): ya no vive en
    // ningún lado del tablero, ni acá ni en un panel aparte.
    it('ya NO muestra la fama en ningún lado de la cabecera', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      const cabecera = cont.querySelector('.panel-peleador-cabecera');
      expect(cabecera.textContent).not.toContain('Fama');
    });

    it('apodo y apellido van en renglones propios (el nombre respira, no se aprieta en una sola linea)', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      const apodo = cont.querySelector('.cabecera-apodo');
      const apellido = cont.querySelector('.cabecera-apellido');
      expect(apodo.textContent).toContain('RELÁMPAGO');
      expect(apellido.textContent).toContain('ORTIZ');
      // Bandera SVG junto al apodo (nunca un emoji de bandera).
      expect(apodo.querySelector('svg.bandera-svg')).toBeTruthy();
    });

    it('sin apodo, el apellido sube a la linea de arriba (nunca deja un renglon vacio)', () => {
      const p = partidaBase();
      p.jugador.apodo = null;
      renderPanelPeleador(cont, { partida: p });
      const apodo = cont.querySelector('.cabecera-apodo');
      expect(apodo.textContent).toContain('ORTIZ');
      expect(cont.querySelector('.cabecera-apellido')).toBeNull();
    });
  });

  // La etapa (v4, feedback del usuario: "en PC no se aprovecha bien el
  // ancho"): se mudó acá desde panel-avance.js — antes solo se veía en el
  // estado ocioso, ahora es un bloque permanente junto a categoría/ranking,
  // visible aunque el jugador esté en medio de una decisión.
  it('muestra la etapa actual (nombre y frase), siempre, no solo en el estado ocioso', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent.toUpperCase()).toContain('JUVENIL');
    expect(cont.textContent).toContain('Nadie sabe quién sos. Todavía.');
  });

  // Sistema 2 (feedback del usuario: "hay una edad donde el prime va
  // bajando... el tablero debería poder comunicarlo"): la fase física
  // (ascenso/prime/declive, faseFisicaJugador en career.js) vive en el
  // panel siempre visible, no escondida en una pantalla aparte — así el
  // jugador puede verla venir antes de que el declive real le pegue.
  describe('fase física (Sistema 2, arco del prime)', () => {
    it('un jugador joven, lejos del declive, se muestra "en ascenso"', () => {
      const p = partidaBase();
      p.jugador.edad = 20;
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain('En ascenso');
    });

    it('cerca del umbral de declive (sin cruzarlo), se muestra "en tu prime"', () => {
      const p = partidaBase();
      p.jugador.edad = 31;
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain('En tu prime');
    });

    it('pasado el umbral de declive, avisa "en declive"', () => {
      const p = partidaBase();
      p.jugador.edad = 34;
      renderPanelPeleador(cont, { partida: p });
      expect(cont.textContent).toContain('En declive');
    });
  });

  it('dispara el callback de historial', () => {
    const p = partidaBase();
    let historial = 0;
    renderPanelPeleador(cont, {
      partida: p,
      onHistorial: () => { historial += 1; },
    });
    cont.querySelector('[data-accion="historial"]').click();
    expect(historial).toBe(1);
  });

  // Cambio 4 (pedido textual: "no quiero que al clickear en mi personaje se
  // abra la ficha, eso está obsoleto"): la cabecera ya no es un control
  // clickeable — ni el dataset viejo, ni los atributos de accesibilidad que
  // lo acompañaban (role/tabindex/aria-label), ni el cursor de mano.
  it('la cabecera del peleador ya NO es clickeable (Cambio 4: se saca la interaccion, no queda como control obsoleto)', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    const cabecera = cont.querySelector('.panel-peleador-cabecera');
    expect(cabecera).toBeTruthy();
    expect(cabecera.getAttribute('role')).toBeNull();
    expect(cabecera.getAttribute('tabindex')).toBeNull();
    expect(cabecera.getAttribute('aria-label')).toBeNull();
    expect(cont.querySelector('[data-accion="ficha"]')).toBeNull();
  });

  // Feedback del usuario: "ranking aparece, pero no puedo ver quiénes están
  // por encima o por debajo de mí" — el botón vive DENTRO del bloque de
  // récord/ranking (que ya es clickeable entero hacia el historial), así que
  // tiene que disparar SU callback propio sin activar también onHistorial.
  it('el botón "ver ranking" dispara onVerRanking, sin disparar también onHistorial', () => {
    const p = partidaBase();
    let ranking = 0; let historial = 0;
    renderPanelPeleador(cont, {
      partida: p,
      onVerRanking: () => { ranking += 1; },
      onHistorial: () => { historial += 1; },
    });
    cont.querySelector('[data-accion="ver-ranking"]').click();
    expect(ranking).toBe(1);
    expect(historial).toBe(0);
  });
});

describe('renderPanelAtributos (columna central, arriba del módulo de decisión)', () => {
  // v13: cuatro cuadros — fuerza, defensa, cardio, agilidad — en una sola
  // fila, del mismo tamaño (mismo patrón que antes con seis).
  it('muestra exactamente los cuatro atributos, en su orden fijo', () => {
    const p = partidaBase();
    renderPanelAtributos(cont, { jugador: p.jugador });
    const cuadros = cont.querySelectorAll('.panel-peleador-atributo');
    expect(cuadros).toHaveLength(4);
    expect([...cuadros].map((c) => c.dataset.atributo)).toEqual(['fuerza', 'defensa', 'cardio', 'agilidad']);
  });

  it('muestra el aporte del entrenador resaltado', () => {
    const p = partidaBase();
    p.jugador.entrenador = {
      nombre: 'Don Pepe',
      iniciales: 'DP',
      escuela: 'escuela técnica',
      frase: 'Pensá antes de tirar.',
      aporte: { defensa: 6, agilidad: 4 },
    };
    renderPanelAtributos(cont, { jugador: p.jugador });
    const filaDefensa = cont.querySelector('[data-atributo="defensa"]');
    expect(filaDefensa.classList.contains('con-aporte')).toBe(true);
    expect(filaDefensa.textContent).toContain('+6');
    const filaCardio = cont.querySelector('[data-atributo="cardio"]');
    expect(filaCardio.classList.contains('con-aporte')).toBe(false);
  });

  // Regresión de la revisión del Bloque 5: el aporte del entrenador se
  // hornea en `jugador.atributos` (crearPeleador) para que la pelea, el
  // ranking y las ofertas lo usen de verdad. El panel mostraba ese valor YA
  // horneado y encima le sumaba el badge "+N" al lado, duplicando el aporte
  // a la vista ("64 +6" cuando el atributo real es 64, no 70). El número
  // grande tiene que ser la BASE sin entrenador; el badge, lo que él aporta.
  it('el numero base que se pinta NO incluye el aporte del entrenador (no lo duplica)', () => {
    // partidaBase() usa estilo 'tecnico', que trae al Profesor Aldana con
    // aporte real {defensa: 6, agilidad: 2} ya horneado en jugador.atributos.
    const p = partidaBase();
    const { jugador } = p;
    expect(jugador.entrenador).toBeTruthy();
    const aporteDefensa = jugador.entrenador.aporte.defensa;
    expect(aporteDefensa).toBeGreaterThan(0);

    renderPanelAtributos(cont, { jugador });

    const filaDefensa = cont.querySelector('[data-atributo="defensa"]');
    const baseMostrada = Number(filaDefensa.querySelector('.valor').textContent);

    // La base pintada NO es el atributo horneado (no está duplicando el
    // aporte encima de un valor que ya lo incluye)...
    expect(baseMostrada).not.toBe(jugador.atributos.defensa);
    // ...y base + aporte da EXACTAMENTE el atributo real que usa la pelea
    // (la invariante documentada en atributosConEntrenador, coach.js).
    expect(baseMostrada + aporteDefensa).toBe(jugador.atributos.defensa);
    expect(filaDefensa.textContent).toContain(`+${aporteDefensa}`);
  });

  it('"aporte del entrenador" se muestra como una etiqueta chica, no como un titulo', () => {
    const p = partidaBase();
    renderPanelAtributos(cont, { jugador: p.jugador });
    const tag = cont.querySelector('.panel-peleador-aporte-etiqueta');
    expect(tag).toBeTruthy();
    expect(tag.textContent).toContain('aporte del entrenador');
  });

  // v13: la sección de Estado desaparece entera del tablero (ver el describe
  // de renderPanelEstado, más abajo) — ninguno de sus viejos atributos
  // (forma, moral, mentón, disciplina personal) puede aparecer acá.
  it('no muestra la seccion de estado (ya eliminada del todo)', () => {
    const p = partidaBase();
    renderPanelAtributos(cont, { jugador: p.jugador });
    expect(cont.querySelector('[data-atributo="forma"]')).toBeNull();
    expect(cont.querySelector('[data-atributo="moral"]')).toBeNull();
    expect(cont.querySelector('[data-atributo="menton"]')).toBeNull();
    expect(cont.querySelector('[data-atributo="disciplinaPersonal"]')).toBeNull();
  });

  // v8 (pedido textual: "NO quiero que estén resumidos los títulos"): los
  // cuadros de atributos muestran el nombre COMPLETO (Fuerza, Defensa,
  // Cardio, Agilidad), nunca la abreviatura de 3 letras.
  it('muestra el nombre completo de cada atributo, nunca la abreviatura', () => {
    const p = partidaBase();
    renderPanelAtributos(cont, { jugador: p.jugador });

    const nombreDe = (clave) => cont.querySelector(`[data-atributo="${clave}"] .nombre`).textContent;
    expect(nombreDe('fuerza')).toBe('Fuerza');
    expect(nombreDe('defensa')).toBe('Defensa');
    expect(nombreDe('cardio')).toBe('Cardio');
    expect(nombreDe('agilidad')).toBe('Agilidad');
  });
});

// v13 (simplificación de atributos): mentón, disciplina personal, forma y
// moral desaparecen del todo — `renderPanelEstado` (mismo nombre, mismo
// hueco del tablero) ya no pinta ningún cuadro de "estado": lo único que
// sigue viviendo acá es el aviso de lesión + su botón de curar.
describe('renderPanelEstado (columna central, debajo de atributos: ahora solo la lesión)', () => {
  it('sin lesión, no pinta nada (ni un panel vacío con titulo "Estado")', () => {
    const p = partidaBase();
    renderPanelEstado(cont, { jugador: p.jugador });
    expect(cont.textContent).not.toContain('Estado');
    expect(cont.querySelector('.panel-lesion')).toBeNull();
  });

  it('con una lesión activa, muestra su nombre, las semanas restantes y el boton de curar', () => {
    const p = partidaBase();
    p.jugador.estado.lesion = { nombre: 'Corte en el ojo', semanasRestantes: 3, costo: 500 };
    p.jugador.dinero = 1000;
    renderPanelEstado(cont, { jugador: p.jugador, onCurar: () => {} });
    const lesion = cont.querySelector('.panel-lesion');
    expect(lesion).toBeTruthy();
    expect(lesion.textContent).toContain('Corte en el ojo');
    expect(lesion.textContent).toContain('3');
    expect(cont.querySelector('[data-accion="curar"]')).toBeTruthy();
  });

  it('no muestra ningun cuadro de atributo (ni fatiga): la lesión no es un numero mas de la grilla', () => {
    const p = partidaBase();
    p.jugador.estado.lesion = { nombre: 'Corte en el ojo', semanasRestantes: 3, costo: 500 };
    renderPanelEstado(cont, { jugador: p.jugador });
    expect(cont.querySelector('[data-atributo="fatiga"]')).toBeNull();
    expect(cont.querySelector('.panel-peleador-atributo')).toBeNull();
  });
});

describe('renderPanelDinero (columna derecha, junto al calendario)', () => {
  it('dice "Dinero", nunca "Plata"', () => {
    const p = partidaBase();
    p.jugador.dinero = 45000;
    renderPanelDinero(cont, { jugador: p.jugador });
    expect(cont.textContent).toContain('Dinero');
    expect(cont.textContent).not.toMatch(/\bPlata\b/);
  });

  it('dispara el callback de tienda', () => {
    const p = partidaBase();
    let tienda = 0;
    renderPanelDinero(cont, { jugador: p.jugador, onTienda: () => { tienda += 1; } });
    cont.querySelector('[data-accion="tienda"]').click();
    expect(tienda).toBe(1);
  });

  // Pedido 7 (v9, "quiero que brille cuando el jugador pueda comprar algo
  // con el dinero que tiene, y no sea algo ya comprado"): la clase `brillo`
  // en el botón de la tienda es la señal — se prueba acá con plata real
  // (STAFF[0], el ítem más barato, ver money.js) en vez de mockear
  // `puedeComprarAlgo`, así el test también cubre que panel-peleador.js está
  // usando esa función de verdad.
  it('el botón de la tienda brilla si el jugador puede comprar algo nuevo', () => {
    const p = partidaBase();
    p.jugador.dinero = STAFF[0].precio;
    p.jugador.staff = [];
    renderPanelDinero(cont, { jugador: p.jugador });
    expect(cont.querySelector('[data-accion="tienda"]').classList.contains('brillo')).toBe(true);
  });

  it('el botón de la tienda NO brilla sin plata para nada', () => {
    const p = partidaBase();
    p.jugador.dinero = 0;
    p.jugador.staff = [];
    p.jugador.lujos = [];
    renderPanelDinero(cont, { jugador: p.jugador });
    expect(cont.querySelector('[data-accion="tienda"]').classList.contains('brillo')).toBe(false);
  });

  it('el botón de la tienda NO brilla si ya tiene comprado todo lo que puede pagar', () => {
    const p = partidaBase();
    p.jugador.dinero = STAFF[0].precio;
    p.jugador.staff = [STAFF[0].id];
    renderPanelDinero(cont, { jugador: p.jugador });
    expect(cont.querySelector('[data-accion="tienda"]').classList.contains('brillo')).toBe(false);
  });
});

// El bug reportado en v17.1: "tengo 93 de fuerza, elijo una tarjeta que suma 4
// y sigue mostrando 93". El 93 era la BASE — el entrenador ponía +6 y el total
// ya estaba en el tope de 99, así que la carta se aplicaba y no entraba nada.
// La interfaz no decía en ningún lado que ese número no podía subir más.
describe('panel de atributos — el tope', () => {
  function jugadorCon(atributos, entrenador = null) {
    return {
      ...crearPeleador({
        apellido: 'X', apodo: 'Y', nacionalidad: 'AR', disciplina: 'boxeo',
        estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 80, esJugador: true,
        rng: createRng(1),
      }),
      atributos,
      entrenador,
    };
  }

  it('avisa "tope" en el atributo que llegó a 99 contando el aporte del entrenador', () => {
    const cont = document.createElement('div');
    renderPanelAtributos(cont, {
      jugador: jugadorCon({ fuerza: 99, defensa: 90, cardio: 88, agilidad: 85 }),
    });

    const fuerza = cont.querySelector('[data-atributo="fuerza"]');
    expect(fuerza.dataset.tope).toBe('si');
    expect(fuerza.querySelector('.atributo-tope')).toBeTruthy();
  });

  it('no avisa nada en los atributos que todavía pueden subir', () => {
    const cont = document.createElement('div');
    renderPanelAtributos(cont, {
      jugador: jugadorCon({ fuerza: 99, defensa: 90, cardio: 88, agilidad: 85 }),
    });

    for (const clave of ['defensa', 'cardio', 'agilidad']) {
      expect(cont.querySelector(`[data-atributo="${clave}"] .atributo-tope`)).toBeNull();
    }
  });

  it('el aviso mira el TOTAL, no la base: base 93 + 6 del entrenador ya es tope', () => {
    const cont = document.createElement('div');
    // `atributos` ya trae el aporte adentro (así vive en el juego), así que
    // 99 = 93 de base + 6 del entrenador: el cuadro muestra 93 y avisa tope.
    renderPanelAtributos(cont, {
      jugador: jugadorCon(
        { fuerza: 99, defensa: 90, cardio: 88, agilidad: 85 },
        { nombre: 'Aldana', iniciales: 'PA', escuela: 'x', frase: 'y', aporte: { fuerza: 6 } },
      ),
    });

    const fuerza = cont.querySelector('[data-atributo="fuerza"]');
    expect(fuerza.querySelector('.valor').textContent).toBe('93');
    expect(fuerza.querySelector('.atributo-tope')).toBeTruthy();
  });
});
