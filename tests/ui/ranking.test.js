import { describe, it, expect, beforeEach } from 'vitest';
import { renderRanking } from '../../src/ui/screens/ranking.js';

function fila({
  id, nombre = 'Fulano', apodo = 'El Fulano', nacionalidad = 'AR', ranking = 1, media = 60, record = '10-2', esJugador = false,
} = {}) {
  return {
    id, nombre, apodo, nacionalidad, ranking, media, record, esJugador,
  };
}

// v17.8: el popup pasó de UNA lista a CUATRO rankings independientes, uno por
// pestaña (amateur / regional / nacional / mundial). Estos tests siguen
// probando lo mismo de siempre sobre una sola división; los de la pestaña
// están al final del archivo.
function tabla(filas, division = 'nacional') {
  return { [division]: filas };
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
    renderRanking({ tablas: tabla(filas) });

    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    expect(document.body.textContent).toContain('Rankings');
    expect(document.querySelectorAll('[data-peleador]')).toHaveLength(3);
  });

  // v6 (rediseño integral, pedido textual: "el popup de ranking desperdicia
  // espacio... que sea una lista compacta: NÚMERO | BANDERA | NOMBRE |
  // HISTORIAL. La media NO va"): la fila deja de mostrar la media (dato que,
  // repetido en cien filas, no aportaba nada que el puesto no dijera ya).
  it('cada fila muestra nombre, apodo, récord y el puesto — nunca la media', () => {
    const filas = [fila({
      id: 'a', nombre: 'Tyrell Carter', apodo: 'El Tanque', ranking: 4, media: 61, record: '10-2',
    })];
    renderRanking({ tablas: tabla(filas) });

    const texto = document.body.textContent;
    expect(texto).toContain('Tyrell Carter');
    expect(texto).toContain('El Tanque');
    expect(texto).toContain('10-2');
    expect(texto).toContain('#4');
    expect(texto).not.toContain('61');
    expect(texto).not.toMatch(/MEDIA/);
  });

  // Pedido explícito: la fila es una sola línea (NÚMERO | BANDERA | NOMBRE |
  // HISTORIAL) — con el roster de 100 peleadores, una fila más compacta es
  // lo que hace que la lista entera scrollee liviana.
  it('la fila es una sola línea (puesto, bandera, nombre y récord al mismo nivel)', () => {
    const filas = [fila({ id: 'a', ranking: 4 })];
    renderRanking({ tablas: tabla(filas) });
    const filaNodo = document.querySelector('[data-peleador="a"]');
    expect(filaNodo.querySelector('.tabla-ranking-puesto')).toBeTruthy();
    expect(filaNodo.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(filaNodo.querySelector('.tabla-ranking-nombre')).toBeTruthy();
    expect(filaNodo.querySelector('.tabla-ranking-record')).toBeTruthy();
  });

  it('usa la bandera SVG, nunca el emoji', () => {
    renderRanking({ tablas: tabla([fila({ id: 'a', nacionalidad: 'MX' })]) });
    expect(document.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(document.body.textContent).not.toContain('🇲🇽');
  });

  it('destaca la fila del jugador (y solo esa)', () => {
    const filas = [
      fila({ id: 'a', esJugador: false }),
      fila({ id: 'b', esJugador: true }),
      fila({ id: 'c', esJugador: false }),
    ];
    renderRanking({ tablas: tabla(filas) });

    const destacadas = document.querySelectorAll('.tabla-ranking-fila-jugador');
    expect(destacadas).toHaveLength(1);
    expect(destacadas[0].dataset.peleador).toBe('b');
  });

  it('la X cierra el popup y dispara onCerrar', () => {
    let cerrado = false;
    renderRanking({ tablas: tabla([fila({ id: 'a' })]), onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-cerrar').click();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('con la tabla vacía no rompe', () => {
    expect(() => renderRanking({ tablas: tabla([]) })).not.toThrow();
  });

  // Bug reportado por el usuario: "no sé cómo, pero en el ranking ahora solo
  // muestra 3 peleadores" (con el roster completo de 12 + el jugador). La
  // tabla completa siempre está en el DOM (tablaRanking, world.js, ya lo
  // garantiza) — acá se verifica que la LISTA tenga su propio contenedor con
  // scroll interno acotado, en vez de depender de que el popup entero (con
  // cabecera y todo) se desborde: mismo patrón que panel-noticias.js.
  it('con muchas filas, todas quedan en el DOM dentro de un contenedor con scroll propio', () => {
    const filas = Array.from({ length: 15 }, (_, i) => fila({ id: `f${i}`, ranking: i + 1 }));
    renderRanking({ tablas: tabla(filas) });

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
      renderRanking({ tablas: tabla(filas) });
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
      expect(() => renderRanking({ tablas: tabla([fila({ id: 'a', esJugador: false })]) })).not.toThrow();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    expect(llamado).toBe(false);
  });
});

// v17.8: cuatro rankings independientes, uno por pestaña.
describe('renderRanking — las cuatro divisiones', () => {
  const cuatro = () => ({
    amateur: [fila({ id: 'am1', nombre: 'Amateur Uno' })],
    regional: [fila({ id: 'r1', nombre: 'Regional Uno' })],
    nacional: [fila({ id: 'n1', nombre: 'Nacional Uno' })],
    mundial: [fila({ id: 'm1', nombre: 'Mundial Uno' })],
  });

  it('hay una pestaña por división con contenido', () => {
    renderRanking({ tablas: cuatro() });
    const pestanas = [...document.querySelectorAll('.tabla-ranking-pestana')];
    expect(pestanas.map((b) => b.dataset.division)).toEqual(['amateur', 'regional', 'nacional', 'mundial']);
  });

  it('una división vacía no genera pestaña', () => {
    renderRanking({ tablas: { ...cuatro(), amateur: [] } });
    const pestanas = [...document.querySelectorAll('.tabla-ranking-pestana')];
    expect(pestanas.map((b) => b.dataset.division)).not.toContain('amateur');
  });

  it('abre en la división donde está el jugador', () => {
    const tablas = cuatro();
    tablas.mundial = [fila({ id: 'm1', nombre: 'Mundial Uno', esJugador: true })];
    renderRanking({ tablas });

    expect(document.querySelector('.tabla-ranking-pestana.activa').dataset.division).toBe('mundial');
    expect(document.body.textContent).toContain('Mundial Uno');
  });

  it('cambiar de pestaña cambia la lista', () => {
    renderRanking({ tablas: cuatro() });
    const regional = [...document.querySelectorAll('.tabla-ranking-pestana')]
      .find((b) => b.dataset.division === 'regional');
    regional.click();

    expect(document.body.textContent).toContain('Regional Uno');
    expect(document.querySelectorAll('[data-peleador]')).toHaveLength(1);
    expect(regional.classList.contains('activa')).toBe(true);
  });

  it('cada división numera desde 1: el puesto es EN esa división', () => {
    renderRanking({
      tablas: { nacional: [fila({ id: 'a', ranking: 1 }), fila({ id: 'b', ranking: 2 })] },
    });
    const puestos = [...document.querySelectorAll('.tabla-ranking-puesto')].map((n) => n.textContent);
    expect(puestos).toEqual(['#1', '#2']);
  });

  // El campeón vigente no siempre es el #1: se puede tener el cinturón puesto
  // y haber bajado en la tabla.
  it('marca al campeón vigente aunque no sea el primero', () => {
    renderRanking({
      tablas: {
        nacional: [
          fila({ id: 'a', ranking: 1 }),
          { ...fila({ id: 'b', ranking: 2, nombre: 'El Campeon' }), esCampeon: true },
        ],
      },
    });

    const marcados = [...document.querySelectorAll('[data-campeon="si"]')];
    expect(marcados).toHaveLength(1);
    expect(marcados[0].dataset.peleador).toBe('b');
    expect(marcados[0].textContent.toLowerCase()).toContain('campeon');
  });
});
