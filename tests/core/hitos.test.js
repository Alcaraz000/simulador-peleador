import { describe, it, expect } from 'vitest';
import {
  hitosDePelea, hitoDeEtapa, textoDeHito, noticiaDeHitoJugador,
} from '../../src/core/hitos.js';

// Sistema 4 (feedback del usuario: "faltan popups cuando pasen cosas
// importantes: cuando se gana un cinturón, cuando se pierde un cinturón,
// cuando se avanza de categoría..."). `hitosDePelea`/`hitoDeEtapa` son
// puras: solo DETECTAN qué pasó, comparando antes/después — quien pinta el
// popup de verdad es main.js, con `abrirPopup` (ui/components/popup.js).

function ofertaBase(extra = {}) {
  return {
    id: 'of_1', rivalId: 'r1', rivalApodo: 'El Zurdo', esTitulo: true, esObligatoria: false, enJuego: 'Cinturón regional', defensasObligatorias: 2, ...extra,
  };
}

function jugadorConHistorial(cantidad) {
  return { historial: Array.from({ length: cantidad }, (_, i) => ({ resultado: 'v', rivalApodo: `Rival ${i}` })) };
}

describe('hitosDePelea', () => {
  it('sin nada especial, no detecta ningun hito', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'Subís al ranking si ganás' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(3),
    });
    expect(hitos).toEqual([]);
  });

  it('detecta titulo_ganado cuando cerrarPelea ya determino un tituloGanado', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      tituloGanado: 'Cinturón regional',
      jugadorAntes: jugadorConHistorial(5),
    });
    expect(hitos.some((h) => h.tipo === 'titulo_ganado' && h.cinturon === 'Cinturón regional')).toBe(true);
  });

  it('detecta defensa_exitosa SOLO en la defensa que consolida el reinado (llega justo a defensasObligatorias)', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esObligatoria: true, defensasObligatorias: 2 }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
      defensasActuales: 2,
    });
    expect(hitos).toEqual([{ tipo: 'defensa_exitosa', cinturon: 'Cinturón regional', contexto: 0 }]);
  });

  it('una defensa exitosa que TODAVÍA no llega a defensasObligatorias no dispara ningun hito (no molestar en cada defensa de rutina)', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esObligatoria: true, defensasObligatorias: 3 }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
      defensasActuales: 1, // primera de tres, todavía no consolida
    });
    expect(hitos).toEqual([]);
  });

  it('detecta titulo_perdido: pelea obligatoria, pierde', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esObligatoria: true }),
      resultado: { ganador: 'rival' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
    });
    expect(hitos).toEqual([{ tipo: 'titulo_perdido', cinturon: 'Cinturón regional', contexto: 0 }]);
  });

  it('un empate en una defensa obligatoria no cuenta como perdido ni como defendido', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esObligatoria: true }),
      resultado: { ganador: 'empate' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
    });
    expect(hitos.some((h) => h.tipo === 'titulo_perdido' || h.tipo === 'defensa_exitosa')).toBe(false);
  });

  it('detecta primera_pelea cuando el historial estaba vacio antes', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(0),
    });
    expect(hitos.some((h) => h.tipo === 'primera_pelea')).toBe(true);
  });

  it('no detecta primera_pelea si ya habia historial', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(1),
    });
    expect(hitos.some((h) => h.tipo === 'primera_pelea')).toBe(false);
  });

  it('detecta rivalidad_consagrada cuando el archirrival aparece por primera vez', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
      archirrivalAntesId: null,
      archirrivalDespuesId: 'r1',
    });
    expect(hitos.some((h) => h.tipo === 'rivalidad_consagrada')).toBe(true);
  });

  it('no repite rivalidad_consagrada si el archirrival ya estaba consagrado de antes', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(5),
      archirrivalAntesId: 'r1',
      archirrivalDespuesId: 'r1',
    });
    expect(hitos.some((h) => h.tipo === 'rivalidad_consagrada')).toBe(false);
  });

  it('detecta racha en la victoria numero 10 seguida, ni antes ni despues', () => {
    const conRacha = (n) => hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'jugador' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(n),
    }).some((h) => h.tipo === 'racha');

    expect(conRacha(8)).toBe(false); // esta seria la victoria 9
    expect(conRacha(9)).toBe(true); // esta es la 10
    expect(conRacha(10)).toBe(false); // esta seria la 11, ya pasó el hito
  });

  it('no detecta racha si la pelea se pierde', () => {
    const hitos = hitosDePelea({
      oferta: ofertaBase({ esTitulo: false, enJuego: 'x' }),
      resultado: { ganador: 'rival' },
      tituloGanado: null,
      jugadorAntes: jugadorConHistorial(9),
    });
    expect(hitos.some((h) => h.tipo === 'racha')).toBe(false);
  });
});

