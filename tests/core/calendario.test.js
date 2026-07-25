import { describe, it, expect } from 'vitest';
import {
  fechaDe, semanasDeBloque, semanasHastaPelea, SEMANAS_POR_ANIO,
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
