import { el, mount, fmtDelta } from '../dom.js';
import { icono } from '../icons.js';
import { ETIQUETAS } from '../../core/stats.js';
import {
  resultadoSparring, promedioReaccion, UMBRAL_RATIO_BIEN, UMBRAL_RATIO_PERFECTO, AGILIDAD_BONUS,
} from '../../core/sparring.js';

// Presupuesto total de la RONDA (Pedido v6: "quiero que el timer sea por
// todo el juego, no solo por cada golpe [...] no quiero que se reinicie").
// Antes (Task v4) cada pao encendido tenía su propio DURACION_MS de 1500ms
// que se reiniciaba con cada golpe; el usuario pidió lo contrario: UN solo
// reloj para todo el minijuego, que arranca con el primer "Empezar" y corre
// sin cortes hasta que se completan los OBJETIVOS_POR_DEFECTO golpes (ver
// core/sparring.js) o se acaba el tiempo.
//
// Por qué 7000ms es justo (balance verificado con una simulación de
// reacciones, no a ojo): con 10 golpes, 7000ms da 700ms de presupuesto
// promedio por golpe — EXACTO el umbral de "bien" (MS_BIEN, core/sparring.js)
// y con margen de sobra para "perfecto" (320ms×10 = 3200ms, o sea 3800ms de
// aire). Simulando reacciones con dispersión realista: un jugador "bueno"
// (~450ms de media) completa los 10 casi siempre y saca "bien" o mejor; uno
// "al límite" de MS_BIEN (~700ms de media) llega en el margen y el resultado
// queda partido entre "bien" y "flojo" — borderline, como corresponde a
// alguien justo en el límite; uno genuinamente lento (900ms+ de media) no
// llega a completarlos y sale "flojo". No hace falta ajustar el número.
export const DURACION_RONDA_MS = 7000;

// Rework visual v17 (pedido textual: "faltan animaciones cuando se clickea
// bien la luz, faltan animaciones cuando se clickea MAL la luz [...]
// duraciones cortas (100-200ms): esto se repite diez veces por sesión"):
// pegarle a un pao ya no avisa `onGolpe` en el mismo instante del click —
// primero se pinta el golpe/error SINCRÓNICAMENTE (clase CSS, ver theme.css)
// y recién tras esta pausa breve se avisa hacia afuera. Mismo patrón ya
// establecido en este proyecto para el golpe de gracia (ver
// crearBarraPrecision, ui/components/barra-precision.js) — ahí la pausa es
// más larga (300-420ms, "el momento grande de la pelea"); acá, bien más
// corta porque esto se repite 10 veces por sesión y tiene que sentirse ágil,
// no lento.
export const DURACION_FEEDBACK_MS = 150;

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// El reloj de ronda vive por CONTENEDOR, no por instancia de render: main.js
// vuelve a llamar a renderSparring en cada golpe (arma un árbol de nodos
// nuevo cada vez, mismo patrón que el resto de los paneles de acción), pero
// el `contenedor` que le pasa es el MISMO nodo durante toda la sesión del
// minijuego (solo cambia cuando arranca un beat nuevo — ver montarTablero en
// main.js, que recién ahí reconstruye `[data-bloque="contenido"]`). Un
// WeakMap deja que el reloj sobreviva a esos remounts sin tener que cambiar
// la firma de la función ni el llamador, y sin fugar memoria (se limpia solo
// si el contenedor deja de existir en cualquier otro lado).
//
// Rework v17: el mismo registro ahora también guarda `timerFeedback` (el
// setTimeout de la pausa de feedback de UN golpe en curso, ver
// DURACION_FEEDBACK_MS). Hace falta compartirlo acá (no una variable local
// del render en curso) por un caso límite real: si el reloj de RONDA se
// agota justo durante esa pausa breve, main.js repinta con
// `sparring.terminado=true` y hay que poder cortar el golpe que había
// quedado pendiente desde ESE render viejo — `limpiarRonda`, más abajo, ya
// se llama en ese caso (guard de terminado, al principio de la función) y
// ahora también apaga este timer, sin que haga falta guardar una referencia
// aparte por fuera del WeakMap.
const rondasPorContenedor = new WeakMap();

