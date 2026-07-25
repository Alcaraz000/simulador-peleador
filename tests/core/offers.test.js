import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador, mediaDe } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import {
  NIVELES, CINTURONES, generarOferta, evaluarRiesgo, rechazarOferta, aplicarResultado,
  proximoCinturon, puedeDisputar, cinturonActual,
} from '../../src/core/offers.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}
const mundo = () => crearMundo(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });

describe('niveles', () => {
  it('el titulo paga mas que lo local', () => {
    expect(NIVELES.titulo.multiplicadorBolsa).toBeGreaterThan(NIVELES.local.multiplicadorBolsa);
  });

  it('cada nivel mapea a un nivel de pelea valido', () => {
    for (const n of Object.values(NIVELES)) {
      expect(['amateur', 'profesional', 'titulo']).toContain(n.nivelPelea);
    }
  });
});

describe('generarOferta', () => {
  it('genera una oferta completa', () => {
    const oferta = generarOferta(createRng(2), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(oferta.rivalId).toBeTruthy();
    expect(oferta.rivalRecord).toMatch(/\d+-\d+/);
    expect(oferta.bolsa).toBeGreaterThan(0);
    expect(['bajo', 'medio', 'alto']).toContain(oferta.riesgo);
    expect(oferta.enJuego.length).toBeGreaterThan(0);
    expect(oferta.textoGancho.length).toBeGreaterThan(0);
  });

  it('en juvenil y amateur no ofrece titulos', () => {
    for (const etapa of ['juvenil', 'amateur']) {
      const oferta = generarOferta(createRng(3), { jugador: jugador(), mundo: mundo(), etapa });
      expect(oferta.esTitulo).toBe(false);
    }
  });

  it('paga mas en profesional que en amateur', () => {
    const am = generarOferta(createRng(4), { jugador: jugador(), mundo: mundo(), etapa: 'amateur' });
    const pro = generarOferta(createRng(4), { jugador: jugador({ fama: 40 }), mundo: mundo(), etapa: 'profesional' });
    expect(pro.bolsa).toBeGreaterThan(am.bolsa);
  });

  it('mas fama, mas bolsa', () => {
    const pobre = generarOferta(createRng(5), { jugador: jugador({ fama: 0 }), mundo: mundo(), etapa: 'profesional' });
    const famoso = generarOferta(createRng(5), { jugador: jugador({ fama: 90 }), mundo: mundo(), etapa: 'profesional' });
    expect(famoso.bolsa).toBeGreaterThan(pobre.bolsa);
  });

  it('con manager, la bolsa es mas gorda a igualdad de todo lo demas', () => {
    const sinManager = generarOferta(createRng(20), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    const conManager = generarOferta(createRng(20), { jugador: jugador({ staff: ['manager'] }), mundo: mundo(), etapa: 'profesional' });
    expect(conManager.bolsa).toBeGreaterThan(sinManager.bolsa);
  });

  it('puede forzar una pelea de titulo', () => {
    const oferta = generarOferta(createRng(6), {
      jugador: jugador(), mundo: mundo(), etapa: 'profesional', forzarTitulo: true,
    });
    expect(oferta.esTitulo).toBe(true);
    expect(oferta.nivelPelea).toBe('titulo');
  });

  it('marca revancha si ya se cruzaron', () => {
    const m = mundo();
    const rival = m.roster[3];
    const oferta = generarOferta(createRng(7), {
      jugador: jugador(), mundo: m, etapa: 'profesional',
      rivalidades: [{ rivalId: rival.id, heat: 80, h2h: { v: 0, d: 1, e: 0 }, esArchirrival: true, hitos: [] }],
    });
    if (oferta.rivalId === rival.id) expect(oferta.esRevancha).toBe(true);
  });

  it('devuelve null si no hay rivales disponibles', () => {
    const m = mundo();
    for (const p of m.roster) p.retirado = true;
    expect(generarOferta(createRng(8), { jugador: jugador(), mundo: m, etapa: 'profesional' })).toBeNull();
  });

  it('es determinista', () => {
    const a = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    const b = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    // `id` y `rivalId` no son comparables entre dos mundos creados por separado:
    // fighter.js arma los ids de los peleadores con Date.now() + un contador global,
    // no con el rng inyectado (mismo patrón ya asumido en roster.test.js/fighter.test.js).
    // Todo lo demás sí debe ser idéntico con la misma semilla.
    const { id: idA, rivalId: rivalIdA, ...restoA } = a;
    const { id: idB, rivalId: rivalIdB, ...restoB } = b;
    expect(restoA).toEqual(restoB);
  });
});

describe('cinturones', () => {
  it('define la progresion regional -> nacional -> mundial', () => {
    expect(CINTURONES.map((c) => c.id)).toEqual(['regional', 'nacional', 'mundial']);
  });

  it('cada escalon exige mejor ranking y paga mas', () => {
    for (let i = 1; i < CINTURONES.length; i++) {
      expect(CINTURONES[i].rankingMax).toBeLessThan(CINTURONES[i - 1].rankingMax);
      expect(CINTURONES[i].multiplicador).toBeGreaterThan(CINTURONES[i - 1].multiplicador);
    }
  });

  it('proximoCinturon devuelve el primero que falta', () => {
    expect(proximoCinturon(jugador()).id).toBe('regional');
    expect(proximoCinturon(jugador({ titulos: ['Cinturón regional'] })).id).toBe('nacional');
    expect(proximoCinturon(jugador({ titulos: CINTURONES.map((c) => c.nombre) }))).toBeNull();
  });

  it('puedeDisputar depende del ranking', () => {
    const regional = CINTURONES[0];
    expect(puedeDisputar(jugador({ ranking: 3 }), regional)).toBe(true);
    expect(puedeDisputar(jugador({ ranking: 20 }), regional)).toBe(false);
    expect(puedeDisputar(jugador({ ranking: 1 }), null)).toBe(false);
  });

  it('cinturonActual devuelve el mas alto que tiene puesto', () => {
    expect(cinturonActual(jugador())).toBeNull();
    expect(cinturonActual(jugador({ titulos: ['Cinturón regional', 'Cinturón nacional'] })).id).toBe('nacional');
  });

  it('un rankeado alto recibe oferta de titulo', () => {
    let conTitulo = 0;
    for (let s = 1; s <= 20; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 2, fama: 50 }), mundo: mundo(), etapa: 'profesional',
      });
      if (oferta.esTitulo) conTitulo++;
    }
    expect(conTitulo).toBeGreaterThan(10);
  });

  it('un campeon que todavia no califica para el siguiente cinturon recibe defensas obligatorias', () => {
    // ranking 6 con solo el regional puesto: nacional pide ranking <= 5, asi que
    // todavia no califica para escalar y le tiene que caer la defensa.
    let defensas = 0;
    for (let s = 1; s <= 30; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 6, titulos: ['Cinturón regional'] }), mundo: mundo(), etapa: 'profesional',
      });
      if (oferta.esObligatoria) defensas++;
    }
    expect(defensas).toBeGreaterThan(8);
  });

  it('una oferta de defensa lleva cuántas defensas exige ese cinturón', () => {
    let vista = false;
    for (let s = 1; s <= 30; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 6, titulos: ['Cinturón regional'] }), mundo: mundo(), etapa: 'profesional',
      });
      if (oferta.esObligatoria) {
        vista = true;
        expect(oferta.defensasObligatorias).toBe(CINTURONES.find((c) => c.id === 'regional').defensasObligatorias);
      }
    }
    expect(vista).toBe(true);
  });

  it('una oferta que no es defensa no lleva defensasObligatorias', () => {
    const oferta = generarOferta(createRng(2), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(oferta.defensasObligatorias).toBeNull();
  });

  it('un campeon que ya califica para el siguiente cinturon prioriza escalar por sobre defender', () => {
    // ranking 2 con solo el regional puesto: nacional pide ranking <= 5, asi que
    // ya califica. Escalar tiene que ganarle a estancarse defendiendo el chico.
    let ascensos = 0;
    let defensas = 0;
    for (let s = 1; s <= 40; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 2, titulos: ['Cinturón regional'] }), mundo: mundo(), etapa: 'profesional',
      });
      if (oferta.esTitulo && !oferta.esObligatoria) ascensos++;
      if (oferta.esObligatoria) defensas++;
    }
    expect(ascensos).toBeGreaterThan(defensas);
  });

  it('la pelea de titulo paga mucho mas que una comun', () => {
    const comun = generarOferta(createRng(3), { jugador: jugador({ ranking: 15 }), mundo: mundo(), etapa: 'profesional' });
    const titulo = generarOferta(createRng(3), { jugador: jugador({ ranking: 1 }), mundo: mundo(), etapa: 'profesional', forzarTitulo: true });
    expect(titulo.bolsa).toBeGreaterThan(comun.bolsa * 2);
  });

  it('la oferta de titulo nombra el cinturon en juego', () => {
    const oferta = generarOferta(createRng(4), { jugador: jugador({ ranking: 1 }), mundo: mundo(), etapa: 'profesional', forzarTitulo: true });
    expect(oferta.enJuego).toBe('Cinturón regional');
    expect(oferta.cinturonId).toBe('regional');
    expect(oferta.textoGancho.toLowerCase()).toContain('cinturón');
  });
});

