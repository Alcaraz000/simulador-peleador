import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import { CINTURONES, PELEAS_MINIMAS_TITULO } from '../../src/core/offers.js';
import {
  intentosDePelea, resumenLote, armarLotePeleas, permiteMarqueeEsteAnio,
  ACCIONES_MINIJUEGO, accionRivalDe, resolverRondaMinijuego, alMejorDeCuantos,
  resultadoDeMarcador, roundDeCierreMinijuego, rondasParaGanar,
} from '../../src/core/tramite.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

const mundo = () => crearMundo(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 40 });

describe('intentosDePelea (v6, frecuencia por edad)', () => {
  function promedioA(edad, n = 400) {
    const rng = createRng(1);
    let total = 0;
    for (let i = 0; i < n; i += 1) total += intentosDePelea(rng, jugador({ edad }));
    return total / n;
  }

  it('un peleador joven pelea mas seguido que uno mayor', () => {
    const joven = promedioA(21);
    const mayor = promedioA(38);
    expect(joven).toBeGreaterThan(mayor);
  });

  it('nunca da menos de un intento (siempre hay al menos una chance de pelea)', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i += 1) {
      expect(intentosDePelea(rng, jugador({ edad: 21 + (i % 20) }))).toBeGreaterThanOrEqual(1);
    }
  });

  it('con un cinturon puesto (mucho en juego), el promedio no baja', () => {
    const rng1 = createRng(5);
    const rng2 = createRng(5);
    let sinTitulo = 0;
    let conTitulo = 0;
    const n = 300;
    for (let i = 0; i < n; i += 1) {
      sinTitulo += intentosDePelea(rng1, jugador({ edad: 34, ranking: 30 }));
      conTitulo += intentosDePelea(rng2, jugador({ edad: 34, ranking: 2, titulos: ['Cinturón regional'] }));
    }
    expect(conTitulo / n).toBeGreaterThanOrEqual(sinTitulo / n);
  });
});

describe('resumenLote', () => {
  it('todas ganadas arma un resumen "perfecta" con el record y sin texto roto', () => {
    const resultados = [
      { resultado: 'v', metodo: 'ko' }, { resultado: 'v', metodo: 'decision' }, { resultado: 'v', metodo: 'ko' },
    ];
    const r = resumenLote(createRng(1), { resultados, tono: 'profesional' });
    expect(r.texto).toContain('3-0');
    expect(r.texto).not.toContain('null');
    expect(r.texto).not.toContain('undefined');
    expect(r.texto.length).toBeGreaterThan(10);
  });

  it('mezcla de resultados arma un resumen distinto del perfecto', () => {
    const resultados = [{ resultado: 'v', metodo: 'ko' }, { resultado: 'd', metodo: 'decision' }];
    const r = resumenLote(createRng(1), { resultados, tono: 'profesional' });
    expect(r.texto).toContain('1-1');
  });

  it('todas perdidas no menciona nocauts propios', () => {
    const resultados = [{ resultado: 'd', metodo: 'ko' }, { resultado: 'd', metodo: 'decision' }];
    const r = resumenLote(createRng(2), { resultados, tono: 'profesional' });
    expect(r.texto).toContain('0-2');
  });

  it('una sola pelea usa el texto singular', () => {
    const ganada = resumenLote(createRng(1), { resultados: [{ resultado: 'v', metodo: 'ko' }], tono: 'profesional' });
    const perdida = resumenLote(createRng(1), { resultados: [{ resultado: 'd', metodo: 'decision' }], tono: 'profesional' });
    expect(ganada.texto).not.toBe(perdida.texto);
  });

  it('tono veterano y amateur dan textos distintos al profesional para el mismo resultado', () => {
    const resultados = [{ resultado: 'v', metodo: 'ko' }, { resultado: 'v', metodo: 'ko' }];
    const pro = resumenLote(createRng(4), { resultados, tono: 'profesional' });
    const vet = resumenLote(createRng(4), { resultados, tono: 'veterano' });
    const ama = resumenLote(createRng(4), { resultados, tono: 'amateur' });
    expect(vet.texto).not.toBe(pro.texto);
    expect(ama.texto).not.toBe(pro.texto);
  });

  it('el tono "juvenil" cae al pool amateur (mismo circuito de formacion)', () => {
    const resultados = [{ resultado: 'v', metodo: 'decision' }];
    const juv = resumenLote(createRng(1), { resultados, tono: 'juvenil' });
    expect(juv.titulo).toBe('Circuito amateur');
  });
});

