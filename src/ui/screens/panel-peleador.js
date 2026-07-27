import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import {
  mediaDe, recordTexto, CATEGORIAS, apodoParaMostrar,
} from '../../core/fighter.js';
import { getDisciplina } from '../../core/disciplines.js';
import { ETIQUETAS, rangoDeMedia, etiquetaEstado } from '../../core/stats.js';
import { atributosConEntrenador } from '../../core/coach.js';
import { h2hTexto } from '../../core/rivalry.js';
import { rankingDelJugador } from '../../core/world.js';
import { faseFisicaJugador, etapaActual, fraseDeEtapa } from '../../core/career.js';

// El peleador (v2): antes una sola columna izquierda larguísima. La reforma
// de grilla 3×3 (v4, feedback del usuario: "en PC está muy en vertical y no
// se aprovecha bien el ancho") reparte este mismo contenido en varios
// paneles PERSISTENTES, cada uno con su celda fija en el tablero — nunca se
// reacomodan entre sí ni se ocultan mientras el jugador decide (pedido
// general "nada se mueve"):
//   - renderPanelPeleador: personaje (media/nombre/datos) + cinturones + tu
//     rincón + etapa/categoría + historial/ranking — columna izquierda.
//   - renderPanelAtributos / renderPanelEstado: columna central, arriba del
//     módulo de decisión (que sigue siendo lo único que cambia ahí).
//   - renderPanelDinero / renderPanelRecursos: columna derecha, junto al
//     calendario y la próxima pelea/noticias (ver main.js, montarTablero).
// Antes de esta reforma todo esto vivía junto en un solo renderPanelPeleador
// que pintaba la columna izquierda entera; se mantiene acá porque comparten
// los mismos helpers de datos (fighter.js, coach.js, stats.js) y no hay
// ganancia real en separarlos en archivos aparte.

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

// Cabecera del peleador (Cambio 3, mockup del usuario): un cuadro grande de
// MEDIA a la izquierda; a su derecha, arriba bandera+apodo y abajo el
// apellido; debajo, en dos columnas, PESO|MANO HÁBIL y EDAD|FORMA (con
// ícono); por último FAMA, que ANTES vivía en su propio panel
// (bloqueRecursos, más abajo) y ahora se mudó acá — ya no hay panel de fama
// aparte. Reemplaza a la cabecera de la v3 (MEDIA como badge chico arriba a
// la derecha + una sola `h1` con bandera+apodo+apellido juntos, que en la
// columna angosta del tablero se partía en tres líneas — queja del usuario).
// Separar apodo (arriba) de apellido (abajo) en dos líneas propias es lo que
// evita esa partidura: cada uno respira en su propio renglón, nunca los tres
// juntos peleando por el mismo ancho.
//
// Sistema 2 (feedback del usuario: "hay una edad donde el prime va bajando
// [...] el tablero debería poder comunicarlo"): color por fase — dorado para
// "el mejor momento" (una buena noticia, se destaca), rojo para el declive
// (aviso), sutil para el ascenso (todavía no hay nada que anunciar). Sigue
// visible, ahora como una etiqueta chica debajo del apellido, en la columna
// de identidad.
const CLASE_FASE = {
  ascenso: 'sutil', prime: 'dorado', declive: 'rojo', declive_duro: 'rojo',
};

