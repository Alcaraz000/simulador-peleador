import { clamp } from './stats.js';

// v7 (pedido del usuario, con una barrida de boxeo de por medio: "un corte de
// ceja (2-6 semanas reales) cuesta medio año in-game; una mano fracturada
// (2-3 meses), ~1,5 años; rodilla o conmoción, ~2,5 años"): el problema de
// fondo era de GRANULARIDAD, no de balance — la recuperación se contaba en
// `bloques` (career.js: ETAPAS.*.aniosPorBloque === 1 siempre, así que un
// bloque son 52 semanas) y el mínimo no-cero posible ya eran meses. Ahora se
// cuenta en SEMANAS (`semanas` acá, `semanasRestantes` en la lesión — ver
// `recuperar`, más abajo), la misma unidad fina que ya usan `semanaGlobal`/
// `fechaDe` (calendario.js), así que el tablero puede mostrarle al jugador
// "6 semanas" en vez de "1 bloque" — una cifra que se entiende de un
// vistazo, sin traducir.
//
// Los números de acá abajo son rangos reales de recuperación boxística
// (leve: 2-6 semanas; moderada: 2-3 meses; grave: varios meses, con margen
// para una lesión de las que de verdad asustan), elegidos siempre hacia el
// extremo ALTO del rango real: el usuario pidió "creíble", no "el piso más
// optimista".
//
// Corrección del coordinador (segunda vuelta de esta misma ronda): la
// primera versión de este cambio contaba las semanas correctamente pero
// seguía revisando `puedePelear` UNA sola vez por bloque, en avanzarBloque,
// justo DESPUÉS de un salto instantáneo de 52 semanas — así que cualquier
// lesión de 52 semanas o menos (todas las leves/moderadas) ya aparecía
// curada la primera vez que se la miraba: cero ofertas perdidas, la cirugía
// no cambiaba nada. El arreglo de fondo NO fue acá: fue mover el gate a
// donde de verdad se juega cada oportunidad de pelea — ver el comentario
// grande de `armarLotePeleas` en tramite.js. Cada CUPO de pelea del año
// (`intentos`, tramite.js) representa una porción de esas 52 semanas, y si
// el jugador sigue lesionado EN ESE MOMENTO puntual, ese cupo se pierde de
// verdad (ni oferta ni trámite) — recién ahí, con el gate evaluado semana a
// semana en vez de una vez al año, una lesión corta le cuesta al menos una
// oportunidad real, y una larga (rodilla/conmoción) puede costarle varias, o
// el año entero si el jugador tiene pocos cupos (veterano). Ahí es donde
// pagar la cirugía (ver `curarConDinero`) cambia el resultado real de la
// carrera, no solo el cosmético.
//
// Medido con `node scripts/balance-sim.mjs 400` ("creación real, jugando
// bien") y con un script ad hoc sobre el jugador MÁS DÉBIL del proyecto
// (media=45 fija, n=2500, mismo método que career-lesiones-reales.test.js):
//   - Ofertas/cupos perdidos por lesión: avg=0.36 por carrera (creación
//     real, jugador fuerte) | avg=0.65 por carrera (jugador más débil,
//     44.2% de sus carreras pierden al menos una oferta por lesión). Ya no
//     es cero: la regla "cualquier lesión activa bloquea la oferta" cuesta
//     algo de verdad, sin volverse devastadora.
//   - 3 cinturones: sigue en 100% (creación real, n=400) y 99.1% (jugador
//     más débil, n=2500) — el piso de 85% del eje de cinturones aguanta con
//     margen amplio, tanto en el test de 3000 semillas (career.test.js)
//     como en el de lesiones reales sobre 2500 (career-lesiones-reales.test.js).
//   - Minutos estimados (creación real, balance-sim): ~22.3 (objetivo ~20,
//     mismo margen chico que ya tenía la ronda anterior).
export const LESIONES = [
  { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, semanas: 4, costo: 8000, modsForma: -8, texto: 'Te abrieron la ceja. Nada grave, pero molesta.' },
  { id: 'nariz', nombre: 'Nariz rota', severidad: 1, semanas: 5, costo: 9000, modsForma: -10, texto: 'Nariz rota. Vas a respirar por la boca un tiempo.' },
  { id: 'costillas', nombre: 'Costillas golpeadas', severidad: 2, semanas: 7, costo: 20000, modsForma: -18, texto: 'Costillas golpeadas: cada respiración te recuerda la pelea.' },
  { id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanas: 10, costo: 26000, modsForma: -20, texto: 'Te fracturaste la mano. Yeso y paciencia.' },
  { id: 'hombro', nombre: 'Hombro dislocado', severidad: 2, semanas: 12, costo: 30000, modsForma: -22, texto: 'Hombro dislocado. Kinesiología por un buen rato.' },
  { id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, semanas: 64, costo: 85000, modsForma: -30, texto: 'Ligamentos de la rodilla. Esta es de las que asustan.' },
  { id: 'conmocion', nombre: 'Conmoción', severidad: 3, semanas: 56, costo: 75000, modsForma: -28, texto: 'Conmoción cerebral. El médico fue tajante: descanso.' },
];

