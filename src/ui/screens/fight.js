import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { crearTarjeta } from '../components/card.js';
import { narrar } from '../components/narrador.js';
import { dibujarSilueta } from '../components/silueta-rival.js';
import { crearBarraPrecision } from '../components/barra-precision.js';
import { PLANES, tarjetasJurados } from '../../core/fight.js';
import {
  INSTRUCCIONES_RINCON, ZONAS_GOLPE, POSTURAS, estadoRincon, abrirGolpeDeGracia, VENTANA_MS,
} from '../../core/fight-interactive.js';

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
          text: `Defensa obligatoria · ${Math.min((jugador.defensasCinturon?.[oferta.cinturonId] ?? 0) + 1, oferta.defensasObligatorias)} de ${oferta.defensasObligatorias}`,
        })
        : null,
    ]),
    el('button', { class: 'boton', dataset: { accion: 'aceptar' }, text: 'Aceptar la pelea', onClick: onAceptar }),
    el('button', { class: 'boton secundario', dataset: { accion: 'rechazar' }, text: 'Rechazar', onClick: onRechazar }),
  ]));
}

// ---- El plan de pelea: con voz del entrenador ----------------------------

const ICONO_PLAN = { frente: 'guante', afuera: 'flecha', aguantar: 'corazon' };

function efectosDePlan(mods) {
  const efectos = [];
  if (mods.agresion) {
    const pct = Math.round(mods.agresion * 100);
    efectos.push({ texto: `${pct > 0 ? '+' : ''}${pct}% agresividad`, signo: pct > 0 ? 'positivo' : 'negativo' });
  }
  if (mods.defensa) {
    const pct = Math.round(mods.defensa * 100);
    efectos.push({ texto: `${pct > 0 ? '+' : ''}${pct}% defensa`, signo: pct > 0 ? 'positivo' : 'negativo' });
  }
  if (mods.gasto !== 1) {
    const pct = Math.round((mods.gasto - 1) * 100);
    efectos.push({ texto: `${pct > 0 ? '+' : ''}${pct}% gasto físico`, signo: pct > 0 ? 'leve' : 'positivo' });
  }
  return efectos;
}

export function renderPlan(contenedor, { oferta, onElegirPlan = () => {} }) {
  let elegido = false;
  const tarjetas = Object.values(PLANES).map((plan) => {
    const tarjeta = crearTarjeta({
      icono: icono(ICONO_PLAN[plan.id] ?? 'guante'),
      titulo: plan.nombre,
      descripcion: plan.descripcion,
      efectos: efectosDePlan(plan.mods),
      onElegir: () => {
        if (elegido) return;
        elegido = true;
        for (const t of tarjetas) t.disabled = true;
        onElegirPlan(plan.id);
      },
    });
    tarjeta.dataset.plan = plan.id;
    return tarjeta;
  });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Preparación' }),
    el('h1', { text: 'El plan de pelea' }),
    el('p', {
      class: 'medio',
      text: `Tu entrenador te mira antes de que suene la campana: "¿cómo la encaramos contra ${oferta.rivalApodo}? Vos decidís, yo te digo qué ganás y qué te puede costar."`,
    }),
    el('div', { class: 'panel-decision-grilla' }, tarjetas),
  ]));
}

// ---- La pantalla de pelea: marcador fijo + crónica + panel de acción -----
//
// `renderPelea` es idempotente: la primera vez arma el esqueleto (marcador,
// crónica, panel de acción) y lo monta; las llamadas siguientes reusan el
// MISMO nodo (lo encuentran por clase dentro de `contenedor`) y solo
// actualizan su contenido — el marcador nunca se destruye ni se vuelve a
// crear mientras la pelea sigue. Un contador de "generación" descarta
// callbacks de una narración/ventana de golpe vieja si `renderPelea` se
// vuelve a llamar antes de que terminen (defensivo: en el flujo normal esto
// no pasa, porque cada llamada nueva viene disparada por el callback de la
// anterior).

const CLASE_RAIZ = 'pantalla-pelea';

let generacionGlobal = 0;

function filaStat(nombreIcono, clave, claseBarra = '') {
  return el('div', { class: 'marcador-stat', dataset: { stat: clave } }, [
    el('div', { class: 'marcador-stat-cab' }, [
      icono(nombreIcono, { tamano: 14, color: 'currentColor' }),
      el('b', { class: 'valor', text: '100' }),
    ]),
    el('div', { class: `barra ${claseBarra}`.trim() }, [el('i', { style: 'width:100%' })]),
  ]);
}

