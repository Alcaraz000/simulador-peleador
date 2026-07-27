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

// Pedido 3 (v7, feedback del usuario: "hay que sumar más tarjetas con 2
// opciones... no todo tiene que tener un resultado, alguna opción puede 'no
// hacer nada'"): al menos 10 cartas MÁS con el mismo patrón costo-vs-nada.
// Varias de estas combinan con el Pedido 2 (azar): la opción "fuerte" no
// necesita mods grandes si arriesga con `probabilidades` -- por eso
// `esFuerte`/`esLiviana` (arriba) ya contemplan ese caso.
const IDS_DILEMA_V7 = [
  // CARTAS_EVENTO -- combinadas con azar (Pedido 2)
  'picado_de_barrio', 'prueba_de_nivel', 'flete_de_ultima', 'sparring_clandestino',
  'promesa_del_dt_rival', 'bono_por_nocaut', 'ventosas_del_masajista',
  'pronostico_del_curandero', 'desafio_en_redes',
  // CARTAS_EVENTO -- dilema puro, sin azar
  'turno_en_la_muela', 'clase_a_los_pibes', 'celular_nuevo',
  // CARTAS_CAMPAMENTO -- combinadas con azar
  'suplemento_del_gimnasio', 'pronostico_de_la_prensa',
  // CARTAS_CAMPAMENTO -- dilema puro
  'musica_del_gimnasio', 'visita_de_los_chicos',
];

describe('decisiones de dos opciones con dilema real, lote nuevo (Pedido 3, v7)', () => {
  const todas = [...CARTAS_EVENTO, ...CARTAS_CAMPAMENTO];
  const cartas = IDS_DILEMA_V7.map((id) => todas.find((c) => c.id === id));

  it('hay al menos 10 cartas nuevas, todas encontradas en su catálogo', () => {
    expect(IDS_DILEMA_V7.length).toBeGreaterThanOrEqual(10);
    for (const [i, carta] of cartas.entries()) {
      expect(carta, `no se encontró la carta "${IDS_DILEMA_V7[i]}"`).toBeTruthy();
    }
  });

  it('cada una tiene exactamente 2 opciones', () => {
    for (const carta of cartas) expect(carta.opciones).toHaveLength(2);
  });

  it('cada una tiene una opción con costo/riesgo real y la otra sin cambios (o mínimos)', () => {
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

  it('no repite ningún id del lote anterior (Pedido 1, v4)', () => {
    const solapados = IDS_DILEMA_V7.filter((id) => IDS_DILEMA_V4.includes(id));
    expect(solapados).toEqual([]);
  });
});
