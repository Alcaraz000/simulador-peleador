import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { ETAPAS, crearPartida, siguienteBeat, etapaActual, avanzarBloque } from '../../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../../src/core/offers.js';
import { semanasDeBloque, semanasHastaPelea, fechaDe } from '../../src/core/calendario.js';
import { ANIO_INICIAL } from '../../src/core/world.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

function jugarTodo(partida, limite = 400) {
  let actual = partida;
  const beats = [];
  let guardia = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat) beats.push(paso.beat);
  }
  return { partida: actual, beats };
}

// Juega una carrera entera aceptando y ganando cada oferta de pelea que aparece
// (sin correr el motor de pelea completo: aplica directamente un resultado ganador
// vía aplicarResultado). Sirve para verificar que la progresión de cinturones
// funciona de punta a punta cuando al jugador le va bien.
function jugarGanandoTodo(partida, limite = 400) {
  let actual = partida;
  let guardia = 0;
  let defensas = 0;
  let ofertas = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat && paso.beat.tipo === 'oferta') {
      ofertas += 1;
      const { oferta } = paso.beat.datos;
      if (oferta.nivel === 'defensa') defensas += 1;
      const resultado = aplicarResultado(actual.jugador, {
        oferta,
        resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
      });
      actual = { ...actual, jugador: resultado.jugador };
    }
  }
  return { partida: actual, defensas, ofertas };
}

describe('etapas', () => {
  it('define las cuatro etapas en orden', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['juvenil', 'amateur', 'profesional', 'veterano']);
  });

  it('suman veinte bloques', () => {
    expect(ETAPAS.reduce((a, e) => a + e.bloques, 0)).toBe(20);
  });

  it('la carrera cubre de los 15 a los ~39', () => {
    const finEstimado = ETAPAS.reduce((edad, e) => edad + e.bloques * e.aniosPorBloque, 15);
    expect(finEstimado).toBeGreaterThanOrEqual(38);
    expect(finEstimado).toBeLessThanOrEqual(41);
  });

  it('en juvenil se pelea menos que en profesional', () => {
    const juvenil = ETAPAS.find((e) => e.id === 'juvenil');
    const pro = ETAPAS.find((e) => e.id === 'profesional');
    expect(juvenil.probPelea).toBeLessThan(pro.probPelea);
  });
});

describe('crearPartida', () => {
  it('arranca en el bloque 1 de la etapa juvenil', () => {
    const p = nuevaPartida();
    expect(p.etapaIndice).toBe(0);
    expect(p.bloque).toBe(1);
    expect(p.terminada).toBe(false);
    expect(p.legado).toBeNull();
    expect(p.version).toBe(1);
  });

  it('crea el mundo con la disciplina y categoria del jugador', () => {
    const p = nuevaPartida();
    expect(p.mundo.disciplina).toBe('boxeo');
    expect(p.mundo.categoria).toBe('pluma');
    expect(p.mundo.roster.length).toBeGreaterThan(5);
  });

  it('el jugador arranca con 15 anios y sin rivalidades', () => {
    const p = nuevaPartida();
    expect(p.jugador.edad).toBe(15);
    expect(p.rivalidades).toEqual([]);
  });

  it('es determinista con la misma semilla', () => {
    expect(nuevaPartida(9).mundo.roster.map((r) => r.nombre))
      .toEqual(nuevaPartida(9).mundo.roster.map((r) => r.nombre));
  });

  it('arranca en la semana global 1 y sin ninguna pelea pendiente', () => {
    const p = nuevaPartida();
    expect(p.semanaGlobal).toBe(1);
    expect(p.proximaPelea).toBeNull();
  });
});

