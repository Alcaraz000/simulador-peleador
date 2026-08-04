import {
  el, mount, clear, fmtDinero,
} from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { crearTarjeta } from '../components/card.js';
import { narrar } from '../components/narrador.js';
import { dibujarSilueta } from '../components/silueta-rival.js';
import { crearBarraPrecision } from '../components/barra-precision.js';
import { abrirPopup } from '../components/popup.js';
import { PLANES, tarjetasJurados } from '../../core/fight.js';
import {
  INSTRUCCIONES_RINCON, ZONAS_GOLPE, POSTURAS, estadoRincon, abrirGolpeDeGracia, VENTANA_MS,
} from '../../core/fight-interactive.js';

const ETIQUETA_RIESGO = { bajo: 'Riesgo bajo', medio: 'Riesgo medio', alto: 'Riesgo alto' };

// Un ícono por nivel de riesgo, con siluetas bien distintas entre sí (escudo
// / medidor / octógono), y su color a tono con el resto del juego (verde =
// bueno, dorado = ojo, rojo = peligro — mismo lenguaje que .tarjeta-efecto).
const ICONO_RIESGO = { bajo: 'escudo', medio: 'medidor', alto: 'peligro' };
const COLOR_RIESGO = { bajo: 'var(--verde)', medio: 'var(--dorado)', alto: 'var(--rojo)' };
const CLASE_RIESGO = { bajo: 'verde', medio: 'dorado', alto: 'rojo' };

function tileConIcono({ nombreIcono, color, valorTexto, valorClase = '', etiqueta }) {
  return el('div', { class: 'tile' }, [
    el('div', { style: 'display:flex;justify-content:center;margin-bottom:4px' }, [icono(nombreIcono, { tamano: 16, color })]),
    el('div', { class: `valor ${valorClase}`.trim(), text: valorTexto }),
    el('div', { class: 'nombre', text: etiqueta }),
  ]);
}

// v18: los puestos divisionales de un rival, como una fila de chips —
// "REGIONAL #4", "NACIONAL #9". Un chip por división donde el rival de verdad
// figura; si no está en ninguna, no se dibuja nada (un rival sin rango es
// información también, pero se lee mejor por ausencia que con un "sin puesto"
// que ocupa lugar). El orden es el de la escalera: primero el escalón más bajo.
export const NOMBRE_DIVISION = { regional: 'Regional', nacional: 'Nacional', mundial: 'Mundial' };
const ORDEN_DIVISIONES = ['regional', 'nacional', 'mundial'];

export function chipsDePuestos(puestos) {
  const presentes = ORDEN_DIVISIONES.filter((d) => puestos?.[d]);
  if (presentes.length === 0) return null;
  return el('div', { class: 'fila rival-puestos', style: 'gap:6px;flex-wrap:wrap;margin-top:6px' },
    presentes.map((division) => el('div', {
      class: 'etiqueta dorado rival-puesto-chip',
      dataset: { division },
      text: `${NOMBRE_DIVISION[division]} #${puestos[division]}`,
    })));
}

