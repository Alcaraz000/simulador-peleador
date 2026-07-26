import { buscarRival } from './world.js';
import { mediaDe, recordTexto } from './fighter.js';
import { clamp } from './stats.js';
import { OPINIONES_ENTRENADOR, OPINIONES_ENTRENADOR_TITULO } from '../content/coach-opinions.js';

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

// Cuánto infla la bolsa el 'manager' (money.js): promete "bolsas más gordas"
// además de reducir el riesgo de negociación.
const BONUS_MANAGER_BOLSA = 0.12;

export function evaluarRiesgo(jugador, rival) {
  const diferencia = mediaDe(rival) - mediaDe(jugador);
  if (diferencia >= 8) return 'alto';
  if (diferencia <= -8) return 'bajo';
  return 'medio';
}

// --- Opinión del entrenador sobre ESTA pelea puntual (Task v3) -------------
// Pedido textual del usuario: "una frase de tu entrenador (si recomienda, si
// no, si cree que NO se puede ganar, si cree que hay pocas chances...)".
// Pura y determinista (nada de rng: el criterio siempre da lo mismo para los
// mismos números, así el jugador puede aprender a leerlo). Compara tu media
// con la del rival y castiga el puntaje si llegás golpeado (forma baja,
// fatiga alta, lesión) — exactamente los mismos datos que ya evalúa
// `evaluarRiesgo`, pero acá se traduce a una opinión hablada, no a un chip.
function ventajaPercibida(jugador, oferta) {
  const estado = jugador.estado ?? {};
  let ventaja = mediaDe(jugador) - oferta.rivalMedia;
  if ((estado.forma ?? 60) < 40) ventaja -= 8;
  if ((estado.fatiga ?? 0) > 60) ventaja -= 8;
  if (estado.lesion) ventaja -= 15;
  return ventaja;
}

// De más a menos favorable: cada escalón es una categoría de contenido en
// content/coach-opinions.js (OPINIONES_ENTRENADOR). El orden importa para
// los tests de "empeora/mejora" — se recorre de arriba a abajo y gana el
// primer umbral que la ventaja alcanza.
const ESCALONES_OPINION = [
  { min: 18, id: 'muy_confiado' },
  { min: 7, id: 'confiado' },
  { min: -7, id: 'parejo' },
  { min: -18, id: 'cauteloso' },
  { min: -30, id: 'desafio' },
  { min: -Infinity, id: 'no_recomendado' },
];

/** Categoría de opinión ('muy_confiado' ... 'no_recomendado') para esta pelea. */
export function opinionEntrenador(jugador, oferta) {
  const ventaja = ventajaPercibida(jugador, oferta);
  return ESCALONES_OPINION.find((e) => ventaja >= e.min).id;
}

// Hash chico y estable (mismo idioma que `hashTexto` en news.js): elige una
// variante de texto sin rng y sin contador de módulo aparte, así la MISMA
// oferta siempre trae la MISMA frase (en cualquier corrida, o al recargar
// una partida guardada) sin robarle una tirada al hilo de azar de la
// carrera — acá no hay `rng` disponible ni hace falta: la variedad no es una
// decisión de juego, es sabor.
function indiceEstable(texto, modulo) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 100000;
  return h % modulo;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Frase completa del entrenador para esta oferta puntual: elige la
 * categoría (`opinionEntrenador`) y una variante de texto de
 * content/coach-opinions.js, ya con los marcadores rellenos. En una pelea de
 * título usa el pool que además nombra el cinturón en juego, para que la
 * opinión tenga en cuenta lo que está en juego, no solo el matchup.
 */
export function fraseEntrenador(jugador, oferta) {
  const categoria = opinionEntrenador(jugador, oferta);
  const pool = (oferta.esTitulo && OPINIONES_ENTRENADOR_TITULO[categoria]?.length > 0)
    ? OPINIONES_ENTRENADOR_TITULO[categoria]
    : OPINIONES_ENTRENADOR[categoria];
  // Semilla del hash: NUNCA `oferta.id` (sale de un contador global, no del
  // rng inyectado — ver el comentario de "es determinista" en
  // offers.test.js) ni `rivalId` (mismo problema, viene de fighter.js). Con
  // el apodo + la bolsa + lo que está en juego alcanza para variar sin
  // depender de esos contadores.
  const indice = indiceEstable(`${oferta.rivalApodo}|${oferta.bolsa}|${oferta.enJuego}|${categoria}`, pool.length);
  return rellenar(pool[indice], {
    rival: oferta.rivalApodo,
    bolsa: `US$ ${Math.round(oferta.bolsa).toLocaleString('es-AR')}`,
    enJuego: oferta.enJuego,
  });
}

/** El cinturón más alto que el jugador tiene puesto (el que se defiende). */
export function cinturonActual(jugador) {
  const puestos = CINTURONES.filter((c) => jugador.titulos.includes(c.nombre));
  return puestos.length > 0 ? puestos[puestos.length - 1] : null;
}