function filaGolpes(apodo, quien) {
  return el('div', {}, [
    el('div', { class: 'nombre sutil', text: apodo }),
    el('div', { dataset: { golpes: quien }, style: 'font-size:11px', text: '0 lanzados · 0 conectados · 0 sig.' }),
  ]);
}

function construirEsqueleto(pelea) {
  const { jugador, rival } = pelea.snapshot;

  const marcador = el('div', { class: 'panel marcador-pelea', dataset: { bloque: 'marcador' } }, [
    el('div', { class: 'fila marcador-cabecera' }, [
      el('div', { class: 'marcador-peleador' }, [
        bandera(jugador.nacionalidad, { ancho: 22 }),
        el('span', { text: jugador.apodo }),
      ]),
      el('div', { class: 'marcador-vs etiqueta', text: 'VS' }),
      el('div', { class: 'marcador-peleador marcador-derecha' }, [
        el('span', { text: rival.apodo }),
        bandera(rival.nacionalidad, { ancho: 22 }),
      ]),
    ]),
    el('div', { class: 'etiqueta', dataset: { parte: 'round-etiqueta' } }),
    el('div', { class: 'marcador-barras' }, [
      el('div', { class: 'fila' }, [
        filaStat('corazon', 'aguante-jugador', 'verde-barra'),
        filaStat('rayo', 'fatiga-jugador', 'dorada'),
      ]),
      el('div', { class: 'fila' }, [
        filaStat('corazon', 'aguante-rival', ''),
        filaStat('rayo', 'fatiga-rival', 'dorada'),
      ]),
    ]),
    el('div', { class: 'marcador-jurados' }, [
      el('div', { class: 'etiqueta', text: 'Jurados' }),
      el('div', { class: 'fila', style: 'margin-top:6px' }, [0, 1, 2].map((i) => el('div', {
        class: 'tile', dataset: { juez: String(i) },
      }, [
        el('div', { class: 'valor', text: '0-0' }),
        el('div', { class: 'nombre', text: `Juez ${i + 1}` }),
      ]))),
      el('div', { class: 'medio', dataset: { parte: 'resumen-jurados' }, style: 'margin-top:6px;font-size:11px' }),
    ]),
    el('div', { class: 'marcador-golpes' }, [
      el('div', { class: 'etiqueta', text: 'Golpes' }),
      el('div', { class: 'fila', style: 'margin-top:6px' }, [
        filaGolpes(jugador.apodo, 'jugador'),
        filaGolpes(rival.apodo, 'rival'),
      ]),
    ]),
  ]);

  const cronica = el('div', { class: 'panel cronica-pelea', dataset: { bloque: 'cronica' } }, [
    el('div', { class: 'log', dataset: { parte: 'log' } }),
  ]);

  const accion = el('div', { dataset: { bloque: 'accion' } });

  return el('div', { class: `${CLASE_RAIZ} stack` }, [marcador, cronica, accion]);
}

function clamp01a100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Refresca solo los números y las barras del marcador (aguante, fatiga,
 * jurados, golpes) — nunca recrea nodos. Es lo que `renderPelea` llama en
 * cada `onPaso` del narrador para que la pelea se sienta moviéndose.
 *
 * @param {HTMLElement} marcadorNodo - el nodo `[data-bloque="marcador"]`.
 * @param {object} pelea
 */
export function actualizarMarcador(marcadorNodo, pelea) {
  if (!marcadorNodo) return;

  for (const [clave, valor] of Object.entries({
    'aguante-jugador': pelea.aguante.jugador,
    'aguante-rival': pelea.aguante.rival,
    'fatiga-jugador': pelea.fatiga.jugador,
    'fatiga-rival': pelea.fatiga.rival,
  })) {
    const fila = marcadorNodo.querySelector(`[data-stat="${clave}"]`);
    if (!fila) continue;
    const redondeado = clamp01a100(valor);
    fila.querySelector('.valor').textContent = String(redondeado);
    fila.querySelector('.barra > i').style.width = `${redondeado}%`;
  }

  for (const quien of ['jugador', 'rival']) {
    const nodo = marcadorNodo.querySelector(`[data-golpes="${quien}"]`);
    if (!nodo) continue;
    const g = pelea.golpes[quien];
    nodo.textContent = `${g.lanzados} lanzados · ${g.conectados} conectados · ${g.significativos} sig.`;
  }

  const { jueces, resumen } = tarjetasJurados(pelea);
  jueces.forEach((juez, i) => {
    const nodo = marcadorNodo.querySelector(`[data-juez="${i}"] .valor`);
    if (nodo) nodo.textContent = `${juez.jugador}-${juez.rival}`;
  });
  const resumenNodo = marcadorNodo.querySelector('[data-parte="resumen-jurados"]');
  if (resumenNodo) resumenNodo.textContent = resumen;
}

