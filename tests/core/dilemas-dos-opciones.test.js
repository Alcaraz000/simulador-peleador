import { describe, it, expect } from 'vitest';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_CAMPAMENTO } from '../../src/content/cards-camp.js';

// Pedido 1 y 3 (v4/v7, "no todo tiene que ser elegir entre mejoras
// equivalentes... alguna opción puede no hacer nada"): en vez de nombrar
// cartas puntuales por id (frágil frente a una reescritura de contenido, v13),
// estos tests miran el catálogo ENTERO y verifican la propiedad que importa:
// que el patrón "una opción hace algo, la otra no hace nada" exista de
// verdad, repartido en las etapas y también en el campamento.
function magnitud(opcion) {
  return Object.values(opcion.mods ?? {}).reduce((acc, v) => acc + Math.abs(v), 0);
}

// Una opción "no hace nada": sin azar, sin efectos de dinero/heat, y sin
// mods (o con mods vacío) — la rama segura del patrón arriesgar-o-no, y la
// mitad "floja" del patrón costo-vs-nada.
function noHaceNada(opcion) {
  return !opcion.probabilidades && !opcion.efectos && magnitud(opcion) === 0;
}

// Una opción "hace algo real": arriesga (probabilidades), mueve dinero/heat
// (efectos), o tiene mods de peso.
function haceAlgo(opcion) {
  return Boolean(opcion.probabilidades) || Boolean(opcion.efectos) || magnitud(opcion) > 0;
}

function tieneDilema(carta) {
  if (carta.opciones.length !== 2) return false;
  const [a, b] = carta.opciones;
  return (haceAlgo(a) && noHaceNada(b)) || (haceAlgo(b) && noHaceNada(a));
}

describe('decisiones de dos opciones con dilema real (contrato de catálogo)', () => {
  const todas = [...CARTAS_EVENTO, ...CARTAS_CAMPAMENTO];
  const conDilema = todas.filter(tieneDilema);

  it('hay muchas cartas con el patrón "una opción hace algo, la otra no hace nada"', () => {
    expect(conDilema.length).toBeGreaterThanOrEqual(15);
  });

  it('el patrón aparece en las cuatro etapas de la carrera', () => {
    for (const etapa of ['juvenil', 'amateur', 'profesional', 'veterano']) {
      expect(conDilema.some((c) => c.etapas.includes(etapa)), `ninguna carta con dilema aplica en "${etapa}"`).toBe(true);
    }
  });

  it('el campamento aporta varias cartas con este patrón', () => {
    const deCampamento = conDilema.filter((c) => c.categoria === 'campamento');
    expect(deCampamento.length).toBeGreaterThanOrEqual(3);
  });

  it('dos opciones es la norma: la enorme mayoría de CARTAS_EVENTO tiene exactamente 2', () => {
    const conDos = CARTAS_EVENTO.filter((c) => c.opciones.length === 2);
    expect(conDos.length).toBeGreaterThan(CARTAS_EVENTO.length * 0.8);
  });

  it('las de tres opciones son especiales y aparecen poco (menos del 15% del mazo de eventos)', () => {
    const conTres = CARTAS_EVENTO.filter((c) => c.opciones.length === 3);
    expect(conTres.length).toBeGreaterThan(0);
    expect(conTres.length).toBeLessThan(CARTAS_EVENTO.length * 0.15);
  });

  it('todas las cartas de campamento son de exactamente 2 opciones (invariante del proyecto)', () => {
    for (const carta of CARTAS_CAMPAMENTO) expect(carta.opciones).toHaveLength(2);
  });
});
