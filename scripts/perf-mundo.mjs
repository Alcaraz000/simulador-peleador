// Medición de rendimiento y tamaño de guardado con el roster de 100 (Pedido
// 1, v6: "medí el tiempo de un bloque y el tamaño del guardado"). No es
// parte del juego — se corre a mano con `node scripts/perf-mundo.mjs`.
//
// Mide:
//   1) Tiempo de avanzarMundo (un bloque) en frío y en caliente, con
//      cantidad=12 (v5, referencia) y cantidad=100 (v6).
//   2) Tamaño de una partida serializada (save.js) en distintos puntos de
//      una carrera jugada de punta a punta, con cantidad=100.

import { crearMundo, avanzarMundo } from '../src/core/world.js';
import { crearPeleador } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../src/core/career.js';
import { aplicarResultado } from '../src/core/offers.js';
import { serializar } from '../src/core/save.js';
import { createRng } from '../src/core/rng.js';

function medirAvanzarMundo(cantidad, iteraciones) {
  const mundo = crearMundo(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad });
  const rng = createRng(2);
  // Descarta la primera corrida (JIT warmup) del promedio "en caliente".
  avanzarMundo(mundo, rng, { aniosPasados: 1 });

  const tiempos = [];
  let actual = mundo;
  for (let i = 0; i < iteraciones; i += 1) {
    const t0 = performance.now();
    const paso = avanzarMundo(actual, rng, { aniosPasados: 1 });
    const t1 = performance.now();
    tiempos.push(t1 - t0);
    actual = paso.mundo;
  }
  const avg = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  const max = Math.max(...tiempos);
  return { avg, max, min: Math.min(...tiempos) };
}

console.log('=== Tiempo de avanzarMundo (1 bloque = 1 año), promedio sobre 200 corridas ===');
for (const cantidad of [12, 100]) {
  const { avg, max, min } = medirAvanzarMundo(cantidad, 200);
  console.log(`cantidad=${cantidad}: avg=${avg.toFixed(3)}ms | min=${min.toFixed(3)}ms | max=${max.toFixed(3)}ms`);
}

// --- Tamaño del guardado a lo largo de una carrera real (cantidad=100) ---
function jugarYMedirTamanos(semilla) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  let partida = crearPartida({ jugador, semilla });
  const puntos = [];
  const bloquesVistos = new Set();
  let guardia = 0;
  while (!partida.terminada && guardia < 500) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    if (paso.beat?.tipo === 'oferta') {
      partida = firmarPelea(partida, { oferta: paso.beat.datos.oferta });
    } else if ((paso.beat?.tipo === 'campCarta' || paso.beat?.tipo === 'campSparring') && paso.beat.datos.ultimo) {
      const resultado = aplicarResultado(partida.jugador, {
        oferta: paso.beat.datos.oferta,
        resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
      });
      partida = { ...partida, jugador: resultado.jugador };
    }
    const hito = [1, 10, 20].includes(partida.bloqueGlobal) ? partida.bloqueGlobal : null;
    if (hito !== null && !bloquesVistos.has(hito)) {
      bloquesVistos.add(hito);
      puntos.push({ bloque: hito, bytes: Buffer.byteLength(serializar(partida), 'utf8') });
    }
  }
  puntos.push({ bloque: 'final', bytes: Buffer.byteLength(serializar(partida), 'utf8') });
  return puntos;
}

console.log('\n=== Tamaño de la partida serializada (localStorage), cantidad=100 ===');
const puntos = jugarYMedirTamanos(1);
for (const { bloque, bytes } of puntos) {
  console.log(`bloque ${bloque}: ${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`);
}