describe('hitoDeEtapa', () => {
  it('sin cambio de etapa, no hay hito', () => {
    expect(hitoDeEtapa({
      etapaAnteriorId: 'profesional', etapaNueva: { id: 'profesional', nombre: 'Profesional', frase: 'x' },
    })).toBeNull();
  });

  it('con cambio de etapa, hay hito con el nombre y la frase de la nueva etapa', () => {
    const hito = hitoDeEtapa({
      etapaAnteriorId: 'amateur', etapaNueva: { id: 'profesional', nombre: 'Profesional', frase: 'Acá se cobra y se sangra.' },
    });
    expect(hito.tipo).toBe('etapa_avanza');
    expect(hito.etapa).toBe('Profesional');
    expect(hito.frase).toBe('Acá se cobra y se sangra.');
  });

  it('sin etapa anterior conocida (primer beat de la carrera), no hay hito', () => {
    expect(hitoDeEtapa({
      etapaAnteriorId: null, etapaNueva: { id: 'juvenil', nombre: 'Juvenil', frase: 'x' },
    })).toBeNull();
  });
});

describe('textoDeHito', () => {
  const TIPOS = ['titulo_ganado', 'titulo_perdido', 'defensa_exitosa', 'etapa_avanza', 'primera_pelea', 'rivalidad_consagrada', 'racha'];

  it('todo tipo de hito resuelve a titulo, texto e icono no vacios', () => {
    for (const tipo of TIPOS) {
      const resuelto = textoDeHito({
        tipo, cinturon: 'Cinturón regional', etapa: 'Profesional', frase: 'x', rival: 'El Zurdo', cantidad: 10, contexto: 3,
      });
      expect(resuelto.titulo.length).toBeGreaterThan(0);
      expect(resuelto.texto.length).toBeGreaterThan(0);
      expect(resuelto.icono).toBeTruthy();
      // Ningún marcador {clave} se queda sin rellenar en el texto final.
      expect(resuelto.texto).not.toMatch(/\{[a-z]+\}/);
    }
  });

  it('un tipo desconocido no rompe: devuelve null', () => {
    expect(textoDeHito({ tipo: 'inventado' })).toBeNull();
  });

  it('con datos distintos (contexto distinto), puede variar el cartel elegido (no siempre el mismo)', () => {
    const vistos = new Set();
    for (let contexto = 0; contexto < 30; contexto += 1) {
      const resuelto = textoDeHito({ tipo: 'titulo_ganado', cinturon: 'Cinturón regional', contexto });
      vistos.add(resuelto.titulo);
    }
    expect(vistos.size).toBeGreaterThan(1);
  });

  it('es determinista: los mismos datos siempre dan el mismo cartel', () => {
    const a = textoDeHito({ tipo: 'defensa_exitosa', cinturon: 'Cinturón nacional', contexto: 7 });
    const b = textoDeHito({ tipo: 'defensa_exitosa', cinturon: 'Cinturón nacional', contexto: 7 });
    expect(a).toEqual(b);
  });
});

