import { clamp } from './stats.js';

// Precios calibrados con números medidos (Sistema 3, feedback del usuario:
// "la tienda es muy costosa, no da tiempo"). Medido con `node
// scripts/money-sim.mjs 400` sobre una carrera "jugando bien" (acepta y gana
// toda oferta): con los precios viejos (staff 80k-160k, lujos 60k-4M), el
// dinero promedio a MITAD de carrera (bloque 10 de 20) era de apenas
// US$13.628 — no alcanzaba ni para el ítem más barato — y la primera compra
// recién se volvía típica cerca del bloque 14 (70% de la carrera ya jugada).
// El jugador terminaba la carrera entera sin haber podido usar el sistema ni
// una vez: la tienda era una vidriera, nunca una decisión.
//
// Los nuevos precios de STAFF (mantienen el mismo orden relativo de antes:
// psicólogo el más barato, mánager el más caro) hacen que la primera compra
// caiga justo alrededor del bloque 10 — la MITAD de la carrera — y que un
// jugador que junta bien la plata pueda tener el equipo completo bastante
// antes del cierre, con bloques de sobra para sentir su efecto. LUJOS bajan
// menos (siguen siendo el gusto de fin de carrera, sin efecto de juego) y la
// isla privada queda deliberadamente como estiramiento para las carreras más
// ganadoras — no todas las carreras tienen que poder comprar TODO.
export const STAFF = [
  { id: 'psicologo', nombre: 'Psicólogo deportivo', descripcion: 'Cabeza fría: la mala racha te dura menos.', precio: 12000, efecto: 'moral' },
  { id: 'kinesiologo', nombre: 'Kinesiólogo personal', descripcion: 'Cuerpo blindado: menos riesgo de lesión.', precio: 16000, efecto: 'lesiones' },
  { id: 'entrenador', nombre: 'Entrenador de elite', descripcion: 'Mejores cartas de mejora: más opciones y números más altos.', precio: 22000, efecto: 'cartas' },
  { id: 'preparador', nombre: 'Preparador físico', descripcion: 'El declive de las piernas llega más tarde.', precio: 28000, efecto: 'declive' },
  { id: 'manager', nombre: 'Súper mánager', descripcion: 'El mejor agente: mejores ofertas y bolsas más gordas.', precio: 34000, efecto: 'ofertas' },
];

export const LUJOS = [
  { id: 'auto', nombre: 'Auto deportivo', precio: 14000, fama: 3, legado: 1 },
  { id: 'casa', nombre: 'Casa propia', precio: 32000, fama: 4, legado: 2 },
  { id: 'mansion', nombre: 'Mansión con ring', precio: 110000, fama: 8, legado: 4 },
  { id: 'yate', nombre: 'Yate', precio: 260000, fama: 10, legado: 6 },
  { id: 'isla', nombre: 'Isla privada', precio: 650000, fama: 15, legado: 10 },
];

const TODOS = [...STAFF, ...LUJOS];

function buscarItem(itemId) {
  const item = TODOS.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item desconocido: ${itemId}`);
  return item;
}

function esStaff(itemId) {
  return STAFF.some((i) => i.id === itemId);
}

export function tieneStaff(jugador, staffId) {
  return (jugador.staff ?? []).includes(staffId);
}

function yaComprado(jugador, itemId) {
  return esStaff(itemId)
    ? (jugador.staff ?? []).includes(itemId)
    : (jugador.lujos ?? []).includes(itemId);
}

export function catalogo(jugador) {
  const marcar = (item) => ({
    ...item,
    comprado: yaComprado(jugador, item.id),
    alcanza: jugador.dinero >= item.precio,
  });
  return { staff: STAFF.map(marcar), lujos: LUJOS.map(marcar) };
}

function clonar(jugador) {
  return { ...jugador, staff: [...(jugador.staff ?? [])], lujos: [...(jugador.lujos ?? [])] };
}

export function comprar(jugador, itemId) {
  const item = buscarItem(itemId);
  if (yaComprado(jugador, itemId)) {
    return { jugador, ok: false, texto: `Ya tenés ${item.nombre.toLowerCase()}.` };
  }
  if (jugador.dinero < item.precio) {
    return { jugador, ok: false, texto: `No te alcanza para ${item.nombre.toLowerCase()}.` };
  }
  const nuevo = clonar(jugador);
  nuevo.dinero -= item.precio;
  if (esStaff(itemId)) {
    nuevo.staff.push(itemId);
    return { jugador: nuevo, ok: true, texto: `${item.nombre} se suma al equipo.` };
  }
  nuevo.lujos.push(itemId);
  nuevo.fama = clamp(nuevo.fama + item.fama, 0, 100);
  return { jugador: nuevo, ok: true, texto: `Te compraste ${item.nombre.toLowerCase()}. Que se note.` };
}

export function bonusCartas(jugador) {
  return tieneStaff(jugador, 'entrenador')
    ? { opcionesExtra: 1, bonusValor: 1 }
    : { opcionesExtra: 0, bonusValor: 0 };
}

export function cobrarSponsor(jugador, rng) {
  const prob = clamp(jugador.fama / 180, 0, 0.5);
  if (jugador.fama <= 0 || !rng.chance(prob)) return null;
  const monto = Math.round(1500 * (1 + jugador.fama / 12) * rng.float(0.8, 1.4));
  const nuevo = clonar(jugador);
  nuevo.dinero += monto;
  const marcas = ['una marca de indumentaria', 'una cervecería', 'una casa de suplementos', 'una app de apuestas'];
  return {
    jugador: nuevo,
    monto,
    texto: `Te firmó ${rng.pick(marcas)}: US$ ${monto.toLocaleString('es-AR')} al bolsillo.`,
  };
}
