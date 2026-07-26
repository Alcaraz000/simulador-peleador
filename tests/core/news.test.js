import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PLANTILLAS } from '../../src/content/news-templates.js';
import {
  generarNoticia, noticiasDeSucesos, agregarNoticias, etiquetaTipo, marcarLeidas,
} from '../../src/core/news.js';

describe('plantillas', () => {
  it('cubre los diez tipos de noticia', () => {
    expect(Object.keys(PLANTILLAS).sort()).toEqual([
      'defensa', 'derrota', 'escandalo', 'lesion', 'ranking',
      'record', 'retiro', 'revancha', 'titulo', 'victoria',
    ]);
  });

  it('cada tipo tiene al menos tres variantes de titular y tres de cuerpo', () => {
    for (const plantilla of Object.values(PLANTILLAS)) {
      expect(plantilla.titulares.length).toBeGreaterThanOrEqual(3);
      expect(plantilla.cuerpos.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('generarNoticia', () => {
  const datos = { nombre: 'Lucas Ortiz', apodo: 'El Relámpago', rival: 'El Toro', metodo: 'KO', round: 3, titulo: 'Título regional', numero: 5 };

  it('devuelve titular y cuerpo sin marcadores sueltos', () => {
    for (const tipo of Object.keys(PLANTILLAS)) {
      for (let s = 1; s <= 5; s++) {
        const noticia = generarNoticia(createRng(s), { tipo, datos });
        expect(noticia.titular).not.toMatch(/\{[a-z]+\}/);
        expect(noticia.cuerpo).not.toMatch(/\{[a-z]+\}/);
        expect(noticia.cuerpo.length).toBeGreaterThan(0);
        expect(noticia.tipo).toBe(tipo);
        expect(noticia.id).toBeTruthy();
      }
    }
  });

  it('marca la noticia como nueva al crearla', () => {
    const noticia = generarNoticia(createRng(1), { tipo: 'victoria', datos });
    expect(noticia.nueva).toBe(true);
  });

  it('es determinista', () => {
    const a = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    const b = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    expect(a.titular).toBe(b.titular);
    expect(a.cuerpo).toBe(b.cuerpo);
  });

  it('rechaza un tipo desconocido', () => {
    expect(() => generarNoticia(createRng(1), { tipo: 'inventado', datos })).toThrow(/inventado/);
  });

  it('avisa si falta un dato de la plantilla (titular o cuerpo)', () => {
    for (let s = 1; s <= 8; s++) {
      expect(() => generarNoticia(createRng(s), { tipo: 'victoria', datos: {} })).toThrow(/marcador/i);
    }
  });
});

describe('noticiasDeSucesos', () => {
  it('convierte sucesos del mundo en noticias con titular y cuerpo, marcadas como nuevas', () => {
    const sucesos = [
      { tipo: 'victoria', peleadorId: 'a', rivalId: 'b', texto: 'X noqueó a Y.' },
      { tipo: 'retiro', peleadorId: 'c', texto: 'Z se retira.' },
    ];
    const noticias = noticiasDeSucesos(createRng(1), sucesos, { anio: 2030 });
    expect(noticias).toHaveLength(2);
    for (const n of noticias) {
      expect(n.titular.length).toBeGreaterThan(0);
      expect(n.cuerpo.length).toBeGreaterThan(0);
      expect(n.fecha).toBe(2030);
      expect(n.nueva).toBe(true);
    }
  });

  it('con lista vacia devuelve vacio', () => {
    expect(noticiasDeSucesos(createRng(1), [], { anio: 2030 })).toEqual([]);
  });

  it('el mismo suceso siempre trae el mismo cuerpo, aunque cambie el rng', () => {
    const suceso = [{ tipo: 'retiro', peleadorId: 'c', texto: 'Z se retira a los 38 años.' }];
    const a = noticiasDeSucesos(createRng(1), suceso, { anio: 2030 })[0];
    const b = noticiasDeSucesos(createRng(999), suceso, { anio: 2044 })[0];
    expect(b.cuerpo).toBe(a.cuerpo);
  });

  // Pedido 2 (v6, "que aparezcan peleadores nuevos"): avanzarMundo (world.js)
  // emite un suceso de tipo 'debut' cuando un NPC nuevo reemplaza a un
  // retirado. Tiene que traer su propio cuerpo atmosférico, no caer en el
  // genérico de 'victoria' (MAPA_SUCESOS por defecto) — un debut no es un
  // resultado de pelea.
  it('un suceso de debut trae su propio tipo y cuerpo, no el genérico de victoria', () => {
    const sucesos = [{ tipo: 'debut', peleadorId: 'nuevo1', texto: 'Debuta "El Pibe" Ramírez.' }];
    const [noticia] = noticiasDeSucesos(createRng(1), sucesos, { anio: 2030 });
    expect(noticia.tipo).toBe('debut');
    expect(noticia.titular).toBe('Debuta "El Pibe" Ramírez.');
    expect(noticia.cuerpo.length).toBeGreaterThan(0);
  });

  it('sucesos distintos del mismo tipo reparten variantes de cuerpo, no repiten siempre la primera', () => {
    const sucesos = Array.from({ length: 12 }, (_, i) => ({
      tipo: 'victoria', peleadorId: `p${i}`, texto: `Peleador ${i} ganó por nocaut.`,
    }));
    const cuerpos = new Set(noticiasDeSucesos(createRng(1), sucesos, { anio: 2030 }).map((n) => n.cuerpo));
    expect(cuerpos.size).toBeGreaterThanOrEqual(2);
  });

  it('no consume tiradas del rng compartido (la secuencia de la carrera no se corre)', () => {
    const sucesos = [
      { tipo: 'victoria', peleadorId: 'a', texto: 'X noqueó a Y.' },
      { tipo: 'retiro', peleadorId: 'c', texto: 'Z se retira.' },
    ];
    const rng = createRng(5);
    const antes = rng.estado();
    noticiasDeSucesos(rng, sucesos, { anio: 2030 });
    expect(rng.estado()).toEqual(antes);
  });
});

describe('etiquetaTipo', () => {
  it('devuelve una etiqueta legible para cada tipo real que emite el juego', () => {
    for (const tipo of ['victoria', 'titulo', 'retiro', 'lesion', 'ranking', 'sponsor', 'debut']) {
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
  const noticia = (id) => ({ id, tipo: 'victoria', titular: `Titular ${id}`, cuerpo: 'x', fecha: 2030, nueva: true });

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

describe('marcarLeidas', () => {
  const noticia = (id, nueva) => ({ id, tipo: 'victoria', titular: 'x', cuerpo: 'x', fecha: 2030, nueva });

  it('apaga la marca "nueva" de todas las noticias', () => {
    const feed = [noticia('a', true), noticia('b', true), noticia('c', false)];
    const leidas = marcarLeidas(feed);
    expect(leidas.every((n) => n.nueva === false)).toBe(true);
  });

  it('no muta el feed original', () => {
    const feed = [noticia('a', true)];
    marcarLeidas(feed);
    expect(feed[0].nueva).toBe(true);
  });
});
