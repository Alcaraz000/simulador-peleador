import { describe, it, expect, beforeEach } from 'vitest';
import { crearShell } from '../../src/ui/shell.js';
import { el } from '../../src/ui/dom.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('crearShell', () => {
  it('crea las tres regiones, montadas dentro del contenedor', () => {
    const shell = crearShell(cont);
    expect(shell.regiones.izquierda).toBeTruthy();
    expect(shell.regiones.centro).toBeTruthy();
    expect(shell.regiones.derecha).toBeTruthy();
    expect(cont.contains(shell.regiones.izquierda)).toBe(true);
    expect(cont.contains(shell.regiones.centro)).toBe(true);
    expect(cont.contains(shell.regiones.derecha)).toBe(true);
  });

  it('montarCentro reemplaza solo el contenido de la columna central: nunca vuelve a dibujar las otras', () => {
    const shell = crearShell(cont);

    // Referencias de nodo: si el shell alguna vez "redibuja" izquierda/derecha,
    // estas referencias dejarían de ser las mismas o su contenido cambiaría.
    const nodoIzquierda = el('div', { text: 'peleador' });
    const nodoDerecha = el('div', { text: 'noticias' });
    shell.regiones.izquierda.appendChild(nodoIzquierda);
    shell.montarDerecha(nodoDerecha);

    const refIzquierda = shell.regiones.izquierda;
    const refDerecha = shell.regiones.derecha;
    const refNodoIzquierda = shell.regiones.izquierda.firstChild;
    const refNodoDerecha = shell.regiones.derecha.firstChild;

    shell.montarCentro(el('div', { text: 'panel de decision 1' }));
    shell.montarCentro(el('div', { text: 'panel de decision 2' }));

    // Las regiones laterales son los mismos nodos de siempre...
    expect(shell.regiones.izquierda).toBe(refIzquierda);
    expect(shell.regiones.derecha).toBe(refDerecha);
    // ...y su contenido interno no fue tocado (misma referencia de nodo hijo).
    expect(shell.regiones.izquierda.firstChild).toBe(refNodoIzquierda);
    expect(shell.regiones.derecha.firstChild).toBe(refNodoDerecha);
    expect(shell.regiones.izquierda.textContent).toBe('peleador');
    expect(shell.regiones.derecha.textContent).toBe('noticias');

    // El centro sí cambió, y solo tiene el último nodo montado.
    expect(shell.regiones.centro.textContent).toBe('panel de decision 2');
  });

  it('el shell se crea una sola vez: llamar crearShell de nuevo no duplica el esqueleto', () => {
    crearShell(cont);
    crearShell(cont);
    expect(cont.querySelectorAll('.shell').length).toBe(1);
  });

  it('montarDerecha reemplaza solo el contenido de la columna derecha', () => {
    const shell = crearShell(cont);
    shell.montarDerecha(el('div', { text: 'primero' }));
    shell.montarDerecha(el('div', { text: 'segundo' }));
    expect(shell.regiones.derecha.textContent).toBe('segundo');
  });

  it('destacar no rompe con una región válida ni con una desconocida', () => {
    const shell = crearShell(cont);
    expect(() => shell.destacar('izquierda')).not.toThrow();
    expect(() => shell.destacar('derecha')).not.toThrow();
    expect(() => shell.destacar('inventada')).not.toThrow();
  });
});