// Con cinturón puesto y ranking suficiente para el próximo, la chance de que le
// ofrezcan esa pelea (en vez de una defensa del cinturón actual). Tiene que ser
// alta: un campeón rankeado 1-2 va detrás del título más grande, no se queda
// defendiendo el chico hasta que se le acaba la carrera. Pero no puede ser TAN
// alta que "defender el cinturón" deje de sentirse presente en la carrera: en
// 0.95 casi el 20% de las carreras jugadas de punta a punta no ofrecían ninguna
// defensa obligatoria. Medido sobre 150 semillas (Task 25): en 0.8 sigue
// cumpliendo el >=90% de "consigue los tres cinturones" jugando perfecto, y
// baja el "cero defensas en toda la carrera" a ~8% jugando de forma realista.
const PROB_ASCENSO_PRIORITARIO = 0.8;

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
  const bolsaBase = Math.round(
    BOLSA_BASE * nivel.multiplicadorBolsa * multiplicadorCinturon
    * (1 + jugador.fama / 60) * (1 + mediaDe(rival) / 120) * rng.float(0.9, 1.15),
  );
  // El manager (money.js) promete "bolsas más gordas" además de bajar el
  // riesgo de negociación (ver REDUCCION_MANAGER en negotiation.js).
  const bolsa = (jugador.staff ?? []).includes('manager')
    ? Math.round(bolsaBase * (1 + BONUS_MANAGER_BOLSA))
    : bolsaBase;

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

  const oferta = {
    id: `of_${contadorOferta}`,
    rivalId: rival.id,
    rivalNombre: rival.nombre,
    rivalApodo: rival.apodo,
    rivalMedia: mediaDe(rival),
    rivalRecord: recordTexto(rival),
    rivalEstilo: rival.estilo,
    rivalPersonalidad: rival.personalidad,
    // Puesto del rival en el ranking (Task v3, pedido textual): junto a su
    // nombre en la oferta, para que el jugador no tenga que ir a buscarlo a
    // la tabla de posiciones (ver world.js: crearRoster ya lo asigna).
    rivalRanking: rival.ranking ?? null,
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
    // Solo tiene sentido en una defensa: cuántas defensas exitosas hacen falta
    // para consolidarse en ese cinturón (ver CINTURONES). Se usa para mostrarle
    // al jugador su progreso ("defensa 2 de 3") antes de la pelea.
    defensasObligatorias: nivel.id === 'defensa' ? cinturon.defensasObligatorias : null,
    textoGancho: gancho,
  };

  // La opinión del entrenador (Task v3) se calcula sobre la oferta YA armada
  // (necesita id/rivalApodo/bolsa/enJuego/esTitulo) y se hornea acá mismo,
  // igual que `textoGancho`: no consume rng (ver el comentario en
  // `indiceEstable`), así que no mueve la secuencia de azar de la carrera.
  oferta.opinionEntrenador = opinionEntrenador(jugador, oferta);
  oferta.fraseEntrenador = fraseEntrenador(jugador, oferta);

  return oferta;
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
  // El psicólogo deportivo (money.js) promete que "la mala racha te dura
  // menos": amortigua el golpe de moral de una derrota (no toca el envión de
  // ganar ni el empate).
  const tienePsicologo = (jugador.staff ?? []).includes('psicologo');
  const golpeDerrota = tienePsicologo ? -6 : -12;
  nuevo.estado.moral = clamp(nuevo.estado.moral + (gano ? 10 : empate ? 0 : golpeDerrota), 0, 100);

  if (oferta.esTitulo) {
    if (gano) {
      if (oferta.esObligatoria) {
        nuevo.defensas += 1;
        if (oferta.cinturonId) {
          nuevo.defensasCinturon = {
            ...nuevo.defensasCinturon,
            [oferta.cinturonId]: (nuevo.defensasCinturon?.[oferta.cinturonId] ?? 0) + 1,
          };
        }
      } else if (!nuevo.titulos.includes(oferta.enJuego)) {
        nuevo.titulos.push(oferta.enJuego);
        titulosGanados.push(oferta.enJuego);
        // Arranca un reinado nuevo de ese cinturón: el contador de defensas
        // de ESTE cinturón se resetea (aunque `defensas`, el total de toda
        // la carrera, sigue acumulando).
        if (oferta.cinturonId) {
          nuevo.defensasCinturon = { ...nuevo.defensasCinturon, [oferta.cinturonId]: 0 };
        }
      }
    } else if (!empate) {
      nuevo.titulos = nuevo.titulos.filter((t) => t !== oferta.enJuego);
    }
  }

  nuevo.historial.push({
    rivalId: oferta.rivalId,
    rivalNombre: oferta.rivalNombre,
    rivalApodo: oferta.rivalApodo,
    rivalMedia: oferta.rivalMedia,
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
