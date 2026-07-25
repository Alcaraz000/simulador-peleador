import { describe, it, expect } from 'vitest';
import { ESTILOS } from '../../src/core/styles.js';
import { ENTRENADORES } from '../../src/content/coaches.js';
import {
  entrenadorDeEstilo, crearEntrenadorDe, bonusDelEntrenador, atributosConEntrenador,
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

  it('cambiar de entrenador cambia los numeros', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const otroJugador = crearPeleador({ ...base, estilo: 'menton' });
    expect(bonusDelEntrenador(jugador)).not.toEqual(bonusDelEntrenador(otroJugador));

    // Tambien cambia si a UN MISMO jugador se le reemplaza el entrenador
    // (por ejemplo, al fichar uno nuevo mas adelante en la carrera).
    const conNuevoEntrenador = { ...jugador, entrenador: crearEntrenadorDe('menton') };
    expect(bonusDelEntrenador(conNuevoEntrenador)).not.toEqual(bonusDelEntrenador(jugador));
  });
});

describe('atributosConEntrenador', () => {
  it('separa base y aporte para cada atributo', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const conEntrenador = atributosConEntrenador(jugador);
    expect(conEntrenador.tecnica.base).toBe(jugador.atributos.tecnica);
    expect(conEntrenador.tecnica.aporte).toBe(6);
    expect(conEntrenador.iq.aporte).toBe(2);
    expect(conEntrenador.potencia.aporte).toBe(0);
  });

  it('el aporte no esta horneado en los atributos base (son overlay, no permanentes)', () => {
    const conEntrenador = crearPeleador({ ...base, estilo: 'tecnico' });
    const sinEntrenador = { ...conEntrenador, entrenador: null };
    // El atributo base es identico tenga o no entrenador adjunto: el aporte
    // es puramente visual/derivado, no se suma al atributo guardado.
    expect(conEntrenador.atributos.tecnica).toBe(sinEntrenador.atributos.tecnica);
  });

  it('no muta el jugador', () => {
    const jugador = crearPeleador({ ...base, estilo: 'tecnico' });
    const antes = JSON.stringify(jugador);
    atributosConEntrenador(jugador);
    expect(JSON.stringify(jugador)).toBe(antes);
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
