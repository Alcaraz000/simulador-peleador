// Verificación de punta a punta del cambio de fondo del Bloque 2: el tablero
// (columnas laterales) tiene que sobrevivir intacto mientras el panel central
// se reemplaza una y otra vez, como pasaría beat tras beat en una carrera
// real. Esto NO cablea el router (eso es el Bloque 6): arma el shell a mano
// y monta los paneles ya construidos, tal como haría main.js más adelante.
import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../../src/core/career.js';
import { crearShell } from '../../src/ui/shell.js';
import { renderPanelPeleador } from '../../src/ui/screens/panel-peleador.js';
import { renderPanelProxima } from '../../src/ui/screens/panel-proxima.js';
import { renderPanelNoticias } from '../../src/ui/screens/panel-noticias.js';
import { el } from '../../src/ui/dom.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('shell + tablero, de punta a punta', () => {
  it('el tablero (izquierda y derecha) nunca se redibuja mientras se juegan varios beats en el centro', () => {
    let partida = nuevaPartida(3);
    const shell = crearShell(cont);

    renderPanelPeleador(shell.regiones.izquierda, { partida });
    shell.montarDerecha(el('div', {}, [
      el('div', { dataset: { bloque: 'proxima' } }),
      el('div', { dataset: { bloque: 'noticias' } }),
    ]));
    renderPanelProxima(shell.regiones.derecha.querySelector('[data-bloque="proxima"]'), { partida });
    renderPanelNoticias(shell.regiones.derecha.querySelector('[data-bloque="noticias"]'), { noticias: partida.noticias });

    // Referencias de nodo capturadas ANTES de jugar ningún beat.
    const refIzquierda = shell.regiones.izquierda;
    const refDerecha = shell.regiones.derecha;
    const refContenidoIzquierda = shell.regiones.izquierda.firstChild;
    const refContenidoDerecha = shell.regiones.derecha.firstChild;

    // Juega varios beats reales de la carrera, montando algo distinto en el
    // centro cada vez (como haría main.js con mejora/evento/oferta/etc.).
    let beatsJugados = 0;
    let guardia = 0;
    while (beatsJugados < 8 && guardia < 100) {
      guardia += 1;
      const paso = siguienteBeat(partida);
      partida = paso.partida;
      if (!paso.beat) continue;
      beatsJugados += 1;
      shell.montarCentro(el('div', { text: `beat #${beatsJugados}: ${paso.beat.tipo}` }));
    }

    expect(beatsJugados).toBeGreaterThan(0);

    // El tablero sigue siendo EXACTAMENTE el mismo nodo, con el mismo
    // contenido interno: montarCentro nunca lo tocó.
    expect(shell.regiones.izquierda).toBe(refIzquierda);
    expect(shell.regiones.derecha).toBe(refDerecha);
    expect(shell.regiones.izquierda.firstChild).toBe(refContenidoIzquierda);
    expect(shell.regiones.derecha.firstChild).toBe(refContenidoDerecha);

    // Y el centro sí refleja el último beat jugado.
    expect(shell.regiones.centro.textContent).toContain(`beat #${beatsJugados}`);

    // El shell entero sigue siendo un único nodo en el DOM (no se duplicó).
    expect(cont.querySelectorAll('.shell').length).toBe(1);
  });

  it('el ranking arranca "Sin clasificar" y el tablero lo sigue mostrando aunque el centro cambie', () => {
    const partida = nuevaPartida(5);
    const shell = crearShell(cont);
    renderPanelPeleador(shell.regiones.izquierda, { partida });

    expect(shell.regiones.izquierda.textContent).toContain('Sin clasificar');

    shell.montarCentro(el('div', { text: 'algo cualquiera' }));

    expect(shell.regiones.izquierda.textContent).toContain('Sin clasificar');
  });
});