describe('siguienteBeat', () => {
  it('el primer beat de cada bloque es una mejora', () => {
    const { beat } = siguienteBeat(nuevaPartida());
    expect(beat.tipo).toBe('mejora');
    expect(beat.datos.cartas.length).toBeGreaterThanOrEqual(3);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    siguienteBeat(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('marca terminada al agotar los bloques', () => {
    const { partida } = jugarTodo(nuevaPartida());
    expect(partida.terminada).toBe(true);
  });
});

describe('ritmo de la carrera', () => {
  it('produce entre 30 y 60 beats', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      expect(beats.length).toBeGreaterThanOrEqual(30);
      expect(beats.length).toBeLessThanOrEqual(60);
    }
  });

  it('incluye peleas, mejoras y eventos', () => {
    const { beats } = jugarTodo(nuevaPartida(3));
    const tipos = new Set(beats.map((b) => b.tipo));
    expect(tipos).toContain('mejora');
    expect(tipos).toContain('oferta');
    expect(tipos.has('evento') || tipos.has('redes')).toBe(true);
  });

  // En este juego no existe un beat de tipo "pelea": toda pelea nace de aceptar
  // un beat de tipo "oferta" (ver main.js). Esto verifica esa invariante de punta
  // a punta: el historial de peleas del jugador tiene exactamente una entrada por
  // cada oferta jugada, ni una pelea fantasma de más ni de menos.
  it('cada pelea del historial vino de una oferta jugada (no hay peleas fantasma)', () => {
    const { partida, ofertas } = jugarGanandoTodo(nuevaPartida(4));
    expect(ofertas).toBeGreaterThan(0);
    expect(partida.jugador.historial.length).toBe(ofertas);
  });

  it('el jugador llega cerca de los 39 al final', () => {
    const { partida } = jugarTodo(nuevaPartida(6));
    expect(partida.jugador.edad).toBeGreaterThanOrEqual(36);
    expect(partida.jugador.edad).toBeLessThanOrEqual(42);
  });
});

describe('etapaActual', () => {
  it('empieza en juvenil y termina en veterano', () => {
    const p = nuevaPartida();
    expect(etapaActual(p).id).toBe('juvenil');
    const { partida } = jugarTodo(p);
    expect(['profesional', 'veterano']).toContain(etapaActual(partida).id);
  });
});

describe('avanzarBloque', () => {
  it('envejece al jugador y avanza el anio del mundo', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBeGreaterThan(p.jugador.edad);
    expect(despues.mundo.anio).toBeGreaterThan(p.mundo.anio);
  });

  it('avanza semanaGlobal segun las semanas del bloque de la etapa actual', () => {
    const p = nuevaPartida();
    const etapa = etapaActual(p);
    const despues = avanzarBloque(p);
    expect(despues.semanaGlobal).toBe(p.semanaGlobal + semanasDeBloque(etapa.aniosPorBloque));
  });

  it('genera noticias del mundo', () => {
    const despues = avanzarBloque(nuevaPartida());
    expect(despues.noticias.length).toBeGreaterThan(0);
  });

  it('recupera lesiones con el paso de los bloques', () => {
    const p = nuevaPartida();
    p.jugador.estado.lesion = { id: 'ceja', nombre: 'Ceja', severidad: 1, bloquesRestantes: 1, costo: 1, texto: 'x' };
    expect(avanzarBloque(p).jugador.estado.lesion).toBeNull();
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('a partir de los 32 años el jugador empieza a perder velocidad y cardio', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1; // amateur: 1 año por bloque, asi el numero da redondo
    p.jugador.edad = 31;
    const velAntes = p.jugador.atributos.velocidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBe(32);
    expect(despues.jugador.atributos.velocidad).toBeLessThan(velAntes);
    expect(despues.jugador.atributos.cardio).toBeLessThan(cardioAntes);
  });

  it('antes del umbral de declive no pierde velocidad ni cardio', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 20;
    const velAntes = p.jugador.atributos.velocidad;
    const cardioAntes = p.jugador.atributos.cardio;
    const despues = avanzarBloque(p);
    expect(despues.jugador.atributos.velocidad).toBe(velAntes);
    expect(despues.jugador.atributos.cardio).toBe(cardioAntes);
  });

  it('con preparador contratado, el declive todavia no llegó a los 32', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 31;
    p.jugador.staff = ['preparador'];
    const velAntes = p.jugador.atributos.velocidad;
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBe(32);
    expect(despues.jugador.atributos.velocidad).toBe(velAntes);
  });

  it('con preparador contratado, el declive igual llega mas tarde en la carrera', () => {
    const p = nuevaPartida();
    p.etapaIndice = 1;
    p.jugador.edad = 34;
    p.jugador.staff = ['preparador'];
    const velAntes = p.jugador.atributos.velocidad;
    const despues = avanzarBloque(p);
    expect(despues.jugador.atributos.velocidad).toBeLessThan(velAntes);
  });

  it('mientras el jugador tiene el cinturon mundial puesto, el mundo no le anuncia un nuevo campeon', () => {
    const p = nuevaPartida();
    p.jugador.titulos = ['Cinturón mundial'];
    p.mundo.campeonId = p.mundo.roster[0].id;
    p.mundo.roster[0].edad = 41; // fuerza lo que seria una "vacante" si nadie lo protegiera
    const despues = avanzarBloque(p);
    expect(despues.noticias.some((n) => n.titular.includes('cinturón vacante'))).toBe(false);
    expect(despues.noticias.some((n) => n.titular.includes('es el nuevo campeón'))).toBe(false);
  });

  it('sin el cinturon mundial, el mundo puede anunciar un nuevo campeon con normalidad', () => {
    const p = nuevaPartida();
    p.mundo.campeonId = p.mundo.roster[0].id;
    p.mundo.roster[0].edad = 41;
    const despues = avanzarBloque(p);
    expect(despues.noticias.some((n) => n.titular.includes('cinturón vacante'))).toBe(true);
  });
});

