import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import { CINTURONES, PELEAS_MINIMAS_TITULO } from '../../src/core/offers.js';
import {
  intentosDePelea, resumenLote, armarLotePeleas, permiteMarqueeEsteAnio,
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

// v6, segunda vuelta: freno al presupuesto de minutos. Sin esto, un
// "jugando bien" que corona los tres cinturones a mitad de carrera pasa el
// resto defendiendo el mundial año a año SIN EXCEPCIÓN — cada uno de esos
// años se vuelve una pelea jugable más (esPeleaImportante: esTitulo),
// reventando el presupuesto de ~20 minutos sin sumarle nada al eje de
// cinturones (ya resuelto). Medido con scripts/balance-sim.mjs: bajó las
// peleas jugables/carrera de ~14 a ~6 y el estimado de minutos de ~61 a ~21.
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
