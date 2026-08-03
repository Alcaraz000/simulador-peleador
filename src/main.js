import { createRng } from './core/rng.js';
import {
  crearPartida, siguienteBeat, firmarPelea, cancelarProximaPelea, etapaActual,
  registrarDecision, registrarMuestraMedia,
  guardarBonusProximaPelea, consumirBonusProximaPelea, aplicarCambioDeCampeon,
} from './core/career.js';
import { tablasDeDivisiones, rankingDelJugador } from './core/world.js';
import { crearPeleador } from './core/fighter.js';
import { hitosDePelea, hitoDeEtapa, noticiaDeHitoJugador } from './core/hitos.js';
import { generarNoticia, agregarNoticias } from './core/news.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
import { aplicarCarta, formatearMods, porcentajesDe } from './core/cards.js';
import { ETIQUETAS, LIMITES_ATRIBUTO } from './core/stats.js';
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
import { estadisticasDeCarrera } from './core/stats-carrera.js';
import {
  resolverRondaMinijuego, resultadoDeMarcador, roundDeCierreMinijuego, rondasParaGanar,
} from './core/tramite.js';
import { ANUNCIO_TRAMITE, RESULTADO_DESTACADO_TRAMITE } from './content/tramite-lines.js';
import { textoResumenAnio } from './content/resumen-anio-lines.js';
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
import { renderResumenAnio } from './ui/screens/resumen-anio.js';

import { crearShell } from './ui/shell.js';
import {
  renderPanelPeleador, renderPanelAtributos, renderPanelEstado, renderPanelDinero,
} from './ui/screens/panel-peleador.js';
import { renderPanelProxima } from './ui/screens/panel-proxima.js';
import { renderPanelNoticias } from './ui/screens/panel-noticias.js';
import { renderPanelDecision, renderDesenlace } from './ui/screens/panel-decision.js';
import {
  renderCardTramite, renderMinijuegoRonda, opcionesMinijuego, NOMBRE_ACCION,
} from './ui/screens/panel-tramite.js';
import { renderCalendario } from './ui/screens/panel-calendario.js';
import { renderRanking } from './ui/screens/ranking.js';
import { animarRoll } from './ui/components/roll.js';
import { animarAtributos, destacarAtributos } from './ui/components/animar-numero.js';
import { icono } from './ui/icons.js';
import { limitarAlAltoDeIzquierda } from './ui/sincronizar-alturas.js';

export const VERSION = '0.1.0';

// --- Mapeo de datos del núcleo -> props de tarjeta (capa fina de UI) ------
// La fatiga es el ejemplo de "malo pero leve" del sistema de tarjetas: subirla
// no es tan grave como para pintarla en rojo, pero bajarla sigue siendo bueno.
function signoDeMod(clave, valor) {
  if (valor === 0) return 'leve';
  if (clave === 'fatiga') return valor > 0 ? 'leve' : 'positivo';
  return valor > 0 ? 'positivo' : 'negativo';
}

// `jugador` es opcional: con él, un mod POSITIVO que caiga sobre un atributo
// que ya está en el tope (LIMITES_ATRIBUTO.max) se muestra como "Fuerza al
// tope" en vez de "+9 Fuerza". El tope existía desde siempre y la carta se
// aplicaba igual, sin efecto: prometía nueve puntos y daba cero, sin decir
// por qué. `repartirMejoras` (cards.js) ya evita ofrecer estas cartas mientras
// quede alguna que rinda; esto cubre el caso en el que no queda ninguna —
// entonces la carta se ofrece igual, pero no miente.
//
// Solo se avisa del TOPE, nunca de cuánto va a rendir de verdad: el talento
// escala las mejoras y es, por diseño, algo que el jugador intuye y nunca lee
// como número (ver talento.js).
function efectosDeMods(mods = {}, jugador = null) {
  const atributos = jugador?.atributos ?? null;
  return Object.entries(mods).map(([clave, valor]) => {
    if (atributos && valor > 0 && atributos[clave] >= LIMITES_ATRIBUTO.max) {
      return { texto: `${ETIQUETAS[clave]?.larga ?? clave} al tope`, signo: 'leve' };
    }
    return {
      texto: formatearMods({ [clave]: valor })[0],
      signo: signoDeMod(clave, valor),
    };
  });
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
// si esa rama en particular lo declara (Task v3, "cartas nuevas con azar"),
// su propio dinero y el aviso "Se cae la pelea" — todo en la MISMA píldora
// (que ya lleva el % adelante, puesto por `labelEfecto` en card.js), para que
// el jugador vea de un vistazo qué arriesga en esa rama puntual. v13: la
// fama se va del juego (ver stats.js) — ninguna carta declara ya
// `efectos.fama`, así que esa rama de la píldora se borró con ella.
function textoDeRama(opcion, rama) {
  const partes = [];
  const modsTexto = formatearMods({ ...(opcion.mods ?? {}), ...rama.mods }).join(' ');
  if (modsTexto) partes.push(modsTexto);
  if (typeof rama.efectos?.dinero === 'number' && rama.efectos.dinero !== 0) {
    partes.push(fmtDineroSigno(rama.efectos.dinero));
  }
  if (rama.caePelea) partes.push('Se cae la pelea');
  return partes.join(' · ');
}

// Arma los `efectos` (píldoras) de una opción de evento/redes: si tiene
// `probabilidades`, una píldora por rama con su porcentaje (via
// porcentajesDe, Task 3.1); si no, una píldora por mod fijo más la de dinero
// declarada aparte en `efectos`.
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
  return efectos;
}