describe('evaluarRiesgo', () => {
  it('un rival muy superior es riesgo alto', () => {
    const yo = jugador();
    const rival = crearPeleador({
      nombre: 'Bestia', apodo: 'La Bestia', nacionalidad: 'US', disciplina: 'boxeo',
      estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 90,
    });
    expect(mediaDe(rival)).toBeGreaterThan(mediaDe(yo));
    expect(evaluarRiesgo(yo, rival)).toBe('alto');
  });

  it('un rival muy inferior es riesgo bajo', () => {
    const yo = jugador();
    const rival = crearPeleador({
      nombre: 'Novato', apodo: 'El Novato', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 30,
    });
    expect(evaluarRiesgo(yo, rival)).toBe('bajo');
  });
});

describe('rechazarOferta', () => {
  it('cuesta fama y devuelve un texto', () => {
    const yo = jugador({ fama: 30 });
    const oferta = generarOferta(createRng(10), { jugador: yo, mundo: mundo(), etapa: 'profesional' });
    const paso = rechazarOferta(yo, oferta);
    expect(paso.jugador.fama).toBeLessThan(30);
    expect(paso.texto).toBeTruthy();
  });

  it('nunca deja la fama negativa', () => {
    const yo = jugador({ fama: 0 });
    const oferta = generarOferta(createRng(11), { jugador: yo, mundo: mundo(), etapa: 'profesional' });
    expect(rechazarOferta(yo, oferta).jugador.fama).toBe(0);
  });
});

