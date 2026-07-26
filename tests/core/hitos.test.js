import { describe, it, expect } from 'vitest';
import {
  hitosDePelea, hitoDeEtapa, textoDeHito,
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
