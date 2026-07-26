import { describe, it, expect, beforeEach } from 'vitest';
import { renderRanking } from '../../src/ui/screens/ranking.js';

function fila({
  id, nombre = 'Fulano', apodo = 'El Fulano', nacionalidad = 'AR', ranking = 1, media = 60, record = '10-2', esJugador = false,
} = {}) {
  return {
    id, nombre, apodo, nacionalidad, ranking, media, record, esJugador,
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe('renderRanking — se abre como popup', () => {
  it('se monta sobre document.body con el título y una fila por peleador', () => {
    const filas = [
      fila({ id: 'a', ranking: 1 }),
      fila({ id: 'b', ranking: 2, esJugador: true }),
      fila({ id: 'c', ranking: 3 }),
    ];
    renderRanking({ filas });

    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    expect(document.body.textContent).toContain('Ranking');
    expect(document.querySelectorAll('[data-peleador]')).toHaveLength(3);
  });

  it('cada fila muestra nombre, apodo, media, récord y el puesto', () => {
    const filas = [fila({
      id: 'a', nombre: 'Tyrell Carter', apodo: 'El Tanque', ranking: 4, media: 61, record: '10-2',
    })];
    renderRanking({ filas });

    const texto = document.body.textContent;
    expect(texto).toContain('Tyrell Carter');
    expect(texto).toContain('El Tanque');
    expect(texto).toContain('61');
    expect(texto).toContain('10-2');
    expect(texto).toContain('#4');
  });

  it('usa la bandera SVG, nunca el emoji', () => {
    renderRanking({ filas: [fila({ id: 'a', nacionalidad: 'MX' })] });
    expect(document.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(document.body.textContent).not.toContain('🇲🇽');
  });

  it('destaca la fila del jugador (y solo esa)', () => {
    const filas = [
      fila({ id: 'a', esJugador: false }),
      fila({ id: 'b', esJugador: true }),
      fila({ id: 'c', esJugador: false }),
    ];
    renderRanking({ filas });

    const destacadas = document.querySelectorAll('.tabla-ranking-fila-jugador');
    expect(destacadas).toHaveLength(1);
    expect(destacadas[0].dataset.peleador).toBe('b');
  });

  it('la X cierra el popup y dispara onCerrar', () => {
    let cerrado = false;
    renderRanking({ filas: [fila({ id: 'a' })], onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-cerrar').click();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('con la tabla vacía no rompe', () => {
    expect(() => renderRanking({ filas: [] })).not.toThrow();
  });

  // Bug reportado por el usuario: "no sé cómo, pero en el ranking ahora solo
  // muestra 3 peleadores" (con el roster completo de 12 + el jugador). La
  // tabla completa siempre está en el DOM (tablaRanking, world.js, ya lo
  // garantiza) — acá se verifica que la LISTA tenga su propio contenedor con
  // scroll interno acotado, en vez de depender de que el popup entero (con
  // cabecera y todo) se desborde: mismo patrón que panel-noticias.js.
  it('con muchas filas, todas quedan en el DOM dentro de un contenedor con scroll propio', () => {
    const filas = Array.from({ length: 15 }, (_, i) => fila({ id: `f${i}`, ranking: i + 1 }));
    renderRanking({ filas });

    const lista = document.querySelector('.tabla-ranking-lista');
    expect(lista).toBeTruthy();
    expect(lista.querySelectorAll('[data-peleador]')).toHaveLength(15);
  });

  // Pedido explícito: "con el jugador destacado y visible al abrir (si está
  // en el puesto 9, que se vea sin tener que buscarlo)".
  it('al abrir, la fila del jugador se deja visible sola (scrollIntoView), sin animación', () => {
    const filas = Array.from(
      { length: 15 },
      (_, i) => fila({ id: `f${i}`, ranking: i + 1, esJugador: i === 8 }),
    );
    const llamadas = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoViewStub(...args) {
      llamadas.push({ nodo: this, args });
    };
    try {
      renderRanking({ filas });
    } finally {
      Element.prototype.scrollIntoView = original;
    }

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].nodo.classList.contains('tabla-ranking-fila-jugador')).toBe(true);
    expect(llamadas[0].nodo.dataset.peleador).toBe('f8');
  });

  it('sin fila de jugador (no debería pasar, pero no tiene que romper), no llama a scrollIntoView', () => {
    const original = Element.prototype.scrollIntoView;
    let llamado = false;
    Element.prototype.scrollIntoView = function scrollIntoViewStub() { llamado = true; };
    try {
      expect(() => renderRanking({ filas: [fila({ id: 'a', esJugador: false })] })).not.toThrow();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    expect(llamado).toBe(false);
  });
});
