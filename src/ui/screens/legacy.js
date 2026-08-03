import { el, mount, fmtDinero } from '../dom.js';
import { bandera } from '../flags.js';
import { nombreConApodo, recordAmateurTexto } from '../../core/fighter.js';
import { fechaDe } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';

function tile(nombre, valor, clase = '') {
  return el('div', { class: 'tile' }, [
    el('div', { class: `valor ${clase}`, text: String(valor) }),
    el('div', { class: 'nombre', text: nombre }),
  ]);
}

// Fila de una defensa/conquista dentro del panel de títulos: fecha en chip
// + texto. Si la fecha no está disponible (historial viejo, guardado antes
// de este cambio) se omite el chip en vez de mostrar algo inventado. El color
// va como segunda clase ("chip dorado"/"chip rojo"), igual que en
// fight.js/panel-peleador.js: ya no hace falta el color inline que tenía esta
// pantalla, porque el bug de especificidad de .chip en theme.css (cierre de
// ronda v3) se arregló de raíz para toda la app.
function filaFecha(fecha, texto, clase = '') {
  return el('div', { class: 'etiqueta', style: 'margin-top:2px' }, [
    fecha ? el('span', { class: `chip ${clase}`.trim(), style: 'margin-right:6px', text: fecha }) : null,
    texto,
  ]);
}

// Un cinturón, con TODOS sus reinados adentro (v17.10, reportado con captura:
// "fijate cómo aparece dos veces el cinturón mundial, ¿no debería estar
// agrupado?"). Antes cada reinado era su propio bloque con el título repetido
// arriba, así que una reconquista se leía como dos cinturones distintos.
//
// Cuando hay más de un reinado se numeran ("1er reinado", "2do reinado"): sin
// eso, dos listas de fechas pegadas una debajo de la otra no dicen dónde
// termina una y empieza la siguiente. Con uno solo no se numera nada — poner
// "1er reinado" en el 90% de los casos sería ruido.
function bloqueReinado(reinado, indice, total) {
  return el('div', { style: total > 1 ? 'margin-top:6px' : null }, [
    total > 1
      ? el('div', { class: 'etiqueta', style: 'margin-bottom:2px', text: `${indice + 1}º reinado` })
      : null,
    filaFecha(reinado.fechaGanado, 'Conquistado', 'dorado'),
    ...reinado.defensas.map((d) => filaFecha(d.fecha, `Defendido ante ${d.rivalNombre}`)),
    reinado.fechaPerdido ? filaFecha(reinado.fechaPerdido, 'Perdido', 'rojo') : null,
  ]);
}

function bloqueTitulo(t) {
  const reinados = t.reinados ?? [];
  return el('div', { style: 'margin-top:10px', dataset: { cinturon: t.nombre } }, [
    el('div', { style: 'font-weight:800' }, [
      el('span', { text: `🏆 ${t.nombre}` }),
      reinados.length > 1
        ? el('span', { class: 'etiqueta dorado', style: 'margin-left:8px', text: `${reinados.length} reinados` })
        : null,
    ]),
    ...reinados.map((r, i) => bloqueReinado(r, i, reinados.length)),
  ]);
}

// Export para inspección visual del panel de títulos por separado (no lo usa
// el juego): renderLegado necesita un legado completo, y para mirar cómo
// quedan los reinados agrupados alcanza con este bloque.
export function panelTitulosParaPrueba(titulosDetalle) {
  return panelTitulos(titulosDetalle);
}

function panelTitulos(titulosDetalle) {
  if (titulosDetalle.length === 0) {
    return el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Títulos' }),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: 'Nunca se colgó un cinturón.' }),
    ]);
  }
  return el('div', { class: 'panel', 'data-bloque': 'titulos' }, [
    el('div', { class: 'etiqueta dorado', text: 'Títulos' }),
    ...titulosDetalle.map(bloqueTitulo),
  ]);
}

// Estadísticas de carrera, integradas de punta a punta en la pantalla de
// legado (Task v3, pedido textual: "las estadísticas también deben estar
// acá, no al clickear en el botón 'Ver estadísticas'"). Antes vivían en una
// pantalla aparte (ui/screens/stats.js, ya eliminada) detrás de un botón.
function bloqueEstadisticas(e) {
  return el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Los números de la carrera' }),
    // Pedido 3 (v7, "mostrá la 'racha de victorias' más larga... y la
    // 'racha de derrotas' también, porque son de los números que un
    // boxeador recuerda"): fila propia de solo dos tiles (más peso visual
    // que compartir fila con otros cuatro), arriba de todo el bloque de
    // estadísticas.
    el('div', { class: 'fila' }, [
      tile('Racha de victorias', e.rachaMasLarga, 'verde'),
      tile('Racha de derrotas', e.rachaDerrotasMasLarga, 'rojo'),
    ]),
    el('div', { class: 'fila' }, [
      tile('Peleas', e.peleas),
      tile('Ganadas', e.victorias, 'verde'),
      tile('Perdidas', e.derrotas, 'rojo'),
      tile('Empates', e.empates),
    ]),
    el('div', { class: 'fila' }, [
      tile('% KO', `${e.porcentajeKO}%`, 'dorado'),
      tile('Rounds', e.roundsPeleados),
      tile('Prom. rounds', e.promedioRoundPorPelea),
    ]),
    el('div', { class: 'fila' }, [
      tile('🏆 Títulos', e.titulosGanados, 'dorado'),
      tile('Defensas', e.defensasExitosas),
      tile('Mejor bolsa', fmtDinero(e.bolsaMayor), 'verde'),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Carrera' }),
      el('div', { text: `Debutaste a los ${e.edadDebut} y colgaste los guantes a los ${e.edadRetiro}.` }),
      e.rivalMasDuro
        ? el('div', { class: 'medio', style: 'margin-top:6px', text: `El rival más duro que enfrentaste: ${nombreConApodo(e.rivalMasDuro)} (media ${e.rivalMasDuro.media}).` })
        : null,
    ]),
  ]);
}

