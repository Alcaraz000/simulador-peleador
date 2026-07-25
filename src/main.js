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
import { animarRoll } from './ui/components/roll.js';
import { animarAtributos } from './ui/components/animar-numero.js';
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
  // (izquierda: peleador; derecha: próxima pelea + noticias). Se llama en
  // cada transición del tablero (nuevo beat, o volver al estado ocioso) —
  // nunca en cada micro-render dentro de un mismo beat (p. ej. cada golpe del
  // sparring, o cada frame del roll de azar, repintan solo el centro
  // directo). La región central queda como estaba: quien llama decide qué
  // pintar ahí.
  function montarTablero() {
    const shell = asegurarShell();
    renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda());

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

  // No hay pantalla de resultado (Task 3.2): esto reemplaza a
  // renderResultadoTarjeta para mejora/evento/redes/sparring. Aplica los
  // deltas al panel izquierdo YA repintado con los valores finales, los
  // anima, y deja el texto del desenlace con un botón para seguir, en la
  // MISMA región central — nunca una pantalla nueva.
  function mostrarDesenlace({ titulo, texto, deltas = {}, deltasTexto = null }) {
    const shell = asegurarShell();
    renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda());
    animarAtributos(shell.regiones.izquierda, deltas);
    shell.destacar('izquierda');
    centro(() => renderDesenlace(shellActual.regiones.centro, {
      titulo, texto, deltasTexto: deltasTexto ?? formatearMods(deltas), onContinuar: irADashboard,
    }));
  }

  // El estado "entre beats": lo que ANTES mostraba renderDashboard (v1,
  // pantalla completa) ahora es un panel más en el centro del MISMO tablero
  // (Task 6.1 — el tablero es la pantalla principal, siempre).
  function irADashboard() {
    persistir();
    centro(() => renderPanelAvance(shellActual.regiones.centro, {
      partida, onSiguiente: siguiente, onCurar: curar,
    }));
  }

  function curar() {
    const paso = curarConDinero(partida.jugador, partida.jugador.estado.lesion);
    if (paso.ok) partida = { ...partida, jugador: paso.peleador };
    irADashboard();
  }

  // `abrirFicha`/`abrirTienda` reemplazan `contenedor` entero (ficha) o abren
  // un popup (tienda): al cerrar, siempre se vuelve al mismo tablero.
  function abrirFicha(jugador, seccion = 'atributos') {
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
  // — se borra junto con sus tests); renderResultadoTarjeta sigue en uso en
  // el rechazo de oferta y en el resultado post-pelea, así que no se toca.
  function beatLesionSinOferta(beat) {
    const { lesion } = beat.datos;
    const bloques = lesion?.bloquesRestantes ?? null;
    centro(() => renderDesenlace(shellActual.regiones.centro, {
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
    centro(() => renderDesenlace(shellActual.regiones.centro, {
      titulo: 'El mundo sigue girando',
      texto: 'Circularon resultados y rumores de otros peleadores esta semana. Date una vuelta por las noticias, a la derecha.',
      deltasTexto: [],
      onContinuar: irADashboard,
    }));
  }

  function beatMejora(beat) {
    centro(() => renderPanelDecision(shellActual.regiones.centro, {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: 'El dado trajo tres mejoras. Elegí una.',
      opciones: beat.datos.cartas.map(cartaMejoraAOpcion),
      onElegir: (id) => {
        const carta = beat.datos.cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        mostrarDesenlace({ titulo: 'Campamento', texto: carta.texto, deltas: aplicado.deltas });
      },
    }));
  }

  function beatCarta(beat, titulo, nombreIcono) {
    const carta = beat.datos.carta;

    centro(() => renderPanelDecision(shellActual.regiones.centro, {
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

        const aplicarYMostrar = () => {
          partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
          mostrarDesenlace({
            titulo, texto: resuelto.texto || carta.texto, deltas: resuelto.deltas, deltasTexto: resuelto.deltasTexto,
          });
        };

        if (opcion.probabilidades) {
          const nodoTarjeta = shellActual.regiones.centro.querySelector(`[data-opcion="${id}"]`);
          animarRoll(nodoTarjeta, {
            indiceGanador: resuelto.indiceGanador,
            cantidad: opcion.probabilidades.length,
            onFin: aplicarYMostrar,
          });
          return;
        }
        aplicarYMostrar();
      },
    }));
  }

  function beatSparring(beat) {
    let sparring = beat.datos.sparring;

    function pintarSparring() {
      renderSparring(shellActual.regiones.centro, {
        sparring,
        jugador: partida.jugador,
        onGolpe: (evento) => {
          sparring = registrarGolpe(sparring, evento);
          pintarSparring();
        },
        onTerminar: () => {
          const resultado = resultadoSparring(sparring, partida.jugador);
          const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
          partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
          mostrarDesenlace({ titulo: 'Sparring', texto: resultado.texto, deltas: aplicado.deltas });
        },
      });
    }

    centro(pintarSparring);
  }

  function beatOferta(beat) {
    const { oferta } = beat.datos;
    renderOferta(contenedor, {
      oferta,
      jugador: partida.jugador,
      onAceptar: () => negociar(oferta),
      onRechazar: () => {
        const paso = rechazarOferta(partida.jugador, oferta);
        partida = { ...partida, jugador: paso.jugador };
        renderResultadoTarjeta(contenedor, {
          titulo: 'Oferta rechazada', texto: paso.texto, deltas: [], onContinuar: irADashboard,
        });
      },
    });
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
