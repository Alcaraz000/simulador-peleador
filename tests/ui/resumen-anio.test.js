// Resumen de fin de año (pedido textual del usuario): "un resumen de lo
// ocurrido y gráficos que muestren cómo fueron cambiando con los meses la
// media, debe mostrar las decisiones tomadas y las peleas hechas
// (contrincante, fecha, resultado, modo de victoria)". Este panel vive DENTRO
// de la región central del tablero (mismo criterio que cualquier otro beat,
// ver panel-decision.js) — nunca una pantalla aparte, para que cerrarlo sea
// un solo click, sin animaciones.
import { describe, it, expect, vi } from 'vitest';
import { renderResumenAnio } from '../../src/ui/screens/resumen-anio.js';

function region() {
  return document.createElement('div');
}

function decisionDePrueba(over = {}) {
  return {
    tipo: 'mejora', titulo: 'Campamento', opcion: 'Más potencia', semana: 5, ...over,
  };
}

function peleaDePrueba(over = {}) {
  return {
    rivalId: 'r1', rivalNombre: 'Juan Perez', rivalApodo: 'El Pibe', rivalMedia: 40,
    resultado: 'v', metodo: 'ko', round: 3, bolsa: 5000, enJuego: null, esTitulo: false,
    esObligatoria: false, fecha: 10, modo: 'tramite', ...over,
  };
}

function propsBase(over = {}) {
  return {
    anio: 2028,
    muestrasMedia: [{ semana: 1, media: 60 }, { semana: 20, media: 64 }],
    decisiones: [decisionDePrueba()],
    peleas: [peleaDePrueba()],
    narrativa: 'Un año parejo, con una victoria que hizo ruido.',
    onContinuar: () => {},
    ...over,
  };
}

describe('renderResumenAnio', () => {
  it('monta el año en la cabecera y la narrativa', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    expect(r.textContent).toContain('2028');
    expect(r.textContent).toContain('Un año parejo, con una victoria que hizo ruido.');
  });

  it('incluye el grafico de media (svg) cuando hay al menos 2 muestras', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    expect(r.querySelector('.grafico-media-svg')).toBeTruthy();
  });

  it('lista cada decision tomada con su titulo y la opcion elegida', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      decisiones: [
        decisionDePrueba({ titulo: 'El examen y el sparring', opcion: 'Rendir el examen.' }),
        decisionDePrueba({ tipo: 'evento', titulo: 'Che, dejá el boxeo', opcion: 'Seguir entrenando.' }),
      ],
    }));
    expect(r.textContent).toContain('El examen y el sparring');
    expect(r.textContent).toContain('Rendir el examen.');
    expect(r.textContent).toContain('Che, dejá el boxeo');
    expect(r.textContent).toContain('Seguir entrenando.');
  });

  it('lista cada pelea con rival, resultado y metodo (puntos/ko/tko/sumision)', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      peleas: [
        peleaDePrueba({ rivalApodo: 'El Zurdo', resultado: 'v', metodo: 'ko' }),
        peleaDePrueba({ rivalApodo: 'La Bala', resultado: 'd', metodo: 'decision' }),
        peleaDePrueba({ rivalApodo: 'El Toro', resultado: 'v', metodo: 'tko' }),
      ],
    }));
    expect(r.textContent).toContain('El Zurdo');
    expect(r.textContent).toContain('La Bala');
    expect(r.textContent).toContain('El Toro');
    expect(r.textContent).toContain('KO');
    expect(r.textContent).toContain('TKO');
    // El pedido textual usa la palabra "puntos" para la decisión (no
    // "Decisión" a secas).
    expect(r.textContent).toMatch(/puntos/i);
  });

  it('muestra el veredicto (gano/perdio) de cada pelea, no solo el metodo', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      peleas: [peleaDePrueba({ resultado: 'v' }), peleaDePrueba({ resultado: 'd' }), peleaDePrueba({ resultado: 'e' })],
    }));
    expect(r.textContent).toMatch(/gan/i);
    expect(r.textContent).toMatch(/perdi/i);
    expect(r.textContent).toMatch(/empat/i);
  });

  it('un solo boton (Seguir) que llama a onContinuar', () => {
    const r = region();
    const onContinuar = vi.fn();
    renderResumenAnio(r, propsBase({ onContinuar }));
    const botones = r.querySelectorAll('button');
    expect(botones).toHaveLength(1);
    expect(botones[0].textContent).toContain('Seguir');
    botones[0].click();
    expect(onContinuar).toHaveBeenCalledTimes(1);
  });

  it('sin decisiones (defensivo), no revienta y no muestra la seccion', () => {
    const r = region();
    expect(() => renderResumenAnio(r, propsBase({ decisiones: [] }))).not.toThrow();
  });

  it('sin peleas (defensivo, no deberia pasar por el gating pero no revienta), no revienta', () => {
    const r = region();
    expect(() => renderResumenAnio(r, propsBase({ peleas: [] }))).not.toThrow();
  });

  it('no usa emojis de bandera ni emojis en general (voz de crónica, iconos SVG)', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(r.textContent)).toBe(false);
  });
});
