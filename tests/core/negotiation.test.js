import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  MOVIDAS, LIMITE_APRIETES, crearNegociacion, jugarMovida, resultadoNegociacion,
} from '../../src/core/negotiation.js';

const oferta = { id: 'of_1', bolsa: 8000, enJuego: 'Título regional' };

describe('movidas', () => {
  it('define las cuatro movidas', () => {
    expect(Object.keys(MOVIDAS).sort()).toEqual(['apretar', 'cerrar', 'masPlata', 'taquilla']);
  });

  it('cerrar no tiene riesgo y apretar es la mas riesgosa', () => {
    expect(MOVIDAS.cerrar.riesgoBase).toBe(0);
    expect(MOVIDAS.apretar.riesgoBase).toBeGreaterThan(MOVIDAS.masPlata.riesgoBase);
  });
});

describe('crearNegociacion', () => {
  it('arranca con la bolsa de la oferta, paciencia llena y sin intentos usados', () => {
    const n = crearNegociacion(oferta);
    expect(n.bolsa).toBe(8000);
    expect(n.bolsaInicial).toBe(8000);
    expect(n.paciencia).toBe(100);
    expect(n.intentosApriete).toBe(0);
    expect(n.cerrada).toBe(false);
    expect(n.bloqueada).toBe(false);
    expect(n.ultimoEvento).toBeNull();
  });

  it('el super manager baja el riesgo', () => {
    expect(crearNegociacion(oferta, { tieneManager: true }).reduccionRiesgo).toBeGreaterThan(0);
    expect(crearNegociacion(oferta, { tieneManager: false }).reduccionRiesgo).toBe(0);
  });
});

describe('jugarMovida — cerrar', () => {
  it('cerrar termina la negociacion sin riesgo', () => {
    const { negociacion, evento } = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(1));
    expect(negociacion.cerrada).toBe(true);
    expect(negociacion.bloqueada).toBe(false);
    expect(evento.tipo).toBe('cierra');
    expect(negociacion.ultimoEvento).toEqual(evento);
  });

  it('cerrar sigue disponible aunque la negociacion este bloqueada', () => {
    // Fuerza un fallo de apriete para bloquear, y comprueba que cerrar igual anda.
    let n = crearNegociacion(oferta);
    let bloqueada = false;
    for (let s = 1; s <= 60 && !bloqueada; s++) {
      const { negociacion } = jugarMovida(n, 'apretar', createRng(s));
      if (negociacion.bloqueada) { n = negociacion; bloqueada = true; }
    }
    expect(bloqueada).toBe(true);
    const { negociacion: cerrada } = jugarMovida(n, 'cerrar', createRng(99));
    expect(cerrada.cerrada).toBe(true);
  });

  it('no se puede seguir jugando una negociacion cerrada', () => {
    const cerrada = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(3)).negociacion;
    const { negociacion, evento } = jugarMovida(cerrada, 'apretar', createRng(4));
    expect(negociacion).toEqual(cerrada);
    expect(evento).toBeNull();
  });

  it('rechaza una movida desconocida', () => {
    expect(() => jugarMovida(crearNegociacion(oferta), 'inventada', createRng(5))).toThrow(/inventada/);
  });

  it('no muta la negociacion original', () => {
    const n = crearNegociacion(oferta);
    const antes = JSON.stringify(n);
    jugarMovida(n, 'masPlata', createRng(6));
    expect(JSON.stringify(n)).toBe(antes);
  });
});

describe('jugarMovida — presionar (masPlata / taquilla / apretar)', () => {
  it('pedir mas plata a veces sube la bolsa', () => {
    let subio = false;
    for (let s = 1; s <= 30 && !subio; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(s));
      if (negociacion.bolsa > 8000) subio = true;
    }
    expect(subio).toBe(true);
  });

  it('cada movida arriesgada baja la paciencia y suma un intento', () => {
    const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(2));
    expect(negociacion.paciencia).toBeLessThan(100);
    expect(negociacion.intentosApriete).toBe(1);
  });

  it('cada movida arriesgada deja un evento describiendo que paso', () => {
    const { negociacion, evento } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(2));
    expect(evento).not.toBeNull();
    expect(evento.texto.length).toBeGreaterThan(0);
    expect(negociacion.ultimoEvento.texto).toBe(evento.texto);
  });

  it('taquilla agrega una condicion cuando el promotor acepta', () => {
    let conCondicion = false;
    for (let s = 1; s <= 40 && !conCondicion; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'taquilla', createRng(s));
      if (negociacion.condiciones.includes(MOVIDAS.taquilla.mejora.condicion)) conCondicion = true;
    }
    expect(conCondicion).toBe(true);
  });

  it('el manager reduce la chance de que un apriete salga mal', () => {
    const contar = (tieneManager) => {
      let n = 0;
      for (let s = 1; s <= 60; s++) {
        const { negociacion } = jugarMovida(crearNegociacion(oferta, { tieneManager }), 'apretar', createRng(s));
        if (negociacion.bloqueada) n++;
      }
      return n;
    };
    expect(contar(true)).toBeLessThan(contar(false));
  });
});