export function renderOferta(contenedor, { oferta, jugador, onAceptar, onRechazar }) {
  // Pedido v17.3: "si es una pelea PARA GANAR el título no se debería poder
  // rechazar". Es la pelea que la carrera entera venía a buscar — dejar que
  // se escape por un click en el botón de al lado no es una decisión
  // interesante, es un accidente. Solo aplica a la CHANCE de título (nivel
  // 'titulo'); la defensa obligatoria (`esObligatoria`) se sigue pudiendo
  // rechazar, porque ahí rechazar tiene su propia consecuencia (se pierde el
  // cinturón) y eso sí es una decisión.
  const esChanceDeTitulo = Boolean(oferta.esTitulo) && !oferta.esObligatoria;
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Oferta de pelea' }),
    el('h1', { text: oferta.esTitulo ? 'Pelea de título' : 'Te ofrecen una pelea' }),
    el('p', { class: 'medio', text: oferta.textoGancho }),
    // `data-crece` (ver theme.css): el panel del rival es el que se queda con
    // el alto que sobre. Sin esto el sobrante caía al final, y como el botón
    // de acción se ancla al pie, "Aceptar" quedaba pegado al contenido y
    // "Rechazar" contra el piso, con un vacío enorme entre los dos.
    el('div', { class: 'panel', dataset: { crece: 'repartido' } }, [
      el('div', { class: 'fila', style: 'align-items:baseline;gap:6px' }, [
        // Con el roster de 100 (Pedido 1), la mayoría de los rivales de
        // relleno no tienen apodo (null): sin este resguardo mostraba
        // literalmente '"null" Nombre'.
        el('div', {
          style: 'font-size:18px;font-weight:800;flex:1;min-width:0',
          text: oferta.rivalApodo ? `"${oferta.rivalApodo}" ${oferta.rivalNombre}` : oferta.rivalNombre,
        }),
      ]),
      el('div', { class: 'etiqueta', text: `Media ${oferta.rivalMedia} · récord ${oferta.rivalRecord} · ${oferta.rivalEstilo}` }),
      // Los puestos DIVISIONALES del rival (v18, pedido: "que el matchmaking
      // muestre el/los puesto(s) del rival"). Antes acá iba un solo número
      // dorado con `rivalRanking`, el índice global del roster por media — un
      // puesto que no existía en ninguna de las cuatro tablas que el jugador
      // puede abrir. Ahora son los puestos de verdad, uno por división donde el
      // rival figure: son los que deciden cuánto vale ganar (puntos-ranking.js)
      // y por eso son los que hacen falta para decidir si vale la pena.
      chipsDePuestos(oferta.rivalPuestos),
      el('div', { class: 'fila', style: 'margin-top:10px' }, [
        tileConIcono({
          nombreIcono: 'billete', color: 'var(--verde)', valorTexto: fmtDinero(oferta.bolsa), valorClase: 'verde', etiqueta: 'Bolsa',
        }),
        tileConIcono({
          nombreIcono: ICONO_RIESGO[oferta.riesgo],
          color: COLOR_RIESGO[oferta.riesgo],
          valorTexto: ETIQUETA_RIESGO[oferta.riesgo],
          valorClase: CLASE_RIESGO[oferta.riesgo],
          etiqueta: 'Riesgo',
        }),
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
    // Opinión del entrenador sobre ESTA pelea (Task v3, pedido textual): con
    // criterio real (media, estado físico, lo que está en juego), no una
    // frase de relleno siempre igual — ver opinionEntrenador en core/offers.js.
    oferta.fraseEntrenador ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Tu entrenador opina' }),
      el('p', { class: 'medio', style: 'font-style:italic;margin-top:6px', text: `"${oferta.fraseEntrenador}"` }),
    ]) : null,
    el('button', { class: 'boton', dataset: { accion: 'aceptar' }, text: 'Aceptar la pelea', onClick: onAceptar }),
    // Deshabilitado (no escondido): que el botón siga estando y diga POR QUÉ
    // no se puede es lo que convierte "esto no anda" en "esto es así".
    esChanceDeTitulo
      ? el('button', {
        class: 'boton secundario',
        dataset: { accion: 'rechazar' },
        disabled: true,
        text: 'Una chance de título no se rechaza',
      })
      : el('button', { class: 'boton secundario', dataset: { accion: 'rechazar' }, text: 'Rechazar', onClick: onRechazar }),
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

  mount(contenedor, el('div', { class: 'stack pantalla-corta' }, [
    el('div', { class: 'etiqueta', text: 'Preparación' }),
    el('h1', { text: 'El plan de pelea' }),
    el('p', {
      class: 'medio',
      // Con el roster de 100 (Pedido 1), la mayoría de los rivales de
      // relleno no tienen apodo (null): sin este resguardo mostraba
      // literalmente "null" en la pantalla del plan de pelea.
      text: `Tu entrenador te mira antes de que suene la campana: "¿cómo la encaramos contra ${oferta.rivalApodo ?? oferta.rivalNombre}? Vos decidís, yo te digo qué ganás y qué te puede costar."`,
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

// Cada peleador tiene SU lado (nombre, bandera, aguante y fatiga, todo
// junto, en una sola columna) — Task v3, pedido textual: "¿no debería ir de
// un lado las del peleador y del otro las del contrincante? Para no
// marear." Antes el aguante/fatiga de ambos vivían en un bloque separado de
// la cabecera con nombres; ahora es UNA sola columna por peleador, así lo
// que se lee de arriba a abajo es siempre del mismo boxeador.
function columnaPeleador(datos, { lado }) {
  const cabecera = lado === 'jugador'
    ? [bandera(datos.nacionalidad, { ancho: 22 }), el('span', { text: datos.apodo })]
    : [el('span', { text: datos.apodo }), bandera(datos.nacionalidad, { ancho: 22 })];

  return el('div', { class: `marcador-lado marcador-${lado === 'jugador' ? 'izq' : 'der'}`, dataset: { lado } }, [
    el('div', { class: `marcador-peleador ${lado === 'rival' ? 'marcador-derecha' : ''}`.trim() }, cabecera),
    filaStat('corazon', `aguante-${lado}`, lado === 'jugador' ? 'verde-barra' : ''),
    filaStat('rayo', `fatiga-${lado}`, 'dorada'),
  ]);
}

function construirEsqueleto(pelea) {
  const { jugador, rival } = pelea.snapshot;

  const marcador = el('div', { class: 'panel marcador-pelea', dataset: { bloque: 'marcador' } }, [
    el('div', { class: 'fila marcador-cuerpo' }, [
      columnaPeleador(jugador, { lado: 'jugador' }),
      el('div', { class: 'marcador-vs etiqueta', text: 'VS' }),
      columnaPeleador(rival, { lado: 'rival' }),
    ]),
    el('div', { class: 'etiqueta', dataset: { parte: 'round-etiqueta' } }),
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

// El botón para arrancar la pelea (Task v3, pedido textual: "Debe incluirse
// un botón que sea para empezar la pelea"): la crónica arranca con un
// mensaje de espera (mismo módulo `.log` de siempre, sin narrar nada
// todavía) y el panel de acción con un único botón. Recién al tocarlo el
// llamador simula el primer round.
function pintarEmpezar(raiz, accionNodo, { onEmpezar = () => {} }) {
  const logNodo = raiz.querySelector('[data-parte="log"]');
  if (logNodo && !logNodo.hasChildNodes()) {
    logNodo.appendChild(el('p', {
      class: 'sutil',
      text: 'Los dos peleadores están en su rincón, esperando la campana.',
    }));
  }
  mount(accionNodo, el('button', {
    class: 'boton', type: 'button', dataset: { accion: 'empezar-pelea' }, text: 'Empezar pelea', onClick: onEmpezar,
  }));
}

// El botón intermedio para ir al rincón (Task v3, pedido textual: "Cuando
// termina un round, recién ahí uno clickea y ve lo que te dice el
// entrenador"): apenas termina de narrarse el round, el panel de acción
// ofrece SOLO este botón — ni las tarjetas de instrucción ni la palabra del
// entrenador aparecen todavía. Es un paso puramente local (no dispara
// ningún callback hacia afuera): no hay nada que simular todavía, solo
// revelar lo que ya se calculó.
function pintarIrAlRincon(accionNodo, onVerRincon) {
  mount(accionNodo, el('button', {
    class: 'boton', type: 'button', dataset: { accion: 'ver-rincon' }, text: 'Ir al rincón', onClick: onVerRincon,
  }));
}

function pintarResultado(accionNodo, {
  pelea, despues = null, onFin = () => {}, onContinuar = () => {},
}) {
  if (!despues) {
    mount(accionNodo, el('div', { class: 'stack' }, [
      el('div', { class: 'panel' }, [el('p', { class: 'dorado', text: pelea.resultado.texto })]),
      el('button', {
        class: 'boton', type: 'button', dataset: { accion: 'fin' }, text: 'Ver qué pasó después', onClick: onFin,
      }),
    ]));
    return;
  }

  // "Después de la pelea" vive en la MISMA pantalla (Task v3, pedido
  // textual: "'Después de la pelea' también debe verse en la pantalla de
  // peleas, NO en una pantalla nueva"): reemplaza el contenido del panel de
  // acción, nada más — el marcador (con las tarjetas finales de los
  // jurados) y la crónica siguen montados tal cual quedaron.
  mount(accionNodo, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Después de la pelea' }),
    el('div', { class: 'panel' }, [
      el('p', { class: 'dorado', text: pelea.resultado.texto }),
      el('p', { style: 'margin-top:6px', text: despues.texto }),
      despues.deltas?.length ? el('div', { class: 'mods', text: despues.deltas.join(' · ') }) : null,
      despues.tituloGanado
        ? el('div', { class: 'chip dorado', style: 'margin-top:8px', text: `🏆 Nuevo campeón: ${despues.tituloGanado}` })
        : null,
    ]),
    el('button', {
      class: 'boton', type: 'button', dataset: { accion: 'continuar' }, text: 'Continuar', onClick: onContinuar,
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

// Pinta lo que dice el entrenador — Task v3, pedido textual: "se reemplaza
// el contenido del módulo que tiene la narración de lo ocurrido y aparece
// el texto del entrenador". Mismo nodo `.log` de la crónica, no uno nuevo:
// se limpia y se le pone el estado + el consejo en vez de las líneas del
// round que se acaban de narrar.
//
// Task v4, pedido textual: el tip puntual ("Tu rincón te tira: ...") vivía
// antes debajo de las tarjetas de acción, donde de hecho leía como una
// cuarta opción infalible ("hace que el jugador siempre gane"). Ahora vive
// ACÁ, junto al resto de lo que dice el rincón — y puede no estar: `estado.tip`
// viene `null` cuando el entrenador no tuvo (o no acertó a tener) una lectura
// clara este round (ver consejoRincon en core/fight-interactive.js). Cuando sí
// hay tip, el nombre del entrenador va arriba del texto, como quien firma lo
// que dice.
function pintarConsejoEnCronica(raiz, pelea, estado) {
  const logNodo = raiz.querySelector('[data-parte="log"]');
  if (!logNodo) return;
  clear(logNodo);

  const instruccionTip = estado.tip ? INSTRUCCIONES_RINCON[estado.tip.id] : null;

  logNodo.appendChild(el('div', { class: 'rincon-mensaje' }, [
    el('div', { class: 'etiqueta', text: `Fin del round ${Math.max(pelea.roundActual - 1, 1)} · el rincón` }),
    el('div', { class: 'etiqueta dorado', style: 'margin-top:4px', text: estado.tarjetasTexto }),
    el('p', { class: 'medio', style: 'font-style:italic;margin-top:8px', text: `"${estado.consejo}"` }),
    instruccionTip ? el('div', { class: 'rincon-tip', dataset: { tip: 'rincon' }, style: 'margin-top:10px' }, [
      el('div', { class: 'etiqueta dorado', text: estado.tip.entrenadorNombre }),
      el('p', { class: 'medio', style: 'font-style:italic;margin-top:4px', text: `"Tu rincón te tira: ${instruccionTip.nombre}"` }),
    ]) : null,
  ]));
}

function pintarRincon(raiz, accionNodo, { pelea, onInstruccion = () => {} }) {
  const estado = estadoRincon(pelea);
  pintarConsejoEnCronica(raiz, pelea, estado);

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
    el('div', { class: 'etiqueta', text: '¿Qué hacés este round?' }),
    el('div', { class: 'panel-decision-grilla' }, tarjetas),
  ]));
}

// El contenido del paso 1 (silueta) y el paso 2 (barra de precisión), cada
// uno como una función que devuelve el nodo a montar — separados de
// `pintarGolpe` para que ésta se ocupe solo de ORQUESTAR (popup, timers,
// resolución), nunca de armar DOM a mano.
// La barra que se descarga (pedido v17): hasta ahora la ventana de reacción
// existía —un `setTimeout` de `ventanaMs`— pero era INVISIBLE. El jugador
// perdía la chance sin haber tenido nunca forma de saber cuánto le quedaba,
// que es lo único que vuelve tensa una cuenta regresiva en vez de injusta.
//
// Se anima con CSS puro (`transform: scaleX`, ver theme.css), no con un
// segundo timer en JS: el reloj que MANDA sigue siendo el `setTimeout` de
// `pintarGolpe` (uno solo decide, como siempre en este proyecto), y la barra
// es puro reflejo. Además, al vivir dentro del popup, se muere sola cuando el
// popup se cierra — no hay nada que limpiar ni forma de dejarla colgada.
function barraDeVentana(ventanaMs) {
  return el('div', {
    class: 'golpe-ventana',
    role: 'timer',
    'aria-label': 'Tiempo para elegir dónde pegar',
  }, [
    el('div', { class: 'golpe-ventana-relleno', style: `--ventana-ms:${ventanaMs}ms` }),
  ]);
}

function contenidoPaso1(info, { onElegirZona, ventanaMs }) {
  const svg = dibujarSilueta({ postura: info.postura, zonas: info.zonas, onElegirZona });
  return el('div', { class: 'stack' }, [
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: '¡Lo tenés groggy!' }),
      el('p', { class: 'medio', text: POSTURAS[info.postura]?.descripcion ?? 'Leé dónde quedó abierto y mandala. Rápido.' }),
      barraDeVentana(ventanaMs),
    ]),
    svg,
  ]);
}

function contenidoPaso2(zona, { onResultado }) {
  const controlador = crearBarraPrecision({ dificultad: zona.dificultad, onResultado });
  const nodo = el('div', { class: 'stack' }, [
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: `Vas al ${zona.nombre.toLowerCase()}` }),
      el('p', { class: 'medio', text: 'Frená la flecha justo en el verde.' }),
    ]),
    controlador.nodo,
  ]);
  return { nodo, controlador };
}

// Pedido 3 (v14, "el golpe de gracia debe verse como un popup, [...] es el
// momento más tenso del juego"): antes vivía DENTRO del panel de acción de
// siempre (`accionNodo`), un panel más entre "Saltar" y el resultado de la
// pelea — se sentía como una tarjeta cualquiera, no como el momento de
// máxima tensión que es. Ahora se abre como POPUP (abrirPopup,
// components/popup.js), que se impone sobre TODA la pantalla (tablero
// oscurecido detrás, overlay al frente) — la misma silueta con sus tres
// zonas, la misma barra de precisión, ningún efecto visual de los que ya
// funcionaban se tocó, solo DÓNDE viven.
//
// `raiz` sigue recibiendo la limpieza en `raiz._limpiarAccion`: si
// `renderPelea` se vuelve a llamar mientras la ventana del golpe (o la barra
// de precisión) todavía está corriendo, la cancela ANTES de pintar el
// estado nuevo — y ahora ADEMÁS cierra el popup, para que nunca quede
// flotando huérfano sobre la pantalla siguiente.
//
// El popup de este momento NO se puede cerrar con Escape ni clickeando
// afuera (`cerrableConEscape`/`cerrableClickAfuera` en `false`, ver
// components/popup.js): irse a mitad de camino no puede ser un accidente —
// un Escape reflejo o un click mal calculado en el borde no tienen que
// costarte la chance. La X sigue cerrando (es la única vía que ya exige un
// click deliberado sobre un botón chico): cerrarla ahí SÍ es una decisión
// explícita del jugador, y se resuelve exactamente igual que agotar la
// ventana sin elegir zona — perdés la chance, el rival se recompone.
function pintarGolpe(raiz, accionNodo, { pelea, onGolpe = () => {}, ventanaMs = VENTANA_MS }) {
  const info = abrirGolpeDeGracia(pelea);
  let resuelto = false;
  let ventanaTimer = null;
  let barra = null;
  // Distingue un cierre DISPARADO POR NOSOTROS (limpiarTodo, al re-renderizar
  // o al resolver de cualquier otra forma) de uno que el jugador gatilló de
  // verdad clickeando la X: solo este último tiene que resolver el golpe —
  // el primero ya lo hizo (o no corresponde resolver nada, solo limpiar).
  let cerrandoPorLimpieza = false;
  let popup;

  function limpiarVentana() {
    if (ventanaTimer !== null) {
      clearTimeout(ventanaTimer);
      ventanaTimer = null;
    }
  }

  function limpiarTodo() {
    limpiarVentana();
    if (barra) barra.detener();
    cerrandoPorLimpieza = true;
    popup.cerrar();
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
    const { nodo, controlador } = contenidoPaso2(zona, {
      onResultado: ({ precision }) => resolver({ zonaElegida: zonaId, precision, aTiempo: true }),
    });
    barra = controlador;
    // El mismo popup se refresca EN EL LUGAR (nunca se cierra uno y se abre
    // otro): `popup.cuerpo` es justo el nodo pensado para esto, ver el
    // comentario de abrirPopup.
    mount(popup.cuerpo, nodo);
  }

  // El panel de acción de siempre queda vacío: el golpe de gracia ya no es
  // "un panel más" ahí — cualquier resto visible detrás del popup (p. ej.
  // el botón "Saltar" que dejó la narración) se saca de en medio.
  clear(accionNodo);

  popup = abrirPopup({
    titulo: 'Golpe de gracia',
    contenido: contenidoPaso1(info, {
      ventanaMs,
      onElegirZona: (zonaId) => {
        if (resuelto) return; // ya se resolvió (p. ej. la ventana se cerró justo antes del click)
        pintarPaso2(zonaId);
      },
    }),
    cerrableConEscape: false,
    cerrableClickAfuera: false,
    // "Quiero que dé la sensación de que es un momento de urgencia y
    // crítico": borde/resplandor rojo (ver theme.css) que distingue este
    // popup de los demás (tienda, ranking, hitos), todos con el look neutro
    // de siempre.
    claseExtra: 'popup-critico',
    onCerrar: () => {
      if (cerrandoPorLimpieza) return;
      resolver({ zonaElegida: null, precision: 0, aTiempo: false });
    },
  });
}

function pintarAccionResuelta(raiz, accionNodo, props) {
  // El narrador ya terminó (por eso se llegó acá): su limpieza deja de ser
  // necesaria. `pintarGolpe` registra la suya propia si corresponde; los
  // demás paneles (empezar/ir al rincón/rincón/resultado/seguir) no manejan
  // timers.
  raiz._limpiarAccion = null;

  const { pelea } = props;
  if (pelea.terminada) return pintarResultado(accionNodo, props);
  if (pelea.pendiente === 'inicio') return pintarEmpezar(raiz, accionNodo, props);
  if (pelea.pendiente === 'rincon') {
    // El rincón aparece recién cuando el jugador lo pide (Task v3, pedido
    // textual): un solo click intermedio, puramente local — no dispara
    // ningún callback hacia `main.js`, solo revela lo que ya está calculado.
    return pintarIrAlRincon(accionNodo, () => pintarRincon(raiz, accionNodo, props));
  }
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
 *   onEmpezar?: () => void,
 *   onSeguir?: () => void,
 *   onInstruccion?: (id:string) => void,
 *   onGolpe?: (datos:{zonaElegida:string|null, precision:number, aTiempo:boolean}) => void,
 *   onFin?: () => void,
 *   despues?: {texto:string, deltas?:string[], tituloGanado?:string|null}|null,
 *   onContinuar?: () => void,
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
