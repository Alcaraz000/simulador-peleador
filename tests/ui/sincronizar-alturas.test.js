// Pedido 1 (v10, pedido textual del usuario): "la columna izquierda marca
// el alto de referencia" — el resumen del año y el módulo de noticias nunca
// pueden terminar más abajo que el último panel de la izquierda. La
// izquierda no tiene una altura constante toda la carrera (crece un escalón
// la primera vez que el jugador tiene historial de peleas, ver
// panel-peleador.js), así que el "piso" hay que medirlo en cada partida, no
// copiarlo de una captura puntual — de ahí que esto viva en una función que
// recibe los altos ya medidos, en vez de una constante.
//
// El cálculo es SIMÉTRICO: agranda `elemento` cuando la columna tiene lugar
// de sobra (hasta su alto natural — nunca inventa espacio que el contenido
// no tiene) y lo achica cuando se pasa del piso. Así se aprovecha siempre
// TODO el alto disponible, en vez de quedar corto por un resguardo estático
// (el `max-height:60vh` de `.resumen-anio-cuerpo`) que no sabe nada de la
// izquierda real de esta partida.
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { alturaLimitada, limitarAlAltoDeIzquierda } from '../../src/ui/sincronizar-alturas.js';

describe('alturaLimitada (función pura)', () => {
  it('con exceso (la columna se pasa del piso), achica el elemento por EXACTAMENTE ese exceso', () => {
    // La columna se pasa 100px del piso de referencia: el elemento (lo único
    // con scroll propio de esa columna) se achica esos mismos 100px.
    expect(alturaLimitada({ altoReferencia: 600, altoColumna: 700, altoElemento: 480 })).toBe(380);
  });

  it('con lugar de sobra (la columna mide menos que la referencia), AGRANDA el elemento para usar todo el piso', () => {
    // La columna mide 100px menos que la referencia: hay 100px de sobra para
    // repartir — el elemento los recibe todos (nunca se queda corto por las
    // dudas si el contenido de verdad los necesita).
    expect(alturaLimitada({
      altoReferencia: 700, altoColumna: 600, altoElemento: 380, maximo: 1000,
    })).toBe(480);
  });

  it('nunca agranda mas alla del alto natural del elemento (maximo): no inventa espacio que el contenido no tiene', () => {
    // Aunque sobren 300px, si el elemento entero (con TODO su contenido, sin
    // recortar) no mide más de 420, no tiene sentido ponerle un max-height
    // de 500 — quedaría con aire vacío adentro, sin ganar nada.
    const resultado = alturaLimitada({
      altoReferencia: 900, altoColumna: 600, altoElemento: 380, maximo: 420,
    });
    expect(resultado).toBe(420);
  });

  it('nunca recorta por debajo del mínimo (un modulo ilegible, aplastado a unos pocos px, es peor que uno un poco más alto)', () => {
    const resultado = alturaLimitada({
      altoReferencia: 100, altoColumna: 1000, altoElemento: 480, minimo: 150,
    });
    expect(resultado).toBe(150);
  });

  it('sin exceso ni sobra (la columna ya mide exacto la referencia), deja el elemento tal cual', () => {
    expect(alturaLimitada({
      altoReferencia: 700, altoColumna: 700, altoElemento: 480, maximo: 1000,
    })).toBe(480);
  });
});

