import { createRng } from './core/rng.js';
import { crearPartida, siguienteBeat } from './core/career.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
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
import { renderDashboard } from './ui/screens/dashboard.js';
import { renderResultadoTarjeta } from './ui/screens/card.js';
import { renderTienda } from './ui/screens/shop.js';
import { renderCareo } from './ui/screens/presser.js';
import { renderSparring } from './ui/screens/sparring.js';
import { renderNegociacion } from './ui/screens/negotiation.js';
import { renderOferta, renderPlan, renderPelea, renderRincon, renderGolpeDeGracia } from './ui/screens/fight.js';
import { renderNoticias } from './ui/screens/news.js';
import { renderFicha } from './ui/screens/profile.js';
import { renderLegado } from './ui/screens/legacy.js';
import { renderEstadisticas } from './ui/screens/stats.js';

import { crearShell } from './ui/shell.js';
import { renderPanelPeleador } from './ui/screens/panel-peleador.js';
import { renderPanelProxima } from './ui/screens/panel-proxima.js';
import { renderPanelNoticias } from './ui/screens/panel-noticias.js';
import { renderPanelDecision, renderDesenlace } from './ui/screens/panel-decision.js';
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

  function irADashboard() {
    persistir();
    renderDashboard(contenedor, {
      partida,
      onSiguiente: siguiente,
      onTienda: () => abrirTienda(),
      onFicha: (jugador, seccion = 'atributos') => abrirFicha(jugador, seccion),
      onCurar: () => {
        const paso = curarConDinero(partida.jugador, partida.jugador.estado.lesion);
        if (paso.ok) partida = { ...partida, jugador: paso.peleador };
        irADashboard();
      },
    });
  }

  // `volver` es adónde ir al cerrar: por defecto al tablero v1. Los beats que
  // viven dentro del shell (mejora/evento/redes/sparring) pasan su propio
  // `reconstruir` acá, para no perder la decisión pendiente (decisión #3 del
  // brief: ir a una pantalla v1 descarta el shell, pero al volver se rearma).
  function abrirFicha(jugador, seccion = 'atributos', volver = irADashboard) {
    renderFicha(contenedor, { jugador, seccion, onCerrar: volver });
  }

  function abrirTienda(volver = irADashboard) {
    renderTienda(contenedor, {
      jugador: partida.jugador,
      onComprar: (id) => {
        const paso = comprar(partida.jugador, id);
        if (paso.ok) partida = { ...partida, jugador: paso.jugador };
        abrirTienda(volver);
      },
      onCerrar: volver,
    });
  }

  // Arma los props de la columna izquierda del shell. `volver` es lo que se
  // hace al cerrar la ficha/tienda abiertas desde acá.
  function propsPanelIzquierda(volver) {
    return {
      partida,
      onFicha: (jugador, seccion = 'atributos') => abrirFicha(jugador, seccion, volver),
      onTienda: () => abrirTienda(volver),
      onHistorial: (jugador) => abrirFicha(jugador, 'historial', volver),
    };
  }

  // Monta el shell + los 3 paneles del tablero (izquierda, derecha) sobre
  // `contenedor`. La región central queda vacía: el que llama decide qué
  // pintar ahí con `shell.montarCentro` / renderPanelDecision / renderSparring.
  function montarTablero(volver) {
    const shell = crearShell(contenedor);
    renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda(volver));

    shell.montarDerecha(el('div', {}, [
      el('div', { dataset: { bloque: 'proxima' } }),
      el('div', { dataset: { bloque: 'noticias' } }),
    ]));
    renderPanelProxima(shell.regiones.derecha.querySelector('[data-bloque="proxima"]'), {
      partida,
      onVerRival: (rivalId) => {
        const rival = partida.mundo.roster.find((p) => p.id === rivalId);
        if (rival) abrirFicha(rival, 'atributos', volver);
      },
    });
    renderPanelNoticias(shell.regiones.derecha.querySelector('[data-bloque="noticias"]'), {
      noticias: partida.noticias,
      onLeidas: (nuevas) => { partida = { ...partida, noticias: nuevas }; },
    });

    return shell;
  }

  // Orquesta un beat que vive en el shell: mantiene el `shell` y "qué se está
  // pintando en el centro ahora mismo" (tarjetas, el minijuego, o el
  // desenlace) para poder reconstruir todo si el jugador se va a una
  // pantalla v1 (ficha/tienda) y vuelve, sin perder en qué paso estaba.
  function crearOrquestadorTablero() {
    let shell;
    let pintarCentro = () => {};

    function reconstruir() {
      shell = montarTablero(reconstruir);
      pintarCentro();
    }

    function centro(pintar) {
      pintarCentro = pintar;
      if (shell) pintarCentro();
    }

    // No hay pantalla de resultado (Task 3.2): esto reemplaza a
    // renderResultadoTarjeta para mejora/evento/redes/sparring. Aplica los
    // deltas al panel izquierdo YA repintado con los valores finales, los
    // anima, y deja el texto del desenlace con un botón para seguir, en la
    // MISMA región central — nunca una pantalla nueva.
    function mostrarDesenlace({ titulo, texto, deltas = {}, deltasTexto = null }) {
      renderPanelPeleador(shell.regiones.izquierda, propsPanelIzquierda(reconstruir));
      animarAtributos(shell.regiones.izquierda, deltas);
      shell.destacar('izquierda');
      centro(() => renderDesenlace(shell.regiones.centro, {
        titulo, texto, deltasTexto: deltasTexto ?? formatearMods(deltas), onContinuar: irADashboard,
      }));
    }

    return {
      get shell() { return shell; },
      reconstruir, centro, mostrarDesenlace,
    };
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

  function beatLesionSinOferta(beat) {
    const { lesion } = beat.datos;
    const bloques = lesion?.bloquesRestantes ?? null;
    renderResultadoTarjeta(contenedor, {
      titulo: 'Sin ofertas',
      texto: lesion
        ? `Nadie te ofrece pelear: seguís de baja por "${lesion.nombre.toLowerCase()}" — ${bloques} ${bloques === 1 ? 'bloque' : 'bloques'} más para volver.`
        : 'Nadie te ofrece pelear mientras estás lesionado.',
      deltas: [],
      onContinuar: irADashboard,
    });
  }

  function beatMejora(beat) {
    const orq = crearOrquestadorTablero();
    orq.centro(() => renderPanelDecision(orq.shell.regiones.centro, {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: 'El dado trajo tres mejoras. Elegí una.',
      opciones: beat.datos.cartas.map(cartaMejoraAOpcion),
      onElegir: (id) => {
        const carta = beat.datos.cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        orq.mostrarDesenlace({ titulo: 'Campamento', texto: carta.texto, deltas: aplicado.deltas });
      },
    }));
    orq.reconstruir();
  }

  function beatCarta(beat, titulo, nombreIcono) {
    const carta = beat.datos.carta;
    const orq = crearOrquestadorTablero();

    orq.centro(() => renderPanelDecision(orq.shell.regiones.centro, {
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
          orq.mostrarDesenlace({
            titulo, texto: resuelto.texto || carta.texto, deltas: resuelto.deltas, deltasTexto: resuelto.deltasTexto,
          });
        };

        if (opcion.probabilidades) {
          const nodoTarjeta = orq.shell.regiones.centro.querySelector(`[data-opcion="${id}"]`);
          const indice = opcion.probabilidades.findIndex((p) => p.texto === resuelto.texto);
          animarRoll(nodoTarjeta, {
            indiceGanador: indice === -1 ? 0 : indice,
            cantidad: opcion.probabilidades.length,
            onFin: aplicarYMostrar,
          });
          return;
        }
        aplicarYMostrar();
      },
    }));
    orq.reconstruir();
  }

  function beatSparring(beat) {
    let sparring = beat.datos.sparring;
    const orq = crearOrquestadorTablero();

    function pintarSparring() {
      renderSparring(orq.shell.regiones.centro, {
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
          orq.mostrarDesenlace({ titulo: 'Sparring', texto: resultado.texto, deltas: aplicado.deltas });
        },
      });
    }

    orq.centro(pintarSparring);
    orq.reconstruir();
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

  function pelear(oferta, plan) {
    const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
    let pelea = crearPelea({
      jugador: partida.jugador, rival,
      disciplina: partida.jugador.disciplina, nivel: oferta.nivelPelea, plan, rng,
    });
    const log = [];

    const pintarPelea = () => renderPelea(contenedor, {
      pelea, eventos: log,
      onSiguienteRound: avanzar,
      onFin: () => cerrarPelea(oferta, pelea),
    });

    function avanzar() {
      const paso = avanzarPelea(pelea);
      pelea = paso.pelea;
      log.push(...paso.eventos);
      if (pelea.pendiente === 'golpe') return pintarGolpe();
      if (pelea.pendiente === 'rincon') return pintarRincon();
      pintarPelea();
    }

    function pintarRincon() {
      renderRincon(contenedor, {
        pelea,
        onInstruccion: (id) => {
          pelea = aplicarInstruccionRincon(pelea, id);
          pintarPelea();
        },
      });
    }

    function pintarGolpe() {
      const info = abrirGolpeDeGracia(pelea);
      renderGolpeDeGracia(contenedor, {
        pelea, info, ventanaMs: VENTANA_MS,
        onGolpe: (datos) => {
          const paso = resolverGolpeDeGracia(pelea, datos);
          pelea = paso.pelea;
          log.push(...paso.eventos);
          pintarPelea();
        },
      });
    }

    pintarPelea();
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

  function beatNoticias() {
    renderNoticias(contenedor, { noticias: partida.noticias, onContinuar: irADashboard });
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
