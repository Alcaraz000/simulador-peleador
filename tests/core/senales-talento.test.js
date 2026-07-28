import { describe, it, expect } from 'vitest';
import { senalDeTalento } from '../../src/core/coach.js';
import { SENALES_TALENTO, DECISIONES_ANTES_DE_OPINAR } from '../../src/content/senales-talento.js';

const con = (techo) => ({ talento: { techo, curva: 'normal' } });

describe('senalDeTalento', () => {
  it('no dice nada hasta que hay con que opinar', () => {
    for (let d = 0; d < DECISIONES_ANTES_DE_OPINAR; d += 1) {
      expect(senalDeTalento(con(1.3), d)).toBeNull();
    }
    expect(senalDeTalento(con(1.3), DECISIONES_ANTES_DE_OPINAR)).not.toBeNull();
  });

  it('un techo alto y uno bajo dan familias de frases distintas', () => {
    const alto = senalDeTalento(con(1.3), 8);
    const bajo = senalDeTalento(con(0.72), 8);
    expect(SENALES_TALENTO.alto).toContain(alto);
    expect(SENALES_TALENTO.bajo).toContain(bajo);
    expect(alto).not.toBe(bajo);
  });

  it('nunca filtra un numero: el talento se intuye, no se lee', () => {
    for (const familia of Object.values(SENALES_TALENTO)) {
      for (const frase of familia) {
        expect(frase).not.toMatch(/\d/);
      }
    }
  });

  it('cada familia tiene al menos seis variantes', () => {
    for (const familia of Object.values(SENALES_TALENTO)) {
      expect(familia.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('es determinista: la misma partida da la misma senal', () => {
    expect(senalDeTalento(con(1.3), 9)).toBe(senalDeTalento(con(1.3), 9));
  });

  it('la frase cambia con el correr de las decisiones, no se repite siempre la misma', () => {
    const vistas = new Set(Array.from({ length: 12 }, (_, i) => senalDeTalento(con(1), i + DECISIONES_ANTES_DE_OPINAR)));
    expect(vistas.size).toBeGreaterThan(1);
  });
});
