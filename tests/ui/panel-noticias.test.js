import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { renderPanelNoticias } from '../../src/ui/screens/panel-noticias.js';

function noticia({
  id, tipo = 'victoria', titular = 'Titular', cuerpo = 'Cuerpo de la noticia.', nueva = false, fecha = 2026, propia = false,
}) {
  return {
    id, tipo, titular, cuerpo, fecha, nueva, propia,
  };
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderPanelNoticias', () => {
  it('lista titular y cuerpo, sin un label de tipo (Pedido 3, v9: se sacaron los labels Resultado/Retiro/etc.)', () => {
    const noticias = [noticia({ id: 'n1', tipo: 'victoria', titular: 'Ganó otra vez', cuerpo: 'Un párrafo corto.' })];
    renderPanelNoticias(cont, { noticias });
    expect(cont.textContent).toContain('Ganó otra vez');
    expect(cont.textContent).toContain('Un párrafo corto.');
    expect(cont.textContent).not.toContain('Resultado');
    expect(cont.textContent).not.toContain('victoria');
  });

  it('el label ÚLTIMO MOMENTO de cada noticia nueva aparece solo cuando esa noticia es nueva', () => {
    const sinNuevas = [noticia({ id: 'n1', nueva: false })];
    renderPanelNoticias(cont, { noticias: sinNuevas });
    expect(cont.textContent).not.toContain('ÚLTIMO MOMENTO');

    const conNuevas = [noticia({ id: 'n2', nueva: true })];
    renderPanelNoticias(cont, { noticias: conNuevas });
    expect(cont.textContent).toContain('ÚLTIMO MOMENTO');
  });

  // Pedido 3 (v9, "quitá el label 'Último momento' que aparece a la
  // derecha, NO lo quites de las noticias nuevas"): el chip de cada noticia
  // nueva se mantiene (test de arriba) — lo que se saca es el aviso
  // DUPLICADO que vivía en la cabecera del módulo entero.
  it('la cabecera del módulo ya no repite el aviso ÚLTIMO MOMENTO, aunque haya noticias nuevas', () => {
    const noticias = [noticia({ id: 'n1', nueva: true })];
    renderPanelNoticias(cont, { noticias });
    const boton = cont.querySelector('.panel-noticias-boton');
    expect(boton.textContent).not.toContain('ÚLTIMO MOMENTO');
  });

  it('el panel tiene alto fijo con scroll interno, no crece indefinidamente', () => {
    const noticias = Array.from({ length: 20 }, (_, i) => noticia({ id: `n${i}` }));
    renderPanelNoticias(cont, { noticias });
    const lista = cont.querySelector('.panel-noticias-lista');
    expect(lista).toBeTruthy();
    expect(lista.style.height).toMatch(/^\d+px$/);
    expect(lista.style.overflowY).toBe('auto');
  });

  // Pedido 1 (v9, causa real de los huecos reportados al pie de las
  // columnas izquierda y central): tenía que ser `height`, no `max-height` —
  // con `max-height` el panel medía chico con pocas noticias y solo llegaba
  // al tope cuando se llenaba, así que el alto de la columna derecha (y con
  // él, el hueco que dejaban las otras dos) variaba con la carrera. Ahora es
  // SIEMPRE el mismo, haya 0 noticias o 20.
  it('el alto es fijo de verdad: el mismo con el feed vacío que con el feed lleno', () => {
    renderPanelNoticias(cont, { noticias: [] });
    const altoVacio = cont.querySelector('.panel-noticias-lista').style.height;

    document.body.innerHTML = '<div id="region2"></div>';
    const cont2 = document.getElementById('region2');
    const noticias = Array.from({ length: 20 }, (_, i) => noticia({ id: `n${i}` }));
    renderPanelNoticias(cont2, { noticias });
    const altoLleno = cont2.querySelector('.panel-noticias-lista').style.height;

    expect(altoLleno).toBe(altoVacio);
  });

  // Feedback textual del usuario: "el módulo, al menos en PC, no es lo
  // suficientemente alto como para acompañar al resto de la interfaz" (antes
  // 320px, muy corto comparado con la columna izquierda del tablero).
  it('el alto fijo es notablemente más alto que el tamaño original (320px)', () => {
    const noticias = [noticia({ id: 'n1' })];
    renderPanelNoticias(cont, { noticias });
    const lista = cont.querySelector('.panel-noticias-lista');
    const alto = Number.parseInt(lista.style.height, 10);
    expect(alto).toBeGreaterThanOrEqual(420);
  });

  it('con el feed vacio, avisa que no pasó nada en vez de quedar en blanco', () => {
    renderPanelNoticias(cont, { noticias: [] });
    expect(cont.textContent.length).toBeGreaterThan(0);
  });

  it('al abrir el panel (botón), se marcan leídas las noticias nuevas', () => {
    const noticias = [noticia({ id: 'n1', nueva: true }), noticia({ id: 'n2', nueva: true })];
    let recibidas = null;
    renderPanelNoticias(cont, { noticias, onLeidas: (feed) => { recibidas = feed; } });

    cont.querySelector('[data-accion="abrir-noticias"]').click();

    expect(recibidas).not.toBeNull();
    expect(recibidas.every((n) => n.nueva === false)).toBe(true);
  });

  it('no llama a onLeidas si no hay noticias nuevas', () => {
    const noticias = [noticia({ id: 'n1', nueva: false })];
    let llamado = false;
    renderPanelNoticias(cont, { noticias, onLeidas: () => { llamado = true; } });
    cont.querySelector('[data-accion="abrir-noticias"]').click();
    expect(llamado).toBe(false);
  });

  // Pedido v6 ("las noticias también deberían nombrar al jugador... que se
  // distinga de una noticia del mundo"): una noticia propia (cerrarPelea,
  // main.js) se marca aparte en el DOM, con su propio chip "TU CARRERA" —
  // nunca se confunde con una noticia genérica del mundo.
  it('una noticia "propia" (hito del jugador) se distingue con su propio chip y clase', () => {
    const noticias = [
      noticia({ id: 'mundo', propia: false }),
      noticia({ id: 'mia', propia: true, titular: 'Ganaste el título' }),
    ];
    renderPanelNoticias(cont, { noticias });

    const itemMundo = cont.querySelector('[data-noticia="mundo"]');
    const itemMia = cont.querySelector('[data-noticia="mia"]');
    expect(itemMundo.classList.contains('propia')).toBe(false);
    expect(itemMia.classList.contains('propia')).toBe(true);
    expect(itemMia.textContent).toContain('TU CARRERA');
    expect(itemMundo.textContent).not.toContain('TU CARRERA');
  });

  it('una noticia que no es "propia" no muestra el chip TU CARRERA', () => {
    const noticias = [noticia({ id: 'n1', propia: false })];
    renderPanelNoticias(cont, { noticias });
    expect(cont.textContent).not.toContain('TU CARRERA');
  });
});

