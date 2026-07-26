import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_REDES } from '../../src/content/cards-social.js';
import { elegirEvento, elegirCartaRedes, resolverOpcion } from '../../src/core/events.js';

const RAREZAS_VALIDAS = ['normal', 'rara', 'legendaria'];

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de eventos', () => {
  it('tiene al menos doce cartas con id unico', () => {
    expect(CARTAS_EVENTO.length).toBeGreaterThanOrEqual(12);
    const ids = CARTAS_EVENTO.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta ofrece dos o tres opciones', () => {
    for (const carta of CARTAS_EVENTO) {
      expect(carta.opciones.length).toBeGreaterThanOrEqual(2);
      expect(carta.opciones.length).toBeLessThanOrEqual(3);
    }
  });

  it('cada opcion tiene efecto directo o probabilistico', () => {
    for (const carta of CARTAS_EVENTO) {
      for (const opcion of carta.opciones) {
        const tieneAlgo = Boolean(opcion.mods || opcion.probabilidades || opcion.efectos);
        expect(tieneAlgo).toBe(true);
      }
    }
  });

  it('mezcla eventos de carrera y de vida personal', () => {
    const categorias = new Set(CARTAS_EVENTO.map((c) => c.categoria));
    expect(categorias).toContain('evento');
    expect(categorias).toContain('vida');
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_EVENTO) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('tiene 1 o 2 eventos legendarios, potentes de verdad', () => {
    const legendarios = CARTAS_EVENTO.filter((c) => c.rareza === 'legendaria');
    expect(legendarios.length).toBeGreaterThanOrEqual(1);
    expect(legendarios.length).toBeLessThanOrEqual(2);
    for (const carta of legendarios) {
      const sumaPositivos = carta.opciones.reduce((acc, o) => {
        const deMods = Object.values(o.mods ?? {}).filter((v) => v > 0).reduce((a, b) => a + b, 0);
        return Math.max(acc, deMods);
      }, 0);
      expect(sumaPositivos).toBeGreaterThanOrEqual(8);
    }
  });
});

// Task v3 ("cartas nuevas con azar"): el pedido explícito del usuario — al
// menos 8 cartas nuevas con `probabilidades`, repartidas entre etapas (no
// todas en profesional, como pasaba con dopaje/chantaje/entrenador), con el
// patrón "arriesgar (con probabilidades) o no arriesgar (la otra opción, que
// no hace nada)", y con que "se cae la pelea" sea una consecuencia real —
// cancele de verdad la oferta pendiente vía `caePelea` — no solo texto.
describe('cartas de riesgo (Task v3)', () => {
  const conProbabilidades = () => [
    ...CARTAS_EVENTO.flatMap((c) => c.opciones.map((o) => ({ carta: c, opcion: o }))),
    ...CARTAS_REDES.flatMap((c) => c.opciones.map((o) => ({ carta: c, opcion: o }))),
  ].filter(({ opcion }) => opcion.probabilidades);

  it('hay al menos 8 opciones con probabilidades en todo el juego (evento + redes), sin contar las 3 históricas de profesional', () => {
    const historicas = new Set(['dopaje', 'chantaje', 'entrenador']);
    const nuevas = conProbabilidades().filter(({ carta }) => !historicas.has(carta.id));
    expect(nuevas.length).toBeGreaterThanOrEqual(8);
  });

  it('las cartas con azar ya no viven solo en profesional/veterano: al menos una es elegible desde juvenil', () => {
    const conAzarEnJuvenil = CARTAS_EVENTO.filter(
      (c) => c.etapas.includes('juvenil') && c.opciones.some((o) => o.probabilidades),
    );
    expect(conAzarEnJuvenil.length).toBeGreaterThanOrEqual(1);
  });

  // Solo las cartas nuevas con el patrón BINARIO "arriesgar o no" (2
  // opciones: la de riesgo y la segura) — el pedido explícito del usuario de
  // "rechazar no hace nada" es para ese patrón puntual. Las históricas
  // (dopaje/chantaje/entrenador) ya existían antes y sí le dan un consuelo
  // chico a la opción segura; 'polemica_calculada' (redes) sigue el patrón de
  // 3 tonos preexistente de CARTAS_REDES (provocador/humilde/promocional),
  // no el binario, así que tampoco aplica acá.
  it('cada carta nueva con el patrón binario arriesgar-o-no trae una opción segura que no hace nada (sin mods ni efectos)', () => {
    const historicas = new Set(['dopaje', 'chantaje', 'entrenador']);
    for (const { carta, opcion } of conProbabilidades()) {
      if (historicas.has(carta.id) || carta.opciones.length !== 2) continue;
      const segura = carta.opciones.find((o) => o.id !== opcion.id && !o.probabilidades);
      expect(segura, `la carta "${carta.id}" no tiene una opción segura junto a "${opcion.id}"`).toBeTruthy();
      expect(Object.keys(segura.mods ?? {})).toHaveLength(0);
      expect(segura.efectos).toBeUndefined();
    }
  });

  it('al menos 2 cartas nuevas tienen una rama que hace caer la pelea de verdad (caePelea, no solo texto)', () => {
    const conCaePelea = conProbabilidades().filter(
      ({ opcion }) => opcion.probabilidades.some((r) => r.caePelea),
    );
    expect(conCaePelea.length).toBeGreaterThanOrEqual(2);
  });

  it('toda rama de probabilidades suma 100% via porcentajesDe (repetido: mismas cartas nuevas)', () => {
    for (const { opcion } of conProbabilidades()) {
      const pesos = opcion.probabilidades.map((r) => r.peso);
      expect(pesos.every((p) => p >= 0)).toBe(true);
      expect(pesos.some((p) => p > 0)).toBe(true);
    }
  });
});