describe('armarLotePeleas', () => {
  it('con permiteJugable=false, nunca deja una oferta jugable afuera (todo se resuelve en el lote)', () => {
    const yo = jugador({ edad: 16 });
    for (let s = 1; s <= 60; s += 1) {
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo, mundo: mundo(), etapa: 'juvenil', intentos: 3, permiteJugable: false, tono: 'juvenil',
      });
      expect(lote.marqueeOferta).toBeNull();
    }
  });

  it('con permiteJugable=true y ranking alto, en algun momento el primer cupo se vuelve una oferta jugable', () => {
    // v7 ("un debutante NO puede pelear por el título con 0 peleas"): con
    // ranking top-6 pero SIN el mínimo de peleas para el próximo cinturón,
    // ni el título ni la eliminatoria (que exige lo mismo, ver decidirNivel
    // en offers.js) están disponibles — el récord de acá abajo ya cumple el
    // mínimo del regional para seguir probando lo que este test dice probar:
    // que un ranking alto SÍ vuelve jugable el primer cupo.
    let vioMarquee = false;
    for (let s = 1; s <= 60; s += 1) {
      const yo = jugador({ edad: 22, ranking: 1, fama: 50, record: { v: PELEAS_MINIMAS_TITULO.regional, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } });
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: true, tono: 'profesional',
      });
      if (lote.marqueeOferta) vioMarquee = true;
    }
    expect(vioMarquee).toBe(true);
  });

  // v7: cubre exactamente lo contrario — SIN el mínimo de peleas, ni
  // siquiera un ranking altísimo vuelve jugable el primer cupo (ni título ni
  // eliminatoria disponibles), así que un debutante de ranking top-1 sigue
  // siendo trámite de punta a punta.
  it('con ranking alto pero 0 peleas profesionales, el primer cupo NUNCA se vuelve jugable', () => {
    for (let s = 1; s <= 60; s += 1) {
      const yo = jugador({ edad: 22, ranking: 1, fama: 50, record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } });
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: true, tono: 'profesional',
      });
      expect(lote.marqueeOferta).toBeNull();
    }
  });

  it('cada resultado de tramite queda en el historial del jugador con modo "tramite"', () => {
    const yo = jugador({ edad: 30, ranking: 40 });
    const lote = armarLotePeleas(createRng(9), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: false, tono: 'profesional',
    });
    expect(lote.jugador.historial.length).toBeGreaterThan(0);
    lote.jugador.historial.forEach((h) => expect(h.modo).toBe('tramite'));
  });

  it('sin intentos (0), no arma nada', () => {
    const yo = jugador();
    const lote = armarLotePeleas(createRng(1), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 0, permiteJugable: true, tono: 'profesional',
    });
    expect(lote.marqueeOferta).toBeNull();
    expect(lote.beatTramite).toBeNull();
    expect(lote.jugador).toBe(yo);
  });

  it('el beat de tramite trae tantos resultados como peleas se resolvieron solas', () => {
    const yo = jugador({ edad: 30, ranking: 40 });
    const lote = armarLotePeleas(createRng(11), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 4, permiteJugable: false, tono: 'profesional',
    });
    expect(lote.beatTramite.tipo).toBe('peleasResueltas');
    expect(lote.beatTramite.datos.resultados.length).toBe(lote.jugador.historial.length);
  });

  it('no muta el jugador original', () => {
    const yo = jugador({ edad: 25 });
    const antes = JSON.stringify(yo);
    armarLotePeleas(createRng(1), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: false, tono: 'profesional',
    });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('es determinista', () => {
    // `rivalId` no es comparable entre corridas (fighter.js arma los ids con
    // Date.now() + un contador global, no con el rng inyectado — mismo
    // criterio ya asumido en offers.test.js/roster.test.js): se lo saca antes
    // de comparar, todo lo demás sí tiene que ser idéntico.
    const sinRivalId = ({ rivalId, ...resto }) => resto;
    const yo = jugador({ edad: 28, ranking: 20 });
    const a = armarLotePeleas(createRng(7), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: true, tono: 'profesional',
    });
    const b = armarLotePeleas(createRng(7), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: true, tono: 'profesional',
    });
    expect(a.jugador.historial.map(sinRivalId)).toEqual(b.jugador.historial.map(sinRivalId));
    expect(Boolean(a.marqueeOferta)).toBe(Boolean(b.marqueeOferta));
  });
});

