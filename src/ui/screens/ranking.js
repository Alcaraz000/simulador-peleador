import { el } from '../dom.js';
import { bandera } from '../flags.js';
import { abrirPopup } from '../components/popup.js';
import { nombreConApodo } from '../../core/fighter.js';

// Tabla de posiciones como popup (Task v3, feedback textual del usuario:
// "ranking aparece, pero no puedo ver quiénes están por encima o por debajo
// de mí"). `filas` ya viene armada por `tablaRanking` (core/world.js): el
// roster activo con el jugador insertado en su puesto real, coherente con
// los rivales que ofrece `buscarRival` — mismos nombres, misma media, mismo
// récord.
//
// Bug reportado (v4): "no sé cómo, pero en el ranking ahora solo muestra 3
// peleadores" (con el roster completo de 12 + el jugador). La lista SIEMPRE
// tenía las filas completas en el DOM (tablaRanking nunca truncó nada) — lo
// que faltaba era un contenedor de scroll propio para la lista, acotado y
// separado de la cabecera del popup (mismo patrón que panel-noticias.js):
// dejar que el popup entero (cabecera + lista) fuera el único scroll,
// gigante y sin tope visible salvo el borde de la ventana, no daba ninguna
// pista de que había más filas debajo. Ahora la lista tiene su propio
// `max-height` con `overflow-y:auto` (`.tabla-ranking-lista`, theme.css), y
// al abrir se hace scroll automático hasta la fila del jugador para que
// quede visible sin que haya que buscarla.
//
// v6 (rediseño integral, pedido textual: "el popup de ranking desperdicia
// espacio... que sea una lista compacta: NÚMERO | BANDERA | NOMBRE |
// HISTORIAL. La media NO va"): con el roster de 100 peleadores cada fila se
// repite cien veces, así que un dato de más (MEDIA, que ya no aporta nada
// que el puesto no diga) se paga cien veces en alto de scroll. La fila baja
// a una sola línea de verdad (antes tenía nombre arriba + "MEDIA · récord"
// abajo): puesto, bandera, nombre y récord comparten la misma fila.
// v17.8: cada fila puede llevar la marca de campeon. No siempre es el #1 - se
// puede tener el cinturon puesto y haber bajado en la tabla, y ver eso es
// media gracia del asunto: el que te tiene que dar la revancha no es el mejor
// rankeado, es el que lo tiene.
// v18: el campeón ya no lleva número (va en su propio renglón, ver
// `filaCampeon`), así que el hueco del puesto se rellena con la palabra que
// ocupa su lugar — "campeon" — en vez de un "#null".
function filaRanking(fila) {
  return el('div', {
    class: `tabla-ranking-fila${fila.esJugador ? ' tabla-ranking-fila-jugador' : ''}${fila.esCampeon ? ' tabla-ranking-fila-campeon' : ''}`,
    dataset: { peleador: fila.id, campeon: fila.esCampeon ? 'si' : null },
  }, [
    el('span', {
      class: 'tabla-ranking-puesto',
      text: fila.ranking === null || fila.ranking === undefined ? 'CAMP' : `#${fila.ranking}`,
    }),
    bandera(fila.nacionalidad, { ancho: 20 }),
    el('span', { class: 'tabla-ranking-nombre', text: nombreConApodo(fila) }),
    fila.esCampeon ? el('span', { class: 'tabla-ranking-cinturon', text: 'campeon' }) : null,
    el('span', { class: 'tabla-ranking-record etiqueta', text: fila.record }),
  ]);
}

// Las cuatro divisiones, con el nombre que ve el jugador y una linea que
// explica QUE es cada una - sin eso, "regional" y "nacional" se leen como dos
// palabras para lo mismo.
const DIVISIONES_VISIBLES = [
  { id: 'amateur', nombre: 'Amateur', bajada: 'El circuito de formacion. Nada de esto cuenta como profesional.' },
  { id: 'regional', nombre: 'Regional', bajada: 'La escalera de entrada de tu pais: los que todavia no llegaron a la elite nacional.' },
  { id: 'nacional', nombre: 'Nacional', bajada: 'La elite de tu pais.' },
  { id: 'mundial', nombre: 'Mundial', bajada: 'Los mejores del mundo, sin importar de donde vengan.' },
];

