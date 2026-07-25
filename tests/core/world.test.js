import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearMundo, avanzarMundo, recalcularRankings, buscarRival, rankingDelJugador } from '../../src/core/world.js';
import { mediaDe } from '../../src/core/fighter.js';

const opciones = { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 };

function mundo() {
  return crearMundo(createRng(20), opciones);
}

describe('crearMundo', () => {
  it('arma roster con ranking y anio inicial', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.roster).toHaveLength(10);
    expect(mundo.roster[0].ranking).toBe(1);
    expect(typeof mundo.anio).toBe('number');
    expect(mundo.titulares).toEqual([]);
  });

  it('corona campeon al numero uno', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.campeonId).toBe(mundo.roster[0].id);
  });
});

describe('avanzarMundo', () => {
  it('no muta el mundo original', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const antes = JSON.stringify(mundo);
    avanzarMundo(mundo, createRng(3), { aniosPasados: 1 });
    expect(JSON.stringify(mundo)).toBe(antes);
  });

  it('envejece a los peleadores', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const edadAntes = mundo.roster[0].edad;
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(3), { aniosPasados: 2 });
    const mismo = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    if (mismo) expect(mismo.edad).toBe(edadAntes + 2);
  });

  it('genera peleas entre rivales y sucesos', () => {
    const mundo = crearMundo(createRng(4), opciones);
    const { sucesos } = avanzarMundo(mundo, createRng(5), { aniosPasados: 1 });
    expect(sucesos.length).toBeGreaterThan(0);
    expect(sucesos.every((s) => typeof s.texto === 'string' && s.texto.length > 0)).toBe(true);
  });

  it('acumula peleas en los records', () => {
    const mundo = crearMundo(createRng(6), opciones);
    const totalAntes = mundo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(7), { aniosPasados: 1 });
    const totalDespues = nuevo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    expect(totalDespues).toBeGreaterThan(totalAntes);
  });

  it('retira a los muy veteranos y avisa', () => {
    const mundo = crearMundo(createRng(8), opciones);
    mundo.roster[0].edad = 41;
    const { mundo: nuevo, sucesos } = avanzarMundo(mundo, createRng(9), { aniosPasados: 1 });
    const retirado = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    expect(retirado.retirado).toBe(true);
    expect(sucesos.some((s) => s.tipo === 'retiro')).toBe(true);
  });

  it('mantiene el ranking consecutivo entre los activos', () => {
    const mundo = crearMundo(createRng(10), opciones);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(11), { aniosPasados: 3 });
    const activos = nuevo.roster.filter((p) => !p.retirado);
    expect(activos.map((p) => p.ranking)).toEqual(activos.map((_, i) => i + 1));
  });

  it('es determinista con la misma semilla', () => {
    const mundo = crearMundo(createRng(12), opciones);
    const a = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    const b = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    expect(a.sucesos).toEqual(b.sucesos);
  });

  it('si el jugador es campeon, no corona a otro NPC cuando el titular pierde', () => {
    // Fuerza a que el actual "campeón" del mundo (campeonId) pierda su combate
    // en cuanto arranca la simulación: con jugadorEsCampeon:false esto SIEMPRE
    // corona a otro. Con jugadorEsCampeon:true, el jugador tiene puesto ese
    // cinturón y el mundo no debe tocarlo.
    const mundo = crearMundo(createRng(30), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].atributos = { ...mundo.roster[0].atributos, potencia: 1, velocidad: 1, tecnica: 1, defensa: 1, cardio: 1, iq: 1 };
    const { sucesos, mundo: nuevo } = avanzarMundo(mundo, createRng(31), { aniosPasados: 1, jugadorEsCampeon: true });
    expect(sucesos.some((s) => s.tipo === 'titulo')).toBe(false);
    expect(nuevo.campeonId).toBe(mundo.campeonId);
  });

  it('si el jugador es campeon, no declara vacante aunque el titular se retire', () => {
    const mundo = crearMundo(createRng(32), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].edad = 41; // se retira este mismo avance
    const { sucesos, mundo: nuevo } = avanzarMundo(mundo, createRng(33), { aniosPasados: 1, jugadorEsCampeon: true });
    expect(sucesos.some((s) => s.texto.includes('cinturón vacante'))).toBe(false);
    expect(nuevo.campeonId).toBe(mundo.campeonId);
  });

  it('sin jugadorEsCampeon (por defecto), el comportamiento de siempre sigue intacto', () => {
    const mundo = crearMundo(createRng(32), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].edad = 41;
    const { sucesos } = avanzarMundo(mundo, createRng(33), { aniosPasados: 1 });
    expect(sucesos.some((s) => s.texto.includes('cinturón vacante'))).toBe(true);
  });

  it('clona titulares: mutar el mundo devuelto no afecta al original y viceversa', () => {
    const mundo = crearMundo(createRng(21), opciones);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(22), { aniosPasados: 1 });
    nuevo.titulares.push({ nombre: 'Título de prueba' });
    expect(mundo.titulares).toEqual([]);
    mundo.titulares.push({ nombre: 'Otro título' });
    expect(nuevo.titulares).toHaveLength(1);
  });
});

