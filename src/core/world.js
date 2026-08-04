import { crearRoster, generarDebutantes, FRACCION_LOCAL_AMATEUR } from './roster.js';
import {
  campeonesIniciales, puntajeDe, rankingsDe, DIVISIONES, CUPO_ELITE_NACIONAL,
  fotoDeRankings, puestosDelCruce,
} from './divisiones.js';
import { aplicarPuntos, decaerPuntos } from './puntos-ranking.js';
import { mediaDe, recordTexto } from './fighter.js';
import { clamp } from './stats.js';
import { rendimientoDeMejora } from './talento.js';
// `rankingDelJugador` (más abajo) es lo que habilita las peleas de título:
// sin ranking, el jugador nunca calificaría para disputar un cinturón.

export const EDAD_RETIRO = 40;
export const ANIO_INICIAL = 2026;

/**
 * Ordena a los activos de forma que, al tomarlos de a dos, la enorme mayoría de
 * los cruces caiga DENTRO de un mismo país: se pelea en el circuito de casa, y
 * de vez en cuando se cruza la frontera.
 *
 * Es lo que alimenta las escaleras nacionales (ver fotoDeRankings y
 * puestosDelCruce, divisiones.js): regional y nacional son tablas de un país,
 * así que solo un cruce entre compatriotas las mueve. Con el sorteo global de
 * antes y doce países en juego, casi ningún cruce caía dentro del mismo país y
 * los rankings nacionales se quedaban sin nada que los moviera.
 *
 * Los impares de cada país (uno como mucho por país) se juntan al final y se
 * emparejan entre ellos: esos son los cruces internacionales, que existen,
 * mueven solo el mundial, y son minoría — igual que en el boxeo de verdad.
 *
 * Determinista con la semilla, como todo acá: usa `rng.shuffle`, nunca
 * Math.random.
 */
export function emparejarPorPais(rng, activos) {
  const porPais = new Map();
  for (const peleador of activos) {
    const pais = peleador.nacionalidad ?? '??';
    if (!porPais.has(pais)) porPais.set(pais, []);
    porPais.get(pais).push(peleador);
  }

  const ordenado = [];
  const sobrantes = [];
  // El orden de recorrida sale del array de entrada (que ya viene barajado por
  // quien llama), no del orden de inserción del Map: así dos años con el mismo
  // roster pero distinto sorteo no arman siempre las mismas parejas.
  for (const paisanos of porPais.values()) {
    const mezclados = rng.shuffle(paisanos);
    if (mezclados.length % 2 === 1) sobrantes.push(mezclados.pop());
    ordenado.push(...mezclados);
  }
  ordenado.push(...rng.shuffle(sobrantes));
  return ordenado;
}

// Cuántos de los activos son "la parte alta de la tabla" (ver avanzarMundo):
// sus peleas entre sí SÍ generan noticia; el resto de la categoría igual
// pelea y su récord igual se actualiza, pero sin ensuciar el feed. Coincide
// a propósito con el rankingMax más generoso de CINTURONES (offers.js,
// "Cinturón regional"): es la misma "parte alta" que le importa al jugador.
export const TAMANO_ELITE = 20;

// El circuito amateur es chico a propósito: son tres años de formación, no
// una carrera paralela. Alcanza para que el ranking amateur tenga cuerpo sin
// inflar el guardado.
export const CANTIDAD_AMATEUR = 24;

// Cuántos peleadores del país del jugador tiene que haber SIEMPRE en
// actividad. Es el piso que sostiene las divisiones regional y nacional: por
// debajo de esto la escalera local se queda sin escalones.
// v18: 26 -> 46, escalado junto con CANTIDAD_MUNDO (100 -> 180, career.js). El
// piso protege exactamente lo mismo que antes — que la escalera local no se
// quede sin escalones — pero medido contra un mundo casi el doble de grande.
export const MINIMO_LOCALES = 46;

export function crearMundo(rng, {
  disciplina, categoria, cantidad = 10, apodosReservados = [], nacionalidadLocal = null,
}) {
  const roster = crearRoster(rng, {
    disciplina, categoria, cantidad, apodosReservados, nacionalidadLocal,
  });
  // El circuito amateur: pool propio, más chico y más flojo, SIN un solo
  // nombre en común con el profesional (pedido v17.5). No se cruza nunca con
  // `roster`: son dos mundos distintos, y el jugador pasa del primero al
  // segundo cuando debuta.
  const rosterAmateur = crearRoster(rng, {
    disciplina,
    categoria,
    cantidad: CANTIDAD_AMATEUR,
    apodosReservados: [...apodosReservados, ...roster.map((p) => p.apodo).filter(Boolean)],
    nombresReservados: roster.map((p) => p.nombre),
    nacionalidadLocal,
    // Casi todo local: el circuito amateur es el torneo de tu país, con algún
    // extranjero suelto (relación 6 a 1, pedido v17.12).
    fraccionLocal: FRACCION_LOCAL_AMATEUR,
    usarParodias: false,
  });
  return {
    disciplina,
    categoria,
    roster,
    rosterAmateur,
    anio: ANIO_INICIAL,
    // El país del jugador: lo necesitan las divisiones regional y nacional,
    // que son rankings DE SU PAÍS (ver divisiones.js).
    nacionalidadLocal,
    campeonId: roster[0]?.id ?? null,
    titulares: [],
    // Quién tiene puesto cada cinturón. Antes esto no existía: `campeonId`
    // era uno solo y solo alimentaba noticias, así que se podía disputar "el
    // mundial" contra alguien que jamás lo había ganado (bug reportado). Se
    // arranca con el #1 de cada división y a partir de ahí solo cambia
    // peleando.
    campeones: campeonesIniciales({ roster, nacionalidadLocal }),
  };
}

