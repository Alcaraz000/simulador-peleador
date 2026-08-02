import { crearPeleador } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../src/core/career.js';

function nuevaPartida(semilla) {
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

const N = Number(process.argv[2] ?? 50);
const counts = [];
for (let s = 1; s <= N; s++) {
  const { beats } = jugarTodo(nuevaPartida(s));
  counts.push(beats.filter((b) => b.tipo === 'oferta').length);
}
console.log(counts.join(','));
console.log('min', Math.min(...counts), 'max', Math.max(...counts), 'avg', (counts.reduce((a,b)=>a+b,0)/N).toFixed(2));
console.log('below5', counts.filter(c=>c<5).length, 'below7', counts.filter(c=>c<7).length, 'above18', counts.filter(c=>c>18).length);
