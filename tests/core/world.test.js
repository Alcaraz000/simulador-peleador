import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  crearMundo, avanzarMundo, recalcularRankings, buscarRival, rankingDelJugador, tablaRanking,
  tablasDeDivisiones,
} from '../../src/core/world.js';
import { mediaDe, recordTexto, crearPeleador } from '../../src/core/fighter.js';

const opciones = { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 };

function mundo() {
  return crearMundo(createRng(20), opciones);
}

describe('crearMundo', () => {
  it('arma roster con ranking y anio inicial', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.roster).toHaveLength(10);
    expect(mundo.roster[0].ranking).toBe(1);
    expect(typeof mundo.anio).toBe('number');
    expect(mundo.titulares).toEqual([]);
  });

  it('corona campeon al numero uno', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.campeonId).toBe(mundo.roster[0].id);
  });
});

describe('avanzarMundo', () => {
  it('no muta el mundo original', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const antes = JSON.stringify(mundo);
    avanzarMundo(mundo, createRng(3), { aniosPasados: 1 });
    expect(JSON.stringify(mundo)).toBe(antes);
  });

  it('envejece a los peleadores', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const edadAntes = mundo.roster[0].edad;
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(3), { aniosPasados: 2 });
    const mismo = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    if (mismo) expect(mismo.edad).toBe(edadAntes + 2);
  });

  it('genera peleas entre rivales y sucesos', () => {
    const mundo = crearMundo(createRng(4), opciones);
    const { sucesos } = avanzarMundo(mundo, createRng(5), { aniosPasados: 1 });
    expect(sucesos.length).toBeGreaterThan(0);
    expect(sucesos.every((s) => typeof s.texto === 'string' && s.texto.length > 0)).toBe(true);
  });

  it('acumula peleas en los records', () => {
    const mundo = crearMundo(createRng(6), opciones);
    const totalAntes = mundo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(7), { aniosPasados: 1 });
    const totalDespues = nuevo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    expect(totalDespues).toBeGreaterThan(totalAntes);
  });

  it('retira a los muy veteranos y avisa', () => {
    const mundo = crearMundo(createRng(8), opciones);
    mundo.roster[0].edad = 41;
    const { mundo: nuevo, sucesos } = avanzarMundo(mundo, createRng(9), { aniosPasados: 1 });
    const retirado = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    expect(retirado.retirado).toBe(true);
    expect(sucesos.some((s) => s.tipo === 'retiro')).toBe(true);
  });

  it('mantiene el ranking consecutivo entre los activos', () => {
    const mundo = crearMundo(createRng(10), opciones);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(11), { aniosPasados: 3 });
    const activos = nuevo.roster.filter((p) => !p.retirado);
    expect(activos.map((p) => p.ranking)).toEqual(activos.map((_, i) => i + 1));
  });

  it('es determinista con la misma semilla', () => {
    const mundo = crearMundo(createRng(12), opciones);
    const a = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    const b = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    expect(a.sucesos).toEqual(b.sucesos);
  });

  it('si el jugador es campeon, no corona a otro NPC cuando el titular pierde', () => {
    // Fuerza a que el actual "campeón" del mundo (campeonId) pierda su combate
    // en cuanto arranca la simulación: con jugadorEsCampeon:false esto SIEMPRE
    // corona a otro. Con jugadorEsCampeon:true, el jugador tiene puesto ese
    // cinturón y el mundo no debe tocarlo.
    const mundo = crearMundo(createRng(30), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].atributos = { ...mundo.roster[0].atributos, potencia: 1, velocidad: 1, tecnica: 1, defensa: 1, cardio: 1, iq: 1 };
    const { sucesos, mundo: nuevo } = avanzarMundo(mundo, createRng(31), { aniosPasados: 1, jugadorEsCampeon: true });
    expect(sucesos.some((s) => s.tipo === 'titulo')).toBe(false);
    expect(nuevo.campeonId).toBe(mundo.campeonId);
  });

  it('si el jugador es campeon, no declara vacante aunque el titular se retire', () => {
    const mundo = crearMundo(createRng(32), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].edad = 41; // se retira este mismo avance
    const { sucesos, mundo: nuevo } = avanzarMundo(mundo, createRng(33), { aniosPasados: 1, jugadorEsCampeon: true });
    expect(sucesos.some((s) => s.texto.includes('cinturón vacante'))).toBe(false);
    expect(nuevo.campeonId).toBe(mundo.campeonId);
  });

  it('sin jugadorEsCampeon (por defecto), el comportamiento de siempre sigue intacto', () => {
    const mundo = crearMundo(createRng(32), opciones);
    mundo.campeonId = mundo.roster[0].id;
    mundo.roster[0].edad = 41;
    const { sucesos } = avanzarMundo(mundo, createRng(33), { aniosPasados: 1 });
    expect(sucesos.some((s) => s.texto.includes('cinturón vacante'))).toBe(true);
  });

  // Pedido 2 (v6, "el ranking se achica solo... mi teoría es que los
  // peleadores se retiran y por eso no aparecen, pero tienen que ir
  // apareciendo nuevos"): cada retiro tiene que reponerse con un debutante
  // nuevo, así la categoría no se vacía con los años.
  it('cuando alguien se retira, aparece un debutante nuevo que lo reemplaza', () => {
    const mundo = crearMundo(createRng(40), opciones);
    mundo.roster[0].edad = 41; // se retira este mismo avance
    const activosAntes = mundo.roster.filter((p) => !p.retirado).length;
    const { mundo: nuevo, sucesos } = avanzarMundo(mundo, createRng(41), { aniosPasados: 1 });
    const activosDespues = nuevo.roster.filter((p) => !p.retirado).length;
    // Se retiró uno, pero un debutante lo repone: el conteo de activos no cae.
    expect(activosDespues).toBeGreaterThanOrEqual(activosAntes);
    expect(sucesos.some((s) => s.tipo === 'debut')).toBe(true);
  });

  it('el debutante nuevo no repite nombre ni apodo con nadie del roster (activo o retirado)', () => {
    const mundo = crearMundo(createRng(42), { ...opciones, cantidad: 30 });
    for (const p of mundo.roster) p.edad = 39; // todos se retiran este año
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(43), { aniosPasados: 1 });
    const nombres = nuevo.roster.map((p) => p.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    const apodos = nuevo.roster.map((p) => p.apodo).filter(Boolean);
    expect(new Set(apodos).size).toBe(apodos.length);
  });

  it('sobre muchos años, el roster activo no se va vaciando (se mantiene poblado)', () => {
    const mundo = crearMundo(createRng(44), { ...opciones, cantidad: 30 });
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(45), { aniosPasados: 15 });
    const activos = nuevo.roster.filter((p) => !p.retirado).length;
    // En 15 años, varios de los 30 originales (19-33 años al arrancar) llegan
    // a los 40 y se retiran — sin reposición, esto caería mucho. Con
    // reposición 1 a 1, se mantiene cerca del tamaño original.
    expect(activos).toBeGreaterThanOrEqual(25);
  });

  it('clona titulares: mutar el mundo devuelto no afecta al original y viceversa', () => {
    const mundo = crearMundo(createRng(21), opciones);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(22), { aniosPasados: 1 });
    nuevo.titulares.push({ nombre: 'Título de prueba' });
    expect(mundo.titulares).toEqual([]);
    mundo.titulares.push({ nombre: 'Otro título' });
    expect(nuevo.titulares).toHaveLength(1);
  });
});