// El mundo también pelea por sus cinturones (v17.11).
//
// Reportado: "el campeón dice ser el #9, ¿eso está bien?". Estaba mal, y la
// causa era que los cinturones solo cambiaban de manos cuando peleaba EL
// JUGADOR. Los campeones NPC quedaban congelados mientras el ranking seguía
// moviéndose, así que con los años el campeón derivaba hacia abajo y terminaba
// siendo el #9 de su propia división sin que nadie se lo hubiera sacado.
//
// Ahora, cada vez que avanza el mundo, cada cinturón NPC se defiende contra el
// mejor contendiente de su división. La probabilidad sale de la diferencia de
// puntaje —el mismo criterio que el resto de los combates NPC— así que un
// campeón que sigue siendo el mejor retiene casi siempre, y uno que se quedó
// atrás termina perdiéndolo. El cinturón del JUGADOR nunca se toca acá: ese
// solo cambia peleando de verdad.
export function defenderCinturonesNpc(rng, {
  campeones, roster, nacionalidadLocal = null, jugadorId = null,
}) {
  const activos = (roster ?? []).filter((p) => !p.retirado);
  const resultado = { ...(campeones ?? {}) };

  for (const cinturonId of ['regional', 'nacional', 'mundial']) {
    const campeonId = resultado[cinturonId];
    // El del jugador no se toca: sus defensas se juegan, no se simulan.
    if (!campeonId || campeonId === jugadorId) continue;

    const campeon = activos.find((p) => p.id === campeonId);
    if (!campeon) {
      // Se retiró: queda vacante y lo hereda el mejor de esa división.
      resultado[cinturonId] = mejorDeDivision(activos, cinturonId, nacionalidadLocal)?.id ?? null;
      continue;
    }

    // Un campeón regional que ascendió a la elite nacional ya no pertenece a
    // su división: deja el cinturón vacante y lo hereda el mejor de los que sí
    // están ahí. Es lo que pasa en el boxeo de verdad cuando alguien se le va
    // grande a un título, y evita el absurdo de un campeón que no figura en su
    // propia tabla.
    if (!perteneceADivision(activos, campeon, cinturonId, nacionalidadLocal)) {
      resultado[cinturonId] = mejorDeDivision(activos, cinturonId, nacionalidadLocal)?.id ?? null;
      continue;
    }

    const retador = mejorDeDivision(activos, cinturonId, nacionalidadLocal, campeonId);
    if (!retador) continue;

    const ventaja = puntajeDe(campeon) - puntajeDe(retador);
    // Sesgo de campeón: en boxeo el título no se pierde por poco. Con
    // puntajes parejos el campeón retiene ~65% de las veces.
    const probRetiene = clamp(0.65 + ventaja * 0.02, 0.15, 0.95);
    if (!rng.chance(probRetiene)) resultado[cinturonId] = retador.id;
  }
  return resultado;
}

// ¿Este peleador sigue perteneciendo a esa división? Solo el regional puede
// dejar a alguien afuera: nacional y mundial incluyen a todo el que califica.
function perteneceADivision(activos, peleador, cinturonId, nacionalidadLocal) {
  if (cinturonId === 'mundial') return true;
  if (peleador.nacionalidad !== nacionalidadLocal) return false;
  if (cinturonId === 'nacional') return true;
  const delPais = [...activos]
    .filter((p) => p.nacionalidad === nacionalidadLocal)
    .sort((a, b) => puntajeDe(b) - puntajeDe(a));
  return delPais.slice(CUPO_ELITE_NACIONAL).some((p) => p.id === peleador.id);
}

// El mejor de una división, para elegir retador o heredero de una vacante.
// Usa el mismo criterio que los rankings (divisiones.js) sobre el roster ya
// ordenado: el regional es la parte de abajo del país, el nacional el país
// entero, el mundial todos.
function mejorDeDivision(activos, cinturonId, nacionalidadLocal, excluirId = null) {
  const porPuntaje = [...activos].sort((a, b) => puntajeDe(b) - puntajeDe(a));
  if (cinturonId === 'mundial') return porPuntaje.find((p) => p.id !== excluirId) ?? null;

  const delPais = porPuntaje.filter((p) => p.nacionalidad === nacionalidadLocal);
  if (cinturonId === 'nacional') return delPais.find((p) => p.id !== excluirId) ?? null;
  return delPais.slice(CUPO_ELITE_NACIONAL).find((p) => p.id !== excluirId) ?? null;
}