describe('ofertas de pelea bloqueadas por lesion', () => {
  it('si esta lesionado grave y le tocaba pelea, avisa en vez de quedarse callado', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2; // profesional: probPelea = 1, siempre "le toca"
    // bloquesRestantes en 8, no en 4: con 12 iteraciones de siguienteBeat, el
    // mínimo de beats por bloque en profesional (mientras sigue lesionado)
    // es 2 (mejora + lesionSinOferta, siempre) — así que en el peor caso
    // (sin ningún beat opcional) 12 iteraciones alcanzan para 6 bloques como
    // mucho, nunca para los 8 que hacen falta para recuperarse. Con 4 el
    // test dependía de que los beats opcionales (sparring/evento/redes, con
    // rng) NO aparecieran demasiado seguido para esa semilla en particular;
    // eso dejó de cumplirse cuando el fix de apodos duplicados del roster
    // (Task 6.3) corrió la secuencia de rng.
    p.jugador.estado.lesion = {
      id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, bloquesRestantes: 8, costo: 60000, texto: 'x',
    };
    let actual = p;
    const tipos = [];
    for (let i = 0; i < 12; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat) tipos.push(paso.beat.tipo);
    }
    expect(tipos).not.toContain('oferta');
    expect(tipos).toContain('lesionSinOferta');
  });

  it('sin lesion grave, esa misma situacion ofrece pelea con normalidad', () => {
    const p = nuevaPartida();
    p.etapaIndice = 2;
    let actual = p;
    const tipos = [];
    for (let i = 0; i < 12; i++) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat) tipos.push(paso.beat.tipo);
    }
    expect(tipos).toContain('oferta');
    expect(tipos).not.toContain('lesionSinOferta');
  });
});

