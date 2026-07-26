import { clamp } from './stats.js';

// Duraciones recortadas (Sistema 1, corrección del coordinador: "cualquier
// lesión bloquea las ofertas — medí el efecto colateral"): con
// `puedePelear` bloqueando CUALQUIER lesión (no solo grave, ver más abajo),
// hombro/rodilla/conmoción quedaban demasiado largas — se les recortó UN
// bloque a las tres más largas (nunca el gate en sí: eso es lo que pidió el
// usuario explícitamente). Ver el resultado medido, junto con el recorte de
// frecuencia, en el comentario grande de PROB_BASE, un poco más abajo.
export const LESIONES = [
  { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, bloques: 1, costo: 4000, modsForma: -8, texto: 'Te abrieron la ceja. Nada grave, pero molesta.' },
  { id: 'nariz', nombre: 'Nariz rota', severidad: 1, bloques: 1, costo: 6000, modsForma: -10, texto: 'Nariz rota. Vas a respirar por la boca un tiempo.' },
  { id: 'costillas', nombre: 'Costillas golpeadas', severidad: 2, bloques: 2, costo: 18000, modsForma: -18, texto: 'Costillas golpeadas: cada respiración te recuerda la pelea.' },
  { id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloques: 2, costo: 22000, modsForma: -20, texto: 'Te fracturaste la mano. Yeso y paciencia.' },
  { id: 'hombro', nombre: 'Hombro dislocado', severidad: 2, bloques: 2, costo: 28000, modsForma: -22, texto: 'Hombro dislocado. Kinesiología por un buen rato.' },
  { id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, bloques: 3, costo: 60000, modsForma: -30, texto: 'Ligamentos de la rodilla. Esta es de las que asustan.' },
  { id: 'conmocion', nombre: 'Conmoción', severidad: 3, bloques: 3, costo: 55000, modsForma: -28, texto: 'Conmoción cerebral. El médico fue tajante: descanso.' },
];

// Probabilidad base recortada de 0.18 a 0.10 (contexto 'pelea'), mismo
// motivo que el recorte de duraciones de arriba: con el gate ampliado a
// cualquier severidad, la frecuencia vieja se comía demasiadas ofertas.
// También se corrieron los PESOS de severidad (más abajo, en tirarLesion) de
// 6/3/1 a 8/1/1: además de menos frecuente, cuando toca lesión ahora es
// mucho más probable que sea la leve y rápida (1 bloque) que la moderada o
// grave — moderada/grave siguen existiendo (y siguen doliendo cuando tocan),
// pero ahora son la excepción de verdad, no un tercio de las lesiones.
//
// Medido sobre el jugador MÁS DÉBIL del proyecto (nuevaPartida en
// tests/core/career-lesiones-reales.test.js: media=45 fija, sin
// origen/apodo optimizado — el peor caso, no el "jugando bien" de
// balance-sim) con n=3000 semillas, mismo método que el test "progresión de
// cinturones":
//   - Antes de este recorte (0.18, pesos 6/3/1): 3 cinturones=84.77%
//     (¡por debajo del piso de 85%!), ofertas/carrera avg=13.62, 10.1% de
//     las carreras por debajo de 12 ofertas.
//   - Después (0.10, pesos 8/1/1): 3 cinturones≈86.4-86.7% (estable entre
//     ventanas de 1000-1500 semillas separadas), ofertas/carrera avg≈14.15,
//     ~5% por debajo de 12, prácticamente cero por debajo del piso duro de
//     8. Sobre "creación real" (el jugando bien de balance-sim, jugador más
//     fuerte) el margen es todavía mayor. El piso injury-free de este mismo
//     jugador (sin ninguna lesión, test "progresión de cinturones") es
//     ~87% — este recorte deja el costo de las lesiones en menos de 1 punto
//     porcentual respecto de ese piso, lo más cerca que se puede llegar sin
//     que las lesiones dejen de importar.
// La palanca fue frecuencia/duración, nunca el gate de puedePelear — ver el
// comentario ahí abajo.
const PROB_BASE = { pelea: 0.1, entrenamiento: 0.05 };