export function recalcularRankings(roster) {
  const activos = roster.filter((p) => !p.retirado).sort((a, b) => mediaDe(b) - mediaDe(a));
  const retirados = roster.filter((p) => p.retirado);
  activos.forEach((p, i) => { p.ranking = i + 1; });
  retirados.forEach((p) => { p.ranking = null; });
  return [...activos, ...retirados];
}

function clonarRoster(roster) {
  return roster.map((p) => ({
    ...p,
    atributos: { ...p.atributos },
    especiales: { ...p.especiales },
    estado: { ...p.estado },
    record: { ...p.record },
    recordAmateur: { ...(p.recordAmateur ?? { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 }) },
    titulos: [...p.titulos],
    staff: [...p.staff],
    lujos: [...p.lujos],
    historial: [...p.historial],
    historialAmateur: [...(p.historialAmateur ?? [])],
  }));
}

// Bloque 6 (hallazgo de balance): esta función seguía escrita para el
// sistema de seis atributos (tecnica/iq/velocidad) que el rediseño v13
// (Bloque 1) reemplazó por los cuatro nuevos — nadie la migró, así que desde
// entonces era casi un no-op: los debutantes ("promesas jóvenes y flojas",
// ver generarDebutantes en roster.js, pensadas para MADURAR con los años)
// nunca crecían de verdad (tecnica/iq no existen), y los veteranos solo
// perdían cardio (velocidad tampoco existe). Medido con una corrida de 24
// años sobre un roster de 100: el techo de la tabla (media del puesto 7,
// la vara del cinturón mundial) se desplomaba de 79 a 49 según avanzaba la
// carrera — la "montaña" (Pedido 1, v6: "tiene que sentirse alta") se
// derretía sola, así que CUALQUIER jugador que progresara aunque fuera un
// poco terminaba dominando un mundo que se había vuelto de cartón. Esa
// caída, no el talento del jugador, era la razón real de fondo por la que
// "al menos un cinturón"/"llegó al mundial" daban ~100% pase lo que pase.
//
// Arreglada sobre los cuatro atributos reales, con el MISMO `talento` que ya
// tiene cada rival (sortearTalento ya corre para todo peleador, jugador o
// no — ver crearPeleador, fighter.js): un debutante también puede ser un
// crack que madura rápido o uno que nunca despega, ni más ni menos que el
// propio jugador. Los umbrales de edad son más simples que los del jugador
// (career.js: EDAD_FIN_CRECIMIENTO/EDAD_DECLIVE_JUGADOR con su escalón
// duro) a propósito — acá no hace falta narrar un arco, solo que la tabla
// se mueva de verdad.
const EDAD_FIN_CRECIMIENTO_MUNDO = 33;
const EDAD_DECLIVE_MUNDO = 34;
const ATRIBUTOS_CON_CRECIMIENTO_MUNDO = ['fuerza', 'defensa', 'cardio', 'agilidad'];
// A diferencia del jugador, un rival no tiene 72 decisiones con cartas
// empujando su MEDIA: este trickle de fondo es TODO lo que tiene para
// crecer. La primera versión de este arreglo escalaba SOLO la magnitud del
// golpe de crecimiento por `rendimiento` (con una chance fija para
// cualquiera): con 100 rivales y 16 años de ventana, hasta el talento más
// flojo terminaba acumulando bastante por pura cantidad de intentos (la
// misma trampa de "ley de los grandes números" que diluía el talento del
// propio jugador antes de este bloque) — la tabla se volvía más alta en
// conjunto, pero el puesto 7 (la vara del mundial) y el puesto 28 (la del
// regional) subían casi PAREJO, así que separar "llega al mundial" de "gana
// al menos un cinturón" pedía magnitudes cada vez más extremas sin lograrlo
// del todo.
//
// Ahora el talento pesa DOS veces, compuesto CUADRÁTICAMENTE:
// `factorMundo = rendimiento²` corre TANTO la chance de que el crecimiento
// se dispare COMO su tamaño (linealmente compuesto, probado antes de esto,
// todavía dejaba que "gana al menos un cinturón" y "llega al mundial" subieran
// casi PAREJO — no alcanzaba con que el talentoso creciera más Y más seguido
// de forma lineal, la cola alta necesitaba despegarse más fuerte). Elevar al
// cuadrado estira la cola alta mucho más de lo que hunde la cola baja
// (rendimiento 1.4 dos veces por encima de 1 da factor ~2 puntos por encima
// de 1; rendimiento 0.5 da factor 0.25, no 0.5): unos pocos rivales de
// verdad se despegan del resto de la tabla — el puesto 7 (mundial) se separa
// del puesto 28 (regional) — en vez de que la tabla entera suba o baje en
// bloque. Es la misma idea de "el techo... es la palanca que más diferencia
// una carrera de otra" (spec v13) aplicada al mundo, no solo al jugador.
const PROB_CRECIMIENTO_MUNDO_BASE = 0.6;
const MAGNITUD_CRECIMIENTO_MUNDO = 12;

