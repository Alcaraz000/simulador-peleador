import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PLANTILLAS } from '../../src/content/news-templates.js';
import {
  generarNoticia, noticiasDeSucesos, agregarNoticias, etiquetaTipo,
} from '../../src/core/news.js';

describe('plantillas', () => {
  it('cubre los diez tipos de noticia', () => {
    expect(Object.keys(PLANTILLAS).sort()).toEqual([
      'defensa', 'derrota', 'escandalo', 'lesion', 'ranking',
      'record', 'retiro', 'revancha', 'titulo', 'victoria',
    ]);
  });

  it('cada tipo tiene al menos dos variantes', () => {
    for (const variantes of Object.values(PLANTILLAS)) {
      expect(variantes.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('generarNoticia', () => {
  const datos = { nombre: 'Lucas Ortiz', apodo: 'El Relámpago', rival: 'El Toro', metodo: 'KO', round: 3, titulo: 'Título regional', numero: 5 };

  it('devuelve un titular sin marcadores sueltos', () => {
    for (const tipo of Object.keys(PLANTILLAS)) {
      for (let s = 1; s <= 5; s++) {
        const noticia = generarNoticia(createRng(s), { tipo, datos });
        expect(noticia.titular).not.toMatch(/\{[a-z]+\}/);
        expect(noticia.tipo).toBe(tipo);
        expect(noticia.id).toBeTruthy();
      }
    }
  });

  it('es determinista', () => {
    const a = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    const b = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    expect(a.titular).toBe(b.titular);
  });

  it('rechaza un tipo desconocido', () => {
    expect(() => generarNoticia(createRng(1), { tipo: 'inventado', datos })).toThrow(/inventado/);
  });

  it('avisa si falta un dato de la plantilla', () => {
    expect(() => generarNoticia(createRng(1), { tipo: 'victoria', datos: {} })).toThrow(/marcador/i);
  });
});

describe('noticiasDeSucesos', () => {
  it('convierte sucesos del mundo en noticias', () => {
    const sucesos = [
      { tipo: 'victoria', peleadorId: 'a', rivalId: 'b', texto: 'X noqueó a Y.' },
      { tipo: 'retiro', peleadorId: 'c', texto: 'Z se retira.' },
    ];
    const noticias = noticiasDeSucesos(createRng(1), sucesos, { anio: 2030 });
    expect(noticias).toHaveLength(2);
    for (const n of noticias) {
      expect(n.titular.length).toBeGreaterThan(0);
      expect(n.fecha).toBe(2030);
    }
  });

  it('con lista vacia devuelve vacio', () => {
    expect(noticiasDeSucesos(createRng(1), [], { anio: 2030 })).toEqual([]);
  });
});

describe('etiquetaTipo', () => {
  it('devuelve una etiqueta legible para cada tipo real que emite el juego', () => {
    for (const tipo of ['victoria', 'titulo', 'retiro', 'lesion', 'ranking', 'sponsor']) {
      const etiqueta = etiquetaTipo(tipo);
      expect(etiqueta).not.toBe(tipo);
      expect(etiqueta.length).toBeGreaterThan(0);
    }
  });

  it('no explota con un tipo desconocido: devuelve algo legible igual', () => {
    expect(etiquetaTipo('inventado').length).toBeGreaterThan(0);
  });
});

describe('agregarNoticias', () => {
  const noticia = (id) => ({ id, tipo: 'victoria', titular: `Titular ${id}`, fecha: 2030 });

  it('pone las nuevas primero', () => {
    const feed = agregarNoticias([noticia('vieja')], [noticia('nueva')]);
    expect(feed[0].id).toBe('nueva');
  });

  it('recorta al maximo', () => {
    const muchas = Array.from({ length: 50 }, (_, i) => noticia(`n${i}`));
    expect(agregarNoticias([], muchas, { maximo: 30 })).toHaveLength(30);
  });

  it('no muta el feed original', () => {
    const feed = [noticia('a')];
    agregarNoticias(feed, [noticia('b')]);
    expect(feed).toHaveLength(1);
  });
});