function actualizarEtiquetaRound(raiz, pelea) {
  const nodo = raiz.querySelector('[data-parte="round-etiqueta"]');
  if (nodo) nodo.textContent = pelea.terminada ? 'Fin de la pelea' : `Round ${pelea.roundActual} de ${pelea.rounds}`;
}

function actualizarClaseNocaut(raiz, pelea) {
  const cronica = raiz.querySelector('[data-bloque="cronica"]');
  if (!cronica) return;
  const terminoPorNocaut = pelea.terminada && ['ko', 'tko'].includes(pelea.resultado?.metodo);
  cronica.classList.toggle('pelea-ko', Boolean(terminoPorNocaut));
}

function mezclarSnapshot(pelea, snapshot) {
  if (!snapshot) return pelea;
  return { ...pelea, aguante: snapshot.aguante, fatiga: snapshot.fatiga, golpes: snapshot.golpes };
}

// ---- Panel de acción: SALTAR/SEGUIR, rincón, golpe de gracia, resultado --

function pintarSaltar(accionNodo, onClickSaltar) {
  mount(accionNodo, el('button', {
    class: 'boton', type: 'button', dataset: { accion: 'saltar' }, text: 'Saltar', onClick: onClickSaltar,
  }));
}

function pintarSeguir(accionNodo, { onSeguir = () => {} }) {
  mount(accionNodo, el('button', {
    class: 'boton', type: 'button', dataset: { accion: 'seguir' }, text: 'Seguir', onClick: onSeguir,
  }));
}

function pintarResultado(accionNodo, { pelea, onFin = () => {} }) {
  mount(accionNodo, el('div', { class: 'stack' }, [
    el('div', { class: 'panel' }, [el('p', { class: 'dorado', text: pelea.resultado.texto })]),
    el('button', {
      class: 'boton', type: 'button', dataset: { accion: 'fin' }, text: 'Ver consecuencias', onClick: onFin,
    }),
  ]));
}

const ICONO_INSTRUCCION = { acelerar: 'guante', respirar: 'corazon', cuerpo: 'pesa' };

function efectosDeInstruccion(mods) {
  const efectos = [];
  if (mods.aguanteRival) {
    efectos.push({ texto: `${mods.aguanteRival} Aguante rival`, signo: mods.aguanteRival < 0 ? 'positivo' : 'negativo' });
  }
  if (mods.fatigaJugador) {
    efectos.push({
      texto: `${mods.fatigaJugador > 0 ? '+' : ''}${mods.fatigaJugador} Tu fatiga`,
      signo: mods.fatigaJugador > 0 ? 'leve' : 'positivo',
    });
  }
  if (mods.ventanaGolpe) {
    efectos.push({ texto: `+${Math.round(mods.ventanaGolpe * 100)}% chance de groggy`, signo: 'positivo' });
  }
  return efectos;
}