function cartaMejoraAOpcion(carta, jugador) {
  return {
    id: carta.id, titulo: carta.titulo, descripcion: carta.texto, rareza: carta.rareza,
    efectos: efectosDeMods(carta.mods, jugador), icono: icono('pesa'),
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

  // Pedido 3 (v8, "cuando se muestre el resumen del año, está permitido
  // 'ocultar' la sección de estado y atributos temporalmente para que se vea
  // mejor"): un flag de sesión, no de props — vive ACÁ (no en `montarTablero`)
  // porque tiene que sobrevivir a un viaje ida y vuelta a una pantalla
  // completa (Ficha) mientras el resumen sigue "abierto" atrás (volverAlTablero
  // no pasa por `centro()`, así que relee este mismo flag en vez de perderlo).
  // Se pide explícitamente al armar el beat 'resumenAnio' (ver
  // `beatResumenAnio`, más abajo) y `centro()` lo vuelve a `false` por
  // default en CUALQUIER otro beat — "Seguir" nunca necesita restaurarlo a
  // mano, el próximo beat normal ya lo hace solo.
  let sinAtributosEstado = false;

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
    observarContenidoCentral(shellActual);
    return shellActual;
  }

  // El hueco de abajo, resuelto de raíz (v17). `estirarDecisionAlPiso` ya era
  // genérico —estira lo que sea que esté montado en el centro— pero solo
  // corría desde `centro()`. Las pantallas que se repintan SOLAS por dentro
  // (el trámite ronda a ronda, el sparring, el desenlace del trámite) llaman a
  // `centroContenido()` directo y nunca volvían a pasar por ahí: la primera
  // pantalla cerraba contra el piso y las siguientes quedaban cortas. De ahí
  // el "todavía está dejando espacio vacío por debajo" del minijuego.
  //
  // En vez de ir agregando llamadas a mano en cada repintado —que es
  // exactamente lo que ya falló dos veces, y el usuario avisó que "puede haber
  // más"— se observa el bloque de contenido: cambió el hijo, se re-estira. No
  // hay forma de montar algo en el centro y olvidarse.
  //
  // Se observa la REGIÓN central entera, con subtree: el bloque
  // `[data-bloque="contenido"]` no existe todavía cuando se crea el shell (lo
  // arma `montarTablero`, más abajo) y encima se reemplaza en cada
  // `montarCentro`, así que un observer clavado a ese nodo se quedaba sin
  // objetivo. La región, en cambio, vive lo que vive el shell.
  //
  // No se realimenta: el estirado escribe `style.height`, un cambio de
  // atributo, y acá se observa solo `childList`.
  function observarContenidoCentral(shell) {
    if (typeof MutationObserver !== 'function') return;
    new MutationObserver(() => estirarDecisionAlPiso())
      .observe(shell.regiones.centro, { childList: true, subtree: true });
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
    renderRanking({ tablas: tablasDeDivisiones(partida.mundo, partida.jugador) });
  }

  // Asegura el shell y REFRESCA los tres paneles del tablero con la partida
  // actual, según la grilla 3×3 (v4, feedback del usuario: "en PC no se
  // aprovecha bien el ancho"):
  //   - izquierda: personaje, cinturones, tu rincón, categoría/ranking.
  //   - centro: atributos, estado, y lo que esté pasando ahora (contenido).
  //   - derecha: calendario+dinero, próxima pelea, noticias. (El panel de
  //     "Archirrival" que vivía acá se sacó del tablero, Pedido 6, v9.)
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
    //
    // Pedido 3 (v8): mientras se muestra el resumen de fin de año,
    // `sinAtributosEstado` pide ocultar estos dos bloques con `display:none`
    // (clase `.oculto`, ver theme.css) para que el resumen tenga más lugar.
    // Se los sigue MONTANDO igual (renderPanelAtributos/Estado corren
    // siempre, un par de líneas más abajo): más simple que bifurcar la
    // lógica, y ocultos con CSS no aportan nada raro a la accesibilidad
    // (display:none los saca del árbol). Solo afecta el alto de la columna
    // CENTRAL — cada región del shell es su propia columna independiente
    // (ver shell.js), así que izquierda/derecha ni se enteran.
    shell.montarCentro(el('div', { class: 'stack' }, [
      el('div', { dataset: { bloque: 'atributos' }, class: sinAtributosEstado ? 'oculto' : null }),
      el('div', { dataset: { bloque: 'estado' }, class: sinAtributosEstado ? 'oculto' : null }),
      el('div', { dataset: { bloque: 'contenido' } }),
    ]));
    renderPanelAtributos(shell.regiones.centro.querySelector('[data-bloque="atributos"]'), { jugador: partida.jugador });
    // `onCurar` (Pedido 3, v7): el botón de curar una lesión vivía en la
    // pantalla intermedia "Lo que viene ahora" (panel-avance.js, ya
    // eliminada) — ahora vive acá, en el panel de Estado, siempre visible sin
    // importar qué tarjeta esté mostrando el bloque de abajo.
    renderPanelEstado(shell.regiones.centro.querySelector('[data-bloque="estado"]'), { jugador: partida.jugador, onCurar: curar });

    // `class:'stack'` (v3, feedback del usuario: "está muy pegada al módulo
    // de arriba del próximo combate"): antes este wrapper no tenía clase, así
    // que el gap:10px de `.shell-region` (pensado para sus hijos DIRECTOS)
    // nunca llegaba a aplicarse entre módulos — vivían pegados dentro de este
    // único hijo. `.stack` es el mismo respiro que ya separa a todos los
    // demás paneles del tablero.
    shell.montarDerecha(el('div', { class: 'stack' }, [
      el('div', { dataset: { bloque: 'calendario' } }),
      el('div', { dataset: { bloque: 'dinero' } }),
      el('div', { dataset: { bloque: 'proxima' } }),
      el('div', { dataset: { bloque: 'noticias' } }),
    ]));
    renderCalendario(shell.regiones.derecha.querySelector('[data-bloque="calendario"]'), { partida });
    renderPanelDinero(shell.regiones.derecha.querySelector('[data-bloque="dinero"]'), propsPanelDinero());
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

    // Pedido 1 (v10, "el módulo de noticias tiene que tener de piso la
    // misma altura que el piso del módulo de ranking [la columna
    // izquierda]"): la lista de noticias ya tiene un `height` fijo (no
    // depende de cuántas noticias haya, ver panel-noticias.js) — esto la
    // acota un paso más, al piso REAL de la izquierda en esta partida
    // puntual (que no es una constante: crece un escalón la primera vez que
    // el jugador tiene historial de peleas, ver el comentario grande de
    // sincronizar-alturas.js). Corre en cada montarTablero(), así que sigue
    // valiendo beat tras beat, no solo al arrancar la carrera.
    //
    // `propiedad:'height'` (v14, Pedido 2b: "el panel de noticias no cierra
    // a la misma altura que la columna izquierda"): panel-noticias-lista
    // quiere un alto FORZADO (no content-hugging, ver su propio comentario
    // grande) — pisar `max-height` (el default de esta función, pensado
    // para `.resumen-anio-cuerpo`) nunca alcanza para CRECER por encima del
    // `height` fijo de la hoja de estilos, así que acá se pisa esa misma
    // propiedad directo. Ver sincronizar-alturas.js para el detalle.
    limitarAlAltoDeIzquierda({
      izquierda: shell.regiones.izquierda,
      columna: shell.regiones.derecha,
      elemento: shell.regiones.derecha.querySelector('.panel-noticias-lista'),
      propiedad: 'height',
    });

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
    estirarDecisionAlPiso();
  }

  // Pedido del usuario (v15): "todavía queda el hueco libre en la zona
  // central inferior (la parte de las decisiones). Siempre tiene que ocupar
  // ese hueco en la pantalla, nunca más y nunca menos tampoco."
  //
  // El panel de decisión mide lo que miden sus tarjetas, así que con dos
  // opciones cortas terminaba ~108px por encima del piso de la izquierda.
  // Acá se lo estira (o se lo achica) para que cierre EXACTO contra ese
  // piso, con la misma función que ya alinea el módulo de noticias.
  //
  // Solo toca `.panel-decision`: el resumen de fin de año tiene su propio
  // acuerdo con la izquierda (`.resumen-anio-cuerpo`, ver montarTablero) y
  // la pelea vive fuera del tablero, así que ninguno pasa por acá.
  function estirarDecisionAlPiso() {
    const shell = shellActual;
    if (!shell) return;
    // GENÉRICO a propósito (v16): se estira lo que sea que esté montado en el
    // centro, no una lista de pantallas conocidas. La primera versión nombraba
    // `.panel-decision` y `.resumen-anio` una por una, y por eso el hueco
    // seguía apareciendo en las otras cinco pantallas centrales (la card de
    // trámite, el desenlace, la oferta, el sparring, el minijuego). Cada una
    // de esas funciones hace `mount(region, unNodo)`, así que el contenido
    // central es siempre un único hijo: ese es el que se estira, y cualquier
    // pantalla que se agregue mañana queda cubierta sin tocar esto.
    const contenido = shell.regiones.centro.querySelector('[data-bloque="contenido"]');
    const objetivo = contenido?.firstElementChild;
    if (!objetivo) return;
    limitarAlAltoDeIzquierda({
      izquierda: shell.regiones.izquierda,
      columna: shell.regiones.centro,
      elemento: objetivo,
      propiedad: 'height',
      estirarPorEncimaDelContenido: true,
    });
  }

  // Registra QUÉ pintar en el centro ahora mismo y lo pinta ya (asegurando el
  // shell y refrescando los laterales primero). Todo lo que ocurre "dentro
  // del tablero" —el estado ocioso, cada beat, cada desenlace— pasa por acá
  // exactamente una vez por transición.
  //
  // `ocultarAtributosEstado` (Pedido 3, v8): default `false` a propósito —
  // solo `beatResumenAnio` lo pide en `true`; cualquier otro llamador (la
  // inmensa mayoría) lo deja en `false` sin tener que acordarse de nada, así
  // que apenas el jugador avanza a un beat normal el panel vuelve solo.
  function centro(pintar, { ocultarAtributosEstado = false } = {}) {
    pintarCentro = pintar;
    sinAtributosEstado = ocultarAtributosEstado;
    volverAlTablero();
  }

  // Pedido 3 (v7, "no quiero que se vea 'lo que viene ahora', debe pasar
  // directo a la próxima tarjeta de acción"): la pantalla intermedia "entre
  // beats" (panel-avance.js, con su botón "Continuar" + el dado de
  // transición) se elimina del todo — nunca se pinta, ni por un instante. Al
  // resolver una tarjeta (elegir una opción, rechazar una oferta, cerrar una
  // negociación) el juego llama directo a `siguiente()`, que ya se encarga
  // de pintar lo que sigue en la MISMA región central. `curar` (antes vivía
  // en esa pantalla) se mudó al panel de Estado (siempre visible, ver
  // montarTablero/renderPanelEstado) y ya NO avanza ningún beat — solo
  // refresca el tablero con la lesión curada, dejando la tarjeta actual tal
  // cual estaba.
  function curar() {
    const paso = curarConDinero(partida.jugador, partida.jugador.estado.lesion);
    if (paso.ok) partida = { ...partida, jugador: paso.peleador };
    persistir();
    volverAlTablero();
  }

  // Reemplaza a mostrarDesenlace/renderDesenlace para las decisiones (Task
  // v3, feedback del usuario): ya no hay pantalla de resultado con botón
  // "Seguir" — se aplica el efecto y la carrera sigue derecho a la próxima
  // tarjeta (Pedido 3, v7: tampoco hay ya una pantalla intermedia "entre
  // beats" en el medio). Lo único que le avisa al jugador qué cambió es la
  // animación de números + el resalte verde/rojo de SOLO las filas de
  // atributo que cambiaron (antes, `shell.destacar('izquierda')` hacía
  // brillar TODO el módulo izquierdo por cualquier cambio — queja textual).
  // Desde la grilla 3×3 (v4) los atributos/estado viven en la columna
  // CENTRAL, no en la izquierda — ver montarTablero.
  //
  // El ORDEN importa: animar tiene que pasar DESPUÉS de `siguiente()` (que
  // llama a montarTablero(), y esa SIEMPRE repinta atributos/estado desde
  // cero — ver montarTablero). Animar ANTES se pierde en el mismo tick:
  // mount() no diffea, así que el segundo repintado deja huérfanos los nodos
  // que `animarAtributos`/`destacarAtributos` acababan de tocar, sin que el
  // navegador llegue a pintar ese estado intermedio. Si `siguiente()` cerró
  // la carrera (`partida.terminada`), `contenedor` ya lo reemplazó
  // `finDeCarrera()` con la pantalla de legado — animar ahí no tiene sentido
  // (y `shellActual` quedó apuntando a un nodo que ya no está montado).
  function aplicarEfectoYSeguir({ jugador, rivalidades = partida.rivalidades, deltas = {} }) {
    partida = { ...partida, jugador, rivalidades };
    // Resumen de fin de año: este es el ÚNICO punto donde main.js aplica el
    // efecto de una decisión sobre el jugador (mejora/evento/redes/sparring/
    // campamento no-final) — mismo criterio que el comentario grande de
    // arriba explica para `siguiente()`. Una sola muestra de media acá cubre
    // TODOS esos beats sin tener que tocar cada uno por separado.
    partida = registrarMuestraMedia(partida);
    siguiente();
    if (partida.terminada) return;
    animarAtributos(shellActual.regiones.centro, deltas);
    destacarAtributos(shellActual.regiones.centro, deltas);
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
  // `persistir()` vive ACÁ (no en cada llamador): es el único punto de
  // entrada que de verdad avanza la carrera un beat, así que es el único
  // lugar que hace falta para que el autoguardado quede siempre justo antes
  // del próximo beat (todavía sin consumir) — mismo momento que antes
  // guardaba `irADashboard()` (Pedido 3, v7: esa pantalla intermedia ya no
  // existe, pero el momento del guardado es el mismo).
  function siguiente() {
    persistir();
    const etapaAntes = etapaActual(partida).id;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const hitoEtapa = hitoDeEtapa({ etapaAnteriorId: etapaAntes, etapaNueva: etapaActual(partida) });
    if (partida.terminada) return finDeCarrera();
    // `!paso.beat` no debería poder pasar en la práctica (armarCola siempre
    // deja al menos el beat 'mejora' en la cola de un bloque nuevo — ver el
    // comentario grande de career.js): red de seguridad, no un estado real.
    if (!paso.beat) { volverAlTablero(); if (hitoEtapa) mostrarHito(hitoEtapa); return; }
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
    if (beat.tipo === 'tramiteDestacado') return beatTramiteDestacado(beat);
    if (beat.tipo === 'resumenAnio') return beatResumenAnio(beat);
    return volverAlTablero();
  }

  // Resumen de fin de año (pedido textual del usuario): vive en la región
  // central del tablero como cualquier otro beat (career.js ya lo armó con
  // todo lo que hace falta — media/decisiones/peleas del año que cerró, ver
  // el comentario grande en siguienteBeat, career.js). La crónica se compone
  // ACÁ, con el rng cosmético (nunca el de la carrera: es sabor, no una
  // decisión de juego — mismo criterio que `textoResultadoDestacado`, más
  // arriba). Un solo botón ("Seguir") pasa a lo que siga en la cola.
  //
  // v8, Pedido 2 ("las peleas llevan la bandera del rival"): el historial de
  // peleas (aplicarResultado, offers.js) solo guarda rivalId/nombre/apodo/
  // media — nunca duplicó la nacionalidad porque ya vive en el roster del
  // mundo. Se busca ACÁ, solo para esta pantalla: el roster nunca borra a un
  // rival retirado (world.js lo marca `retirado:true`, nunca lo saca del
  // array), así que el id siempre resuelve, aunque el resumen sea de varios
  // años atrás.
  function beatResumenAnio(beat) {
    const {
      anio, muestrasMedia, decisiones, peleas,
    } = beat.datos;
    const narrativa = textoResumenAnio(rng, { peleas });
    const peleasConBandera = peleas.map((p) => ({
      ...p,
      rivalNacionalidad: partida.mundo.roster.find((r) => r.id === p.rivalId)?.nacionalidad ?? null,
    }));
    // Pedido 3 (v8): mientras se ve el resumen, atributos/estado se ocultan
    // para que respire (ver `sinAtributosEstado` y `centro()`, más arriba).
    centro(() => {
      renderResumenAnio(centroContenido(), {
        anio, muestrasMedia, decisiones, peleas: peleasConBandera, narrativa,
        onContinuar: () => siguiente(),
      });
      // v15: el resumen entero se estira al piso de la izquierda en
      // `estirarDecisionAlPiso` (arriba), y su cuerpo se queda con el
      // sobrante por flex (theme.css, bloque v15). Antes se acotaba el
      // cuerpo acá con un `max-height`, pero las dos cosas se peleaban: ese
      // tope le impedía crecer, así que el contenedor se estiraba y el botón
      // "Seguir" quedaba flotando arriba con el hueco debajo. Una sola
      // autoridad sobre la altura, no dos.
      estirarDecisionAlPiso();
    }, { ocultarAtributosEstado: true });
  }

  // v6, segunda vuelta ("no todas las peleas se juegan igual"): las peleas
  // de trámite (esPeleaImportante, offers.js; armarLotePeleas, tramite.js) ya
  // llegan acá RESUELTAS — career.js las aplicó al jugador dentro de
  // armarCola, antes de que este beat exista. Acá solo hay que mostrar el
  // resumen con sabor (titulo/texto ya armados por resumenLote) y un
  // detalle corto de cada combate. El destacado del lote (si lo hubo, ver
  // PROB_DESTACADO_TRAMITE en tramite.js) es un beat APARTE — ver
  // beatTramiteDestacado, más abajo — así que acá nunca hace falta revisar
  // nada de eso.
  //
  // Bloque 6 (Task 5.3, "la tarjeta previa a la pelea"): `beat.datos.charla`
  // es la voz del entrenador avisando contra quién fue la pelea, ANTES del
  // resultado — career.js la fusiona siempre que este beat existe (ver el
  // comentario grande de `armarCola`, career.js), así que acá solo hace
  // falta pasarla como `previa` de `renderDesenlace` para que aparezca
  // arriba del resumen, en el mismo "Seguir".
  const METODO_TEXTO_TRAMITE = {
    ko: 'KO', tko: 'TKO', decision: 'decisión', sumision: 'sumisión',
  };

  function deltasTextoTramite(resultados) {
    return resultados.map((r) => {
      const rival = r.rivalApodo ?? r.rivalNombre;
      const veredicto = r.resultado === 'v' ? 'Ganaste' : r.resultado === 'e' ? 'Empataste' : 'Perdiste';
      const metodo = METODO_TEXTO_TRAMITE[r.metodo] ?? r.metodo;
      return `${veredicto} vs ${rival} (${metodo})`;
    });
  }

  function beatPeleasResueltas(beat) {
    const {
      titulo, texto, resultados, charla,
    } = beat.datos;
    centro(() => renderDesenlace(centroContenido(), {
      titulo,
      texto,
      previa: charla ?? '',
      // El lote se muestra como una fila de emblemas (uno por pelea) en vez
      // de la línea de texto corrida de antes — pedido v17.9, punto 3.
      resultados: resultados.map((r) => ({
        rival: r.rivalApodo ?? r.rivalNombre,
        resultado: r.resultado,
        metodo: r.metodo,
      })),
      onContinuar: () => siguiente(),
    }));
  }

  function textoFaltanSemanas(semanas) {
    if (semanas <= 0) return 'Es esta semana';
    return `Faltan ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }

  // Marcador con la perspectiva del JUGADOR siempre primero (ej. "0-3" si
  // perdió 0 a 3) — mismo criterio que el récord del jugador en el resto del
  // tablero, nunca "el marcador del que ganó" primero.
  function textoMarcador(marcador) {
    return `${marcador.jugador}-${marcador.rival}`;
  }

  function textoResultadoDestacado({
    detalle, resultado, rivalApodo, rivalNombre, marcador,
  }) {
    const pool = RESULTADO_DESTACADO_TRAMITE[detalle]?.[resultado] ?? [];
    if (pool.length === 0) return '';
    const plantilla = rng.pick(pool);
    const mote = rivalApodo ?? rivalNombre;
    return plantilla.replace(/\{rival\}/g, mote).replace(/\{marcador\}/g, textoMarcador(marcador));
  }

  // Pedidos 1 y 2 (v7): el destacado de trámite (a lo sumo uno por lote —
  // PROB_DESTACADO_TRAMITE, tramite.js) ya no aparece resuelto de la nada:
  // se juega en tres fases dentro del MISMO beat (tarjeta del rival, con el
  // anuncio del entrenador ya adentro -> minijuego, ronda a ronda de
  // verdad -> resultado), nunca una pantalla aparte. Corrección del
  // coordinador ("el pick del jugador no puede ser cosmético"): a
  // diferencia de un primer borrador de esta ronda, ACÁ no hay ningún
  // marcador precalculado — cada ronda se resuelve en el momento, con el rng
  // de sesión (mismo criterio que la pelea real completa, fight-
  // interactive.js vía crearPelea: el resultado recién se aplica al cerrar,
  // con aplicarResultado, más abajo). El resto del lote (si lo hubo) viaja
  // ya resuelto en `resumenResto` (career.js lo fusiona ahí para no gastar
  // un beat + un click aparte) y se narra junto al resultado del destacado.
  function beatTramiteDestacado(beat) {
    const {
      oferta, alMejorDe, semanasPorIntento, resumenResto,
    } = beat.datos;
    const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId) ?? null;
    const necesarias = rondasParaGanar(alMejorDe);

    // `fase` es SIEMPRE una de 'card' | 'minijuego' | 'resultado' — nunca
    // otra cosa (evita mezclar el estado de "qué pantalla toca" con los
    // datos del desenlace, que viven en `resultadoFinal` aparte).
    let fase = 'card';
    let puntosJugador = 0;
    let puntosRival = 0;
    let ultimaRondaTexto = null;
    let numeroRonda = 1;
    let resultadoFinal = null; // { detalle, resultadoLetra } una vez definida la pelea

    function pintarTramite() {
      if (fase === 'card') {
        renderCardTramite(centroContenido(), {
          oferta,
          rival,
          semanas: semanasPorIntento,
          apertura: rng.pick(ANUNCIO_TRAMITE),
          onSimular: () => { fase = 'minijuego'; pintarTramite(); },
        });
        return;
      }
      if (fase === 'minijuego') {
        const control = renderMinijuegoRonda(centroContenido(), {
          titulo: `Ronda ${numeroRonda} de hasta ${alMejorDe}`,
          bajada: `Vos ${puntosJugador} - ${puntosRival} Rival`,
          texto: ultimaRondaTexto ?? `Elegí cómo boxear esta ronda contra "${oferta.rivalApodo ?? oferta.rivalNombre}".`,
          opciones: opcionesMinijuego(),
          // La ronda se juega de verdad acá: el rng de sesión "elige" por
          // el rival (sesgado por la diferencia de media — ver
          // resolverRondaMinijuego, tramite.js) y el resultado sale de
          // comparar esa elección con la del jugador en el ciclo. El pick
          // del jugador SÍ cambia lo que pasa — no es una animación sobre
          // un resultado ya decidido. Se resuelve en el click (no al
          // terminar el barajado) porque el barajado necesita saber en qué
          // tarjeta frenar: el jugador ve dónde cae el rolleo.
          resolverRonda: (accionId) => resolverRondaMinijuego(rng, {
            jugador: partida.jugador, rivalMedia: oferta.rivalMedia, eleccionJugador: accionId,
          }),
          onElegir: (accionId, datos) => {
            const { eleccionRival, resultado } = datos;
            const gano = resultado === 'jugador';
            if (gano) puntosJugador += 1; else puntosRival += 1;
            ultimaRondaTexto = `Elegiste "${NOMBRE_ACCION[accionId]}", el rival fue a "${NOMBRE_ACCION[eleccionRival]}" — ${gano ? 'ganaste' : 'perdiste'} la ronda.`;
            numeroRonda += 1;
            if (puntosJugador < necesarias && puntosRival < necesarias) { pintarTramite(); return; }

            // Se definió: cierra el combate (aplicarResultado, como
            // cualquier pelea) y limpia `proximaPelea` ANTES de repintar
            // (mismo criterio que cerrarPelea con una pelea grande), así el
            // panel de la derecha ya sale limpio en el mismo repintado.
            const { metodo, ganador, detalle } = resultadoDeMarcador(
              { jugador: puntosJugador, rival: puntosRival },
              alMejorDe,
            );
            const round = roundDeCierreMinijuego(rng, { jugador: partida.jugador, oferta, metodo });
            // `semanaGlobal` (resumen de fin de año): sin esto, el destacado
            // de trámite quedaba con `fecha: null` en el historial, igual que
            // el resto del lote antes del fix de armarLotePeleas (tramite.js)
            // — invisible para el filtro por año (peleasDelAnio,
            // year-summary.js).
            const paso = aplicarResultado(partida.jugador, {
              oferta, resultado: { ganador, metodo, round }, modo: 'tramite', semanaGlobal: partida.semanaGlobal,
            });
            partida = { ...partida, jugador: paso.jugador, proximaPelea: null };
            resultadoFinal = { detalle, metodo, resultadoLetra: ganador === 'jugador' ? 'v' : 'd' };
            fase = 'resultado';
            centro(pintarTramite);
          },
        });
        // Mismo criterio que el roll de cartas: si el jugador ya eligió y se
        // va del tablero a mitad del barajado, la ronda se resuelve ya en vez
        // de quedar un timer colgado (ver animarBarajado en roll.js).
        cancelarRollPendiente = () => {
          cancelarRollPendiente = null;
          control.detener();
        };
        return;
      }
      // fase === 'resultado': `proximaPelea` ya se limpió y el resultado ya
      // se aplicó al jugador (arriba) — solo queda narrar el desenlace.
      const { detalle, metodo: metodoFinal, resultadoLetra } = resultadoFinal;
      const restoTexto = resumenResto ? ` ${resumenResto.texto}` : '';
      renderDesenlace(centroContenido(), {
        titulo: resultadoLetra === 'v' ? 'Ganaste' : 'Perdiste',
        // El desenlace de una pelea se corona con el emblema del método
        // (v17.9): el dibujo dice cómo terminó y el color si ganaste.
        resultado: resultadoLetra,
        metodo: metodoFinal ?? 'decision',
        texto: `${textoResultadoDestacado({
          detalle,
          resultado: resultadoLetra,
          rivalApodo: oferta.rivalApodo,
          rivalNombre: oferta.rivalNombre,
          marcador: { jugador: puntosJugador, rival: puntosRival },
        })}${restoTexto}`,
        deltasTexto: [`Bolsa: ${fmtDinero(oferta.bolsa)}`, textoMarcador({ jugador: puntosJugador, rival: puntosRival })],
        onContinuar: () => siguiente(),
      });
    }

    // Pedido 1: activa panel-proxima.js (columna derecha) con el rival, la
    // bolsa y la cuenta regresiva ANTES de mostrar nada resuelto.
    partida = {
      ...partida,
      proximaPelea: { oferta, semanaObjetivo: (partida.semanaGlobal ?? 1) + semanasPorIntento },
    };
    centro(pintarTramite);
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
      onContinuar: () => siguiente(),
    }));
  }

  function beatMejora(beat) {
    const cartas = beat.datos.cartas;
    centro(() => renderPanelDecision(centroContenido(), {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: textoCantidadMejoras(cartas.length),
      opciones: cartas.map((c) => cartaMejoraAOpcion(c, partida.jugador)),
      onElegir: (id) => {
        const carta = cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        // Resumen de fin de año: la mejora es la ÚNICA decisión garantizada
        // en todos los bloques — se registra ANTES de aplicarEfectoYSeguir
        // (que reasigna `partida` con el jugador ya actualizado; el registro
        // viaja con ella, ver registrarDecision en career.js).
        partida = registrarDecision(partida, { tipo: 'mejora', titulo: 'Mejora', opcion: carta.titulo });
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
  // seguir: tiempo de sobra para leer una frase corta sin frenar el ritmo de
  // la carrera al repetirse. No es una animación de movimiento (nada se
  // mueve mientras tanto), así que no depende de prefers-reduced-motion como
  // sí lo hace animarRoll.
  //
  // Bug reportado (v9, "el roll de los dados ocurre demasiado rápido, no da
  // margen a ver qué fue lo que pasó"): la causa real no era `animarRoll`
  // (roll.js, DURACION_MS=1500, ya dentro de la ventana 1200-1800ms pedida y
  // sin tocar acá) sino ESTA pausa — 1100ms es muy poco para registrar que
  // apareció una frase nueva Y leerla completa (los textos de rama son cortos,
  // pero de todos modos una oración entera). Subida a 2200ms: de sobra para
  // leer una frase corta con calma, sin que se sienta como una espera muerta.
  // Presupuesto de minutos (medido con un script puntual, no versionado, 300
  // semillas "jugando bien" con el mismo criterio que balance-sim.mjs):
  // ~3.2 rolls/carrera en promedio (máx. 9), así que el aumento de +1100ms
  // suma ~3.5s por carrera en el caso típico — muy por debajo del margen de
  // 1 minuto que el brief permite para este ajuste.
  const PAUSA_RESULTADO_MS = 2200;

  // Resuelve una opción (con o sin `probabilidades`) y, si tiene azar, corre
  // el roll con suspenso sobre la propia tarjeta antes de avisar el
  // resultado — EXACTAMENTE el mismo comportamiento para evento/redes
  // (beatCarta) y, desde Pedido 2 (v7, "más tarjetas de %... también en el
  // campamento"), también para campamento (beatCampCarta): una carta de
  // azar tiene que sentirse igual de tensa esté donde esté, no solo en
  // evento/redes. `alTerminar(resuelto)` es quien decide qué pasa DESPUÉS de
  // aplicar el efecto — seguir al próximo beat (el caso de siempre) o, en
  // campamento, pasar al careo si era el último beat antes de la pelea.
  function resolverConRoll({
    carta, opcionId, rivalObjetivoId = null, alTerminar,
  }) {
    const opcion = carta.opciones.find((o) => o.id === opcionId);
    const resuelto = resolverOpcion(rng, {
      jugador: partida.jugador, carta, opcionId, rivalidades: partida.rivalidades, rivalObjetivoId,
    });
    const terminar = () => alTerminar(resuelto);

    if (!opcion.probabilidades) { terminar(); return; }

    const nodoTarjeta = centroContenido().querySelector(`[data-opcion="${opcionId}"]`);

    // Ver el comentario largo junto a la declaración de
    // `cancelarRollPendiente`: si el jugador se va del tablero (Ficha) antes
    // de que el roll o la pausa de lectura terminen, esto resuelve YA el
    // efecto (que `resolverOpcion` ya decidió más arriba, de forma síncrona)
    // sin pintar nada — el tablero no está a la vista.
    //
    // `rollResuelto` evita pisar, con un cancelador viejo, el que recién dejó
    // puesto `onFin` si `animarRoll` resolvió síncrono (motion reducido, o
    // una sola rama posible): sin el guard, un roll ya terminado quedaría
    // con `cancelarRollPendiente` apuntando igual a "cancelar el roll" en vez
    // de a "cancelar la pausa de lectura", y aplicaría el efecto DOS VECES si
    // el jugador entra a la Ficha después.
    let rollResuelto = false;
    const controladorRoll = animarRoll(nodoTarjeta, {
      indiceGanador: resuelto.indiceGanador,
      cantidad: opcion.probabilidades.length,
      onFin: () => {
        rollResuelto = true;
        mostrarResultadoEnTarjeta(nodoTarjeta, resuelto.texto || carta.texto);
        const timerId = setTimeout(() => {
          cancelarRollPendiente = null;
          terminar();
        }, PAUSA_RESULTADO_MS);
        cancelarRollPendiente = () => {
          clearTimeout(timerId);
          cancelarRollPendiente = null;
          terminar();
        };
      },
    });
    if (!rollResuelto) {
      cancelarRollPendiente = () => {
        controladorRoll.detener();
        cancelarRollPendiente = null;
        terminar();
      };
    }
  }

  function beatCarta(beat, titulo, nombreIcono) {
    const carta = beat.datos.carta;

    centro(() => renderPanelDecision(centroContenido(), {
      titulo,
      bajada: carta.titulo,
      texto: carta.texto,
      rareza: carta.rareza,
      opciones: carta.opciones.map((o) => opcionCartaAOpcion(o, nombreIcono)),
      onElegir: (id) => {
        const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
        // Resumen de fin de año: se registra la opción elegida ANTES de
        // resolverConRoll — el roll (si la carta tiene azar) es puramente
        // cosmético, la decisión que el jugador tomó fue justo esta.
        const opcionElegida = carta.opciones.find((o) => o.id === id);
        partida = registrarDecision(partida, { tipo: beat.tipo, titulo: carta.titulo, opcion: opcionElegida?.texto ?? '' });
        resolverConRoll({
          carta,
          opcionId: id,
          rivalObjetivoId,
          // `caePelea` (Task v3, "cartas nuevas con azar"): la rama que salió
          // canceló de verdad la pelea que estuviera en danza este bloque, no
          // solo en el texto de la tarjeta — ver cancelarProximaPelea en
          // career.js. Se aplica ANTES de aplicarEfectoYSeguir (que pinta el
          // tablero ocioso): así el panel de "próxima pelea" ya sale limpio
          // en el mismo repintado, sin un instante intermedio con la oferta
          // vieja todavía puesta.
          alTerminar: (resuelto) => {
            if (resuelto.caePelea) partida = cancelarProximaPelea(partida);
            aplicarEfectoYSeguir({
              jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas,
            });
          },
        });
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
          // El envión de cardio que se gasta en la próxima pelea (v17, "que
          // este minijuego tenga algún impacto real"). Se guarda ANTES de
          // aplicarEfectoYSeguir: ese camino repinta y persiste la partida, y
          // el bonus tiene que viajar en ese mismo guardado.
          partida = guardarBonusProximaPelea(partida, resultado.bonusTemporal);
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
        // Resumen de fin de año: mismo criterio que beatCarta (evento/redes)
        // — se registra la opción elegida antes del roll cosmético.
        const opcionElegida = carta.opciones.find((o) => o.id === id);
        partida = registrarDecision(partida, { tipo: 'campamento', titulo: carta.titulo, opcion: opcionElegida?.texto ?? '' });
        // Pedido 2 (v7): el campamento ya puede traer cartas con azar (ver
        // cards-camp.js) — `resolverConRoll` les da el mismo roll con
        // suspenso que evento/redes, en vez de aplicar el efecto de una.
        resolverConRoll({
          carta,
          opcionId: id,
          alTerminar: (resuelto) => {
            if (ultimo) {
              partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
              // Resumen de fin de año: este es el ÚNICO camino de campamento
              // que NO pasa por aplicarEfectoYSeguir (va directo al careo) —
              // sin esto, la muestra de media del ÚLTIMO beat de campamento
              // se perdía.
              partida = registrarMuestraMedia(partida);
              careo(oferta);
              return;
            }
            aplicarEfectoYSeguir({ jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas });
          },
        });
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
          // Igual que en beatSparring: el envión se guarda pase lo que pase,
          // tanto si esta era la última sesión del campamento (se va derecho
          // al careo) como si todavía quedan más.
          partida = guardarBonusProximaPelea(partida, resultado.bonusTemporal);
          if (ultimo) {
            partida = { ...partida, jugador: aplicado.jugador };
            // Resumen de fin de año: mismo motivo que en beatCampCarta — este
            // camino no pasa por aplicarEfectoYSeguir.
            partida = registrarMuestraMedia(partida);
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
  // cualquier otra decisión) resuelve derecho al estado ocioso; rechazar no
  // toca ningún atributo (v13: ya no cuesta fama, ver rechazarOferta,
  // offers.js), así que no hay nada para animar/destacar acá. Al ACEPTAR es
  // cuando arranca la pipeline a pantalla completa (negociación → careo →
  // plan → pelea): esa sí sigue siendo pantallas grandes con su propia
  // puesta en escena, decisión ya tomada.
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
        siguiente();
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
        // Firmar deja el campamento de preparación al frente de la cola
        // (firmarPelea, career.js): `siguiente()` lo muestra derecho, sin la
        // pantalla intermedia de antes (Pedido 3, v7).
        siguiente();
      },
      // Rechazar la pelea DESDE la negociación (Task v3, pedido textual: el
      // botón "tiene que estar siempre disponible", incluso con la
      // negociación bloqueada por un apriete fallido). Misma consecuencia
      // que rechazar la oferta antes de negociar (ver beatOferta): vuelve al
      // tablero, sin firmar nada.
      onRechazar: () => {
        const paso = rechazarOferta(partida.jugador, oferta);
        partida = { ...partida, jugador: paso.jugador, ofertaPendiente: null };
        siguiente();
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
        // v13: el careo ya no toca fama ni moral del jugador —ninguno de los
        // dos existe más, ver stats.js— así que `bonusFama`/`bonusMoral`
        // (resultadoCareo, presser.js) se quedan como el resultado "en vivo"
        // que ya se ve en la propia pantalla del careo (bloqueResumen,
        // ui/screens/presser.js): hype y ventaja mental narran cómo quedó
        // PARADO el careo, no algo que haya que guardarle al jugador. Lo
        // único que de verdad se aplica es la calentura del rival, que sigue
        // alimentando el sistema de rivalidades.
        const r = resultadoCareo(estado);
        partida = {
          ...partida,
          rivalidades: subirHeat(partida.rivalidades, oferta.rivalId, r.heatRival),
        };
        // v17.9: la ventaja mental del careo YA NO muere en su propia
        // pantalla. Viaja a la pelea que viene —que es ésta— como envión
        // temporal de agilidad, y puede ser negativa si el rival te ganó la
        // cabeza. Mismo camino que el sparring: se gasta en un combate y
        // nunca toca la ficha.
        partida = guardarBonusProximaPelea(partida, r.bonusTemporal);
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
    // Se gasta acá el envión que dejó el sparring: `jugadorEnElRing` es el
    // peleador con el cardio levantado, y va SOLO a `crearPelea` — nunca
    // vuelve a `partida.jugador`, así que el envión no sobrevive al combate.
    // La pelea entera (snapshot incluido) se arma con esos números, que es
    // exactamente lo pedido: entrenar bien se nota en el ring y en ningún
    // otro lado.
    const consumido = consumirBonusProximaPelea(partida);
    partida = consumido.partida;
    let pelea = crearPelea({
      jugador: consumido.jugador, rival,
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
        // Pedido 3 (v7): sin pantalla intermedia entre el resumen de la
        // pelea y lo próximo — "Continuar" pasa derecho a la siguiente
        // tarjeta (mismo criterio que cualquier otro beat resuelto).
        onContinuar: () => siguiente(),
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
  // lesión, título, rivalidades) y actualiza `partida` — pero NO
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
    // El cinturón cambia de dueño en el mundo, no solo en la ficha del
    // jugador: si lo perdió, el rival queda anotado como campeón y la próxima
    // pelea por ese título va a ser contra ÉL (ver divisiones.js).
    partida = aplicarCambioDeCampeon(partida, {
      oferta, gano: pelea.resultado.ganador === 'jugador',
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

  // Pedido 3 (v7): retomar una partida guardada (o recién creada) ya no pasa
  // por la pantalla intermedia — `siguiente()` muestra derecho lo que sigue
  // en la cola (el mismo beat que estaba pendiente cuando se guardó, si lo
  // había) o arma el próximo bloque si hace falta.
  function arrancar() {
    if (partida && !partida.terminada) return siguiente();
    if (partida && partida.terminada && partida.legado) return finDeCarrera();
    renderCreacion(contenedor, {
      onComenzar: (jugador) => {
        const semilla = Date.now();
        // Bloque 6 (spec v13, "que el talento y el reparto inicial pesen
        // más" — la palanca central de rejugabilidad): `renderCreacion`
        // (create.js) construye `jugador` con `crearPeleador` SIN pasarle un
        // rng — cae al default de fighter.js (`createRng(1)`, fijo, pensado
        // para tests deterministas). Eso significa que, sin este arreglo,
        // TODO peleador jugador salía con el MISMO talento y el MISMO
        // reparto inicial de atributos en cada carrera nueva — el eje entero
        // que calibra este bloque (sortearTalento/repartirAtributosIniciales)
        // nunca llegaba a pesar en una partida real, solo en las mediciones
        // sintéticas de scripts/balance-sim.mjs (que tenía el mismo bug, ya
        // corregido ahí también).
        //
        // Se vuelve a tirar acá, con el rng real de la sesión (semilla), SIN
        // tocar create.js (fuera de alcance de este bloque): se reconstruye
        // el mismo peleador con `crearPeleador`, pasándole exactamente lo que
        // el jugador ya eligió en la pantalla de creación (apellido, apodo,
        // nacionalidad, estilo, categoría, origen, mano) más el rng nuevo.
        // `media: 38` tiene que coincidir con el mismo número que usa
        // create.js — si ese archivo cambia su media base, este también.
        const jugadorConTalento = crearPeleador({
          apellido: jugador.apellido,
          apodoId: jugador.apodoId,
          nacionalidad: jugador.nacionalidad,
          disciplina: jugador.disciplina,
          estilo: jugador.estilo,
          categoria: jugador.categoria,
          origen: jugador.origen,
          mano: jugador.mano,
          esJugador: true,
          media: 38,
          rng: createRng(semilla),
        });
        partida = crearPartida({ jugador: jugadorConTalento, semilla });
        rng = createRng(semilla + 7777);
        siguiente();
      },
    });
  }

  renderLogin(contenedor, { onEntrar: arrancar, storage });
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  iniciar();
}
