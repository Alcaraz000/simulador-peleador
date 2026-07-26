import { describe, it, expect } from 'vitest';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_CAMPAMENTO } from '../../src/content/cards-camp.js';

// Pedido 1 (v4, "variedad de contenido"): al menos 8 decisiones de DOS
// opciones con un dilema real -- una opción hace algo con costo, la otra no
// cambia nada o casi nada -- repartidas entre las etapas y también en el
// campamento. Viven en los MISMOS pools que las cartas de tres opciones
// (CARTAS_EVENTO ya tenía cartas de 3, como 'chantaje'): nunca en un
// catálogo aparte, para que el jugador se las cruce mezcladas sin patrón
// previsible.
const IDS_DILEMA_V4 = [
  // CARTAS_EVENTO
  'guantes_nuevos', 'cuerpo_pide_tregua', 'beca_deportiva', 'primer_lujo',
  'gimnasio_de_moda', 'consejo_del_viejo_entrenador', 'la_costilla_que_avisa',
  'torneo_interbarrial', 'fotos_viejas',
  // CARTAS_CAMPAMENTO
  'dia_franco', 'ropa_nueva_de_entrenar', 'video_motivacional', 'sesion_biomecanica',
];

function magnitud(opcion) {
  return Object.values(opcion.mods ?? {}).reduce((acc, v) => acc + Math.abs(v), 0);
}

// "Liviana": no arriesga (sin probabilidades), no toca dinero/fama/heat
// (sin efectos) y sus mods -si tiene- son chicos: no cambia nada, o casi.
function esLiviana(opcion) {
  return !opcion.probabilidades && !opcion.efectos && magnitud(opcion) <= 4;
}

// "Fuerte": arriesga (probabilidades), mueve dinero/fama/heat (efectos), o
// tiene mods de peso real.
function esFuerte(opcion) {
  return Boolean(opcion.probabilidades) || Boolean(opcion.efectos) || magnitud(opcion) > 4;
}

describe('decisiones de dos opciones con dilema real (Pedido 1, v4)', () => {
  const todas = [...CARTAS_EVENTO, ...CARTAS_CAMPAMENTO];
  const cartas = IDS_DILEMA_V4.map((id) => todas.find((c) => c.id === id));

  it('hay al menos 8 cartas nuevas, todas encontradas en su catálogo', () => {
    expect(IDS_DILEMA_V4.length).toBeGreaterThanOrEqual(8);
    for (const [i, carta] of cartas.entries()) {
      expect(carta, `no se encontró la carta "${IDS_DILEMA_V4[i]}"`).toBeTruthy();
    }
  });

  it('cada una tiene exactamente 2 opciones', () => {
    for (const carta of cartas) expect(carta.opciones).toHaveLength(2);
  });

  it('cada una tiene una opción con costo real y la otra sin cambios (o mínimos): el dilema es real', () => {
    for (const carta of cartas) {
      const [a, b] = carta.opciones;
      const hayDilema = (esFuerte(a) && esLiviana(b)) || (esFuerte(b) && esLiviana(a));
      expect(hayDilema, `la carta "${carta.id}" no tiene el patrón costo-vs-nada`).toBe(true);
    }
  });

  it('cubre las cuatro etapas de la carrera (juvenil, amateur, profesional, veterano)', () => {
    for (const etapa of ['juvenil', 'amateur', 'profesional', 'veterano']) {
      expect(cartas.some((c) => c.etapas.includes(etapa)), `ninguna carta nueva aplica en "${etapa}"`).toBe(true);
    }
  });

  it('incluye cartas del campamento de preparación', () => {
    const deCampamento = cartas.filter((c) => c.categoria === 'campamento');
    expect(deCampamento.length).toBeGreaterThanOrEqual(3);
  });

  it('aparecen mezcladas en el mismo pool que decisiones de tres opciones (CARTAS_EVENTO ya tiene alguna, ej. "chantaje")', () => {
    const conTres = CARTAS_EVENTO.filter((c) => c.opciones.length === 3);
    expect(conTres.length).toBeGreaterThan(0);
  });

  it('todas las cartas de campamento siguen siendo de exactamente 2 opciones (invariante del proyecto)', () => {
    for (const carta of CARTAS_CAMPAMENTO) expect(carta.opciones).toHaveLength(2);
  });
});