const METODOS = { ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Decisión', descalificacion: 'DQ' };

// Task 6.2 ("el cierre le hace justicia a cada carrera"): chip con el nivel
// más alto de título que ALGUNA VEZ se conquistó (`legado.nivelMaximo`, ver
// core/legacy.js) — así un campeón nacional que después perdió el cinturón
// sigue viéndose en pantalla como lo que fue, no como alguien sin nada. Sin
// título ninguno, no hay chip: el panel de Títulos ya dice "Nunca se colgó
// un cinturón" más abajo, no hace falta repetirlo acá arriba en negativo.
const ETIQUETA_NIVEL_MAXIMO = {
  mundial: 'Campeón del mundo',
  nacional: 'Campeón nacional',
  regional: 'Campeón regional',
};

function chipNivelMaximo(nivelMaximo) {
  const etiqueta = ETIQUETA_NIVEL_MAXIMO[nivelMaximo];
  if (!etiqueta) return null;
  return el('div', { class: 'chip dorado', style: 'width:fit-content', text: etiqueta });
}

// Pedido 2 (v7, "el amateur tenga su propio historial de verdad —las
// peleas, no solo el récord— y que se vea en la pantalla final, junto al
// profesional pero claramente separado"): mismo lenguaje visual que el
// historial de la ficha (renderFicha, profile.js) — rival, método/round,
// resultado coloreado — pero en su PROPIO panel (`data-bloque`
// distinto), nunca mezclado con `panelTitulos`/`bloqueEstadisticas` de
// arriba, que hablan solo de lo profesional.
// Pedido 1 (v14, "falta agregar, en el historial de peleas, el mes y año"):
// mismo helper y mismo criterio que profile.js (omitir si no hay `fecha`,
// nunca mostrar "undefined"/"NaN" — peleas amateur viejas también pueden
// carecer de este campo).
function mesAnioDe(pelea) {
  if (pelea.fecha == null) return null;
  const fecha = fechaDe(pelea.fecha, ANIO_INICIAL);
  return `${fecha.nombreMes.slice(0, 3)} ${fecha.anio}`;
}

function filaPeleaAmateur(p, i) {
  return el('div', {
    class: 'panel', style: 'display:flex;justify-content:space-between;gap:8px',
  }, [
    el('div', {}, [
      el('div', { style: 'font-weight:800', text: `${i + 1}. ${p.rivalNombre}` }),
      el('div', {
        class: 'etiqueta',
        text: [mesAnioDe(p), `${METODOS[p.metodo] ?? p.metodo} · round ${p.round}`].filter(Boolean).join(' · '),
      }),
    ]),
    el('div', {
      class: p.resultado === 'v' ? 'verde' : p.resultado === 'd' ? 'rojo' : 'sutil',
      style: 'font-weight:800',
      text: p.resultado === 'v' ? 'Ganó' : p.resultado === 'd' ? 'Perdió' : 'Empate',
    }),
  ]);
}

// Sin peleas amateur (guardado de antes de que existiera `historialAmateur`,
// o un debut directo en tests) no hay bloque: nunca un panel vacío con solo
// el título.
function panelHistorialAmateur(jugador) {
  const historial = jugador.historialAmateur ?? [];
  if (historial.length === 0) return null;
  return el('div', { class: 'panel', 'data-bloque': 'historial-amateur' }, [
    el('div', { class: 'etiqueta', text: `Historial amateur · ${recordAmateurTexto(jugador)}` }),
    el('div', { class: 'etiqueta', style: 'margin-top:2px', text: 'No cuenta para el ranking ni para el récord profesional.' }),
    el('div', { class: 'stack', style: 'margin-top:8px' }, historial.map(filaPeleaAmateur)),
  ]);
}

export function renderLegado(contenedor, {
  legado, estadisticas, jugador, onNuevaCarrera,
}) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Fin de la carrera' }),
    el('h1', { style: 'display:flex;align-items:center;gap:7px' }, [
      bandera(jugador.nacionalidad, { ancho: 20 }),
      nombreConApodo(jugador).toUpperCase(),
    ]),
    chipNivelMaximo(legado.nivelMaximo),
    el('div', { class: 'panel' }, [
      el('div', { class: 'fila' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: legado.record }),
          el('div', { class: 'nombre', text: 'Récord' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor dorado', text: String(legado.titulos.length) }),
          el('div', { class: 'nombre', text: 'Títulos' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: String(legado.defensas) }),
          el('div', { class: 'nombre', text: 'Defensas' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor verde', text: fmtDinero(legado.dineroTotal) }),
          el('div', { class: 'nombre', text: 'Ganado' }),
        ]),
      ]),
    ]),
    panelTitulos(legado.titulosDetalle),
    bloqueEstadisticas(estadisticas),
    panelHistorialAmateur(jugador),
    legado.archirrival ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: 'Archirrival' }),
      el('div', { style: 'font-weight:800', text: nombreConApodo(legado.archirrival) }),
      el('div', { class: 'etiqueta', text: `Cara a cara: ${legado.archirrival.h2h}` }),
    ]) : null,
    legado.momentos.length > 0 ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Momentos memorables' }),
      el('div', { class: 'log' }, legado.momentos.map((m) => el('p', { text: m }))),
    ]) : null,
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Cierre de carrera' }),
      el('p', { text: legado.biografia }),
    ]),
    el('button', { class: 'boton', 'data-accion': 'nueva', text: 'Nueva carrera', onClick: onNuevaCarrera }),
  ]));
}
