import { describe, it, expect, beforeEach } from 'vitest';
import { mostrarHito } from '../../src/ui/screens/hitos.js';

// Sistema 4 (feedback del usuario: "faltan popups cuando pasen cosas
// importantes"). `mostrarHito` es la capa fina que traduce un hito ya
// detectado (core/hitos.js) a un popup de verdad (abrirPopup,
// components/popup.js) — no decide NADA de juego, solo pinta.

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe('mostrarHito', () => {
  it('abre un popup con el titulo y el texto resueltos', () => {
    mostrarHito({ tipo: 'titulo_ganado', cinturon: 'Cinturón regional', contexto: 1 });
    expect(document.querySelector('.popup-overlay')).toBeTruthy();
    expect(document.body.textContent).toContain('Cinturón regional');
  });

  it('cierra con la X y dispara onCerrar, como cualquier popup', () => {
    let cerrado = false;
    mostrarHito({ tipo: 'etapa_avanza', etapa: 'Profesional', etapaId: 'profesional', frase: 'x' }, { onCerrar: () => { cerrado = true; } });
    document.querySelector('.popup-cerrar').click();
    expect(cerrado).toBe(true);
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('un tipo de hito desconocido no abre nada y no rompe', () => {
    expect(() => mostrarHito({ tipo: 'inventado' })).not.toThrow();
    expect(document.querySelector('.popup-overlay')).toBeNull();
  });

  it('cada tipo de hito reconocido abre su popup sin romper', () => {
    const tipos = [
      { tipo: 'titulo_ganado', cinturon: 'Cinturón regional' },
      { tipo: 'titulo_perdido', cinturon: 'Cinturón nacional' },
      { tipo: 'defensa_exitosa', cinturon: 'Cinturón mundial' },
      { tipo: 'etapa_avanza', etapa: 'Veterano', etapaId: 'veterano', frase: 'x' },
      { tipo: 'primera_pelea' },
      { tipo: 'rivalidad_consagrada', rival: 'El Zurdo' },
      { tipo: 'racha', cantidad: 10 },
    ];
    for (const hito of tipos) {
      document.body.innerHTML = '<div id="app"></div>';
      mostrarHito(hito);
      expect(document.querySelector('.popup-overlay')).toBeTruthy();
    }
  });
});