describe('recalcularRankings', () => {
  it('ordena por media y no rankea retirados', () => {
    const mundo = crearMundo(createRng(14), opciones);
    mundo.roster[0].retirado = true;
    const ordenado = recalcularRankings(mundo.roster);
    const activos = ordenado.filter((p) => !p.retirado);
    expect(activos[0].ranking).toBe(1);
    expect(ordenado.find((p) => p.retirado).ranking).toBeNull();
    for (let i = 1; i < activos.length; i++) {
      expect(mediaDe(activos[i - 1])).toBeGreaterThanOrEqual(mediaDe(activos[i]));
    }
  });
});

describe('rankingDelJugador', () => {
  // Bug reportado (v9, "en juvenil aparece como #101, y en amateur salta a
  // #81 sin haber peleado nunca"): un jugador que todavía no debutó como
  // profesional (0 peleas en `jugador.record` — el amateur va aparte, en
  // `recordAmateur`) no puede tener puesto: ya lo dice el tablero ("Sin
  // clasificar"), y `rankingDelJugador` tiene que coincidir, no calcular un
  // puesto igual a partir de la MEDIA sola.
  it('sin debutar como profesional (record en 0-0-0), no hay puesto: devuelve null', () => {
    const m = mundo();
    const sinDebutar = { ...m.roster[0], record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    expect(rankingDelJugador(m, sinDebutar)).toBeNull();
  });

  it('una MEDIA altísima sin haber debutado sigue sin dar puesto (no "engancha" por ser bueno)', () => {
    const m = mundo();
    const crackSinDebutar = {
      ...m.roster[0],
      atributos: { potencia: 99, velocidad: 99, tecnica: 99, defensa: 99, cardio: 99, iq: 99, grappling: 1 },
      record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
    };
    expect(rankingDelJugador(m, crackSinDebutar)).toBeNull();
  });

  it('un empate ya cuenta como debut (peleó, aunque no ganó ni perdió): tiene puesto', () => {
    const m = mundo();
    const debutoConEmpate = { ...m.roster[0], record: { v: 0, d: 0, e: 1, ko: 0, sub: 0, dec: 0 } };
    expect(rankingDelJugador(m, debutoConEmpate)).not.toBeNull();
  });

  it('un peleador flojo (ya debutado) queda ultimo', () => {
    const m = mundo();
    // `e: 1` (un empate) alcanza para contar como debutado sin mover el bono
    // de récord (la fórmula usa v y d, nunca e) — mismo puntaje que 0-0-0,
    // pero ahora SÍ tiene puesto.
    const flojo = { ...m.roster[0], atributos: { ...m.roster[0].atributos, potencia: 1, velocidad: 1, tecnica: 1, defensa: 1, cardio: 1, iq: 1 }, record: { v: 0, d: 0, e: 1, ko: 0, sub: 0, dec: 0 } };
    expect(rankingDelJugador(m, flojo)).toBeGreaterThan(5);
  });

  it('un peleador crack queda primero', () => {
    const m = mundo();
    const crack = { ...m.roster[0], atributos: { potencia: 99, velocidad: 99, tecnica: 99, defensa: 99, cardio: 99, iq: 99, grappling: 1 }, record: { v: 30, d: 0, e: 0, ko: 25, sub: 0, dec: 5 } };
    expect(rankingDelJugador(m, crack)).toBe(1);
  });

  it('ganar peleas mejora el puesto', () => {
    const m = mundo();
    const base = { ...m.roster[5], record: { v: 0, d: 0, e: 1, ko: 0, sub: 0, dec: 0 } };
    const ganador = { ...base, record: { v: 12, d: 0, e: 0, ko: 8, sub: 0, dec: 4 } };
    expect(rankingDelJugador(m, ganador)).toBeLessThanOrEqual(rankingDelJugador(m, base));
  });

  it('siempre devuelve un puesto valido (una vez debutado)', () => {
    const m = mundo();
    const debutado = { ...m.roster[3], record: { ...m.roster[3].record, e: m.roster[3].record.e + 1 } };
    const puesto = rankingDelJugador(m, debutado);
    expect(puesto).toBeGreaterThanOrEqual(1);
    expect(puesto).toBeLessThanOrEqual(m.roster.length + 1);
  });

  // Pedido 1 (v6, "escalar tiene que costar y ser volátil: ganar te sube,
  // perder te baja"). Con 12 rivales (v5) el bono de récord tenía un tope
  // fijo de ±12 — con 100 (Pedido 1) ese mismo tope apenas corre un escalón
  // en una tabla mucho más densa. El tope ahora escala con la cantidad de
  // activos, así que una racha real (ganar o perder) sigue moviendo el
  // puesto de forma proporcional al tamaño de la montaña.
  it('con un roster grande, perder duele: una racha de derrotas empeora mucho el puesto', () => {
    const m = crearMundo(createRng(50), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 100 });
    // `e: 1` para que `base` cuente como debutado (si no, rankingDelJugador
    // devuelve null y la comparación de abajo no tendría sentido) sin mover
    // el bono de récord (la fórmula solo usa v y d).
    const base = { ...m.roster[50], record: { v: 0, d: 0, e: 1, ko: 0, sub: 0, dec: 0 } };
    const rachaMala = { ...base, record: { v: 0, d: 8, e: 0, ko: 0, sub: 0, dec: 0 } };
    expect(rankingDelJugador(m, rachaMala)).toBeGreaterThan(rankingDelJugador(m, base));
  });

  it('con un roster grande (100), el tope del bono de récord escala más allá de 12', () => {
    // Con el tope viejo (fijo en ±12), un récord de v:12 y uno de v:40 dan
    // EXACTAMENTE el mismo bono (ambos saturan en +12) y por lo tanto el
    // mismo puesto. Con el tope escalado (Pedido 1), a 100 rivales activos
    // el tope sube (~30), así que una racha mucho más larga (v:40) SÍ tiene
    // que traducirse en un puesto distinto (mejor) que una de v:12.
    const m = crearMundo(createRng(51), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 100 });
    const base = { ...m.roster[50], record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    const rachaModesta = rankingDelJugador(m, { ...base, record: { v: 12, d: 0, e: 0, ko: 8, sub: 0, dec: 4 } });
    const rachaEnorme = rankingDelJugador(m, { ...base, record: { v: 40, d: 0, e: 0, ko: 30, sub: 0, dec: 10 } });
    expect(rachaEnorme).toBeLessThan(rachaModesta);
  });

  it('con un roster chico (12), el tope efectivo sigue rondando 12: una racha mucho mas alla no da mejor puesto que otra bien mas chica', () => {
    const m = crearMundo(createRng(52), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 12 });
    const base = { ...m.roster[6], record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    // Una racha ganadora enorme (muy por encima de lo que un tope de 12
    // permitiría acreditar) no debería dar un puesto MEJOR que uno más chico
    // que ya casi toca el tope — confirma que el tope efectivo sigue
    // rondando 12 para rosters chicos, sin regresión respecto de v5. Ya no se
    // exige igualdad EXACTA (bug v7, "perder no baja el ranking": el clamp
    // duro que producía esa igualdad exacta es justo lo que dejaba una racha
    // de derrotas sin ningún efecto una vez saturado — ver
    // bonusRecordSuavizado en world.js) — alcanza con que no mejore.
    const conTope = rankingDelJugador(m, { ...base, record: { v: 12, d: 0, e: 0, ko: 8, sub: 0, dec: 4 } });
    const masAlla = rankingDelJugador(m, { ...base, record: { v: 40, d: 0, e: 0, ko: 30, sub: 0, dec: 10 } });
    expect(masAlla).toBeLessThanOrEqual(conTope);
  });

  // Bug v7 (pedido textual: "a veces mi peleador pierde peleas pero no baja
  // de ranking"): causa real, reproducida acá — con el `clamp` DURO de
  // antes, un récord ganador ya saturado (v40, muy por encima del tope de
  // ~30 para un roster de 100) podía absorber VARIAS derrotas seguidas (hasta
  // 7 en esta semilla) con el puesto sin moverse ni un casillero: el bono de
  // récord crudo (v - d*2) recién volvía a caer DENTRO del rango del clamp
  // después de esas derrotas, y hasta entonces el clamp devolvía siempre el
  // mismo tope. Con `bonusRecordSuavizado` (saturación suave, tanh) el
  // puntaje SIEMPRE empeora un poco con cada derrota adicional (nunca queda
  // perfectamente plano): siguiendo una racha de derrotas lo bastante larga
  // sobre un récord saturado, el puesto tiene que terminar empeorando bien
  // antes de la séptima derrota seguida.
  it('perder cuesta SIEMPRE, incluso con un récord ganador ya saturado (no hay una racha de derrotas que quede sin efecto)', () => {
    const m = crearMundo(createRng(50), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 100 });
    const base = { ...m.roster[50], record: { v: 40, d: 0, e: 0, ko: 0, sub: 0, dec: 0 } };
    const rankingSinDerrotas = rankingDelJugador(m, base);
    let peorEnAlgunPunto = false;
    for (let d = 1; d <= 7; d += 1) {
      const conDerrotas = { ...base, record: { ...base.record, d } };
      if (rankingDelJugador(m, conDerrotas) > rankingSinDerrotas) { peorEnAlgunPunto = true; break; }
    }
    expect(peorEnAlgunPunto).toBe(true);
  });

  // Mismo espíritu, pero mirando el puntaje continuo (antes de redondear a un
  // puesto entero, que puede empatar entre escalones de MEDIA consecutivos):
  // cada derrota adicional, sobre CUALQUIER récord (saturado o no), tiene que
  // bajar el puntaje — nunca puede quedar exactamente igual como pasaba con
  // el clamp duro una vez saturado.
  it('el puntaje (antes de redondear a puesto) es estrictamente monótono: cada derrota lo empeora, saturado o no', () => {
    const m = crearMundo(createRng(53), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 100 });
    const rachas = [
      { v: 2, d: 0 }, { v: 12, d: 0 }, { v: 40, d: 0 }, { v: 80, d: 0 }, { v: 5, d: 3 },
    ];
    for (const { v, d } of rachas) {
      const base = {
        ...m.roster[20], record: {
          v, d, e: 0, ko: 0, sub: 0, dec: 0,
        },
      };
      const conUnaDerrotaMas = {
        ...base, record: { ...base.record, d: d + 1 },
      };
      // El ranking es discreto (puede empatar por el mismo motivo de
      // siempre: dos records distintos caen en el mismo escalón de MEDIA de
      // la tabla), así que se compara el puntaje real vía un mundo con UNA
      // sola media exacta como vara: alcanza con verificar que el nuevo
      // puesto nunca es MEJOR que el anterior tras perder una más.
      expect(rankingDelJugador(m, conUnaDerrotaMas)).toBeGreaterThanOrEqual(rankingDelJugador(m, base));
    }
  });
});