// v7, corrección del coordinador ("las lesiones tienen que costar de
// verdad, evaluadas semana a semana, no una vez por bloque"): antes, el
// gate de lesión vivía en career.js, revisado UNA sola vez por bloque contra
// el estado ya actualizado por un salto instantáneo de 52 semanas — así que
// cualquier lesión de 52 semanas o menos ya aparecía curada la primera vez
// que se la miraba (cero costo real). Ahora el gate vive ACÁ, cupo por cupo:
// cada intento representa `semanasPorIntento` semanas, y si el jugador sigue
// lesionado EN ESE MOMENTO puntual, el cupo se pierde (ni oferta ni trámite)
// y esas semanas se descuentan de la recuperación — si alcanza para curarse,
// el cupo SIGUIENTE del mismo bloque ya lo encuentra sano.
describe('armarLotePeleas y el gate de lesión por cupo (v7, "las lesiones cuestan de verdad")', () => {
  function conLesion(semanasRestantes, extra = {}) {
    const yo = jugador(extra);
    yo.estado = {
      ...yo.estado,
      lesion: {
        id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes, costo: 1, texto: 'x',
      },
    };
    return yo;
  }

  it('sin lesion, ningun cupo se pierde', () => {
    const yo = jugador({ edad: 25 });
    const lote = armarLotePeleas(createRng(5), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: false, tono: 'profesional', semanasPorIntento: 17,
    });
    expect(lote.bloqueados).toBe(0);
  });

  it('una lesion corta (menos que un cupo) pierde solo el primer cupo, no el resto del año', () => {
    // 5 semanas de lesión, 17 por cupo: el primer cupo la encuentra activa
    // (se pierde) pero la cura de una — el segundo y tercer cupo del mismo
    // bloque ya la encuentran sana y generan actividad real (permiteJugable
    // false fuerza que ambos sean trámite, sin depender del matchmaking).
    const yo = conLesion(5, { edad: 22 });
    const lote = armarLotePeleas(createRng(3), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: false, tono: 'profesional', semanasPorIntento: 17,
    });
    expect(lote.bloqueados).toBe(1);
    expect(lote.jugador.estado.lesion).toBeNull();
    // Los 2 cupos que no se pierden por la lesión SÍ se juegan, resueltos en
    // el momento (beatTramite) o apartados como destacado sin resolver
    // (destacadoOferta, ~10% de las veces — PROB_DESTACADO_TRAMITE): entre
    // los dos suman exactamente 2, sea cual sea el reparto.
    const resultados = lote.beatTramite ? lote.beatTramite.datos.resultados.length : 0;
    expect(resultados + (lote.destacadoOferta ? 1 : 0)).toBe(2);
  });

  it('una lesion mas larga que todos los cupos del año bloquea el año entero (bloqueados === intentos)', () => {
    const yo = conLesion(400, { edad: 34 });
    const lote = armarLotePeleas(createRng(4), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 2, permiteJugable: true, tono: 'profesional', semanasPorIntento: 17,
    });
    expect(lote.bloqueados).toBe(2);
    expect(lote.marqueeOferta).toBeNull();
    expect(lote.beatTramite).toBeNull();
    expect(lote.jugador.estado.lesion).not.toBeNull();
  });

  // El caso que de verdad le da dientes a la regla: un veterano con un solo
  // cupo en el año no tiene "segundo cupo" al que pasarle la posta dentro
  // del mismo bloque — si está lesionado justo cuando le toca, pierde el año
  // entero aunque la lesión en sí sea corta. Menos actividad, menos margen.
  it('con un solo cupo en el año, hasta una lesion corta cuesta el año completo si cae justo ahi', () => {
    const yo = conLesion(3, { edad: 35 });
    const lote = armarLotePeleas(createRng(2), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 1, permiteJugable: true, tono: 'profesional', semanasPorIntento: 52,
    });
    expect(lote.bloqueados).toBe(1);
    expect(lote.marqueeOferta).toBeNull();
    expect(lote.beatTramite).toBeNull();
    // Aun así, ya se curó (52 semanas de calendario le alcanzan de sobra a
    // una lesión de 3): el próximo bloque ya la encuentra sana.
    expect(lote.jugador.estado.lesion).toBeNull();
  });

  it('si el primer cupo se pierde por lesion, el que sigue (ya sano) hereda la chance de ser jugable/forzar titulo', () => {
    // v7 (regla "un debutante no pelea por el título con 0 peleas"): sin un
    // récord que ya cumpla el mínimo del regional, ni forzarTitulo ni la
    // eliminatoria de respaldo alcanzan (ver PELEAS_MINIMAS_TITULO,
    // offers.js) — este jugador ya lleva un año largo de actividad.
    const yo = conLesion(5, {
      edad: 22, ranking: 1, record: {
        v: 8, d: 0, e: 0, ko: 0, sub: 0, dec: 0,
      },
    });
    let vioMarqueeTrasBloqueo = false;
    for (let s = 1; s <= 60; s += 1) {
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo,
        mundo: mundo(),
        etapa: 'profesional',
        forzarTitulo: true,
        intentos: 3,
        permiteJugable: true,
        tono: 'profesional',
        semanasPorIntento: 17,
      });
      if (lote.bloqueados >= 1 && lote.marqueeOferta) { vioMarqueeTrasBloqueo = true; break; }
    }
    expect(vioMarqueeTrasBloqueo).toBe(true);
  });
});