function limpiarRonda(contenedor) {
  const ronda = rondasPorContenedor.get(contenedor);
  if (ronda) {
    clearTimeout(ronda.timerId);
    if (ronda.timerFeedback) clearTimeout(ronda.timerFeedback);
  }
  rondasPorContenedor.delete(contenedor);
}

// El entrenador NO se repite acá. El mockup lo mostraba porque era una
// pantalla suelta; en el juego real el sparring vive dentro del tablero, y el
// tablero ya tiene el panel "Tu rincón" fijo en la columna izquierda con el
// mismo entrenador, la misma escuela y la misma frase, visible todo el
// tiempo. Repetirlo en el centro costaba ~85px de alto y hacía que la parte
// de abajo de la pantalla (la barra de reflejos, los tramos de recompensa y
// el botón) se saliera del hueco disponible.

// Mockup: "x7 COMBO", "0,24s REACCIÓN", "7/10 GOLPES" en fila. `racha`
// (combo) y `promedioReaccion` viven en core/sparring.js — acá solo formato:
// coma decimal (rioplatense) para la reacción, igual que el resto del juego.
function bloqueContadores(sparring) {
  const reaccionTexto = `${(promedioReaccion(sparring) / 1000).toFixed(2).replace('.', ',')}s`;
  return el('div', { class: 'fila' }, [
    el('div', { class: 'tile' }, [
      el('div', { class: 'valor dorado', text: `x${sparring.racha}` }),
      el('div', { class: 'nombre', text: 'Combo' }),
    ]),
    el('div', { class: 'tile' }, [
      el('div', { class: 'valor', text: reaccionTexto }),
      el('div', { class: 'nombre', text: 'Reacción' }),
    ]),
    el('div', { class: 'tile' }, [
      el('div', { class: 'valor', text: `${sparring.aciertos}/${sparring.objetivos}` }),
      el('div', { class: 'nombre', text: 'Golpes' }),
    ]),
  ]);
}

// Mockup: barra "Reflejos de la serie" que se llena de amarillo a verde, con
// una etiqueta a la derecha que marca qué tramo vas alcanzando. El relleno
// (ancho) es puramente aciertos/objetivos — "se va llenando a medida que se
// clickean correctamente las luces", literal; el NIVEL (color + etiqueta) lo
// decide `resultadoSparring` con el mismo criterio que va a usar al cerrar
// la sesión (ratio Y velocidad), llamado en caliente sobre el estado actual
// — no hace falta una función aparte: resultadoSparring no mira
// `terminado` en ningún lado, así que leerlo a mitad de sesión ya da la
// vista previa correcta. Dos marcas fijas (50%/90%) señalan dónde arrancan
// "bien"/"perfecto" — los mismos umbrales exportados por core/sparring.js,
// nunca copiados a mano.
const NIVEL_ETIQUETA = { flojo: 'Flojo', bien: 'Ajustado', perfecto: 'Afilado' };
const NIVEL_CHIP_CLASE = { flojo: 'negativo', bien: 'leve', perfecto: 'positivo' };

function bloqueReflejos(sparring, jugador) {
  const fraccion = sparring.objetivos === 0 ? 0 : sparring.aciertos / sparring.objetivos;
  const { nivel } = resultadoSparring(sparring, jugador);
  return el('div', {}, [
    el('div', { class: 'etiqueta', style: 'margin-bottom:6px', text: 'Reflejos de la serie' }),
    el('div', { class: 'fila', style: 'align-items:center;gap:8px' }, [
      el('div', { class: `sparring-reflejos-pista nivel-${nivel}` }, [
        el('div', { class: 'barra' }, [
          el('i', { style: `width:${Math.round(fraccion * 100)}%` }),
        ]),
        el('span', { class: 'sparring-reflejos-marca', style: `left:${UMBRAL_RATIO_BIEN * 100}%` }),
        el('span', { class: 'sparring-reflejos-marca', style: `left:${UMBRAL_RATIO_PERFECTO * 100}%` }),
      ]),
      el('span', {
        class: `tarjeta-efecto ${NIVEL_CHIP_CLASE[nivel]} sparring-reflejos-etiqueta`,
        'aria-live': 'polite',
        text: NIVEL_ETIQUETA[nivel],
      }),
    ]),
  ]);
}

