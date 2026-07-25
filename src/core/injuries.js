import { clamp } from './stats.js';

export const LESIONES = [
  { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, bloques: 1, costo: 4000, modsForma: -8, texto: 'Te abrieron la ceja. Nada grave, pero molesta.' },
  { id: 'nariz', nombre: 'Nariz rota', severidad: 1, bloques: 1, costo: 6000, modsForma: -10, texto: 'Nariz rota. Vas a respirar por la boca un tiempo.' },
  { id: 'costillas', nombre: 'Costillas golpeadas', severidad: 2, bloques: 2, costo: 18000, modsForma: -18, texto: 'Costillas golpeadas: cada respiración te recuerda la pelea.' },
  { id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloques: 2, costo: 22000, modsForma: -20, texto: 'Te fracturaste la mano. Yeso y paciencia.' },
  { id: 'hombro', nombre: 'Hombro dislocado', severidad: 2, bloques: 3, costo: 28000, modsForma: -22, texto: 'Hombro dislocado. Kinesiología por un buen rato.' },
  { id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, bloques: 4, costo: 60000, modsForma: -30, texto: 'Ligamentos de la rodilla. Esta es de las que asustan.' },
  { id: 'conmocion', nombre: 'Conmoción', severidad: 3, bloques: 4, costo: 55000, modsForma: -28, texto: 'Conmoción cerebral. El médico fue tajante: descanso.' },
];

const PROB_BASE = { pelea: 0.18, entrenamiento: 0.05 };

export function tirarLesion(rng, { peleador, contexto = 'pelea', danoRecibido = 0 }) {
  const base = PROB_BASE[contexto] ?? 0.05;
  const porDano = clamp(danoRecibido, 0, 100) / 400;
  const proteccion = (peleador.especiales?.disciplinaPersonal ?? 40) / 500;
  const staffProtege = (peleador.staff ?? []).includes('kinesiologo') ? 0.06 : 0;
  const prob = clamp(base + porDano - proteccion - staffProtege, 0.01, 0.6);
  if (!rng.chance(prob)) return null;

  const pesos = LESIONES.map((l) => ({
    valor: l,
    peso: l.severidad === 1 ? 6 : l.severidad === 2 ? 3 : 1,
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

export function puedePelear(peleador) {
  const lesion = peleador.estado.lesion;
  return !lesion || lesion.severidad < 3;
}