// v6, segunda vuelta: freno al presupuesto de minutos. Sin esto, un
// "jugando bien" que corona los tres cinturones a mitad de carrera pasa el
// resto defendiendo el mundial año a año SIN EXCEPCIÓN — cada uno de esos
// años se vuelve una pelea jugable más (esPeleaImportante: esTitulo),
// reventando el presupuesto de ~20 minutos sin sumarle nada al eje de
// cinturones (ya resuelto). Medido con scripts/balance-sim.mjs: bajó las
// peleas jugables/carrera de ~14 a ~6 y el estimado de minutos de ~61 a ~21.
// Pedido 2 (v7, "minijuego de piedra, papel o tijera"): tres acciones de
// boxeo en ciclo cerrado (tecnico > noqueador > menton > tecnico, el mismo
// triángulo que ya vive en styles.js) y la tabla marcador -> resultado (3-0
// KO, 3-1 decisión unánime, 3-2 dividida, simétrica para la derrota).
describe('accionRivalDe (ciclo del minijuego)', () => {
  it('el ciclo de 3 es cerrado: cada acción le gana a una y le pierde a otra, ninguna quedada afuera', () => {
    for (const accion of ACCIONES_MINIJUEGO) {
      const leGana = accionRivalDe(accion, true);
      const lePierde = accionRivalDe(accion, false);
      expect(ACCIONES_MINIJUEGO).toContain(leGana);
      expect(ACCIONES_MINIJUEGO).toContain(lePierde);
      expect(leGana).not.toBe(accion);
      expect(lePierde).not.toBe(accion);
      expect(leGana).not.toBe(lePierde);
    }
  });

  it('es consistente con la ventaja de estilos ya declarada en styles.js (tecnico > noqueador > menton > tecnico)', () => {
    expect(accionRivalDe('tecnico', true)).toBe('noqueador');
    expect(accionRivalDe('noqueador', true)).toBe('menton');
    expect(accionRivalDe('menton', true)).toBe('tecnico');
  });
});

function jugadorConMedia(media) {
  return crearPeleador({
    nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media, esJugador: true,
  });
}

