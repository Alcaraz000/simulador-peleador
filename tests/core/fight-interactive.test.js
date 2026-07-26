import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea } from '../../src/core/fight.js';
import {
  INSTRUCCIONES_RINCON, ZONAS_GOLPE, POSTURAS, avanzarPelea, estadoRincon,
  aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia, instruccionRecomendada,
  consejoRincon,
} from '../../src/core/fight-interactive.js';

function armar({ semilla = 1, nivel = 'profesional', estiloJugador = 'tecnico' } = {}) {
  const jugador = crearPeleador({
    nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: estiloJugador, categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
  });
  const rival = crearPeleador({
    nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina: 'boxeo',
    estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 58,
  });
  return crearPelea({ jugador, rival, disciplina: 'boxeo', nivel, plan: 'afuera', rng: createRng(semilla) });
}

describe('instrucciones del rincon', () => {
  it('define las tres instrucciones', () => {
    expect(Object.keys(INSTRUCCIONES_RINCON).sort()).toEqual(['acelerar', 'cuerpo', 'respirar']);
  });

  it('respirar baja fatiga y acelerar la sube', () => {
    expect(INSTRUCCIONES_RINCON.respirar.mods.fatigaJugador).toBeLessThan(0);
    expect(INSTRUCCIONES_RINCON.acelerar.mods.fatigaJugador).toBeGreaterThan(0);
  });

  it('ir al cuerpo mejora la chance de golpe de gracia', () => {
    expect(INSTRUCCIONES_RINCON.cuerpo.mods.ventanaGolpe).toBeGreaterThan(0);
  });

  it('cada instruccion mapea a un plan valido', () => {
    for (const i of Object.values(INSTRUCCIONES_RINCON)) {
      expect(['frente', 'afuera', 'aguantar']).toContain(i.plan);
    }
  });
});

describe('avanzarPelea', () => {
  it('marca pendiente rincon al cerrar un round sin desenlace', () => {
    const { pelea } = avanzarPelea(armar());
    if (!pelea.terminada) expect(pelea.pendiente).toBe('rincon');
  });

  it('no marca pendiente si la pelea termino', () => {
    let pelea = armar({ nivel: 'amateur' });
    let guardia = 0;
    while (!pelea.terminada && guardia < 20) {
      guardia += 1;
      pelea = avanzarPelea(pelea).pelea;
      if (pelea.pendiente) pelea = aplicarInstruccionRincon(pelea, 'respirar');
    }
    expect(pelea.terminada).toBe(true);
    expect(pelea.pendiente).toBeNull();
  });
});

describe('estadoRincon', () => {
  it('describe como viene la pelea', () => {
    const { pelea } = avanzarPelea(armar());
    const estado = estadoRincon(pelea);
    expect(estado.tarjetasTexto).toMatch(/\d/);
    expect(typeof estado.fatigaJugador).toBe('number');
    expect(estado.consejo.length).toBeGreaterThan(0);
  });

  // Task v4, pedido textual: el tip ya no es infalible ni siempre presente
  // (ver describe('consejoRincon') más abajo para el criterio en detalle) —
  // acá solo se prueba que `estadoRincon` expone el campo con la forma
  // correcta en los dos casos posibles: ausente, o con un id válido + el
  // nombre de quien lo firma.
  it('el tip viene null o con un id valido de INSTRUCCIONES_RINCON y el nombre de quien lo dice', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const { pelea } = avanzarPelea(armar({ semilla }));
      const estado = estadoRincon(pelea);
      if (estado.tip === null) continue;
      expect(Object.keys(INSTRUCCIONES_RINCON)).toContain(estado.tip.id);
      expect(estado.tip.entrenadorNombre.length).toBeGreaterThan(0);
    }
  });
});