describe('ofertas de pelea por carrera', () => {
  // Guarda de ritmo para el eje de cinturones: si alguien vuelve a bajar probPelea
  // (o a hacer incondicional el beat de noticias) sin medir el impacto, estos tests
  // lo detectan. Ver el informe de la Task 17 para el porqué de estos números.
  const semillas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('nunca caen por debajo de 8 ofertas en toda la carrera', () => {
    semillas.forEach((semilla) => {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      const ofertas = beats.filter((b) => b.tipo === 'oferta').length;
      expect(ofertas).toBeGreaterThanOrEqual(8);
    });
  });

  it('tipicamente caen entre 12 y 22 ofertas por carrera', () => {
    semillas.forEach((semilla) => {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      const ofertas = beats.filter((b) => b.tipo === 'oferta').length;
      expect(ofertas).toBeGreaterThanOrEqual(12);
      expect(ofertas).toBeLessThanOrEqual(22);
    });
  });
});

describe('progresión de cinturones', () => {
  it('ganando todas las ofertas de pelea, el jugador consigue los tres cinturones', () => {
    // Semilla 5 (antes era 1: el fix de apodos duplicados del roster —
    // Task 6.3, ver crearRoster/crearMundo — corre la secuencia de rng, y la
    // semilla 1 dejó de llegar a los tres cinturones con esa secuencia
    // nueva). No es una regla especial de la semilla 1: varias otras (5, 6,
    // 7, 8...) siguen llegando de punta a punta.
    const { partida } = jugarGanandoTodo(nuevaPartida(5));
    expect(partida.jugador.titulos.length).toBe(CINTURONES.length);
    CINTURONES.forEach((cinturon) => {
      expect(partida.jugador.titulos).toContain(cinturon.nombre);
    });
  });

  // No basta con una semilla favorable: esto garantiza que el eje de cinturones
  // funciona de punta a punta para la gran mayoría de las carreras, no solo para
  // una elegida a mano. Si `decidirNivel` (offers.js) vuelve a priorizar la defensa
  // del cinturón actual por sobre escalar al siguiente cuando el ranking ya
  // califica, este test lo detecta.
  //
  // Muestra subida de 150 a 400 semillas en la Task 5.2 (el piso se queda en
  // 0.85, no en 0.9): con n=150 el test era flaky de nacimiento, no un
  // problema de balance. Medido a mano sobre seis sub-muestras de 150
  // semillas cada una: 89.3% / 86.7% / 95.3% / 83.3% / 90.0% / 90.0% — rango
  // de 83.3% a 95.3%, la mitad por debajo de cualquier piso de 90%. Con
  // n=400 la tasa era estable en ~90% con una desviación de ~1.5 puntos, así
  // que un piso de 0.85 quedaba a más de 3 sigma de la media.
  //
  // Muestra subida otra vez a 3000 en la Task 6.3: el fix de apodos
  // duplicados del roster (crearRoster ahora evita que dos rivales, o el
  // rival y el propio jugador, compartan apodo — antes pasaba en ~97% y
  // ~44% de las carreras respectivamente) corre la secuencia de rng para
  // TODA la carrera, no solo la creación del roster. Medido con 5000
  // semillas después del fix: la media real bajó de ~90% a ~87% (no es
  // ruido de muestra: la sub-muestra 1-400, la que corría este test, cayó a
  // 84%, y 1500/2500/5000 semillas convergen todas en 86.7-87%, no
  // alrededor de 90%). Con n=3000 el piso de 0.85 vuelve a quedar a >3
  // sigma de esa media real (~87%), y sigue siendo el ≥85% jugando bien que
  // pide el brief de la Task 6 — no hizo falta tocar el piso, alcanzó con
  // agrandar la muestra otra vez.
  it('sobre muchas semillas (3000), al menos el 85% de las carreras ganadas de punta a punta terminan con los tres cinturones', () => {
    const total = 3000;
    let conLosTres = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { partida } = jugarGanandoTodo(nuevaPartida(semilla));
      if (partida.jugador.titulos.length === CINTURONES.length) conLosTres += 1;
    }
    expect(conLosTres / total).toBeGreaterThanOrEqual(0.85);
  });

  // Guarda del lado opuesto: si `PROB_ASCENSO_PRIORITARIO` se acerca demasiado a 1,
  // "defender el cinturón" deja de sentirse presente (el jugador siempre escala
  // apenas puede y nunca ve una defensa obligatoria). Task 25 midió que en 0.95
  // casi 1 de cada 5 carreras no ofrecía ninguna defensa; este test pone un piso.
  it('sobre muchas semillas, casi siempre aparece al menos una defensa obligatoria', () => {
    const total = 150;
    let sinDefensas = 0;
    for (let semilla = 1; semilla <= total; semilla += 1) {
      const { defensas } = jugarGanandoTodo(nuevaPartida(semilla));
      if (defensas === 0) sinDefensas += 1;
    }
    expect(sinDefensas / total).toBeLessThanOrEqual(0.1);
  });
});