// Corrección del coordinador ("el pick del jugador no puede ser cosmético"):
// cada ronda se juega de verdad, en el momento, con el rng — nunca hay un
// marcador precalculado antes de que el jugador elija nada. La media entra
// como SESGO en la elección del rival (no como resultado fijado de
// antemano): un rival muy superior "adivina" más seguido la acción que te
// gana, uno inferior se equivoca más — y la elección del rival siempre
// tiene que ser consistente con el ciclo respecto de lo que eligió el
// jugador (ver accionRivalDe).
describe('resolverRondaMinijuego (la ronda se juega de verdad)', () => {
  it('la eleccion del rival siempre es consistente con el ciclo respecto de la eleccion del jugador', () => {
    for (let s = 1; s <= 200; s += 1) {
      const { eleccionRival, resultado } = resolverRondaMinijuego(createRng(s), {
        jugador: jugador(), rivalMedia: 60, eleccionJugador: 'tecnico',
      });
      expect(ACCIONES_MINIJUEGO).toContain(eleccionRival);
      if (resultado === 'jugador') expect(eleccionRival).toBe(accionRivalDe('tecnico', true));
      else expect(eleccionRival).toBe(accionRivalDe('tecnico', false));
    }
  });

  it('el resultado de la ronda depende del rng, no de cual de las 3 acciones se elija (ninguna es "la correcta")', () => {
    // Mismo rng, misma media, TRES elecciones distintas: la ronda tiene que
    // resolverse igual de "jugador"/"rival" en las tres (ninguna acción es
    // objetivamente mejor que otra — es un ciclo simétrico), aunque la
    // acción mostrada del rival varíe para seguir siendo consistente con el
    // ciclo en cada caso.
    for (let s = 1; s <= 100; s += 1) {
      const resultados = ACCIONES_MINIJUEGO.map((eleccionJugador) => resolverRondaMinijuego(createRng(s), {
        jugador: jugador(), rivalMedia: 60, eleccionJugador,
      }).resultado);
      expect(new Set(resultados).size).toBe(1);
    }
  });

  it('es determinista: misma semilla, mismo resultado y misma eleccion del rival', () => {
    const a = resolverRondaMinijuego(createRng(9), { jugador: jugador(), rivalMedia: 60, eleccionJugador: 'noqueador' });
    const b = resolverRondaMinijuego(createRng(9), { jugador: jugador(), rivalMedia: 60, eleccionJugador: 'noqueador' });
    expect(a).toEqual(b);
  });

  it('una media muy superior gana la MAYORIA de las rondas (ventaja notoria, sin ser 100% determinista)', () => {
    const rng = createRng(1);
    let ganadas = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const { resultado } = resolverRondaMinijuego(rng, { jugador: jugadorConMedia(90), rivalMedia: 30, eleccionJugador: 'tecnico' });
      if (resultado === 'jugador') ganadas += 1;
    }
    const ratio = ganadas / n;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1);
  });

  it('una media muy inferior sufre la desventaja (gana la minoria de las rondas, nunca cero)', () => {
    const rng = createRng(1);
    let ganadas = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const { resultado } = resolverRondaMinijuego(rng, { jugador: jugadorConMedia(30), rivalMedia: 90, eleccionJugador: 'tecnico' });
      if (resultado === 'jugador') ganadas += 1;
    }
    const ratio = ganadas / n;
    expect(ratio).toBeLessThan(0.3);
    expect(ratio).toBeGreaterThan(0);
  });

  it('con media pareja, reproduce un piedra-papel-tijera parejo (cerca del 50%)', () => {
    const rng = createRng(1);
    let ganadas = 0;
    const n = 600;
    for (let i = 0; i < n; i += 1) {
      const { resultado } = resolverRondaMinijuego(rng, { jugador: jugadorConMedia(55), rivalMedia: 55, eleccionJugador: 'menton' });
      if (resultado === 'jugador') ganadas += 1;
    }
    const ratio = ganadas / n;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});