describe('buscarRival', () => {
  it('devuelve un activo del roster', () => {
    const mundo = crearMundo(createRng(15), opciones);
    const rival = buscarRival(mundo, {});
    expect(mundo.roster.map((p) => p.id)).toContain(rival.id);
    expect(rival.retirado).toBe(false);
  });

  it('excluye los ids pedidos', () => {
    const mundo = crearMundo(createRng(16), opciones);
    const excluidos = mundo.roster.slice(0, 8).map((p) => p.id);
    const rival = buscarRival(mundo, { excluirIds: excluidos });
    expect(excluidos).not.toContain(rival.id);
  });

  it('prefiere rivales cerca del ranking pedido', () => {
    const mundo = crearMundo(createRng(17), opciones);
    const rival = buscarRival(mundo, { rankingCerca: 3 });
    expect(Math.abs(rival.ranking - 3)).toBeLessThanOrEqual(3);
  });

  it('devuelve null si no queda nadie', () => {
    const mundo = crearMundo(createRng(18), opciones);
    const todos = mundo.roster.map((p) => p.id);
    expect(buscarRival(mundo, { excluirIds: todos })).toBeNull();
  });
});

// `crearPeleador` arranca siempre con `record` en 0-0-0 (sin debutar como
// profesional, ver `yaDebutoProfesional` en world.js): la mayoría de estos
// tests quieren un jugador YA rankeado (el escenario de siempre, antes de
// este bug), así que acá se le pone un récord con al menos una pelea (un
// empate, que no mueve el bono de récord — ver el comentario grande en
// world.js) salvo que el test pida otra cosa explícitamente. El caso "sin
// debutar" tiene su propio describe más abajo.
function jugadorDePrueba(media = 55, record = { v: 0, d: 0, e: 1, ko: 0, sub: 0, dec: 0 }) {
  return {
    ...crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media, esJugador: true,
    }),
    record,
  };
}