describe('proximaPelea (calendario del tablero)', () => {
  // Etapa "profesional": probPelea = 1, asi que el bloque siempre trae una
  // oferta y podemos verificar que quedó guardada de forma confiable.
  function partidaProfesional(semilla) {
    const p = nuevaPartida(semilla);
    p.etapaIndice = 2;
    return p;
  }

  it('en cuanto se arma la cola con una oferta, la partida ya sabe cuál es la próxima pelea antes de llegar a ese beat', () => {
    const p = partidaProfesional(2);
    const primerPaso = siguienteBeat(p);

    // El primer beat de un bloque siempre es "mejora": si el bloque trae una
    // oferta más adelante en la cola, proximaPelea ya tiene que reflejarla.
    expect(primerPaso.beat.tipo).toBe('mejora');
    expect(primerPaso.partida.proximaPelea).not.toBeNull();

    let actual = primerPaso.partida;
    let beatOferta = null;
    for (let i = 0; i < 5 && !beatOferta; i += 1) {
      const paso = siguienteBeat(actual);
      actual = paso.partida;
      if (paso.beat && paso.beat.tipo === 'oferta') beatOferta = paso.beat;
    }

    expect(beatOferta).not.toBeNull();
    expect(primerPaso.partida.proximaPelea.oferta.id).toBe(beatOferta.datos.oferta.id);
  });

  it('semanasHastaPelea da un numero de semanas coherente cuando hay oferta guardada', () => {
    const p = partidaProfesional(2);
    const paso = siguienteBeat(p);
    expect(paso.partida.proximaPelea).not.toBeNull();
    const faltan = semanasHastaPelea(paso.partida);
    expect(faltan).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(faltan)).toBe(true);
  });

  it('no muta partida.proximaPelea de la partida original', () => {
    const p = partidaProfesional(2);
    const antes = JSON.stringify(p.proximaPelea);
    siguienteBeat(p);
    expect(JSON.stringify(p.proximaPelea)).toBe(antes);
  });
});

describe('el año del mundo sigue al calendario', () => {
  // Los bloques duran 1 a 1.3 años. Si el mundo acumulara años enteros por su
  // cuenta terminaría varios años atrás del calendario del tablero y de la
  // edad del jugador, y el tablero mostraría dos años distintos a la vez.
  it('coincide con fechaDe(semanaGlobal) bloque a bloque durante toda la carrera', () => {
    let actual = nuevaPartida(7);
    for (let i = 0; i < 20 && !actual.terminada; i += 1) {
      actual = avanzarBloque(actual);
      expect(actual.mundo.anio).toBe(fechaDe(actual.semanaGlobal, ANIO_INICIAL).anio);
    }
  });

  it('al final de una carrera completa el mundo avanzó tantos años como el jugador', () => {
    const inicial = nuevaPartida(8);
    const { partida } = jugarTodo(inicial);
    const aniosDelMundo = partida.mundo.anio - ANIO_INICIAL;
    const aniosDelJugador = partida.jugador.edad - inicial.jugador.edad;
    // Tolerancia de un año: el calendario redondea semanas a años enteros.
    expect(Math.abs(aniosDelMundo - aniosDelJugador)).toBeLessThanOrEqual(1);
  });
});
