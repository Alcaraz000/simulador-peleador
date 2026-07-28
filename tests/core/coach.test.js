import { describe, it, expect } from 'vitest';
import { ESTILOS } from '../../src/core/styles.js';
import { ENTRENADORES } from '../../src/content/coaches.js';
import {
  entrenadorDeEstilo, crearEntrenadorDe, bonusDelEntrenador, atributosConEntrenador, cambiarEntrenador,
} from '../../src/core/coach.js';
import { crearPeleador } from '../../src/core/fighter.js';

const base = {
  apellido: 'Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR',
  disciplina: 'boxeo', categoria: 'pluma', origen: 'barrio', media: 55,
};

describe('catalogo de entrenadores', () => {
  it('cada estilo tiene exactamente un entrenador', () => {
    for (const estilo of Object.values(ESTILOS)) {
      const coincidencias = ENTRENADORES.filter((e) => e.estiloId === estilo.id);
      expect(coincidencias).toHaveLength(1);
    }
  });

  it('cada entrenador tiene nombre, iniciales, escuela, frase, rareza y mods', () => {
    for (const entrenador of ENTRENADORES) {
      expect(entrenador.nombre.length).toBeGreaterThan(0);
      expect(entrenador.iniciales.length).toBeGreaterThan(0);
      expect(entrenador.escuela.length).toBeGreaterThan(0);
      expect(entrenador.frase.length).toBeGreaterThan(0);
      expect(['normal', 'rara', 'legendaria']).toContain(entrenador.rareza);
      expect(Object.keys(entrenador.mods).length).toBeGreaterThan(0);
    }
  });

  it('el entrenador del estilo legendario tambien es legendario (Nicolino Lecho)', () => {
    const coach = ENTRENADORES.find((e) => e.estiloId === 'contragolpeador');
    expect(coach.nombre).toBe('Nicolino Lecho');
    expect(coach.rareza).toBe('legendaria');
  });
});

describe('entrenadorDeEstilo', () => {
  it('encuentra el entrenador de cada estilo', () => {
    expect(entrenadorDeEstilo('tecnico').estiloId).toBe('tecnico');
  });

  it('devuelve null para un estilo desconocido', () => {
    expect(entrenadorDeEstilo('inventado')).toBeNull();
  });
});

describe('crearEntrenadorDe', () => {
  it('arma la ficha con la forma fija que consume el tablero', () => {
    const ficha = crearEntrenadorDe('tecnico');
    expect(Object.keys(ficha).sort()).toEqual(['aporte', 'escuela', 'frase', 'iniciales', 'nombre']);
    expect(ficha.nombre).toBe('El Profesor Aldana');
    expect(ficha.aporte).toEqual({ defensa: 6, agilidad: 2 });
  });
});

describe('bonusDelEntrenador', () => {
  it('devuelve el aporte del entrenador ya adjunto al jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(bonusDelEntrenador(jugador)).toEqual({ defensa: 6, agilidad: 2 });
  });

  it('da un objeto vacio si el jugador no tiene entrenador adjunto', () => {
    const sinEntrenador = { atributos: { defensa: 40 } };
    expect(bonusDelEntrenador(sinEntrenador)).toEqual({});
  });

  it('el aporte informativo cambia segun el estilo (y por lo tanto el entrenador)', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const otroJugador = crearPeleador({ ...base, estilo: 'menton' });
    expect(bonusDelEntrenador(jugador)).not.toEqual(bonusDelEntrenador(otroJugador));
  });
});

describe('atributosConEntrenador', () => {
  it('separa base (sin el entrenador) y aporte; base + aporte = el atributo efectivo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const conEntrenador = atributosConEntrenador(jugador);
    expect(conEntrenador.defensa.aporte).toBe(6);
    expect(conEntrenador.agilidad.aporte).toBe(2);
    expect(conEntrenador.fuerza.aporte).toBe(0);
    for (const [clave, { base, aporte }] of Object.entries(conEntrenador)) {
      expect(base + aporte).toBe(jugador.atributos[clave]);
    }
  });

  it('no muta el jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const antes = JSON.stringify(jugador);
    atributosConEntrenador(jugador);
    expect(JSON.stringify(jugador)).toBe(antes);
  });
});

