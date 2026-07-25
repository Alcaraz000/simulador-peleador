import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { ETAPAS, crearPartida, siguienteBeat, etapaActual, avanzarBloque } from '../../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../../src/core/offers.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

function jugarTodo(partida, limite = 400) {
  let actual = partida;
  const beats = [];
  let guardia = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat) beats.push(paso.beat);
  }
  return { partida: actual, beats };
}

// Juega una carrera entera aceptando y ganando cada oferta de pelea que aparece
// (sin correr el motor de pelea completo: aplica directamente un resultado ganador
// vía aplicarResultado). Sirve para verificar que la progresión de cinturones
// funciona de punta a punta cuando al jugador le va bien.
function jugarGanandoTodo(partida, limite = 400) {
  let actual = partida;
  let guardia = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat && paso.beat.tipo === 'oferta') {
      const { oferta } = paso.beat.datos;
      const resultado = aplicarResultado(actual.jugador, {
        oferta,
        resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
      });
      actual = { ...actual, jugador: resultado.jugador };
    }
  }
  return actual;
}

describe('etapas', () => {
  it('define las cuatro etapas en orden', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['juvenil', 'amateur', 'profesional', 'veterano']);
  });

  it('suman veinte bloques', () => {
    expect(ETAPAS.reduce((a, e) => a + e.bloques, 0)).toBe(20);
  });

  it('la carrera cubre de los 15 a los ~39', () => {
    const finEstimado = ETAPAS.reduce((edad, e) => edad + e.bloques * e.aniosPorBloque, 15);
    expect(finEstimado).toBeGreaterThanOrEqual(38);
    expect(finEstimado).toBeLessThanOrEqual(41);
  });

  it('en juvenil se pelea menos que en profesional', () => {
    const juvenil = ETAPAS.find((e) => e.id === 'juvenil');
    const pro = ETAPAS.find((e) => e.id === 'profesional');
    expect(juvenil.probPelea).toBeLessThan(pro.probPelea);
  });
});

describe('crearPartida', () => {
  it('arranca en el bloque 1 de la etapa juvenil', () => {
    const p = nuevaPartida();
    expect(p.etapaIndice).toBe(0);
    expect(p.bloque).toBe(1);
    expect(p.terminada).toBe(false);
    expect(p.legado).toBeNull();
    expect(p.version).toBe(1);
  });

  it('crea el mundo con la disciplina y categoria del jugador', () => {
    const p = nuevaPartida();
    expect(p.mundo.disciplina).toBe('boxeo');
    expect(p.mundo.categoria).toBe('pluma');
    expect(p.mundo.roster.length).toBeGreaterThan(5);
  });

  it('el jugador arranca con 15 anios y sin rivalidades', () => {
    const p = nuevaPartida();
    expect(p.jugador.edad).toBe(15);
    expect(p.rivalidades).toEqual([]);
  });

  it('es determinista con la misma semilla', () => {
    expect(nuevaPartida(9).mundo.roster.map((r) => r.nombre))
      .toEqual(nuevaPartida(9).mundo.roster.map((r) => r.nombre));
  });
});

describe('siguienteBeat', () => {
  it('el primer beat de cada bloque es una mejora', () => {
    const { beat } = siguienteBeat(nuevaPartida());
    expect(beat.tipo).toBe('mejora');
    expect(beat.datos.cartas.length).toBeGreaterThanOrEqual(3);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    siguienteBeat(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('marca terminada al agotar los bloques', () => {
    const { partida } = jugarTodo(nuevaPartida());
    expect(partida.terminada).toBe(true);
  });
});

describe('ritmo de la carrera', () => {
  it('produce entre 30 y 60 beats', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      expect(beats.length).toBeGreaterThanOrEqual(30);
      expect(beats.length).toBeLessThanOrEqual(60);
    }
  });

  it('incluye peleas, mejoras y eventos', () => {
    const { beats } = jugarTodo(nuevaPartida(3));
    const tipos = new Set(beats.map((b) => b.tipo));
    expect(tipos).toContain('mejora');
    expect(tipos).toContain('oferta');
    expect(tipos.has('evento') || tipos.has('redes')).toBe(true);
  });

  it('siempre hay una oferta antes de una pelea', () => {
    const { beats } = jugarTodo(nuevaPartida(4));
    beats.forEach((beat, i) => {
      if (beat.tipo !== 'pelea') return;
      const previos = beats.slice(0, i).map((b) => b.tipo);
      expect(previos).toContain('oferta');
    });
  });

  it('el jugador llega cerca de los 39 al final', () => {
    const { partida } = jugarTodo(nuevaPartida(6));
    expect(partida.jugador.edad).toBeGreaterThanOrEqual(36);
    expect(partida.jugador.edad).toBeLessThanOrEqual(42);
  });
});

describe('etapaActual', () => {
  it('empieza en juvenil y termina en veterano', () => {
    const p = nuevaPartida();
    expect(etapaActual(p).id).toBe('juvenil');
    const { partida } = jugarTodo(p);
    expect(['profesional', 'veterano']).toContain(etapaActual(partida).id);
  });
});

describe('avanzarBloque', () => {
  it('envejece al jugador y avanza el anio del mundo', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBeGreaterThan(p.jugador.edad);
    expect(despues.mundo.anio).toBeGreaterThan(p.mundo.anio);
  });

  it('genera noticias del mundo', () => {
    const despues = avanzarBloque(nuevaPartida());
    expect(despues.noticias.length).toBeGreaterThan(0);
  });

  it('recupera lesiones con el paso de los bloques', () => {
    const p = nuevaPartida();
    p.jugador.estado.lesion = { id: 'ceja', nombre: 'Ceja', severidad: 1, bloquesRestantes: 1, costo: 1, texto: 'x' };
    expect(avanzarBloque(p).jugador.estado.lesion).toBeNull();
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });
});

describe('ofertas de pelea por carrera', () => {
  // Guarda de ritmo para el eje de cinturones: si alguien vuelve a bajar probPelea
  // (o a hacer incondicional el beat de noticias) sin medir el impacto, estos tests
  // lo detectan. Ver el informe de la Task 17 para el porqué de estos números.
  const semillas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('nunca caen por debajo de 8 ofertas en toda la carrera', () => {
    semillas.forEach((semilla) => {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      const ofertas = beats.filter((b) => b.tipo === 'oferta').length;
      expect(ofertas).toBeGreaterThanOrEqual(8);
    });
  });

  it('tipicamente caen entre 12 y 22 ofertas por carrera', () => {
    semillas.forEach((semilla) => {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      const ofertas = beats.filter((b) => b.tipo === 'oferta').length;
      expect(ofertas).toBeGreaterThanOrEqual(12);
      expect(ofertas).toBeLessThanOrEqual(22);
    });
  });
});

describe('progresión de cinturones', () => {
  it('ganando todas las ofertas de pelea, el jugador puede conseguir los tres cinturones', () => {
    const partida = jugarGanandoTodo(nuevaPartida(1));
    expect(partida.jugador.titulos.length).toBe(CINTURONES.length);
    CINTURONES.forEach((cinturon) => {
      expect(partida.jugador.titulos).toContain(cinturon.nombre);
    });
  });
});
