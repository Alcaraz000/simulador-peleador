import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea, simularRound, tarjetasJurados, PLANES } from '../../src/core/fight.js';
import { abrirGolpeDeGracia, ZONAS_GOLPE, INSTRUCCIONES_RINCON } from '../../src/core/fight-interactive.js';
import {
  renderOferta, renderPlan, renderPelea, actualizarMarcador,
} from '../../src/ui/screens/fight.js';

const jugador = crearPeleador({
  nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
});
const rival = crearPeleador({
  nombre: 'Dyke Tyzon', apodo: 'El Ciclón', nacionalidad: 'US', disciplina: 'boxeo',
  estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 70,
});
const oferta = {
  id: 'of_1', rivalId: rival.id, rivalNombre: rival.nombre, rivalApodo: rival.apodo,
  rivalMedia: 70, rivalRecord: '15-2', rivalEstilo: 'noqueador', rivalPersonalidad: 'agresivo',
  rivalRanking: 4,
  nivel: 'titulo', nivelPelea: 'titulo', bolsa: 25000, riesgo: 'alto',
  enJuego: 'Título regional', esTitulo: true, esObligatoria: false, esRevancha: false,
  famaBase: 15, textoGancho: 'Dyke Tyzon te quiere cruzar.',
  opinionEntrenador: 'desafio', fraseEntrenador: 'Contra Dyke Tyzon vas de underdog, pero por esta bolsa vale la pena.',
};
const peleaBase = () => crearPelea({ jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(1) });

function noop() {}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('renderOferta', () => {
  it('muestra rival, bolsa, riesgo y que esta en juego', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: noop, onRechazar: noop });
    expect(cont.textContent).toContain('Dyke Tyzon');
    expect(cont.textContent).toContain('15-2');
    expect(cont.textContent).toContain('US$ 25K');
    expect(cont.textContent.toLowerCase()).toContain('alto');
    expect(cont.textContent).toContain('Título regional');
  });

  it('aceptar y rechazar disparan sus callbacks', () => {
    let aceptado = false; let rechazado = false;
    renderOferta(cont, { oferta, jugador, onAceptar: () => { aceptado = true; }, onRechazar: () => { rechazado = true; } });
    cont.querySelector('[data-accion="aceptar"]').click();
    cont.querySelector('[data-accion="rechazar"]').click();
    expect(aceptado).toBe(true);
    expect(rechazado).toBe(true);
  });

  it('muestra el puesto del rival en el ranking', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: noop, onRechazar: noop });
    expect(cont.textContent).toContain('#4');
  });

  it('muestra la frase del entrenador sobre esta pelea', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: noop, onRechazar: noop });
    expect(cont.textContent).toContain(oferta.fraseEntrenador);
  });

  it('la bolsa y el riesgo tienen icono', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: noop, onRechazar: noop });
    const tiles = cont.querySelectorAll('.tile');
    expect(tiles).toHaveLength(2);
    for (const tile of tiles) expect(tile.querySelector('svg')).toBeTruthy();
  });

  it('no rompe si la oferta no trae ranking ni frase de entrenador (compatibilidad)', () => {
    const ofertaVieja = { ...oferta, rivalRanking: null, fraseEntrenador: null };
    expect(() => renderOferta(cont, { oferta: ofertaVieja, jugador, onAceptar: noop, onRechazar: noop })).not.toThrow();
    expect(cont.textContent).not.toContain('#4');
  });
});

describe('renderPlan', () => {
  it('ofrece los tres planes con voz de entrenador y efectos', () => {
    renderPlan(cont, { oferta, onElegirPlan: noop });
    expect(cont.querySelectorAll('[data-plan]')).toHaveLength(3);
    expect(cont.textContent.toLowerCase()).toContain('entrenador');
  });

  it('cada tarjeta muestra la descripcion con voz de entrenador (segunda persona) del plan', () => {
    renderPlan(cont, { oferta, onElegirPlan: noop });
    for (const plan of Object.values(PLANES)) {
      expect(cont.textContent).toContain(plan.descripcion);
    }
    // "seco" a la v1: ya no queda el copy neutro sin voz.
    expect(cont.textContent).not.toContain('Presión sin descanso. Más daño, más gasto.');
    expect(cont.textContent).not.toContain('Distancia y precisión. Equilibrado.');
    expect(cont.textContent).not.toContain('Defensa primero, buscando el error del rival.');
  });

  it('devuelve el plan elegido', () => {
    let plan = null;
    renderPlan(cont, { oferta, onElegirPlan: (p) => { plan = p; } });
    cont.querySelector('[data-plan="frente"]').click();
    expect(plan).toBe('frente');
  });
});

