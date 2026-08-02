import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, guardarBonusProximaPelea, consumirBonusProximaPelea } from '../../src/core/career.js';
import { BONUS_TEMPORAL_MAXIMO } from '../../src/core/sparring.js';
import { LIMITES_ATRIBUTO } from '../../src/core/stats.js';

const jugador = (extra = {}) => crearPeleador({
  apellido: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  rng: createRng(7), ...extra,
});

const partidaBase = () => crearPartida({ jugador: jugador(), semilla: 7 });

// Pedido v17: "quiero que este minijuego tenga algún impacto real (¿subida de
// cardio temporal para esta pelea?)". Lo que se prueba acá es justamente eso:
// que el envión LLEGUE al ring y que no se quede pegado después.
describe('el envión de cardio del sparring', () => {
  it('una partida nueva arranca sin envión pendiente', () => {
    expect(partidaBase().bonusProximaPelea).toBeNull();
  });

  it('una sesión que no rindió (bonus vacío) no deja nada guardado', () => {
    const con = guardarBonusProximaPelea(partidaBase(), {});
    expect(con.bonusProximaPelea).toBeNull();
  });

  it('guarda el envión de una sesión buena', () => {
    const con = guardarBonusProximaPelea(partidaBase(), { cardio: 4 });
    expect(con.bonusProximaPelea).toEqual({ cardio: 4 });
  });

  it('el peleador que sale al ring pelea con el cardio levantado', () => {
    const partida = guardarBonusProximaPelea(partidaBase(), { cardio: 8 });
    const cardioFicha = partida.jugador.atributos.cardio;

    const { jugador: enElRing } = consumirBonusProximaPelea(partida);

    expect(enElRing.atributos.cardio).toBe(cardioFicha + 8);
  });

  it('solo toca el cardio: el resto de los atributos sale intacto', () => {
    const partida = guardarBonusProximaPelea(partidaBase(), { cardio: 8 });
    const { jugador: enElRing } = consumirBonusProximaPelea(partida);

    for (const clave of ['fuerza', 'defensa', 'agilidad']) {
      expect(enElRing.atributos[clave]).toBe(partida.jugador.atributos[clave]);
    }
  });

  it('es TEMPORAL: la ficha guardada nunca ve el envión', () => {
    const partida = guardarBonusProximaPelea(partidaBase(), { cardio: 8 });
    const antes = partida.jugador.atributos.cardio;

    const { partida: despues } = consumirBonusProximaPelea(partida);

    expect(despues.jugador.atributos.cardio).toBe(antes);
  });

  it('se gasta en UNA pelea, no en dos', () => {
    const partida = guardarBonusProximaPelea(partidaBase(), { cardio: 8 });
    const primera = consumirBonusProximaPelea(partida);
    expect(primera.partida.bonusProximaPelea).toBeNull();

    const segunda = consumirBonusProximaPelea(primera.partida);
    expect(segunda.jugador.atributos.cardio).toBe(partida.jugador.atributos.cardio);
  });

  it('sin envión pendiente, el peleador sale tal cual está', () => {
    const partida = partidaBase();
    const { jugador: enElRing } = consumirBonusProximaPelea(partida);
    expect(enElRing.atributos).toEqual(partida.jugador.atributos);
  });

  // Un campamento encadena varias sesiones antes de la misma pelea: sin tope,
  // repetir el minijuego valdría más que cualquier tarjeta legendaria.
  it('varias sesiones de campamento acumulan, pero con techo', () => {
    let partida = partidaBase();
    for (let i = 0; i < 5; i += 1) partida = guardarBonusProximaPelea(partida, { cardio: 8 });

    expect(partida.bonusProximaPelea.cardio).toBe(BONUS_TEMPORAL_MAXIMO);
  });

  it('nunca empuja el cardio por encima del máximo de un atributo', () => {
    const partida = guardarBonusProximaPelea(
      { ...partidaBase(), jugador: jugador({ media: 99 }) },
      { cardio: 8 },
    );
    const { jugador: enElRing } = consumirBonusProximaPelea(partida);

    expect(enElRing.atributos.cardio).toBeLessThanOrEqual(LIMITES_ATRIBUTO.max);
  });

  it('no muta la partida que recibe', () => {
    const partida = guardarBonusProximaPelea(partidaBase(), { cardio: 8 });
    const antes = JSON.stringify(partida);

    consumirBonusProximaPelea(partida);

    expect(JSON.stringify(partida)).toBe(antes);
  });
});
