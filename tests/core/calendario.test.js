import { describe, it, expect } from 'vitest';
import {
  fechaDe, semanasDeBloque, semanasHastaPelea, SEMANAS_POR_ANIO, mesesDelAnio,
} from '../../src/core/calendario.js';

describe('fechaDe', () => {
  it('arranca en enero, semana 1, del año inicial', () => {
    const f = fechaDe(1, 2026);
    expect(f.anio).toBe(2026);
    expect(f.nombreMes).toBe('Enero');
    expect(f.semanaDelMes).toBe(1);
    expect(f.texto).toBe('Enero 2026 · Semana 1');
  });

  it('avanza de mes en mes de forma monotónica a lo largo del año', () => {
    const meses = [];
    for (let semana = 1; semana <= SEMANAS_POR_ANIO; semana += 1) {
      const f = fechaDe(semana, 2026);
      if (meses[meses.length - 1] !== f.nombreMes) meses.push(f.nombreMes);
    }
    // Doce meses, cada uno una sola vez, en orden.
    expect(meses).toEqual([
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]);
  });

  it('la semana del mes nunca es cero ni negativa, y nunca salta (siempre +1 o reinicia en 1)', () => {
    let semanaMesAnterior = null;
    for (let semana = 1; semana <= SEMANAS_POR_ANIO * 2; semana += 1) {
      const f = fechaDe(semana, 2026);
      expect(f.semanaDelMes).toBeGreaterThanOrEqual(1);
      if (semanaMesAnterior !== null) {
        expect(f.semanaDelMes === semanaMesAnterior + 1 || f.semanaDelMes === 1).toBe(true);
      }
      semanaMesAnterior = f.semanaDelMes;
    }
  });

  it('pasado el año, avanza al año siguiente', () => {
    const f = fechaDe(SEMANAS_POR_ANIO + 1, 2026);
    expect(f.anio).toBe(2027);
    expect(f.nombreMes).toBe('Enero');
  });

  it('es coherente entre semilla y semilla: misma semanaGlobal, misma fecha', () => {
    expect(fechaDe(30, 2026)).toEqual(fechaDe(30, 2026));
  });
});

describe('semanasDeBloque', () => {
  it('traduce años por bloque a semanas, redondeando', () => {
    expect(semanasDeBloque(1)).toBe(52);
    expect(semanasDeBloque(1.3)).toBe(Math.round(1.3 * 52));
  });
});

describe('mesesDelAnio', () => {
  // Pensado para el eje X del gráfico de fin de año (grafico-media.js, pedido
  // textual: "el gráfico va de enero a diciembre, siempre") — da la
  // semanaGlobal en la que arranca cada uno de los 12 meses de UN año
  // calendario dado, sin que la UI tenga que reimplementar el reparto de 52
  // semanas en 12 meses (LIMITES_MES, ya privado acá).
  it('devuelve los 12 meses en orden, de Enero a Diciembre', () => {
    const meses = mesesDelAnio(2026, 2026);
    expect(meses).toHaveLength(12);
    expect(meses.map((m) => m.nombreMes)).toEqual([
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]);
  });

  it('el mes N arranca en la semanaGlobal que fechaDe reconoce como ese mismo mes', () => {
    const meses = mesesDelAnio(2026, 2026);
    meses.forEach((m) => {
      const f = fechaDe(m.semanaGlobal, 2026);
      expect(f.anio).toBe(2026);
      expect(f.nombreMes).toBe(m.nombreMes);
      expect(f.semanaDelMes).toBe(1); // arranca el mes, primera semana
    });
  });

  it('el primer mes (Enero) arranca en la primera semanaGlobal del año', () => {
    const meses = mesesDelAnio(2027, 2026);
    // 2027 es el 2do año desde 2026: arranca en la semana 53.
    expect(meses[0].semanaGlobal).toBe(SEMANAS_POR_ANIO + 1);
  });

  it('cada mes arranca en una semanaGlobal mayor que el anterior (monotónico)', () => {
    const meses = mesesDelAnio(2030, 2026);
    for (let i = 1; i < meses.length; i += 1) {
      expect(meses[i].semanaGlobal).toBeGreaterThan(meses[i - 1].semanaGlobal);
    }
  });
});

describe('semanasHastaPelea', () => {
  it('sin oferta pendiente, devuelve null', () => {
    expect(semanasHastaPelea({ semanaGlobal: 10, proximaPelea: null })).toBeNull();
  });

  it('con oferta pendiente, cuenta las semanas que faltan sin bajar de cero', () => {
    const partida = { semanaGlobal: 10, proximaPelea: { semanaObjetivo: 15 } };
    expect(semanasHastaPelea(partida)).toBe(5);
  });

  it('nunca devuelve un numero negativo', () => {
    const partida = { semanaGlobal: 20, proximaPelea: { semanaObjetivo: 15 } };
    expect(semanasHastaPelea(partida)).toBe(0);
  });
});
