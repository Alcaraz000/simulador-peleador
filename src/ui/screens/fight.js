import { el, mount, fmtDinero } from '../dom.js';
import { PLANES } from '../../core/fight.js';
import { INSTRUCCIONES_RINCON, estadoRincon } from '../../core/fight-interactive.js';

const ETIQUETA_RIESGO = { bajo: 'Riesgo bajo', medio: 'Riesgo medio', alto: 'Riesgo alto' };

export function renderOferta(contenedor, { oferta, jugador, onAceptar, onRechazar }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Oferta de pelea' }),
    el('h1', { text: oferta.esTitulo ? 'Pelea de título' : 'Te ofrecen una pelea' }),
    el('p', { class: 'medio', text: oferta.textoGancho }),
    el('div', { class: 'panel' }, [
      el('div', { style: 'font-size:18px;font-weight:800', text: `"${oferta.rivalApodo}" ${oferta.rivalNombre}` }),
      el('div', { class: 'etiqueta', text: `Media ${oferta.rivalMedia} · récord ${oferta.rivalRecord} · ${oferta.rivalEstilo}` }),
      el('div', { class: 'fila', style: 'margin-top:10px' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor verde', text: fmtDinero(oferta.bolsa) }),
          el('div', { class: 'nombre', text: 'Bolsa' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: ETIQUETA_RIESGO[oferta.riesgo] }),
          el('div', { class: 'nombre', text: 'Riesgo' }),
        ]),
      ]),
      el('div', { class: 'chip', style: 'margin-top:10px', text: `En juego: ${oferta.enJuego}` }),
      oferta.esRevancha ? el('div', { class: 'chip rojo', text: 'Revancha' }) : null,
      oferta.esObligatoria
        ? el('div', {
          class: 'chip dorado',
          // Defensas ya hechas de ESTE cinturón (jugador.defensasCinturon,
          // ver offers.js), no el total histórico: si no, el número queda
          // pegado al cinturón anterior en cuanto asciende (ver fix del bug).
          text: `Defensa obligatoria · ${Math.min((jugador.defensasCinturon?.[oferta.cinturonId] ?? 0) + 1, oferta.defensasObligatorias)} de ${oferta.defensasObligatorias}`,
        })
        : null,
    ]),
    el('button', { class: 'boton', 'data-accion': 'aceptar', text: 'Aceptar la pelea', onClick: onAceptar }),
    el('button', { class: 'boton secundario', 'data-accion': 'rechazar', text: 'Rechazar', onClick: onRechazar }),
  ]));
}

export function renderPlan(contenedor, { oferta, onElegirPlan }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Preparación' }),
    el('h1', { text: 'El plan de pelea' }),
    el('p', { class: 'medio', text: `Contra ${oferta.rivalApodo}. ¿Cómo la encarás?` }),
    ...Object.values(PLANES).map((plan) => el('button', {
      class: 'carta', 'data-plan': plan.id, onClick: () => onElegirPlan(plan.id),
    }, [
      el('div', { class: 'titulo', text: plan.nombre }),
      el('div', { class: 'desc', text: plan.descripcion }),
    ])),
  ]));
}

// OJO: esto NO es un autoplay de varios rounds. Cada round termina siempre en
// una decisión (el rincón o el golpe de gracia) y esas pantallas cortan el
// temporizador (detenerAuto) para que el jugador siga eligiendo la
// estrategia — así que el botón dispara el avance del round actual después
// de una breve demora dramática, y ahí se frena solo. Si el texto dijera
// "solo" a secas prometería un piloto automático que nunca llega a pasar de
// un round por click; por eso "Adelantar round" en vez de "Avanzar solo".
// El temporizador se guarda en una variable de módulo y se limpia en cada
// mount para que nunca queden temporizadores vivos corriendo de fondo.
let autoTimer = null;
export function detenerAuto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

