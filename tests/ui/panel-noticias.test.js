import { describe, it, expect, beforeEach } from 'vitest';
import { renderPanelNoticias } from '../../src/ui/screens/panel-noticias.js';

function noticia({
  id, tipo = 'victoria', titular = 'Titular', cuerpo = 'Cuerpo de la noticia.', nueva = false, fecha = 2026,
}) {
  return {
    id, tipo, titular, cuerpo, fecha, nueva,
  };
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div>';
  cont = document.getElementById('region');
});

describe('renderPanelNoticias', () => {
  it('lista titular y cuerpo, con el tipo como etiqueta legible (no el id crudo)', () => {
    const noticias = [noticia({ id: 'n1', tipo: 'victoria', titular: 'Ganó otra vez', cuerpo: 'Un párrafo corto.' })];
    renderPanelNoticias(cont, { noticias });
    expect(cont.textContent).toContain('Ganó otra vez');
    expect(cont.textContent).toContain('Un párrafo corto.');
    expect(cont.textContent).toContain('Resultado');
    expect(cont.textContent).not.toContain('victoria');
  });

  it('el label ÚLTIMO MOMENTO aparece solo cuando hay noticias nuevas', () => {
    const sinNuevas = [noticia({ id: 'n1', nueva: false })];
    renderPanelNoticias(cont, { noticias: sinNuevas });
    expect(cont.textContent).not.toContain('ÚLTIMO MOMENTO');

    const conNuevas = [noticia({ id: 'n2', nueva: true })];
    renderPanelNoticias(cont, { noticias: conNuevas });
    expect(cont.textContent).toContain('ÚLTIMO MOMENTO');
  });

  it('el panel tiene alto fijo con scroll interno, no crece indefinidamente', () => {
    const noticias = Array.from({ length: 20 }, (_, i) => noticia({ id: `n${i}` }));
    renderPanelNoticias(cont, { noticias });
    const lista = cont.querySelector('.panel-noticias-lista');
    expect(lista).toBeTruthy();
    expect(lista.style.maxHeight).toMatch(/^\d+px$/);
    expect(lista.style.overflowY).toBe('auto');
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
});
