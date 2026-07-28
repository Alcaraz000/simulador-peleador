import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador, mediaDe } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import {
  NIVELES, CINTURONES, generarOferta, evaluarRiesgo, rechazarOferta, aplicarResultado,
  proximoCinturon, puedeDisputar, cinturonActual, opinionEntrenador, fraseEntrenador,
  esPeleaImportante, PELEAS_MINIMAS_TITULO,
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

// v7 ("un debutante NO puede pelear por el título con 0 peleas"): la mayoría
// de los tests de esta suite construyen un jugador de ranking altísimo a
// mano, sin haber jugado una carrera real — así que, salvo que el propio
// test esté probando el mínimo de peleas, hace falta darles un récord que ya
// cumpla el mínimo del cinturón bajo prueba (ver PELEAS_MINIMAS_TITULO,
// offers.js) para seguir aislando lo que cada test dice probar (ranking,
// bolsa, etc.), no una interacción nueva con el gate de peleas.
function conPeleas(v) {
  return {
    v, d: 0, e: 0, ko: 0, sub: 0, dec: 0,
  };
}

describe('niveles', () => {
  it('el titulo paga mas que lo local', () => {
    expect(NIVELES.titulo.multiplicadorBolsa).toBeGreaterThan(NIVELES.local.multiplicadorBolsa);
  });

  it('cada nivel mapea a un nivel de pelea valido', () => {
    for (const n of Object.values(NIVELES)) {
      expect(['amateur', 'profesional', 'eliminatoria', 'titulo']).toContain(n.nivelPelea);
    }
  });

  // Barrida de experto en boxeo (Pedido 4, v6): una eliminatoria define quién
  // pasa a disputar el título — en el boxeo real, un final eliminator de un
  // organismo importante casi siempre se pelea a distancia de campeonato (12
  // rounds), no a la distancia genérica de una cartelera regional cualquiera
  // (8). Antes `NIVELES.eliminatoria.nivelPelea` era 'profesional' a secas,
  // así que compartía los mismos 8 rounds que un combate de trámite —
  // desentonaba con que ya se trata como una pelea IMPORTANTE en todo lo
  // demás (careo, campamento, bolsa 1.8x).
  it('la eliminatoria tiene su propio nivel de pelea, distinto del regional de tramite', () => {
    expect(NIVELES.eliminatoria.nivelPelea).not.toBe('profesional');
    expect(NIVELES.eliminatoria.nivelPelea).not.toBe(NIVELES.regional.nivelPelea);
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

  // v13: la bolsa ya no escala con fama (eliminada) sino con los cinturones
  // puestos (jugador.titulos.length). Los títulos de acá abajo no coinciden
  // con ningún nombre real de CINTURONES a propósito: así no disparan
  // cinturonActual/proximoCinturon (que sí cambiarían el nivel de la
  // oferta) y el test queda aislado en lo que de verdad quiere probar.
  it('mas cinturones puestos, mas bolsa', () => {
    const sinTitulos = generarOferta(createRng(5), { jugador: jugador({ titulos: [] }), mundo: mundo(), etapa: 'profesional' });
    const campeon = generarOferta(createRng(5), {
      jugador: jugador({ titulos: ['Título honorífico', 'Cinturón de exhibición'] }),
      mundo: mundo(),
      etapa: 'profesional',
    });
    expect(campeon.bolsa).toBeGreaterThan(sinTitulos.bolsa);
  });

  it('con manager, la bolsa es mas gorda a igualdad de todo lo demas', () => {
    const sinManager = generarOferta(createRng(20), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    const conManager = generarOferta(createRng(20), { jugador: jugador({ staff: ['manager'] }), mundo: mundo(), etapa: 'profesional' });
    expect(conManager.bolsa).toBeGreaterThan(sinManager.bolsa);
  });

  it('puede forzar una pelea de titulo', () => {
    const oferta = generarOferta(createRng(6), {
      jugador: jugador({ record: conPeleas(PELEAS_MINIMAS_TITULO.regional) }),
      mundo: mundo(),
      etapa: 'profesional',
      forzarTitulo: true,
    });
    expect(oferta.esTitulo).toBe(true);
    expect(oferta.nivelPelea).toBe('titulo');
  });

  // v7: forzarTitulo se salta la CHANCE probabilística, nunca el mínimo de
  // peleas — un debutante (0 peleas profesionales) no puede saltar la fila
  // por más que su ranking ya alcance para el cinturón.
  it('forzarTitulo no le sirve a un debutante con 0 peleas profesionales', () => {
    const oferta = generarOferta(createRng(6), {
      jugador: jugador({ record: conPeleas(0) }), mundo: mundo(), etapa: 'profesional', forzarTitulo: true,
    });
    expect(oferta.esTitulo).toBe(false);
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

  // Pedido 3 (v6, "nada de revancha inmediata después de una pelea. Que pase
  // tiempo"): el rival de la última pelea del historial no puede ser la
  // MISMA oferta que le sigue — tiene que pasar por, al menos, otra pelea
  // antes de que ese mismo rival vuelva a estar disponible.
  describe('cooldown: no revancha inmediata', () => {
    it('nunca ofrece de nuevo al rival de la última pelea del historial', () => {
      const m = mundo();
      const ultimoRival = m.roster[3];
      const yo = jugador({
        historial: [{
          rivalId: ultimoRival.id, rivalNombre: ultimoRival.nombre, rivalApodo: ultimoRival.apodo, resultado: 'v',
        }],
      });
      for (let s = 1; s <= 100; s += 1) {
        const oferta = generarOferta(createRng(s), { jugador: yo, mundo: m, etapa: 'profesional' });
        if (oferta) expect(oferta.rivalId).not.toBe(ultimoRival.id);
      }
    });

    it('sin historial (primera pelea de la carrera), no excluye a nadie por este motivo', () => {
      const m = mundo();
      const yo = jugador({ historial: [] });
      let vioAlgunRival = false;
      for (let s = 1; s <= 30; s += 1) {
        const oferta = generarOferta(createRng(s), { jugador: yo, mundo: m, etapa: 'profesional' });
        if (oferta) vioAlgunRival = true;
      }
      expect(vioAlgunRival).toBe(true);
    });

    it('el archirrival tampoco puede colarse si es el rival de la última pelea', () => {
      const m = mundo();
      const rival = m.roster[3];
      const yo = jugador({
        historial: [{ rivalId: rival.id, rivalNombre: rival.nombre, rivalApodo: rival.apodo, resultado: 'v' }],
      });
      for (let s = 1; s <= 100; s += 1) {
        const oferta = generarOferta(createRng(s), {
          jugador: yo,
          mundo: m,
          etapa: 'profesional',
          rivalidades: [{
            rivalId: rival.id, heat: 100, h2h: { v: 1, d: 0, e: 0 }, esArchirrival: true, hitos: [],
          }],
        });
        if (oferta) expect(oferta.rivalId).not.toBe(rival.id);
      }
    });
  });

  // Pedido 1 (v6, roster de 100): con el pool de apodos (16) muy por debajo
  // de 100 rivales, la mayoría de los rivales de relleno quedan sin apodo
  // (null) — antes esto no podía pasar en producción (todo NPC generado
  // tenía uno garantizado). Sobre muchas semillas, ningún texto de la oferta
  // debería mostrar el string "null" ni quedar vacío donde iría el rival.
  it('nunca muestra "null" en los textos, tenga o no apodo el rival', () => {
    let vioSinApodo = false;
    for (let s = 1; s <= 60; s += 1) {
      const oferta = generarOferta(createRng(s), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
      if (!oferta) continue;
      if (!oferta.rivalApodo) vioSinApodo = true;
      expect(oferta.textoGancho).not.toContain('null');
      expect(oferta.fraseEntrenador).not.toContain('null');
      expect(oferta.textoGancho.length).toBeGreaterThan(0);
      expect(oferta.fraseEntrenador.length).toBeGreaterThan(0);
    }
    // Confirma que el caso "sin apodo" de verdad se ejerció en esta muestra
    // (si no, el test de arriba no estaría probando nada nuevo).
    expect(vioSinApodo).toBe(true);
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

describe('generarOferta — soloRegional y excluirIdsExtra (v6, peleas de trámite)', () => {
  it('soloRegional nunca ofrece titulo/defensa/eliminatoria aunque el ranking calificaria', () => {
    for (let s = 1; s <= 40; s += 1) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 1, titulos: ['Cinturón regional'] }),
        mundo: mundo(),
        etapa: 'profesional',
        forzarTitulo: true,
        soloRegional: true,
      });
      expect(oferta.esTitulo).toBe(false);
      expect(oferta.esObligatoria).toBe(false);
      expect(oferta.nivel).toBe('regional');
    }
  });

  it('excluirIdsExtra saca a ese rival de la seleccion, ademas del ultimo peleado', () => {
    const m = mundo();
    const aExcluir = m.roster[2];
    for (let s = 1; s <= 60; s += 1) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador(), mundo: m, etapa: 'profesional', excluirIdsExtra: [aExcluir.id],
      });
      if (oferta) expect(oferta.rivalId).not.toBe(aExcluir.id);
    }
  });
});

describe('esPeleaImportante (v6, criterio de "que pelea se juega completa")', () => {
  function ofertaBase(extra = {}) {
    return {
      esTitulo: false, esRevancha: false, esArchirrival: false, nivel: 'regional', riesgo: 'medio', ...extra,
    };
  }

  it('una pelea de titulo importa', () => {
    expect(esPeleaImportante(ofertaBase({ esTitulo: true }))).toBe(true);
  });

  it('una revancha importa', () => {
    expect(esPeleaImportante(ofertaBase({ esRevancha: true }))).toBe(true);
  });

  it('el archirrival importa aunque no haya cinturon en juego', () => {
    expect(esPeleaImportante(ofertaBase({ esArchirrival: true }))).toBe(true);
  });

  it('una eliminatoria importa (define el ascenso)', () => {
    expect(esPeleaImportante(ofertaBase({ nivel: 'eliminatoria' }))).toBe(true);
  });

  // "riesgo alto" se descartó como criterio (ver el comentario grande en
  // offers.js): el matchmaking normal ya sesga hacia rivales mejores, así
  // que casi cualquier pelea temprana calificaba como "riesgo alto" —
  // reventaba el presupuesto de ~20 minutos sin sumarle nada al eje de
  // cinturones. Una regional de riesgo alto sigue siendo trámite.
  it('una regional pareja, comoda, o de riesgo alto (sin titulo/revancha/archirrival/eliminatoria) es tramite', () => {
    expect(esPeleaImportante(ofertaBase())).toBe(false);
    expect(esPeleaImportante(ofertaBase({ riesgo: 'bajo' }))).toBe(false);
    expect(esPeleaImportante(ofertaBase({ riesgo: 'alto' }))).toBe(false);
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

  it('puedeDisputar depende del ranking (con el minimo de peleas ya cumplido)', () => {
    const regional = CINTURONES[0];
    const conMinimo = { record: conPeleas(PELEAS_MINIMAS_TITULO.regional) };
    expect(puedeDisputar(jugador({ ranking: 3, ...conMinimo }), regional)).toBe(true);
    // Pedido 1 (v6, roster de 100): regional.rankingMax pasó de 8 a 20.
    expect(puedeDisputar(jugador({ ranking: 45, ...conMinimo }), regional)).toBe(false);
    expect(puedeDisputar(jugador({ ranking: 1, ...conMinimo }), null)).toBe(false);
  });

  // v7 ("un debutante NO puede pelear por el título con 0 peleas"): el
  // ranking solo no alcanza — hace falta el mínimo de peleas profesionales
  // de PELEAS_MINIMAS_TITULO, escalonado por cinturón.
  describe('puedeDisputar exige un minimo de peleas profesionales', () => {
    it('con ranking de sobra pero 0 peleas, no puede disputar ningun cinturon', () => {
      const debutante = jugador({ ranking: 1, record: conPeleas(0) });
      for (const cinturon of CINTURONES) {
        expect(puedeDisputar(debutante, cinturon)).toBe(false);
      }
    });

    it('justo por debajo del minimo, todavia no puede', () => {
      const regional = CINTURONES[0];
      const casiListo = jugador({ ranking: 1, record: conPeleas(PELEAS_MINIMAS_TITULO.regional - 1) });
      expect(puedeDisputar(casiListo, regional)).toBe(false);
    });

    it('en cuanto llega al minimo, puede (si el ranking tambien alcanza)', () => {
      const regional = CINTURONES[0];
      const listo = jugador({ ranking: 1, record: conPeleas(PELEAS_MINIMAS_TITULO.regional) });
      expect(puedeDisputar(listo, regional)).toBe(true);
    });

    it('el minimo esta escalonado: regional < nacional < mundial', () => {
      expect(PELEAS_MINIMAS_TITULO.regional).toBeLessThan(PELEAS_MINIMAS_TITULO.nacional);
      expect(PELEAS_MINIMAS_TITULO.nacional).toBeLessThan(PELEAS_MINIMAS_TITULO.mundial);
    });

    it('el mundial exige mas peleas que las que ya alcanzan para el regional', () => {
      const regional = CINTURONES[0];
      const mundial = CINTURONES[2];
      const conMinimoRegional = jugador({ ranking: 1, record: conPeleas(PELEAS_MINIMAS_TITULO.regional) });
      expect(puedeDisputar(conMinimoRegional, regional)).toBe(true);
      expect(puedeDisputar(conMinimoRegional, mundial)).toBe(false);
    });
  });

  it('cinturonActual devuelve el mas alto que tiene puesto', () => {
    expect(cinturonActual(jugador())).toBeNull();
    expect(cinturonActual(jugador({ titulos: ['Cinturón regional', 'Cinturón nacional'] })).id).toBe('nacional');
  });

  it('un rankeado alto recibe oferta de titulo', () => {
    let conTitulo = 0;
    for (let s = 1; s <= 20; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 2, fama: 50, record: conPeleas(PELEAS_MINIMAS_TITULO.regional) }),
        mundo: mundo(),
        etapa: 'profesional',
      });
      if (oferta.esTitulo) conTitulo++;
    }
    expect(conTitulo).toBeGreaterThan(10);
  });

  it('un campeon que todavia no califica para el siguiente cinturon recibe defensas obligatorias', () => {
    // ranking 25 con solo el regional puesto: nacional pide ranking <= 15
    // (Pedido 1, v6: antes 5, después 10, ver el comentario de CINTURONES en
    // offers.js), asi que todavia no califica para escalar y le tiene que
    // caer la defensa.
    let defensas = 0;
    for (let s = 1; s <= 30; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 25, titulos: ['Cinturón regional'] }), mundo: mundo(), etapa: 'profesional',
      });
      if (oferta.esObligatoria) defensas++;
    }
    expect(defensas).toBeGreaterThan(8);
  });

  it('una oferta de defensa lleva cuántas defensas exige ese cinturón', () => {
    let vista = false;
    for (let s = 1; s <= 30; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({ ranking: 25, titulos: ['Cinturón regional'] }), mundo: mundo(), etapa: 'profesional',
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
    // ranking 2 con solo el regional puesto: nacional pide ranking <= 10
    // (Pedido 1, v6: antes 5), asi que ya califica. Escalar tiene que
    // ganarle a estancarse defendiendo el chico. Record con el minimo de
    // peleas del NACIONAL (v7): ya defendió el regional un buen tiempo, así
    // que el mínimo de peleas nunca es lo que decide acá — es el ranking.
    let ascensos = 0;
    let defensas = 0;
    for (let s = 1; s <= 40; s++) {
      const oferta = generarOferta(createRng(s), {
        jugador: jugador({
          ranking: 2, titulos: ['Cinturón regional'], record: conPeleas(PELEAS_MINIMAS_TITULO.nacional),
        }),
        mundo: mundo(),
        etapa: 'profesional',
      });
      if (oferta.esTitulo && !oferta.esObligatoria) ascensos++;
      if (oferta.esObligatoria) defensas++;
    }
    expect(ascensos).toBeGreaterThan(defensas);
  });

  it('la pelea de titulo paga mucho mas que una comun', () => {
    // ranking 45: por debajo de cualquier rankingMax de CINTURONES (Pedido 1,
    // v6: el mayor, regional, pide <= 20), asi que esta oferta no puede ser
    // de titulo aunque no se fuerce.
    const comun = generarOferta(createRng(3), { jugador: jugador({ ranking: 45 }), mundo: mundo(), etapa: 'profesional' });
    const titulo = generarOferta(createRng(3), {
      jugador: jugador({ ranking: 1, record: conPeleas(PELEAS_MINIMAS_TITULO.regional) }),
      mundo: mundo(),
      etapa: 'profesional',
      forzarTitulo: true,
    });
    expect(titulo.bolsa).toBeGreaterThan(comun.bolsa * 2);
  });

  it('la oferta de titulo nombra el cinturon en juego', () => {
    const oferta = generarOferta(createRng(4), {
      jugador: jugador({ ranking: 1, record: conPeleas(PELEAS_MINIMAS_TITULO.regional) }),
      mundo: mundo(),
      etapa: 'profesional',
      forzarTitulo: true,
    });
    expect(oferta.enJuego).toBe('Cinturón regional');
    expect(oferta.cinturonId).toBe('regional');
    expect(oferta.textoGancho.toLowerCase()).toContain('cinturón');
  });
});

