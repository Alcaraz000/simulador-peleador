import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_MEJORA } from '../../src/content/cards-improve.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import {
  formatearMods, repartirMejoras, aplicarCarta, resolverProbabilidad, porcentajesDe,
  decidirCantidadMejoras, sortearPorRareza, elegirPorRareza, conSalvaguardaDeCondiciones,
} from '../../src/core/cards.js';

const RAREZAS_VALIDAS = ['normal', 'rara', 'legendaria'];
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de mejoras', () => {
  it('tiene al menos catorce cartas con id unico', () => {
    expect(CARTAS_MEJORA.length).toBeGreaterThanOrEqual(14);
    const ids = CARTAS_MEJORA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta tiene titulo, texto y al menos un modificador', () => {
    for (const carta of CARTAS_MEJORA) {
      expect(carta.titulo.length).toBeGreaterThan(0);
      expect(carta.texto.length).toBeGreaterThan(0);
      expect(Object.keys(carta.mods).length).toBeGreaterThan(0);
    }
  });

  it('ninguna carta de la v1 toca el grappling', () => {
    for (const carta of CARTAS_MEJORA) {
      expect('grappling' in carta.mods).toBe(false);
    }
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_MEJORA) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('la mayoria de las cartas son normales', () => {
    const normales = CARTAS_MEJORA.filter((c) => c.rareza === 'normal');
    expect(normales.length).toBeGreaterThan(CARTAS_MEJORA.length / 2);
  });

  it('tiene entre 2 y 3 legendarias, potentes de verdad', () => {
    const legendarias = CARTAS_MEJORA.filter((c) => c.rareza === 'legendaria');
    expect(legendarias.length).toBeGreaterThanOrEqual(2);
    expect(legendarias.length).toBeLessThanOrEqual(3);
    for (const carta of legendarias) {
      const sumaPositivos = Object.values(carta.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      expect(sumaPositivos).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('formatearMods', () => {
  it('escribe los modificadores con signo y nombre largo', () => {
    expect(formatearMods({ velocidad: 3 })).toEqual(['+3 Velocidad']);
    expect(formatearMods({ potencia: -2 })).toEqual(['-2 Potencia']);
  });

  it('lista varios en orden de aparicion', () => {
    expect(formatearMods({ cardio: 5, potencia: -3 })).toEqual(['+5 Cardio', '-3 Potencia']);
  });

  it('usa nombre legible tambien para forma, fatiga y moral (no el id crudo)', () => {
    expect(formatearMods({ forma: 6 })).toEqual(['+6 Forma']);
    expect(formatearMods({ fatiga: -4 })).toEqual(['-4 Fatiga']);
    expect(formatearMods({ moral: 10 })).toEqual(['+10 Moral']);
  });
});

describe('repartirMejoras', () => {
  it('sin cantidad explícita, reparte 3 cartas la gran mayoría de las veces (y a veces 2)', () => {
    let con2 = 0;
    let con3 = 0;
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
      if (cartas.length === 2) con2 += 1;
      else if (cartas.length === 3) con3 += 1;
      else throw new Error(`cantidad inesperada: ${cartas.length}`);
    }
    expect(con2 + con3).toBe(500);
    // "algo del orden de una de cada cuatro o cinco" (pedido del coordinador,
    // v4): con PROB_CANTIDAD_REDUCIDA=0.2 debería rondar el 20%, con margen
    // estadístico generoso para no ser flaky sobre 500 semillas.
    const pctReducida = (100 * con2) / 500;
    expect(pctReducida).toBeGreaterThan(10);
    expect(pctReducida).toBeLessThan(32);
  });

  it('con cantidad explícita, el resultado es siempre exacto y determinístico (no consume la tirada nueva)', () => {
    for (let semilla = 1; semilla <= 30; semilla += 1) {
      expect(repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional', cantidad: 3 })).toHaveLength(3);
      expect(repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional', cantidad: 2 })).toHaveLength(2);
    }
  });

  it('no repite cartas', () => {
    const cartas = repartirMejoras(createRng(2), { jugador: jugador(), etapa: 'profesional' });
    expect(new Set(cartas.map((c) => c.id)).size).toBe(cartas.length);
  });

  it('nunca ofrece cartas de otra disciplina', () => {
    const cartas = repartirMejoras(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    for (const carta of cartas) {
      expect(carta.disciplinas === 'todas' || carta.disciplinas.includes('boxeo')).toBe(true);
    }
  });

  // Cambio 1 (feedback del usuario: "una acción trae 5 opciones, eso no está
  // bien, son 2 o máximo 3"): base(3) + entrenador(+1) + etapa temprana(+1/+2)
  // llegaba a repartir 5 cartas. El tope ahora es DURO: el entrenador de
  // elite ya NO agrega una carta más, sea cual sea la base — ver el test de
  // "sube la calidad" más abajo para lo que pasó a ganar en su lugar.
  it('el entrenador de elite ya NO agrega una carta mas (tope duro de 3): la cantidad repartida es siempre la base', () => {
    const conEntrenador = repartirMejoras(createRng(4), {
      jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional', cantidad: 3,
    });
    expect(conEntrenador).toHaveLength(3);
    const conEntrenadorBaseReducida = repartirMejoras(createRng(4), {
      jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional', cantidad: 2,
    });
    expect(conEntrenadorBaseReducida).toHaveLength(2);
  });

  // Sistema 2, corrección del coordinador: en juvenil/amateur el bonus de
  // etapa temprana existe (ver bonus de mods, probado más abajo), pero desde
  // el Cambio 1 ya no se traduce en MÁS cartas — el tope de 3 es duro para
  // cualquier etapa. Cantidad fijada en 3 acá para aislar el bonus de etapa
  // de la variación de cantidad de v4 (probada aparte, más arriba).
  it('en juvenil ya NO hay mas opciones para elegir que en profesional (tope duro de 3)', () => {
    const juvenil = repartirMejoras(createRng(20), { jugador: jugador(), etapa: 'juvenil', cantidad: 3 });
    const profesional = repartirMejoras(createRng(20), { jugador: jugador(), etapa: 'profesional', cantidad: 3 });
    expect(juvenil.length).toBe(profesional.length);
    expect(profesional).toHaveLength(3);
  });

  it('el bonus de etapa temprana ya NO se suma como cartas de mas: la cantidad repartida es siempre la base', () => {
    const juvenilBase3 = repartirMejoras(createRng(1), { jugador: jugador(), etapa: 'juvenil', cantidad: 3 });
    expect(juvenilBase3).toHaveLength(3);
    const juvenilBase2 = repartirMejoras(createRng(1), { jugador: jugador(), etapa: 'juvenil', cantidad: 2 });
    expect(juvenilBase2).toHaveLength(2);
  });

  // El caso más extremo posible (entrenador + etapa temprana + base
  // reducida, lo que antes hubiera repartido hasta 5 cartas): el tope de 3
  // sigue siendo duro, sobre muchas semillas, no solo en un caso puntual.
  it('nunca reparte mas de 3 cartas, ni siquiera combinando entrenador de elite + etapa temprana (tope duro, Cambio 1)', () => {
    for (let semilla = 1; semilla <= 300; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), {
        jugador: jugador({ staff: ['entrenador'] }), etapa: 'juvenil',
      });
      expect(cartas.length).toBeLessThanOrEqual(3);
    }
  });

  // Lo que antes eran "opciones extra" (más cartas) ahora tiene que
  // notarse como MEJOR CALIDAD: a igual cantidad de cartas (3, fijada acá
  // para aislar el efecto), un jugador con entrenador de elite o en etapa
  // temprana ve más legendarias que uno sin esos bonus, sobre muchas
  // semillas — el beneficio no desapareció, solo cambió de forma.
  it('el bonus de "opciones extra" del entrenador/etapa temprana ahora sube la chance de legendaria en vez de agregar cartas', () => {
    const catalogoAmplio = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `n${i}`, titulo: `N${i}`, texto: 't', mods: { potencia: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal',
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `r${i}`, titulo: `R${i}`, texto: 't', mods: { potencia: 2 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'rara',
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `l${i}`, titulo: `L${i}`, texto: 't', mods: { potencia: 8 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'legendaria',
      })),
    ];
    const N = 4000;
    let sinBonus = 0;
    let conEntrenador = 0;
    let conEtapaTemprana = 0;
    for (let semilla = 1; semilla <= N; semilla += 1) {
      const base = repartirMejoras(createRng(semilla), {
        jugador: jugador(), etapa: 'profesional', cantidad: 3, catalogo: catalogoAmplio,
      });
      if (base.some((c) => c.rareza === 'legendaria')) sinBonus += 1;

      const entrenador = repartirMejoras(createRng(semilla + 10_000_000), {
        jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional', cantidad: 3, catalogo: catalogoAmplio,
      });
      if (entrenador.some((c) => c.rareza === 'legendaria')) conEntrenador += 1;

      const etapaTemprana = repartirMejoras(createRng(semilla + 20_000_000), {
        jugador: jugador(), etapa: 'juvenil', cantidad: 3, catalogo: catalogoAmplio,
      });
      if (etapaTemprana.some((c) => c.rareza === 'legendaria')) conEtapaTemprana += 1;
    }
    expect(conEntrenador).toBeGreaterThan(sinBonus);
    expect(conEtapaTemprana).toBeGreaterThan(sinBonus);
  });

  // Comparado en UNA sola semilla (como era antes), esto queda a merced de
  // qué cartas puntuales tocan en ese draw exacto: con el catálogo real
  // (que ahora filtra 'doble_turno' por condiciones.edadMin, Sistema 3) una
  // semilla puntual podía, por pura casualidad de qué otras cartas salían en
  // su lugar, mostrar el efecto contrario. La ventaja del entrenador es
  // ESTADÍSTICA (bonusValor se suma pase lo que pase con la selección de
  // cartas): se mide sobre muchas semillas pareadas, mismo criterio que ya
  // usa el resto de esta describe (ver "el bonus de etapa temprana ya NO...").
  it('el entrenador mejora los numeros positivos, en promedio sobre muchas semillas', () => {
    const positivos = (cartas) => cartas.reduce(
      (acc, c) => acc + Object.values(c.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0), 0,
    );
    let totalSin = 0;
    let totalCon = 0;
    for (let semilla = 1; semilla <= 300; semilla += 1) {
      totalSin += positivos(repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional' }));
      totalCon += positivos(repartirMejoras(createRng(semilla), { jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional' }));
    }
    expect(totalCon).toBeGreaterThan(totalSin);
  });

  it('es determinista', () => {
    const a = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    const b = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  // Sistema 2, corrección del coordinador (segunda ronda): "el problema está
  // en la mitad de la carrera, no en el final" — un jugador que recién
  // arranca sube muy lento porque cada carta mueve poco sobre una base
  // chica. Bonus extra en las etapas tempranas (decae a 0 en profesional):
  // empuja fuerte la MEDIA al principio sin inflar más el techo final, ya
  // que para cuando llega a profesional (la mayoría de los 20 bloques de la
  // carrera) el bonus ya se apagó.
  describe('bonus de etapa temprana (Sistema 2, corrección del coordinador)', () => {
    const positivos = (cartas) => cartas.reduce(
      (acc, c) => acc + Object.values(c.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0), 0,
    );

    // Catálogo de UNA sola carta (disponible en las cuatro etapas): con un
    // solo elemento elegible, sortearPorRareza siempre devuelve esa misma
    // carta sin importar la tirada de rng — así la comparación entre etapas
    // aísla el bonus de verdad, sin el ruido de que el POOL elegible cambie
    // de una etapa a otra (varias cartas reales son solo de ciertas etapas).
    const catalogoUnaCarta = [
      { id: 'unica', titulo: 'Única', texto: 't', mods: { potencia: 4 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
    ];

    it('en juvenil, la MISMA carta sale con un mod mayor que en profesional', () => {
      const juvenil = repartirMejoras(createRng(10), { jugador: jugador(), etapa: 'juvenil', catalogo: catalogoUnaCarta });
      const profesional = repartirMejoras(createRng(10), { jugador: jugador(), etapa: 'profesional', catalogo: catalogoUnaCarta });
      expect(juvenil[0].mods.potencia).toBeGreaterThan(profesional[0].mods.potencia);
      expect(profesional[0].mods.potencia).toBe(4); // profesional: sin bonus, el valor de la carta tal cual
    });

    it('en amateur tambien hay bonus, pero menor que en juvenil', () => {
      const juvenil = repartirMejoras(createRng(11), { jugador: jugador(), etapa: 'juvenil', catalogo: catalogoUnaCarta });
      const amateur = repartirMejoras(createRng(11), { jugador: jugador(), etapa: 'amateur', catalogo: catalogoUnaCarta });
      expect(amateur[0].mods.potencia).toBeGreaterThan(4);
      expect(juvenil[0].mods.potencia).toBeGreaterThan(amateur[0].mods.potencia);
    });

    it('en profesional y veterano no hay bonus de etapa (el comportamiento de siempre)', () => {
      const profesional = repartirMejoras(createRng(12), { jugador: jugador(), etapa: 'profesional', catalogo: catalogoUnaCarta });
      const veterano = repartirMejoras(createRng(12), { jugador: jugador(), etapa: 'veterano', catalogo: catalogoUnaCarta });
      expect(profesional[0].mods.potencia).toBe(4);
      expect(veterano[0].mods.potencia).toBe(4);
    });

    it('el bonus de etapa se suma al del entrenador, no lo reemplaza', () => {
      const soloEtapa = repartirMejoras(createRng(13), { jugador: jugador(), etapa: 'juvenil', catalogo: catalogoUnaCarta });
      const etapaYEntrenador = repartirMejoras(createRng(13), {
        jugador: jugador({ staff: ['entrenador'] }), etapa: 'juvenil', catalogo: catalogoUnaCarta,
      });
      expect(etapaYEntrenador[0].mods.potencia).toBeGreaterThan(soloEtapa[0].mods.potencia);
    });

    it('los mods negativos nunca se tocan con el bonus de etapa', () => {
      const catalogoNegativo = [
        { id: 'mixta', titulo: 'Mixta', texto: 't', mods: { potencia: 4, velocidad: -2 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      ];
      const juvenil = repartirMejoras(createRng(14), { jugador: jugador(), etapa: 'juvenil', catalogo: catalogoNegativo });
      expect(juvenil[0].mods.velocidad).toBe(-2);
    });

    // Pedido explícito y repetido del usuario: "no aplanes la varianza de
    // las legendarias". Un bonus parejo para TODAS las cartas (normal, rara
    // Y legendaria) diluye la ventaja relativa de sacar una legendaria —
    // medido con balance-sim.mjs, la brecha CON/SIN legendaria se achicaba
    // de ~4.24 a ~3.03 puntos de MEDIA. Las legendarias quedan afuera del
    // bonus de etapa: siguen valiendo exactamente lo que su autor escribió,
    // nunca más, nunca menos.
    it('las cartas legendarias NO reciben el bonus de etapa temprana (no aplanar su varianza)', () => {
      const catalogoLegendaria = [
        { id: 'legend', titulo: 'Legend', texto: 't', mods: { potencia: 8 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'legendaria' },
      ];
      const juvenil = repartirMejoras(createRng(15), { jugador: jugador(), etapa: 'juvenil', catalogo: catalogoLegendaria });
      expect(juvenil[0].mods.potencia).toBe(8);
    });

    it('el entrenador SÍ sigue mejorando las legendarias (solo el bonus de etapa las excluye)', () => {
      const catalogoLegendaria = [
        { id: 'legend', titulo: 'Legend', texto: 't', mods: { potencia: 8 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'legendaria' },
      ];
      const conEntrenador = repartirMejoras(createRng(16), {
        jugador: jugador({ staff: ['entrenador'] }), etapa: 'juvenil', catalogo: catalogoLegendaria,
      });
      expect(conEntrenador[0].mods.potencia).toBeGreaterThan(8);
    });
  });

  it('respeta el filtro de etapa', () => {
    const cartas = repartirMejoras(createRng(7), { jugador: jugador(), etapa: 'juvenil' });
    for (const carta of cartas) expect(carta.etapas).toContain('juvenil');
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    let totalCartas = 0;
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
      for (const carta of cartas) {
        conteo[carta.rareza] += 1;
        totalCartas += 1;
      }
    }
    const pct = (n) => (100 * conteo[n]) / totalCartas;
    expect(pct('normal')).toBeGreaterThan(55);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(40);
    expect(pct('legendaria')).toBeLessThan(15);
  });

  // Sistema 1 (feedback del usuario: "las tarjetas que aparecen están
  // condicionadas al estado del jugador"): un jugador lesionado tiene que ver
  // cartas de recuperación (kinesiología, reposo), nunca de machaque de
  // gimnasio — y viceversa, un jugador sano nunca ve las de recuperación.
  describe('condicionado por el estado del jugador (lesionado)', () => {
    const catalogoMixto = [
      { id: 'gym1', titulo: 'Gym1', texto: 't', mods: { potencia: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'gym2', titulo: 'Gym2', texto: 't', mods: { velocidad: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'gym3', titulo: 'Gym3', texto: 't', mods: { tecnica: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      {
        id: 'rec1', titulo: 'Rec1', texto: 't', mods: { forma: 5 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', estados: ['lesionado'],
      },
      {
        id: 'rec2', titulo: 'Rec2', texto: 't', mods: { forma: 4 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', estados: ['lesionado'],
      },
      {
        id: 'rec3', titulo: 'Rec3', texto: 't', mods: { moral: 4 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', estados: ['lesionado'],
      },
    ];

    function jugadorLesionado() {
      const j = jugador();
      return { ...j, estado: { ...j.estado, lesion: { id: 'x', nombre: 'x', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x' } } };
    }

    it('un jugador lesionado solo ve cartas marcadas para ese estado, nunca las de gimnasio', () => {
      for (let semilla = 1; semilla <= 20; semilla += 1) {
        const cartas = repartirMejoras(createRng(semilla), {
          jugador: jugadorLesionado(), etapa: 'profesional', catalogo: catalogoMixto,
        });
        for (const carta of cartas) expect(carta.id.startsWith('rec')).toBe(true);
      }
    });

    it('un jugador sano nunca ve las cartas exclusivas de lesionado', () => {
      for (let semilla = 1; semilla <= 20; semilla += 1) {
        const cartas = repartirMejoras(createRng(semilla), {
          jugador: jugador(), etapa: 'profesional', catalogo: catalogoMixto,
        });
        for (const carta of cartas) expect(carta.id.startsWith('gym')).toBe(true);
      }
    });

    it('el catalogo real trae varias cartas de recuperación para cuando el jugador está lesionado', () => {
      const deRecuperacion = CARTAS_MEJORA.filter((c) => (c.estados ?? []).includes('lesionado'));
      expect(deRecuperacion.length).toBeGreaterThanOrEqual(5);
      for (const carta of deRecuperacion) {
        expect(carta.titulo.length).toBeGreaterThan(0);
        expect(carta.texto.length).toBeGreaterThan(0);
      }
    });

    it('las cartas de recuperación del catálogo real nunca aparecen para un jugador sano', () => {
      for (let semilla = 1; semilla <= 150; semilla += 1) {
        const cartas = repartirMejoras(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
        for (const carta of cartas) expect(carta.estados ?? ['sano']).toContain('sano');
      }
    });

    it('un jugador lesionado, sobre muchas semillas, solo recibe cartas de recuperación del catálogo real', () => {
      for (let semilla = 1; semilla <= 150; semilla += 1) {
        const cartas = repartirMejoras(createRng(semilla), { jugador: jugadorLesionado(), etapa: 'profesional' });
        for (const carta of cartas) expect(carta.estados ?? []).toContain('lesionado');
      }
    });
  });

  // Sistema 3 (feedback del usuario: "una acción dice 'doble turno como
  // cuando eras pibe' y mi personaje tiene 17 y es amateur... algunas
  // tarjetas deben depender de la situación, edad, categoría, situación
  // actual"): `carta.condiciones` es declarativo (edadMin/edadMax, campeon,
  // famaMin/famaMax, dineroMin/dineroMax, resultadoReciente) y se filtra
  // ADEMÁS de etapa/disciplina/estado, nunca en su lugar.
  describe('condicionado por la situación del jugador (Sistema 3: edad/campeón/fama/dinero/resultado)', () => {
    const catalogoSituacional = [
      { id: 'base1', titulo: 'Base1', texto: 't', mods: { potencia: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'base2', titulo: 'Base2', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      {
        id: 'para_veteranos', titulo: 'ParaVeteranos', texto: 't', mods: { iq: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { edadMin: 30 },
      },
      {
        id: 'para_pibes', titulo: 'ParaPibes', texto: 't', mods: { cardio: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { edadMax: 20 },
      },
      {
        id: 'para_campeones', titulo: 'ParaCampeones', texto: 't', mods: { menton: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { campeon: true },
      },
      {
        id: 'para_no_campeones', titulo: 'ParaNoCampeones', texto: 't', mods: { disciplinaPersonal: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { campeon: false },
      },
      {
        id: 'para_famosos', titulo: 'ParaFamosos', texto: 't', mods: { moral: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { famaMin: 50 },
      },
      {
        id: 'para_ricos', titulo: 'ParaRicos', texto: 't', mods: { forma: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { dineroMin: 100000 },
      },
      {
        id: 'post_victoria', titulo: 'PostVictoria', texto: 't', mods: { defensa: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { resultadoReciente: 'victoria' },
      },
      {
        id: 'post_derrota', titulo: 'PostDerrota', texto: 't', mods: { tecnica: 3 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { resultadoReciente: 'derrota' },
      },
    ];

    it('edadMin/edadMax: cada carta solo aparece dentro de su rango de edad', () => {
      const pibe = repartirMejoras(createRng(1), {
        jugador: jugador({ edad: 17 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(pibe.some((c) => c.id === 'para_veteranos')).toBe(false);
      expect(pibe.some((c) => c.id === 'para_pibes')).toBe(true);

      const veterano = repartirMejoras(createRng(1), {
        jugador: jugador({ edad: 33 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(veterano.some((c) => c.id === 'para_veteranos')).toBe(true);
      expect(veterano.some((c) => c.id === 'para_pibes')).toBe(false);
    });

    it('campeon: true/false separa según si el jugador tiene al menos un cinturón', () => {
      const sinCinturon = repartirMejoras(createRng(2), {
        jugador: jugador({ titulos: [] }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(sinCinturon.some((c) => c.id === 'para_campeones')).toBe(false);
      expect(sinCinturon.some((c) => c.id === 'para_no_campeones')).toBe(true);

      const conCinturon = repartirMejoras(createRng(2), {
        jugador: jugador({ titulos: ['Cinturón Mundial'] }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(conCinturon.some((c) => c.id === 'para_campeones')).toBe(true);
      expect(conCinturon.some((c) => c.id === 'para_no_campeones')).toBe(false);
    });

    it('famaMin filtra por fama del jugador', () => {
      const desconocido = repartirMejoras(createRng(3), {
        jugador: jugador({ fama: 10 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(desconocido.some((c) => c.id === 'para_famosos')).toBe(false);

      const famoso = repartirMejoras(createRng(3), {
        jugador: jugador({ fama: 80 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(famoso.some((c) => c.id === 'para_famosos')).toBe(true);
    });

    it('dineroMin filtra por plata del jugador', () => {
      const pobre = repartirMejoras(createRng(4), {
        jugador: jugador({ dinero: 500 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(pobre.some((c) => c.id === 'para_ricos')).toBe(false);

      const rico = repartirMejoras(createRng(4), {
        jugador: jugador({ dinero: 500000 }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(rico.some((c) => c.id === 'para_ricos')).toBe(true);
    });

    it('resultadoReciente lee la última pelea del historial profesional (vacío en juvenil/amateur, a propósito)', () => {
      const sinHistorial = repartirMejoras(createRng(5), {
        jugador: jugador({ historial: [] }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(sinHistorial.some((c) => c.id === 'post_victoria')).toBe(false);
      expect(sinHistorial.some((c) => c.id === 'post_derrota')).toBe(false);

      const ganador = repartirMejoras(createRng(5), {
        jugador: jugador({ historial: [{ resultado: 'd' }, { resultado: 'v' }] }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(ganador.some((c) => c.id === 'post_victoria')).toBe(true);
      expect(ganador.some((c) => c.id === 'post_derrota')).toBe(false);

      const perdedor = repartirMejoras(createRng(5), {
        jugador: jugador({ historial: [{ resultado: 'v' }, { resultado: 'd' }] }), etapa: 'profesional', cantidad: catalogoSituacional.length, catalogo: catalogoSituacional,
      });
      expect(perdedor.some((c) => c.id === 'post_derrota')).toBe(true);
      expect(perdedor.some((c) => c.id === 'post_victoria')).toBe(false);
    });

    // Salvaguarda pedida explícitamente: el filtro situacional NUNCA puede
    // dejar el pool en cero, sin importar cuán exigentes sean las
    // condiciones combinadas en un momento puntual de la carrera.
    it('salvaguarda: si NINGUNA carta del pool ya filtrado por etapa cumple las condiciones, se ignoran (nunca deja el pool vacío)', () => {
      const catalogoImposible = [
        { id: 'a', titulo: 'A', texto: 't', mods: { potencia: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { edadMin: 200 } },
        { id: 'b', titulo: 'B', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal', condiciones: { edadMin: 200 } },
      ];
      for (let semilla = 1; semilla <= 20; semilla += 1) {
        const cartas = repartirMejoras(createRng(semilla), {
          jugador: jugador(), etapa: 'profesional', cantidad: 2, catalogo: catalogoImposible,
        });
        expect(cartas).toHaveLength(2);
      }
    });

    it('conSalvaguardaDeCondiciones: filtra normalmente cuando algo sobrevive', () => {
      const pool = [
        { id: 'x', condiciones: { edadMin: 200 } },
        { id: 'y' },
      ];
      expect(conSalvaguardaDeCondiciones(pool, jugador()).map((c) => c.id)).toEqual(['y']);
    });

    it('conSalvaguardaDeCondiciones: si TODO queda afuera, devuelve el pool original tal cual', () => {
      const pool = [
        { id: 'x', condiciones: { edadMin: 200 } },
        { id: 'z', condiciones: { edadMin: 300 } },
      ];
      expect(conSalvaguardaDeCondiciones(pool, jugador())).toEqual(pool);
    });

    it('sin jugador (undefined), no filtra nada (paso opcional en catálogos como campamento)', () => {
      const pool = [{ id: 'x', condiciones: { edadMin: 200 } }];
      expect(conSalvaguardaDeCondiciones(pool, null)).toEqual(pool);
    });
  });

  it('si una rareza no tiene cartas elegibles para la etapa/disciplina, igual completa la cantidad pedida con lo que haya', () => {
    const catalogoChico = [
      { id: 'n1', titulo: 'N1', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n2', titulo: 'N2', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n3', titulo: 'N3', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
      { id: 'n4', titulo: 'N4', texto: 't', mods: { velocidad: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal' },
    ];
    for (let semilla = 1; semilla <= 20; semilla += 1) {
      const cartas = repartirMejoras(createRng(semilla), {
        jugador: jugador(), etapa: 'profesional', catalogo: catalogoChico, cantidad: 3,
      });
      expect(cartas).toHaveLength(3);
    }
  });

  // Pedido del coordinador (v4, "no dejes que eso aplane la varianza
  // legendaria"): repartir 2 cartas en vez de 3 reduce, sin compensar, la
  // chance de ver una legendaria en ESE reparto puntual (menos tiradas). Se
  // compensa subiendo el peso de legendaria solo quando la base salió
  // reducida (ver pesosCompensadosPorMenosCartas, cards.js) para que la tasa
  // de "al menos una legendaria" quede pareja entre reparto normal y
  // reducido — no exacta al dígito (hay ruido estadístico), pero MUY lejos
  // de la caída sin compensar (~14.3% con 3 tiradas al 5% -> ~9.75% con 2
  // tiradas al 5% SIN compensación).
  it('no aplana la varianza legendaria: con cantidad reducida (2), la tasa de "al menos una legendaria" se mantiene cerca de la de cantidad 3', () => {
    const catalogoAmplio = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `n${i}`, titulo: `N${i}`, texto: 't', mods: { potencia: 1 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'normal',
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `r${i}`, titulo: `R${i}`, texto: 't', mods: { potencia: 2 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'rara',
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `l${i}`, titulo: `L${i}`, texto: 't', mods: { potencia: 8 }, etapas: SIEMPRE, disciplinas: 'todas', rareza: 'legendaria',
      })),
    ];
    const N = 3000;
    let conLegendCantidad3 = 0;
    let conLegendCantidad2 = 0;
    for (let semilla = 1; semilla <= N; semilla += 1) {
      const con3 = repartirMejoras(createRng(semilla), {
        jugador: jugador(), etapa: 'profesional', cantidad: 3, catalogo: catalogoAmplio,
      });
      if (con3.some((c) => c.rareza === 'legendaria')) conLegendCantidad3 += 1;
      const con2 = repartirMejoras(createRng(semilla + 10000000), {
        jugador: jugador(), etapa: 'profesional', cantidad: 2, catalogo: catalogoAmplio,
      });
      if (con2.some((c) => c.rareza === 'legendaria')) conLegendCantidad2 += 1;
    }
    const pct3 = (100 * conLegendCantidad3) / N;
    const pct2 = (100 * conLegendCantidad2) / N;
    expect(Math.abs(pct3 - pct2)).toBeLessThan(5);
  });

  it('decidirCantidadMejoras devuelve 2 o 3, y ronda ~20% de veces reducida', () => {
    let con2 = 0;
    for (let semilla = 1; semilla <= 1000; semilla += 1) {
      const n = decidirCantidadMejoras(createRng(semilla));
      expect([2, 3]).toContain(n);
      if (n === 2) con2 += 1;
    }
    const pct = (100 * con2) / 1000;
    expect(pct).toBeGreaterThan(12);
    expect(pct).toBeLessThan(28);
  });

  it('sortearPorRareza/elegirPorRareza aceptan pesos custom (usado para la compensación legendaria)', () => {
    const catalogo = [
      { id: 'n', rareza: 'normal' },
      { id: 'l', rareza: 'legendaria' },
    ];
    // peso 0 para normal fuerza a elegir SIEMPRE la legendaria primero.
    const elegida = elegirPorRareza(createRng(1), catalogo, { normal: 0, rara: 0, legendaria: 100 });
    expect(elegida.id).toBe('l');
    const elegidas = sortearPorRareza(createRng(1), catalogo, 1, { normal: 0, rara: 0, legendaria: 100 });
    expect(elegidas.map((c) => c.id)).toEqual(['l']);
  });
});

describe('aplicarCarta', () => {
  it('sube el atributo y devuelve el delta', () => {
    const yo = jugador();
    const antes = yo.atributos.velocidad;
    const paso = aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.jugador.atributos.velocidad).toBe(antes + 3);
    expect(paso.deltas.velocidad).toBe(3);
  });

  it('reparte a especiales y a estado', () => {
    const yo = jugador();
    const paso = aplicarCarta(yo, {
      id: 'x', titulo: 'T', texto: 't', mods: { disciplinaPersonal: 4, forma: 6, menton: 2 },
    });
    expect(paso.jugador.especiales.disciplinaPersonal).toBe(yo.especiales.disciplinaPersonal + 4);
    expect(paso.jugador.especiales.menton).toBe(yo.especiales.menton + 2);
    expect(paso.jugador.estado.forma).toBe(yo.estado.forma + 6);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('devuelve un texto con los cambios', () => {
    const paso = aplicarCarta(jugador(), { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.texto).toContain('Velocidad');
  });
});

describe('resolverProbabilidad', () => {
  const opcion = {
    id: 'o', texto: 'Arriesgar',
    probabilidades: [
      { peso: 1, mods: { forma: 3 }, texto: 'Salió bien.' },
      { peso: 1, mods: { forma: -3 }, texto: 'Salió mal.' },
    ],
  };

  it('devuelve uno de los resultados posibles', () => {
    const paso = resolverProbabilidad(createRng(1), opcion);
    expect([3, -3]).toContain(paso.resultado.forma);
    expect(paso.texto.length).toBeGreaterThan(0);
  });

  it('es determinista', () => {
    expect(resolverProbabilidad(createRng(9), opcion)).toEqual(resolverProbabilidad(createRng(9), opcion));
  });

  it('respeta los pesos', () => {
    const cargada = {
      probabilidades: [
        { peso: 9, mods: { forma: 1 }, texto: 'casi siempre' },
        { peso: 1, mods: { forma: -1 }, texto: 'casi nunca' },
      ],
    };
    let positivos = 0;
    for (let s = 1; s <= 200; s++) {
      if (resolverProbabilidad(createRng(s), cargada).resultado.forma === 1) positivos++;
    }
    expect(positivos).toBeGreaterThan(150);
  });

  it('con una sola opcion siempre da esa', () => {
    const unica = { probabilidades: [{ peso: 1, mods: { forma: 5 }, texto: 'única' }] };
    expect(resolverProbabilidad(createRng(3), unica).resultado.forma).toBe(5);
  });

  it('el indice devuelto identifica la rama ganadora por referencia, no por texto (aunque el texto se repita o falte)', () => {
    const conTextosIguales = {
      probabilidades: [
        { peso: 1, mods: { forma: 3 } },
        { peso: 1, mods: { forma: -3 } },
      ],
    };
    let vistoIndice0 = false;
    let vistoIndice1 = false;
    for (let s = 1; s <= 200; s++) {
      const { resultado, indice } = resolverProbabilidad(createRng(s), conTextosIguales);
      // la rama que dice el indice tiene que ser exactamente (misma referencia)
      // la que se aplicó, no una adivinada por texto.
      expect(conTextosIguales.probabilidades[indice].mods).toBe(resultado);
      if (indice === 0) vistoIndice0 = true;
      if (indice === 1) vistoIndice1 = true;
    }
    expect(vistoIndice0).toBe(true);
    expect(vistoIndice1).toBe(true);
  });

  // Task v3 ("cartas nuevas con azar"): además de `mods`, una rama puede traer
  // su propio `efectos` (dinero/fama, distinto por rama — "aceptar puede +2
  // atributos, o - fama") y `caePelea` (la consecuencia "se te cae la pelea"
  // tiene que ser real, no solo texto — ver cancelarProximaPelea en career.js
  // y resolverOpcion en events.js, que son quienes de verdad usan esto).
  it('propaga el efectos de la rama ganadora (undefined si esa rama no trae)', () => {
    const conEfectos = {
      probabilidades: [
        { peso: 1, mods: {}, texto: 'bien', efectos: { fama: -6 } },
        { peso: 0, mods: {}, texto: 'mal' },
      ],
    };
    const paso = resolverProbabilidad(createRng(1), conEfectos);
    expect(paso.efectos).toEqual({ fama: -6 });
  });

  it('propaga caePelea de la rama ganadora; por defecto es false si la rama no lo declara', () => {
    const conCaePelea = {
      probabilidades: [
        { peso: 0, mods: {}, texto: 'bien' },
        { peso: 1, mods: {}, texto: 'mal', caePelea: true },
      ],
    };
    expect(resolverProbabilidad(createRng(1), conCaePelea).caePelea).toBe(true);
    expect(resolverProbabilidad(createRng(1), opcion).caePelea).toBe(false);
  });
});

describe('porcentajesDe', () => {
  it('da array vacio si la opcion no tiene probabilidades', () => {
    expect(porcentajesDe({ id: 'x', texto: 't' })).toEqual([]);
  });

  it('reparte pesos iguales en mitades exactas', () => {
    const opcion = { probabilidades: [{ peso: 1 }, { peso: 1 }] };
    expect(porcentajesDe(opcion)).toEqual([50, 50]);
  });

  it('respeta el orden y la proporcion de los pesos', () => {
    const opcion = { probabilidades: [{ peso: 6 }, { peso: 4 }] };
    expect(porcentajesDe(opcion)).toEqual([60, 40]);
  });

  it('cuando el reparto no cierra redondo, el resto va a la entrada de mayor peso y la suma da 100', () => {
    const opcion = { probabilidades: [{ peso: 1 }, { peso: 1 }, { peso: 1 }] };
    const pct = porcentajesDe(opcion);
    expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pct[0]).toBe(34);
    expect(pct[1]).toBe(33);
    expect(pct[2]).toBe(33);
  });

  it('con todos los pesos en cero, reparte parejo y la suma sigue dando 100', () => {
    const tresEnCero = { probabilidades: [{ peso: 0 }, { peso: 0 }, { peso: 0 }] };
    const pct = porcentajesDe(tresEnCero);
    expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pct).toEqual([34, 33, 33]);

    const dosEnCero = { probabilidades: [{ peso: 0 }, { peso: 0 }] };
    expect(porcentajesDe(dosEnCero).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('siempre suma exactamente 100 para todas las opciones con probabilidades del catalogo de eventos', () => {
    for (const carta of CARTAS_EVENTO) {
      for (const opcion of carta.opciones) {
        if (!opcion.probabilidades) continue;
        const pct = porcentajesDe(opcion);
        expect(pct.length).toBe(opcion.probabilidades.length);
        expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
      }
    }
  });
});
