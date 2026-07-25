import { buscarRival } from './world.js';
import { mediaDe, recordTexto } from './fighter.js';
import { clamp } from './stats.js';

export const NIVELES = {
  local: { id: 'local', nombre: 'Torneo local', nivelPelea: 'amateur', multiplicadorBolsa: 0.4, famaBase: 2 },
  regional: { id: 'regional', nombre: 'Cartelera regional', nivelPelea: 'profesional', multiplicadorBolsa: 1, famaBase: 4 },
  eliminatoria: { id: 'eliminatoria', nombre: 'Eliminatoria', nivelPelea: 'profesional', multiplicadorBolsa: 1.8, famaBase: 7 },
  titulo: { id: 'titulo', nombre: 'Pelea de título', nivelPelea: 'titulo', multiplicadorBolsa: 4, famaBase: 15 },
  defensa: { id: 'defensa', nombre: 'Defensa obligatoria', nivelPelea: 'titulo', multiplicadorBolsa: 3.2, famaBase: 10 },
};

/**
 * Progresión de cinturones. Se pelea por el siguiente que no tenés,
 * en orden; cada uno exige más ranking y paga más.
 */
export const CINTURONES = [
  { id: 'regional', nombre: 'Cinturón regional', rankingMax: 8, multiplicador: 1, famaExtra: 8, defensasObligatorias: 2 },
  { id: 'nacional', nombre: 'Cinturón nacional', rankingMax: 5, multiplicador: 1.8, famaExtra: 14, defensasObligatorias: 3 },
  { id: 'mundial', nombre: 'Cinturón mundial', rankingMax: 3, multiplicador: 3.5, famaExtra: 25, defensasObligatorias: 4 },
];

/** El próximo cinturón que el jugador puede disputar, o null si los tiene todos. */
export function proximoCinturon(jugador) {
  return CINTURONES.find((c) => !jugador.titulos.includes(c.nombre)) ?? null;
}

/** ¿Puede pelear por ese cinturón según su ranking? */
export function puedeDisputar(jugador, cinturon) {
  if (!cinturon) return false;
  return (jugador.ranking ?? 99) <= cinturon.rankingMax;
}

const BOLSA_BASE = 3000;

export function evaluarRiesgo(jugador, rival) {
  const diferencia = mediaDe(rival) - mediaDe(jugador);
  if (diferencia >= 8) return 'alto';
  if (diferencia <= -8) return 'bajo';
  return 'medio';
}

/** El cinturón más alto que el jugador tiene puesto (el que se defiende). */
export function cinturonActual(jugador) {
  const puestos = CINTURONES.filter((c) => jugador.titulos.includes(c.nombre));
  return puestos.length > 0 ? puestos[puestos.length - 1] : null;
}

// Con cinturón puesto y ranking suficiente para el próximo, la chance de que le
// ofrezcan esa pelea (en vez de una defensa del cinturón actual). Tiene que ser
// alta: un campeón rankeado 1-2 va detrás del título más grande, no se queda
// defendiendo el chico hasta que se le acaba la carrera.
const PROB_ASCENSO_PRIORITARIO = 0.95;

function decidirNivel({ jugador, etapa, forzarTitulo, rng }) {
  if (etapa === 'juvenil' || etapa === 'amateur') {
    return { nivel: NIVELES.local, cinturon: null };
  }

  const puesto = cinturonActual(jugador);
  const proximo = proximoCinturon(jugador);

  if (puesto) {
    // Si ya califica por ranking para el próximo escalón, escalar le gana a
    // estancarse: la mayoría de las veces le ofrecen ir por el título grande,
    // y solo a veces le cae la defensa del que ya tiene.
    if (proximo && puedeDisputar(jugador, proximo)) {
      if (rng.chance(PROB_ASCENSO_PRIORITARIO)) {
        return { nivel: NIVELES.titulo, cinturon: proximo };
      }
      return { nivel: NIVELES.defensa, cinturon: puesto };
    }
    // Todavía no califica para el siguiente: sigue defendiendo el que tiene.
    if (rng.chance(0.55)) {
      return { nivel: NIVELES.defensa, cinturon: puesto };
    }
  }

  // Sin cinturón puesto (o sin defensa/ascenso este turno): pelea por el próximo
  // si está rankeado lo suficiente.
  if (proximo && (forzarTitulo || puedeDisputar(jugador, proximo))) {
    return { nivel: NIVELES.titulo, cinturon: proximo };
  }

  if (etapa === 'veterano') return { nivel: NIVELES.eliminatoria, cinturon: null };
  return { nivel: (jugador.ranking ?? 99) <= 6 ? NIVELES.eliminatoria : NIVELES.regional, cinturon: null };
}

let contadorOferta = 0;

