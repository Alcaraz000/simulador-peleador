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

  // v13: el eje ético salía de `disciplinaPersonal` y `moral`, que ya no
  // existen. Ahora sale de la trayectoria: pelear seguido, ganar por
  // decisión y defender cinturones.
  it('una carrera larga y con defensas sube el legado etico', () => {
    const largo = partida();
    largo.jugador.record = { v: 25, d: 3, e: 1, ko: 8, sub: 0, dec: 17 };
    largo.jugador.defensas = 3;
    const corto = partida();
    corto.jugador.record = { v: 2, d: 1, e: 0, ko: 1, sub: 0, dec: 1 };
    corto.jugador.defensas = 0;
    const puntaje = (p) => calcularLegado(p).legados.find((l) => l.id === 'etico').puntaje;
    expect(puntaje(largo)).toBeGreaterThan(puntaje(corto));
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

  // Task 6.2 ("La carrera que no llegó también se cuenta"): con el nuevo
  // balance, 3 de cada 4 carreras no llegan al mundial. El cierre tiene que
  // hacerle justicia a las otras tres: armarse sobre lo que el peleador SÍ
  // hizo (cinturones que ganó, rachas, rival grande vencido), nunca sobre lo
  // que le faltó. Cuatro finales: mundial, nacional (nunca llegó al
  // mundial), regional (nunca pasó de ahí) y sin cinturón.
  describe('el cierre le hace justicia a cada carrera (Task 6.2)', () => {
    // Ninguna crónica de cierre puede sonar a fracaso, pase lo que pase en
    // la carrera. Lista deliberadamente angosta (no incluye "perdió" ni
    // "derrota": son lenguaje neutro de crónica de box cuando describen un
    // hecho puntual, p.ej. "invicto: nunca conoció la derrota").
    const LENGUAJE_DE_FRACASO = /fracas|no logr[oó]|no consigui[oó]|nunca pudo|decepcion|se qued[oó] corto|no alcanz[oó]|no fue suficiente|en vano|para nada/i;

    function jug(overrides) {
      return {
        nombre: 'Franco Medina', apodo: 'El Zurdo', nacionalidad: 'AR', disciplina: 'boxeo',
        estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
        ...overrides,
      };
    }

    function crear(overrides) {
      const jugador = { ...crearPeleador(jug(overrides)), ...overrides };
      const base = crearPartida({ jugador, semilla: 1 });
      return { ...base, jugador };
    }

    // --- Mundial: campeón del mundo, con historias bien distintas entre sí.
    const mundialInvicto = crear({
      nombre: 'Franco Medina', apodo: 'El Zurdo',
      record: { v: 22, d: 0, e: 0, ko: 14, sub: 0, dec: 8 },
      titulos: ['Cinturón mundial'], defensas: 5,
      historial: [
        { rivalId: 'r1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 5000, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 10 },
        { rivalId: 'r2', rivalNombre: 'Nico Salas', resultado: 'v', metodo: 'ko', round: 3, bolsa: 8000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: false, fecha: 30 },
        { rivalId: 'r3', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', rivalMedia: 91, resultado: 'v', metodo: 'ko', round: 6, bolsa: 90000, enJuego: 'Cinturón mundial', esTitulo: true, esObligatoria: false, fecha: 60 },
        { rivalId: 'r4', rivalNombre: 'Retador Uno', resultado: 'v', metodo: 'decision', round: 12, bolsa: 90000, enJuego: 'Cinturón mundial', esTitulo: true, esObligatoria: true, fecha: 80 },
        { rivalId: 'r5', rivalNombre: 'Retador Dos', resultado: 'v', metodo: 'ko', round: 8, bolsa: 90000, enJuego: 'Cinturón mundial', esTitulo: true, esObligatoria: true, fecha: 100 },
      ],
    });
    const mundialCaido = crear({
      nombre: 'Ezequiel Rossi', apodo: 'El Turco',
      record: { v: 26, d: 4, e: 1, ko: 15, sub: 0, dec: 11 },
      titulos: [], defensas: 2, // perdio el cetro antes de retirarse
      historial: [
        { rivalId: 'p1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 4000, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 15 },
        { rivalId: 'p2', rivalNombre: 'Nico Salas', resultado: 'v', metodo: 'decision', round: 12, bolsa: 6000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: false, fecha: 40 },
        { rivalId: 'p3', rivalNombre: 'Otro Rival', resultado: 'v', metodo: 'ko', round: 4, bolsa: 70000, enJuego: 'Cinturón mundial', esTitulo: true, esObligatoria: false, fecha: 70 },
        { rivalId: 'p4', rivalNombre: 'El Sucesor', resultado: 'd', metodo: 'decision', round: 12, bolsa: 70000, enJuego: 'Cinturón mundial', esTitulo: true, esObligatoria: true, fecha: 110 },
      ],
    });

    // --- Nacional: nunca llego al mundial.
    const nacionalDefensor = crear({
      nombre: 'Bruno Aguirre', apodo: 'El Bruno',
      record: { v: 18, d: 2, e: 0, ko: 9, sub: 0, dec: 9 },
      titulos: ['Cinturón nacional'], defensas: 4,
      historial: [
        { rivalId: 'n1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 3000, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 12 },
        { rivalId: 'n2', rivalNombre: 'Nico Salas', resultado: 'v', metodo: 'ko', round: 2, bolsa: 5000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: false, fecha: 35 },
        { rivalId: 'n3', rivalNombre: 'Retador A', resultado: 'v', metodo: 'decision', round: 12, bolsa: 20000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: true, fecha: 55 },
        { rivalId: 'n4', rivalNombre: 'Retador B', resultado: 'v', metodo: 'decision', round: 12, bolsa: 20000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: true, fecha: 75 },
      ],
    });
    const nacionalCaido = crear({
      nombre: 'Ramiro Solís', apodo: 'El Ramiro',
      record: { v: 15, d: 5, e: 0, ko: 6, sub: 0, dec: 9 },
      titulos: [], defensas: 1,
      historial: [
        { rivalId: 'm1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 2500, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 14 },
        { rivalId: 'm2', rivalNombre: 'Nico Salas', resultado: 'v', metodo: 'decision', round: 12, bolsa: 4500, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: false, fecha: 38 },
        { rivalId: 'm3', rivalNombre: 'El que se lo sacó', resultado: 'd', metodo: 'ko', round: 9, bolsa: 18000, enJuego: 'Cinturón nacional', esTitulo: true, esObligatoria: true, fecha: 58 },
      ],
    });

    // --- Regional: nunca paso de ahi.
    const regionalFirme = crear({
      nombre: 'Tomás Ferreyra', apodo: 'El Tomi',
      record: { v: 10, d: 3, e: 0, ko: 4, sub: 0, dec: 6 },
      titulos: ['Cinturón regional'], defensas: 1,
      historial: [
        { rivalId: 'g1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 1500, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 16 },
        { rivalId: 'g2', rivalNombre: 'Retador Regional', resultado: 'v', metodo: 'ko', round: 5, bolsa: 3000, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 40 },
      ],
    });
    const regionalCaido = crear({
      nombre: 'Walter Núñez', apodo: 'El Walter',
      record: { v: 9, d: 6, e: 0, ko: 3, sub: 0, dec: 6 },
      titulos: [], defensas: 0,
      historial: [
        { rivalId: 'h1', rivalNombre: 'Julio Barrera', resultado: 'v', metodo: 'decision', round: 12, bolsa: 1200, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: false, fecha: 18 },
        { rivalId: 'h2', rivalNombre: 'El que se lo sacó', resultado: 'd', metodo: 'decision', round: 12, bolsa: 3000, enJuego: 'Cinturón regional', esTitulo: true, esObligatoria: true, fecha: 45 },
      ],
    });

    // --- Sin titulo: nunca gano ninguno.
    const sinTituloParejo = crear({
      nombre: 'Ariel Cabrera', apodo: 'El Cabra',
      record: { v: 12, d: 10, e: 1, ko: 5, sub: 0, dec: 7 },
      titulos: [], defensas: 0,
      historial: [
        { rivalId: 's1', rivalNombre: 'Rival Parejo', resultado: 'v', metodo: 'decision', round: 10, bolsa: 2000, enJuego: 'Ranking', esTitulo: false, fecha: 20 },
        { rivalId: 's2', rivalNombre: 'Rival Duro', resultado: 'd', metodo: 'decision', round: 10, bolsa: 2000, enJuego: 'Ranking', esTitulo: false, fecha: 40 },
      ],
    });
    const sinTituloLargo = crear({
      nombre: 'Gastón Peralta', apodo: 'El Gastón',
      record: {
        v: 14, d: 16, e: 2, ko: 5, sub: 0, dec: 9,
      },
      titulos: [], defensas: 0,
      historial: Array.from({ length: 15 }, (_, i) => ({
        rivalId: `t${i}`, rivalNombre: `Rival ${i}`, resultado: i % 3 === 0 ? 'd' : 'v', metodo: 'decision', round: 10, bolsa: 1500, enJuego: 'Ranking', esTitulo: false, fecha: 10 + i * 5,
      })),
    });

    const fixtures = {
      mundial: [mundialInvicto, mundialCaido],
      nacional: [nacionalDefensor, nacionalCaido],
      regional: [regionalFirme, regionalCaido],
      sinTitulo: [sinTituloParejo, sinTituloLargo],
    };

    for (const [tipo, [a, b]] of Object.entries(fixtures)) {
      describe(`final de tipo "${tipo}"`, () => {
        it('no usa lenguaje de derrota ni de fracaso', () => {
          for (const p of [a, b]) {
            const { biografia } = calcularLegado(p);
            expect(biografia).not.toMatch(LENGUAJE_DE_FRACASO);
          }
        });

        it('es determinista: la misma carrera siempre cierra igual', () => {
          expect(calcularLegado(a).biografia).toBe(calcularLegado(a).biografia);
        });

        it('dos carreras distintas del mismo tipo no cierran con el mismo texto', () => {
          expect(calcularLegado(a).biografia).not.toBe(calcularLegado(b).biografia);
        });
      });
    }

    it('el final mundial destaca el cinturon mundial', () => {
      // "cinturón mundial"/"campeón mundial" y "campeón del mundo" son
      // equivalentes en la voz de crónica de box: alguna de las variantes de
      // apertura siempre usa una u otra forma.
      for (const p of fixtures.mundial) {
        expect(calcularLegado(p).biografia).toMatch(/mundial|del mundo/i);
      }
    });

    it('el final nacional destaca el cinturon nacional, sin mencionar el mundial', () => {
      for (const p of fixtures.nacional) {
        const { biografia } = calcularLegado(p);
        expect(biografia).toMatch(/nacional/i);
        expect(biografia).not.toMatch(/mundial/i);
      }
    });

    it('el final regional destaca el cinturon regional, sin mencionar nacional ni mundial', () => {
      for (const p of fixtures.regional) {
        const { biografia } = calcularLegado(p);
        expect(biografia).toMatch(/regional/i);
        expect(biografia).not.toMatch(/nacional|mundial/i);
      }
    });

    it('el final sin titulo nunca dice que se colgo o conquisto un cinturon', () => {
      for (const p of fixtures.sinTitulo) {
        const { biografia } = calcularLegado(p);
        expect(biografia).not.toMatch(/se colg(ó|o)|se qued(ó|o) con|conquist|se calz(ó|o)/i);
      }
    });

    it('el final sin titulo igual destaca algo propio de la carrera (record o cantidad de peleas)', () => {
      for (const p of fixtures.sinTitulo) {
        const { biografia } = calcularLegado(p);
        const { v, d, e } = p.jugador.record;
        const peleas = v + d + e;
        const mencionaAlgoPropio = biografia.includes(String(v)) || biografia.includes(String(peleas));
        expect(mencionaAlgoPropio).toBe(true);
      }
    });

    it('un campeon que gano el titulo maximo y lo defendio varias veces, se lo menciona', () => {
      // Distintas variantes cuentan el hecho con palabras distintas
      // ("defendió", "puso el cinturón en juego"...) — lo que tiene que
      // aparecer siempre es el número real de defensas de esta carrera.
      const { biografia } = calcularLegado(nacionalDefensor);
      expect(biografia).toContain(String(nacionalDefensor.jugador.defensas));
    });

    it('un invicto se retira y el cierre lo dice', () => {
      const { biografia } = calcularLegado(mundialInvicto);
      expect(biografia).toMatch(/invict/i);
    });
  });
});

// Reportado por el usuario con captura (v17): "gané el cinturón regional,
// después lo perdí, después lo gané nuevamente, y en el historial NO aparece
// la vez que lo gané por primera vez y lo perdí". Un cinturón puede tener
// varios reinados y todos son parte de la historia de la carrera.
describe('un cinturón ganado, perdido y reconquistado', () => {
  function carreraConReconquista() {
    const p = partida();
    p.jugador.historial = [
      { esTitulo: true, enJuego: 'Cinturón regional', resultado: 'v', esObligatoria: false, fecha: 300, rivalNombre: 'Primero' },
      { esTitulo: true, enJuego: 'Cinturón regional', resultado: 'v', esObligatoria: true, fecha: 360, rivalNombre: 'Retador' },
      { esTitulo: true, enJuego: 'Cinturón regional', resultado: 'd', esObligatoria: true, fecha: 420, rivalNombre: 'Verdugo' },
      { esTitulo: true, enJuego: 'Cinturón regional', resultado: 'v', esObligatoria: false, fecha: 500, rivalNombre: 'Verdugo' },
    ];
    return p;
  }

  it('guarda los DOS reinados, no solo el último', () => {
    const { titulosDetalle } = calcularLegado(carreraConReconquista());
    const regionales = titulosDetalle.filter((t) => t.nombre === 'Cinturón regional');
    expect(regionales).toHaveLength(2);
  });

  it('el primer reinado conserva su conquista, su defensa y la noche que lo perdio', () => {
    const { titulosDetalle } = calcularLegado(carreraConReconquista());
    const primero = titulosDetalle.filter((t) => t.nombre === 'Cinturón regional')[0];
    expect(primero.fechaGanado).toBeTruthy();
    expect(primero.defensas).toHaveLength(1);
    expect(primero.fechaPerdido).toBeTruthy();
  });

  it('el segundo reinado arranca limpio: no hereda las defensas del primero', () => {
    const { titulosDetalle } = calcularLegado(carreraConReconquista());
    const segundo = titulosDetalle.filter((t) => t.nombre === 'Cinturón regional')[1];
    expect(segundo.fechaGanado).toBeTruthy();
    expect(segundo.defensas).toHaveLength(0);
    expect(segundo.fechaPerdido).toBeNull();
  });

  it('un cinturon con un solo reinado sigue apareciendo una sola vez', () => {
    const p = partida();
    p.jugador.historial = [
      { esTitulo: true, enJuego: 'Cinturón nacional', resultado: 'v', esObligatoria: false, fecha: 300, rivalNombre: 'Uno' },
    ];
    const { titulosDetalle } = calcularLegado(p);
    expect(titulosDetalle.filter((t) => t.nombre === 'Cinturón nacional')).toHaveLength(1);
  });
});