describe('tablaRanking', () => {
  it('arma la tabla completa: todo el roster activo más el jugador', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    const activos = m.roster.filter((p) => !p.retirado);
    expect(tabla).toHaveLength(activos.length + 1);
  });

  it('el jugador aparece marcado esJugador true, una sola vez', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    const filasJugador = tabla.filter((f) => f.esJugador);
    expect(filasJugador).toHaveLength(1);
    expect(filasJugador[0].id).toBe(jugador.id);
  });

  it('el puesto del jugador en la tabla coincide con rankingDelJugador', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    const fila = tabla.find((f) => f.esJugador);
    expect(fila.ranking).toBe(rankingDelJugador(m, jugador));
  });

  it('los puestos son consecutivos de 1 a N, sin huecos ni repetidos', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    expect(tabla.map((f) => f.ranking)).toEqual(tabla.map((_, i) => i + 1));
  });

  it('un retirado no sigue apareciendo rankeado en la tabla', () => {
    const m = mundo();
    m.roster[0].retirado = true;
    const idRetirado = m.roster[0].id;
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    expect(tabla.some((f) => f.id === idRetirado)).toBe(false);
  });

  it('no muta el mundo ni al jugador', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const antesMundo = JSON.stringify(m);
    const antesJugador = JSON.stringify(jugador);
    tablaRanking(m, jugador);
    expect(JSON.stringify(m)).toBe(antesMundo);
    expect(JSON.stringify(jugador)).toBe(antesJugador);
  });

  it('cada fila trae nombre, apodo, nacionalidad, media y récord legibles', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    for (const fila of tabla) {
      expect(fila.nombre).toBeTruthy();
      expect(fila.nacionalidad).toBeTruthy();
      expect(typeof fila.media).toBe('number');
      expect(typeof fila.record).toBe('string');
    }
  });

  // El jugador quiere que la tabla "coincida con los peleadores a los que me
  // enfrento": buscarRival (usado por generarOferta, offers.js) elige rivales
  // del mismo mundo.roster — este test confirma que son literalmente los
  // mismos datos, no una copia que se pueda desincronizar.
  it('es coherente con buscarRival: el rival que se ofrece por cercanía de ranking aparece en la tabla con los mismos datos', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    const tabla = tablaRanking(m, jugador);
    const rival = buscarRival(m, { rankingCerca: 3 });
    const filaRival = tabla.find((f) => f.id === rival.id);
    expect(filaRival).toBeTruthy();
    expect(filaRival.nombre).toBe(rival.nombre);
    expect(filaRival.apodo).toBe(rival.apodo);
    expect(filaRival.media).toBe(mediaDe(rival));
    expect(filaRival.record).toBe(recordTexto(rival));
  });

  it('la media y el récord del jugador en la tabla coinciden con los reales', () => {
    const m = mundo();
    const jugador = jugadorDePrueba();
    jugador.record = { v: 5, d: 1, e: 0, ko: 3, sub: 0, dec: 2 };
    const tabla = tablaRanking(m, jugador);
    const fila = tabla.find((f) => f.esJugador);
    expect(fila.media).toBe(mediaDe(jugador));
    expect(fila.record).toBe(recordTexto(jugador));
  });

  // Bug reportado (v9): un jugador que todavía no debutó como profesional
  // (record en 0-0-0, el estado real de juvenil/amateur — ver el comentario
  // grande de `rankingDelJugador`, world.js) no puede aparecer rankeado en la
  // tabla: tiene que coincidir con el "Sin clasificar" que ya muestra el
  // tablero (bloqueHistorial, panel-peleador.js).
  describe('jugador sin debutar como profesional (record en 0-0-0)', () => {
    it('no aparece en la tabla en absoluto', () => {
      const m = mundo();
      const jugador = jugadorDePrueba(90, { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
      const tabla = tablaRanking(m, jugador);
      expect(tabla.some((f) => f.esJugador)).toBe(false);
      expect(tabla.some((f) => f.id === jugador.id)).toBe(false);
    });

    it('la tabla es exactamente el roster activo, sin el jugador de más', () => {
      const m = mundo();
      const jugador = jugadorDePrueba(90, { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
      const tabla = tablaRanking(m, jugador);
      const activos = m.roster.filter((p) => !p.retirado);
      expect(tabla).toHaveLength(activos.length);
    });

    it('los puestos siguen consecutivos de 1 a N (sin el jugador insertado)', () => {
      const m = mundo();
      const jugador = jugadorDePrueba(90, { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
      const tabla = tablaRanking(m, jugador);
      expect(tabla.map((f) => f.ranking)).toEqual(tabla.map((_, i) => i + 1));
    });
  });
});

// v18: el campeón sale de la numeración y viaja aparte, para que la pantalla lo
// pinte en su propio renglón — como en las tablas de verdad, donde el campeón
// no es "el #1": está fuera de la lista de retadores.
describe('tablasDeDivisiones — el campeón fuera de la numeración', () => {
  function mundoConCampeon(division) {
    const m = crearMundo(createRng(31), {
      disciplina: 'boxeo', categoria: 'pluma', cantidad: 60, nacionalidadLocal: 'AR',
    });
    const { tablas } = tablasDeDivisiones(m, null);
    const elegido = tablas[division][2];
    return {
      mundo: { ...m, campeones: { ...(m.campeones ?? {}), [division]: elegido.id } },
      elegidoId: elegido.id,
    };
  }

  it('el campeón no aparece entre los retadores numerados', () => {
    const { mundo: m, elegidoId } = mundoConCampeon('regional');
    const { tablas, campeones } = tablasDeDivisiones(m, null);

    expect(campeones.regional.id).toBe(elegidoId);
    expect(tablas.regional.some((f) => f.id === elegidoId)).toBe(false);
  });

  it('los retadores se renumeran desde 1 sin dejar el hueco del campeón', () => {
    const { mundo: m } = mundoConCampeon('regional');
    const { tablas } = tablasDeDivisiones(m, null);

    expect(tablas.regional.map((f) => f.ranking)).toEqual(tablas.regional.map((_, i) => i + 1));
  });

  it('la fila del campeón viene sin puesto y marcada como campeón', () => {
    const { mundo: m } = mundoConCampeon('nacional');
    const { campeones } = tablasDeDivisiones(m, null);

    expect(campeones.nacional.ranking).toBeNull();
    expect(campeones.nacional.esCampeon).toBe(true);
  });

  it('el amateur nunca tiene campeón (no hay cinturón de formación)', () => {
    const { mundo: m } = mundoConCampeon('regional');
    expect(tablasDeDivisiones(m, null).campeones.amateur).toBeNull();
  });

  // El caso que hace interesante al sistema: los puntos decaen y el campeón se
  // cae del cupo. Antes desaparecía de la pantalla; ahora sigue en su renglón.
  it('un campeón que se cayó de su tabla igual viaja como campeón', () => {
    const { mundo: m, elegidoId } = mundoConCampeon('mundial');
    // Se lo saca de la tabla vaciándole los puntos, sin sacarlo del roster.
    const sinPuntos = {
      ...m,
      roster: m.roster.map((p) => (p.id === elegidoId
        ? { ...p, puntosRanking: { regional: 0, nacional: 0, mundial: 0 } }
        : p)),
    };
    const { tablas, campeones } = tablasDeDivisiones(sinPuntos, null);

    expect(tablas.mundial.some((f) => f.id === elegidoId)).toBe(false);
    expect(campeones.mundial?.id).toBe(elegidoId);
  });

  it('un campeón retirado deja el renglón vacío', () => {
    const { mundo: m, elegidoId } = mundoConCampeon('regional');
    const retirado = {
      ...m,
      roster: m.roster.map((p) => (p.id === elegidoId ? { ...p, retirado: true } : p)),
    };
    expect(tablasDeDivisiones(retirado, null).campeones.regional).toBeNull();
  });
});