// Task v4, pedido textual: "ese tip parece hacer que el jugador siempre
// gane, así que no quiero que aparezca siempre" + "que cuando lo haya no
// sea infalible ... que dependa de qué tan buena sea la lectura de tu
// entrenador y de lo clara que esté la situación".
describe('consejoRincon', () => {
  // Barre muchos rngEstado distintos para el MISMO estado de pelea: como
  // `consejoRincon` arranca siempre del rngEstado ya guardado en la pelea
  // (mismo patrón que abrirGolpeDeGracia) sin persistirlo, alcanza con variar
  // ese valor para simular "muchos rounds distintos" sin tener que jugar
  // partidas completas.
  function muchasTiradas(pelea, cantidad = 400) {
    const resultados = [];
    for (let e = 1; e <= cantidad; e++) {
      resultados.push(consejoRincon({ ...pelea, rngEstado: e }));
    }
    return resultados;
  }

  it('a veces no dice nada (no aparece siempre)', () => {
    const { pelea } = avanzarPelea(armar());
    const resultados = muchasTiradas(pelea);
    expect(resultados.some((r) => r === null)).toBe(true);
    expect(resultados.some((r) => r !== null)).toBe(true);
  });

  it('cuando habla, a veces se equivoca (no es infalible)', () => {
    const { pelea } = avanzarPelea(armar());
    const correcta = instruccionRecomendada(pelea);
    const dichos = muchasTiradas(pelea).filter((r) => r !== null);
    expect(dichos.some((r) => r.id === correcta)).toBe(true);
    expect(dichos.some((r) => r.id !== correcta)).toBe(true);
  });

  it('firma el consejo con el nombre del entrenador actual del jugador', () => {
    const { pelea } = avanzarPelea(armar());
    const dichos = muchasTiradas(pelea).filter((r) => r !== null);
    expect(dichos.length).toBeGreaterThan(0);
    for (const r of dichos) expect(r.entrenadorNombre).toBe(pelea.snapshot.jugador.entrenador.nombre);
  });

  it('sin entrenador (cuerpo tecnico viejo/sin catalogo) nunca dice nada', () => {
    const { pelea } = avanzarPelea(armar());
    const sinEntrenador = { ...pelea, snapshot: { ...pelea.snapshot, jugador: { ...pelea.snapshot.jugador, entrenador: null } } };
    const resultados = muchasTiradas(sinEntrenador);
    expect(resultados.every((r) => r === null)).toBe(true);
  });

  it('es determinista: llamarlo dos veces sobre la MISMA pelea da el mismo resultado', () => {
    const { pelea } = avanzarPelea(armar());
    expect(consejoRincon(pelea)).toEqual(consejoRincon(pelea));
  });

  it('no muta la pelea (no persiste el rng gastado en la previsualizacion)', () => {
    const { pelea } = avanzarPelea(armar());
    const antes = JSON.stringify(pelea);
    consejoRincon(pelea);
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  // El corazón del pedido: un cuerpo técnico legendario en una pelea clara
  // (bien arriba en tarjetas, con gas) tiene que acertar sensiblemente más
  // seguido que uno de gimnasio de barrio en una pelea pareja y ambigua.
  it('un entrenador legendario en una situacion clara acierta mas seguido que uno flojo en una confusa', () => {
    const claraFuerte = (() => {
      const { pelea } = avanzarPelea(armar({ estiloJugador: 'contragolpeador' })); // Nicolino Lecho, legendario
      return { ...pelea, tarjetas: { jugador: 5, rival: 0 }, fatiga: { ...pelea.fatiga, jugador: 15 } };
    })();
    const confusaFloja = (() => {
      const { pelea } = avanzarPelea(armar({ estiloJugador: 'noqueador' })); // Tanque Ferro, normal
      return { ...pelea, tarjetas: { jugador: 2, rival: 2 }, fatiga: { ...pelea.fatiga, jugador: 60 } };
    })();

    const correctaFuerte = instruccionRecomendada(claraFuerte);
    const correctaFloja = instruccionRecomendada(confusaFloja);

    const dichosFuerte = muchasTiradas(claraFuerte).filter((r) => r !== null);
    const dichosFloja = muchasTiradas(confusaFloja).filter((r) => r !== null);

    const aciertoFuerte = dichosFuerte.filter((r) => r.id === correctaFuerte).length / dichosFuerte.length;
    const aciertoFloja = dichosFloja.filter((r) => r.id === correctaFloja).length / dichosFloja.length;

    expect(aciertoFuerte).toBeGreaterThan(aciertoFloja);

    // Y también habla más seguido: menos silencios con el rincón bueno en
    // pelea clara que con el flojo en una confusa.
    const cantidadFuerte = muchasTiradas(claraFuerte).filter((r) => r !== null).length;
    const cantidadFloja = muchasTiradas(confusaFloja).filter((r) => r !== null).length;
    expect(cantidadFuerte).toBeGreaterThan(cantidadFloja);
  });
});

// Task v3, pedido textual: el hint del rincón "debe tener criterio real, no
// una sugerencia al azar" — se prueba el criterio en los cuatro cuadrantes
// posibles (arriba/abajo en tarjetas × cansado/con gas), no solo que exista.
describe('instruccionRecomendada', () => {
  function peleaCon({ jugador, rival, fatigaJugador }) {
    const base = armar();
    return { ...base, tarjetas: { jugador, rival }, fatiga: { ...base.fatiga, jugador: fatigaJugador } };
  }

  it('abajo en tarjetas y sin gas: recomienda respirar (recuperar antes de arriesgar)', () => {
    expect(instruccionRecomendada(peleaCon({ jugador: 1, rival: 3, fatigaJugador: 75 }))).toBe('respirar');
  });

  it('abajo en tarjetas pero con gas: recomienda acelerar (dar vuelta el marcador)', () => {
    expect(instruccionRecomendada(peleaCon({ jugador: 1, rival: 3, fatigaJugador: 20 }))).toBe('acelerar');
  });

  it('arriba en tarjetas pero sin gas: recomienda respirar (cuidar la ventaja)', () => {
    expect(instruccionRecomendada(peleaCon({ jugador: 3, rival: 1, fatigaJugador: 75 }))).toBe('respirar');
  });

  it('arriba en tarjetas y con gas: recomienda ir al cuerpo (buscar el nocaut)', () => {
    expect(instruccionRecomendada(peleaCon({ jugador: 3, rival: 1, fatigaJugador: 20 }))).toBe('cuerpo');
  });

  it('empatado y con gas: se trata como "no perdiendo", recomienda ir al cuerpo', () => {
    expect(instruccionRecomendada(peleaCon({ jugador: 2, rival: 2, fatigaJugador: 20 }))).toBe('cuerpo');
  });
});

describe('aplicarInstruccionRincon', () => {
  it('limpia el pendiente y cambia el plan', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'acelerar');
    expect(despues.pendiente).toBeNull();
    expect(despues.plan).toBe(INSTRUCCIONES_RINCON.acelerar.plan);
  });

  it('respirar baja la fatiga del jugador', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'respirar');
    expect(despues.fatiga.jugador).toBeLessThanOrEqual(pelea.fatiga.jugador);
  });

  it('ir al cuerpo castiga el aguante del rival', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(despues.aguante.rival).toBeLessThanOrEqual(pelea.aguante.rival);
  });

  it('no muta la pelea original', () => {
    const { pelea } = avanzarPelea(armar());
    const antes = JSON.stringify(pelea);
    aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  it('rechaza una instruccion desconocida', () => {
    const { pelea } = avanzarPelea(armar());
    expect(() => aplicarInstruccionRincon(pelea, 'inventada')).toThrow(/inventada/);
  });
});