// Probabilidad base recortada de 0.18 a 0.10 (contexto 'pelea'), mismo
// motivo que el recorte de duraciones de arriba: con el gate ampliado a
// cualquier severidad, la frecuencia vieja se comía demasiadas ofertas.
// También se corrieron los PESOS de severidad (más abajo, en tirarLesion) de
// 6/3/1 a 8/1/1: además de menos frecuente, cuando toca lesión ahora es
// mucho más probable que sea la leve y rápida (semanas, no meses) que la
// moderada o grave — moderada/grave siguen existiendo (y siguen doliendo
// cuando tocan), pero ahora son la excepción de verdad, no un tercio de las
// lesiones.
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
    semanasRestantes: elegida.semanas,
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

// `semanas` es cuánto tiempo de calendario de verdad pasó desde el último
// chequeo. Quien llama en la práctica es `armarLotePeleas` (tramite.js), con
// `semanasPorIntento` — una porción del bloque, no el bloque entero (ver el
// comentario grande de LESIONES, arriba, para el porqué): el default de 1
// acá solo es una red de seguridad para llamadores que no lo pasen.
export function recuperar(peleador, { semanas = 1 } = {}) {
  if (!peleador.estado.lesion) return { peleador, curada: false };
  const nuevo = clonar(peleador);
  const restantes = nuevo.estado.lesion.semanasRestantes - semanas;
  if (restantes <= 0) {
    nuevo.estado.lesion = null;
    nuevo.estado.forma = clamp(nuevo.estado.forma + 10, 0, 100);
    return { peleador: nuevo, curada: true };
  }
  nuevo.estado.lesion = { ...nuevo.estado.lesion, semanasRestantes: restantes };
  return { peleador: nuevo, curada: false };
}

// v7 (pedido del usuario, textual: "se debe de poder pagar la cirugía para
// reducir los tiempos de recuperación en un -90%"): antes esto curaba
// SIEMPRE del todo, por un precio fijo — ahora reduce lo que falta de
// recuperación al 10% (redondeado), lo mismo que pide el brief, ni más ni
// menos. Con el gate de lesión evaluado cupo por cupo (ver el comentario
// grande de LESIONES, arriba, y armarLotePeleas en tramite.js), pagar SÍ
// cambia el resultado real de la carrera para cualquier severidad, no solo
// las graves: una mano fracturada (10 semanas) que iba a costarle el cupo
// de este momento puntual puede quedar en 1 semana tras la cirugía —
// suficiente para no perderse el cupo SIGUIENTE del mismo bloque, si lo hay.
// Cuanto más larga la lesión de base, más cupos reales le ahorra pagar.
// Precios calibrados contra cuánto dinero tiene en el bolsillo un jugador
// típico en el momento de lesionarse (medido con una corrida "creación
// real, jugando bien": mínimo ≈US$130-150K, mediana ≈US$290K — ver el informe
// de la ronda): las leves/moderadas quedan en la escala del STAFF más caro
// (money.js, US$12-34K, sin quitarle sentido a esa referencia), pero las
// graves —las que más cupos reales pueden costar— cuestan bastante más
// (US$75-85K, escala de un LUJO como la mansión): caras de verdad, pero
// alcanzables incluso para el jugador con menos plata en ese momento — que
// paguen es una decisión que tiene que doler, no un trámite.
const REDUCCION_CIRUGIA = 0.1;

export function curarConDinero(peleador, lesion) {
  if (!lesion || peleador.dinero < lesion.costo) {
    return { peleador, gasto: 0, ok: false };
  }
  const nuevo = clonar(peleador);
  nuevo.dinero -= lesion.costo;
  const restantes = Math.round((lesion.semanasRestantes ?? 0) * REDUCCION_CIRUGIA);
  if (restantes <= 0) {
    nuevo.estado.lesion = null;
  } else {
    nuevo.estado.lesion = { ...nuevo.estado.lesion, semanasRestantes: restantes };
  }
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