describe('recalcularRankings', () => {
  it('ordena por media y no rankea retirados', () => {
    const mundo = crearMundo(createRng(14), opciones);
    mundo.roster[0].retirado = true;
    const ordenado = recalcularRankings(mundo.roster);
    const activos = ordenado.filter((p) => !p.retirado);
    expect(activos[0].ranking).toBe(1);
    expect(ordenado.find((p) => p.retirado).ranking).toBeNull();
    for (let i = 1; i < activos.length; i++) {
      expect(mediaDe(activos[i - 1])).toBeGreaterThanOrEqual(mediaDe(activos[i]));
    }
  });
});

describe('rankingDelJugador', () => {
  it('un peleador flojo queda ultimo', () => {
    const m = mundo();
    const flojo = { ...m.roster[0], atributos: { ...m.roster[0].atributos, potencia: 1, velocidad: 1, tecnica: 1, defensa: 1, cardio: 1, iq: 1 }, record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    expect(rankingDelJugador(m, flojo)).toBeGreaterThan(5);
  });

  it('un peleador crack queda primero', () => {
    const m = mundo();
    const crack = { ...m.roster[0], atributos: { potencia: 99, velocidad: 99, tecnica: 99, defensa: 99, cardio: 99, iq: 99, grappling: 1 }, record: { v: 30, d: 0, e: 0, ko: 25, sub: 0, dec: 5 } };
    expect(rankingDelJugador(m, crack)).toBe(1);
  });

  it('ganar peleas mejora el puesto', () => {
    const m = mundo();
    const base = { ...m.roster[5], record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    const ganador = { ...base, record: { v: 12, d: 0, e: 0, ko: 8, sub: 0, dec: 4 } };
    expect(rankingDelJugador(m, ganador)).toBeLessThanOrEqual(rankingDelJugador(m, base));
  });

  it('siempre devuelve un puesto valido', () => {
    const m = mundo();
    const puesto = rankingDelJugador(m, m.roster[3]);
    expect(puesto).toBeGreaterThanOrEqual(1);
    expect(puesto).toBeLessThanOrEqual(m.roster.length + 1);
  });
});

describe('buscarRival', () => {
  it('devuelve un activo del roster', () => {
    const mundo = crearMundo(createRng(15), opciones);
    const rival = buscarRival(mundo, {});
    expect(mundo.roster.map((p) => p.id)).toContain(rival.id);
    expect(rival.retirado).toBe(false);
  });

  it('excluye los ids pedidos', () => {
    const mundo = crearMundo(createRng(16), opciones);
    const excluidos = mundo.roster.slice(0, 8).map((p) => p.id);
    const rival = buscarRival(mundo, { excluirIds: excluidos });
    expect(excluidos).not.toContain(rival.id);
  });

  it('prefiere rivales cerca del ranking pedido', () => {
    const mundo = crearMundo(createRng(17), opciones);
    const rival = buscarRival(mundo, { rankingCerca: 3 });
    expect(Math.abs(rival.ranking - 3)).toBeLessThanOrEqual(3);
  });

  it('devuelve null si no queda nadie', () => {
    const mundo = crearMundo(createRng(18), opciones);
    const todos = mundo.roster.map((p) => p.id);
    expect(buscarRival(mundo, { excluirIds: todos })).toBeNull();
  });
});