// Mockup: tres cajas de recompensa en fila (PERFECTO/BIEN/FLOJO), con el
// tramo alcanzado resaltado — SIEMPRE presentes desde el primer render
// (antes de "Empezar" incluida), nunca solo al terminar: si aparecieran
// recién al final empujarían el botón de abajo, y "nada de la interfaz se
// mueve solo" es una regla general del proyecto.
const TRAMOS = [
  { id: 'perfecto', nombre: 'Perfecto', texto: `${fmtDelta(AGILIDAD_BONUS.perfecto)} ${ETIQUETAS.agilidad.corta}` },
  { id: 'bien', nombre: 'Bien', texto: `${fmtDelta(AGILIDAD_BONUS.bien)} ${ETIQUETAS.agilidad.corta}` },
  { id: 'flojo', nombre: 'Flojo', texto: 'Nada' },
];

function bloqueTramos(sparring, jugador) {
  const { nivel } = resultadoSparring(sparring, jugador);
  return el('div', { class: 'fila' }, TRAMOS.map((t) => {
    const alcanzado = t.id === nivel;
    return el('div', {
      class: `tile sparring-tramo${alcanzado ? ' alcanzado' : ''}`,
      'data-tramo': t.id,
    }, [
      el('div', { class: 'nombre', text: t.nombre }),
      el('div', { class: `valor${alcanzado ? ' dorado' : ''}`, text: t.texto }),
    ]);
  }));
}

