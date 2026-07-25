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
    expect(ficha.aporte).toEqual({ tecnica: 6, iq: 2 });
  });
});

describe('bonusDelEntrenador', () => {
  it('devuelve el aporte del entrenador ya adjunto al jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(bonusDelEntrenador(jugador)).toEqual({ tecnica: 6, iq: 2 });
  });

  it('da un objeto vacio si el jugador no tiene entrenador adjunto', () => {
    const sinEntrenador = { atributos: { tecnica: 40 } };
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
    expect(conEntrenador.tecnica.aporte).toBe(6);
    expect(conEntrenador.iq.aporte).toBe(2);
    expect(conEntrenador.potencia.aporte).toBe(0);
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
  it('jugador.atributos ya incluye el aporte del entrenador, no hace falta sumarlo aparte', () => {
    // Nota: `base` (arriba) no trae `apodoId`, asi que el apodo es solo texto
    // decorativo acá y no aporta mods (comportamiento legacy sin apodoId).
    //
    // El estilo 'noqueador' no toca defensa en sus propios mods ni en los del
    // origen 'barrio': si defensa baja de todos modos, solo puede venir del
    // entrenador (Rubén "Tanque" Ferro sí la toca).
    const jugador = crearPeleador({ ...base, estilo: 'noqueador' });
    const coach = jugador.entrenador;
    expect(coach.aporte).toEqual({ potencia: 5, cardio: 2, defensa: -1 });

    // baseAtributos(disciplina, 55) arranca los seis atributos en 55; el
    // estilo 'noqueador' aporta potencia+7, cardio-4; el origen 'barrio'
    // aporta potencia+3. Sumado SIN el entrenador: potencia = 55+7+3 = 65,
    // defensa = 55 (nadie más la toca). Con el entrenador horneado, tiene
    // que ser potencia 65+5=70 y defensa 55-1=54 — si el aporte fuera un
    // overlay que nadie suma (el bug reportado), estos números seguirían
    // en 65 y 55.
    expect(jugador.atributos.potencia).toBe(70);
    expect(jugador.atributos.defensa).toBe(54);
  });

  it('un estilo con entrenador de aporte grande (legendario) tambien lo hornea', () => {
    // Sin entrenador, 'contragolpeador' (tecnica+6) + 'barrio' (tecnica-3)
    // sobre una base de 55 da tecnica = 55+6-3 = 58. Con Nicolino Lecho
    // (tecnica+8) horneado, tiene que dar 66, no 58.
    const conCoachFuerte = crearPeleador({ ...base, estilo: 'contragolpeador' });
    expect(conCoachFuerte.entrenador.aporte.tecnica).toBe(8);
    expect(conCoachFuerte.atributos.tecnica).toBe(66);
  });
});

describe('cambiarEntrenador', () => {
  it('resta el aporte del entrenador viejo y suma el del nuevo, sin mutar al jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const antes = JSON.stringify(jugador);
    const nuevoEntrenador = crearEntrenadorDe('menton'); // { cardio: 5, defensa: 3 }

    const actualizado = cambiarEntrenador(jugador, nuevoEntrenador);

    expect(JSON.stringify(jugador)).toBe(antes); // no mutó el original

    // tecnica: el 'tecnico' (Profesor Aldana) aportaba +6; al irse, se resta.
    expect(actualizado.atributos.tecnica).toBe(jugador.atributos.tecnica - 6);
    // iq: aportaba +2 el viejo, el nuevo no toca iq.
    expect(actualizado.atributos.iq).toBe(jugador.atributos.iq - 2);
    // cardio y defensa: el nuevo (Don Casimiro) suma +5 y +3 que el viejo no daba.
    expect(actualizado.atributos.cardio).toBe(jugador.atributos.cardio + 5);
    expect(actualizado.atributos.defensa).toBe(jugador.atributos.defensa + 3);

    expect(actualizado.entrenador).toBe(nuevoEntrenador);
  });

  it('el aporte informativo del nuevo entrenador coincide con lo que de verdad se sumo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'noqueador' });
    const actualizado = cambiarEntrenador(jugador, crearEntrenadorDe('contragolpeador'));
    const info = atributosConEntrenador(actualizado);
    expect(info.tecnica.aporte).toBe(8);
    expect(info.tecnica.base + info.tecnica.aporte).toBe(actualizado.atributos.tecnica);
  });

  it('quedarse sin entrenador (null) resta el aporte viejo y no suma nada nuevo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const sinEntrenador = cambiarEntrenador(jugador, null);
    expect(sinEntrenador.atributos.tecnica).toBe(jugador.atributos.tecnica - 6);
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