export function generarOferta(rng, { jugador, mundo, etapa, rivalidades = [], forzarTitulo = false }) {
  const { nivel, cinturon } = decidirNivel({ jugador, etapa, forzarTitulo, rng });

  const archirrival = rivalidades.find((r) => r.esArchirrival);
  const rankingObjetivo = clamp((jugador.ranking ?? 10) - rng.int(0, 3), 1, 12);
  const rival = (archirrival && rng.chance(0.3)
    ? mundo.roster.find((p) => p.id === archirrival.rivalId && !p.retirado)
    : null) ?? buscarRival(mundo, { excluirIds: [jugador.id], rankingCerca: rankingObjetivo });

  if (!rival) return null;

  const riesgo = evaluarRiesgo(jugador, rival);
  const multiplicadorCinturon = cinturon ? cinturon.multiplicador : 1;
  const bolsa = Math.round(
    BOLSA_BASE * nivel.multiplicadorBolsa * multiplicadorCinturon
    * (1 + jugador.fama / 60) * (1 + mediaDe(rival) / 120) * rng.float(0.9, 1.15),
  );

  const cruce = rivalidades.find((r) => r.rivalId === rival.id);
  const esRevancha = Boolean(cruce && (cruce.h2h.v + cruce.h2h.d + cruce.h2h.e) > 0);
  const esTitulo = nivel.id === 'titulo' || nivel.id === 'defensa';
  const enJuego = esTitulo
    ? cinturon.nombre
    : nivel.id === 'eliminatoria' ? 'Puesto de retador' : 'Subís al ranking si ganás';

  contadorOferta += 1;
  const gancho = nivel.id === 'defensa'
    ? `Defensa obligatoria del ${cinturon.nombre.toLowerCase()}. ${rival.apodo} es el retador oficial.`
    : nivel.id === 'titulo'
      ? `Es por el ${cinturon.nombre.toLowerCase()}. ${rival.apodo} tiene lo que querés.`
      : esRevancha
        ? `${rival.apodo} quiere la revancha. Vos sabés lo que pasó la última vez.`
        : rival.esParodia
          ? `${rival.nombre} te nombró en una entrevista. El teléfono no para.`
          : `"${rival.apodo}" ${rival.nombre} te quiere cruzar.`;

  return {
    id: `of_${contadorOferta}`,
    rivalId: rival.id,
    rivalNombre: rival.nombre,
    rivalApodo: rival.apodo,
    rivalMedia: mediaDe(rival),
    rivalRecord: recordTexto(rival),
    rivalEstilo: rival.estilo,
    rivalPersonalidad: rival.personalidad,
    nivel: nivel.id,
    nivelPelea: nivel.nivelPelea,
    bolsa,
    riesgo,
    enJuego,
    esTitulo,
    esObligatoria: nivel.id === 'defensa',
    esRevancha,
    cinturonId: cinturon ? cinturon.id : null,
    famaBase: nivel.famaBase + (cinturon ? cinturon.famaExtra : 0),
    textoGancho: gancho,
  };
}

function clonarJugador(jugador) {
  return {
    ...jugador,
    record: { ...jugador.record },
    estado: { ...jugador.estado },
    titulos: [...jugador.titulos],
    historial: [...jugador.historial],
  };
}

export function rechazarOferta(jugador, oferta) {
  const nuevo = clonarJugador(jugador);
  const costo = oferta.esObligatoria ? 12 : 4;
  nuevo.fama = clamp(nuevo.fama - costo, 0, 100);
  const texto = oferta.esObligatoria
    ? `Rechazaste una defensa obligatoria. La comisión te la va a hacer pagar.`
    : `Le dijiste que no a ${oferta.rivalApodo}. Algunos dicen que le escapaste.`;
  return { jugador: nuevo, texto };
}

export function aplicarResultado(jugador, { oferta, resultado }) {
  const nuevo = clonarJugador(jugador);
  const titulosGanados = [];
  const gano = resultado.ganador === 'jugador';
  const empate = resultado.ganador === 'empate';

  if (gano) {
    nuevo.record.v += 1;
    if (resultado.metodo === 'ko' || resultado.metodo === 'tko') nuevo.record.ko += 1;
    else if (resultado.metodo === 'sumision') nuevo.record.sub += 1;
    else nuevo.record.dec += 1;
  } else if (empate) {
    nuevo.record.e += 1;
  } else {
    nuevo.record.d += 1;
  }

  nuevo.dinero += oferta.bolsa;

  const famaDelta = gano ? oferta.famaBase : empate ? Math.round(oferta.famaBase / 3) : -Math.round(oferta.famaBase / 2);
  nuevo.fama = clamp(nuevo.fama + famaDelta, 0, 100);
  nuevo.estado.moral = clamp(nuevo.estado.moral + (gano ? 10 : empate ? 0 : -12), 0, 100);

  if (oferta.esTitulo) {
    if (gano) {
      if (oferta.esObligatoria) {
        nuevo.defensas += 1;
      } else if (!nuevo.titulos.includes(oferta.enJuego)) {
        nuevo.titulos.push(oferta.enJuego);
        titulosGanados.push(oferta.enJuego);
      }
    } else if (!empate) {
      nuevo.titulos = nuevo.titulos.filter((t) => t !== oferta.enJuego);
    }
  }

  nuevo.historial.push({
    rivalId: oferta.rivalId,
    rivalNombre: oferta.rivalNombre,
    rivalApodo: oferta.rivalApodo,
    resultado: gano ? 'v' : empate ? 'e' : 'd',
    metodo: resultado.metodo,
    round: resultado.round,
    bolsa: oferta.bolsa,
    enJuego: oferta.enJuego,
    esTitulo: oferta.esTitulo,
  });

  const texto = gano
    ? `Le ganaste a ${oferta.rivalApodo} por ${resultado.metodo.toUpperCase()}.`
    : empate
      ? `Empataste con ${oferta.rivalApodo}. Nadie quedó conforme.`
      : `${oferta.rivalApodo} te ganó por ${resultado.metodo.toUpperCase()}.`;

  return { jugador: nuevo, titulosGanados, texto };
}