// Pedido v6 ("las noticias también deberían nombrar al jugador cuando
// ocurren cosas importantes"): a diferencia del popup (hitosDePelea, arriba,
// que se muestra SIEMPRE que hay algo que contar), acá se elige A LO SUMO
// un hito por pelea para el FEED de noticias, con su propia prioridad —
// título/récord pesan distinto que un simple salto en el ranking. Pura, sin
// rng: la variedad de texto la resuelve generarNoticia (news.js) con SU
// propio rng, aparte.
describe('noticiaDeHitoJugador', () => {
  function jugador(extra = {}) {
    return {
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', record: { v: 5, d: 1, e: 0 }, defensasCinturon: {}, ...extra,
    };
  }

  function ofertaBase(extra = {}) {
    return {
      rivalApodo: 'El Zurdo', rivalNombre: 'Ramón Diaz', cinturonId: 'regional', esRevancha: false, ...extra,
    };
  }

  it('sin ningun hito y sin salto de ranking, no genera noticia', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 4, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 5, d: 1, e: 0 } }),
    });
    expect(r).toBeNull();
  });

  it('titulo_ganado se traduce a tipo "titulo" con el nombre del cinturon y el rival', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'titulo_ganado', cinturon: 'Cinturón regional' }],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador(),
      jugador: jugador(),
    });
    expect(r.tipo).toBe('titulo');
    expect(r.datos).toMatchObject({ nombre: 'Lucas Ortiz', apodo: 'El Relámpago', rival: 'El Zurdo', titulo: 'Cinturón regional' });
  });

  it('titulo_perdido se traduce a tipo "titulo_perdido"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'titulo_perdido', cinturon: 'Cinturón regional' }],
      oferta: ofertaBase(),
      resultado: { ganador: 'rival' },
      jugadorAntes: jugador(),
      jugador: jugador(),
    });
    expect(r.tipo).toBe('titulo_perdido');
    expect(r.datos.titulo).toBe('Cinturón regional');
  });

  it('defensa_exitosa se traduce a tipo "defensa" con el numero de defensas del cinturon', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'defensa_exitosa', cinturon: 'Cinturón regional' }],
      oferta: ofertaBase({ cinturonId: 'regional' }),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador(),
      jugador: jugador({ defensasCinturon: { regional: 3 } }),
    });
    expect(r.tipo).toBe('defensa');
    expect(r.datos.titulo).toBe('Cinturón regional');
    expect(r.datos.numero).toBe(3);
  });

  it('ganar una pelea de revancha (sin otro hito) se traduce a "revancha_ganada"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase({ esRevancha: true }),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 5, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 6, d: 1, e: 0 } }),
    });
    expect(r.tipo).toBe('revancha_ganada');
  });

  it('perder una revancha NO genera "revancha_ganada"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase({ esRevancha: true }),
      resultado: { ganador: 'rival' },
      jugadorAntes: jugador({ record: { v: 5, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 5, d: 2, e: 0 } }),
    });
    expect(r).toBeNull();
  });

  it('primera_pelea (debut profesional) se traduce a tipo "debut"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'primera_pelea' }],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 0, d: 0, e: 0 } }),
      jugador: jugador({ record: { v: 1, d: 0, e: 0 } }),
    });
    expect(r.tipo).toBe('debut');
    expect(r.datos).toEqual({ nombre: 'Lucas Ortiz', apodo: 'El Relámpago' });
  });

  it('llegar a un múltiplo de 10 en el récord de victorias se traduce a tipo "record"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 9, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 10, d: 1, e: 0 } }),
    });
    expect(r.tipo).toBe('record');
    expect(r.datos.numero).toBe(10);
  });

  it('sumar una victoria que NO cae en un multiplo de 10 no genera "record"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 10, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 11, d: 1, e: 0 } }),
    });
    expect(r).toBeNull();
  });

  it('un salto grande hacia arriba en el ranking se traduce a tipo "ranking"', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 5, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 6, d: 1, e: 0 } }),
      rankingAntes: 40,
      rankingDespues: 25,
    });
    expect(r.tipo).toBe('ranking');
    expect(r.datos.numero).toBe(25);
  });

  it('un salto chico en el ranking (de rutina) no genera noticia', () => {
    const r = noticiaDeHitoJugador({
      hitos: [],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 5, d: 1, e: 0 } }),
      jugador: jugador({ record: { v: 6, d: 1, e: 0 } }),
      rankingAntes: 40,
      rankingDespues: 38,
    });
    expect(r).toBeNull();
  });

  it('prioridad: titulo_ganado le gana a un salto de ranking simultaneo', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'titulo_ganado', cinturon: 'Cinturón regional' }],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador(),
      jugador: jugador(),
      rankingAntes: 40,
      rankingDespues: 20,
    });
    expect(r.tipo).toBe('titulo');
  });

  it('prioridad: el debut le gana a un record de victorias simultaneo', () => {
    const r = noticiaDeHitoJugador({
      hitos: [{ tipo: 'primera_pelea' }],
      oferta: ofertaBase(),
      resultado: { ganador: 'jugador' },
      jugadorAntes: jugador({ record: { v: 9, d: 0, e: 0 } }),
      jugador: jugador({ record: { v: 10, d: 0, e: 0 } }),
    });
    expect(r.tipo).toBe('debut');
  });

  it('no muta ninguno de sus argumentos', () => {
    const hitos = [{ tipo: 'titulo_ganado', cinturon: 'Cinturón regional' }];
    const oferta = ofertaBase();
    const jugadorAntesArg = jugador();
    const jugadorArg = jugador();
    const antes = JSON.stringify({ hitos, oferta, jugadorAntesArg, jugadorArg });
    noticiaDeHitoJugador({
      hitos, oferta, resultado: { ganador: 'jugador' }, jugadorAntes: jugadorAntesArg, jugador: jugadorArg,
    });
    expect(JSON.stringify({ hitos, oferta, jugadorAntesArg, jugadorArg })).toBe(antes);
  });
});
