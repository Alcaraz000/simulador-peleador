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
});