describe('renderPelea — marcador', () => {
  it('pinta banderas, apodos, aguante/fatiga con icono, jurados y golpes', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    expect(marcador).toBeTruthy();
    expect(marcador.querySelector('.bandera-svg')).toBeTruthy();
    expect(marcador.textContent).toContain('El Relámpago');
    expect(marcador.textContent).toContain('El Ciclón');
    expect(marcador.querySelector('[data-stat="aguante-jugador"] svg')).toBeTruthy();
    expect(marcador.querySelector('[data-stat="fatiga-jugador"] svg')).toBeTruthy();
    expect(marcador.querySelector('[data-juez="0"]')).toBeTruthy();
    expect(marcador.querySelector('[data-golpes="jugador"]')).toBeTruthy();
  });

  // Task v3, pedido textual: "¿no debería ir de un lado las del peleador y
  // del otro las del contrincante? Para no marear." — el aguante y la fatiga
  // de CADA peleador tienen que estar anidados junto a su nombre/bandera, no
  // sueltos en un bloque aparte que mezcle a los dos.
  it('el aguante y la fatiga de cada peleador estan agrupados bajo SU lado (no mezclados)', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');

    const ladoJugador = marcador.querySelector('[data-lado="jugador"]');
    const ladoRival = marcador.querySelector('[data-lado="rival"]');
    expect(ladoJugador).toBeTruthy();
    expect(ladoRival).toBeTruthy();

    // El nombre y la bandera del jugador están en SU columna...
    expect(ladoJugador.textContent).toContain('El Relámpago');
    expect(ladoJugador.querySelector('.bandera-svg')).toBeTruthy();
    // ...junto con SU aguante y SU fatiga (no las del rival).
    expect(ladoJugador.querySelector('[data-stat="aguante-jugador"]')).toBeTruthy();
    expect(ladoJugador.querySelector('[data-stat="fatiga-jugador"]')).toBeTruthy();
    expect(ladoJugador.querySelector('[data-stat="aguante-rival"]')).toBeNull();
    expect(ladoJugador.querySelector('[data-stat="fatiga-rival"]')).toBeNull();

    // Y del otro lado, lo mismo pero con el rival.
    expect(ladoRival.textContent).toContain('El Ciclón');
    expect(ladoRival.querySelector('[data-stat="aguante-rival"]')).toBeTruthy();
    expect(ladoRival.querySelector('[data-stat="fatiga-rival"]')).toBeTruthy();
    expect(ladoRival.querySelector('[data-stat="aguante-jugador"]')).toBeNull();
  });

  it('el marcador no se vuelve a crear al cambiar de panel (misma identidad de nodo)', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador1 = cont.querySelector('[data-bloque="marcador"]');

    const { pelea: pelea2 } = simularRound(pelea);
    renderPelea(cont, { pelea: pelea2, momentos: [], pendiente: pelea2.pendiente });
    const marcador2 = cont.querySelector('[data-bloque="marcador"]');

    expect(marcador2).toBe(marcador1);
  });

  it('actualizarMarcador refresca numeros y barras sin recrear el nodo', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');

    const modificada = { ...pelea, aguante: { jugador: 40, rival: 55 }, fatiga: { jugador: 70, rival: 20 } };
    actualizarMarcador(marcador, modificada);

    expect(cont.querySelector('[data-bloque="marcador"]')).toBe(marcador);
    expect(marcador.querySelector('[data-stat="aguante-jugador"] .valor').textContent).toBe('40');
    expect(marcador.querySelector('[data-stat="aguante-jugador"] .barra > i').style.width).toBe('40%');
    expect(marcador.querySelector('[data-stat="fatiga-rival"] .valor').textContent).toBe('20');
  });

  it('actualizarMarcador refleja las tarjetas de los jurados', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [] });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    const { pelea: peleaConHistorial } = simularRound(pelea);
    actualizarMarcador(marcador, peleaConHistorial);
    const { jueces } = tarjetasJurados(peleaConHistorial);
    expect(marcador.querySelector('[data-juez="0"] .valor').textContent).toBe(`${jueces[0].jugador}-${jueces[0].rival}`);
  });
});

