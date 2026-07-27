import { createRng } from './core/rng.js';
import {
  crearPartida, siguienteBeat, firmarPelea, cancelarProximaPelea, etapaActual,
} from './core/career.js';
import { tablaRanking, rankingDelJugador } from './core/world.js';
import { hitosDePelea, hitoDeEtapa, noticiaDeHitoJugador } from './core/hitos.js';
import { generarNoticia, agregarNoticias } from './core/news.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
import { aplicarCarta, formatearMods, porcentajesDe } from './core/cards.js';
import { resolverOpcion } from './core/events.js';
import { aplicarResultado, rechazarOferta } from './core/offers.js';
import { crearNegociacion, jugarMovida, resultadoNegociacion } from './core/negotiation.js';
import { crearCareo, responderCareo, resultadoCareo } from './core/presser.js';
import { registrarGolpe, resultadoSparring, terminarPorTiempo } from './core/sparring.js';
import { registrarCruce, elegirArchirrival, subirHeat } from './core/rivalry.js';
import { comprar } from './core/money.js';
import { tirarLesion, aplicarLesion, curarConDinero } from './core/injuries.js';
import { calcularLegado } from './core/legacy.js';
import { guardar, cargar, borrar } from './core/save.js';
import { clamp } from './core/stats.js';
import { estadisticasDeCarrera } from './core/stats-carrera.js';
import { el, fmtDinero } from './ui/dom.js';

import { renderLogin } from './ui/screens/login.js';
import { renderCreacion } from './ui/screens/create.js';
import { renderTienda } from './ui/screens/shop.js';
import { renderCareo } from './ui/screens/presser.js';
import { renderSparring } from './ui/screens/sparring.js';
import { renderNegociacion } from './ui/screens/negotiation.js';
import { renderOferta, renderPlan, renderPelea } from './ui/screens/fight.js';
import { renderFicha } from './ui/screens/profile.js';
import { renderLegado } from './ui/screens/legacy.js';
import { mostrarHito } from './ui/screens/hitos.js';

import { crearShell } from './ui/shell.js';
import {
  renderPanelPeleador, renderPanelAtributos, renderPanelEstado, renderPanelDinero, renderPanelRecursos,
} from './ui/screens/panel-peleador.js';
import { renderPanelProxima } from './ui/screens/panel-proxima.js';
import { renderPanelNoticias } from './ui/screens/panel-noticias.js';
import { renderPanelDecision, renderDesenlace } from './ui/screens/panel-decision.js';
import { renderPanelAvance } from './ui/screens/panel-avance.js';
import { renderCalendario } from './ui/screens/panel-calendario.js';
import { renderRanking } from './ui/screens/ranking.js';
import { animarRoll } from './ui/components/roll.js';
import { animarAtributos, destacarAtributos } from './ui/components/animar-numero.js';
import { animarDado } from './ui/components/dado.js';
import { icono } from './ui/icons.js';

export const VERSION = '0.1.0';

// --- Mapeo de datos del núcleo -> props de tarjeta (capa fina de UI) ------
// La fatiga es el ejemplo de "malo pero leve" del sistema de tarjetas: subirla
// no es tan grave como para pintarla en rojo, pero bajarla sigue siendo bueno.
function signoDeMod(clave, valor) {
  if (valor === 0) return 'leve';
  if (clave === 'fatiga') return valor > 0 ? 'leve' : 'positivo';
  return valor > 0 ? 'positivo' : 'negativo';
}

function efectosDeMods(mods = {}) {
  return Object.entries(mods).map(([clave, valor]) => ({
    texto: formatearMods({ [clave]: valor })[0],
    signo: signoDeMod(clave, valor),
  }));
}

// Para una rama de azar (varios mods juntos bajo un mismo porcentaje), el
// signo de la píldora se decide por el balance neto, no atributo por
// atributo (la fatiga cuenta invertida: menos fatiga suma). `caePelea`
// (Task v3, "cartas nuevas con azar") siempre pesa negativo, aunque la rama
// también traiga algún mod positivo suelto: perder la pelea que tenías en
// danza es la consecuencia grave, no un detalle menor.
function signoDeRama(mods, { caePelea = false } = {}) {
  if (caePelea) return 'negativo';
  const neto = Object.entries(mods).reduce(
    (acc, [clave, valor]) => acc + (clave === 'fatiga' ? -valor : valor), 0,
  );
  if (neto > 0) return 'positivo';
  if (neto < 0) return 'negativo';
  return 'leve';
}

function fmtDineroSigno(n) {
  return `${n > 0 ? '+' : '-'}US$ ${Math.abs(n).toLocaleString('es-AR')}`;
}

// Texto completo de una rama de `probabilidades`: los mods (como siempre) más,
// si esa rama en particular los declara (Task v3, "cartas nuevas con azar"),
// su propio dinero/fama y el aviso "Se cae la pelea" — todo en la MISMA
// píldora (que ya lleva el % adelante, puesto por `labelEfecto` en card.js),
// para que el jugador vea de un vistazo qué arriesga en esa rama puntual.
function textoDeRama(opcion, rama) {
  const partes = [];
  const modsTexto = formatearMods({ ...(opcion.mods ?? {}), ...rama.mods }).join(' ');
  if (modsTexto) partes.push(modsTexto);
  if (typeof rama.efectos?.dinero === 'number' && rama.efectos.dinero !== 0) {
    partes.push(fmtDineroSigno(rama.efectos.dinero));
  }
  if (typeof rama.efectos?.fama === 'number' && rama.efectos.fama !== 0) {
    partes.push(`${rama.efectos.fama > 0 ? '+' : ''}${rama.efectos.fama} Fama`);
  }
  if (rama.caePelea) partes.push('Se cae la pelea');
  return partes.join(' · ');
}

// Arma los `efectos` (píldoras) de una opción de evento/redes: si tiene
// `probabilidades`, una píldora por rama con su porcentaje (via
// porcentajesDe, Task 3.1); si no, una píldora por mod fijo más las de
// dinero/fama declaradas aparte en `efectos`.
function efectosDeOpcion(opcion) {
  const porcentajes = porcentajesDe(opcion);
  if (porcentajes.length > 0) {
    return opcion.probabilidades.map((rama, i) => ({
      texto: textoDeRama(opcion, rama),
      signo: signoDeRama({ ...(opcion.mods ?? {}), ...rama.mods }, { caePelea: rama.caePelea }),
      probabilidad: porcentajes[i],
    }));
  }

  const efectos = efectosDeMods(opcion.mods ?? {});
  if (typeof opcion.efectos?.dinero === 'number' && opcion.efectos.dinero !== 0) {
    efectos.push({ texto: fmtDineroSigno(opcion.efectos.dinero), signo: opcion.efectos.dinero > 0 ? 'positivo' : 'negativo' });
  }
  if (typeof opcion.efectos?.fama === 'number' && opcion.efectos.fama !== 0) {
    efectos.push({
      texto: `${opcion.efectos.fama > 0 ? '+' : ''}${opcion.efectos.fama} Fama`,
      signo: opcion.efectos.fama > 0 ? 'positivo' : 'negativo',
    });
  }
  return efectos;
}