describe('alMejorDeCuantos (mejor de 3 para las palizas, mejor de 5 si es parejo)', () => {
  it('con diferencia de media grande, es al mejor de 3', () => {
    expect(alMejorDeCuantos(jugadorConMedia(90), 30)).toBe(3);
    expect(alMejorDeCuantos(jugadorConMedia(30), 90)).toBe(3);
  });

  it('con media pareja, es al mejor de 5', () => {
    expect(alMejorDeCuantos(jugadorConMedia(55), 55)).toBe(5);
    expect(alMejorDeCuantos(jugadorConMedia(55), 60)).toBe(5);
  });

  it('es simetrico (no importa de que lado esta la ventaja)', () => {
    expect(alMejorDeCuantos(jugadorConMedia(80), 50)).toBe(alMejorDeCuantos(jugadorConMedia(50), 80));
  });
});

describe('rondasParaGanar', () => {
  it('al mejor de 5 hacen falta 3; al mejor de 3 hacen falta 2', () => {
    expect(rondasParaGanar(5)).toBe(3);
    expect(rondasParaGanar(3)).toBe(2);
  });
});

describe('resultadoDeMarcador (generalizado por alMejorDe)', () => {
  it('al mejor de 5: 3-0 es KO, 3-1 decision unanime, 3-2 dividida (y lo mismo en contra)', () => {
    expect(resultadoDeMarcador({ jugador: 3, rival: 0 }, 5)).toEqual({ ganador: 'jugador', metodo: 'ko', detalle: 'ko' });
    expect(resultadoDeMarcador({ jugador: 3, rival: 1 }, 5)).toEqual({ ganador: 'jugador', metodo: 'decision', detalle: 'unanime' });
    expect(resultadoDeMarcador({ jugador: 3, rival: 2 }, 5)).toEqual({ ganador: 'jugador', metodo: 'decision', detalle: 'dividida' });
    expect(resultadoDeMarcador({ jugador: 0, rival: 3 }, 5)).toEqual({ ganador: 'rival', metodo: 'ko', detalle: 'ko' });
    expect(resultadoDeMarcador({ jugador: 1, rival: 3 }, 5)).toEqual({ ganador: 'rival', metodo: 'decision', detalle: 'unanime' });
    expect(resultadoDeMarcador({ jugador: 2, rival: 3 }, 5)).toEqual({ ganador: 'rival', metodo: 'decision', detalle: 'dividida' });
  });

  // Al mejor de 3 no hay margen para un intermedio: con solo 2 rondas
  // necesarias, el único desenlace que no es KO es el más ajustado posible
  // (2-1), así que es siempre "dividida" — nunca "unanime".
  it('al mejor de 3: 2-0 es KO, 2-1 es dividida (nunca "unanime")', () => {
    expect(resultadoDeMarcador({ jugador: 2, rival: 0 }, 3)).toEqual({ ganador: 'jugador', metodo: 'ko', detalle: 'ko' });
    expect(resultadoDeMarcador({ jugador: 2, rival: 1 }, 3)).toEqual({ ganador: 'jugador', metodo: 'decision', detalle: 'dividida' });
    expect(resultadoDeMarcador({ jugador: 0, rival: 2 }, 3)).toEqual({ ganador: 'rival', metodo: 'ko', detalle: 'ko' });
    expect(resultadoDeMarcador({ jugador: 1, rival: 2 }, 3)).toEqual({ ganador: 'rival', metodo: 'decision', detalle: 'dividida' });
  });
});

describe('roundDeCierreMinijuego', () => {
  it('un KO cae en un round <= tope de la disciplina/nivel; una decision llega justo al tope', () => {
    for (let s = 1; s <= 60; s += 1) {
      const rng = createRng(s);
      const oferta = { nivelPelea: 'profesional' };
      const roundKo = roundDeCierreMinijuego(rng, { jugador: jugador(), oferta, metodo: 'ko' });
      expect(roundKo).toBeGreaterThanOrEqual(1);
      expect(roundKo).toBeLessThanOrEqual(8); // roundsPorNivel.profesional (disciplines.js)
      const roundDecision = roundDeCierreMinijuego(rng, { jugador: jugador(), oferta, metodo: 'decision' });
      expect(roundDecision).toBe(8);
    }
  });
});