describe('renderPelea — narracion y avance de round', () => {
  it('mientras narra el boton dice SALTAR y no ofrece SEGUIR', () => {
    vi.useFakeTimers();
    const pelea = peleaBase();
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Primer momento.' },
      { round: 1, tipo: 'campana', texto: 'Segundo momento.' },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    expect(cont.querySelector('[data-accion="saltar"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeNull();
  });

  // Estos tres casos narran un round SIN pasar por el rincón (pendiente:
  // null es el estado real de "mitad de pelea, nada pendiente" — pasa, por
  // ejemplo, justo después de errar un golpe de gracia): lo que se prueba
  // acá es el mecanismo genérico SALTAR/SEGUIR del narrador, no el flujo del
  // rincón (que tiene su propio describe más abajo).
  it('saltar completa la narracion y pasa a SEGUIR', () => {
    vi.useFakeTimers();
    const pelea = { ...peleaBase(), pendiente: null };
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Primer momento.' },
      { round: 1, tipo: 'campana', texto: 'Segundo momento.' },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    cont.querySelector('[data-accion="saltar"]').click();
    expect(cont.textContent).toContain('Primer momento.');
    expect(cont.textContent).toContain('Segundo momento.');
    expect(cont.querySelector('[data-accion="saltar"]')).toBeNull();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('no se puede avanzar antes de que termine: click en saltar no dispara onSeguir directamente', () => {
    vi.useFakeTimers();
    let avances = 0;
    const pelea = { ...peleaBase(), pendiente: null };
    const momentos = [{ round: 1, tipo: 'jab', texto: 'Uno.' }, { round: 1, tipo: 'campana', texto: 'Dos.' }];
    renderPelea(cont, { pelea, momentos, onSeguir: () => { avances += 1; } });
    cont.querySelector('[data-accion="saltar"]').click();
    expect(avances).toBe(0); // saltar termina la narracion, no avanza el round por si solo
    cont.querySelector('[data-accion="seguir"]').click();
    expect(avances).toBe(1);
  });

  it('con momentos vacios a mitad de pelea (pendiente null) se resuelve directo a SEGUIR', () => {
    const pelea = { ...peleaBase(), pendiente: null };
    renderPelea(cont, { pelea, momentos: [], onSeguir: noop });
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('el marcador se actualiza en vivo con el snapshot de cada momento', () => {
    vi.useFakeTimers();
    // El último snapshot SIEMPRE coincide con el estado real de la pelea
    // (garantía del núcleo, ver fight.js) — por eso `pelea` ya trae el
    // aguante final (80) que también trae el snapshot del último momento.
    const pelea = { ...peleaBase(), aguante: { jugador: 100, rival: 80 } };
    const momentos = [
      { round: 1, tipo: 'jab', texto: 'Uno.', snapshot: { aguante: { jugador: 100, rival: 90 }, fatiga: { jugador: 5, rival: 5 }, golpes: { jugador: { lanzados: 3, conectados: 1, significativos: 0 }, rival: { lanzados: 2, conectados: 0, significativos: 0 } } } },
      { round: 1, tipo: 'campana', texto: 'Dos.', snapshot: { aguante: { jugador: 100, rival: 80 }, fatiga: { jugador: 10, rival: 10 }, golpes: { jugador: { lanzados: 6, conectados: 2, significativos: 1 }, rival: { lanzados: 4, conectados: 1, significativos: 0 } } } },
    ];
    renderPelea(cont, { pelea, momentos, onSeguir: noop });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    expect(marcador.querySelector('[data-stat="aguante-rival"] .valor').textContent).toBe('90');
    vi.advanceTimersByTime(700);
    expect(marcador.querySelector('[data-stat="aguante-rival"] .valor').textContent).toBe('80');
  });

  it('si se re-renderiza a mitad de la narracion, el timer viejo se cancela (no quedan dos corriendo)', () => {
    // Regresión pedida por el revisor del Bloque 4: el timer de narrar() no
    // estaba registrado en la limpieza de la pantalla, así que un segundo
    // renderPelea a mitad de narración dejaba dos timers vivos en paralelo.
    vi.useFakeTimers();
    const pelea = peleaBase();
    const momentos1 = [
      { round: 1, tipo: 'jab', texto: 'Uno.' },
      { round: 1, tipo: 'flavor', texto: 'Dos.' },
      { round: 1, tipo: 'campana', texto: 'Tres.' },
    ];
    renderPelea(cont, { pelea, momentos: momentos1, onSeguir: noop });
    expect(vi.getTimerCount()).toBe(1); // el paso siguiente de la narracion vieja

    const momentos2 = [
      { round: 2, tipo: 'jab', texto: 'Otra.' },
      { round: 2, tipo: 'campana', texto: 'Y otra.' },
    ];
    renderPelea(cont, { pelea, momentos: momentos2, onSeguir: noop });

    // Si el timer viejo no se hubiera cancelado, acá habria dos corriendo.
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('renderPelea — empezar la pelea', () => {
  // Task v3, pedido textual: "Debe incluirse un botón que sea para empezar
  // la pelea" — hoy arrancaba sola. La pelea recién creada (pendiente:
  // 'inicio') no narra nada todavía: solo ofrece el botón.
  it('una pelea recien creada no narra nada y muestra el boton de empezar, no SEGUIR', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [], onEmpezar: noop });
    expect(cont.querySelector('[data-accion="empezar-pelea"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeNull();
    expect(cont.querySelector('[data-accion="saltar"]')).toBeNull();
  });

  it('el marcador ya se ve completo (100/100, banderas, nombres) antes de arrancar', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [], onEmpezar: noop });
    const marcador = cont.querySelector('[data-bloque="marcador"]');
    expect(marcador.querySelector('[data-stat="aguante-jugador"] .valor').textContent).toBe('100');
    expect(marcador.querySelector('[data-stat="aguante-rival"] .valor').textContent).toBe('100');
  });

  it('click en empezar dispara onEmpezar', () => {
    let empezada = false;
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [], onEmpezar: () => { empezada = true; } });
    cont.querySelector('[data-accion="empezar-pelea"]').click();
    expect(empezada).toBe(true);
  });

  it('una vez que arranca la narracion del primer round, el modulo de la cronica se reusa (mismo nodo)', () => {
    const pelea = peleaBase();
    renderPelea(cont, { pelea, momentos: [], onEmpezar: noop });
    const cronica1 = cont.querySelector('[data-bloque="cronica"]');
    renderPelea(cont, { pelea: { ...pelea, pendiente: null }, momentos: [{ round: 1, tipo: 'jab', texto: 'Va el jab.' }], onSeguir: noop });
    const cronica2 = cont.querySelector('[data-bloque="cronica"]');
    expect(cronica2).toBe(cronica1);
    expect(cont.textContent).toContain('Va el jab.');
  });
});

describe('renderPelea — rincon', () => {
  function peleaEnRincon() {
    const { pelea } = simularRound(peleaBase());
    return { ...pelea, pendiente: 'rincon' };
  }

  // Task v3, pedido textual: "El rincón aparece recién cuando el jugador lo
  // pide" / "recién ahí uno clickea y ve lo que te dice el entrenador" — al
  // terminar de narrarse el round no aparecen ni las tarjetas ni el consejo
  // todavía, solo un botón.
  it('al terminar el round NO aparecen las tarjetas de instruccion todavia: primero hay un boton para ir al rincon', () => {
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [] });
    expect(cont.querySelector('[data-bloque="marcador"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="ver-rincon"]')).toBeTruthy();
    expect(cont.querySelectorAll('[data-instruccion]')).toHaveLength(0);
  });

  it('clickear "ir al rincon" reemplaza el contenido de la cronica por lo que dice el entrenador y recien ahi aparecen las tarjetas', () => {
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [] });
    const cronicaNodo = cont.querySelector('[data-bloque="cronica"]');

    cont.querySelector('[data-accion="ver-rincon"]').click();

    // Mismo modulo de la cronica (no uno nuevo), con el contenido
    // reemplazado por el estado + consejo del entrenador.
    expect(cont.querySelector('[data-bloque="cronica"]')).toBe(cronicaNodo);
    expect(cont.textContent.toLowerCase()).toContain('rincón');
    expect(cont.querySelectorAll('[data-instruccion]')).toHaveLength(3);
    expect(cont.querySelector('[data-accion="ver-rincon"]')).toBeNull();
  });

  it('devuelve la instruccion elegida', () => {
    let instruccion = null;
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [], onInstruccion: (i) => { instruccion = i; } });
    cont.querySelector('[data-accion="ver-rincon"]').click();
    cont.querySelector('[data-instruccion="cuerpo"]').click();
    expect(instruccion).toBe('cuerpo');
  });

  // Task v4, pedido textual: el tip del entrenador ("Tu rincón te tira: ...")
  // se mudó al módulo del rincón (la crónica) y dejó de marcar una tarjeta
  // como "la recomendada" — eso hacía que seguirlo ciegamente ganara siempre.
  // Las tarjetas de acción ya no llevan ninguna marca de recomendación.
  it('las tarjetas de accion ya no marcan ninguna como recomendada', () => {
    const pelea = peleaEnRincon();
    renderPelea(cont, { pelea, momentos: [] });
    cont.querySelector('[data-accion="ver-rincon"]').click();

    expect(cont.querySelectorAll('[data-instruccion][data-recomendada]')).toHaveLength(0);
    expect(cont.querySelector('[data-hint="recomendada"]')).toBeNull();
  });

  // El criterio de cuándo/qué dice el tip (probabilístico, según entrenador
  // y claridad) ya se prueba a fondo en core/fight-interactive.test.js; acá
  // solo se prueba que, CUANDO aparece, la UI lo pinta en el lugar correcto
  // (la crónica, no debajo de las tarjetas) firmado con el nombre del
  // entrenador — y que, cuando no aparece, esa firma tampoco está.
  function peleaEnRinconConEstado(rngEstado) {
    return { ...peleaEnRincon(), rngEstado };
  }

  it('cuando el rincon SI tiene tip, aparece en la cronica firmado con el nombre del entrenador', () => {
    let vistoConTip = false;
    for (let rngEstado = 1; rngEstado <= 300 && !vistoConTip; rngEstado++) {
      document.body.innerHTML = '<div id="app"></div>';
      const contLocal = document.getElementById('app');
      const pelea = peleaEnRinconConEstado(rngEstado);
      renderPelea(contLocal, { pelea, momentos: [] });
      contLocal.querySelector('[data-accion="ver-rincon"]').click();

      const cronica = contLocal.querySelector('[data-bloque="cronica"]');
      const accion = contLocal.querySelector('[data-bloque="accion"]');
      if (!cronica.textContent.includes('Tu rincón te tira')) continue;

      vistoConTip = true;
      const entrenadorNombre = pelea.snapshot.jugador.entrenador.nombre;
      expect(cronica.textContent).toContain(entrenadorNombre);
      // El nombre aparece ANTES del texto del tip dentro del mismo bloque
      // (lo firma), y nunca en el panel de acción (se sacó de ahí).
      expect(cronica.textContent.indexOf(entrenadorNombre)).toBeLessThan(cronica.textContent.indexOf('Tu rincón te tira'));
      expect(accion.textContent).not.toContain('Tu rincón te tira');
    }
    expect(vistoConTip).toBe(true);
  });

  it('a veces el rincon no dice ningun tip (no aparece siempre)', () => {
    let vistoSinTip = false;
    for (let rngEstado = 1; rngEstado <= 300 && !vistoSinTip; rngEstado++) {
      document.body.innerHTML = '<div id="app"></div>';
      const contLocal = document.getElementById('app');
      const pelea = peleaEnRinconConEstado(rngEstado);
      renderPelea(contLocal, { pelea, momentos: [] });
      contLocal.querySelector('[data-accion="ver-rincon"]').click();

      if (!contLocal.textContent.includes('Tu rincón te tira')) vistoSinTip = true;
    }
    expect(vistoSinTip).toBe(true);
  });
});

