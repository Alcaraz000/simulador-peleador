import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  decidirLargoCampamento, elegirCartaCampamento, armarBeatsCampamento, SEMANAS_POR_BEAT_CAMPAMENTO,
} from '../../src/core/campamento.js';

const jugador = () => crearPeleador({
  nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
});

// Pedido 3 (v6, "hay muy poco margen entre una pelea y otra... debe darte
// varios turnos de preparación"): antes 2-3 beats (mayormente 2). Ahora 3-4
// para una pelea común y 4-5 para una de título/defensa.
describe('decidirLargoCampamento', () => {
  it('una pelea comun devuelve 3 o 4', () => {
    const ofertaComun = { esTitulo: false };
    for (let s = 1; s <= 200; s++) {
      expect([3, 4]).toContain(decidirLargoCampamento(createRng(s + 500000), ofertaComun));
    }
  });

  it('una pelea de titulo devuelve 4 o 5', () => {
    const ofertaTitulo = { esTitulo: true };
    for (let s = 1; s <= 200; s++) {
      expect([4, 5]).toContain(decidirLargoCampamento(createRng(s), ofertaTitulo));
    }
  });

  it('una pelea de titulo tiene mas chance de campamento largo que una comun', () => {
    let largosTitulo = 0;
    let largosComunes = 0;
    const N = 500;
    for (let s = 1; s <= N; s++) {
      if (decidirLargoCampamento(createRng(s), { esTitulo: true }) === 5) largosTitulo += 1;
      if (decidirLargoCampamento(createRng(s + 1000000), { esTitulo: false }) === 4) largosComunes += 1;
    }
    expect(largosTitulo / N).toBeGreaterThan(largosComunes / N);
  });

  it('es determinista con el mismo rng', () => {
    const oferta = { esTitulo: true };
    expect(decidirLargoCampamento(createRng(42), oferta)).toBe(decidirLargoCampamento(createRng(42), oferta));
  });
});

describe('elegirCartaCampamento', () => {
  it('rellena el marcador {rival} con el apodo del rival en texto y opciones', () => {
    const rng = createRng(1);
    const oferta = { rivalApodo: 'El Zurdo', esTitulo: false };
    const carta = elegirCartaCampamento(rng, { etapa: 'profesional', oferta });
    expect(carta.texto).not.toMatch(/\{rival\}/);
    carta.opciones.forEach((o) => expect(o.texto).not.toMatch(/\{rival\}/));
  });

  it('nunca elige una carta que no aplique a la etapa', () => {
    for (let s = 1; s <= 100; s++) {
      const rng = createRng(s);
      const carta = elegirCartaCampamento(rng, { etapa: 'juvenil', oferta: { rivalApodo: 'X', esTitulo: false } });
      expect(carta.etapas).toContain('juvenil');
    }
  });

  // La intención original de este test era "ninguna opción de campamento es
  // un cascarón vacío que no hace nada" — hasta v7 eso se cumplía siempre
  // vía `o.mods` porque el campamento nunca tenía azar. Pedido 2 (v7, "más
  // tarjetas de %... también en el campamento") suma opciones con
  // `probabilidades` (mismo mecanismo que evento/redes, resuelto por
  // `resolverOpcion`): esas NO traen `mods` a nivel opción (el mod vive por
  // rama, ver cards-camp.js), así que el chequeo tiene que aceptar cualquiera
  // de los dos como "esta opción sí define un efecto".
  it('cada carta trae exactamente dos opciones, y cada una define un efecto (mods fijos o probabilidades)', () => {
    for (let s = 1; s <= 50; s++) {
      const rng = createRng(s);
      const carta = elegirCartaCampamento(rng, { etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: false } });
      expect(carta.opciones.length).toBe(2);
      carta.opciones.forEach((o) => expect(o.mods || o.probabilidades).toBeTruthy());
    }
  });
});

describe('armarBeatsCampamento', () => {
  it('arma 3 o 4 beats (comun), con exactamente un campSparring y el resto campCarta', () => {
    const rng = createRng(3);
    const oferta = { rivalApodo: 'El Zurdo', esTitulo: false };
    const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta, semanaInicial: 10,
    });
    expect([3, 4]).toContain(beats.length);
    expect(beats.filter((b) => b.tipo === 'campSparring')).toHaveLength(1);
    expect(beats.filter((b) => b.tipo === 'campCarta')).toHaveLength(beats.length - 1);
    expect(semanaObjetivo).toBeGreaterThan(10);
  });

  it('arma 4 o 5 beats para una pelea de titulo', () => {
    const rng = createRng(30);
    const oferta = { rivalApodo: 'El Zurdo', esTitulo: true };
    const { beats } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta, semanaInicial: 10,
    });
    expect([4, 5]).toContain(beats.length);
    expect(beats.filter((b) => b.tipo === 'campSparring')).toHaveLength(1);
  });

  it('el ultimo beat, y solo el ultimo, trae datos.ultimo = true', () => {
    const rng = createRng(4);
    const { beats } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: true }, semanaInicial: 1,
    });
    beats.forEach((b, i) => expect(b.datos.ultimo).toBe(i === beats.length - 1));
  });

  it('las semanas de los beats suman exactamente semanaObjetivo - semanaInicial', () => {
    const rng = createRng(5);
    const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: false }, semanaInicial: 20,
    });
    const suma = beats.reduce((a, b) => a + b.datos.semanas, 0);
    expect(suma).toBe(semanaObjetivo - 20);
  });

  it('semanaObjetivo es semanaInicial + largo * SEMANAS_POR_BEAT_CAMPAMENTO', () => {
    const rng = createRng(6);
    const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: false }, semanaInicial: 1,
    });
    expect(semanaObjetivo).toBe(1 + beats.length * SEMANAS_POR_BEAT_CAMPAMENTO);
  });

  it('cada beat.datos.oferta es la oferta recibida', () => {
    const rng = createRng(7);
    const oferta = { rivalApodo: 'X', esTitulo: false };
    const { beats } = armarBeatsCampamento(rng, {
      jugador: jugador(), etapa: 'profesional', oferta, semanaInicial: 1,
    });
    beats.forEach((b) => expect(b.datos.oferta).toBe(oferta));
  });

  it('no muta jugador ni oferta', () => {
    const rng = createRng(8);
    const j = jugador();
    const oferta = { rivalApodo: 'X', esTitulo: false };
    const antesJugador = JSON.stringify(j);
    const antesOferta = JSON.stringify(oferta);
    armarBeatsCampamento(rng, {
      jugador: j, etapa: 'profesional', oferta, semanaInicial: 1,
    });
    expect(JSON.stringify(j)).toBe(antesJugador);
    expect(JSON.stringify(oferta)).toBe(antesOferta);
  });
});
