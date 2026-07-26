// Herramienta de medición de la ECONOMÍA de una carrera (Sistema 3, "la
// tienda es inalcanzable"). Hermana de balance-sim.mjs: no es parte del
// juego, no la importa nadie de src/ ni index.html. Se corre a mano con
// `node scripts/money-sim.mjs [n]`.
//
// Mide cuánto dinero junta un jugador "jugando bien" (acepta y gana toda
// oferta, igual que jugarGanandoTodo en tests/core/career.test.js) a lo largo
// de una carrera completa, y cuántas compras de la tienda (money.js) se puede
// permitir con esa plata — antes de gastar nada (así el número no depende del
// ORDEN en que compraría, solo de cuánta plata pasó por sus manos).
//
// Uso: node scripts/money-sim.mjs [n]   (n = semillas, def 300)

import { crearPeleador } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../src/core/career.js';
import { aplicarResultado } from '../src/core/offers.js';
import { STAFF, LUJOS } from '../src/core/money.js';

function nuevoJugador() {
  return crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
}

function resolverPeleaDeCampamento(jugador, oferta) {
  const resultado = aplicarResultado(jugador, {
    oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
  });
  return resultado.jugador;
}

// v6, segunda vuelta: la carrera pasó de 20 a 24 bloques (ETAPAS, career.js
// — profesional ahora dura de punta a punta, sin una etapa "veterano"
// aparte). Checkpoints y mitad de carrera actualizados en consecuencia.
const CHECKPOINTS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

function jugarCarrera(semilla, { limite = 500 } = {}) {
  let partida = crearPartida({ jugador: nuevoJugador(), semilla });

  let guardia = 0;
  const porCheckpoint = {};
  let dineroAMitad = null;
  const MITAD_BLOQUE = 12;

  while (!partida.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;

    for (const cp of CHECKPOINTS) {
      if (!(cp in porCheckpoint) && partida.bloqueGlobal >= cp) porCheckpoint[cp] = partida.jugador.dinero;
    }
    if (dineroAMitad === null && partida.bloqueGlobal >= MITAD_BLOQUE) {
      dineroAMitad = partida.jugador.dinero;
    }

    if (!beat) continue;

    if (beat.tipo === 'oferta') {
      partida = firmarPelea(partida, { oferta: beat.datos.oferta });
    } else if ((beat.tipo === 'campCarta' || beat.tipo === 'campSparring') && beat.datos.ultimo) {
      const jugador = resolverPeleaDeCampamento(partida.jugador, beat.datos.oferta);
      partida = { ...partida, jugador };
    }
  }

  if (dineroAMitad === null) dineroAMitad = partida.jugador.dinero;
  for (const cp of CHECKPOINTS) if (!(cp in porCheckpoint)) porCheckpoint[cp] = partida.jugador.dinero;

  return {
    dineroFinal: partida.jugador.dinero, dineroAMitad, porCheckpoint,
  };
}

// Cuántas compras se puede permitir un jugador con `dinero` en el bolsillo,
// SIN gastar nada todavía (orden de precio ascendente, la estrategia que más
// compras rinde): sirve para responder "¿la tienda es una decisión real o
// una vidriera?" con un número concreto.
function comprasPosibles(dinero) {
  const precios = [...STAFF, ...LUJOS].map((i) => i.precio).sort((a, b) => a - b);
  let restante = dinero;
  let compras = 0;
  for (const precio of precios) {
    if (restante >= precio) { restante -= precio; compras += 1; } else break;
  }
  return compras;
}

const N = Number(process.argv[2] ?? 300);
const resultados = [];
for (let semilla = 1; semilla <= N; semilla += 1) resultados.push(jugarCarrera(semilla));

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const finales = resultados.map((r) => r.dineroFinal);
const mitades = resultados.map((r) => r.dineroAMitad);
const comprasFinal = finales.map(comprasPosibles);
const comprasMitad = mitades.map(comprasPosibles);

const fmt = (n) => `US$ ${Math.round(n).toLocaleString('es-AR')}`;

console.log(`\n=== Economía de la carrera (n=${N}) — PRECIOS ACTUALES ===`);
console.log('Staff:', STAFF.map((s) => `${s.id}=${fmt(s.precio)}`).join(' | '));
console.log('Lujos:', LUJOS.map((s) => `${s.id}=${fmt(s.precio)}`).join(' | '));
console.log(`\nDinero a mitad de carrera: avg=${fmt(avg(mitades))} min=${fmt(Math.min(...mitades))} max=${fmt(Math.max(...mitades))}`);
console.log(`Dinero al final de la carrera: avg=${fmt(avg(finales))} min=${fmt(Math.min(...finales))} max=${fmt(Math.max(...finales))}`);
console.log(`\nCompras posibles a mitad de carrera (orden barato->caro, sin gastar nada antes): avg=${avg(comprasMitad).toFixed(2)} min=${Math.min(...comprasMitad)} max=${Math.max(...comprasMitad)}`);
console.log(`Compras posibles al final de la carrera: avg=${avg(comprasFinal).toFixed(2)} min=${Math.min(...comprasFinal)} max=${Math.max(...comprasFinal)}`);

const distribucion = {};
for (const c of comprasFinal) distribucion[c] = (distribucion[c] ?? 0) + 1;
console.log('\nDistribución de compras posibles al final (cantidad de compras -> % de carreras):');
Object.keys(distribucion).map(Number).sort((a, b) => a - b).forEach((k) => {
  console.log(`  ${k} compras: ${((distribucion[k] / N) * 100).toFixed(1)}%`);
});

console.log('\nDinero acumulado por checkpoint de bloqueGlobal (avg / compras posibles avg):');
for (const cp of CHECKPOINTS) {
  const valores = resultados.map((r) => r.porCheckpoint[cp]);
  const compras = valores.map(comprasPosibles);
  console.log(`  bloque ${String(cp).padStart(2)}: dinero avg=${fmt(avg(valores)).padStart(14)} | compras avg=${avg(compras).toFixed(2)}`);
}