// Pedidos 1/2 (v7): a lo sumo un cupo de trámite por lote se aparta SIN
// resolver (`destacadoOferta`) para jugarse de verdad con el minijuego
// (career.js lo encola aparte, como beat 'tramiteDestacado' — ver
// main.js); el resto, si el año trae más de un cupo de trámite, se sigue
// resolviendo en el momento (beatTramite), como siempre.
describe('armarLotePeleas y el destacado del minijuego (Pedidos 1/2, v7)', () => {
  // Ajuste de presupuesto de minutos (ver el comentario grande de
  // PROB_DESTACADO_TRAMITE, tramite.js): NO todo lote saca un destacado. El
  // test busca un lote de al menos 2 cupos de trámite QUE además haya
  // sacado el destacado (probá con varias semillas hasta encontrar ambas
  // condiciones a la vez, ninguna de las dos garantizada sola).
  it('cuando el lote saca destacado, esa oferta queda SIN resolver (no está en el historial ni en beatTramite)', () => {
    const yo = jugador({ edad: 21, ranking: 40 });
    let visto = false;
    for (let s = 1; s <= 400 && !visto; s += 1) {
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 3, permiteJugable: false, tono: 'profesional',
      });
      if (lote.destacadoOferta && lote.beatTramite) {
        visto = true;
        expect(lote.alMejorDeDestacado === 3 || lote.alMejorDeDestacado === 5).toBe(true);
        // La oferta del destacado nunca aparece en el historial (todavía no
        // se jugó) ni en el resumen de las que sí se resolvieron solas.
        const idsEnHistorial = lote.jugador.historial.map((h) => h.rivalId);
        expect(idsEnHistorial).not.toContain(lote.destacadoOferta.rivalId);
        const idsEnResumen = lote.beatTramite.datos.resultados.map((r) => r.rivalApodo ?? r.rivalNombre);
        expect(idsEnResumen).not.toContain(lote.destacadoOferta.rivalApodo ?? lote.destacadoOferta.rivalNombre);
      }
    }
    expect(visto).toBe(true);
  });

  it('a veces el lote NO saca ningun destacado (destacadoOferta queda null)', () => {
    const yo = jugador({ edad: 21, ranking: 40 });
    let vioSinDestacado = false;
    for (let s = 1; s <= 60 && !vioSinDestacado; s += 1) {
      const lote = armarLotePeleas(createRng(s), {
        jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 2, permiteJugable: false, tono: 'profesional',
      });
      if (!lote.destacadoOferta) vioSinDestacado = true;
    }
    expect(vioSinDestacado).toBe(true);
  });

  it('sin intentos, tampoco hay destacado', () => {
    const yo = jugador();
    const lote = armarLotePeleas(createRng(1), {
      jugador: yo, mundo: mundo(), etapa: 'profesional', intentos: 0, permiteJugable: true, tono: 'profesional',
    });
    expect(lote.destacadoOferta).toBeNull();
    expect(lote.alMejorDeDestacado).toBeNull();
  });
});

describe('permiteMarqueeEsteAnio (v6, freno del campeon indiscutido)', () => {
  it('sin los tres cinturones, siempre permite una pelea jugable', () => {
    const rng = createRng(1);
    const yo = jugador({ titulos: ['Cinturón regional', 'Cinturón nacional'] });
    for (let i = 0; i < 100; i += 1) {
      expect(permiteMarqueeEsteAnio(rng, yo)).toBe(true);
    }
  });

  it('con los tres cinturones, la mayoria de los anios NO permite una pelea jugable', () => {
    const rng = createRng(2);
    const yo = jugador({ titulos: CINTURONES.map((c) => c.nombre) });
    let permitidos = 0;
    const n = 300;
    for (let i = 0; i < n; i += 1) {
      if (permiteMarqueeEsteAnio(rng, yo)) permitidos += 1;
    }
    // No es NUNCA (el campeón a veces igual arriesga el cinturón), pero sí
    // una minoría clara.
    expect(permitidos).toBeGreaterThan(0);
    expect(permitidos / n).toBeLessThan(0.4);
  });
});