describe('limitarAlAltoDeIzquierda (DOM)', () => {
  function nodoConAlto(alto, scrollHeight = alto) {
    const nodo = document.createElement('div');
    nodo.getBoundingClientRect = () => ({ height: alto });
    Object.defineProperty(nodo, 'scrollHeight', { value: scrollHeight, configurable: true });
    return nodo;
  }

  it('en escritorio, si la columna se pasa del piso de la izquierda, fija un max-height mas chico sobre el elemento', () => {
    const izquierda = nodoConAlto(600);
    const columna = nodoConAlto(700);
    const elemento = nodoConAlto(480, 900); // el contenido real (scrollHeight) es mas alto que lo que se ve

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => true,
    });

    expect(elemento.style.maxHeight).toBe('380px');
  });

  it('si la columna entra HOLGADA dentro del piso (un resguardo estático la achicó de más), agranda el elemento hasta usar todo el piso', () => {
    // Caso real: `.resumen-anio-cuerpo` quedó en 540px por su `max-height:
    // 60vh` de theme.css, pero su contenido de verdad (scrollHeight) mide
    // 822 y la izquierda daría lugar para más de 540.
    const izquierda = nodoConAlto(726);
    const columna = nodoConAlto(631); // header + cuerpo(540) + boton, ya con el resguardo estatico puesto
    const elemento = nodoConAlto(540, 822);

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => true,
    });

    // 540 + (726 - 631) = 635 — usa el piso completo, sin pasarse (635 < 822).
    expect(elemento.style.maxHeight).toBe('635px');
  });

  it('si el contenido real ya entra completo, no lo agranda mas alla de su propio contenido (scrollHeight)', () => {
    const izquierda = nodoConAlto(900);
    const columna = nodoConAlto(600);
    const elemento = nodoConAlto(480, 480); // nada de contenido oculto por scroll

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => true,
    });

    expect(elemento.style.maxHeight).toBe('480px');
  });

  it('en celular (columnas apiladas), nunca acota nada, aunque "technically" la columna sea mas alta', () => {
    const izquierda = nodoConAlto(637);
    const columna = nodoConAlto(2000);
    const elemento = nodoConAlto(480);

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => false,
    });

    expect(elemento.style.maxHeight).toBe('');
  });

  it('es idempotente: correrlo dos veces seguidas da el mismo resultado la segunda vez (sin efecto trinquete)', () => {
    const izquierda = nodoConAlto(726);
    let altoColumnaActual = 631;
    const columna = { getBoundingClientRect: () => ({ get height() { return altoColumnaActual; } }) };
    const elemento = nodoConAlto(540, 822);

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => true,
    });
    expect(elemento.style.maxHeight).toBe('635px');

    // Tras la primera pasada, en un tablero real la columna reflejaria el
    // nuevo alto del elemento (631 - 540 + 635 = 726, igual a la izquierda).
    altoColumnaActual = 726;
    elemento.getBoundingClientRect = () => ({ height: 635 });

    limitarAlAltoDeIzquierda({
      izquierda, columna, elemento, escritorio: () => true,
    });
    expect(elemento.style.maxHeight).toBe('635px');
  });

  it('defensivo: sin alguno de los tres nodos, no revienta', () => {
    const nodo = nodoConAlto(480);
    expect(() => limitarAlAltoDeIzquierda({
      izquierda: null, columna: nodo, elemento: nodo, escritorio: () => true,
    })).not.toThrow();
    expect(() => limitarAlAltoDeIzquierda({
      izquierda: nodo, columna: null, elemento: nodo, escritorio: () => true,
    })).not.toThrow();
    expect(() => limitarAlAltoDeIzquierda({
      izquierda: nodo, columna: nodo, elemento: null, escritorio: () => true,
    })).not.toThrow();
  });

  describe('con matchMedia real (sin pasar `escritorio` a mano)', () => {
    let original;
    beforeEach(() => { original = window.matchMedia; });
    afterEach(() => { window.matchMedia = original; });

    it('usa matchMedia(min-width:960px) por defecto para decidir si es escritorio', () => {
      window.matchMedia = vi.fn((q) => ({ matches: q.includes('960') }));
      const izquierda = nodoConAlto(600);
      const columna = nodoConAlto(700);
      const elemento = nodoConAlto(480, 900);

      limitarAlAltoDeIzquierda({ izquierda, columna, elemento });

      expect(window.matchMedia).toHaveBeenCalledWith(expect.stringContaining('960px'));
      expect(elemento.style.maxHeight).toBe('380px');
    });
  });
});