function declive(peleador, rng) {
  if (peleador.edad < EDAD_FIN_CRECIMIENTO_MUNDO) {
    const rendimiento = rendimientoDeMejora(peleador, peleador.edad);
    const factorMundo = rendimiento * rendimiento;
    const probCrecimiento = clamp(PROB_CRECIMIENTO_MUNDO_BASE * factorMundo, 0, 0.9);
    for (const clave of ATRIBUTOS_CON_CRECIMIENTO_MUNDO) {
      if (!rng.chance(probCrecimiento)) continue;
      const delta = Math.round(MAGNITUD_CRECIMIENTO_MUNDO * factorMundo);
      if (delta <= 0) continue;
      peleador.atributos[clave] = clamp(peleador.atributos[clave] + delta, 1, 99);
    }
    return;
  }
  if (peleador.edad < EDAD_DECLIVE_MUNDO) return;
  peleador.atributos.agilidad = clamp(peleador.atributos.agilidad - rng.int(1, 3), 1, 99);
  peleador.atributos.cardio = clamp(peleador.atributos.cardio - rng.int(0, 2), 1, 99);
}

/**
 * Avanza el mundo un bloque de carrera.
 *
 * `anio` permite que quien llama imponga el año del calendario. La carrera lo
 * usa siempre: los bloques duran 1 a 1.3 años, así que acumular años enteros
 * acá haría que el mundo se atrasara varios años respecto del calendario y de
 * la edad del jugador. Sin `anio` se cae al conteo propio (útil en tests del
 * mundo aislado). El envejecimiento del roster sigue yendo por `aniosPasados`.
 */
