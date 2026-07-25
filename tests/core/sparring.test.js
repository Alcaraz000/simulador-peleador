import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring, registrarGolpe, resultadoSparring } from '../../src/core/sparring.js';

const jugador = () => crearPeleador({
  nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
});

describe('crearSparring', () => {
  it('arranca sin aciertos y con una secuencia de paos', () => {
    const s = crearSparring(createRng(1), { jugador: jugador() });
    expect(s.indice).toBe(0);
    expect(s.aciertos).toBe(0);
    expect(s.terminado).toBe(false);
    expect(s.secuencia.length).toBe(s.objetivos);
  });

  it('la secuencia usa posiciones de la grilla 0-5', () => {
    const s = crearSparring(createRng(2), { jugador: jugador() });
    for (const pos of s.secuencia) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(5);
    }
  });

  it('es determinista', () => {
    expect(crearSparring(createRng(3), { jugador: jugador() }).secuencia)
      .toEqual(crearSparring(createRng(3), { jugador: jugador() }).secuencia);
  });
});

describe('registrarGolpe', () => {
  it('suma acierto y avanza el indice', () => {
    const s = registrarGolpe(crearSparring(createRng(4), { jugador: jugador() }), { acerto: true, ms: 300 });
    expect(s.aciertos).toBe(1);
    expect(s.indice).toBe(1);
    expect(s.tiempos).toEqual([300]);
  });

  it('errar avanza pero no suma', () => {
    const s = registrarGolpe(crearSparring(createRng(5), { jugador: jugador() }), { acerto: false, ms: 900 });
    expect(s.aciertos).toBe(0);
    expect(s.indice).toBe(1);
  });

  it('termina al completar la secuencia', () => {
    let s = crearSparring(createRng(6), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: true, ms: 250 });
    expect(s.terminado).toBe(true);
  });

  it('no registra nada despues de terminar', () => {
    let s = crearSparring(createRng(7), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: true, ms: 250 });
    const igual = registrarGolpe(s, { acerto: true, ms: 100 });
    expect(igual).toEqual(s);
  });

  it('no muta el original', () => {
    const s = crearSparring(createRng(8), { jugador: jugador() });
    const antes = JSON.stringify(s);
    registrarGolpe(s, { acerto: true, ms: 200 });
    expect(JSON.stringify(s)).toBe(antes);
  });
});

describe('resultadoSparring', () => {
  function jugar(aciertos, ms) {
    let s = crearSparring(createRng(9), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: i < aciertos, ms });
    return s;
  }

  it('todo acertado y rapido es perfecto', () => {
    const r = resultadoSparring(jugar(10, 220), jugador());
    expect(r.nivel).toBe('perfecto');
    expect(Object.values(r.mods).some((v) => v > 0)).toBe(true);
  });

  it('mitad acertado es bien o flojo', () => {
    const r = resultadoSparring(jugar(5, 600), jugador());
    expect(['bien', 'flojo']).toContain(r.nivel);
  });

  it('casi nada acertado es flojo y no da mods', () => {
    const r = resultadoSparring(jugar(1, 900), jugador());
    expect(r.nivel).toBe('flojo');
    expect(Object.keys(r.mods)).toHaveLength(0);
  });

  it('siempre devuelve un texto', () => {
    expect(resultadoSparring(jugar(7, 400), jugador()).texto.length).toBeGreaterThan(0);
  });
});
