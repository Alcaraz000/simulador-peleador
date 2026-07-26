import { createRng } from './core/rng.js';
import { crearPartida, siguienteBeat } from './core/career.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
import { aplicarCarta, formatearMods, porcentajesDe } from './core/cards.js';
import { resolverOpcion } from './core/events.js';
import { aplicarResultado, rechazarOferta } from './core/offers.js';
import { crearNegociacion, jugarMovida, resultadoNegociacion } from './core/negotiation.js';
import { crearCareo, responderCareo, resultadoCareo } from './core/presser.js';
import { registrarGolpe, resultadoSparring } from './core/sparring.js';
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
import { renderResultadoTarjeta } from './ui/screens/card.js';
import { renderTienda } from './ui/screens/shop.js';
import { renderCareo } from './ui/screens/presser.js';
import { renderSparring } from './ui/screens/sparring.js';
import { renderNegociacion } from './ui/screens/negotiation.js';
import { renderOferta, renderPlan, renderPelea } from './ui/screens/fight.js';
import { renderFicha } from './ui/screens/profile.js';
import { renderLegado } from './ui/screens/legacy.js';
import { renderEstadisticas } from './ui/screens/stats.js';

import { crearShell } from './ui/shell.js';
import { renderPanelPeleador } from './ui/screens/panel-peleador.js';
import { renderPanelProxima } from './ui/screens/panel-proxima.js';
import { renderPanelNoticias } from './ui/screens/panel-noticias.js';
import { renderPanelDecision, renderDesenlace } from './ui/screens/panel-decision.js';
import { renderPanelAvance } from './ui/screens/panel-avance.js';
import { renderCalendario } from './ui/screens/panel-calendario.js';
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
// atributo (la fatiga cuenta invertida: menos fatiga suma).
function signoDeRama(mods) {
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

// Arma los `efectos` (píldoras) de una opción de evento/redes: si tiene
// `probabilidades`, una píldora por rama con su porcentaje (via
// porcentajesDe, Task 3.1); si no, una píldora por mod fijo más las de
// dinero/fama declaradas aparte en `efectos`.
function efectosDeOpcion(opcion) {
  const porcentajes = porcentajesDe(opcion);
  if (porcentajes.length > 0) {
    return opcion.probabilidades.map((rama, i) => ({
      texto: formatearMods({ ...(opcion.mods ?? {}), ...rama.mods }).join(' '),
      signo: signoDeRama({ ...(opcion.mods ?? {}), ...rama.mods }),
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

  function asegurarShell() {
    if (shellActual && contenedor.contains(shellActual.regiones.centro)) return shellActual;
    shellActual = crearShell(contenedor);
    return shellActual;
  }

  // Arma los props de la columna izquierda del shell. La ficha/tienda que se
  // abren desde acá siempre vuelven al MISMO tablero (volverAlTablero): ya no
  // hace falta que cada llamador decida "adónde volver" a mano.
  function propsPanelIzquierda() {
    return {
      partida,
      onFicha: (jugador, seccion = 'atributos') => abrirFicha(jugador, seccion),
      onTienda: () => abrirTienda(() => {
        renderPanelPeleador(shellActual.regiones.izquierda, propsPanelIzquierda());
      }),
      onHistorial: (jugador) => abrirFicha(jugador, 'historial'),
    };
  }

  // Asegura el shell y REFRESCA los paneles laterales con la partida actual
  // (izquierda: peleador; derecha: próxima pelea + noticias), más el
  // calendario del centro. Se llama en cada transición del tablero (nuevo
  // beat, o volver al estado ocioso) — nunca en cada micro-render dentro de
  // un mismo beat (p. ej. cada golpe del sparring, o cada frame del roll de
  // azar, repintan solo `centroContenido()` directo).
  //
  // La región central queda armada con DOS sub-nodos estables, igual que ya
  // hace la derecha con próxima/noticias: `calendario` (siempre el mismo
  // contenido mientras no cambie `semanaGlobal`, ver panel-calendario.js —
  // pedido del coordinador: es información permanente del jugador, no puede
  // vivir donde el celular la esconde) y `contenido`, donde va lo que sea que
  // esté pasando ahora (el panel de avance, una decisión, el sparring). Quien
  // pinta un beat nunca toca `shell.regiones.centro` directo: usa
  // `centroContenido()`.
  function montarTablero() {
    const shell = asegurarShell();
    renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda());

    shell.montarCentro(el('div', { class: 'stack' }, [
      el('div', { dataset: { bloque: 'calendario' } }),
      el('div', { dataset: { bloque: 'contenido' } }),
    ]));
    renderCalendario(shell.regiones.centro.querySelector('[data-bloque="calendario"]'), { partida });

    shell.montarDerecha(el('div', {}, [
      el('div', { dataset: { bloque: 'proxima' } }),
      el('div', { dataset: { bloque: 'noticias' } }),
    ]));
    renderPanelProxima(shell.regiones.derecha.querySelector('[data-bloque="proxima"]'), {
      partida,
      onVerRival: (rivalId) => {
        const rival = partida.mundo.roster.find((p) => p.id === rivalId);
        if (rival) abrirFicha(rival, 'atributos');
      },
    });
    renderPanelNoticias(shell.regiones.derecha.querySelector('[data-bloque="noticias"]'), {
      noticias: partida.noticias,
      onLeidas: (nuevas) => { partida = { ...partida, noticias: nuevas }; },
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
  //
  // El ORDEN importa: animar tiene que pasar DESPUÉS de irADashboard() (que
  // llama a montarTablero(), y esa SIEMPRE repinta la izquierda desde cero —
  // ver montarTablero). Animar ANTES se pierde en el mismo tick: mount() no
  // diffea, así que el segundo repintado deja huérfanos los nodos que
  // `animarAtributos`/`destacarAtributos` acababan de tocar, sin que el
  // navegador llegue a pintar ese estado intermedio.
  function aplicarEfectoYSeguir({ jugador, rivalidades = partida.rivalidades, deltas = {} }) {
    partida = { ...partida, jugador, rivalidades };
    irADashboard();
    animarAtributos(shellActual.regiones.izquierda, deltas);
    destacarAtributos(shellActual.regiones.izquierda, deltas);
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

  function siguiente() {
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    if (partida.terminada) return finDeCarrera();
    if (!paso.beat) return irADashboard();
    jugarBeat(paso.beat);
  }

  function jugarBeat(beat) {
    if (beat.tipo === 'mejora') return beatMejora(beat);
    if (beat.tipo === 'evento') return beatCarta(beat, 'Decisión', 'alerta');
    if (beat.tipo === 'redes') return beatCarta(beat, 'Redes sociales', 'microfono');
    if (beat.tipo === 'sparring') return beatSparring(beat);
    if (beat.tipo === 'oferta') return beatOferta(beat);
    if (beat.tipo === 'lesionSinOferta') return beatLesionSinOferta(beat);
    if (beat.tipo === 'noticias') return beatNoticias();
    return irADashboard();
  }

  // 'lesionSinOferta' y 'noticias' son beats simples (nada que jugar, solo un
  // aviso) que en la v1/pre-6.1 abrían su PROPIA pantalla completa
  // (renderResultadoTarjeta / renderNoticias). Con "los beats van al centro"
  // (brief de la Task 6.1) pasan a vivir en la misma región central del
  // tablero, reusando renderDesenlace (mismo layout: título + texto + botón
  // Seguir, sin deltas). Esto deja huérfano a renderNoticias (screens/news.js
  // — se borra junto con sus tests). `renderResultadoTarjeta` sigue en uso en
  // el resultado post-pelea (cerrarPelea, pantalla completa junto con el
  // resto de la pipeline de la pelea) — el rechazo de oferta se sumó a la
  // lista de cosas que resuelven en el centro (ver beatOferta), así que ya no
  // lo usa.
  function beatLesionSinOferta(beat) {
    const { lesion } = beat.datos;
    const bloques = lesion?.bloquesRestantes ?? null;
    centro(() => renderDesenlace(centroContenido(), {
      titulo: 'Sin ofertas',
      texto: lesion
        ? `Nadie te ofrece pelear: seguís de baja por "${lesion.nombre.toLowerCase()}" — ${bloques} ${bloques === 1 ? 'bloque' : 'bloques'} más para volver.`
        : 'Nadie te ofrece pelear mientras estás lesionado.',
      deltasTexto: [],
      onContinuar: irADashboard,
    }));
  }

  function beatNoticias() {
    // El feed de noticias (panel-noticias.js, columna derecha) ya está
    // siempre visible y siempre actualizado en el tablero persistente: este
    // beat solo le pone ritmo a la carrera (consume su turno) y avisa que
    // circuló algo, en vez de forzar una pantalla aparte para lo mismo que ya
    // se ve al lado.
    centro(() => renderDesenlace(centroContenido(), {
      titulo: 'El mundo sigue girando',
      texto: 'Circularon resultados y rumores de otros peleadores esta semana. Date una vuelta por las noticias, a la derecha.',
      deltasTexto: [],
      onContinuar: irADashboard,
    }));
  }

  function beatMejora(beat) {
    centro(() => renderPanelDecision(centroContenido(), {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: 'El dado trajo tres mejoras. Elegí una.',
      opciones: beat.datos.cartas.map(cartaMejoraAOpcion),
      onElegir: (id) => {
        const carta = beat.datos.cartas.find((c) => c.id === id);
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

        const aplicar = () => aplicarEfectoYSeguir({
          jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas,
        });

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
      renderSparring(centroContenido(), {
        sparring,
        jugador: partida.jugador,
        onGolpe: (evento) => {
          sparring = registrarGolpe(sparring, evento);
          pintarSparring();
        },
        onTerminar: () => {
          const resultado = resultadoSparring(sparring, partida.jugador);
          const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
          aplicarEfectoYSeguir({ jugador: aplicado.jugador, deltas: aplicado.deltas });
        },
      });
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
        partida = { ...partida, jugador: paso.jugador };
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
      onCerrar: () => {
        const final = resultadoNegociacion(negociacion);
        careo({ ...oferta, bolsa: final.bolsa });
      },
    });
    pintar();
  }

  function careo(oferta) {
    if (!oferta.esTitulo && (partida.jugador.fama ?? 0) < 20) return elegirPlan(oferta);
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
  function pelear(oferta, plan) {
    const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
    let pelea = crearPelea({
      jugador: partida.jugador, rival,
      disciplina: partida.jugador.disciplina, nivel: oferta.nivelPelea, plan, rng,
    });

    function pintar(momentos) {
      renderPelea(contenedor, {
        pelea,
        momentos,
        ventanaMs: VENTANA_MS,
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
        onFin: () => cerrarPelea(oferta, pelea),
      });
    }

    function avanzar() {
      const paso = avanzarPelea(pelea);
      pelea = paso.pelea;
      pintar(paso.eventos);
    }

    avanzar();
  }

  function cerrarPelea(oferta, pelea) {
    const paso = aplicarResultado(partida.jugador, { oferta, resultado: pelea.resultado });
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

    partida = { ...partida, jugador, rivalidades };

    renderResultadoTarjeta(contenedor, {
      titulo: 'Después de la pelea',
      texto: `${paso.texto}${lesion ? ` ${lesion.texto}` : ''}`,
      deltas: [`Bolsa: ${fmtDinero(oferta.bolsa)}`],
      onContinuar: irADashboard,
    });
  }

  function finDeCarrera() {
    const legado = calcularLegado(partida);
    partida = { ...partida, legado };
    persistir();
    renderLegado(contenedor, {
      legado,
      jugador: partida.jugador,
      onNuevaCarrera: () => {
        borrar(storage);
        partida = null;
        arrancar();
      },
      onVerEstadisticas: () => renderEstadisticas(contenedor, {
        estadisticas: estadisticasDeCarrera(partida),
        onCerrar: finDeCarrera,
      }),
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
