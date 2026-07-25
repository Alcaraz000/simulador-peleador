import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { mediaDe, recordTexto, CATEGORIAS } from '../../core/fighter.js';
import { getDisciplina } from '../../core/disciplines.js';
import { ETIQUETAS, rangoDeMedia, etiquetaEstado } from '../../core/stats.js';
import { atributosConEntrenador } from '../../core/coach.js';
import { h2hTexto } from '../../core/rivalry.js';

// Columna izquierda del tablero (v2): el peleador. A diferencia de la v1
// (renderDashboard, que mezclaba esto con el botón "Continuar" y se
// redibujaba entero en cada beat), este panel vive en la región izquierda
// del shell y se repinta solo cuando cambian los datos del jugador: nunca
// desaparece mientras el jugador decide en el panel central.

const BASE = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];
const MANO_TEXTO = { derecha: 'Derecha', zurda: 'Zurda' };
const RESULTADO_TEXTO = { v: 'V', d: 'D', e: 'E' };
const RESULTADO_CLASE = { v: 'verde', d: 'rojo', e: 'sutil' };

// El sistema de entrenadores con nombre, escuela y aporte por atributo llega
// recién en el Bloque 5 (coach.js). Hasta entonces, `jugador.entrenador` puede
// no existir todavía: se muestra un estado neutro en vez de romper o inventar
// un entrenador que el core todavía no sabe describir.
function entrenadorDe(jugador) {
  if (jugador.entrenador) return jugador.entrenador;
  return {
    nombre: 'Sin cuerpo técnico',
    iniciales: '—',
    escuela: '',
    frase: 'Todavía no fichaste a nadie para tu rincón.',
    aporte: {},
  };
}

function peleasTotales(jugador) {
  const { v, d, e } = jugador.record;
  return v + d + e;
}

function cuadroMedia(jugador) {
  const media = mediaDe(jugador);
  const rango = rangoDeMedia(media);
  return el('div', { class: 'panel panel-peleador-cabecera', dataset: { accion: 'ficha' } }, [
    el('div', { class: 'fila', style: 'align-items:center' }, [
      el('div', {
        class: 'rango-media',
        dataset: { rangoMedia: rango.id },
        style: `background:${rango.color}22;border-color:${rango.color};color:${rango.color}`,
      }, [
        el('div', { class: 'rango-media-num', text: String(media) }),
      ]),
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'etiqueta', style: `color:${rango.color}`, text: rango.nombre }),
        el('h1', { style: 'display:flex;align-items:center;gap:7px;flex-wrap:wrap' }, [
          bandera(jugador.nacionalidad, { ancho: 20 }),
          `"${jugador.apodo}" ${jugador.nombre}`.toUpperCase(),
        ]),
        el('div', {
          class: 'etiqueta',
          text: `${CATEGORIAS[jugador.categoria]?.nombre ?? jugador.categoria} · ${MANO_TEXTO[jugador.mano] ?? jugador.mano} · ${Math.floor(jugador.edad)} años`,
        }),
        el('div', {
          class: 'etiqueta',
          style: 'margin-top:2px',
          text: `${jugador.gimnasio} · forma: ${etiquetaEstado('forma', jugador.estado.forma)}`,
        }),
      ]),
    ]),
  ]);
}

function bloqueCinturones(jugador) {
  if (jugador.titulos.length === 0) return null;
  return el('div', { class: 'panel', style: 'display:flex;flex-wrap:wrap;gap:6px' },
    jugador.titulos.map((t) => el('span', { class: 'chip dorado', text: `🏆 ${t}` })));
}

// El número grande es la BASE sin entrenador; el badge dorado es lo que él
// aporta aparte. `jugador.atributos[clave]` ya viene horneado con ese aporte
// sumado (así pelea, rankea y hace ofertas — ver coach.js), así que mostrarlo
// tal cual Y ADEMÁS el "+N" al lado duplicaba el aporte visualmente (bug de
// la revisión del Bloque 5: un "64 +6" que el jugador leía como 70, cuando el
// atributo real es 64). `atributosConEntrenador` devuelve `{base, aporte}`
// por clave con la invariante `base + aporte === jugador.atributos[clave]`.
function filaAtributo(clave, { base, aporte }) {
  return el('div', {
    class: `panel-peleador-atributo${aporte ? ' con-aporte' : ''}`,
    dataset: { atributo: clave },
  }, [
    el('span', { class: 'nombre sutil', text: ETIQUETAS[clave].larga }),
    el('span', {}, [
      el('b', { class: 'valor', text: String(base) }),
      aporte ? el('span', { class: 'aporte-entrenador', text: ` +${aporte}` }) : null,
    ]),
  ]);
}

function bloqueAtributos(jugador) {
  const disciplina = getDisciplina(jugador.disciplina);
  const claves = disciplina.usaGrappling ? [...BASE, 'grappling'] : BASE;
  const desglose = atributosConEntrenador(jugador);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'fila', style: 'justify-content:space-between;align-items:center;margin-bottom:8px' }, [
      el('div', { class: 'etiqueta', text: 'Atributos' }),
      el('div', { class: 'etiqueta dorado', style: 'letter-spacing:0.5px', text: '◐ aporte del entrenador' }),
    ]),
    el('div', { class: 'panel-peleador-atributos' },
      claves.map((c) => filaAtributo(c, desglose[c]))),
  ]);
}