export function avanzarMundo(mundo, rng, {
  aniosPasados = 1, jugadorEsCampeon = false, anio = null, jugadorId = null,
} = {}) {
  const roster = clonarRoster(mundo.roster);
  const sucesos = [];
  let campeonId = mundo.campeonId;

  for (let anio = 0; anio < Math.max(1, Math.round(aniosPasados)); anio++) {
    let retirosEsteAnio = 0;
    for (const peleador of roster) {
      if (peleador.retirado || peleador.esJugador) continue;
      peleador.edad += 1;
      declive(peleador, rng);
      if (peleador.edad >= EDAD_RETIRO) {
        peleador.retirado = true;
        retirosEsteAnio += 1;
        sucesos.push({
          tipo: 'retiro',
          peleadorId: peleador.id,
          texto: `${peleador.nombre} anuncia su retiro a los ${peleador.edad} años.`,
        });
      }
    }

    // Pedido 2 (v6, "el ranking se achica solo... tienen que ir apareciendo
    // nuevos"): cada retiro se repone con un debutante (promesa joven y
    // floja, ver generarDebutantes en roster.js) para que la categoría no se
    // vaya vaciando con los años — el mundo tiene que sentirse vivo, no una
    // cuenta regresiva. `existente` es el roster COMPLETO (activos y
    // retirados): un nombre/apodo que ya se usó no vuelve a aparecer, ni
    // siquiera si el original ya colgó los guantes.
    if (retirosEsteAnio > 0) {
      const debutantes = generarDebutantes(rng, {
        disciplina: mundo.disciplina,
        categoria: mundo.categoria,
        cantidad: retirosEsteAnio,
        existente: roster,
        nacionalidadLocal: mundo.nacionalidadLocal ?? null,
        // Piso del pool local: sin esto el ranking nacional se desarma con los
        // años (medido: de 25 locales a 11 en doce temporadas, con el regional
        // reducido a un solo peleador).
        forzarLocales: Math.max(0, MINIMO_LOCALES - roster.filter(
          (p) => !p.retirado && p.nacionalidad === (mundo.nacionalidadLocal ?? null),
        ).length),
      });
      for (const debutante of debutantes) {
        roster.push(debutante);
        sucesos.push({
          tipo: 'debut',
          peleadorId: debutante.id,
          texto: debutante.apodo
            ? `Debuta "${debutante.apodo}" ${debutante.nombre}: una cara nueva en la categoría.`
            : `Debuta ${debutante.nombre}: una cara nueva en la categoría.`,
        });
      }
    }

    const activos = roster.filter((p) => !p.retirado && !p.esJugador);
    // Pedido 1 (v6, "cuidá el rendimiento... simular en detalle solo la
    // parte alta de la tabla y resolver el resto de forma más barata"): con
    // 100 activos, cada año arma ~50 pares — generar una noticia por CADA
    // uno inundaba el feed (cap de 30, ver agregarNoticias en news.js) en un
    // solo bloque, algo que nunca pasaba con 12 rivales (~6 pares). El
    // resultado (récord, KO/decisión, título si corresponde) se sigue
    // resolviendo IGUAL para todos los pares — nadie deja de "vivir" ni de
    // subir su récord —; lo que se recorta es la noticia de "fulano le ganó
    // a mengano", que solo se emite si alguno de los dos está entre los
    // TAMANO_ELITE mejores del momento (la parte alta de la tabla es la que
    // de verdad le importa al jugador: rivales de título, futuros
    // adversarios cercanos a su propio puesto).
    const elite = new Set(
      [...activos].sort((x, y) => mediaDe(y) - mediaDe(x)).slice(0, TAMANO_ELITE).map((p) => p.id),
    );
    // Foto de los rankings ANTES de la tanda de peleas del año: todos los
    // cruces se puntúan contra la misma tabla. Es la de CADA país (más el
    // mundial), no solo la del país del jugador — ver fotoDeRankings,
    // divisiones.js, para por qué eso importa.
    const fotoRankings = fotoDeRankings(roster);
    const pelearonEsteAnio = new Set();

    // Las carteleras se arman sobre todo entre compatriotas: se pelea en el
    // circuito de tu país y de vez en cuando cruzás la frontera. Antes el
    // sorteo era global —cualquiera contra cualquiera del planeta—, y eso
    // dejaba las escaleras nacionales sin alimento: con doce países, casi
    // ningún cruce caía dentro de un mismo país, así que el ranking nacional
    // de cada uno se movía poquísimo y sus puntos solo bajaban. Emparejar de
    // local primero es a la vez lo más creíble y lo que hace que la cadena
    // regional -> nacional -> mundial tenga de dónde nutrirse.
    const mezclados = emparejarPorPais(rng, rng.shuffle(activos));
    for (let i = 0; i + 1 < mezclados.length; i += 2) {
      const a = mezclados[i];
      const b = mezclados[i + 1];
      const fuerza = mediaDe(a) - mediaDe(b);
      const probA = clamp(0.5 + fuerza * 0.02, 0.1, 0.9);
      const ganador = rng.chance(probA) ? a : b;
      const perdedor = ganador === a ? b : a;
      const porKo = rng.chance(0.35);
      ganador.record.v += 1;
      if (porKo) ganador.record.ko += 1; else ganador.record.dec += 1;
      perdedor.record.d += 1;

      // Los puntos de ranking de los NPC se mueven igual que los del jugador
      // (v18): según en qué divisiones estaba CADA UNO y en qué puesto. Por eso
      // el mundo se reordena solo — un peleador que encadena victorias contra
      // rankeados sube de verdad, y uno que pierde contra cualquiera se cae.
      // Se calcula con la foto de puestos tomada ANTES de la tanda, para que
      // todos los cruces del año se resuelvan contra el mismo ranking y no
      // dependa del orden en que salieron sorteados.
      //
      // `puestosDelCruce` es el que sabe qué divisiones comparten los dos: el
      // mundial siempre, y regional/nacional solo entre compatriotas (son
      // escaleras de un país).
      const [puestosDeA, puestosDeB] = puestosDelCruce(fotoRankings, a, b);
      const puestosGanador = ganador === a ? puestosDeA : puestosDeB;
      const puestosPerdedor = ganador === a ? puestosDeB : puestosDeA;
      ganador.puntosRanking = aplicarPuntos(ganador, {
        resultado: 'v', misPuestos: puestosGanador, puestosRival: puestosPerdedor,
      });
      perdedor.puntosRanking = aplicarPuntos(perdedor, {
        resultado: 'd', misPuestos: puestosPerdedor, puestosRival: puestosGanador,
      });
      pelearonEsteAnio.add(ganador.id);
      pelearonEsteAnio.add(perdedor.id);
      if (elite.has(a.id) || elite.has(b.id)) {
        sucesos.push({
          tipo: 'victoria',
          peleadorId: ganador.id,
          rivalId: perdedor.id,
          texto: porKo
            ? `${ganador.nombre} noqueó a ${perdedor.nombre}.`
            : `${ganador.nombre} le ganó por puntos a ${perdedor.nombre}.`,
        });
      }
      // Mientras el jugador tiene puesto el cinturón mundial, el mundo no
      // corona a nadie más: campeonId sigue apuntando a lo que apuntaba antes
      // (no importa, no se muestra en ningún lado) y no se emite el suceso
      // que el feed de noticias convertiría en "¡X es el nuevo campeón!".
      if (!jugadorEsCampeon && perdedor.id === campeonId) {
        campeonId = ganador.id;
        ganador.titulos.push(`Título ${mundo.categoria}`);
        sucesos.push({
          tipo: 'titulo',
          peleadorId: ganador.id,
          rivalId: perdedor.id,
          texto: `¡${ganador.nombre} es el nuevo campeón: le arrebató el cinturón a ${perdedor.nombre}!`,
        });
      }
    }

    // El ranking no perdona la inactividad (pedido del usuario): el que no
    // peleó este año pierde puntos en todas sus divisiones. Sin esto, un
    // peleador podía quedarse arriba para siempre sin subirse al ring.
    for (const peleador of roster) {
      if (peleador.retirado || pelearonEsteAnio.has(peleador.id)) continue;
      peleador.puntosRanking = decaerPuntos(peleador.puntosRanking, []);
    }
  }

  const ordenado = recalcularRankings(roster);
  // Misma razón: si el jugador es el campeón, no hay vacante que declarar
  // aunque el NPC que ocupaba campeonId se haya retirado en este avance.
  if (!jugadorEsCampeon) {
    const campeonSigueActivo = ordenado.some((p) => p.id === campeonId && !p.retirado);
    if (!campeonSigueActivo) {
      const nuevo = ordenado.find((p) => !p.retirado);
      campeonId = nuevo ? nuevo.id : null;
      if (nuevo) {
        sucesos.push({
          tipo: 'titulo',
          peleadorId: nuevo.id,
          texto: `${nuevo.nombre} queda como campeón con el cinturón vacante.`,
        });
      }
    }
  }

  return {
    mundo: {
      ...mundo,
      roster: ordenado,
      anio: anio ?? mundo.anio + Math.round(aniosPasados),
      campeonId,
      titulares: [...mundo.titulares],
      campeones: defenderCinturonesNpc(rng, {
        campeones: mundo.campeones,
        roster: ordenado,
        nacionalidadLocal: mundo.nacionalidadLocal ?? null,
        jugadorId,
      }),
      rosterAmateur: mundo.rosterAmateur,
      nacionalidadLocal: mundo.nacionalidadLocal ?? null,
    },
    sucesos,
  };
}