describe('renderPelea — golpe de gracia', () => {
  function peleaGroggy() {
    const { pelea } = simularRound(peleaBase());
    return { ...pelea, aguante: { ...pelea.aguante, rival: 12 }, pendiente: 'golpe' };
  }

  it('el golpe de gracia convive con el marcador y muestra la silueta', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    expect(cont.querySelector('[data-bloque="marcador"]')).toBeTruthy();
    expect(cont.querySelector('svg.silueta-rival')).toBeTruthy();
    expect(cont.querySelectorAll('[data-zona]')).toHaveLength(3);
  });

  it('elegir una zona muestra la barra de precision', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    expect(cont.querySelector('.barra-precision-pista')).toBeTruthy();
    expect(cont.querySelector('svg.silueta-rival')).toBeNull();
  });

  it('frenar la barra reporta el golpe a tiempo con la zona elegida', () => {
    vi.useFakeTimers();
    let golpe = null;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: (g) => { golpe = g; } });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    vi.advanceTimersByTime(50);
    cont.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    // La barra ya no avisa en el mismo instante del click: primero se ve el
    // efecto de impacto (verde/amarillo/error) y recién tras esa pausa breve
    // se reporta el golpe hacia afuera (Pedido v6, ver barra-precision.js).
    vi.advanceTimersByTime(500);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(true);
    expect(golpe.zonaElegida).toBe(info.zonaAbierta);
    expect(golpe.precision).toBeGreaterThanOrEqual(0);
    expect(golpe.precision).toBeLessThanOrEqual(1);
  });

  it('si se acaba la ventana sin elegir zona, reporta que no llego a tiempo', () => {
    vi.useFakeTimers();
    let golpe = null;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: (g) => { golpe = g; }, ventanaMs: 1000 });
    vi.advanceTimersByTime(1200);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(false);
  });

  it('la ventana cubre solo elegir la zona: tomarse tiempo en la barra no pierde el golpe', () => {
    // Decisión del coordinador: dos relojes corriendo a la vez (la ventana Y
    // la barra) es confuso, no tenso. Elegir la zona corta la ventana; a
    // partir de ahí el único desafío es la flecha de la barra.
    vi.useFakeTimers();
    let golpe = null;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: (g) => { golpe = g; }, ventanaMs: 1000 });
    const info = abrirGolpeDeGracia(pelea);
    vi.advanceTimersByTime(900); // justo antes de que se cierre la ventana
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));

    // Mucho mas que la ventana original: si los dos relojes siguieran
    // corriendo, esto ya deberia haber disparado el timeout.
    vi.advanceTimersByTime(5000);
    expect(golpe).toBeNull();

    cont.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    // Misma pausa de feedback que arriba antes de que se reporte el golpe.
    vi.advanceTimersByTime(500);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(true);
    expect(golpe.zonaElegida).toBe(info.zonaAbierta);
  });

  it('si se re-renderiza mientras la ventana del golpe esta pendiente, no queda un timer colgado', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    // El jugador (o el flujo) vuelve a pintar la pantalla para otro estado
    // antes de que la ventana del golpe se cumpla o se elija una zona.
    renderPelea(cont, { pelea: { ...pelea, pendiente: null }, momentos: [], onSeguir: () => {} });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(llamadas).toBe(0); // el onGolpe viejo nunca se dispara
  });

  it('no reporta el golpe dos veces', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [], onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    const info = abrirGolpeDeGracia(pelea);
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    cont.querySelector('.barra-precision-pista').dispatchEvent(new Event('click', { bubbles: true }));
    vi.advanceTimersByTime(1500);
    expect(llamadas).toBe(1);
  });

  it('la dificultad de la barra corresponde a la zona elegida', () => {
    const pelea = peleaGroggy();
    renderPelea(cont, { pelea, momentos: [] });
    const info = abrirGolpeDeGracia(pelea);
    // fuerzo el mentón (mas dificil, franja mas fina) si no es la abierta, o
    // comparo directamente la zona abierta contra higado si aplica.
    const zonaElegida = Object.keys(ZONAS_GOLPE).find((z) => z !== info.zonaAbierta) ?? info.zonaAbierta;
    cont.querySelector(`[data-zona="${zonaElegida}"]`).dispatchEvent(new Event('click', { bubbles: true }));
    const anchoVerde = Number(cont.querySelector('.franja-verde').style.width.replace('%', ''));
    // higado (0.3) siempre da la franja mas ancha de las tres posibles.
    if (zonaElegida === 'higado') {
      expect(anchoVerde).toBeGreaterThan(15);
    } else {
      expect(anchoVerde).toBeLessThan(24);
    }
  });
});

