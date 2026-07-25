import { describe, it, expect } from 'vitest';
import {
  crearRivalidad, registrarCruce, subirHeat, elegirArchirrival, h2hTexto,
} from '../../src/core/rivalry.js';

describe('rivalidades', () => {
  it('crea una rivalidad limpia', () => {
    const r = crearRivalidad('jug_1', 'riv_1');
    expect(r).toEqual({ rivalId: 'riv_1', heat: 10, h2h: { v: 0, d: 0, e: 0 }, esArchirrival: false, hitos: [] });
  });

  it('registrar un cruce crea la rivalidad si no existia', () => {
    const lista = registrarCruce([], 'riv_1', 'v');
    expect(lista).toHaveLength(1);
    expect(lista[0].h2h.v).toBe(1);
  });

  it('acumula cruces y sube el heat', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    const heatInicial = lista[0].heat;
    lista = registrarCruce(lista, 'riv_1', 'd');
    expect(lista[0].h2h).toEqual({ v: 1, d: 1, e: 0 });
    expect(lista[0].heat).toBeGreaterThan(heatInicial);
  });

  it('no muta la lista original', () => {
    const lista = registrarCruce([], 'riv_1', 'v');
    const copia = JSON.stringify(lista);
    registrarCruce(lista, 'riv_1', 'd');
    expect(JSON.stringify(lista)).toBe(copia);
  });

  it('subirHeat acota entre 0 y 100', () => {
    let lista = subirHeat([], 'riv_1', 500);
    expect(lista[0].heat).toBe(100);
    lista = subirHeat(lista, 'riv_1', -500);
    expect(lista[0].heat).toBe(0);
  });

  it('elegirArchirrival exige al menos dos cruces', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    expect(elegirArchirrival(lista)).toBeNull();
    lista = registrarCruce(lista, 'riv_1', 'd');
    expect(elegirArchirrival(lista).rivalId).toBe('riv_1');
  });

  it('elige al de mas heat y lo marca', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    lista = registrarCruce(lista, 'riv_1', 'd');
    lista = registrarCruce(lista, 'riv_2', 'v');
    lista = registrarCruce(lista, 'riv_2', 'v');
    lista = subirHeat(lista, 'riv_2', 60);
    const archi = elegirArchirrival(lista);
    expect(archi.rivalId).toBe('riv_2');
    expect(archi.esArchirrival).toBe(true);
  });

  it('h2hTexto omite empates en cero', () => {
    const r = crearRivalidad('jug_1', 'riv_1');
    r.h2h = { v: 1, d: 1, e: 0 };
    expect(h2hTexto(r)).toBe('1-1');
    r.h2h = { v: 1, d: 1, e: 1 };
    expect(h2hTexto(r)).toBe('1-1-1');
  });
});