export function renderSparring(contenedor, {
  sparring, jugador, onGolpe, onTiempoAgotado = () => {}, onTerminar,
  titulo = `Entrenamiento · ${jugador.gimnasio}`, bajada = 'Sparring de reflejos',
}) {
  let activo = null;
  let desde = 0;

  // La ronda ya terminó (a mano o porque se acabó el tiempo): no puede
  // quedar un reloj pendiente esperando golpes que ya no van a llegar (ni
  // una pausa de feedback de un golpe que quedó a mitad camino — ver el
  // comentario grande de `rondasPorContenedor`, más arriba).
  if (sparring.terminado) limpiarRonda(contenedor);

  const relleno = el('i', { style: 'width:100%' });
  const barraTiempo = el('div', { class: 'barra barra-sparring' }, [relleno]);

  // <button> (no <div>): antes no se podía llegar a un pao con el teclado
  // (sin tabindex/role, Tab lo saltaba entero). aria-label describe el
  // número — el color/animación de "activo" ya avisa cuál pegar, pero un
  // lector de pantalla no ve el resplandor dorado. El ícono de puño (v17,
  // pedido textual) va adentro como cualquier otro hijo — no cambia nada de
  // esto.
  const paos = Array.from({ length: 6 }, (_, i) => el('button', {
    type: 'button',
    class: 'pao', 'data-pao': String(i), 'aria-label': `Pao ${i + 1}`,
    onClick: () => golpear(i),
  }, [icono('puno', { tamano: 30 })]));

  // v17: pegarle a un pao ya NO avisa `onGolpe` en el mismo instante del
  // click (ver DURACION_FEEDBACK_MS más arriba). Lo que SÍ es sincrónico,
  // "se lee de inmediato" como pide el usuario: la clase de acierto/error
  // (theme.css) y apagar la luz activa (con `prender(null)`, que además
  // saca el "¡YA!" del pao que se estaba por golpear). El guard de
  // `activo === null` (ya existía) ahora también hace de "no proceses un
  // segundo click durante la pausa": `prender(null)` deja `activo` en null
  // apenas se procesa el primero.
  function golpear(i) {
    if (activo === null) return;
    const acerto = i === activo;
    const ms = Math.max(1, Date.now() - desde);
    const evento = { acerto, ms };

    paos[i].classList.add(acerto ? 'pao-acierto' : 'pao-error');
    prender(null);

    if (prefiereMovimientoReducido()) {
      resolverGolpe(evento);
      return;
    }

    // El registro de ronda ya existe siempre en este punto: `golpear` solo
    // puede llegar hasta acá si `activo !== null`, y `activo` solo se pone
    // en no-null desde `prender`, que `empezar` (más abajo) llama DESPUÉS
    // de crear el registro.
    const ronda = rondasPorContenedor.get(contenedor);
    const timerFeedback = setTimeout(() => {
      if (ronda) ronda.timerFeedback = null;
      resolverGolpe(evento);
    }, DURACION_FEEDBACK_MS);
    if (ronda) ronda.timerFeedback = timerFeedback;
  }

  function resolverGolpe(evento) {
    onGolpe(evento);
  }

  // "¡YA!" (mockup, v17): position:absolute en theme.css — nunca reserva
  // alto propio, así que prender/apagar la luz activa no mueve la grilla ni
  // corre el resto de la pantalla (regla general del proyecto: nada se
  // mueve solo). Se agrega/saca acá, junto con la clase `activo`, en vez de
  // decidirlo al armar los paos (en ese momento todavía no se sabe cuál va a
  // estar activo).
  function prender(indice) {
    activo = indice;
    paos.forEach((pao, i) => {
      const esActivo = i === indice;
      pao.classList.toggle('activo', esActivo);
      const badge = pao.querySelector('.pao-ya');
      if (esActivo && !badge) pao.appendChild(el('span', { class: 'pao-ya', text: '¡YA!' }));
      else if (!esActivo && badge) badge.remove();
    });
    if (indice !== null) desde = Date.now();
  }

  // Refleja en la barra CUÁNTO QUEDA del reloj de ronda — nunca cuánto queda
  // de este golpe puntual. Se llama en cada remount (cada golpe), así que el
  // ancho de arranque de la transición es la fracción real ya consumida (no
  // 100% de nuevo): la barra sigue vaciándose de forma continua a través de
  // los sucesivos remounts, en vez de saltar llena cada vez que le pegás a
  // un pao — eso es justamente lo que pedía "no quiero que se reinicie".
  function animarBarraTiempo() {
    const ronda = rondasPorContenedor.get(contenedor);
    const restante = ronda ? Math.max(0, ronda.fin - Date.now()) : 0;
    const fraccion = (restante / DURACION_RONDA_MS) * 100;
    relleno.style.transition = 'none';
    relleno.style.width = `${fraccion}%`;
    // Fuerza el reflow para que el navegador registre el ancho de arranque
    // ANTES de animar hacia 0 (mismo truco que ya usaba esta barra): sin
    // este paso el cambio se funde con el próximo estilo y nunca se ve
    // arrancar desde la fracción correcta.
    void relleno.offsetWidth;
    relleno.style.transition = `width ${restante}ms linear`;
    relleno.style.width = '0%';
  }

  function empezar() {
    // Solo la PRIMERA vez (todo el minijuego, no cada golpe) se crea el
    // reloj: si ya existe uno para este contenedor, esta sesión ya arrancó
    // en un remount anterior y hay que dejarlo correr tal cual, sin
    // reiniciarlo ni reprogramarlo.
    if (!rondasPorContenedor.has(contenedor)) {
      const timerId = setTimeout(() => {
        rondasPorContenedor.delete(contenedor);
        onTiempoAgotado();
      }, DURACION_RONDA_MS);
      rondasPorContenedor.set(contenedor, { fin: Date.now() + DURACION_RONDA_MS, timerId });
    }
    const posicion = sparring.secuencia[sparring.indice] ?? 0;
    prender(posicion);
    boton.remove();
    animarBarraTiempo();
  }

  const boton = sparring.terminado
    ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Continuar', onClick: onTerminar })
    : el('button', { class: 'boton', 'data-accion': 'empezar', text: 'Empezar', onClick: empezar });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('h1', { text: bajada }),
    bloqueContadores(sparring),
    sparring.terminado ? null : barraTiempo,
    el('div', { class: 'panel' }, [el('div', { class: 'grilla-paos' }, paos)]),
    bloqueReflejos(sparring, jugador),
    bloqueTramos(sparring, jugador),
    boton,
  ]));

  if (!sparring.terminado && sparring.indice > 0) empezar();

  // `detener()` corta el reloj de ronda pendiente (y cualquier pausa de
  // feedback de un golpe a mitad camino) SIN disparar onTiempoAgotado ni
  // onGolpe (mismo contrato que crearBarraPrecision/animarRoll): lo usa
  // quien monta este componente (main.js) si el jugador se va de la pantalla
  // a mitad de la sesión — nunca se deja un timer corriendo en segundo plano.
  return {
    detener() {
      limpiarRonda(contenedor);
    },
  };
}