// Fracción de los activos que define el tope del bono de récord (ver más
// abajo): con 12 rivales (v5) daría ~4, muy por debajo del piso de 12 que ya
// tenía el juego, así que `Math.max` deja ese piso viejo intacto para
// rosters chicos (los que ya usan varios tests) y solo escala hacia arriba
// con rosters grandes.
const FRACCION_TOPE_BONUS_RECORD = 0.3;
const TOPE_BONUS_RECORD_MINIMO = 12;

/**
 * Ranking del jugador dentro de su categoría: cuántos activos del roster lo
 * superan. El jugador no vive en el roster, así que su puesto se calcula
 * comparando MEDIA y ajustando por su récord (ganar te acerca a la cima,
 * perder te aleja).
 *
 * Pedido 1 (v6, "escalar tiene que costar y ser volátil"): con 12 rivales el
 * bono de récord tenía un tope fijo de ±12 — cubría casi toda la tabla. Con
 * el roster de 100 (la "montaña") ese mismo tope apenas corre un escalón en
 * una tabla mucho más densa, así que deja de sentirse ganado. El tope ahora
 * escala con la cantidad de activos (`FRACCION_TOPE_BONUS_RECORD`), sin bajar
 * nunca del piso de 12 que ya tenía el juego: una racha sostenida de verdad
 * (ganar mucho, o perder mucho) mueve el puesto en proporción al tamaño real
 * de la categoría, sea de 12 o de 100.
 *
 * Bug reportado (v7, "a veces mi peleador pierde peleas pero no baja de
 * ranking"): con un `clamp` DURO, `bonusRecord` (crudo, sin recortar) puede
 * irse bien lejos del `tope` — cualquier boxeador que juega bien acumula
 * muchas más victorias que derrotas con el correr de la carrera (es LITERAL
 * el objetivo de balance del juego, ver ETAPAS en career.js), así que hacia
 * la mitad/final de una carrera exitosa el bono crudo satura de sobra el
 * tope. Una vez saturado, el clamp devuelve el MISMO valor recortado
 * (`tope`) pase lo que pase con más derrotas — así que hacían falta VARIAS
 * derrotas seguidas (medido: hasta 7-8 en una racha típica de un campeón)
 * antes de que el bono crudo volviera a caer DENTRO del rango y el puesto
 * recién ahí empezara a moverse. Perder de verdad no costaba nada, muchas
 * veces seguidas, justo al jugador que más lo iba a notar (el que viene
 * ganando).
 *
 * `bonusRecordSuavizado` reemplaza el clamp duro por una saturación SUAVE
 * (tanh): para valores chicos de `bonusRecord` (la mayoría de la carrera, muy
 * por debajo del tope) se comporta casi idéntico al clamp de siempre —
 * tanh(x) ≈ x para x chico —, así que no cambia el balance ya calibrado en el
 * rango normal de juego. Pero a diferencia del clamp, tanh nunca es
 * perfectamente plana: sigue creciendo (muy despacio) más allá del tope, así
 * que CUALQUIER derrota adicional —por más saturado que esté el historial—
 * mueve el puntaje un poco, nunca cero. Con suficientes derrotas seguidas
 * eso siempre termina cruzando el próximo escalón de MEDIA de la tabla y el
 * puesto se resiente — "perder cuesta", garantizado matemáticamente, no solo
 * en el caso común.
 */
