import { describe, it, expect, beforeEach } from 'vitest';
import { renderCreacion } from '../../src/ui/screens/create.js';
import { mediaDe } from '../../src/core/fighter.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderCreacion', () => {
  it('muestra los campos principales', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    expect(cont.querySelector('[data-campo="nombre"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="disciplina"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="categoria"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="estilo"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="origen"]')).toBeTruthy();
  });

  it('ofrece exactamente las seis nacionalidades con su bandera', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const select = cont.querySelector('[data-campo="nacionalidad"]');
    expect(select.options).toHaveLength(6);
    const textos = [...select.options].map((o) => o.textContent).join(' ');
    for (const bandera of ['🇦🇷', '🇲🇽', '🇺🇸', '🇪🇸', '🇮🇹', '🇯🇵']) {
      expect(textos).toContain(bandera);
    }
  });

  it('solo ofrece boxeo como disciplina', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const select = cont.querySelector('[data-campo="disciplina"]');
    expect([...select.options].map((o) => o.value)).toEqual(['boxeo']);
  });

  it('ofrece los tres estilos de boxeo', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const estilo = cont.querySelector('[data-campo="estilo"]');
    expect([...estilo.options].map((o) => o.value).sort()).toEqual(['menton', 'noqueador', 'tecnico']);
  });

  it('el boton sorprendeme completa el formulario', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const nombre = cont.querySelector('[data-campo="nombre"]');
    nombre.value = '';
    cont.querySelector('[data-accion="aleatorio"]').click();
    expect(nombre.value.length).toBeGreaterThan(0);
  });

  it('comenzar entrega un peleador valido', () => {
    let recibido = null;
    renderCreacion(cont, { onComenzar: (p) => { recibido = p; } });
    cont.querySelector('[data-campo="nombre"]').value = 'Lucas Ortiz';
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(recibido).toBeTruthy();
    expect(recibido.nombre).toBe('Lucas Ortiz');
    expect(recibido.esJugador).toBe(true);
    expect(recibido.edad).toBe(15);
    expect(mediaDe(recibido)).toBeGreaterThan(0);
  });

  it('no deja comenzar sin nombre', () => {
    let llamado = false;
    renderCreacion(cont, { onComenzar: () => { llamado = true; } });
    cont.querySelector('[data-campo="nombre"]').value = '   ';
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(llamado).toBe(false);
    expect(cont.querySelector('[data-error]').textContent.length).toBeGreaterThan(0);
  });
});