describe('catalogo de redes', () => {
  it('tiene al menos ocho cartas de tres opciones', () => {
    expect(CARTAS_REDES.length).toBeGreaterThanOrEqual(8);
    for (const carta of CARTAS_REDES) expect(carta.opciones).toHaveLength(3);
  });

  it('siempre hay una opcion que sube el heat del rival', () => {
    for (const carta of CARTAS_REDES) {
      expect(carta.opciones.some((o) => (o.efectos?.heatRival ?? 0) > 0)).toBe(true);
    }
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_REDES) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('tiene al menos una carta de redes legendaria, potente de verdad', () => {
    const legendarias = CARTAS_REDES.filter((c) => c.rareza === 'legendaria');
    expect(legendarias.length).toBeGreaterThanOrEqual(1);
    for (const carta of legendarias) {
      const famaMaxima = Math.max(...carta.opciones.map((o) => o.efectos?.fama ?? 0));
      expect(famaMaxima).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('elegirEvento', () => {
  it('respeta la etapa', () => {
    const carta = elegirEvento(createRng(1), { jugador: jugador(), etapa: 'juvenil' });
    expect(carta.etapas).toContain('juvenil');
  });

  it('puede filtrar por categoria', () => {
    const carta = elegirEvento(createRng(2), { jugador: jugador(), etapa: 'profesional', categoria: 'vida' });
    expect(carta.categoria).toBe('vida');
  });

  it('es determinista', () => {
    const a = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    const b = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    expect(a.id).toBe(b.id);
  });

  it('la carta elegida trae su rareza intacta', () => {
    const carta = elegirEvento(createRng(14), { jugador: jugador(), etapa: 'profesional' });
    expect(RAREZAS_VALIDAS).toContain(carta.rareza);
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const carta = elegirEvento(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
      conteo[carta.rareza] += 1;
    }
    const pct = (n) => (100 * conteo[n]) / 500;
    expect(pct('normal')).toBeGreaterThan(50);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(45);
    expect(pct('legendaria')).toBeLessThan(15);
  });

  // Guarda de contenido (Task 6.2, revisión del coordinador): en juvenil y
  // amateur, categoría 'evento' llegó a tener UN SOLO elemento elegible
  // (sparring_idolo, el único con etapas: SIEMPRE — todos los demás eran
  // etapas: PRO). elegirPorRareza no tiene margen para que el peso
  // "legendaria" (~5%) importe cuando es la única carta del pool: salía
  // garantizado, no por suerte (medido: 56% de las carreras, no ~5%). Este
  // test vigila que el pool de 'evento' en juvenil/amateur tenga variedad
  // real y que la proporción de rarezas vuelva a acercarse a 70/25/5, no
  // que "haya al menos una carta más" y siga estando desbalanceado.
  it('sobre muchas semillas en juvenil, la categoria "evento" tambien cae cerca de 70/25/5 (no solo la legendaria)', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const carta = elegirEvento(createRng(semilla), { jugador: jugador(), etapa: 'juvenil', categoria: 'evento' });
      conteo[carta.rareza] += 1;
    }
    const pct = (n) => (100 * conteo[n]) / 500;
    expect(pct('normal')).toBeGreaterThan(50);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(45);
    expect(pct('legendaria')).toBeLessThan(15);
  });

  it('en juvenil y amateur, la categoria "evento" tiene mas de una carta elegible (no solo la legendaria)', () => {
    for (const etapa of ['juvenil', 'amateur']) {
      const elegibles = CARTAS_EVENTO.filter((c) => c.categoria === 'evento' && c.etapas.includes(etapa));
      expect(elegibles.length).toBeGreaterThanOrEqual(4);
      expect(elegibles.some((c) => c.rareza === 'normal')).toBe(true);
    }
  });
});

describe('elegirCartaRedes', () => {
  it('devuelve una carta del catalogo', () => {
    const carta = elegirCartaRedes(createRng(4), { jugador: jugador() });
    expect(CARTAS_REDES.map((c) => c.id)).toContain(carta.id);
  });

  it('la carta elegida trae su rareza intacta', () => {
    const carta = elegirCartaRedes(createRng(15), { jugador: jugador() });
    expect(RAREZAS_VALIDAS).toContain(carta.rareza);
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const carta = elegirCartaRedes(createRng(semilla), { jugador: jugador() });
      conteo[carta.rareza] += 1;
    }
    const pct = (n) => (100 * conteo[n]) / 500;
    expect(pct('normal')).toBeGreaterThan(50);
    expect(pct('legendaria')).toBeLessThan(15);
  });
});

describe('resolverOpcion', () => {
  const carta = {
    id: 'test', categoria: 'evento', titulo: 'T', texto: 't', etapas: ['profesional'],
    opciones: [
      { id: 'directo', texto: 'Directo', mods: { cardio: 5 } },
      { id: 'plata', texto: 'Plata', efectos: { dinero: 5000, fama: 3 } },
      { id: 'riesgo', texto: 'Riesgo', probabilidades: [
        { peso: 1, mods: { forma: 5 }, texto: 'Salió bien.' },
        { peso: 1, mods: { forma: -5 }, texto: 'Salió mal.' },
      ] },
      { id: 'picante', texto: 'Picante', efectos: { heatRival: 20 } },
      { id: 'ambiguo', texto: 'Ambiguo', probabilidades: [
        { peso: 1, mods: { potencia: 2 } },
        { peso: 1, mods: { potencia: -2 } },
      ] },
      { id: 'apuesta', texto: 'Apuesta', probabilidades: [
        { peso: 0, mods: { potencia: 2 }, texto: 'Salió bien.', efectos: { fama: 4 } },
        { peso: 1, mods: {}, texto: 'Se cayó la pelea.', efectos: { fama: -8 }, caePelea: true },
      ] },
    ],
  };

  it('aplica modificadores directos', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(5), { jugador: yo, carta, opcionId: 'directo' });
    expect(paso.jugador.atributos.cardio).toBe(yo.atributos.cardio + 5);
    expect(paso.deltasTexto).toContain('+5 Cardio');
  });

  it('aplica efectos de dinero y fama', () => {
    const yo = jugador({ dinero: 100, fama: 10 });
    const paso = resolverOpcion(createRng(6), { jugador: yo, carta, opcionId: 'plata' });
    expect(paso.jugador.dinero).toBe(5100);
    expect(paso.jugador.fama).toBe(13);
  });

  it('resuelve las opciones con probabilidad', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(7), { jugador: yo, carta, opcionId: 'riesgo' });
    expect(Math.abs(paso.jugador.estado.forma - yo.estado.forma)).toBe(5);
    expect(paso.texto).toMatch(/Salió/);
  });

  it('sube el heat del rival indicado', () => {
    const paso = resolverOpcion(createRng(8), {
      jugador: jugador(), carta, opcionId: 'picante',
      rivalidades: [], rivalObjetivoId: 'riv_1',
    });
    expect(paso.rivalidades.find((r) => r.rivalId === 'riv_1').heat).toBeGreaterThan(0);
  });

  it('la fama nunca sale del rango 0-100', () => {
    const cartaExtrema = {
      ...carta,
      opciones: [{ id: 'boom', texto: 'x', efectos: { fama: 999 } }],
    };
    const paso = resolverOpcion(createRng(9), { jugador: jugador({ fama: 90 }), carta: cartaExtrema, opcionId: 'boom' });
    expect(paso.jugador.fama).toBe(100);
  });

  it('el dinero nunca queda negativo', () => {
    const cartaCara = { ...carta, opciones: [{ id: 'caro', texto: 'x', efectos: { dinero: -999999 } }] };
    const paso = resolverOpcion(createRng(10), { jugador: jugador({ dinero: 100 }), carta: cartaCara, opcionId: 'caro' });
    expect(paso.jugador.dinero).toBe(0);
  });

  it('rechaza una opcion inexistente', () => {
    expect(() => resolverOpcion(createRng(11), { jugador: jugador(), carta, opcionId: 'inventada' })).toThrow(/inventada/);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    resolverOpcion(createRng(12), { jugador: yo, carta, opcionId: 'directo' });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('es determinista', () => {
    const a = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    const b = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    expect(a.texto).toBe(b.texto);
  });

  it('expone los deltas crudos ademas de deltasTexto, sin romper deltasTexto', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(5), { jugador: yo, carta, opcionId: 'directo' });
    expect(paso.deltas).toEqual({ cardio: 5 });
    expect(paso.deltasTexto).toEqual(['+5 Cardio']);
  });

  it('no tiene indiceGanador cuando la opcion no tiene azar', () => {
    const paso = resolverOpcion(createRng(5), { jugador: jugador(), carta, opcionId: 'directo' });
    expect(paso.indiceGanador).toBeNull();
  });

  it('expone indiceGanador y coincide con el mod realmente aplicado, aunque las dos ramas no tengan texto (caso que fallaba comparando strings)', () => {
    for (let s = 1; s <= 200; s += 1) {
      const yo = jugador();
      const paso = resolverOpcion(createRng(s), { jugador: yo, carta, opcionId: 'ambiguo' });
      const ramaGanadora = carta.opciones.find((o) => o.id === 'ambiguo').probabilidades[paso.indiceGanador];
      const deltaAplicado = paso.jugador.atributos.potencia - yo.atributos.potencia;
      expect(deltaAplicado).toBe(ramaGanadora.mods.potencia);
    }
  });

  // Task v3 ("cartas nuevas con azar"): una rama de `probabilidades` puede
  // traer su propio `efectos` (dinero/fama, distinto según qué rama salió) y
  // `caePelea` (la consecuencia "se te cae la pelea" tiene que ser real).
  describe('efectos por rama y caePelea', () => {
    it('con peso 1 en la rama mala, aplica el efectos de ESA rama (no el de la opcion, que no tiene) y expone caePelea', () => {
      const yo = jugador({ fama: 50 });
      const paso = resolverOpcion(createRng(1), { jugador: yo, carta, opcionId: 'apuesta' });
      expect(paso.jugador.fama).toBe(42);
      expect(paso.caePelea).toBe(true);
      expect(paso.deltasTexto).toContain('-8 Fama');
    });

    it('una opcion sin probabilidades nunca cae la pelea', () => {
      const paso = resolverOpcion(createRng(1), { jugador: jugador(), carta, opcionId: 'directo' });
      expect(paso.caePelea).toBe(false);
    });

    it('el efectos de la rama ganadora no pisa el de una rama que no salió (determinista sobre la MISMA tirada)', () => {
      const cartaCargada = {
        ...carta,
        opciones: [
          { id: 'segura', texto: 'Segura', probabilidades: [
            { peso: 1, mods: {}, texto: 'ok', efectos: { fama: 3 } },
            { peso: 0, mods: {}, texto: 'no sale nunca', efectos: { fama: -50 }, caePelea: true },
          ] },
        ],
      };
      const yo = jugador({ fama: 10 });
      const paso = resolverOpcion(createRng(2), { jugador: yo, carta: cartaCargada, opcionId: 'segura' });
      expect(paso.jugador.fama).toBe(13);
      expect(paso.caePelea).toBe(false);
    });
  });
});
