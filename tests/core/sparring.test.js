import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  crearSparring, registrarGolpe, resultadoSparring, terminarPorTiempo, MS_BIEN,
} from '../../src/core/sparring.js';

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

  // Bug reportado por el usuario: "el minijuego de sparring, ¿tiene algún
  // efecto? No parece". Causa real (parte 1): MS_BIEN estaba definida y
  // exportada pero nunca se usaba en ninguna rama de resultadoSparring — con
  // ratio>=0.5 alcanzaba el nivel "bien" sin importar cuánto hubieras
  // tardado en reaccionar. Sin ningún límite de velocidad para "bien" (y sin
  // presión de tiempo real en la UI — ver el bug del timer), CUALQUIER
  // sesión terminaba en "bien" o "perfecto": el nivel "flojo" (que no da
  // ningún mod) era casi inalcanzable, así que el jugador siempre veía
  // "algo" pasar, pero nunca lo sentía como una recompensa por jugar bien.
  it('mitad acertado pero LENTO (por encima de MS_BIEN) ya no alcanza "bien": es flojo', () => {
    const r = resultadoSparring(jugar(5, MS_BIEN + 50), jugador());
    expect(r.nivel).toBe('flojo');
    expect(Object.keys(r.mods)).toHaveLength(0);
  });

  it('mitad acertado y rapido (dentro de MS_BIEN) SI alcanza "bien"', () => {
    const r = resultadoSparring(jugar(5, MS_BIEN - 50), jugador());
    expect(r.nivel).toBe('bien');
  });

  // Causa real (parte 2): incluso cuando el resultado se aplicaba, el mod de
  // "bien" (velocidad+1, un solo punto en un solo atributo) es tan chico que
  // se pierde entre el resto de los sistemas del juego (mejora/campamento
  // suelen mover 3 a 12 puntos de una). El minijuego tiene que valer la pena
  // jugarlo bien: se sube la recompensa de ambos niveles alcanzables.
  it('el nivel "bien" da una recompensa notoria (no un solo punto suelto)', () => {
    const r = resultadoSparring(jugar(5, MS_BIEN - 50), jugador());
    const total = Object.values(r.mods).reduce((a, v) => a + Math.max(0, v), 0);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it('el nivel "perfecto" da claramente mas que "bien"', () => {
    const perfecto = resultadoSparring(jugar(10, 220), jugador());
    const bien = resultadoSparring(jugar(5, MS_BIEN - 50), jugador());
    const totalPerfecto = Object.values(perfecto.mods).reduce((a, v) => a + Math.max(0, v), 0);
    const totalBien = Object.values(bien.mods).reduce((a, v) => a + Math.max(0, v), 0);
    expect(totalPerfecto).toBeGreaterThan(totalBien);
  });
});

// Pedido v6 ("quiero que el timer sea por todo el juego, no solo por cada
// golpe"): el reloj único de la UI (ui/screens/sparring.js) fuerza el fin de
// la sesión con lo que ya se acumuló, en vez de esperar el golpe que falta.
describe('terminarPorTiempo', () => {
  it('marca terminado=true sin tocar aciertos/indice/tiempos ya acumulados', () => {
    let s = crearSparring(createRng(10), { jugador: jugador() });
    s = registrarGolpe(s, { acerto: true, ms: 300 });
    s = registrarGolpe(s, { acerto: false, ms: 500 });
    const cortado = terminarPorTiempo(s);
    expect(cortado.terminado).toBe(true);
    expect(cortado.aciertos).toBe(s.aciertos);
    expect(cortado.indice).toBe(s.indice);
    expect(cortado.tiempos).toEqual(s.tiempos);
  });

  it('sobre una sesion recien arrancada (0 golpes) tambien termina', () => {
    const s = crearSparring(createRng(11), { jugador: jugador() });
    const cortado = terminarPorTiempo(s);
    expect(cortado.terminado).toBe(true);
    expect(cortado.indice).toBe(0);
  });

  it('es idempotente: si ya estaba terminado, no cambia nada', () => {
    let s = crearSparring(createRng(12), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: true, ms: 250 });
    expect(s.terminado).toBe(true);
    expect(terminarPorTiempo(s)).toEqual(s);
  });

  it('no muta el original', () => {
    const s = crearSparring(createRng(13), { jugador: jugador() });
    const antes = JSON.stringify(s);
    terminarPorTiempo(s);
    expect(JSON.stringify(s)).toBe(antes);
  });

  it('resultadoSparring sobre una sesion cortada por tiempo sigue funcionando (ratio sobre objetivos, no sobre lo intentado)', () => {
    let s = crearSparring(createRng(14), { jugador: jugador() });
    for (let i = 0; i < 6; i++) s = registrarGolpe(s, { acerto: true, ms: 300 });
    const cortado = terminarPorTiempo(s);
    const r = resultadoSparring(cortado, jugador());
    expect(r.texto.length).toBeGreaterThan(0);
    expect(['perfecto', 'bien', 'flojo']).toContain(r.nivel);
  });
});
