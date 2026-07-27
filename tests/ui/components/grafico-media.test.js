// Gráfico de la media a lo largo del año (pedido textual del usuario:
// "gráficos que muestren cómo fueron cambiando con los meses la media"). SVG
// a mano, sin librerías — ver la skill dataviz: forma de línea (una sola
// serie, sin leyenda), marcas finas, etiquetas directas selectivas (primer y
// último punto, no todos), tooltip nativo por punto (<title>) y una lista de
// respaldo accesible (la "vista de tabla" que pide la skill).
import { describe, it, expect } from 'vitest';
import { graficoMedia } from '../../../src/ui/components/grafico-media.js';

describe('graficoMedia', () => {
  it('con 2 o mas muestras (semanas distintas), dibuja una linea con un punto por muestra', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const svg = nodo.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelectorAll('circle').length).toBe(3);
    expect(svg.querySelector('polyline, path')).toBeTruthy();
  });

  it('el eje X respeta el orden temporal: una semana mas alta cae mas a la derecha (cx mayor)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const circles = [...nodo.querySelectorAll('circle')];
    const cx = circles.map((c) => Number(c.getAttribute('cx')));
    expect(cx[0]).toBeLessThan(cx[1]);
    expect(cx[1]).toBeLessThan(cx[2]);
  });

  it('deduplica muestras de la MISMA semana, quedandose con el ultimo valor (varias decisiones en el mismo instante)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 5, media: 60 }, { semana: 5, media: 63 }, { semana: 20, media: 66 }],
    });
    const circles = [...nodo.querySelectorAll('circle')];
    expect(circles).toHaveLength(2);
    // El title del primer punto (semana 5) tiene que reflejar el ULTIMO
    // valor asignado a esa semana (63), no el primero (60).
    const primerTitulo = circles[0].querySelector('title')?.textContent ?? '';
    expect(primerTitulo).toContain('63');
    expect(primerTitulo).not.toContain('60,');
  });

  it('etiqueta el primer y el ultimo punto con su valor (etiquetado directo selectivo, no todos los puntos)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60.4 }, { semana: 10, media: 65 }, { semana: 30, media: 63.2 }],
    });
    const textos = [...nodo.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(textos.some((t) => t.includes('60'))).toBe(true);
    expect(textos.some((t) => t.includes('63'))).toBe(true);
  });

  it('cada punto trae un titulo (tooltip nativo) con mes y valor', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 30, media: 63 }],
    });
    const titles = [...nodo.querySelectorAll('circle title')];
    expect(titles).toHaveLength(2);
    titles.forEach((t) => expect(t.textContent.length).toBeGreaterThan(0));
  });

  it('trae una lista accesible de respaldo (vista de tabla) con un item por punto', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const lista = nodo.querySelector('.sr-only');
    expect(lista).toBeTruthy();
    expect(lista.querySelectorAll('li')).toHaveLength(3);
  });

  it('con una sola muestra (o todas en la misma semana), no dibuja un grafico degenerado: cae a una lectura simple', () => {
    const nodo = graficoMedia({ muestras: [{ semana: 1, media: 60 }] });
    expect(nodo.querySelector('svg')).toBeNull();
    expect(nodo.textContent).toContain('60');
  });

  it('sin muestras, no revienta (defensivo)', () => {
    expect(() => graficoMedia({ muestras: [] })).not.toThrow();
  });

  it('linea y puntos usan el color dorado del tema (identidad visual gotica-fria, una sola serie)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
    });
    const linea = nodo.querySelector('polyline, path[data-linea]');
    expect(linea.getAttribute('stroke')).toBe('#f2c14e');
  });
});
