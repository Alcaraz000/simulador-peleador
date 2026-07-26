import { describe, it, expect } from 'vitest';
import { CARTAS_CAMPAMENTO } from '../../src/content/cards-camp.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_MEJORA } from '../../src/content/cards-improve.js';
import { CARTAS_REDES } from '../../src/content/cards-social.js';
import { resultadoSparring, crearSparring } from '../../src/core/sparring.js';

// Bug reportado por el usuario: "hay algunas decisiones que dicen 'Don Pepe'
// sin importar cómo es el nombre de tu entrenador real". El entrenador
// asignado es uno de varios (ver ENTRENADORES en coaches.js), nunca "Don
// Pepe" — ese nombre era un personaje inventado, suelto, que ninguna partida
// real podía tener. El pedido textual fue "no hace falta que diga el nombre
// variable, [...] cambiarlo para que directamente no diga ningún nombre":
// nada de interpolar el nombre real, alcanza con no nombrar a nadie ("tu
// entrenador", "el entrenador"). Este test escanea TODO el texto narrativo
// de cartas (título, cuerpo y opciones) más los textos de resultado del
// sparring, buscando ese nombre suelto para que no pueda volver a colarse.
const NOMBRE_SUELTO = /Don Pepe/i;

function textosDeCarta(carta) {
  const textos = [carta.titulo ?? '', carta.texto ?? ''];
  for (const opcion of carta.opciones ?? []) {
    textos.push(opcion.texto ?? '');
    for (const rama of opcion.probabilidades ?? []) {
      textos.push(rama.texto ?? '');
    }
  }
  return textos;
}

describe('ningún texto de carta nombra a "Don Pepe" (bug reportado)', () => {
  const pools = {
    CARTAS_CAMPAMENTO, CARTAS_EVENTO, CARTAS_MEJORA, CARTAS_REDES,
  };

  for (const [nombrePool, cartas] of Object.entries(pools)) {
    it(`${nombrePool}: ninguna carta menciona "Don Pepe"`, () => {
      for (const carta of cartas) {
        for (const texto of textosDeCarta(carta)) {
          expect(texto, `carta "${carta.id}" de ${nombrePool}`).not.toMatch(NOMBRE_SUELTO);
        }
      }
    });
  }
});

describe('resultadoSparring no nombra a "Don Pepe"', () => {
  it('ningún nivel de resultado menciona "Don Pepe"', () => {
    // Fuerza el nivel "perfecto" (el único que antes nombraba al entrenador):
    // todo acierto, todo dentro del umbral de reacción "perfecto".
    const sparring = {
      ...crearSparring({ int: () => 0 }, { jugador: {}, objetivos: 4 }),
      aciertos: 4,
      objetivos: 4,
      tiempos: [100, 100, 100, 100],
    };
    const resultado = resultadoSparring(sparring, {});
    expect(resultado.texto).not.toMatch(NOMBRE_SUELTO);
  });
});