describe('aplicarResultado', () => {
  const oferta = () => generarOferta(createRng(12), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });

  it('ganar suma victoria, bolsa y fama', () => {
    const yo = jugador({ fama: 10, dinero: 0 });
    const o = oferta();
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 3, texto: 'KO' },
    });
    expect(paso.jugador.record.v).toBe(1);
    expect(paso.jugador.record.ko).toBe(1);
    expect(paso.jugador.dinero).toBe(o.bolsa);
    expect(paso.jugador.fama).toBeGreaterThan(10);
  });

  it('perder suma derrota pero igual paga la bolsa', () => {
    const yo = jugador({ dinero: 0 });
    const o = oferta();
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'decision', round: 8, texto: 'Perdiste' },
    });
    expect(paso.jugador.record.d).toBe(1);
    expect(paso.jugador.dinero).toBe(o.bolsa);
  });

  it('empatar suma empate', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'empate', metodo: 'decision', round: 8, texto: 'Empate' },
    });
    expect(paso.jugador.record.e).toBe(1);
  });

  it('ganar un titulo lo suma y arranca las defensas', () => {
    const o = { ...oferta(), esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(jugador(), {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 5, texto: 'KO' },
    });
    expect(paso.titulosGanados).toContain('Título regional');
    expect(paso.jugador.titulos).toContain('Título regional');
  });

  it('defender un titulo suma una defensa', () => {
    const yo = jugador({ titulos: ['Título regional'], defensas: 0 });
    const o = { ...oferta(), esObligatoria: true, esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'decision', round: 12, texto: 'Ganó' },
    });
    expect(paso.jugador.defensas).toBe(1);
  });

  it('ganar un titulo resetea el contador de defensas de ese cinturon', () => {
    const o = {
      ...oferta(), esTitulo: true, esObligatoria: false, enJuego: 'Cinturón nacional', cinturonId: 'nacional',
    };
    const yo = jugador({ defensasCinturon: { regional: 3, nacional: 5 } });
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 5, texto: 'KO' },
    });
    expect(paso.jugador.defensasCinturon.nacional).toBe(0);
    expect(paso.jugador.defensasCinturon.regional).toBe(3);
  });

  it('defender suma la defensa solo al cinturon en juego, no a los demas', () => {
    const yo = jugador({
      titulos: ['Cinturón regional'], defensasCinturon: { regional: 1 },
    });
    const o = {
      ...oferta(), esObligatoria: true, esTitulo: true, enJuego: 'Cinturón regional', cinturonId: 'regional',
    };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'decision', round: 12, texto: 'Ganó' },
    });
    expect(paso.jugador.defensasCinturon.regional).toBe(2);
    expect(paso.jugador.defensas).toBe(1);
  });

  it('con psicologo, la derrota golpea menos la moral', () => {
    const sinPsicologo = aplicarResultado(jugador({ estado: { forma: 60, fatiga: 10, moral: 60, lesion: null } }), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'ko', round: 3, texto: 'Perdió' },
    });
    const conPsicologo = aplicarResultado(
      jugador({ staff: ['psicologo'], estado: { forma: 60, fatiga: 10, moral: 60, lesion: null } }),
      {
        oferta: oferta(), mundo: mundo(),
        resultado: { ganador: 'rival', metodo: 'ko', round: 3, texto: 'Perdió' },
      },
    );
    const caidaSinPsicologo = 60 - sinPsicologo.jugador.estado.moral;
    const caidaConPsicologo = 60 - conPsicologo.jugador.estado.moral;
    expect(caidaConPsicologo).toBeLessThan(caidaSinPsicologo);
    expect(caidaConPsicologo).toBeGreaterThan(0);
  });

  it('perder el titulo lo saca de la lista', () => {
    const yo = jugador({ titulos: ['Título regional'] });
    const o = { ...oferta(), esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'ko', round: 4, texto: 'Perdió' },
    });
    expect(paso.jugador.titulos).not.toContain('Título regional');
  });

  it('guarda la pelea en el historial', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(paso.jugador.historial).toHaveLength(1);
    expect(paso.jugador.historial[0].metodo).toBe('ko');
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    aplicarResultado(yo, {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(JSON.stringify(yo)).toBe(antes);
  });
});