function bonusRecordSuavizado(bonusRecordCrudo, tope) {
  if (tope <= 0) return 0;
  return tope * Math.tanh(bonusRecordCrudo / tope);
}

// Bug reportado (v9: "en juvenil aparece como #101 en la tabla; en amateur
// salta a #81 sin haber peleado nunca — y el tablero dice 'Sin clasificar'
// al mismo tiempo"): el ranking es DE PROFESIONALES (100 peleadores
// activos, ver CANTIDAD_MUNDO en career.js); juvenil y amateur son etapas de
// formación cuyas peleas nunca tocan `jugador.record` (van aparte, a
// `recordAmateur` — ver aplicarResultado, offers.js, y el comentario grande
// de ETAPAS en career.js). Antes de este fix, `rankingDelJugador` comparaba
// la MEDIA del jugador contra la de los 100 activos SIN mirar si ya había
// debutado como profesional: un jugador en juvenil con `record` en 0-0-0 ya
// entraba a la tabla (último lugar, "#101" = 100 activos + él) solo por
// tener una media (por baja que fuera) para comparar; en amateur, con la
// media ya crecida por las cartas de mejora, ese mismo cálculo lo hacía
// saltar a mitad de tabla (~#81) sin una sola pelea profesional jugada. El
// tablero (bloqueHistorial, panel-peleador.js) ya mostraba "Sin clasificar"
// en ese mismo estado, mirando exactamente esta condición (peleasTotales,
// misma cuenta que `yaDebutoProfesional` acá abajo) — las dos pantallas se
// contradecían.
//
// "Ya debutó" se define con el mismo criterio que esa pantalla: al menos una
// pelea PROFESIONAL registrada (v+d+e > 0 en `jugador.record`). Un empate
// cuenta como debut igual que una victoria o derrota (peleó, aunque no ganó
// ni perdió) — la fórmula del bono de récord de más abajo solo usa v y d,
// así que contar `e` acá no le da a nadie un empate gratis en el puntaje,
// solo lo saca de "sin clasificar".
function yaDebutoProfesional(jugador) {
  const { v, d, e } = jugador.record;
  return v + d + e > 0;
}

/**
 * Puesto del jugador en el ranking de profesionales, o `null` si todavía no
 * debutó (ver `yaDebutoProfesional`, arriba) — un peleador en juvenil o
 * amateur no está rankeado, punto, sin importar cuán buena sea su media.
 * Los llamadores que necesitan un número (offers.js, career.js) ya usan
 * `jugador.ranking ?? valorPorDefecto` para ese caso, así que `null` viaja
 * sin romper nada.
 */
export function rankingDelJugador(mundo, jugador) {
  if (!yaDebutoProfesional(jugador)) return null;
  const activos = (mundo.roster ?? []).filter((p) => !p.retirado);
  if (activos.length === 0) return 1;
  // v17.8: el puesto lo da `puntajeDe` (divisiones.js) — media Y récord, con
  // el récord pesando de verdad. Antes era la media con un ajuste chiquito por
  // récord, y por eso un 0-2 aparecía #58 de 100: entrabas a mitad de tabla
  // por lo bueno que eras entrenando, sin haber ganado una sola pelea. En
  // boxeo el puesto se gana peleando.
  const mio = puntajeDe(jugador);
  const mejores = activos.filter((p) => puntajeDe(p) > mio).length;
  return clamp(mejores + 1, 1, activos.length + 1);
}


function filaDe(peleador, esJugador) {
  return {
    id: peleador.id,
    nombre: peleador.nombre,
    apodo: peleador.apodo,
    nacionalidad: peleador.nacionalidad,
    media: mediaDe(peleador),
    record: recordTexto(peleador),
    esJugador,
  };
}

/**
 * Tabla de posiciones completa: el roster activo (sin retirados, igual que
 * `buscarRival` — así los mismos nombres que ofrece una pelea son los que
 * aparecen acá) con el jugador insertado en su puesto real, calculado con
 * `rankingDelJugador`. Pura y no muta ni `mundo` ni `jugador`: arma listas
 * nuevas en cada llamada.
 *
 * Bug reportado (v9): mientras el jugador no debutó como profesional,
 * `rankingDelJugador` devuelve `null` (ver el comentario grande ahí) — acá
 * eso significa NO insertarlo en la tabla en absoluto, para que coincida con
 * el "Sin clasificar" del tablero en vez de mostrarlo rankeado.
 */
export function tablaRanking(mundo, jugador) {
  const activos = [...mundo.roster]
    .filter((p) => !p.retirado)
    .sort((a, b) => mediaDe(b) - mediaDe(a));

  const filas = activos.map((p) => filaDe(p, false));
  const miPuesto = rankingDelJugador(mundo, jugador);
  if (miPuesto !== null) {
    filas.splice(clamp(miPuesto - 1, 0, filas.length), 0, filaDe(jugador, true));
  }

  return filas.map((fila, indice) => ({ ...fila, ranking: indice + 1 }));
}

