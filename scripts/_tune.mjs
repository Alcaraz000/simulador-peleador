// Herramienta de calibración rápida (Pedido 1-4, v6). No es parte del juego
// (nadie la importa desde src/ ni index.html, no entra al bundle).
//
// Replica EXACTAMENTE nuevaPartida/jugarGanandoTodo de
// tests/core/career.test.js (el mismo camino que mide el test de 3000
// semillas del eje de cinturones): jugador fijo (media 45, técnico/barrio,
// sin apodo de lotería), acepta y gana TODA oferta, sin aplicar cartas de
// mejora/evento (a propósito — así la MEDIA nunca sube por decisiones del
// jugador, solo por lo que crece pasivo). Es más estricto que
// balance-sim.mjs (que sí aplica cartas) y mucho más rápido de correr que
// vitest, para iterar sobre constantes de balance sin pagar el overhead del
// framework de test en cada corrida.
//
// Uso: node scripts/_tune.mjs [n]   (n = semillas, def 1000)

import { crearPeleador, mediaDe } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../src/core/offers.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

const MITAD_BLOQUE = 10;

function jugarGanandoTodo(partida, limite = 500) {
  let actual = partida;
  let guardia = 0;
  let defensas = 0;
  let ofertas = 0;
  let beats = 0;
  let mediaAMitad = null;
  let rankingAMitad = null;

  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (mediaAMitad === null && actual.bloqueGlobal >= MITAD_BLOQUE) {
      mediaAMitad = mediaDe(actual.jugador);
      rankingAMitad = actual.jugador.ranking;
    }
    if (!paso.beat) continue;
    beats += 1;

    if (paso.beat.tipo === 'oferta') {
      const { oferta } = paso.beat.datos;
      actual = firmarPelea(actual, { oferta });
    } else if (paso.beat.tipo === 'campCarta' || paso.beat.tipo === 'campSparring') {
      const { oferta, ultimo } = paso.beat.datos;
      if (ultimo) {
        ofertas += 1;
        if (oferta.nivel === 'defensa') defensas += 1;
        const resultado = aplicarResultado(actual.jugador, {
          oferta,
          resultado: { ganador: 'jugador', metodo: 'ko', round: 3 },
        });
        actual = { ...actual, jugador: resultado.jugador };
      }
    }
  }
  if (mediaAMitad === null) { mediaAMitad = mediaDe(actual.jugador); rankingAMitad = actual.jugador.ranking; }
  return {
    partida: actual, defensas, ofertas, beats, mediaAMitad, rankingAMitad,
  };
}

const N = Number(process.argv[2] ?? 1000);
let con3 = 0;
let sinDefensas = 0;
const beatsArr = []; const ofertasArr = []; const mediaFinalArr = []; const mediaMitadArr = [];
const rankingFinalArr = []; const rankingMitadArr = [];
const titulosCount = { 0: 0, 1: 0, 2: 0, 3: 0 };

for (let s = 1; s <= N; s += 1) {
  const {
    partida, defensas, ofertas, beats, mediaAMitad, rankingAMitad,
  } = jugarGanandoTodo(nuevaPartida(s));
  if (partida.jugador.titulos.length === CINTURONES.length) con3 += 1;
  if (defensas === 0) sinDefensas += 1;
  titulosCount[partida.jugador.titulos.length] = (titulosCount[partida.jugador.titulos.length] ?? 0) + 1;
  beatsArr.push(beats);
  ofertasArr.push(ofertas);
  mediaFinalArr.push(mediaDe(partida.jugador));
  mediaMitadArr.push(mediaAMitad);
  rankingFinalArr.push(partida.jugador.ranking);
  rankingMitadArr.push(rankingAMitad);
}

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const percentil = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx); const hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
};
console.log(`N=${N}`);
console.log(`3 cinturones: ${con3}/${N} = ${((con3 / N) * 100).toFixed(2)}%`);
console.log('distribucion de titulos:', titulosCount);
console.log(`sin defensas: ${((sinDefensas / N) * 100).toFixed(2)}%`);
console.log(`beats/carrera: avg=${avg(beatsArr).toFixed(2)} min=${Math.min(...beatsArr)} max=${Math.max(...beatsArr)} | p10=${percentil(beatsArr, 10).toFixed(1)} p50=${percentil(beatsArr, 50).toFixed(1)} p90=${percentil(beatsArr, 90).toFixed(1)} | dentro[65,105]=${((beatsArr.filter((b) => b >= 65 && b <= 105).length / N) * 100).toFixed(2)}%`);
console.log(`ofertas/carrera: avg=${avg(ofertasArr).toFixed(2)} min=${Math.min(...ofertasArr)} max=${Math.max(...ofertasArr)} | p10=${percentil(ofertasArr, 10).toFixed(1)} p50=${percentil(ofertasArr, 50).toFixed(1)} p90=${percentil(ofertasArr, 90).toFixed(1)} | dentro[8,22]=${ofertasArr.filter((o) => o >= 8 && o <= 22).length}/${N} | debajo de 8=${ofertasArr.filter((o) => o < 8).length}`);
console.log(`media final: avg=${avg(mediaFinalArr).toFixed(2)} min=${Math.min(...mediaFinalArr)} max=${Math.max(...mediaFinalArr)}`);
console.log(`media a mitad: avg=${avg(mediaMitadArr).toFixed(2)} min=${Math.min(...mediaMitadArr)} max=${Math.max(...mediaMitadArr)}`);
console.log(`ranking final: avg=${avg(rankingFinalArr).toFixed(2)} min=${Math.min(...rankingFinalArr)} max=${Math.max(...rankingFinalArr)}`);
console.log(`ranking a mitad: avg=${avg(rankingMitadArr).toFixed(2)} min=${Math.min(...rankingMitadArr)} max=${Math.max(...rankingMitadArr)}`);
