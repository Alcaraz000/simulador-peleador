import { describe, it, expect, beforeEach } from 'vitest';
import { renderPanelDecision, renderDesenlace } from '../../src/ui/screens/panel-decision.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="centro"></div><div id="afuera">intacto</div>';
  cont = document.getElementById('centro');
});

const opciones = [
  { id: 'a', titulo: 'Pelota parada', descripcion: 'Tiros libres sin apuro.', efectos: [{ texto: '+3 Técnica', signo: 'positivo' }] },
  { id: 'b', titulo: 'Piernas nuevas', descripcion: 'Doble turno.', efectos: [{ texto: '+3 Velocidad', signo: 'positivo' }] },
  { id: 'c', titulo: 'Referente', descripcion: 'Primero en llegar.', efectos: [{ texto: '+3 IQ de pelea', signo: 'positivo' }] },
];

describe('renderPanelDecision', () => {
  it('muestra titulo, bajada y texto', () => {
    renderPanelDecision(cont, { titulo: 'Campamento', bajada: 'El trabajo rindió', texto: 'Elegí una.', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('Campamento');
    expect(cont.textContent).toContain('El trabajo rindió');
    expect(cont.textContent).toContain('Elegí una.');
  });

  it('las 3 opciones se renderizan como tarjetas en una grilla horizontal', () => {
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: () => {} });
    const grilla = cont.querySelector('.panel-decision-grilla');
    expect(grilla).toBeTruthy();
    const tarjetas = grilla.querySelectorAll('.tarjeta');
    expect(tarjetas).toHaveLength(3);
  });

  it('cada tarjeta muestra su titulo, descripcion y efectos', () => {
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('Pelota parada');
    expect(cont.textContent).toContain('Doble turno.');
    expect(cont.textContent).toContain('+3 IQ de pelea');
  });

  it('al elegir, el callback recibe el id de la opcion clickeada', () => {
    let elegido = null;
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: (id) => { elegido = id; } });
    cont.querySelectorAll('.tarjeta')[1].click();
    expect(elegido).toBe('b');
  });

  it('al elegir, no navega a otra pantalla: el resto del documento queda intacto y la grilla sigue montada', () => {
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: () => {} });
    cont.querySelectorAll('.tarjeta')[0].click();
    expect(document.getElementById('afuera').textContent).toBe('intacto');
    expect(cont.querySelector('.panel-decision-grilla')).toBeTruthy();
  });

  it('un segundo click (en la misma u otra tarjeta) no dispara el callback de nuevo', () => {
    let veces = 0;
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: () => { veces += 1; } });
    const tarjetas = cont.querySelectorAll('.tarjeta');
    tarjetas[0].click();
    tarjetas[1].click();
    tarjetas[0].click();
    expect(veces).toBe(1);
  });

  it('sin rareza de panel (o "normal"), no muestra etiqueta de rareza en el encabezado', () => {
    renderPanelDecision(cont, { titulo: 'T', opciones, onElegir: () => {} });
    const cabecera = cont.querySelector('.panel-decision-cabecera');
    expect(cabecera.querySelector('.tarjeta-etiqueta')).toBeNull();
  });

  it('con rareza "legendaria" en el panel, muestra la etiqueta en el encabezado (no en las tarjetas de opcion)', () => {
    renderPanelDecision(cont, { titulo: 'T', opciones, rareza: 'legendaria', onElegir: () => {} });
    const cabecera = cont.querySelector('.panel-decision-cabecera');
    const etiquetaCabecera = cabecera.querySelector('.tarjeta-etiqueta');
    expect(etiquetaCabecera).toBeTruthy();
    expect(etiquetaCabecera.textContent).toContain('LEGENDARIA');

    const grilla = cont.querySelector('.panel-decision-grilla');
    expect(grilla.querySelectorAll('.tarjeta-etiqueta')).toHaveLength(0);
  });

  it('cada tarjeta conserva su propia rareza cuando la opcion la trae (caso mejora)', () => {
    const conRareza = [
      { id: 'x', titulo: 'Normal', efectos: [], rareza: 'normal' },
      { id: 'y', titulo: 'Rara', efectos: [], rareza: 'rara' },
      { id: 'z', titulo: 'Legendaria', efectos: [], rareza: 'legendaria' },
    ];
    renderPanelDecision(cont, { titulo: 'T', opciones: conRareza, onElegir: () => {} });
    const grilla = cont.querySelector('.panel-decision-grilla');
    expect(grilla.querySelectorAll('.tarjeta-etiqueta')).toHaveLength(2);
  });

  it('un efecto con probabilidad se muestra como porcentaje en la tarjeta', () => {
    const conAzar = [
      { id: 'a', titulo: 'Aceptar', efectos: [{ texto: '+5 Cardio', signo: 'positivo', probabilidad: 70 }, { texto: '-15 Forma', signo: 'negativo', probabilidad: 30 }] },
      { id: 'b', titulo: 'Rechazar', efectos: [] },
      { id: 'c', titulo: 'Otra', efectos: [] },
    ];
    renderPanelDecision(cont, { titulo: 'T', opciones: conAzar, onElegir: () => {} });
    expect(cont.textContent).toContain('70%');
    expect(cont.textContent).toContain('+5 Cardio');
  });
});

describe('renderDesenlace', () => {
  it('muestra el texto del desenlace y los deltas', () => {
    renderDesenlace(cont, { texto: 'Nadie dijo nada. Te sentís una máquina.', deltasTexto: ['+5 Potencia', '+4 Cardio'], onContinuar: () => {} });
    expect(cont.textContent).toContain('Nadie dijo nada.');
    expect(cont.textContent).toContain('+5 Potencia');
    expect(cont.textContent).toContain('+4 Cardio');
  });

  it('el boton "Seguir" dispara onContinuar', () => {
    let sigue = false;
    renderDesenlace(cont, { texto: 't', deltasTexto: [], onContinuar: () => { sigue = true; } });
    cont.querySelector('.boton').click();
    expect(sigue).toBe(true);
  });

  it('se monta dentro de la region sin tocar el resto del documento', () => {
    renderDesenlace(cont, { texto: 't', deltasTexto: [], onContinuar: () => {} });
    expect(document.getElementById('afuera').textContent).toBe('intacto');
  });
});
