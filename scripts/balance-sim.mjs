// Herramienta de medición de balance (Task 6.2 v2). No es parte del juego:
// nadie la importa desde src/ ni desde index.html, así que no entra al
// bundle de Vite. Se corre a mano con `node scripts/balance-sim.mjs`.
//
// Simula carreras completas "jugando bien" (un jugador que siempre acepta
// pelea, siempre elige la mejor carta/opción disponible y siempre gana sus
// peleas — la misma abstracción que ya usa `jugarGanandoTodo` en
// tests/core/career.test.js) pero, a diferencia de ese test, SÍ aplica las
// cartas de mejora/evento/redes sobre el jugador, así que la MEDIA final
// refleja de verdad el crecimiento de atributos de la carrera, incluida la
// suerte de que te toque (o no) una carta/origen/apodo legendario.
//
// Tres variantes, todas sobre las mismas N semillas:
//   - "baseline": estilo/origen fijos (tecnico/barrio, sin apodo), igual que
//     el helper `nuevaPartida` de career.test.js. Aísla la suerte legendaria
//     que viene SOLO de las cartas de mejora/evento/redes durante la carrera.
//   - "creacionReal": origen y apodo salen de repartirOrigenes/repartirApodos
//     (la lotería real de 2-3 opciones que ve el jugador en la creación,
//     Paso 2/3) y el jugador elige la de mejor puntaje entre las ofrecidas
//     (toma la legendaria si sale). Es el "techo"/promedio de jugar bien.
//     Estilo se mantiene fijo (tecnico) porque en el juego real el estilo es
//     elección libre, no azar (ver create.js: estilosDisponibles no pasa por
//     sortearPorRareza) — no se cuenta como "suerte".
//   - "pisoCreacionReal": mismas semillas que creacionReal, pero el jugador
//     evita a propósito cualquier origen/apodo/carta de mejora legendaria
//     cuando tiene una alternativa (no puede evitar un evento/redes
//     legendario: ahí no hay elección, ya salió esa única carta). Mide el
//     piso real de una carrera "sin suerte" con potencia estadística — las
//     carreras que de casualidad no ven NINGUNA legendaria en 500 semillas
//     son muy pocas (~1%) para sacar conclusiones del piso por sí solas.
//
// Uso: node scripts/balance-sim.mjs [n]   (n = semillas por variante, def 500)

import { crearPeleador, mediaDe, repartirOrigenes } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../src/core/offers.js';
import { aplicarCarta } from '../src/core/cards.js';
import { resolverOpcion } from '../src/core/events.js';
import { repartirApodos } from '../src/core/nicknames.js';
import { createRng } from '../src/core/rng.js';

function puntajeMods(mods = {}) {
  return Object.values(mods).reduce((acc, v) => acc + Math.max(0, v), 0);
}

function elegirMejor(items, puntuar, { evitarLegendarias = false } = {}) {
  const candidatos = evitarLegendarias
    ? items.filter((i) => i.rareza !== 'legendaria')
    : items;
  const pool = candidatos.length > 0 ? candidatos : items; // si TODO lo ofrecido es legendario, no hay de otra
  let mejor = pool[0];
  let mejorPuntaje = -Infinity;
  for (const item of pool) {
    const p = puntuar(item);
    if (p > mejorPuntaje) { mejorPuntaje = p; mejor = item; }
  }
  return mejor;
}

function elegirMejorOpcion(carta) {
  return elegirMejor(carta.opciones, (o) => {
    const base = puntajeMods(o.mods);
    const prob = o.probabilidades ? Math.max(...o.probabilidades.map((p) => puntajeMods(p.mods))) : 0;
    const dinero = (o.efectos?.dinero ?? 0) / 20000;
    const fama = (o.efectos?.fama ?? 0) / 5;
    return base + prob + dinero + fama;
  });
}

function nuevoJugadorBaseline() {
  return crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
}

