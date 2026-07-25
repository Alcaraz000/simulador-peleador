import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea } from '../../src/core/fight.js';
import {
  INSTRUCCIONES_RINCON, ZONAS_GOLPE, avanzarPelea, estadoRincon,
  aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia,
} from '../../src/core/fight-interactive.js';

function armar({ semilla = 1, nivel = 'profesional' } = {}) {
  const jugador = crearPeleador({
    nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
  });
  const rival = crearPeleador({
    nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina: 'boxeo',
    estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 58,
  });
  return crearPelea({ jugador, rival, disciplina: 'boxeo', nivel, plan: 'afuera', rng: createRng(semilla) });
}

describe('instrucciones del rincon', () => {
  it('define las tres instrucciones', () => {
    expect(Object.keys(INSTRUCCIONES_RINCON).sort()).toEqual(['acelerar', 'cuerpo', 'respirar']);
  });

  it('respirar baja fatiga y acelerar la sube', () => {
    expect(INSTRUCCIONES_RINCON.respirar.mods.fatigaJugador).toBeLessThan(0);
    expect(INSTRUCCIONES_RINCON.acelerar.mods.fatigaJugador).toBeGreaterThan(0);
  });

  it('ir al cuerpo mejora la chance de golpe de gracia', () => {
    expect(INSTRUCCIONES_RINCON.cuerpo.mods.ventanaGolpe).toBeGreaterThan(0);
  });

  it('cada instruccion mapea a un plan valido', () => {
    for (const i of Object.values(INSTRUCCIONES_RINCON)) {
      expect(['frente', 'afuera', 'aguantar']).toContain(i.plan);
    }
  });
});

describe('avanzarPelea', () => {
  it('marca pendiente rincon al cerrar un round sin desenlace', () => {
    const { pelea } = avanzarPelea(armar());
    if (!pelea.terminada) expect(pelea.pendiente).toBe('rincon');
  });

  it('no marca pendiente si la pelea termino', () => {
    let pelea = armar({ nivel: 'amateur' });
    let guardia = 0;
    while (!pelea.terminada && guardia < 20) {
      guardia += 1;
      pelea = avanzarPelea(pelea).pelea;
      if (pelea.pendiente) pelea = aplicarInstruccionRincon(pelea, 'respirar');
    }
    expect(pelea.terminada).toBe(true);
    expect(pelea.pendiente).toBeNull();
  });
});

describe('estadoRincon', () => {
  it('describe como viene la pelea', () => {
    const { pelea } = avanzarPelea(armar());
    const estado = estadoRincon(pelea);
    expect(estado.tarjetasTexto).toMatch(/\d/);
    expect(typeof estado.fatigaJugador).toBe('number');
    expect(estado.consejo.length).toBeGreaterThan(0);
  });
});

describe('aplicarInstruccionRincon', () => {
  it('limpia el pendiente y cambia el plan', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'acelerar');
    expect(despues.pendiente).toBeNull();
    expect(despues.plan).toBe(INSTRUCCIONES_RINCON.acelerar.plan);
  });

  it('respirar baja la fatiga del jugador', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'respirar');
    expect(despues.fatiga.jugador).toBeLessThanOrEqual(pelea.fatiga.jugador);
  });

  it('ir al cuerpo castiga el aguante del rival', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(despues.aguante.rival).toBeLessThanOrEqual(pelea.aguante.rival);
  });

  it('no muta la pelea original', () => {
    const { pelea } = avanzarPelea(armar());
    const antes = JSON.stringify(pelea);
    aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  it('rechaza una instruccion desconocida', () => {
    const { pelea } = avanzarPelea(armar());
    expect(() => aplicarInstruccionRincon(pelea, 'inventada')).toThrow(/inventada/);
  });
});

describe('golpe de gracia', () => {
  function peleaConRivalGroggy() {
    const pelea = armar();
    return { ...pelea, aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
  }

  it('define las tres zonas', () => {
    expect(Object.keys(ZONAS_GOLPE).sort()).toEqual(['higado', 'menton', 'sien']);
  });

  it('el menton es la zona mas dificil y la que mas dana', () => {
    expect(ZONAS_GOLPE.menton.dificultad).toBeGreaterThan(ZONAS_GOLPE.higado.dificultad);
    expect(ZONAS_GOLPE.menton.danoBase).toBeGreaterThan(ZONAS_GOLPE.higado.danoBase);
  });

  it('abrir la ventana informa la zona abierta y las tres opciones', () => {
    const info = abrirGolpeDeGracia(peleaConRivalGroggy());
    expect(Object.keys(ZONAS_GOLPE)).toContain(info.zonaAbierta);
    expect(info.zonas).toHaveLength(3);
    expect(info.ventanaMs).toBeGreaterThan(0);
  });

  it('acertar la zona abierta con buena precision suele terminar la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 10 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: info.zonaAbierta, precision: 1, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeGreaterThan(14);
  });

  it('no llegar a tiempo cuesta la chance y suma fatiga', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'higado', precision: 1, aTiempo: false,
    });
    expect(despues.terminada).toBe(false);
    expect(despues.pendiente).toBeNull();
    expect(despues.fatiga.jugador).toBeGreaterThan(pelea.fatiga.jugador);
    expect(despues.aguante.rival).toBeGreaterThanOrEqual(pelea.aguante.rival);
    expect(eventos.some((e) => /se recompone|se rearma|perdiste/i.test(e.texto))).toBe(true);
  });

  it('pegar en una zona tapada casi nunca termina la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 30 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const tapada = Object.keys(ZONAS_GOLPE).find((z) => z !== info.zonaAbierta);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: tapada, precision: 0.2, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeLessThan(8);
  });

  it('siempre limpia el pendiente y narra algo', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'menton', precision: 0.5, aTiempo: true,
    });
    expect(despues.pendiente).toBeNull();
    expect(eventos.length).toBeGreaterThan(0);
  });
});
