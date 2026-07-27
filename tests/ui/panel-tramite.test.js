import { describe, it, expect, beforeEach } from 'vitest';
import { renderCardTramite, opcionesMinijuego } from '../../src/ui/screens/panel-tramite.js';
import { crearPeleador } from '../../src/core/fighter.js';

function ofertaDeMuestra() {
  return {
    rivalId: 'riv_1',
    rivalNombre: 'Tyrell Carter',
    rivalApodo: 'El Tanque',
    rivalMedia: 61,
    rivalRecord: '10-2',
    rivalRanking: 14,
    bolsa: 4200,
    fraseEntrenador: 'Va a ser una pelea pareja, prestá atención.',
  };
}

function rivalDeMuestra() {
  return crearPeleador({
    nombre: 'Tyrell Carter', apodo: 'El Tanque', nacionalidad: 'MX', disciplina: 'boxeo',
    estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 61,
  });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="region"></div><div id="afuera">intacto</div>';
  cont = document.getElementById('region');
});

describe('renderCardTramite', () => {
  it('muestra nombre con apodo, récord, ranking y media del rival', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.textContent).toContain('"El Tanque" Tyrell Carter');
    expect(cont.textContent).toContain('10-2');
    expect(cont.textContent).toContain('#14');
    expect(cont.textContent).toContain('61');
  });

  it('muestra la bandera del rival como SVG (nunca un emoji)', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(cont.textContent).not.toMatch(/🇲🇽|🏳/);
  });

  it('muestra un resumen de las estadisticas del rival', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.querySelectorAll('.panel-peleador-atributo').length).toBe(6);
  });

  it('sin rival (dato no disponible), no rompe y sigue mostrando lo que trae la oferta', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: null });
    expect(cont.textContent).toContain('Tyrell Carter');
    expect(cont.querySelectorAll('.panel-peleador-atributo').length).toBe(0);
  });

  it('sin apodo, muestra solo el nombre (nunca "null")', () => {
    const oferta = { ...ofertaDeMuestra(), rivalApodo: null };
    renderCardTramite(cont, { oferta, rival: null });
    expect(cont.textContent).not.toContain('null');
    expect(cont.textContent).toContain('Tyrell Carter');
  });

  // Pedido 1 (v7, "que se anuncie antes"): la voz del entrenador, la bolsa y
  // cuánto falta viven en la MISMA tarjeta que el rival (no una pantalla
  // aparte — ver el comentario grande del archivo sobre el presupuesto de
  // minutos).
  it('incluye la voz del entrenador, la bolsa y cuanto falta (Pedido 1, fusionado en la misma tarjeta)', () => {
    renderCardTramite(cont, {
      oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), semanas: 6, apertura: 'Ya hay rival para la próxima.',
    });
    expect(cont.textContent).toContain('Ya hay rival para la próxima.');
    expect(cont.textContent).toContain('Va a ser una pelea pareja, prestá atención.');
    expect(cont.textContent).toContain('US$ 4K');
    expect(cont.textContent).toContain('Faltan 6 semanas');
  });

  it('con 0 semanas, dice que es esta semana (no "Faltan 0 semanas")', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), semanas: 0 });
    expect(cont.textContent).toContain('Es esta semana');
  });

  it('sin apertura, no deja un parrafo vacio ni "undefined"', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(cont.textContent).not.toContain('undefined');
  });

  it('el boton "Simular pelea" dispara onSimular', () => {
    let veces = 0;
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra(), onSimular: () => { veces += 1; } });
    cont.querySelector('[data-accion="simular-pelea"]').click();
    expect(veces).toBe(1);
  });

  it('se monta dentro de la region sin tocar el resto del documento', () => {
    renderCardTramite(cont, { oferta: ofertaDeMuestra(), rival: rivalDeMuestra() });
    expect(document.getElementById('afuera').textContent).toBe('intacto');
  });
});

describe('opcionesMinijuego', () => {
  it('devuelve las 3 acciones tacticas del ciclo, cada una con titulo, descripcion e icono', () => {
    const opciones = opcionesMinijuego();
    expect(opciones).toHaveLength(3);
    expect(opciones.map((o) => o.id).sort()).toEqual(['menton', 'noqueador', 'tecnico']);
    for (const o of opciones) {
      expect(o.titulo.length).toBeGreaterThan(0);
      expect(o.descripcion.length).toBeGreaterThan(0);
      expect(o.icono).toBeInstanceOf(SVGElement);
    }
  });

  it('cada llamada arma nodos de icono NUEVOS (no comparte referencias entre rondas)', () => {
    const primera = opcionesMinijuego();
    const segunda = opcionesMinijuego();
    for (let i = 0; i < primera.length; i += 1) {
      expect(primera[i].icono).not.toBe(segunda[i].icono);
    }
  });
});