function cartaMejoraAOpcion(carta) {
  return {
    id: carta.id, titulo: carta.titulo, descripcion: carta.texto, rareza: carta.rareza,
    efectos: efectosDeMods(carta.mods), icono: icono('pesa'),
  };
}

// Pedido del coordinador (v4): repartirMejoras (cards.js) a veces reparte 2
// cartas en vez de 3 — el texto tiene que reflejar cuántas salieron de
// verdad, nunca decir "tres" fijo cuando son dos (o cuatro/cinco, con el
// bonus del entrenador o de etapa temprana encima).
const NUMEROS_EN_TEXTO = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'];

function textoCantidadMejoras(cantidad) {
  const palabra = NUMEROS_EN_TEXTO[cantidad] ?? String(cantidad);
  const sustantivo = cantidad === 1 ? 'mejora' : 'mejoras';
  return `El dado trajo ${palabra} ${sustantivo}. Elegí una.`;
}

function opcionCartaAOpcion(opcion, nombreIcono) {
  return {
    id: opcion.id, titulo: opcion.texto, efectos: efectosDeOpcion(opcion), icono: icono(nombreIcono),
  };
}

export function iniciar(contenedor = document.getElementById('app'), storage = undefined) {
  let partida = cargar(storage);
  let rng = createRng(partida ? partida.semilla + 7777 : Date.now());

  const persistir = () => { if (partida) guardar(partida, storage); };

  // --- El tablero persistente (Task 6.1) -----------------------------------
  // Antes, cada beat armaba su PROPIO shell (crearOrquestadorTablero se
  // llamaba una vez por beat) y "entre beats" el juego volvía a
  // renderDashboard (v1, pantalla completa): dos pantallas principales
  // alternándose. Ahora hay UN solo shell para toda la sesión de carrera:
  // `shellActual` se crea una vez y se reutiliza mientras siga montado; solo
  // se reconstruye si algo de afuera reemplazó `contenedor` entero (ficha, o
  // la pelea y su previa de oferta/negociación/careo/plan, que siguen siendo
  // pantallas completas por decisión de diseño). `pintarCentro` recuerda
  // SIEMPRE qué hay que pintar en el centro ahora mismo (la ficha ociosa, una
  // decisión, el minijuego, o un desenlace), para poder reconstruir todo tal
  // cual estaba si el jugador se va a una pantalla completa y vuelve.
  let shellActual = null;
  let pintarCentro = () => {};

  // --- El roll de una carta con azar no le puede robar la pantalla --------
  // (Hallazgo 1 de la revisión final): dopaje/chantaje/entrenador disparan un
  // roll con suspenso (animarRoll, 1.2-1.8s) cuyo timer, sin esto, sigue
  // corriendo aunque el jugador se vaya a la Ficha — una pantalla completa
  // que reemplaza `contenedor`. Si el timer termina ahí, `aplicarEfectoYSeguir`
  // llama a `asegurarShell()`, que ve que el shell ya no está DENTRO de
  // `contenedor` y lo reconstruye con `mount()`: la Ficha desaparece sin que
  // el jugador tocara "Cerrar".
  //
  // `cancelarRollPendiente` guarda, mientras un roll (o su pausa de lectura
  // posterior — ver `beatCarta`) está en curso, la función que hay que
  // llamar SI el jugador abandona el tablero antes de que termine (mismo
  // patrón que `raiz._limpiarAccion` en ui/screens/fight.js: quien puede
  // interrumpir el timer es quien lo conoce). La decisión de diseño de QUÉ
  // pasa con la carta pendiente: el roll es puramente cosmético —
  // `resolverOpcion` ya consumió el rng y decidió el resultado de forma
  // síncrona ANTES de que `animarRoll` arranque a animar (ver beatCarta). O
  // sea que "el roll ya se resolvió internamente" es SIEMPRE cierto en el
  // momento en que esto se puede llegar a cancelar: no hay ningún caso real
  // de "todavía no se resolvió, dejalo elegir de nuevo". Cancelar entonces
  // significa parar el timer que esté corriendo y aplicar YA el efecto
  // (`aplicar()`, que deja el tablero en el estado ocioso) — se pinta en el
  // MISMO tick, mientras `contenedor` todavía tiene puesto el tablero (recién
  // después de esto `abrirFicha` lo reemplaza con la Ficha), así que no hay
  // ninguna sorpresa: nada cambia en pantalla una vez que el jugador ya está
  // mirando la Ficha.
  let cancelarRollPendiente = null;

  function abandonarRollPendiente() {
    if (cancelarRollPendiente) cancelarRollPendiente();
  }

  // Mismo problema, mismo remedio, para el dado que se tira al tocar
  // "Continuar" (Task v3): es cosmético y corto (600-900ms), pero si el
  // jugador se va a la Ficha en pleno giro, el timer sigue corriendo en
  // segundo plano igual que el del roll — sin cancelarlo, `siguiente()`
  // terminaría disparando DESPUÉS de que la Ficha reemplazó `contenedor`,
  // con el mismo riesgo de `asegurarShell()` reconstruyendo el tablero
  // debajo suyo.
  let cancelarDadoPendiente = null;

  function abandonarDadoPendiente() {
    if (cancelarDadoPendiente) cancelarDadoPendiente();
  }

  // Misma familia de problema una vez más, ahora para la entrada escalonada
  // de noticias nuevas (Task v3, feedback del usuario: "que se vayan
  // sumando"): panel-noticias.js deja timers cortos (250-400ms entre una y
  // la siguiente) corriendo mientras revela cada noticia. `noticiasVistas`
  // vive ACÁ (no en el panel) porque tiene que sobrevivir a través de TODA la
  // sesión de carrera, no solo un render: el tablero se remonta en cada beat
  // (montarTablero), así que sin este Set persistente la misma tanda
  // reanimaría su entrada en cada repintado mientras siga marcada "nueva".
  let cancelarNoticiasPendiente = null;
  const noticiasVistas = new Set();

  function abandonarNoticiasPendientes() {
    if (cancelarNoticiasPendiente) cancelarNoticiasPendiente();
  }

  // Misma familia de problema, ahora para el timer del sparring (Task v4,
  // bug reportado: "falta el timer con la barra decreciendo"): cada pao
  // encendido programa un `setTimeout` (renderSparring, ui/screens/
  // sparring.js) que cuenta como error automático si no le pegás a tiempo.
  // Si el jugador se va a la Ficha con un pao prendido, ese timer sigue
  // corriendo en segundo plano — sin cancelarlo, dispararía `onGolpe` (y de
  // ahí `pintarSparring`, que pinta sobre `centroContenido()`) mientras la
  // Ficha ya reemplazó `contenedor`, con el mismo riesgo que el roll/dado:
  // `asegurarShell()` reconstruyendo el tablero debajo de la Ficha.
  let cancelarSparringPendiente = null;

  function abandonarSparringPendiente() {
    if (cancelarSparringPendiente) cancelarSparringPendiente();
  }

  function asegurarShell() {
    if (shellActual && contenedor.contains(shellActual.regiones.centro)) return shellActual;
    shellActual = crearShell(contenedor);
    return shellActual;
  }

  // Arma los props de la columna izquierda del shell. La ficha que se abre
  // desde acá siempre vuelve al MISMO tablero (volverAlTablero): ya no hace
  // falta que cada llamador decida "adónde volver" a mano. Cambio 4: la
  // cabecera del peleador ya no dispara `onFicha` (esa interacción quedó
  // obsoleta) — `abrirFicha` sigue viva porque `onHistorial` (acá) y
  // `onVerRival` (renderPanelProxima, más abajo) todavía la usan.
  function propsPanelIzquierda() {
    return {
      partida,
      onHistorial: (jugador) => abrirFicha(jugador, 'historial'),
      onVerRanking: () => abrirRanking(),
    };
  }

  // Dinero + tienda viven en la columna derecha (grilla 3×3, v4: mudados
  // desde la izquierda — mockup "Calendario + Botón tienda, ahí adentro se ve
  // el dinero"). `refrescarDinero` es el equivalente de lo que antes hacía
  // `onTienda` repintando toda la izquierda: ahora es quirúrgico, solo el
  // sub-nodo de dinero (no toca calendario/recursos/próxima/noticias, que
  // viven al lado en la misma columna y no cambiaron).
  function propsPanelDinero() {
    return { jugador: partida.jugador, onTienda: () => abrirTienda(refrescarDinero) };
  }

  function refrescarDinero() {
    renderPanelDinero(shellActual.regiones.derecha.querySelector('[data-bloque="dinero"]'), propsPanelDinero());
  }

  // Popup con la tabla de posiciones completa (Task v3, feedback del
  // usuario: "no puedo ver quiénes están por encima o por debajo de mí").
  // `tablaRanking` (world.js) ya arma el roster activo + el jugador en su
  // puesto real, coherente con los rivales que ofrece buscarRival — mismo
  // popup que la tienda: el tablero sigue montado y visible detrás.
  function abrirRanking() {
    renderRanking({ filas: tablaRanking(partida.mundo, partida.jugador) });
  }

  // Asegura el shell y REFRESCA los tres paneles del tablero con la partida
  // actual, según la grilla 3×3 (v4, feedback del usuario: "en PC no se
  // aprovecha bien el ancho"):
  //   - izquierda: personaje, tu rincón, categoría/ranking.
  //   - centro: atributos, estado, y lo que esté pasando ahora (contenido).
  //   - derecha: calendario+dinero, fama+próxima pelea, noticias.
  // Se llama en cada transición del tablero (nuevo beat, o volver al estado
  // ocioso) — nunca en cada micro-render dentro de un mismo beat (p. ej. cada
  // golpe del sparring, o cada frame del roll de azar, repintan solo
  // `centroContenido()` directo). Quien pinta un beat nunca toca
  // `shell.regiones.centro` directo: usa `centroContenido()`.
  function montarTablero() {
    const shell = asegurarShell();
    renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda());

    // Atributos y estado (arriba, siempre los mismos mientras no cambien los
    // datos del jugador) + contenido (lo que cambia: el panel de avance, una
    // decisión, el sparring) — el jugador nunca los pierde de vista mientras
    // decide, la garantía central del rediseño.
    shell.montarCentro(el('div', { class: 'stack' }, [
      el('div', { dataset: { bloque: 'atributos' } }),
      el('div', { dataset: { bloque: 'estado' } }),
      el('div', { dataset: { bloque: 'contenido' } }),
    ]));
    renderPanelAtributos(shell.regiones.centro.querySelector('[data-bloque="atributos"]'), { jugador: partida.jugador });
    renderPanelEstado(shell.regiones.centro.querySelector('[data-bloque="estado"]'), { jugador: partida.jugador });

    // `class:'stack'` (v3, feedback del usuario: "está muy pegada al módulo
    // de arriba del próximo combate"): antes este wrapper no tenía clase, así
    // que el gap:10px de `.shell-region` (pensado para sus hijos DIRECTOS)
    // nunca llegaba a aplicarse entre módulos — vivían pegados dentro de este
    // único hijo. `.stack` es el mismo respiro que ya separa a todos los
    // demás paneles del tablero.
    shell.montarDerecha(el('div', { class: 'stack' }, [
      el('div', { dataset: { bloque: 'calendario' } }),
      el('div', { dataset: { bloque: 'dinero' } }),
      el('div', { dataset: { bloque: 'recursos' } }),
      el('div', { dataset: { bloque: 'proxima' } }),
      el('div', { dataset: { bloque: 'noticias' } }),
    ]));
    renderCalendario(shell.regiones.derecha.querySelector('[data-bloque="calendario"]'), { partida });
    renderPanelDinero(shell.regiones.derecha.querySelector('[data-bloque="dinero"]'), propsPanelDinero());
    renderPanelRecursos(shell.regiones.derecha.querySelector('[data-bloque="recursos"]'), { partida });
    renderPanelProxima(shell.regiones.derecha.querySelector('[data-bloque="proxima"]'), {
      partida,
      onVerRival: (rivalId) => {
        const rival = partida.mundo.roster.find((p) => p.id === rivalId);
        if (rival) abrirFicha(rival, 'atributos');
      },
    });

    // Cancela cualquier entrada de noticias que haya quedado a mitad de
    // camino de un montaje anterior (p. ej. el jugador encadena beats más
    // rápido que el intervalo entre una noticia y la siguiente): este mismo
    // montarTablero() ya va a reemplazar esos nodos, así que sus timers
    // quedarían apuntando a un panel que ya no está — se cortan ANTES de
    // pintar el nuevo, nunca quedan corriendo en segundo plano.
    abandonarNoticiasPendientes();
    const controladorNoticias = renderPanelNoticias(shell.regiones.derecha.querySelector('[data-bloque="noticias"]'), {
      noticias: partida.noticias,
      onLeidas: (nuevas) => { partida = { ...partida, noticias: nuevas }; },
      noticiasAnimadas: noticiasVistas,
    });
    cancelarNoticiasPendiente = () => {
      controladorNoticias.detener();
      cancelarNoticiasPendiente = null;
    };

    return shell;
  }

  // El sub-nodo de la región central donde va el contenido QUE CAMBIA (todo
  // lo que antes apuntaba directo a `shellActual.regiones.centro`): debajo
  // del calendario, siempre fijo arriba. Se relee en cada llamada (nunca se
  // cachea en una variable) para no quedar con una referencia vieja si
  // `montarTablero()` reconstruyó el esqueleto entre medio.
  function centroContenido() {
    return shellActual.regiones.centro.querySelector('[data-bloque="contenido"]');
  }

  // Reconstruye el tablero tal cual estaba: asegura el shell, refresca los
  // laterales, y repinta lo último que se puso en el centro (pintarCentro).
  // Es el `onCerrar` de ficha/tienda: volver de ahí nunca pierde el beat
  // pendiente ni cae en una pantalla vacía.
  function volverAlTablero() {
    montarTablero();
    pintarCentro();
  }

  // Registra QUÉ pintar en el centro ahora mismo y lo pinta ya (asegurando el
  // shell y refrescando los laterales primero). Todo lo que ocurre "dentro
  // del tablero" —el estado ocioso, cada beat, cada desenlace— pasa por acá
  // exactamente una vez por transición.
  function centro(pintar) {
    pintarCentro = pintar;
    volverAlTablero();
  }

  // El estado "entre beats": lo que ANTES mostraba renderDashboard (v1,
  // pantalla completa) ahora es un panel más en el centro del MISMO tablero
  // (Task 6.1 — el tablero es la pantalla principal, siempre). Extraída
  // aparte de `irADashboard` (no un closure inline) para poder reusarla tal
  // cual como `pintarCentro` cuando se cancela un roll o un dado pendientes
  // (ver abandonarRollPendiente/abandonarDadoPendiente): asignar
  // `pintarCentro = irADashboard` directo re-entraría en `centro()` (que ya
  // estaría en medio de resolverse) — esto es la versión "solo pintar", sin
  // el `persistir()` ni el `centro()` de alrededor.
  function pintarPanelAvance() {
    renderPanelAvance(centroContenido(), { partida, onSiguiente: siguienteConDado, onCurar: curar });
  }

  function irADashboard() {
    persistir();
    centro(pintarPanelAvance);
  }

  // Reemplaza a mostrarDesenlace/renderDesenlace para las decisiones (Task
  // v3, feedback del usuario): ya no hay pantalla de resultado con botón
  // "Seguir" — se aplica el efecto y la carrera sigue derecho al estado
  // ocioso (Continuar). Lo único que le avisa al jugador qué cambió es la
  // animación de números + el resalte verde/rojo de SOLO las filas de
  // atributo que cambiaron (antes, `shell.destacar('izquierda')` hacía
  // brillar TODO el módulo izquierdo por cualquier cambio — queja textual).
  // Desde la grilla 3×3 (v4) los atributos/estado viven en la columna
  // CENTRAL, no en la izquierda — ver montarTablero.
  //
  // El ORDEN importa: animar tiene que pasar DESPUÉS de irADashboard() (que
  // llama a montarTablero(), y esa SIEMPRE repinta atributos/estado desde
  // cero — ver montarTablero). Animar ANTES se pierde en el mismo tick:
  // mount() no diffea, así que el segundo repintado deja huérfanos los nodos
  // que `animarAtributos`/`destacarAtributos` acababan de tocar, sin que el
  // navegador llegue a pintar ese estado intermedio.
  function aplicarEfectoYSeguir({ jugador, rivalidades = partida.rivalidades, deltas = {} }) {
    partida = { ...partida, jugador, rivalidades };
    irADashboard();
    animarAtributos(shellActual.regiones.centro, deltas);
    destacarAtributos(shellActual.regiones.centro, deltas);
  }

  // Al tocar "Continuar" se tira el dado (Task v3, pedido textual: "el juego
  // se llama así por algo") antes de que aparezca la siguiente decisión.
  // Mismo cuidado que con el roll de una carta: si el jugador se va a la
  // Ficha en pleno giro, `cancelarDadoPendiente` resuelve YA la transición
  // (nunca pinta nada — el tablero no está a la vista) en vez de dejar el
  // timer terminar solo, en segundo plano, contra un `contenedor` que la
  // Ficha ya reemplazó.
  //
  // El guard `dadoResuelto` evita un bug sutil: con prefers-reduced-motion
  // (o si algún día `animarDado` resuelve síncrono por otro motivo),
  // `onFin` corre DENTRO del propio `animarDado(...)`, antes de que esta
  // función llegue a la línea de abajo — sin el guard, esa línea
  // pisaría `cancelarDadoPendiente` con un cancelador VIEJO que dispararía
  // `siguiente()` una segunda vez si el jugador entra a la Ficha más tarde
  // (saltearía un beat entero de la carrera).
  function siguienteConDado() {
    const boton = centroContenido().querySelector('[data-accion="siguiente"]');
    if (!boton) { siguiente(); return; }

    let dadoResuelto = false;
    const controladorDado = animarDado(boton, {
      onFin: () => {
        dadoResuelto = true;
        cancelarDadoPendiente = null;
        siguiente();
      },
    });
    if (!dadoResuelto) {
      cancelarDadoPendiente = () => { controladorDado.detener(); cancelarDadoPendiente = null; siguiente(); };
    }
  }

  function curar() {
    const paso = curarConDinero(partida.jugador, partida.jugador.estado.lesion);
    if (paso.ok) partida = { ...partida, jugador: paso.peleador };
    irADashboard();
  }

  // `abrirFicha`/`abrirTienda` reemplazan `contenedor` entero (ficha) o abren
  // un popup (tienda): al cerrar, siempre se vuelve al mismo tablero.
  //
  // Antes de reemplazar `contenedor`, se cancela cualquier roll pendiente
  // (Hallazgo 1): es la única transición de las tres que menciona el panel
  // izquierdo (Ficha, Historial —ambas pasan por acá—, Tienda) que se lleva
  // puesto el shell entero; Tienda abre un popup y el tablero sigue montado
  // detrás, así que un roll terminando ahí no tiene el mismo problema.
  function abrirFicha(jugador, seccion = 'atributos') {
    abandonarRollPendiente();
    abandonarDadoPendiente();
    abandonarNoticiasPendientes();
    abandonarSparringPendiente();
    renderFicha(contenedor, { jugador, seccion, onCerrar: volverAlTablero });
  }

  // La tienda se abre como POPUP desde el tablero (decisión de la Task 5.4),
  // nunca reemplazando la pantalla: `renderTienda` maneja su propio overlay
  // (abrirPopup) y se refresca en el lugar en cada compra vía el valor que
  // devuelve `onComprar`. Eso alcanza para el CONTENIDO del popup, pero el
  // panel izquierdo que queda VISIBLE DETRÁS también tiene que reflejar la
  // plata gastada en el momento — "el tablero nunca desaparece" y "los
  // cambios se ven ocurrir" valen también con el popup abierto, no solo
  // cuando se cierra. `refrescarTablero` es justo eso: lo que hay que
  // repintar DETRÁS del popup en cada compra (el panel izquierdo).
  function abrirTienda(refrescarTablero = () => {}) {
    renderTienda({
      jugador: partida.jugador,
      onComprar: (id) => {
        const paso = comprar(partida.jugador, id);
        if (paso.ok) {
          partida = { ...partida, jugador: paso.jugador };
          refrescarTablero();
        }
        return partida.jugador;
      },
      onCerrar: volverAlTablero,
    });
  }

  // Sistema 4 (feedback del usuario: "faltan popups cuando pasen cosas
  // importantes: [...] cuando se avanza de categoría"): `siguiente()` es el
  // ÚNICO llamador de `siguienteBeat` en todo main.js, así que es el único
  // lugar donde hace falta comparar la etapa antes/después — nunca puede
  // haber un cambio de etapa que se escape sin pasar por acá. El popup se
  // muestra COMO OVERLAY sobre lo que se acaba de pintar (mismo patrón que
  // la tienda: el tablero sigue montado y visible detrás), nunca reemplaza
  // el beat real.
  function siguiente() {
    const etapaAntes = etapaActual(partida).id;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const hitoEtapa = hitoDeEtapa({ etapaAnteriorId: etapaAntes, etapaNueva: etapaActual(partida) });
    if (partida.terminada) return finDeCarrera();
    if (!paso.beat) { irADashboard(); if (hitoEtapa) mostrarHito(hitoEtapa); return; }
    jugarBeat(paso.beat);
    if (hitoEtapa) mostrarHito(hitoEtapa);
  }

  function jugarBeat(beat) {
    if (beat.tipo === 'mejora') return beatMejora(beat);
    if (beat.tipo === 'evento') return beatCarta(beat, 'Decisión', 'alerta');
    if (beat.tipo === 'redes') return beatCarta(beat, 'Redes sociales', 'microfono');
    if (beat.tipo === 'sparring') return beatSparring(beat);
    if (beat.tipo === 'campCarta') return beatCampCarta(beat);
    if (beat.tipo === 'campSparring') return beatCampSparring(beat);
    if (beat.tipo === 'oferta') return beatOferta(beat);
    if (beat.tipo === 'lesionSinOferta') return beatLesionSinOferta(beat);
    if (beat.tipo === 'peleasResueltas') return beatPeleasResueltas(beat);
    return irADashboard();
  }

  // v6, segunda vuelta ("no todas las peleas se juegan igual"): las peleas
  // de trámite (esPeleaImportante, offers.js; armarLotePeleas, tramite.js) ya
  // llegan acá RESUELTAS — career.js las aplicó al jugador dentro de
  // armarCola, antes de que este beat exista. Acá solo hay que mostrar el
  // resumen con sabor (titulo/texto ya armados por resumenLote) y un
  // detalle corto de cada combate, mismo layout que cualquier otro
  // desenlace (título + texto + Seguir).
  const METODO_TEXTO_TRAMITE = {
    ko: 'KO', tko: 'TKO', decision: 'decisión', sumision: 'sumisión',
  };

  function beatPeleasResueltas(beat) {
    const { titulo, texto, resultados } = beat.datos;
    const deltasTexto = resultados.map((r) => {
      const rival = r.rivalApodo ?? r.rivalNombre;
      const veredicto = r.resultado === 'v' ? 'Ganaste' : r.resultado === 'e' ? 'Empataste' : 'Perdiste';
      const metodo = METODO_TEXTO_TRAMITE[r.metodo] ?? r.metodo;
      return `${veredicto} vs ${rival} (${metodo})`;
    });
    centro(() => renderDesenlace(centroContenido(), {
      titulo,
      texto,
      deltasTexto,
      onContinuar: irADashboard,
    }));
  }

  // 'lesionSinOferta' es un beat simple (nada que jugar, solo un aviso) que
  // en la v1/pre-6.1 abría su PROPIA pantalla completa (renderResultadoTarjeta).
  // Con "los beats van al centro" (brief de la Task 6.1) pasa a vivir en la
  // misma región central del tablero, reusando renderDesenlace (mismo layout:
  // título + texto + botón Seguir, sin deltas). El beat 'noticias' (mismo
  // patrón, pero para "circuló algo, mirá a la derecha") se sacó del todo
  // (Task v3, "cartas nuevas + progresión"): las noticias ya viven siempre
  // visibles en la columna derecha (panel-noticias.js), así que interrumpir
  // la carrera para avisar lo mismo que ya se ve al lado era presupuesto de
  // ritmo gastado en nada — ver el comentario largo sobre ETAPAS en
  // career.js. `renderResultadoTarjeta` (screens/card.js) quedó huérfano
  // antes (Task v3): el resultado post-pelea pasó a vivir DENTRO de la propia
  // pantalla de pelea (renderPelea con `despues`), así que se borró junto con
  // su test — el rechazo de oferta ya resolvía en el centro (ver beatOferta)
  // desde antes.
  function beatLesionSinOferta(beat) {
    const { lesion } = beat.datos;
    const semanas = lesion?.semanasRestantes ?? null;
    centro(() => renderDesenlace(centroContenido(), {
      titulo: 'Sin ofertas',
      texto: lesion
        ? `Nadie te ofrece pelear: seguís de baja por "${lesion.nombre.toLowerCase()}" — ${semanas} ${semanas === 1 ? 'semana' : 'semanas'} más para volver.`
        : 'Nadie te ofrece pelear mientras estás lesionado.',
      deltasTexto: [],
      onContinuar: irADashboard,
    }));
  }

  function beatMejora(beat) {
    const cartas = beat.datos.cartas;
    centro(() => renderPanelDecision(centroContenido(), {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: textoCantidadMejoras(cartas.length),
      opciones: cartas.map(cartaMejoraAOpcion),
      onElegir: (id) => {
        const carta = cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        aplicarEfectoYSeguir({ jugador: aplicado.jugador, deltas: aplicado.deltas });
      },
    }));
  }

  // Muestra la crónica de la rama de azar que le tocó al jugador SOBRE la
  // propia tarjeta ganadora (Task v3: "el jugador SÍ tiene que poder ver qué
  // desenlace le tocó" — eso no se podía perder al sacar la pantalla de
  // "Seguir"). Se agrega DESPUÉS de que animarRoll ilumina el resultado, así
  // conviven un momento la píldora del efecto ganador y la frase de esa
  // rama, antes de volver al estado ocioso.
  function mostrarResultadoEnTarjeta(nodoTarjeta, texto) {
    if (!nodoTarjeta || !texto) return;
    nodoTarjeta.appendChild(el('div', { class: 'tarjeta-resultado', text: texto }));
  }

  // Cuánto se deja el resultado de un roll fijo en la tarjeta antes de
  // volver al estado ocioso: tiempo de sobra para leer una frase corta sin
  // frenar el ritmo de la carrera al repetirse. No es una animación de
  // movimiento (nada se mueve mientras tanto), así que no depende de
  // prefers-reduced-motion como sí lo hacen animarRoll/animarDado.
  const PAUSA_RESULTADO_MS = 1100;

  function beatCarta(beat, titulo, nombreIcono) {
    const carta = beat.datos.carta;

    centro(() => renderPanelDecision(centroContenido(), {
      titulo,
      bajada: carta.titulo,
      texto: carta.texto,
      rareza: carta.rareza,
      opciones: carta.opciones.map((o) => opcionCartaAOpcion(o, nombreIcono)),
      onElegir: (id) => {
        const opcion = carta.opciones.find((o) => o.id === id);
        const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
        const resuelto = resolverOpcion(rng, {
          jugador: partida.jugador, carta, opcionId: id,
          rivalidades: partida.rivalidades, rivalObjetivoId,
        });

        // `caePelea` (Task v3, "cartas nuevas con azar"): la rama que salió
        // canceló de verdad la pelea que estuviera en danza este bloque, no
        // solo en el texto de la tarjeta — ver cancelarProximaPelea en
        // career.js. Se aplica ANTES de aplicarEfectoYSeguir (que pinta el
        // tablero ocioso): así el panel de "próxima pelea" ya sale limpio en
        // el mismo repintado, sin un instante intermedio con la oferta vieja
        // todavía puesta.
        const aplicar = () => {
          if (resuelto.caePelea) partida = cancelarProximaPelea(partida);
          aplicarEfectoYSeguir({
            jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas,
          });
        };

        if (!opcion.probabilidades) { aplicar(); return; }

        const nodoTarjeta = centroContenido().querySelector(`[data-opcion="${id}"]`);

        // Ver el comentario largo junto a la declaración de
        // `cancelarRollPendiente`: si el jugador se va del tablero (Ficha)
        // antes de que el roll o la pausa de lectura terminen, esto resuelve
        // YA el efecto (que `resolverOpcion` ya decidió más arriba, de forma
        // síncrona) sin pintar nada — el tablero no está a la vista.
        //
        // `rollResuelto` evita pisar, con un cancelador viejo, el que recién
        // dejó puesto `onFin` si `animarRoll` resolvió síncrono (motion
        // reducido, o una sola rama posible): sin el guard, un roll ya
        // terminado quedaría con `cancelarRollPendiente` apuntando igual a
        // "cancelar el roll" en vez de a "cancelar la pausa de lectura", y
        // aplicaría el efecto DOS VECES si el jugador entra a la Ficha
        // después.
        let rollResuelto = false;
        const controladorRoll = animarRoll(nodoTarjeta, {
          indiceGanador: resuelto.indiceGanador,
          cantidad: opcion.probabilidades.length,
          onFin: () => {
            rollResuelto = true;
            mostrarResultadoEnTarjeta(nodoTarjeta, resuelto.texto || carta.texto);
            const timerId = setTimeout(() => {
              cancelarRollPendiente = null;
              aplicar();
            }, PAUSA_RESULTADO_MS);
            cancelarRollPendiente = () => {
              clearTimeout(timerId);
              cancelarRollPendiente = null;
              aplicar();
            };
          },
        });
        if (!rollResuelto) {
          cancelarRollPendiente = () => {
            controladorRoll.detener();
            cancelarRollPendiente = null;
            aplicar();
          };
        }
      },
    }));
  }

  function beatSparring(beat) {
    let sparring = beat.datos.sparring;

    function pintarSparring() {
      const handle = renderSparring(centroContenido(), {
        sparring,
        jugador: partida.jugador,
        onGolpe: (evento) => {
          sparring = registrarGolpe(sparring, evento);
          pintarSparring();
        },
        // Pedido v6: un solo reloj para TODA la sesión (ya no por golpe). Si
        // se acaba el tiempo, el minijuego corta ya con lo que se llevaba
        // acumulado — no se queda esperando el golpe que falta.
        onTiempoAgotado: () => {
          sparring = terminarPorTiempo(sparring);
          pintarSparring();
        },
        onTerminar: () => {
          const resultado = resultadoSparring(sparring, partida.jugador);
          const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
          aplicarEfectoYSeguir({ jugador: aplicado.jugador, deltas: aplicado.deltas });
        },
      });
      // Se reasigna en CADA golpe (mismo patrón que cancelarNoticiasPendiente
      // en montarTablero): el handle anterior ya venció apenas se re-pintó.
      cancelarSparringPendiente = () => {
        handle.detener();
        cancelarSparringPendiente = null;
      };
    }

    centro(pintarSparring);
  }

  // --- Campamento de preparación (Task v3, pedido textual: "al aceptar una
  // pelea, va directo al combate, debería de haber unas semanas de
  // preparación") -----------------------------------------------------------
  // Estos dos beats viven DENTRO del tablero, con el mismo patrón que
  // mejora/evento/sparring: `firmarPelea` (career.js) ya decidió cuántos son
  // (2 o 3) y armó su contenido (campamento.js); acá solo hay que pintarlos y
  // aplicar su efecto. La diferencia con los demás beats de decisión es el
  // ÚLTIMO del campamento (`beat.datos.ultimo`): en vez de volver al estado
  // ocioso, dispara la pipeline a pantalla completa de la pelea (careo → plan
  // → pelea) — el mismo destino al que antes se llegaba apenas se aceptaba la
  // oferta, ahora recién después de las semanas de preparación.
  function beatCampCarta(beat) {
    const { carta, oferta, ultimo } = beat.datos;
    centro(() => renderPanelDecision(centroContenido(), {
      titulo: 'Campamento',
      bajada: carta.titulo,
      texto: carta.texto,
      rareza: carta.rareza,
      opciones: carta.opciones.map((o) => opcionCartaAOpcion(o, 'pesa')),
      onElegir: (id) => {
        const resuelto = resolverOpcion(rng, {
          jugador: partida.jugador, carta, opcionId: id, rivalidades: partida.rivalidades,
        });
        if (ultimo) {
          partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
          careo(oferta);
          return;
        }
        aplicarEfectoYSeguir({ jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas });
      },
    }));
  }

  function beatCampSparring(beat) {
    let sparring = beat.datos.sparring;
    const { oferta, ultimo } = beat.datos;

    function pintarSparring() {
      const handle = renderSparring(centroContenido(), {
        sparring,
        jugador: partida.jugador,
        // La oferta ya trae rivalApodo/rivalNombre propios (self-contained,
        // sin depender de encontrarlo en el roster) — con el roster de 100
        // (Pedido 1), la mayoría de los rivales de relleno no tienen apodo
        // (null): sin el resguardo, esto mostraba literalmente "null".
        titulo: `Campamento · contra "${oferta.rivalApodo ?? oferta.rivalNombre}"`,
        bajada: 'Los rounds fuertes antes de la pelea',
        onGolpe: (evento) => {
          sparring = registrarGolpe(sparring, evento);
          pintarSparring();
        },
        onTiempoAgotado: () => {
          sparring = terminarPorTiempo(sparring);
          pintarSparring();
        },
        onTerminar: () => {
          const resultado = resultadoSparring(sparring, partida.jugador);
          const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
          if (ultimo) {
            partida = { ...partida, jugador: aplicado.jugador };
            careo(oferta);
            return;
          }
          aplicarEfectoYSeguir({ jugador: aplicado.jugador, deltas: aplicado.deltas });
        },
      });
      cancelarSparringPendiente = () => {
        handle.detener();
        cancelarSparringPendiente = null;
      };
    }

    centro(pintarSparring);
  }

  // Aceptar o rechazar una oferta es LA decisión más importante del juego
  // (revisión del coordinador tras la Task 6.1): es donde más rinde ver el
  // ranking, el récord, el dinero y el estado físico mientras se decide si
  // conviene esa bolsa o si están para pelear por ese cinturón — el caso de
  // uso que motivó todo el rediseño. Por eso vive en el centro del tablero
  // como cualquier otro beat de decisión, reusando `renderOferta` tal cual
  // (no le importa si `contenedor` es la pantalla entera o una región: solo
  // monta un `.stack`). Rechazar (Task v3: sin pantalla de "Seguir", como
  // cualquier otra decisión) resuelve derecho al estado ocioso; el único
  // efecto de rechazar es en Fama, que no vive en el panel de atributos, así
  // que no hay nada para animar/destacar acá. Al ACEPTAR es cuando arranca
  // la pipeline a pantalla completa (negociación → careo → plan → pelea):
  // esa sí sigue siendo pantallas grandes con su propia puesta en escena,
  // decisión ya tomada.
  function beatOferta(beat) {
    const { oferta } = beat.datos;
    centro(() => renderOferta(centroContenido(), {
      oferta,
      jugador: partida.jugador,
      onAceptar: () => negociar(oferta),
      onRechazar: () => {
        const paso = rechazarOferta(partida.jugador, oferta);
        // `ofertaPendiente` (dato interno, career.js) deja de estar vigente
        // en cuanto se rechaza: sin esto quedaba fantasma para
        // cancelarProximaPelea el resto del bloque. `proximaPelea` (lo que
        // muestra el panel) nunca llegó a setearse acá — solo la firma
        // (firmarPelea) la crea — así que no hace falta tocarla.
        partida = { ...partida, jugador: paso.jugador, ofertaPendiente: null };
        irADashboard();
      },
    }));
  }

  function negociar(oferta) {
    let negociacion = crearNegociacion(oferta, {
      tieneManager: partida.jugador.staff.includes('manager'),
    });
    const pintar = () => renderNegociacion(contenedor, {
      negociacion,
      oferta,
      onMovida: (movidaId) => {
        negociacion = jugarMovida(negociacion, movidaId, rng).negociacion;
        pintar();
      },
      // Task v3, pedido textual ("debería de haber unas semanas de
      // preparación"): cerrar la negociación ya no dispara la pipeline de
      // pelea en el acto — firma el contrato (firmarPelea, career.js) y
      // vuelve al tablero. El campamento de 2-3 beats (beatCampCarta/
      // beatCampSparring, más arriba) es lo próximo que va a jugar el
      // jugador; recién su último beat llama a `careo`.
      onCerrar: () => {
        const final = resultadoNegociacion(negociacion);
        partida = firmarPelea(partida, { oferta: { ...oferta, bolsa: final.bolsa } });
        // Pedido v6 ("las noticias también deberían nombrar al jugador...
        // pelea de revancha"): se firma acá, con la bolsa ya cerrada — recién
        // ahora el cruce es un hecho, no una posibilidad. Mismo rng
        // "cosmético" que el resto de esta función (nunca el compartido de
        // la carrera).
        if (oferta.esRevancha) {
          const noticia = generarNoticia(rng, {
            tipo: 'revancha',
            datos: {
              nombre: partida.jugador.nombre,
              apodo: partida.jugador.apodo,
              rival: oferta.rivalApodo ?? oferta.rivalNombre,
            },
            fecha: partida.mundo.anio,
          });
          partida = { ...partida, noticias: agregarNoticias(partida.noticias, [{ ...noticia, propia: true }]) };
        }
        irADashboard();
      },
      // Rechazar la pelea DESDE la negociación (Task v3, pedido textual: el
      // botón "tiene que estar siempre disponible", incluso con la
      // negociación bloqueada por un apriete fallido). Misma consecuencia
      // que rechazar la oferta antes de negociar (ver beatOferta): pierde
      // fama y vuelve al tablero, sin firmar nada.
      onRechazar: () => {
        const paso = rechazarOferta(partida.jugador, oferta);
        partida = { ...partida, jugador: paso.jugador, ofertaPendiente: null };
        irADashboard();
      },
    });
    pintar();
  }

  // El careo va en todas las peleas profesionales (Task v3, pedido textual:
  // "solo me ocurrió en algunas peleas, no en todas ¿no debería estar en
  // todas?"). Antes se saltaba con fama < 20 fuera de una pelea de título —
  // como la fama arranca en 0, esto lo dejaba prácticamente afuera de toda
  // la primera mitad de la carrera. El único portón que queda es de nivel:
  // en juvenil/amateur (`nivelPelea === 'amateur'`, ver NIVELES en
  // core/offers.js) todavía no hay rueda de prensa — no tiene sentido narrar
  // una para un pibe de 15 años en un torneo local.
  function careo(oferta) {
    if (oferta.nivelPelea === 'amateur') return elegirPlan(oferta);
    let estado = crearCareo(rng, { oferta });
    const pintar = () => renderCareo(contenedor, {
      careo: estado,
      onResponder: (tono) => {
        estado = responderCareo(estado, tono, rng).careo;
        pintar();
      },
      onTerminar: () => {
        const r = resultadoCareo(estado);
        const jugador = {
          ...partida.jugador,
          fama: clamp(partida.jugador.fama + r.bonusFama, 0, 100),
          estado: { ...partida.jugador.estado, moral: clamp(partida.jugador.estado.moral + r.bonusMoral, 0, 100) },
        };
        partida = {
          ...partida,
          jugador,
          rivalidades: subirHeat(partida.rivalidades, oferta.rivalId, r.heatRival),
        };
        elegirPlan(oferta);
      },
    });
    pintar();
  }

  function elegirPlan(oferta) {
    renderPlan(contenedor, { oferta, onElegirPlan: (plan) => pelear(oferta, plan) });
  }

  // La pelea es UNA sola pantalla que va avanzando (Task 4.3): renderPelea es
  // idempotente (arma el marcador una sola vez y lo reusa), así que acá solo
  // hace falta orquestar QUÉ momentos narrar en cada paso — nunca reemplazar
  // la pantalla entera. `avanzar` simula el round siguiente y narra sus
  // momentos; si ese round termina en rincón o golpe de gracia, el panel de
  // acción se encarga de mostrarlo (adentro de la misma pantalla) una vez
  // que la narración termina.
  //
  // Task v3, pedido textual ("Debe incluirse un botón que sea para empezar
  // la pelea"): antes `avanzar()` se llamaba de una acá abajo y la
  // narración arrancaba sola apenas se elegía el plan. Ahora el primer
  // `pintar([])` solo arma el esqueleto (con `pelea.pendiente === 'inicio'`)
  // y `renderPelea` se encarga de mostrar el botón; recién `onEmpezar` dispara
  // el primer `avanzar()`.
  function pelear(oferta, plan) {
    const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
    let pelea = crearPelea({
      jugador: partida.jugador, rival,
      disciplina: partida.jugador.disciplina, nivel: oferta.nivelPelea, plan, rng,
    });

    function pintar(momentos, despues) {
      renderPelea(contenedor, {
        pelea,
        momentos,
        despues,
        ventanaMs: VENTANA_MS,
        onEmpezar: avanzar,
        onSeguir: avanzar,
        onInstruccion: (id) => {
          pelea = aplicarInstruccionRincon(pelea, id);
          avanzar();
        },
        onGolpe: (datos) => {
          const paso = resolverGolpeDeGracia(pelea, datos);
          pelea = paso.pelea;
          pintar(paso.eventos);
        },
        // "Ver qué pasó después" calcula las consecuencias (dinero, lesión,
        // título) y vuelve a pintar la MISMA pantalla con `despues` puesto:
        // el resultado post-pelea vive acá adentro, no en una pantalla nueva
        // (Task v3, pedido textual).
        onFin: () => {
          const resumen = cerrarPelea(oferta, pelea);
          pintar([], resumen);
          // Sistema 4 (feedback del usuario: "faltan popups cuando [...] se
          // gana un cinturón, cuando se pierde un cinturón..."): el popup se
          // muestra COMO OVERLAY sobre la pantalla de resultado que se acaba
          // de pintar (mismo patrón que la tienda), nunca la reemplaza. Como
          // mucho UNO por pelea (el más importante que haya salido: ver el
          // orden de prioridad en hitosDePelea, core/hitos.js) — "que no
          // moleste" es pedido explícito del usuario.
          if (resumen.hitos.length > 0) mostrarHito(resumen.hitos[0]);
        },
        onContinuar: irADashboard,
      });
    }

    function avanzar() {
      const paso = avanzarPelea(pelea);
      pelea = paso.pelea;
      pintar(paso.eventos);
    }

    pintar([]);
  }

  // Calcula las consecuencias de la pelea ya terminada (récord, dinero,
  // fama, lesión, título, rivalidades) y actualiza `partida` — pero NO
  // pinta nada: quien llama (`pelear`) es responsable de mostrar el resumen
  // dentro de la propia pantalla de pelea. Devuelve el resumen para eso.
  function cerrarPelea(oferta, pelea) {
    // Estado "antes" para detectar hitos (Sistema 4, core/hitos.js): tiene
    // que leerse ACÁ, antes de que `partida` se reasigne más abajo — un
    // historial vacío ahora mismo es "esta es la primera pelea", y el
    // archirrival de ahora es el punto de comparación para "recién se
    // consagra una rivalidad".
    const jugadorAntes = partida.jugador;
    const archirrivalAntesId = (partida.rivalidades ?? []).find((r) => r.esArchirrival)?.rivalId ?? null;

    // `semanaGlobal` (Task v3, "fechas de cuándo se ganaron/defendieron
    // títulos"): se estampa EN el momento del hito, no se reconstruye
    // después — ver el comentario en aplicarResultado (offers.js).
    const paso = aplicarResultado(partida.jugador, {
      oferta, resultado: pelea.resultado, semanaGlobal: partida.semanaGlobal,
    });
    let jugador = paso.jugador;

    const danoRecibido = 100 - pelea.aguante.jugador;
    const lesion = tirarLesion(rng, { peleador: jugador, contexto: 'pelea', danoRecibido });
    if (lesion) {
      jugador = aplicarLesion(jugador, lesion);
      jugador.lesionesSufridas = [...(jugador.lesionesSufridas ?? []), lesion];
    }

    const signo = pelea.resultado.ganador === 'jugador' ? 'v' : pelea.resultado.ganador === 'rival' ? 'd' : 'e';
    const rivalidades = registrarCruce(partida.rivalidades, oferta.rivalId, signo);
    elegirArchirrival(rivalidades);
    const archirrivalDespuesId = rivalidades.find((r) => r.esArchirrival)?.rivalId ?? null;

    // La pelea firmada que se acaba de cerrar ya no es la "próxima pelea" —
    // sin esto, el panel de próxima pelea seguía mostrando al rival ya
    // peleado hasta que arrancaba el bloque siguiente (bug reportado:
    // "seguía apareciendo un peleador aunque no haya elegido ni confirmado
    // ninguno todavía").
    partida = {
      ...partida, jugador, rivalidades, proximaPelea: null,
    };

    const tituloGanado = paso.titulosGanados[0] ?? null;
    const hitos = hitosDePelea({
      oferta,
      resultado: pelea.resultado,
      tituloGanado,
      jugadorAntes,
      defensasActuales: oferta.cinturonId ? (jugador.defensasCinturon?.[oferta.cinturonId] ?? null) : null,
      archirrivalAntesId,
      archirrivalDespuesId,
      // Entropía para la variante de texto (Sistema 4, hitos-lines.js): no
      // es una decisión de juego, así que no hace falta el rng compartido —
      // basta con un número que cambie pelea a pelea.
      contexto: jugador.historial.length,
    });

    // Pedido v6 ("las noticias también deberían nombrar al jugador cuando
    // ocurren cosas importantes"): a lo sumo UNA noticia propia por pelea
    // (noticiaDeHitoJugador ya elige cuál, con su propia prioridad — ver
    // core/hitos.js), armada con la MISMA maquinaria que ya usan las
    // noticias del mundo (generarNoticia/PLANTILLAS, news.js/news-templates.js).
    // El rng que se usa acá es el "cosmético" de main.js (el mismo que ya
    // tira la lesión unas líneas más arriba en esta función) — nunca el rng
    // compartido de la carrera (core/career.js), que es el que calibra el
    // ritmo de toda la partida y no hay que correr de más.
    const noticiaHito = noticiaDeHitoJugador({
      hitos,
      oferta,
      resultado: pelea.resultado,
      jugadorAntes,
      jugador,
      rankingAntes: rankingDelJugador(partida.mundo, jugadorAntes),
      rankingDespues: rankingDelJugador(partida.mundo, jugador),
    });
    if (noticiaHito) {
      const noticia = generarNoticia(rng, {
        tipo: noticiaHito.tipo, datos: noticiaHito.datos, fecha: partida.mundo.anio,
      });
      // `propia` distingue esta noticia de las que cuentan lo que le pasa al
      // resto del mundo — el feed la resalta (ver panel-noticias.js): es tu
      // carrera, tiene que notarse.
      partida = { ...partida, noticias: agregarNoticias(partida.noticias, [{ ...noticia, propia: true }]) };
    }

    return {
      texto: `${paso.texto}${lesion ? ` ${lesion.texto}` : ''}`,
      deltas: [`Bolsa: ${fmtDinero(oferta.bolsa)}`],
      tituloGanado,
      hitos,
    };
  }

  function finDeCarrera() {
    const legado = calcularLegado(partida);
    partida = { ...partida, legado };
    persistir();
    // Task v3, pedido textual: "las estadísticas también deben estar acá,
    // no al clickear en el botón 'Ver estadísticas'" — la pantalla final
    // muestra todo junto, sin una segunda pantalla detrás de un botón.
    renderLegado(contenedor, {
      legado,
      estadisticas: estadisticasDeCarrera(partida),
      jugador: partida.jugador,
      onNuevaCarrera: () => {
        borrar(storage);
        partida = null;
        arrancar();
      },
    });
  }

  function arrancar() {
    if (partida && !partida.terminada) return irADashboard();
    if (partida && partida.terminada && partida.legado) return finDeCarrera();
    renderCreacion(contenedor, {
      onComenzar: (jugador) => {
        const semilla = Date.now();
        partida = crearPartida({ jugador, semilla });
        rng = createRng(semilla + 7777);
        irADashboard();
      },
    });
  }

  renderLogin(contenedor, { onEntrar: arrancar, storage });
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  iniciar();
}