function capitalizar(texto) {
  return texto.length === 0 ? texto : texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Peso pluma"/"Peso mediano" (CATEGORIAS, fighter.js) ya arrancan con
// "Peso": la fila de la cabecera ya trae su propia etiqueta "PESO" arriba,
// así que mostrar el nombre completo hubiera repetido la palabra dos veces
// ("Peso: Peso pluma"). Se muestra solo la categoría (capitalizada).
function pesoDe(jugador) {
  const nombre = CATEGORIAS[jugador.categoria]?.nombre ?? jugador.categoria;
  return capitalizar(nombre.replace(/^Peso\s+/i, ''));
}

// Apodo arriba (con la bandera), apellido abajo — el contrato de
// `nombreConApodo` (fighter.js) es un solo string ('"Apodo" Apellido' o solo
// 'Apellido' si no tiene apodo); acá se necesitan las dos partes por
// separado para ponerlas en renglones distintos. Sin apodo, el apellido
// sube solo a la línea de arriba (junto a la bandera) en vez de dejar un
// renglón vacío debajo.
function identidadDividida(jugador) {
  if (jugador.apodo) return { arriba: `"${jugador.apodo}"`, abajo: jugador.nombre };
  return { arriba: jugador.nombre, abajo: '' };
}

// Una celda de la grilla de datos de la cabecera: etiqueta chica arriba,
// valor grande abajo (mismo lenguaje visual que los cuadros de
// atributos/estado, ver filaAtributo más abajo). `contenido` puede ser un
// string o una lista de nodos (FORMA le suma su ícono nuevo antes del
// texto).
function filaDato(etiqueta, contenido) {
  return el('div', { class: 'cabecera-dato' }, [
    el('div', { class: 'etiqueta', text: etiqueta }),
    el('div', { class: 'cabecera-dato-valor' }, contenido),
  ]);
}

function cuadroMedia(jugador) {
  const media = mediaDe(jugador);
  const rango = rangoDeMedia(media);
  const fase = faseFisicaJugador(jugador);
  const identidad = identidadDividida(jugador);

  return el('div', { class: 'panel panel-peleador-cabecera' }, [
    el('div', { class: 'cabecera-top' }, [
      el('div', {
        class: 'cabecera-media',
        dataset: { rangoMedia: rango.id },
        style: `background:${rango.color}22;border-color:${rango.color};color:${rango.color}`,
      }, [
        el('div', { class: 'cabecera-media-num', text: String(media) }),
        el('div', { class: 'etiqueta', style: `color:${rango.color}`, text: rango.nombre }),
      ]),
      el('div', { class: 'cabecera-identidad' }, [
        el('div', { class: 'cabecera-apodo' }, [
          bandera(jugador.nacionalidad, { ancho: 18 }),
          el('span', { text: identidad.arriba.toUpperCase() }),
        ]),
        identidad.abajo ? el('div', { class: 'cabecera-apellido', text: identidad.abajo.toUpperCase() }) : null,
        el('div', {
          class: `etiqueta cabecera-fase ${CLASE_FASE[fase.id] ?? 'sutil'}`,
          title: fase.detalle,
          text: fase.etiqueta,
        }),
      ]),
    ]),
    el('div', { class: 'cabecera-datos-grilla' }, [
      filaDato('Peso', pesoDe(jugador)),
      filaDato('Mano hábil', MANO_TEXTO[jugador.mano] ?? jugador.mano),
      filaDato('Edad', `${Math.floor(jugador.edad)} años`),
      filaDato('Forma', [icono('forma', { tamano: 14 }), ` ${etiquetaEstado('forma', jugador.estado.forma)}`]),
    ]),
    filaDato('Fama', String(jugador.fama)),
  ]);
}

function bloqueCinturones(jugador) {
  if (jugador.titulos.length === 0) return null;
  return el('div', { class: 'panel', style: 'display:flex;flex-wrap:wrap;gap:6px' },
    jugador.titulos.map((t) => el('span', { class: 'chip dorado', text: `🏆 ${t}` })));
}

// Cambio 2 (feedback del usuario: "los módulos de atributos y estados están
// bien posicionados pero mal orientados... quiero que se vean en
// horizontal... cuadros con POT / 33, VEL / 43"): antes una fila
// `nombre .......... valor`; ahora un CUADRO — etiqueta arriba, valor grande
// abajo — que vive en una grilla junto a sus hermanos (bloqueAtributosSolo/
// bloqueEstadoSolo, más abajo).
//
// v8 (pedido textual: "NO quiero que estén resumidos los títulos... el único
// permitido así es IQ porque es muy largo"): se pasó de `ETIQUETAS[clave]
// .corta` (POT, VEL, DIS, MEN...) a `.larga` (Potencia, Velocidad,
// Disciplina...) para todos MENOS iq (su forma larga, "IQ de pelea", es
// demasiado para lo que aporta — "IQ" a secas ya es corto y clarísimo). El
// texto se muestra en mayúsculas por CSS (`text-transform`, ver
// `.panel-peleador-atributo .nombre` al final de theme.css) — el string en
// sí queda en su capitalización natural ("Potencia"), más legible para
// lectores de pantalla. La solución a "no entran en un cuadro angosto" ya NO
// es acortar el texto (inaceptable, pedido explícito): es dejar que la
// etiqueta envuelva a una segunda línea dentro del mismo cuadro — mismo
// criterio que `.cabecera-apellido`, más arriba ("nunca …, puede envolver").
function etiquetaAtributo(clave) {
  if (clave === 'iq') return ETIQUETAS.iq.corta;
  return ETIQUETAS[clave].larga;
}

// El número grande sigue siendo la BASE sin entrenador; el badge dorado
// sigue siendo lo que él aporta aparte (misma invariante de siempre:
// `base + aporte === jugador.atributos[clave]`, ver atributosConEntrenador,
// coach.js). Para que TODOS los cuadros midan igual entre sí (nota 1/2 del
// pedido) el badge se posiciona ABSOLUTO en la esquina superior derecha del
// cuadro: nunca participa del alto/ancho del cuadro, así que un cuadro CON
// aporte y uno SIN aporte ocupan exactamente el mismo espacio.
function filaAtributo(clave, { base, aporte }) {
  return el('div', {
    class: `panel-peleador-atributo${aporte ? ' con-aporte' : ''}`,
    dataset: { atributo: clave },
  }, [
    aporte ? el('span', { class: 'aporte-entrenador', text: `+${aporte}` }) : null,
    el('span', { class: 'nombre sutil', text: etiquetaAtributo(clave) }),
    el('b', { class: 'valor', text: String(base) }),
  ]);
}

// Especiales (`jugador.especiales`) y estado (`jugador.estado`) no vivían en
// ningún lado del tablero: las tarjetas los modifican igual que a los
// atributos de combate (aplicarCarta reparte por los tres grupos, ver
// cards.js) y el jugador leía "+10 Forma" en una tarjeta sin que ese número
// apareciera en ninguna parte (queja del usuario). Fatiga queda afuera (no
// tiene panel propio); lesión SÍ se muestra, pero aparte (ver bloqueLesion,
// más abajo) — no es un número más de la grilla, trae su propio botón de
// curar.
const ESTADO_VISIBLE = ['menton', 'disciplinaPersonal', 'forma', 'moral'];

function filaEstado(jugador, clave) {
  const valor = clave in jugador.especiales ? jugador.especiales[clave] : jugador.estado[clave];
  return filaAtributo(clave, { base: valor, aporte: 0 });
}

// Lesión + botón de curar (v7, Pedido 3: "sacá 'lo que viene ahora'"): vivía
// en panel-avance.js, la pantalla intermedia que se mostraba ENTRE beats —
// al borrar esa pantalla (el jugador ahora pasa derecho a la próxima
// tarjeta) esta función se muda ACÁ, al panel de Estado (columna central,
// siempre visible, sea cual sea el beat que esté mostrando la tarjeta de
// abajo): curar una lesión no puede quedar escondida detrás de una pantalla
// que ya no existe. Mismo comportamiento de siempre — nombre, semanas
// restantes, costo, botón deshabilitado si no alcanza la plata — solo
// cambia dónde vive.
function bloqueLesion(jugador, onCurar) {
  const lesion = jugador.estado.lesion;
  if (!lesion) return null;
  return el('div', { class: 'panel panel-lesion', style: 'display:flex;align-items:center;gap:10px' }, [
    icono('alerta', { color: '#e05252' }),
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'rojo', style: 'font-weight:800', text: lesion.nombre }),
      el('div', {
        class: 'etiqueta',
        text: `Te quedan ${lesion.semanasRestantes} ${lesion.semanasRestantes === 1 ? 'semana' : 'semanas'} para recuperarte`,
      }),
    ]),
    el('button', {
      class: 'boton secundario', dataset: { accion: 'curar' },
      disabled: jugador.dinero >= lesion.costo ? null : '',
      style: 'width:auto;padding:10px 14px;flex:0 0 auto', onClick: onCurar,
      text: `Curar · ${fmtDinero(lesion.costo)}`,
    }),
  ]);
}