export function renderPelea(contenedor, { pelea, eventos, onSiguienteRound, onFin }) {
  detenerAuto();
  const { jugador, rival } = pelea.snapshot;
  const log = el('div', { class: 'log' }, eventos.map((e) => el('p', {
    class: ['ko', 'sumision', 'caida'].includes(e.tipo) ? 'destacado' : '',
    text: e.texto,
  })));
  const terminoPorNocaut = pelea.terminada && ['ko', 'tko'].includes(pelea.resultado?.metodo);

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: pelea.terminada ? 'Fin de la pelea' : `Round ${pelea.roundActual} de ${pelea.rounds}` }),
    el('h1', { text: `${jugador.apodo} vs ${rival.apodo}` }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Aguante de ${rival.apodo}: ${Math.round(pelea.aguante.rival)}%` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${pelea.aguante.rival}%` })]),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Tu aguante: ${Math.round(pelea.aguante.jugador)}%` }),
      el('div', { class: 'barra verde-barra' }, [el('i', { style: `width:${pelea.aguante.jugador}%` })]),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Tarjetas ${pelea.tarjetas.jugador}-${pelea.tarjetas.rival}` }),
    ]),
    el('div', { class: `panel${terminoPorNocaut ? ' pelea-ko' : ''}` }, [log]),
    pelea.terminada
      ? el('div', { class: 'panel' }, [el('p', { class: 'dorado', text: pelea.resultado.texto })])
      : null,
    pelea.terminada
      ? el('button', { class: 'boton', 'data-accion': 'fin', text: 'Ver consecuencias', onClick: onFin })
      : el('button', { class: 'boton', 'data-accion': 'round', text: 'Siguiente round', onClick: onSiguienteRound }),
    pelea.terminada
      ? null
      : el('button', {
        class: 'boton secundario', 'data-accion': 'auto', text: 'Adelantar round',
        onClick: () => {
          detenerAuto();
          autoTimer = setInterval(() => onSiguienteRound(), 1400);
        },
      }),
  ]));
}

export function renderRincon(contenedor, { pelea, onInstruccion }) {
  detenerAuto();
  const estado = estadoRincon(pelea);
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: `Fin del round ${pelea.roundActual - 1} · el rincón` }),
    el('h1', { text: 'El rincón' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: estado.tarjetasTexto }),
      el('div', { class: 'fila', style: 'margin-top:8px' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.fatigaJugador}` }),
          el('div', { class: 'nombre', text: 'Tu fatiga' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.fatigaRival}` }),
          el('div', { class: 'nombre', text: 'Fatiga rival' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.aguanteRival}` }),
          el('div', { class: 'nombre', text: 'Aguante rival' }),
        ]),
      ]),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Tu entrenador' }),
      el('p', { style: 'font-style:italic', text: `"${estado.consejo}"` }),
    ]),
    el('div', { class: 'etiqueta', text: '¿Qué hacés este round?' }),
    ...Object.values(INSTRUCCIONES_RINCON).map((i) => el('button', {
      class: 'carta', 'data-instruccion': i.id, onClick: () => onInstruccion(i.id),
    }, [
      el('div', { class: 'titulo', text: i.nombre }),
      el('div', { class: 'desc', text: i.texto }),
    ])),
  ]));
}

export function renderGolpeDeGracia(contenedor, { pelea, info, onGolpe, ventanaMs = 3200 }) {
  detenerAuto();
  let resuelto = false;
  const desde = Date.now();

  function resolver(datos) {
    if (resuelto) return;
    resuelto = true;
    clearTimeout(temporizador);
    onGolpe(datos);
  }

  const temporizador = setTimeout(() => {
    resolver({ zonaElegida: null, precision: 0, aTiempo: false });
  }, ventanaMs);

  const zonas = info.zonas.map((zona) => el('button', {
    class: 'carta', 'data-zona': zona.id,
    onClick: () => {
      const transcurrido = Date.now() - desde;
      const precision = Math.max(0, Math.min(1, 1 - transcurrido / ventanaMs));
      resolver({ zonaElegida: zona.id, precision, aTiempo: true });
    },
  }, [
    el('div', { class: 'titulo', text: zona.nombre }),
    el('div', {
      class: zona.estado === 'abierto' ? 'desc verde' : zona.estado === 'tapado' ? 'desc rojo' : 'desc dorado',
      text: zona.estado === 'abierto' ? 'Abierto' : zona.estado === 'tapado' ? 'Tapado' : 'Riesgoso',
    }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: `Round ${pelea.roundActual}` }),
    el('h1', { text: '¡Lo tenés groggy!' }),
    el('p', { class: 'medio', text: 'Sube la guardia por instinto. Leé dónde quedó abierto y mandala. Rápido.' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Aguante del rival: ${Math.round(pelea.aguante.rival)}%` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${pelea.aguante.rival}%` })]),
    ]),
    ...zonas,
  ]));
}