function nuevoJugadorCreacionReal(semilla, { evitarLegendarias = false } = {}) {
  const rngCreacion = createRng(`creacion_${semilla}`);
  const origenesOfrecidos = repartirOrigenes(rngCreacion);
  const origenElegido = elegirMejor(origenesOfrecidos, (o) => puntajeMods(o.mods), { evitarLegendarias });
  const apodosOfrecidos = repartirApodos(rngCreacion);
  const apodoElegido = elegirMejor(apodosOfrecidos, (a) => puntajeMods(a.mods), { evitarLegendarias });

  const legendariaEnCreacion = origenElegido.rareza === 'legendaria' || apodoElegido.rareza === 'legendaria';

  const jugador = crearPeleador({
    apellido: 'Ortiz', apodoId: apodoElegido.id, nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: origenElegido.id, media: 38, esJugador: true,
  });
  return { jugador, legendariaEnCreacion, origenElegido, apodoElegido };
}

// Resuelve la pelea que estaba firmada (ganador siempre 'jugador', igual que
// el resto de esta simulación "jugando bien"): se llama cuando aparece el
// beat `ultimo` del campamento (firmarPelea, career.js), no apenas se ve la
// oferta — la pelea en sí ya no ocurre en el acto de aceptar.
function resolverPeleaDeCampamento(jugador, oferta) {
  const resultado = aplicarResultado(jugador, {
    oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
  });
  return { jugador: resultado.jugador, defensa: oferta.nivel === 'defensa' };
}

