import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { calcularLegado } from '../../src/core/legacy.js';

function partida(overrides = {}) {
  const jugador = {
    ...crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...overrides,
  };
  const base = crearPartida({ jugador, semilla: 1 });
  return { ...base, jugador };
}

describe('calcularLegado', () => {
  it('devuelve la estructura completa', () => {
    const legado = calcularLegado(partida());
    expect(typeof legado.record).toBe('string');
    expect(Array.isArray(legado.titulos)).toBe(true);
    expect(Array.isArray(legado.momentos)).toBe(true);
    expect(typeof legado.biografia).toBe('string');
    expect(legado.legados).toHaveLength(5);
  });

  it('nombra los cinco legados', () => {
    const ids = calcularLegado(partida()).legados.map((l) => l.id).sort();
    expect(ids).toEqual(['deportivo', 'economico', 'etico', 'mediatico', 'nacional']);
  });

  it('todos los puntajes quedan entre 0 y 100', () => {
    for (const l of calcularLegado(partida({ dinero: 999999999, fama: 100 })).legados) {
      expect(l.puntaje).toBeGreaterThanOrEqual(0);
      expect(l.puntaje).toBeLessThanOrEqual(100);
    }
  });

  it('una carrera vacia da legado deportivo bajo', () => {
    const legado = calcularLegado(partida());
    expect(legado.legados.find((l) => l.id === 'deportivo').puntaje).toBeLessThan(30);
  });

  it('titulos y victorias suben el legado deportivo', () => {
    const legado = calcularLegado(partida({
      record: { v: 40, d: 2, e: 0, ko: 30, sub: 0, dec: 10 },
      titulos: ['Título mundial'], defensas: 8,
    }));
    expect(legado.legados.find((l) => l.id === 'deportivo').puntaje).toBeGreaterThan(70);
  });

  it('la plata y los lujos suben el legado economico', () => {
    const pobre = calcularLegado(partida({ dinero: 0, lujos: [] }));
    const rico = calcularLegado(partida({ dinero: 5000000, lujos: ['auto', 'casa', 'mansion'] }));
    const puntaje = (l) => l.legados.find((x) => x.id === 'economico').puntaje;
    expect(puntaje(rico)).toBeGreaterThan(puntaje(pobre));
  });

  it('la fama sube el legado mediatico', () => {
    const puntaje = (fama) => calcularLegado(partida({ fama })).legados.find((l) => l.id === 'mediatico').puntaje;
    expect(puntaje(95)).toBeGreaterThan(puntaje(5));
  });

  it('la disciplina personal sube el legado etico', () => {
    const alto = partida();
    alto.jugador.especiales = { ...alto.jugador.especiales, disciplinaPersonal: 95 };
    const bajo = partida();
    bajo.jugador.especiales = { ...bajo.jugador.especiales, disciplinaPersonal: 10 };
    const puntaje = (p) => calcularLegado(p).legados.find((l) => l.id === 'etico').puntaje;
    expect(puntaje(alto)).toBeGreaterThan(puntaje(bajo));
  });

  it('cada legado trae etiqueta y texto', () => {
    for (const l of calcularLegado(partida()).legados) {
      expect(l.etiqueta.length).toBeGreaterThan(0);
      expect(l.texto.length).toBeGreaterThan(0);
      expect(l.nombre.length).toBeGreaterThan(0);
    }
  });

  it('la biografia menciona nombre y record', () => {
    const legado = calcularLegado(partida({ record: { v: 20, d: 3, e: 0, ko: 15, sub: 0, dec: 5 } }));
    expect(legado.biografia).toContain('Lucas Ortiz');
    expect(legado.biografia).toContain('20');
  });

  it('lista los momentos memorables del historial', () => {
    const p = partida({
      historial: [
        { rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', resultado: 'v', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Título mundial', esTitulo: true },
        { rivalId: 'r2', rivalNombre: 'Otro', rivalApodo: 'El Otro', resultado: 'd', metodo: 'decision', round: 12, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
      ],
      titulos: ['Título mundial'],
    });
    const legado = calcularLegado(p);
    expect(legado.momentos.length).toBeGreaterThan(0);
    expect(legado.momentos.join(' ')).toContain('Dyke Tyzon');
  });

  it('destaca al archirrival', () => {
    const p = partida();
    p.rivalidades = [{ rivalId: p.mundo.roster[0].id, heat: 90, h2h: { v: 1, d: 1, e: 0 }, esArchirrival: true, hitos: [] }];
    const legado = calcularLegado(p);
    expect(legado.archirrival).not.toBeNull();
    expect(legado.archirrival.h2h).toBe('1-1');
  });

  it('sin rivalidades el archirrival es null', () => {
    expect(calcularLegado(partida()).archirrival).toBeNull();
  });

  it('cuenta las lesiones graves del historial medico', () => {
    const p = partida();
    p.jugador.lesionesSufridas = [{ severidad: 3 }, { severidad: 1 }, { severidad: 3 }];
    expect(calcularLegado(p).lesionesGraves).toBe(2);
  });
});
