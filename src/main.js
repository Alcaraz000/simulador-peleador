import { createRng } from './core/rng.js';
import { crearPartida, siguienteBeat } from './core/career.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
import { aplicarCarta, formatearMods } from './core/cards.js';
import { resolverOpcion } from './core/events.js';
import { generarOferta, aplicarResultado, rechazarOferta } from './core/offers.js';
import { crearNegociacion, jugarMovida, resultadoNegociacion } from './core/negotiation.js';
import { crearCareo, responderCareo, resultadoCareo } from './core/presser.js';
import { registrarGolpe, resultadoSparring } from './core/sparring.js';
import { registrarCruce, elegirArchirrival, subirHeat } from './core/rivalry.js';
import { comprar } from './core/money.js';
import { tirarLesion, aplicarLesion } from './core/injuries.js';
import { calcularLegado } from './core/legacy.js';
import { guardar, cargar, borrar } from './core/save.js';
import { clamp } from './core/stats.js';

import { renderCreacion } from './ui/screens/create.js';
import { renderDashboard } from './ui/screens/dashboard.js';
import { renderTarjeta, renderResultadoTarjeta } from './ui/screens/card.js';
import { renderTienda } from './ui/screens/shop.js';
import { renderCareo } from './ui/screens/presser.js';
import { renderSparring } from './ui/screens/sparring.js';
import { renderNegociacion } from './ui/screens/negotiation.js';
import { renderOferta, renderPlan, renderPelea, renderRincon, renderGolpeDeGracia } from './ui/screens/fight.js';
import { renderNoticias } from './ui/screens/news.js';
import { renderFicha } from './ui/screens/profile.js';
import { renderLegado } from './ui/screens/legacy.js';

export const VERSION = '0.1.0';

export function iniciar(contenedor = document.getElementById('app'), storage = undefined) {
  let partida = cargar(storage);
  let rng = createRng(partida ? partida.semilla + 7777 : Date.now());

  const persistir = () => { if (partida) guardar(partida, storage); };

  function irADashboard() {
    persistir();
    renderDashboard(contenedor, {
      partida,
      onSiguiente: siguiente,
      onTienda: abrirTienda,
      onFicha: (jugador, seccion = 'atributos') => renderFicha(contenedor, {
        jugador, seccion, onCerrar: irADashboard,
      }),
    });
  }

  function abrirTienda() {
    renderTienda(contenedor, {
      jugador: partida.jugador,
      onComprar: (id) => {
        const paso = comprar(partida.jugador, id);
        if (paso.ok) partida = { ...partida, jugador: paso.jugador };
        abrirTienda();
      },
      onCerrar: irADashboard,
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
    if (beat.tipo === 'evento') return beatCarta(beat, 'Decisión');
    if (beat.tipo === 'redes') return beatCarta(beat, 'Redes sociales');
    if (beat.tipo === 'sparring') return beatSparring(beat);
    if (beat.tipo === 'oferta') return beatOferta(beat);
    if (beat.tipo === 'noticias') return beatNoticias();
    return irADashboard();
  }

  function beatMejora(beat) {
    renderTarjeta(contenedor, {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: 'El dado trajo tres mejoras. Elegí una.',
      opciones: beat.datos.cartas.map((c) => ({
        id: c.id, titulo: c.titulo, desc: c.texto, mods: formatearMods(c.mods),
      })),
      onElegir: (id) => {
        const carta = beat.datos.cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        irADashboard();
      },
    });
  }

  function beatCarta(beat, titulo) {
    const carta = beat.datos.carta;
    renderTarjeta(contenedor, {
      titulo,
      bajada: carta.titulo,
      texto: carta.texto,
      opciones: carta.opciones.map((o) => ({
        id: o.id,
        titulo: o.texto,
        mods: o.mods ? formatearMods(o.mods) : [],
        nota: o.probabilidades ? 'El resultado se define al azar' : null,
      })),
      onElegir: (id) => {
        const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
        const resuelto = resolverOpcion(rng, {
          jugador: partida.jugador, carta, opcionId: id,
          rivalidades: partida.rivalidades, rivalObjetivoId,
        });
        partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
        renderResultadoTarjeta(contenedor, {
          titulo,
          texto: resuelto.texto || 'Listo.',
          deltas: resuelto.deltasTexto,
          onContinuar: irADashboard,
        });
      },
    });
  }

  function beatSparring(beat) {
    let sparring = beat.datos.sparring;
    const pintar = () => renderSparring(contenedor, {
      sparring,
      jugador: partida.jugador,
      onGolpe: (evento) => {
        sparring = registrarGolpe(sparring, evento);
        pintar();
      },
      onTerminar: () => {
        const resultado = resultadoSparring(sparring, partida.jugador);
        const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        renderResultadoTarjeta(contenedor, {
          titulo: 'Sparring',
          texto: resultado.texto,
          deltas: formatearMods(aplicado.deltas),
          onContinuar: irADashboard,
        });
      },
    });
    pintar();
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
      deltas: [`Bolsa: ${oferta.bolsa}`],
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

  arrancar();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  iniciar();
}