function pintarRincon(accionNodo, { pelea, onInstruccion = () => {} }) {
  const estado = estadoRincon(pelea);
  let elegido = false;
  const tarjetas = Object.values(INSTRUCCIONES_RINCON).map((instruccion) => {
    const tarjeta = crearTarjeta({
      icono: icono(ICONO_INSTRUCCION[instruccion.id] ?? 'guante'),
      titulo: instruccion.nombre,
      descripcion: instruccion.texto,
      efectos: efectosDeInstruccion(instruccion.mods),
      onElegir: () => {
        if (elegido) return;
        elegido = true;
        for (const t of tarjetas) t.disabled = true;
        onInstruccion(instruccion.id);
      },
    });
    tarjeta.dataset.instruccion = instruccion.id;
    return tarjeta;
  });

  mount(accionNodo, el('div', { class: 'stack' }, [
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Fin del round ${Math.max(pelea.roundActual - 1, 1)} · el rincón` }),
      el('div', { class: 'etiqueta', style: 'margin-top:4px', text: estado.tarjetasTexto }),
      el('p', { class: 'medio', style: 'font-style:italic;margin-top:8px', text: `"${estado.consejo}"` }),
    ]),
    el('div', { class: 'etiqueta', text: '¿Qué hacés este round?' }),
    el('div', { class: 'panel-decision-grilla' }, tarjetas),
  ]));
}

// `raiz` recibe la limpieza en `raiz._limpiarAccion`: si `renderPelea` se
// vuelve a llamar mientras la ventana del golpe de gracia (o la barra de
// precisión) todavía está corriendo, `renderPelea` la cancela ANTES de
// pintar el estado nuevo — sin eso, un setTimeout de la ventana anterior
// podría disparar `onGolpe` con datos viejos aunque el panel ya cambió.
function pintarGolpe(raiz, accionNodo, { pelea, onGolpe = () => {}, ventanaMs = VENTANA_MS }) {
  const info = abrirGolpeDeGracia(pelea);
  let resuelto = false;
  let ventanaTimer = null;
  let barra = null;

  function limpiarVentana() {
    if (ventanaTimer !== null) {
      clearTimeout(ventanaTimer);
      ventanaTimer = null;
    }
  }

  function limpiarTodo() {
    limpiarVentana();
    if (barra) barra.detener();
  }
  raiz._limpiarAccion = limpiarTodo;

  function resolver(datos) {
    if (resuelto) return;
    resuelto = true;
    limpiarTodo();
    onGolpe(datos);
  }

  // La ventana cubre SOLO la lectura (encontrar y elegir la zona): el rival
  // groggy se recompone si tardás en verle el hueco. Una vez que ya
  // elegiste dónde pegar, el desafío pasa a ser clavarla — lo aporta la
  // flecha moviéndose en la barra — y ahí se corta este timer. Dos relojes
  // corriendo a la vez (la ventana Y la barra) sería confuso, no tenso.
  ventanaTimer = setTimeout(() => {
    resolver({ zonaElegida: null, precision: 0, aTiempo: false });
  }, ventanaMs);

  function pintarPaso2(zonaId) {
    limpiarVentana();
    const zona = ZONAS_GOLPE[zonaId];
    const controlador = crearBarraPrecision({
      dificultad: zona.dificultad,
      onResultado: ({ precision }) => {
        resolver({ zonaElegida: zonaId, precision, aTiempo: true });
      },
    });
    barra = controlador;

    mount(accionNodo, el('div', { class: 'stack' }, [
      el('div', { class: 'panel' }, [
        el('div', { class: 'etiqueta rojo', text: `Vas al ${zona.nombre.toLowerCase()}` }),
        el('p', { class: 'medio', text: 'Frená la flecha justo en el verde.' }),
      ]),
      controlador.nodo,
    ]));
  }

  function pintarPaso1() {
    const svg = dibujarSilueta({
      postura: info.postura,
      zonas: info.zonas,
      onElegirZona: (zonaId) => {
        if (resuelto) return; // ya se resolvió (p. ej. la ventana se cerró justo antes del click)
        pintarPaso2(zonaId);
      },
    });

    mount(accionNodo, el('div', { class: 'stack' }, [
      el('div', { class: 'panel' }, [
        el('div', { class: 'etiqueta rojo', text: '¡Lo tenés groggy!' }),
        el('p', { class: 'medio', text: POSTURAS[info.postura]?.descripcion ?? 'Leé dónde quedó abierto y mandala. Rápido.' }),
      ]),
      svg,
    ]));
  }

  pintarPaso1();
}

function pintarAccionResuelta(raiz, accionNodo, props) {
  // El narrador ya terminó (por eso se llegó acá): su limpieza deja de ser
  // necesaria. `pintarGolpe` registra la suya propia si corresponde; los
  // demás paneles (seguir/rincón/resultado) no manejan timers.
  raiz._limpiarAccion = null;

  const { pelea } = props;
  if (pelea.terminada) return pintarResultado(accionNodo, props);
  if (pelea.pendiente === 'rincon') return pintarRincon(accionNodo, props);
  if (pelea.pendiente === 'golpe') return pintarGolpe(raiz, accionNodo, props);
  return pintarSeguir(accionNodo, props);
}

function pintarCronicaYAccion(raiz, props, miGeneracion) {
  const { momentos = [] } = props;
  const logNodo = raiz.querySelector('[data-parte="log"]');
  const accionNodo = raiz.querySelector('[data-bloque="accion"]');
  const marcadorNodo = raiz.querySelector('[data-bloque="marcador"]');
  const pelea = props.pelea;

  const vigente = () => raiz.dataset.generacion === String(miGeneracion);

  let controlador = null;
  let narracionTerminada = false;
  pintarSaltar(accionNodo, () => { if (controlador) controlador.saltar(); });

  controlador = narrar(logNodo, momentos, {
    onPaso: (momento) => {
      if (!vigente()) return;
      actualizarMarcador(marcadorNodo, mezclarSnapshot(pelea, momento.snapshot));
    },
    onFin: () => {
      narracionTerminada = true;
      if (!vigente()) return;
      actualizarMarcador(marcadorNodo, pelea);
      pintarAccionResuelta(raiz, accionNodo, props);
    },
  });

  // Mientras narra, el timer vivo es el del narrador (no hay uno propio acá:
  // es `narrar()` quien programa el setTimeout de cada paso). `saltar()` lo
  // limpia y completa la narración de inmediato — sus callbacks quedan
  // neutralizados por `vigente()` si esto ya no es la generación actual.
  //
  // Si la narración YA terminó de forma sincrónica (lista vacía, modo
  // 'todo', reduced-motion) `onFin` corrió arriba y `pintarAccionResuelta`
  // ya dejó registrada la limpieza que corresponda (la del golpe de gracia,
  // o ninguna) — no hay que pisarla con la del narrador, que ya no tiene
  // nada corriendo.
  if (!narracionTerminada) {
    raiz._limpiarAccion = () => { if (controlador) controlador.saltar(); };
  }
}

/**
 * Pinta (o actualiza) la pantalla de pelea completa: marcador fijo arriba,
 * crónica narrada al medio, panel de acción abajo. Idempotente: la primera
 * vez arma el esqueleto; las siguientes reusan el mismo nodo raíz.
 *
 * @param {HTMLElement} contenedor
 * @param {{
 *   pelea: object, momentos?: Array,
 *   onSeguir?: () => void,
 *   onInstruccion?: (id:string) => void,
 *   onGolpe?: (datos:{zonaElegida:string|null, precision:number, aTiempo:boolean}) => void,
 *   onFin?: () => void,
 *   ventanaMs?: number,
 * }} props
 */
export function renderPelea(contenedor, props) {
  const { pelea } = props;
  let raiz = contenedor.querySelector(`.${CLASE_RAIZ}`);
  const yaExistia = Boolean(raiz);
  if (!raiz) {
    raiz = construirEsqueleto(pelea);
    mount(contenedor, raiz);
  }

  // La generación se bumpea ANTES de limpiar: si `_limpiarAccion` termina
  // llamando a algo que dispara `onFin`/`onGolpe` de la instancia anterior
  // (p. ej. el narrador vía `saltar()`), ese callback ya se encuentra con
  // `vigente()` en falso y no pinta nada — así se puede reusar `saltar()`
  // como mecanismo de limpieza sin necesidad de que narrador.js exponga un
  // "cancelar en silencio" aparte.
  generacionGlobal += 1;
  raiz.dataset.generacion = String(generacionGlobal);

  if (yaExistia && typeof raiz._limpiarAccion === 'function') {
    // Cancela cualquier timer del panel de acción anterior: el narrador
    // todavía narrando (deja de pasar momentos y no dispara onFin/onPaso de
    // más) o la ventana del golpe de gracia y su barra de precisión. Nunca
    // debería llegar a pasar en el flujo normal (cada llamada nueva la
    // dispara un callback del panel anterior, que ya se limpió solo al
    // resolver), pero es la red de seguridad.
    raiz._limpiarAccion();
    raiz._limpiarAccion = null;
  }

  actualizarEtiquetaRound(raiz, pelea);
  actualizarMarcador(raiz.querySelector('[data-bloque="marcador"]'), pelea);
  actualizarClaseNocaut(raiz, pelea);
  pintarCronicaYAccion(raiz, props, generacionGlobal);

  return raiz;
}