describe('generarOferta — ranking del rival y opinion del entrenador', () => {
  it('trae el puesto en el ranking del rival', () => {
    const oferta = generarOferta(createRng(2), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(typeof oferta.rivalRanking).toBe('number');
    expect(oferta.rivalRanking).toBeGreaterThan(0);
  });

  it('trae una frase del entrenador no vacia', () => {
    const oferta = generarOferta(createRng(2), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(oferta.fraseEntrenador.length).toBeGreaterThan(0);
    expect(oferta.opinionEntrenador.length).toBeGreaterThan(0);
  });

  it('la frase del entrenador es determinista para la misma oferta', () => {
    const a = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    const b = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(a.fraseEntrenador).toBe(b.fraseEntrenador);
  });
});

describe('opinionEntrenador', () => {
  const base = () => jugador({ estado: { forma: 60, fatiga: 10, moral: 60, lesion: null } });

  it('un rival mucho mas flojo da la categoria mas confiada', () => {
    const oferta = { rivalMedia: mediaDe(base()) - 30, esTitulo: false };
    expect(opinionEntrenador(base(), oferta)).toBe('muy_confiado');
  });

  it('un rival mucho mejor da la categoria menos recomendada', () => {
    const oferta = { rivalMedia: mediaDe(base()) + 40, esTitulo: false };
    expect(opinionEntrenador(base(), oferta)).toBe('no_recomendado');
  });

  it('medias parecidas dan una categoria pareja', () => {
    const oferta = { rivalMedia: mediaDe(base()), esTitulo: false };
    expect(opinionEntrenador(base(), oferta)).toBe('parejo');
  });

  it('mala forma, fatiga o lesion empeoran la opinion a igual matchup', () => {
    const oferta = { rivalMedia: mediaDe(base()) + 3, esTitulo: false };
    const sano = opinionEntrenador(base(), oferta);
    const lesionado = jugador({ estado: { forma: 60, fatiga: 10, moral: 60, lesion: { nombre: 'algo' } } });
    const golpeado = opinionEntrenador(lesionado, oferta);
    const orden = ['muy_confiado', 'confiado', 'parejo', 'cauteloso', 'desafio', 'no_recomendado'];
    expect(orden.indexOf(golpeado)).toBeGreaterThan(orden.indexOf(sano));
  });

  it('es pura: no muta jugador ni oferta', () => {
    const yo = base();
    const oferta = { rivalMedia: mediaDe(yo) + 3, esTitulo: false };
    const antesYo = JSON.stringify(yo);
    const antesOferta = JSON.stringify(oferta);
    opinionEntrenador(yo, oferta);
    expect(JSON.stringify(yo)).toBe(antesYo);
    expect(JSON.stringify(oferta)).toBe(antesOferta);
  });
});

describe('fraseEntrenador', () => {
  // Con el roster de 100 (Pedido 1), la mayoría de los rivales de relleno no
  // tienen apodo (null) — la frase tiene que caer al nombre en ese caso, no
  // mostrar "null" ni quedarse sin mencionar al rival.
  it('menciona al rival (por apodo si tiene, si no por nombre)', () => {
    const oferta = generarOferta(createRng(4), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(oferta.fraseEntrenador).toContain(oferta.rivalApodo ?? oferta.rivalNombre);
    expect(oferta.fraseEntrenador).not.toContain('null');
  });

  it('en una pelea de titulo puede nombrar lo que esta en juego', () => {
    const oferta = generarOferta(createRng(6), {
      jugador: jugador({ record: conPeleas(PELEAS_MINIMAS_TITULO.regional) }),
      mundo: mundo(),
      etapa: 'profesional',
      forzarTitulo: true,
    });
    expect(oferta.esTitulo).toBe(true);
    expect(oferta.fraseEntrenador.length).toBeGreaterThan(0);
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
  // v13: rechazar ya no cuesta fama (eliminada) — el costo real (una pelea
  // menos en el récord/ranking, o el cinturón en juego si era obligatoria)
  // ya lo maneja quien llama, no un número acá. Lo único que queda por
  // verificar de esta función es que sigue devolviendo su texto.
  it('devuelve un texto', () => {
    const yo = jugador();
    const oferta = generarOferta(createRng(10), { jugador: yo, mundo: mundo(), etapa: 'profesional' });
    const paso = rechazarOferta(yo, oferta);
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

  it('ganar suma victoria y paga la bolsa', () => {
    const yo = jugador({ dinero: 0 });
    const o = oferta();
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 3, texto: 'KO' },
    });
    expect(paso.jugador.record.v).toBe(1);
    expect(paso.jugador.record.ko).toBe(1);
    expect(paso.jugador.dinero).toBe(o.bolsa);
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

  // v13: la moral dejó de existir como estado (ver el comentario de más
  // arriba en aplicarResultado, offers.js: "acá se movía la moral tras cada
  // pelea") y el amortiguador del psicólogo sobre esa caída se borró junto
  // con ella, sin reemplazo — no queda ninguna mecánica que este test pueda
  // seguir probando. Ver el informe de esta ronda: el ítem 'psicologo'
  // (money.js) quedó sin ningún efecto real en el código.
  it('perder el titulo lo saca de la lista', () => {
    const yo = jugador({ titulos: ['Título regional'] });
    const o = { ...oferta(), esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'ko', round: 4, texto: 'Perdió' },
    });
    expect(paso.jugador.titulos).not.toContain('Título regional');
  });

  // Pedido 1 (v7, "¿no debería perder el cinturón en esos casos?... debería
  // poder recuperarlo"): perder una defensa no cierra la puerta — el
  // cinturón perdido vuelve a ser el "próximo objetivo" (proximoCinturon),
  // así que decidirNivel puede volver a ofrecerlo como pelea de título más
  // adelante (ver el comentario grande de decidirNivel, más arriba en
  // offers.js). Y, al seguir siendo esTitulo, esa revancha por el cinturón
  // siempre es esPeleaImportante — nunca cae en el lote de trámite.
  it('perder una defensa deja el cinturón disponible como próximo objetivo, listo para recuperarlo', () => {
    const yo = jugador({ titulos: ['Cinturón regional'], record: conPeleas(8) });
    const o = {
      ...oferta(), esTitulo: true, esObligatoria: true, enJuego: 'Cinturón regional', cinturonId: 'regional',
    };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'ko', round: 4, texto: 'Perdió' },
    });
    expect(paso.jugador.titulos).toEqual([]);
    expect(cinturonActual(paso.jugador)).toBeNull();
    // Sigue calificando (mismo récord/ranking de antes de la defensa): el
    // próximo objetivo vuelve a ser el mismo cinturón que se le acaba de ir.
    expect(proximoCinturon(paso.jugador)).toEqual(CINTURONES[0]);

    const revancha = {
      ...oferta(), esTitulo: true, esObligatoria: false, enJuego: 'Cinturón regional', nivel: 'titulo',
    };
    expect(esPeleaImportante(revancha)).toBe(true);
  });

  it('guarda la pelea en el historial', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(paso.jugador.historial).toHaveLength(1);
    expect(paso.jugador.historial[0].metodo).toBe('ko');
  });

  // Task v3 ("fechas de cuándo se ganaron/defendieron títulos", pedido
  // textual del usuario): la fecha del hito hay que guardarla EN el momento
  // en que se resuelve la pelea, no reconstruirla después — para eso
  // `aplicarResultado` recibe `semanaGlobal` (el reloj de la partida,
  // calendario.js) y lo estampa en cada entrada del historial.
  it('guarda la semana global de la partida como fecha del hito', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(), semanaGlobal: 57,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(paso.jugador.historial[0].fecha).toBe(57);
  });

  it('sin semanaGlobal, la fecha queda null (no revienta)', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(paso.jugador.historial[0].fecha).toBeNull();
  });

  // Causa real de "frases repetidas" en legacy.js: una defensa exitosa
  // (nivel 'defensa') y una conquista de título (nivel 'titulo') comparten
  // `esTitulo: true` y `resultado: 'v'`, pero son hitos distintos. Sin
  // `esObligatoria` en el historial, legacy.js no podía distinguirlos y les
  // ponía la MISMA frase ("se quedó con el X") a ambos.
  it('guarda si el hito de titulo fue una defensa, no una conquista', () => {
    const o = { ...oferta(), esTitulo: true, esObligatoria: true, enJuego: 'Cinturón regional' };
    const paso = aplicarResultado(jugador({ titulos: ['Cinturón regional'] }), {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'decision', round: 12, texto: 'Ganó' },
    });
    expect(paso.jugador.historial[0].esObligatoria).toBe(true);
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

  // v6 ("las peleas amateur no cuentan ni en el ranking ni en el
  // historial"): una oferta de NIVELES.local (nivelPelea:'amateur', la que
  // genera decidirNivel en juvenil/amateur) tiene que sumar a los
  // acumuladores AMATEUR, nunca al récord/historial profesional.
  describe('peleas amateur (nivelPelea === "amateur")', () => {
    const ofertaAmateur = () => generarOferta(createRng(12), { jugador: jugador(), mundo: mundo(), etapa: 'amateur' });

    it('ganar suma al recordAmateur, no al record profesional', () => {
      const o = ofertaAmateur();
      expect(o.nivelPelea).toBe('amateur');
      const paso = aplicarResultado(jugador(), {
        oferta: o, resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
      });
      expect(paso.jugador.recordAmateur.v).toBe(1);
      expect(paso.jugador.record.v).toBe(0);
    });

    it('guarda la pelea en historialAmateur, no en historial', () => {
      const o = ofertaAmateur();
      const paso = aplicarResultado(jugador(), {
        oferta: o, resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
      });
      expect(paso.jugador.historialAmateur).toHaveLength(1);
      expect(paso.jugador.historial).toHaveLength(0);
    });

    it('perder suma derrota al recordAmateur', () => {
      const o = ofertaAmateur();
      const paso = aplicarResultado(jugador(), {
        oferta: o, resultado: { ganador: 'rival', metodo: 'decision', round: 3, texto: 'Perdió' },
      });
      expect(paso.jugador.recordAmateur.d).toBe(1);
      expect(paso.jugador.record.d).toBe(0);
    });
  });

  it('guarda modo "jugada" por defecto, y "tramite" si se pasa explicito', () => {
    const o = oferta();
    const jugada = aplicarResultado(jugador(), {
      oferta: o, resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(jugada.jugador.historial[0].modo).toBe('jugada');

    const tramite = aplicarResultado(jugador(), {
      oferta: o, resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' }, modo: 'tramite',
    });
    expect(tramite.jugador.historial[0].modo).toBe('tramite');
  });
});