// Atributos y Estado eran un solo panel (`bloqueAtributos`) antes de la
// reforma de grilla 3×3: el mockup los pide como dos celdas propias (columna
// central, arriba del módulo de decisión — nunca mezclados con las tarjetas
// de combate, que son las únicas con aporte de entrenador).
function bloqueAtributosSolo(jugador) {
  const disciplina = getDisciplina(jugador.disciplina);
  const claves = disciplina.usaGrappling ? [...BASE, 'grappling'] : BASE;
  const desglose = atributosConEntrenador(jugador);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'fila', style: 'justify-content:space-between;align-items:center;margin-bottom:8px' }, [
      el('div', { class: 'etiqueta', text: 'Atributos' }),
      el('span', { class: 'panel-peleador-aporte-etiqueta', text: 'aporte del entrenador' }),
    ]),
    el('div', { class: 'panel-peleador-atributos' },
      claves.map((c) => filaAtributo(c, desglose[c]))),
  ]);
}

function bloqueEstadoSolo(jugador, onCurar) {
  return el('div', { class: 'stack' }, [
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', style: 'margin-bottom:8px', text: 'Estado' }),
      el('div', { class: 'panel-peleador-atributos panel-peleador-atributos-estado' },
        ESTADO_VISIBLE.map((c) => filaEstado(jugador, c))),
    ]),
    bloqueLesion(jugador, onCurar),
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

// Etapa actual (nombre + frase de sabor): vivía en panel-avance.js (visible
// solo en el estado ocioso) hasta la reforma de grilla 3×3 — el mockup la
// pide como bloque PERMANENTE, junto a ranking, en la columna izquierda
// ("Categoría + Ranking"): el jugador tiene que poder ver en qué categoría
// está aunque esté en medio de una decisión, no solo entre beats.
// v6, segunda vuelta ("'Veterano' no es una categoría nueva... el peleador
// sigue siendo profesional"): el NOMBRE sigue viniendo de `etapaActual`
// (siempre "Profesional" del debut al retiro, nunca "Veterano" — ETAPAS ya
// no tiene esa entrada), pero la FRASE usa `fraseDeEtapa`, que sí envejece
// con el jugador (etiqueta de sabor por edad, ver tagContenido en
// career.js) aunque la etapa mecánica sea siempre la misma.
function bloqueEtapa(partida) {
  const etapa = etapaActual(partida);
  return el('div', { class: 'panel' }, [
    el('div', { class: 'dorado', style: 'font-weight:800;letter-spacing:1px', text: etapa.nombre.toUpperCase() }),
    el('div', { class: 'medio', style: 'font-size:12px;margin-top:4px', text: fraseDeEtapa(partida) }),
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

// El botón "ver tabla" (v3, feedback del usuario: "no puedo ver quiénes
// están por encima o por debajo de mí") vive DENTRO del bloque de
// récord/ranking, que ya es clickeable entero hacia el historial de la
// Ficha (dataset accion="historial", ver renderPanelPeleador más abajo).
// stopPropagation evita que ese click de afuera dispare onHistorial además
// de onVerRanking — mismo patrón que el botón de la tienda en bloqueDinero.
function botonVerRanking(onVerRanking) {
  const boton = el('button', {
    class: 'tabla-ranking-boton',
    type: 'button',
    dataset: { accion: 'ver-ranking' },
    'aria-label': 'Ver tabla de posiciones',
  }, [icono('lista', { tamano: 13 })]);
  boton.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onVerRanking();
  });
  return boton;
}

// El puesto se calcula EN VIVO con `rankingDelJugador` (world.js) — la misma
// función que arma `tablaRanking` para el popup — en vez de leer el campo
// cacheado `jugador.ranking`. Ese campo solo se refresca una vez por bloque
// (avanzarBloque, career.js): si algo cambió la media o el récord del
// jugador a mitad de bloque (una carta de mejora, una pelea, el campamento),
// quedaba viejo hasta el próximo bloque y el "#N" de acá podía no coincidir
// con el puesto real que mostraba el popup de la tabla. Al usar la misma
// función pura con el mismo `mundo`/`jugador` del momento, panel y tabla
// nunca pueden discrepar.
function bloqueHistorial(jugador, mundo, onVerRanking) {
  const totalPeleas = peleasTotales(jugador);
  const ranking = totalPeleas === 0 ? 'Sin clasificar' : `#${rankingDelJugador(mundo, jugador)}`;

  const ultimasTres = jugador.historial.slice(-3).reverse();

  return el('div', { class: 'panel', dataset: { accion: 'historial' } }, [
    el('div', { class: 'fila', style: 'align-items:center;gap:12px' }, [
      el('div', { style: 'text-align:center;flex:0 0 auto' }, [
        el('div', { style: 'font-size:22px;font-weight:800', text: recordTexto(jugador) }),
        el('div', { class: 'nombre etiqueta', text: 'Récord' }),
      ]),
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'fila', style: 'align-items:center;justify-content:space-between;gap:6px' }, [
          el('div', { class: 'etiqueta', text: 'Ranking' }),
          botonVerRanking(onVerRanking),
        ]),
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

// El cara a cara contra el archirrival: lo traía renderDashboard (v1,
// `recursos`, junto con Fama) y no tenía casa todavía en el tablero v2. La
// Fama se mudó a la cabecera del peleador (Cambio 3, "el módulo de fama ya
// no estaría independiente") — este panel quedó solo para el archirrival,
// que recién existe cuando hay al menos dos cruces con el mismo rival (ver
// elegirArchirrival, rivalry.js), así que puede no haber ninguno todavía:
// mismo criterio que "Sin cuerpo técnico" (entrenadorDe, más arriba) — un
// estado neutro con su propio texto, nunca un panel vacío sin nada adentro.
function bloqueRecursos(partida) {
  const archi = (partida.rivalidades ?? []).find((r) => r.esArchirrival);
  const datosArchi = archi ? partida.mundo.roster.find((p) => p.id === archi.rivalId) : null;

  if (!datosArchi) {
    return el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Archirrival' }),
      el('div', { class: 'medio', style: 'margin-top:6px', text: 'Todavía no tenés uno marcado.' }),
    ]);
  }

  return el('div', { class: 'panel' }, [
    el('div', { class: 'etiqueta rojo', text: `vs ${apodoParaMostrar(datosArchi)}` }),
    el('div', { style: 'font-weight:800;margin-top:6px', text: h2hTexto(archi) }),
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

// Columna izquierda del tablero: quién sos (personaje), tu rincón, y en qué
// categoría/puesto estás. A diferencia de la v1 (renderDashboard, que
// mezclaba esto con el botón "Continuar" y se redibujaba entero en cada
// beat), este panel vive en la región izquierda del shell y se repinta solo
// cuando cambian los datos del jugador: nunca desaparece mientras el jugador
// decide en el módulo central.
// Hace clickeable-por-teclado un panel que hoy solo escuchaba 'click' (el
// bloque de historial — la cabecera del peleador YA NO es clickeable desde
// Cambio 4: "clickear el personaje ya no abre la ficha, eso está obsoleto y
// se ve directamente en la pantalla principal"). Mismo criterio que
// .silueta-zona (silueta-rival.js): role=button + tabindex=0 + Enter/Espacio
// disparan lo mismo que el click. Sin esto, Tab saltaba directo de un botón
// real al siguiente y esta tarjeta —de las más usadas del tablero: abre el
// historial de peleas— quedaba invisible para quien navega solo con
// teclado.
function hacerActivable(nodo, etiquetaAria, onActivar) {
  nodo.setAttribute('role', 'button');
  nodo.setAttribute('tabindex', '0');
  nodo.setAttribute('aria-label', etiquetaAria);
  nodo.addEventListener('click', onActivar);
  nodo.addEventListener('keydown', (ev) => {
    // `historial` (bloqueHistorial) trae adentro un <button> real (ver
    // tabla de posiciones), que ya frena su propio click con
    // stopPropagation. Un keydown SIEMPRE burbujea (a diferencia del click
    // que ese botón ya frena), así que sin este chequeo, apretar Enter con
    // el foco en el botón de adentro también activaría esta tarjeta entera
    // por encima — el guard exige que la tecla haya sido apretada con el
    // foco puesto en la tarjeta misma, no en un hijo interactivo.
    if (ev.target !== nodo) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onActivar(); }
  });
  return nodo;
}

export function renderPanelPeleador(region, {
  partida, onHistorial = () => {}, onVerRanking = () => {},
}) {
  const { jugador, mundo } = partida;

  // Cambio 4: la cabecera (cuadroMedia) es un panel informativo más, sin
  // click ni atributos de accesibilidad de control interactivo — ya no abre
  // la ficha (esa pantalla quedó obsoleta: la misma info ya se ve directo en
  // el tablero).
  const cabecera = cuadroMedia(jugador);

  const historial = hacerActivable(
    bloqueHistorial(jugador, mundo, onVerRanking),
    'Ver historial de peleas',
    () => onHistorial(jugador),
  );

  mount(region, el('div', { class: 'stack panel-peleador' }, [
    cabecera,
    bloqueCinturones(jugador),
    bloqueRincon(jugador),
    bloqueEtapa(partida),
    historial,
  ]));
}

// Columna central, arriba del módulo de decisión: los 6-7 atributos de
// combate. Se repinta con el mismo ritmo que siempre tuvo la columna
// izquierda (una vez por transición del tablero, ver montarTablero en
// main.js) — nunca en cada micro-render de un mismo beat (un golpe de
// sparring, un frame del roll), así que el jugador nunca los pierde de vista
// mientras compara las opciones de la decisión actual.
export function renderPanelAtributos(region, { jugador }) {
  mount(region, bloqueAtributosSolo(jugador));
}

// Columna central: menton/disciplina/forma/moral, separados de los
// atributos de combate (mismo criterio que antes, cuando compartían un solo
// panel: nunca mezclados, porque solo los de combate llevan aporte de
// entrenador).
export function renderPanelEstado(region, { jugador, onCurar = () => {} }) {
  mount(region, bloqueEstadoSolo(jugador, onCurar));
}

// Columna derecha, junto al calendario: dinero y acceso a la tienda (mudados
// acá desde la columna izquierda por la reforma de grilla 3×3 — el mockup
// los agrupa con el calendario: "Calendario + Botón tienda, ahí dentro se ve
// el dinero").
export function renderPanelDinero(region, { jugador, onTienda = () => {} }) {
  const dinero = bloqueDinero(jugador);
  dinero.querySelector('[data-accion="tienda"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    onTienda();
  });
  mount(region, dinero);
}

// Columna derecha: el cara a cara con el archirrival, junto a la próxima
// pelea (mudado desde la columna izquierda — el mockup los agrupa: "'vs
// clásico rival' + Próxima pelea"). La Fama ya no vive acá: se mudó a la
// cabecera del peleador (Cambio 3).
export function renderPanelRecursos(region, { partida }) {
  mount(region, bloqueRecursos(partida));
}