function bloqueRincon(jugador) {
  const entrenador = entrenadorDe(jugador);
  return el('div', { class: 'panel tu-rincon' }, [
    el('div', { class: 'etiqueta', style: 'margin-bottom:8px', text: 'Tu rincón' }),
    el('div', { class: 'fila', style: 'align-items:center;gap:10px' }, [
      el('div', { class: 'rincon-iniciales', text: entrenador.iniciales }),
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { style: 'font-weight:800', text: entrenador.nombre }),
        el('div', {
          class: 'etiqueta',
          style: 'text-transform:none;letter-spacing:normal;font-size:10.5px',
          text: entrenador.escuela ? `Entrenador · ${entrenador.escuela}` : 'Entrenador',
        }),
      ]),
    ]),
    entrenador.frase
      ? el('div', { class: 'medio', style: 'font-style:italic;margin-top:8px;font-size:11px', text: `"${entrenador.frase}"` })
      : null,
  ]);
}

function rachita(jugador) {
  const ultimas = jugador.historial.slice(-5).reverse();
  if (ultimas.length === 0) return null;
  return el('div', { class: 'fila', style: 'gap:4px' }, ultimas.map((h) => el('span', {
    class: `chip ${RESULTADO_CLASE[h.resultado] ?? 'sutil'}`,
    text: RESULTADO_TEXTO[h.resultado] ?? '?',
  })));
}

function bloqueHistorial(jugador) {
  const totalPeleas = peleasTotales(jugador);
  const ranking = totalPeleas === 0 ? 'Sin clasificar' : (jugador.ranking ? `#${jugador.ranking}` : 'Sin clasificar');

  const ultimasTres = jugador.historial.slice(-3).reverse();

  return el('div', { class: 'panel', dataset: { accion: 'historial' } }, [
    el('div', { class: 'fila', style: 'align-items:center;gap:12px' }, [
      el('div', { style: 'text-align:center;flex:0 0 auto' }, [
        el('div', { style: 'font-size:22px;font-weight:800', text: recordTexto(jugador) }),
        el('div', { class: 'nombre etiqueta', text: 'Récord' }),
      ]),
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'etiqueta', text: 'Ranking' }),
        el('div', { style: 'font-weight:800', text: ranking }),
      ]),
    ]),
    rachita(jugador),
    ultimasTres.length > 0 ? el('div', { class: 'stack', style: 'margin-top:8px' },
      ultimasTres.map((h) => el('div', {
        class: 'fila',
        style: 'justify-content:space-between;font-size:11px',
      }, [
        el('span', { class: 'medio', text: h.rivalApodo ?? h.rivalNombre }),
        el('span', { class: RESULTADO_CLASE[h.resultado] ?? 'sutil', text: RESULTADO_TEXTO[h.resultado] ?? '?' }),
      ]))) : null,
  ]);
}

// Fama y el cara a cara contra el archirrival: los traía renderDashboard
// (v1, `recursos`) y no tenían casa todavía en el tablero v2. El archirrival
// recién existe cuando hay al menos dos cruces con el mismo rival (ver
// elegirArchirrival, rivalry.js), así que puede no haber ninguno.
function bloqueRecursos(jugador, partida) {
  const archi = (partida.rivalidades ?? []).find((r) => r.esArchirrival);
  const datosArchi = archi ? partida.mundo.roster.find((p) => p.id === archi.rivalId) : null;

  return el('div', { class: 'panel fila', style: 'gap:14px' }, [
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'etiqueta', text: 'Fama' }),
      el('div', { style: 'font-weight:800', text: String(jugador.fama) }),
    ]),
    datosArchi ? el('div', { style: 'flex:1' }, [
      el('div', { class: 'etiqueta rojo', text: `vs ${datosArchi.apodo}` }),
      el('div', { style: 'font-weight:800', text: h2hTexto(archi) }),
    ]) : null,
  ]);
}

function bloqueDinero(jugador) {
  return el('div', { class: 'panel fila', style: 'align-items:center;gap:10px' }, [
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'etiqueta', text: 'Dinero' }),
      el('div', { class: 'verde', style: 'font-weight:800;font-size:16px', text: fmtDinero(jugador.dinero) }),
    ]),
    el('button', {
      class: 'boton secundario boton-tienda',
      dataset: { accion: 'tienda' },
      type: 'button',
    }, [icono('tienda', { tamano: 20, color: '#f2c14e' })]),
  ]);
}

export function renderPanelPeleador(region, {
  partida, onFicha = () => {}, onTienda = () => {}, onHistorial = () => {},
}) {
  const { jugador } = partida;

  const cabecera = cuadroMedia(jugador);
  cabecera.addEventListener('click', () => onFicha(jugador));

  const dinero = bloqueDinero(jugador);
  dinero.querySelector('[data-accion="tienda"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    onTienda();
  });

  const historial = bloqueHistorial(jugador);
  historial.addEventListener('click', () => onHistorial(jugador));

  mount(region, el('div', { class: 'stack panel-peleador' }, [
    cabecera,
    bloqueCinturones(jugador),
    bloqueAtributos(jugador),
    bloqueRincon(jugador),
    historial,
    bloqueRecursos(jugador, partida),
    dinero,
  ]));
}