export function tirarLesion(rng, { peleador, contexto = 'pelea', danoRecibido = 0 }) {
  const base = PROB_BASE[contexto] ?? 0.05;
  const porDano = clamp(danoRecibido, 0, 100) / 400;
  const proteccion = (peleador.especiales?.disciplinaPersonal ?? 40) / 500;
  const staffProtege = (peleador.staff ?? []).includes('kinesiologo') ? 0.06 : 0;
  const prob = clamp(base + porDano - proteccion - staffProtege, 0.01, 0.6);
  if (!rng.chance(prob)) return null;

  const pesos = LESIONES.map((l) => ({
    valor: l,
    peso: l.severidad === 1 ? 8 : l.severidad === 2 ? 1 : 1,
  }));
  const elegida = rng.weighted(pesos);
  return {
    id: elegida.id,
    nombre: elegida.nombre,
    severidad: elegida.severidad,
    bloquesRestantes: elegida.bloques,
    costo: elegida.costo,
    modsForma: elegida.modsForma,
    texto: elegida.texto,
  };
}

function clonar(peleador) {
  return { ...peleador, estado: { ...peleador.estado } };
}

export function aplicarLesion(peleador, lesion) {
  const nuevo = clonar(peleador);
  const catalogo = LESIONES.find((l) => l.id === lesion.id);
  const modsForma = lesion.modsForma ?? catalogo?.modsForma ?? -10;
  nuevo.estado.lesion = { ...lesion };
  nuevo.estado.forma = clamp(nuevo.estado.forma + modsForma, 0, 100);
  return nuevo;
}

export function recuperar(peleador, { bloques = 1 } = {}) {
  if (!peleador.estado.lesion) return { peleador, curada: false };
  const nuevo = clonar(peleador);
  const restantes = nuevo.estado.lesion.bloquesRestantes - bloques;
  if (restantes <= 0) {
    nuevo.estado.lesion = null;
    nuevo.estado.forma = clamp(nuevo.estado.forma + 10, 0, 100);
    return { peleador: nuevo, curada: true };
  }
  nuevo.estado.lesion = { ...nuevo.estado.lesion, bloquesRestantes: restantes };
  return { peleador: nuevo, curada: false };
}

export function curarConDinero(peleador, lesion) {
  if (!lesion || peleador.dinero < lesion.costo) {
    return { peleador, gasto: 0, ok: false };
  }
  const nuevo = clonar(peleador);
  nuevo.dinero -= lesion.costo;
  nuevo.estado.lesion = null;
  nuevo.estado.forma = clamp(nuevo.estado.forma + 15, 0, 100);
  return { peleador: nuevo, gasto: lesion.costo, ok: true };
}

// Sistema 1, corrección del coordinador: el usuario fue textual — "hasta no
// estar recuperado de una lesión, no puede aparecer una pelea nueva" — sin
// matices de severidad. Antes solo bloqueaba la severidad 3 (grave); ahora
// CUALQUIER lesión activa bloquea la oferta (ver armarCola, career.js). El
// efecto colateral (menos ofertas por carrera) se compensó recortando
// duración/frecuencia de las lesiones — ver LESIONES y PROB_BASE, arriba —
// nunca aflojando este gate, que es lo que el usuario pidió expresamente.
export function puedePelear(peleador) {
  return !peleador.estado.lesion;
}

// Sistema 1 (feedback del usuario: "¿Qué efecto tienen las lesiones?
// Parecería que no afecta en nada"). Multiplicador de efectividad en pelea
// para un peleador lesionado — lo consume `efectividad()` en fight.js sobre
// el CÁLCULO ENTERO (antes era un 0.88 fijo aplicado solo a la mitad de la
// fórmula: ~6% de penalización total, invisible en la práctica). Escala con
// la severidad: una lesión leve (severidad 1, tipo "corte en la ceja") se
// siente pero no arruina la pelea; una moderada (severidad 2, tipo "mano
// fracturada") pesa de verdad. Severidad 3 en teoría nunca llega acá —
// puedePelear ya bloquea la oferta antes— pero el valor está igual, por las
// dudas, y sigue la misma progresión.
const FACTOR_POR_SEVERIDAD = { 1: 0.94, 2: 0.82, 3: 0.68 };

export function factorEfectividad(lesion) {
  if (!lesion) return 1;
  return FACTOR_POR_SEVERIDAD[lesion.severidad] ?? 0.82;
}