describe('maximo de aprietes', () => {
  it('LIMITE_APRIETES es 3', () => {
    expect(LIMITE_APRIETES).toBe(3);
  });

  it('despues de 3 intentos ya no se puede seguir presionando', () => {
    let n = crearNegociacion(oferta, { tieneManager: true }); // manager: baja el riesgo de bloquearse antes de tiempo
    let semilla = 1;
    for (let i = 0; i < LIMITE_APRIETES; i++) {
      const paso = jugarMovida(n, 'masPlata', createRng(semilla));
      n = paso.negociacion;
      semilla += 1;
      if (n.bloqueada) break; // un fallo tambien corta antes de llegar a 3
    }
    expect(n.intentosApriete).toBeLessThanOrEqual(LIMITE_APRIETES);
    expect(n.bloqueada).toBe(true);

    // Un cuarto intento de presionar no hace nada: ni suma intento ni cambia la bolsa.
    const bolsaAntes = n.bolsa;
    const { negociacion: sinCambios, evento } = jugarMovida(n, 'masPlata', createRng(semilla));
    expect(sinCambios.bolsa).toBe(bolsaAntes);
    expect(sinCambios.intentosApriete).toBe(n.intentosApriete);
    expect(evento).toBeNull();
  });

  it('llegar a los 3 intentos sin ningun fallo tambien bloquea las opciones de presionar', () => {
    // Busca una racha de 3 aprietes exitosos seguidos (con manager, riesgo
    // mas bajo): agotar los 3 intentos SIN haber fallado ninguno igual
    // tiene que bloquear — el tope es "3 como maximo", no "hasta que falle".
    let logrado = false;
    for (let base = 1; base <= 300 && !logrado; base++) {
      let n = crearNegociacion(oferta, { tieneManager: true });
      let sinFallos = true;
      for (let i = 0; i < LIMITE_APRIETES; i++) {
        const paso = jugarMovida(n, 'masPlata', createRng(base + i * 700));
        if (paso.evento?.tipo !== 'acepta') { sinFallos = false; break; }
        n = paso.negociacion;
      }
      if (sinFallos) {
        logrado = true;
        expect(n.intentosApriete).toBe(LIMITE_APRIETES);
        expect(n.bloqueada).toBe(true);
      }
    }
    expect(logrado).toBe(true);
  });
});

describe('un apriete que sale mal no cancela la pelea', () => {
  it('cuando un apriete falla, la negociacion queda bloqueada mas NO cerrada ni perdida por completo', () => {
    let negociacion = null;
    for (let s = 1; s <= 60 && !negociacion; s++) {
      const { negociacion: n } = jugarMovida(crearNegociacion(oferta), 'apretar', createRng(s));
      if (n.bloqueada) negociacion = n;
    }
    expect(negociacion).not.toBeNull();
    expect(negociacion.bloqueada).toBe(true);
    expect(negociacion.cerrada).toBe(false);
  });

  it('un apriete fallido empeora la bolsa que quedo sobre la mesa (pero sigue siendo positiva)', () => {
    let antes = null;
    let despues = null;
    for (let s = 1; s <= 60 && !despues; s++) {
      const previa = crearNegociacion(oferta);
      const { negociacion } = jugarMovida(previa, 'apretar', createRng(s));
      if (negociacion.bloqueada) { antes = previa.bolsa; despues = negociacion.bolsa; }
    }
    expect(despues).toBeLessThan(antes);
    expect(despues).toBeGreaterThan(0);
  });

  it('con la negociacion bloqueada, presionar de nuevo no hace nada (las opciones quedan sin efecto)', () => {
    let negociacion = null;
    for (let s = 1; s <= 60 && !negociacion; s++) {
      const { negociacion: n } = jugarMovida(crearNegociacion(oferta), 'apretar', createRng(s));
      if (n.bloqueada) negociacion = n;
    }
    const bolsaAntes = negociacion.bolsa;
    for (const movidaId of ['masPlata', 'taquilla', 'apretar']) {
      const { negociacion: sinCambios, evento } = jugarMovida(negociacion, movidaId, createRng(999));
      expect(sinCambios).toEqual(negociacion);
      expect(sinCambios.bolsa).toBe(bolsaAntes);
      expect(evento).toBeNull();
    }
  });
});

describe('resultadoNegociacion', () => {
  it('devuelve la bolsa y las condiciones tal cual quedaron en la negociacion', () => {
    const n = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(7)).negociacion;
    const r = resultadoNegociacion(n);
    expect(r.bolsa).toBe(n.bolsa);
    expect(r.condiciones).toEqual(n.condiciones);
  });

  it('si la negociacion quedo bloqueada por un fallo, igual se puede cerrar con lo que quedo', () => {
    let n = crearNegociacion(oferta);
    let bolsaJustoAntesDelFallo = n.bolsa;
    for (let s = 1; s <= 60 && !n.bloqueada; s++) {
      bolsaJustoAntesDelFallo = n.bolsa;
      n = jugarMovida(n, 'apretar', createRng(s)).negociacion;
    }
    expect(n.bloqueada).toBe(true);
    // El fallo degrada lo que HABÍA sobre la mesa en ese momento, no
    // necesariamente por debajo de la oferta original (pudo haber crecido
    // antes de fallar).
    expect(n.bolsa).toBeLessThan(bolsaJustoAntesDelFallo);
    const cerrada = jugarMovida(n, 'cerrar', createRng(1)).negociacion;
    const r = resultadoNegociacion(cerrada);
    expect(r.bolsa).toBe(n.bolsa);
  });
});