describe('el aporte del entrenador esta horneado en jugador.atributos (bug de la v1: no repetirlo)', () => {
  // v13: crearPeleador ya no arranca de una base plana (repartirAtributosIniciales
  // reparte un desvío desigual con rng, Task 1.2) — así que estos tests ya no
  // pueden comparar contra un número absoluto hardcodeado. En cambio, comparan
  // el peleador CON entrenador contra el mismo peleador SIN entrenador
  // (cambiarEntrenador(jugador, null) resta el aporte tal cual): si el aporte
  // fuera un overlay que nadie suma de verdad (el bug reportado), sacar el
  // entrenador no cambiaría nada.
  it('jugador.atributos ya incluye el aporte del entrenador, no hace falta sumarlo aparte', () => {
    const jugador = crearPeleador({ ...base, estilo: 'noqueador' });
    const coach = jugador.entrenador;
    expect(coach.aporte).toEqual({ fuerza: 5, cardio: 2, defensa: -1 });

    const sinEntrenador = cambiarEntrenador(jugador, null);
    expect(jugador.atributos.fuerza - sinEntrenador.atributos.fuerza).toBe(5);
    expect(jugador.atributos.cardio - sinEntrenador.atributos.cardio).toBe(2);
    expect(jugador.atributos.defensa - sinEntrenador.atributos.defensa).toBe(-1);
  });

  it('un estilo con entrenador de aporte grande (legendario) tambien lo hornea', () => {
    const conCoachFuerte = crearPeleador({ ...base, estilo: 'contragolpeador' });
    expect(conCoachFuerte.entrenador.aporte).toEqual({ defensa: 8, agilidad: 10 });

    const sinEntrenador = cambiarEntrenador(conCoachFuerte, null);
    expect(conCoachFuerte.atributos.defensa - sinEntrenador.atributos.defensa).toBe(8);
    expect(conCoachFuerte.atributos.agilidad - sinEntrenador.atributos.agilidad).toBe(10);
  });
});

describe('cambiarEntrenador', () => {
  it('resta el aporte del entrenador viejo y suma el del nuevo, sin mutar al jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const antes = JSON.stringify(jugador);
    const nuevoEntrenador = crearEntrenadorDe('menton'); // { cardio: 5, defensa: 3 }

    const actualizado = cambiarEntrenador(jugador, nuevoEntrenador);

    expect(JSON.stringify(jugador)).toBe(antes); // no mutó el original

    // defensa: el 'tecnico' (Profesor Aldana) aportaba +6; al irse, se resta.
    // El nuevo (Don Casimiro) suma +3 de defensa, así que el neto es -6+3=-3.
    expect(actualizado.atributos.defensa).toBe(jugador.atributos.defensa - 6 + 3);
    // agilidad: aportaba +2 el viejo, el nuevo no toca agilidad.
    expect(actualizado.atributos.agilidad).toBe(jugador.atributos.agilidad - 2);
    // cardio: el nuevo (Don Casimiro) suma +5 que el viejo no daba.
    expect(actualizado.atributos.cardio).toBe(jugador.atributos.cardio + 5);

    expect(actualizado.entrenador).toBe(nuevoEntrenador);
  });

  it('el aporte informativo del nuevo entrenador coincide con lo que de verdad se sumo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'noqueador' });
    const actualizado = cambiarEntrenador(jugador, crearEntrenadorDe('contragolpeador'));
    const info = atributosConEntrenador(actualizado);
    expect(info.defensa.aporte).toBe(8);
    expect(info.defensa.base + info.defensa.aporte).toBe(actualizado.atributos.defensa);
  });

  it('quedarse sin entrenador (null) resta el aporte viejo y no suma nada nuevo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const sinEntrenador = cambiarEntrenador(jugador, null);
    expect(sinEntrenador.atributos.defensa).toBe(jugador.atributos.defensa - 6);
    expect(sinEntrenador.entrenador).toBeNull();
  });
});

describe('crearPeleador adjunta el entrenador segun el estilo', () => {
  it('todo peleador nuevo trae puesto el entrenador de su estilo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'menton' });
    expect(jugador.entrenador.nombre).toBe('Don Casimiro Vergara');
    expect(jugador.entrenador.aporte).toEqual({ cardio: 5, defensa: 3 });
  });

  it('el entrenador tiene la forma fija exacta (nombre, iniciales, escuela, frase, aporte)', () => {
    const jugador = crearPeleador({ ...base, estilo: 'noqueador' });
    expect(Object.keys(jugador.entrenador).sort())
      .toEqual(['aporte', 'escuela', 'frase', 'iniciales', 'nombre']);
  });
});
