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

  // v13: el legado mediático ya no sale de la fama (eliminada) — sale de
  // cinturones, defensas y nocauts (ver puntajeMediatico, legacy.js). Un
  // campeón con varias defensas y nocauts da mucho más que hablar que un
  // debutante sin nada en el récord.
  it('los cinturones, las defensas y los nocauts suben el legado mediatico', () => {
    const puntaje = (p) => calcularLegado(p).legados.find((l) => l.id === 'mediatico').puntaje;
    const desconocido = partida();
    const campeon = partida({
      titulos: ['Cinturón mundial'],
      defensas: 4,
      record: {
        v: 20, d: 2, e: 0, ko: 12, sub: 0, dec: 6,
      },
    });
    expect(puntaje(campeon)).toBeGreaterThan(puntaje(desconocido));
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

  // Reproduce el bug reportado por el usuario, textual: "Le ganó a Julio
  // Barrera y se quedó con el Cinturón regional." aparecía DOS VECES en
  // Momentos memorables. La causa real: ganar un título (nivel 'titulo') y
  // defenderlo (nivel 'defensa') comparten esTitulo:true + resultado:'v', y
  // antes del fix las dos ramas usaban la misma frase de "se quedó con".
  describe('momentos memorables — causa real de las frases repetidas', () => {
    it('defender un titulo NO repite la frase de haberlo ganado', () => {
      const p = partida({
        historial: [
          {
            rivalId: 'r1', rivalNombre: 'Julio Barrera', rivalApodo: 'El Zurdo',
            resultado: 'v', metodo: 'decision', round: 12, bolsa: 100,
            enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 10,
          },
          {
            rivalId: 'r1', rivalNombre: 'Julio Barrera', rivalApodo: 'El Zurdo',
            resultado: 'v', metodo: 'decision', round: 12, bolsa: 100,
            enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 40,
          },
        ],
        titulos: ['Cinturón regional'],
      });
      const legado = calcularLegado(p);
      expect(legado.momentos).toHaveLength(2);
      expect(legado.momentos[0]).not.toBe(legado.momentos[1]);
      // La frase de "se quedó con"/"se colgó" es específica de CONQUISTAR el
      // título — una defensa no puede sonar igual que ganarlo por primera vez.
      expect(legado.momentos[1]).not.toMatch(/se qued(ó|o) con|se colg(ó|o)/i);
    });

    it('sin esObligatoria (historial viejo), sigue tratándolo como titulo ganado', () => {
      const p = partida({
        historial: [{
          rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón',
          resultado: 'v', metodo: 'decision', round: 12, bolsa: 100,
          enJuego: 'Cinturón regional', esTitulo: true,
        }],
      });
      const legado = calcularLegado(p);
      expect(legado.momentos[0]).toContain('Dyke Tyzon');
    });
  });

  describe('linea de tiempo de titulos (fechas de conquista y defensa)', () => {
    function historialTitulo() {
      return [
        {
          rivalId: 'r1', rivalNombre: 'Julio Barrera', rivalApodo: 'El Zurdo',
          resultado: 'v', metodo: 'decision', round: 12, bolsa: 100,
          enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 10,
        },
        {
          rivalId: 'r2', rivalNombre: 'Nico Salas', rivalApodo: 'El Nico',
          resultado: 'v', metodo: 'ko', round: 3, bolsa: 100,
          enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 62,
        },
      ];
    }

    it('trae fecha de conquista y de cada defensa del titulo', () => {
      const p = partida({ historial: historialTitulo(), titulos: ['Cinturón regional'] });
      const legado = calcularLegado(p);
      const regional = legado.titulosDetalle.find((t) => t.nombre === 'Cinturón regional');
      expect(regional).toBeTruthy();
      expect(regional.fechaGanado).toBeTruthy();
      expect(regional.defensas).toHaveLength(1);
      expect(regional.defensas[0].rivalNombre).toBe('Nico Salas');
      expect(regional.defensas[0].fecha).toBeTruthy();
    });

    it('si despues lo pierde, queda la fecha en que lo perdio y sin defensas activas', () => {
      const historial = [
        ...historialTitulo(),
        {
          rivalId: 'r3', rivalNombre: 'Un Retador', rivalApodo: 'El Retador',
          resultado: 'd', metodo: 'ko', round: 5, bolsa: 100,
          enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 90,
        },
      ];
      const p = partida({ historial, titulos: [] });
      const legado = calcularLegado(p);
      const regional = legado.titulosDetalle.find((t) => t.nombre === 'Cinturón regional');
      expect(regional.fechaPerdido).toBeTruthy();
    });

    it('sin fecha guardada (hitos viejos), no revienta y no muestra fecha', () => {
      const p = partida({
        historial: [{
          rivalId: 'r1', rivalNombre: 'Julio Barrera', rivalApodo: 'El Zurdo',
          resultado: 'v', metodo: 'decision', round: 12, bolsa: 100,
          enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false,
        }],
        titulos: ['Cinturón regional'],
      });
      expect(() => calcularLegado(p)).not.toThrow();
      const regional = calcularLegado(p).titulosDetalle.find((t) => t.nombre === 'Cinturón regional');
      expect(regional.fechaGanado).toBeNull();
    });

    it('sin titulos, la linea de tiempo queda vacia', () => {
      expect(calcularLegado(partida()).titulosDetalle).toEqual([]);
    });
  });

  // El usuario preguntó textualmente qué significa "¿Legado nacional?" — los
  // cinco ejes necesitan nombre y bajada que se entiendan sin explicación.
  describe('los cinco ejes del legado se entienden solos', () => {
    it('el eje nacional ya no se llama "Legado nacional" a secas', () => {
      const nacional = calcularLegado(partida()).legados.find((l) => l.id === 'nacional');
      expect(nacional.nombre).not.toBe('Legado nacional');
      expect(nacional.texto.toLowerCase()).toContain('país');
    });

    it('ningun eje repite el texto generico anterior', () => {
      const viejos = [
        'Lo que hiciste arriba del ring.',
        'Lo que significaste para tu país.',
        'Lo que construiste con la plata.',
        'Cuánto se habló de vos.',
        'Cómo hiciste las cosas.',
      ];
      for (const l of calcularLegado(partida()).legados) {
        expect(viejos).not.toContain(l.texto);
      }
    });
  });
});