describe('golpe de gracia', () => {
  function peleaConRivalGroggy() {
    const pelea = armar();
    return { ...pelea, aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
  }

  it('define las tres zonas', () => {
    expect(Object.keys(ZONAS_GOLPE).sort()).toEqual(['higado', 'menton', 'sien']);
  });

  it('el menton es la zona mas dificil y la que mas dana', () => {
    expect(ZONAS_GOLPE.menton.dificultad).toBeGreaterThan(ZONAS_GOLPE.higado.dificultad);
    expect(ZONAS_GOLPE.menton.danoBase).toBeGreaterThan(ZONAS_GOLPE.higado.danoBase);
  });

  it('abrir la ventana informa la zona abierta y las tres opciones', () => {
    const info = abrirGolpeDeGracia(peleaConRivalGroggy());
    expect(Object.keys(ZONAS_GOLPE)).toContain(info.zonaAbierta);
    expect(info.zonas).toHaveLength(3);
    expect(info.ventanaMs).toBeGreaterThan(0);
  });

  it('abrir la ventana tambien informa la postura del rival', () => {
    const info = abrirGolpeDeGracia(peleaConRivalGroggy());
    expect(Object.keys(POSTURAS)).toContain(info.postura);
  });

  it('la zona informada como abierta coincide con la que marca la postura', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      expect(POSTURAS[info.postura].zonas[info.zonaAbierta]).toBe('abierto');
      const abiertaEnInfo = info.zonas.find((z) => z.id === info.zonaAbierta);
      expect(abiertaEnInfo.estado).toBe('abierto');
    }
  });

  it('define las cuatro posturas', () => {
    expect(Object.keys(POSTURAS).sort()).toEqual(
      ['contra_cuerdas', 'cubre_un_lado', 'guardia_alta', 'manos_abajo'].sort(),
    );
  });

  it('cada postura deja al menos una zona abierta y una tapada', () => {
    for (const postura of Object.values(POSTURAS)) {
      const estados = Object.values(postura.zonas);
      expect(estados).toContain('abierto');
      expect(estados).toContain('tapado');
      expect(Object.keys(postura.zonas).sort()).toEqual(['higado', 'menton', 'sien']);
    }
  });

  it('la zona que muestra la ventana siempre coincide con la que se resuelve como acierto', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 60 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const { eventos } = resolverGolpeDeGracia(pelea, {
        zonaElegida: info.zonaAbierta, precision: 0.6, aTiempo: true,
      });
      const ultimo = eventos[eventos.length - 1];
      expect(ultimo.texto).toMatch(/la manda al|conecta al/);
      expect(ultimo.texto).not.toMatch(/pega donde puede|encuentra la guardia/);
    }
  });

  it('acertar la zona abierta con buena precision suele terminar la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 10 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: info.zonaAbierta, precision: 1, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeGreaterThan(14);
  });

  it('no llegar a tiempo cuesta la chance y suma fatiga', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'higado', precision: 1, aTiempo: false,
    });
    expect(despues.terminada).toBe(false);
    expect(despues.pendiente).toBeNull();
    expect(despues.fatiga.jugador).toBeGreaterThan(pelea.fatiga.jugador);
    expect(despues.aguante.rival).toBeGreaterThanOrEqual(pelea.aguante.rival);
    expect(eventos.some((e) => /se recompone|se rearma|perdiste/i.test(e.texto))).toBe(true);
  });

  it('pegar en una zona tapada casi nunca termina la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 30 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const tapada = Object.keys(ZONAS_GOLPE).find((z) => z !== info.zonaAbierta);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: tapada, precision: 0.2, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeLessThan(8);
  });

  it('siempre limpia el pendiente y narra algo', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'menton', precision: 0.5, aTiempo: true,
    });
    expect(despues.pendiente).toBeNull();
    expect(eventos.length).toBeGreaterThan(0);
  });
});
