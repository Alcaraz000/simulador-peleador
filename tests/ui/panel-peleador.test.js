import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { rankingDelJugador, tablaRanking } from '../../src/core/world.js';
import { renderPanelPeleador } from '../../src/ui/screens/panel-peleador.js';

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

describe('renderPanelPeleador', () => {
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

  it('muestra el entrenador y su aporte resaltado', () => {
    const p = partidaBase();
    p.jugador.entrenador = {
      nombre: 'Don Pepe',
      iniciales: 'DP',
      escuela: 'escuela técnica',
      frase: 'Pensá antes de tirar.',
      aporte: { tecnica: 6, defensa: 4 },
    };
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Don Pepe');
    expect(cont.textContent).toContain('Pensá antes de tirar.');
    const filaTecnica = cont.querySelector('[data-atributo="tecnica"]');
    expect(filaTecnica.classList.contains('con-aporte')).toBe(true);
    expect(filaTecnica.textContent).toContain('+6');
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
    // partidaBase() usa estilo 'tecnico', que trae a El Profesor Aldana con
    // aporte real {tecnica: 6, iq: 2} ya horneado en jugador.atributos.
    const p = partidaBase();
    const { jugador } = p;
    expect(jugador.entrenador).toBeTruthy();
    const aporteTecnica = jugador.entrenador.aporte.tecnica;
    expect(aporteTecnica).toBeGreaterThan(0);

    renderPanelPeleador(cont, { partida: p });

    const filaTecnica = cont.querySelector('[data-atributo="tecnica"]');
    const baseMostrada = Number(filaTecnica.querySelector('.valor').textContent);

    // La base pintada NO es el atributo horneado (no está duplicando el
    // aporte encima de un valor que ya lo incluye)...
    expect(baseMostrada).not.toBe(jugador.atributos.tecnica);
    // ...y base + aporte da EXACTAMENTE el atributo real que usa la pelea
    // (la invariante documentada en atributosConEntrenador, coach.js).
    expect(baseMostrada + aporteTecnica).toBe(jugador.atributos.tecnica);
    expect(filaTecnica.textContent).toContain(`+${aporteTecnica}`);
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
    p.jugador.atributos.potencia = Math.min(99, p.jugador.atributos.potencia + 15);
    p.jugador.ranking = 1; // deliberadamente stale, no el puesto real

    renderPanelPeleador(cont, { partida: p });
    const filaJugador = tablaRanking(p.mundo, p.jugador).find((f) => f.esJugador);
    expect(cont.textContent).toContain(`#${filaJugador.ranking}`);
  });

  it('dice "Dinero", nunca "Plata"', () => {
    const p = partidaBase();
    p.jugador.dinero = 45000;
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Dinero');
    expect(cont.textContent).not.toMatch(/\bPlata\b/);
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

  it('muestra los cinturones cuando los tiene', () => {
    const p = partidaBase();
    p.jugador.titulos = ['Cinturón regional'];
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Cinturón regional');
  });

  // Funciones que traía renderDashboard (v1) y que renderPanelPeleador no
  // cubría todavía: Fama, el cara a cara contra el archirrival, y el
  // gimnasio/forma (Task 6.1 — "no perder ninguna función del dashboard").
  it('muestra la fama del jugador', () => {
    const p = partidaBase();
    p.jugador.fama = 37;
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain('Fama');
    expect(cont.textContent).toContain('37');
  });

  it('sin archirrival todavia, no muestra ningun "vs"', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).not.toContain('vs ');
  });

  it('con archirrival, muestra su apodo y el cara a cara', () => {
    const p = partidaBase();
    const rival = p.mundo.roster[0];
    p.rivalidades = [{
      rivalId: rival.id, heat: 80, h2h: { v: 2, d: 1, e: 0 }, esArchirrival: true, hitos: [],
    }];
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain(`vs ${rival.apodo}`);
    expect(cont.textContent).toContain('2-1');
  });

  it('muestra el gimnasio y la forma actual', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    expect(cont.textContent).toContain(p.jugador.gimnasio);
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

  // Diagnóstico del coordinador: las tarjetas modifican mentón/disciplina
  // personal (jugador.especiales) y forma/moral (jugador.estado) igual que a
  // los atributos de combate, pero ninguno de los cuatro aparecía en ningún
  // lado del tablero — el jugador leía "+10 Forma" en una tarjeta sin poder
  // verificarlo nunca. Fatiga y lesión quedan afuera a propósito (ya se
  // muestran en panel-avance.js).
  describe('seccion de estado (mentón, disciplina, forma, moral)', () => {
    it('muestra mentón, disciplina personal, forma y moral con sus valores', () => {
      const p = partidaBase();
      p.jugador.especiales = { disciplinaPersonal: 47, menton: 63 };
      p.jugador.estado = { ...p.jugador.estado, forma: 72, moral: 55 };
      renderPanelPeleador(cont, { partida: p });

      const filaMenton = cont.querySelector('[data-atributo="menton"]');
      const filaDisciplina = cont.querySelector('[data-atributo="disciplinaPersonal"]');
      const filaForma = cont.querySelector('[data-atributo="forma"]');
      const filaMoral = cont.querySelector('[data-atributo="moral"]');

      expect(filaMenton.querySelector('.valor').textContent).toBe('63');
      expect(filaDisciplina.querySelector('.valor').textContent).toBe('47');
      expect(filaForma.querySelector('.valor').textContent).toBe('72');
      expect(filaMoral.querySelector('.valor').textContent).toBe('55');
    });

    it('no muestra fatiga ni lesion en la seccion de estado (ya viven en otro lado del tablero)', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      expect(cont.querySelector('[data-atributo="fatiga"]')).toBeNull();
      expect(cont.querySelector('[data-atributo="lesion"]')).toBeNull();
    });

    it('las filas de estado no llevan el badge de aporte del entrenador (eso es solo de los 6 de combate)', () => {
      const p = partidaBase();
      renderPanelPeleador(cont, { partida: p });
      const filaForma = cont.querySelector('[data-atributo="forma"]');
      expect(filaForma.classList.contains('con-aporte')).toBe(false);
      expect(filaForma.querySelector('.aporte-entrenador')).toBeNull();
    });
  });

  it('"aporte del entrenador" se muestra como una etiqueta chica, no como un titulo', () => {
    const p = partidaBase();
    renderPanelPeleador(cont, { partida: p });
    const tag = cont.querySelector('.panel-peleador-aporte-etiqueta');
    expect(tag).toBeTruthy();
    expect(tag.textContent).toContain('aporte del entrenador');
  });

  it('dispara los callbacks de ficha, tienda e historial', () => {
    const p = partidaBase();
    let ficha = 0; let tienda = 0; let historial = 0;
    renderPanelPeleador(cont, {
      partida: p,
      onFicha: () => { ficha += 1; },
      onTienda: () => { tienda += 1; },
      onHistorial: () => { historial += 1; },
    });
    cont.querySelector('[data-accion="ficha"]').click();
    cont.querySelector('[data-accion="tienda"]').click();
    cont.querySelector('[data-accion="historial"]').click();
    expect(ficha).toBe(1);
    expect(tienda).toBe(1);
    expect(historial).toBe(1);
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
