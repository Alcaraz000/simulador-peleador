import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Regresión del bug de especificidad CSS (Task 25): ".carta .desc" (0,2,0) le
// ganaba a ".verde"/".rojo"/".dorado" (0,1,0) sin importar el orden en el
// archivo, así que las etiquetas de color dentro de una carta (golpe de gracia,
// tienda) salían siempre grises. Esto carga el CSS real en happy-dom y verifica
// el color COMPUTADO, no solo que la regla exista en el texto del archivo.
const THEME_PATH = join(process.cwd(), 'src/ui/theme.css');
const CSS = readFileSync(THEME_PATH, 'utf-8');

function colorDe(html) {
  document.head.innerHTML = `<style>${CSS}</style>`;
  document.body.innerHTML = html;
  return window.getComputedStyle(document.getElementById('t')).color;
}

describe('theme.css — especificidad dentro de .carta', () => {
  it('.desc sola (gris) y .verde sola dan colores distintos', () => {
    const gris = colorDe('<div class="carta"><div class="desc" id="t">x</div></div>');
    const verde = colorDe('<div class="verde" id="t">x</div>');
    expect(gris).not.toBe(verde);
  });

  it('".desc verde" dentro de .carta se pinta del mismo verde que .verde sola', () => {
    const verdeReferencia = colorDe('<div class="verde" id="t">x</div>');
    const descVerde = colorDe('<div class="carta"><div class="desc verde" id="t">x</div></div>');
    expect(descVerde).toBe(verdeReferencia);
  });

  it('".desc rojo" dentro de .carta se pinta del mismo rojo que .rojo sola', () => {
    const rojoReferencia = colorDe('<div class="rojo" id="t">x</div>');
    const descRojo = colorDe('<div class="carta"><div class="desc rojo" id="t">x</div></div>');
    expect(descRojo).toBe(rojoReferencia);
  });

  it('".desc dorado" dentro de .carta se pinta del mismo dorado que .dorado sola', () => {
    const doradoReferencia = colorDe('<div class="dorado" id="t">x</div>');
    const descDorado = colorDe('<div class="carta"><div class="desc dorado" id="t">x</div></div>');
    expect(descDorado).toBe(doradoReferencia);
  });

  it('.carta:disabled tiene una afordancia visual (opacidad reducida)', () => {
    document.head.innerHTML = `<style>${CSS}</style>`;
    document.body.innerHTML = '<button class="carta" id="t" disabled>x</button>';
    const opacidad = window.getComputedStyle(document.getElementById('t')).opacity;
    expect(Number(opacidad)).toBeLessThan(1);
  });
});