/**
 * Cuatro rankings independientes en un solo popup, uno por pestana.
 *
 * `tablas` viene de `tablasDeDivisiones` (core/world.js): cada division es su
 * propia lista numerada desde 1. Se abre en la division donde el jugador esta
 * parado hoy, que es la que le importa - si todavia no entro a ninguna, en la
 * primera con gente.
 *
 * `campeones` (v18) trae, por division, la fila del que tiene el cinturon
 * puesto: va en un renglon propio ARRIBA de la numeracion y no ocupa un puesto,
 * como en las tablas de verdad. Puede no estar en la lista de abajo (si se cayo
 * del cupo) y eso esta bien: sigue siendo el campeon.
 *
 * @param {{ tablas: object, campeones?: object, division?: string, onCerrar?: () => void }} props
 * @returns el handle de abrirPopup (mismo contrato que renderTienda).
 */
export function renderRanking({
  tablas = {}, campeones = {}, division = null, onCerrar = () => {},
} = {}) {
  // Una division se muestra si tiene retadores O un campeon: un cinturon con
  // dueno y la tabla todavia vacia sigue siendo algo que mostrar.
  const disponibles = DIVISIONES_VISIBLES.filter(
    (d) => (tablas[d.id] ?? []).length > 0 || campeones[d.id],
  );
  const tieneAlJugador = (id) => (tablas[id] ?? []).some((f) => f.esJugador)
    || Boolean(campeones[id]?.esJugador);
  // Abre en la división MÁS ALTA donde esté el jugador, no en la primera que
  // lo tenga: un profesional que además figura en el ranking amateur (porque
  // peleó ahí de pibe) quiere ver el mundial, no el circuito del que ya se
  // fue. De ahí el recorrido al revés.
  const inicial = disponibles.find((d) => d.id === division)
    ?? [...disponibles].reverse().find((d) => tieneAlJugador(d.id))
    ?? disponibles[0]
    ?? null;

  const lista = el('div', { class: 'stack tabla-ranking-lista' });
  const bajada = el('p', { class: 'medio tabla-ranking-bajada' });
  const pestanas = el('div', { class: 'tabla-ranking-pestanas' });
  // El renglon del campeon vive FUERA del contenedor con scroll: la lista de
  // retadores se scrollea debajo suyo y el que tiene el cinturon queda siempre
  // a la vista, que es la mitad de la gracia de sacarlo de la numeracion.
  const renglonCampeon = el('div', { class: 'tabla-ranking-campeon-renglon' });

  function pintar(def) {
    const campeon = campeones[def.id] ?? null;
    renglonCampeon.replaceChildren(...(campeon
      ? [
        el('span', { class: 'tabla-ranking-campeon-titulo etiqueta', text: 'Campeon' }),
        filaRanking(campeon),
      ]
      : []));
    const filas = tablas[def.id] ?? [];
    lista.replaceChildren(...(filas.length > 0
      ? filas.map(filaRanking)
      : [el('p', { class: 'medio', text: 'Todavia no hay ranking para mostrar.' })]));
    bajada.textContent = def.bajada;
    for (const boton of pestanas.children) {
      const activa = boton.dataset.division === def.id;
      boton.classList.toggle('activa', activa);
      boton.setAttribute('aria-selected', activa ? 'true' : 'false');
    }
    // Deja al jugador visible de entrada, sin que tenga que scrollear para
    // encontrarse (pedido viejo: "si esta en el puesto 9, que se vea sin
    // tener que buscarlo"). Sin `smooth`: es la posicion inicial de la
    // pestana recien pintada, no algo que se mueve solo mientras la mira.
    const filaJugador = lista.querySelector('.tabla-ranking-fila-jugador');
    if (filaJugador) filaJugador.scrollIntoView({ block: 'center' });
  }

  for (const def of disponibles) {
    pestanas.appendChild(el('button', {
      class: 'tabla-ranking-pestana',
      type: 'button',
      role: 'tab',
      dataset: { division: def.id },
      text: def.nombre,
      onClick: () => pintar(def),
    }));
  }

  const contenido = el('div', { class: 'tabla-ranking' }, [pestanas, bajada, renglonCampeon, lista]);
  const popup = abrirPopup({ titulo: 'Rankings', contenido, onCerrar });
  if (inicial) pintar(inicial);
  return popup;
}