describe('renderPelea — fin de la pelea', () => {
  function peleaTerminadaKo() {
    const pelea = peleaBase();
    return {
      ...pelea, terminada: true,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 4, texto: 'El Relámpago gana por KO en el round 4.' },
    };
  }

  it('muestra el resultado y el boton de cierre, sin boton de seguir', () => {
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.textContent).toContain('gana por KO');
    expect(cont.querySelector('[data-accion="fin"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="seguir"]')).toBeNull();
  });

  it('el boton de cierre dispara onFin', () => {
    let terminado = false;
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: () => { terminado = true; } });
    cont.querySelector('[data-accion="fin"]').click();
    expect(terminado).toBe(true);
  });

  it('si termino por nocaut, la cronica tiene la clase de sacudon', () => {
    const pelea = peleaTerminadaKo();
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.querySelector('[data-bloque="cronica"].pelea-ko')).toBeTruthy();
  });

  it('si termino por decision, la cronica NO tiene la clase de sacudon', () => {
    const pelea = {
      ...peleaBase(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'decision', round: 8, texto: 'El Relámpago gana por decisión.' },
    };
    renderPelea(cont, { pelea, momentos: [], onFin: noop });
    expect(cont.querySelector('[data-bloque="cronica"].pelea-ko')).toBeNull();
  });

  // Task v3, pedido textual: "'Después de la pelea' también debe verse en la
  // pantalla de peleas, NO en una pantalla nueva" — el resumen post-pelea
  // (bolsa, título si se ganó) se pinta con `despues`, en el MISMO panel de
  // acción, sin desmontar el marcador ni la crónica.
  describe('despues de la pelea (en la misma pantalla)', () => {
    it('sin "despues" todavia, el boton lleva a verlo (no desaparece el marcador ni la cronica)', () => {
      const pelea = peleaTerminadaKo();
      renderPelea(cont, { pelea, momentos: [], onFin: noop });
      expect(cont.querySelector('[data-bloque="marcador"]')).toBeTruthy();
      expect(cont.querySelector('[data-bloque="cronica"]')).toBeTruthy();
      expect(cont.querySelector('[data-accion="continuar"]')).toBeNull();
    });

    it('con "despues" puesto, muestra el texto, la bolsa y NO pierde el marcador (misma pantalla)', () => {
      const pelea = peleaTerminadaKo();
      const marcadorAntes = (() => {
        renderPelea(cont, { pelea, momentos: [], onFin: noop });
        return cont.querySelector('[data-bloque="marcador"]');
      })();

      renderPelea(cont, {
        pelea,
        momentos: [],
        despues: { texto: 'Le ganaste a El Ciclón por KO.', deltas: ['Bolsa: US$ 25K'] },
        onContinuar: noop,
      });

      expect(cont.querySelector('[data-bloque="marcador"]')).toBe(marcadorAntes); // no se reconstruyó
      expect(cont.textContent).toContain('Le ganaste a El Ciclón por KO.');
      expect(cont.textContent).toContain('Bolsa: US$ 25K');
      expect(cont.querySelector('[data-accion="continuar"]')).toBeTruthy();
    });

    it('si gano un titulo, lo muestra', () => {
      const pelea = peleaTerminadaKo();
      renderPelea(cont, {
        pelea,
        momentos: [],
        despues: { texto: 'Le ganaste.', deltas: [], tituloGanado: 'Título regional' },
        onContinuar: noop,
      });
      expect(cont.textContent).toContain('Título regional');
    });

    it('continuar dispara onContinuar', () => {
      let continuo = false;
      const pelea = peleaTerminadaKo();
      renderPelea(cont, {
        pelea,
        momentos: [],
        despues: { texto: 'Le ganaste.', deltas: [] },
        onContinuar: () => { continuo = true; },
      });
      cont.querySelector('[data-accion="continuar"]').click();
      expect(continuo).toBe(true);
    });
  });
});