function jugarCarrera(semilla, { crearJugador, limite = 500, evitarLegendarias = false }) {
  const { jugador, legendariaEnCreacion } = crearJugador(semilla);
  let partida = crearPartida({ jugador, semilla });
  const rngCosmetico = createRng(semilla + 7777); // igual que main.js: rng aparte para resolverOpcion

  let beats = 0;
  let ofertas = 0;
  let defensas = 0;
  let legendariasEnCarrera = 0; // solo cartas/eventos DURANTE la carrera (no creación)
  let guardia = 0;

  while (!partida.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;
    if (!beat) continue;
    beats += 1;

    if (beat.tipo === 'mejora') {
      const cartas = beat.datos.cartas;
      const elegida = elegirMejor(cartas, (c) => puntajeMods(c.mods), { evitarLegendarias });
      if (elegida.rareza === 'legendaria') legendariasEnCarrera += 1;
      const aplicado = aplicarCarta(partida.jugador, elegida);
      partida = { ...partida, jugador: aplicado.jugador };
    } else if (beat.tipo === 'evento' || beat.tipo === 'redes') {
      const carta = beat.datos.carta;
      const opcion = elegirMejorOpcion(carta);
      if (carta.rareza === 'legendaria') legendariasEnCarrera += 1;
      const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: partida.jugador, carta, opcionId: opcion.id,
        rivalidades: partida.rivalidades, rivalObjetivoId,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    } else if (beat.tipo === 'sparring' || beat.tipo === 'campSparring') {
      // No se puede simular el minijuego de reacción; se asume un desempeño
      // "bien" (velocidad +2 — bug v4: MS_BIEN no se exigía y el mod era de
      // solo +1, ver core/sparring.js), ni el piso ("flojo", sin mods) ni el
      // techo ("perfecto", velocidad+3/forma+4) del minijuego. Sin rareza
      // propia, no afecta la medición de suerte legendaria.
      partida = { ...partida, jugador: { ...partida.jugador, atributos: { ...partida.jugador.atributos, velocidad: Math.min(99, partida.jugador.atributos.velocidad + 2) } } };
      if (beat.tipo === 'campSparring' && beat.datos.ultimo) {
        const r = resolverPeleaDeCampamento(partida.jugador, beat.datos.oferta);
        ofertas += 1;
        if (r.defensa) defensas += 1;
        partida = { ...partida, jugador: r.jugador };
      }
    } else if (beat.tipo === 'campCarta') {
      const { carta, oferta, ultimo } = beat.datos;
      const opcion = elegirMejorOpcion(carta);
      const resuelto = resolverOpcion(rngCosmetico, {
        jugador: partida.jugador, carta, opcionId: opcion.id, rivalidades: partida.rivalidades,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
      if (ultimo) {
        const r = resolverPeleaDeCampamento(partida.jugador, oferta);
        ofertas += 1;
        if (r.defensa) defensas += 1;
        partida = { ...partida, jugador: r.jugador };
      }
    } else if (beat.tipo === 'oferta') {
      // Task v3 ("las semanas de preparación antes de una pelea"): aceptar ya
      // no resuelve la pelea en el acto — firma el contrato y encola el
      // campamento (firmarPelea, career.js). "Jugando bien" siempre acepta,
      // igual que antes; la pelea en sí se resuelve recién cuando aparece el
      // beat `ultimo` del campamento (campCarta/campSparring, más arriba).
      partida = firmarPelea(partida, { oferta: beat.datos.oferta });
    }
    // 'lesionSinOferta' y 'noticias': sin estado que mutar para esta medición.
  }

  const mediaFinal = mediaDe(partida.jugador);
  const tresCinturones = partida.jugador.titulos.length === CINTURONES.length;
  const legendariasTotal = legendariasEnCarrera + (legendariaEnCreacion ? 1 : 0);

  return { beats, ofertas, defensas, tresCinturones, mediaFinal, legendariasTotal, legendariaEnCreacion, legendariasEnCarrera };
}

function resumen(nombre, resultados) {
  const n = resultados.length;
  const beats = resultados.map((r) => r.beats);
  const ofertas = resultados.map((r) => r.ofertas);
  const medias = resultados.map((r) => r.mediaFinal);
  const con3 = resultados.filter((r) => r.tresCinturones).length;
  const sinDefensas = resultados.filter((r) => r.defensas === 0).length;

  const conLegendaria = resultados.filter((r) => r.legendariasTotal > 0);
  const sinLegendaria = resultados.filter((r) => r.legendariasTotal === 0);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  // Objetivo declarado de beats/carrera (ver el comentario grande en
  // career.js, arriba de ETAPAS): dejó de ser [30,60] — esa era una meta del
  // plan original, pre-campamento, nunca un pedido del usuario, e insistir en
  // ella significaría "corregir" un test hasta esconder un bug de
  // documentación. El rango honesto medido (3000 semillas) es avg≈66,
  // p10≈60, p90≈72, prácticamente todo dentro de [45,85]. Se sigue imprimiendo
  // [30,60] acá abajo solo como referencia histórica de cuánto se alejó el
  // ritmo real de ese número viejo, no como objetivo vigente.
  const percentil = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (s.length - 1);
    const lo = Math.floor(idx); const hi = Math.ceil(idx);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  const fmtGrupo = (grupo, etiqueta) => {
    if (grupo.length === 0) return `  ${etiqueta}: (0 carreras)`;
    const m = grupo.map((r) => r.mediaFinal);
    const c3 = grupo.filter((r) => r.tresCinturones).length;
    return `  ${etiqueta}: n=${grupo.length} | MEDIA final avg=${avg(m).toFixed(2)} min=${Math.min(...m)} max=${Math.max(...m)} | 3 cinturones=${((c3 / grupo.length) * 100).toFixed(1)}%`;
  };

  console.log(`\n=== ${nombre} (n=${n}) ===`);
  console.log(`beats/carrera: avg=${avg(beats).toFixed(2)} min=${Math.min(...beats)} max=${Math.max(...beats)} | p10=${percentil(beats, 10).toFixed(1)} p50=${percentil(beats, 50).toFixed(1)} p90=${percentil(beats, 90).toFixed(1)}`);
  console.log(`  rango honesto vigente [45,85]=${beats.filter((b) => b >= 45 && b <= 85).length}/${n} | referencia histórica [30,60]=${beats.filter((b) => b >= 30 && b <= 60).length}/${n}`);
  const debajoDe12 = ofertas.filter((o) => o < 12).length;
  const arribaDe22 = ofertas.filter((o) => o > 22).length;
  const debajoDe8 = ofertas.filter((o) => o < 8).length;
  console.log(`ofertas(peleas)/carrera: avg=${avg(ofertas).toFixed(2)} min=${Math.min(...ofertas)} max=${Math.max(...ofertas)} | dentro de [12,22]=${ofertas.filter((o) => o >= 12 && o <= 22).length}/${n} (por debajo de 12: ${debajoDe12}, por encima de 22: ${arribaDe22}, por debajo del piso duro de 8: ${debajoDe8})`);
  console.log(`3 cinturones: ${con3}/${n} = ${((con3 / n) * 100).toFixed(2)}%`);
  console.log(`carreras sin ninguna defensa obligatoria: ${sinDefensas}/${n} = ${((sinDefensas / n) * 100).toFixed(2)}%`);
  console.log(`MEDIA final (todas): avg=${avg(medias).toFixed(2)} min=${Math.min(...medias)} max=${Math.max(...medias)}`);
  console.log(`Con al menos una legendaria (creación o carrera): ${conLegendaria.length}/${n} = ${((conLegendaria.length / n) * 100).toFixed(1)}%`);
  console.log(fmtGrupo(conLegendaria, 'CON legendaria'));
  console.log(fmtGrupo(sinLegendaria, 'SIN legendaria'));
}

const N = Number(process.argv[2] ?? 500);

const baseline = [];
const creacionReal = [];
const pisoCreacionReal = []; // mismas 500 semillas, pero evitando SIEMPRE lo legendario que se pueda evitar
for (let semilla = 1; semilla <= N; semilla += 1) {
  baseline.push(jugarCarrera(semilla, { crearJugador: () => ({ jugador: nuevoJugadorBaseline(), legendariaEnCreacion: false }) }));
  creacionReal.push(jugarCarrera(semilla, { crearJugador: nuevoJugadorCreacionReal }));
  pisoCreacionReal.push(jugarCarrera(semilla, {
    crearJugador: (s) => nuevoJugadorCreacionReal(s, { evitarLegendarias: true }),
    evitarLegendarias: true,
  }));
}

resumen('Baseline (estilo/origen fijos, sin apodo)', baseline);
resumen('Creación real (origen+apodo por lotería, mejor opción ofrecida) — TECHO/promedio de "jugando bien"', creacionReal);
resumen('Creación real, PISO deliberado (evita origen/apodo/carta legendarios siempre que hay alternativa)', pisoCreacionReal);

// Comparación directa techo (promedio real) vs piso (mismas 500 semillas, sin
// legendarias evitables) para las dos métricas que pide la Task 6.2: cuánto
// sube la MEDIA final con suerte legendaria, y si el piso sigue siendo
// jugable (llega a los tres cinturones).
{
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mediasTecho = creacionReal.map((r) => r.mediaFinal);
  const mediasPiso = pisoCreacionReal.map((r) => r.mediaFinal);
  const c3Techo = creacionReal.filter((r) => r.tresCinturones).length;
  const c3Piso = pisoCreacionReal.filter((r) => r.tresCinturones).length;
  console.log('\n=== Techo vs. piso, mismas 500 semillas ===');
  console.log(`MEDIA final: promedio jugando bien=${avg(mediasTecho).toFixed(2)} (max ${Math.max(...mediasTecho)}) | piso sin legendarias evitables=${avg(mediasPiso).toFixed(2)} (max ${Math.max(...mediasPiso)}) | diferencia=${(avg(mediasTecho) - avg(mediasPiso)).toFixed(2)}`);
  console.log(`3 cinturones: jugando bien=${((c3Techo / N) * 100).toFixed(1)}% | piso sin legendarias evitables=${((c3Piso / N) * 100).toFixed(1)}%`);
}