/**
 * Las cuatro tablas listas para pintar (pedido v17.5, punto 7). Cada división
 * es su propia lista numerada desde 1: el puesto que se ve es el puesto EN ESA
 * división, no una posición global recortada — que es lo que hace que "primero
 * en el regional" y "primero en el nacional" sean cosas distintas.
 *
 * v18: el CAMPEÓN sale de la numeración y viaja aparte (`campeones`), para que
 * la pantalla lo pinte en su propio renglón arriba de todo mientras tenga el
 * cinturón puesto — como las tablas de verdad (WBC/WBA/IBF), donde el campeón
 * no es "el #1", está fuera de la lista de retadores y los retadores se numeran
 * entre ellos. Esto reemplaza la idea de darle un piso de puntos y arregla de
 * paso el bug de "el campeón aparece #9".
 *
 * El campeón puede NO estar en su propia tabla: si sus puntos decayeron y se
 * cayó del cupo, `rankings[division]` ya no lo contiene y antes desaparecía de
 * la pantalla por completo. Por eso se lo busca en el mundo entero, no en la
 * lista — y es justo el caso que hace interesante al sistema: el que te tiene
 * que dar la revancha no es el mejor rankeado, es el que lo tiene.
 *
 * @returns {{tablas: object, campeones: object}} `tablas` son las filas
 *   numeradas (sin el campeón); `campeones[division]` es su fila, o `null`.
 */
export function tablasDeDivisiones(mundo, jugador) {
  const rankings = rankingsDe(mundo, jugador);
  const duenios = mundo.campeones ?? {};
  // Dónde buscar al campeón si se cayó de su tabla. Incluye al jugador (que no
  // vive en el roster) y excluye a los retirados: un peleador que colgó los
  // guantes no sigue ocupando el renglón de campeón.
  const todos = [...(mundo.roster ?? []), ...(jugador ? [jugador] : [])];
  const buscar = (id) => (id ? todos.find((p) => p.id === id && !p.retirado) ?? null : null);

  // En la tabla amateur el récord que corresponde es el AMATEUR. El jugador
  // arrastra los dos (las peleas amateurs nunca tocan `record` — ver
  // aplicarResultado, offers.js), y sin esto un profesional 14-2 aparecía con
  // ese récord en el circuito de formación, que es un torneo del que ya se fue.
  const armarFila = (peleador, division) => {
    const esJugador = peleador.id === jugador?.id;
    const conRecordDeLaDivision = division === 'amateur' && esJugador
      ? { ...peleador, record: peleador.recordAmateur ?? peleador.record }
      : peleador;
    return filaDe(conRecordDeLaDivision, esJugador);
  };

  const tablas = {};
  const campeones = {};
  for (const division of DIVISIONES) {
    const campeon = buscar(duenios[division]);
    campeones[division] = campeon
      ? { ...armarFila(campeon, division), esCampeon: true, ranking: null }
      : null;
    // Los retadores se numeran ENTRE ELLOS: sacado el campeón, el que estaba
    // detrás suyo pasa a ser el #1 de la lista.
    tablas[division] = (rankings[division] ?? [])
      .filter((peleador) => peleador.id !== campeon?.id)
      .map((peleador, indice) => ({
        ...armarFila(peleador, division),
        ranking: indice + 1,
        esCampeon: false,
      }));
  }
  return { tablas, campeones };
}

/**
 * `soloNacionalidad` (v18): restringe la búsqueda a rivales de ese país, con
 * caída al pool completo si no queda ninguno.
 *
 * Es el equivalente, del lado del jugador, del emparejamiento por país de
 * `avanzarMundo` (ver emparejarPorPais): regional y nacional son escaleras de
 * UN país, así que solo peleando contra compatriotas se sube en ellas. Sin
 * esto, al jugador le tocaban rivales de los doce países por igual y casi
 * ninguna de sus peleas movía la escalera que necesitaba para llegar a un
 * cinturón — medido: "al menos un cinturón" caía a 62% contra el 83-92%
 * esperado.
 */
export function buscarRival(mundo, {
  excluirIds = [], rankingCerca = null, soloNacionalidad = null,
} = {}) {
  const todos = mundo.roster.filter(
    (p) => !p.retirado && !p.esJugador && !excluirIds.includes(p.id),
  );
  const delPais = soloNacionalidad
    ? todos.filter((p) => p.nacionalidad === soloNacionalidad)
    : [];
  const candidatos = delPais.length > 0 ? delPais : todos;
  if (candidatos.length === 0) return null;
  if (rankingCerca === null) return candidatos[0];
  return candidatos.reduce((mejor, actual) => {
    const distMejor = Math.abs((mejor.ranking ?? 99) - rankingCerca);
    const distActual = Math.abs((actual.ranking ?? 99) - rankingCerca);
    return distActual < distMejor ? actual : mejor;
  });
}