// Feedback textual del usuario: "las noticias nuevas quiero que 'aparezcan'
// en el listado pero no quiero que sea instantáneo, sino que se vayan
// sumando" (con un intervalo entre una y otra, y respetando
// prefers-reduced-motion).
describe('renderPanelNoticias — entrada escalonada de noticias nuevas', () => {
  let matchMediaOriginal;

  beforeEach(() => {
    matchMediaOriginal = window.matchMedia;
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.matchMedia = matchMediaOriginal;
  });

  it('las noticias nuevas arrancan ocultas y se revelan una por una, escalonadas (no todas de golpe)', () => {
    const noticias = [
      noticia({ id: 'n1', nueva: true }),
      noticia({ id: 'n2', nueva: true }),
      noticia({ id: 'n3', nueva: true }),
    ];
    renderPanelNoticias(cont, { noticias });

    const oculta = (id) => cont.querySelector(`[data-noticia="${id}"]`).classList.contains('noticia-oculta');
    // La primera se revela casi ya (delay 0, mismo patrón de stagger que ya
    // usa el resto del proyecto — ver #app > .stack > *:nth-child(n) en
    // theme.css), pero todavía no corrió ningún timer.
    expect(oculta('n1')).toBe(true);
    expect(oculta('n2')).toBe(true);
    expect(oculta('n3')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(oculta('n1')).toBe(false);
    expect(oculta('n2')).toBe(true);
    expect(oculta('n3')).toBe(true);

    vi.advanceTimersByTime(319);
    expect(oculta('n2')).toBe(false);
    expect(oculta('n3')).toBe(true);

    vi.advanceTimersByTime(320);
    expect(oculta('n3')).toBe(false);
  });

  it('las noticias que ya no son "nuevas" nunca arrancan ocultas', () => {
    const noticias = [noticia({ id: 'n1', nueva: false })];
    renderPanelNoticias(cont, { noticias });
    expect(cont.querySelector('[data-noticia="n1"]').classList.contains('noticia-oculta')).toBe(false);
  });

  it('con prefers-reduced-motion, todas las noticias entran juntas, sin animación', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const noticias = [noticia({ id: 'n1', nueva: true }), noticia({ id: 'n2', nueva: true })];
    renderPanelNoticias(cont, { noticias });

    expect(cont.querySelector('[data-noticia="n1"]').classList.contains('noticia-oculta')).toBe(false);
    expect(cont.querySelector('[data-noticia="n2"]').classList.contains('noticia-oculta')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no repite la animación de una noticia que el llamador ya marcó como animada (noticiasAnimadas)', () => {
    const yaVistas = new Set(['n1']);
    const noticias = [noticia({ id: 'n1', nueva: true })];
    renderPanelNoticias(cont, { noticias, noticiasAnimadas: yaVistas });

    expect(cont.querySelector('[data-noticia="n1"]').classList.contains('noticia-oculta')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener() cancela los timers pendientes y deja todo visible, sin tirar excepción', () => {
    const noticias = [noticia({ id: 'n1', nueva: true }), noticia({ id: 'n2', nueva: true })];
    const controlador = renderPanelNoticias(cont, { noticias });

    controlador.detener();

    expect(cont.querySelector('[data-noticia="n1"]').classList.contains('noticia-oculta')).toBe(false);
    expect(cont.querySelector('[data-noticia="n2"]').classList.contains('noticia-oculta')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('devuelve un controlador con detener() aunque no haya noticias nuevas para animar', () => {
    const noticias = [noticia({ id: 'n1', nueva: false })];
    const controlador = renderPanelNoticias(cont, { noticias });
    expect(() => controlador.detener()).not.toThrow();
  });
});
