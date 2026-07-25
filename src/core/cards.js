import { ETIQUETAS, aplicarModificadores, clamp, LIMITES_ESTADO } from './stats.js';
import { bonusCartas } from './money.js';
import { CARTAS_MEJORA } from '../content/cards-improve.js';

export function formatearMods(mods) {
  return Object.entries(mods).map(([clave, valor]) => {
    const nombre = ETIQUETAS[clave]?.larga ?? clave;
    const signo = valor > 0 ? '+' : '';
    return `${signo}${valor} ${nombre}`;
  });
}

function cartaAplica(carta, { etapa, disciplina }) {
  const porEtapa = carta.etapas.includes(etapa);
  const porDisciplina = carta.disciplinas === 'todas' || carta.disciplinas.includes(disciplina);
  return porEtapa && porDisciplina;
}

export function repartirMejoras(rng, { jugador, etapa, cantidad = 3, catalogo = null }) {
  const fuente = catalogo ?? CARTAS_MEJORA;
  const bonus = bonusCartas(jugador);
  const total = cantidad + bonus.opcionesExtra;
  const elegibles = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina }));
  const mezcladas = rng.shuffle(elegibles).slice(0, total);

  if (bonus.bonusValor === 0) return mezcladas;
  return mezcladas.map((carta) => {
    const mods = {};
    for (const [clave, valor] of Object.entries(carta.mods)) {
      mods[clave] = valor > 0 ? valor + bonus.bonusValor : valor;
    }
    return { ...carta, mods };
  });
}

export function aplicarCarta(jugador, carta) {
  const nuevo = {
    ...jugador,
    atributos: { ...jugador.atributos },
    especiales: { ...jugador.especiales },
    estado: { ...jugador.estado },
  };

  const paraAtributos = {};
  const paraEspeciales = {};
  const paraEstado = {};
  for (const [clave, valor] of Object.entries(carta.mods)) {
    if (clave in nuevo.atributos) paraAtributos[clave] = valor;
    else if (clave in nuevo.especiales) paraEspeciales[clave] = valor;
    else if (clave in nuevo.estado) paraEstado[clave] = valor;
  }

  const a = aplicarModificadores(nuevo.atributos, paraAtributos);
  const e = aplicarModificadores(nuevo.especiales, paraEspeciales);
  const s = aplicarModificadores(nuevo.estado, paraEstado, LIMITES_ESTADO);
  nuevo.atributos = a.resultado;
  nuevo.especiales = e.resultado;
  nuevo.estado = s.resultado;

  const deltas = { ...a.deltas, ...e.deltas, ...s.deltas };
  return { jugador: nuevo, deltas, texto: formatearMods(deltas).join(' · ') };
}

export function resolverProbabilidad(rng, opcion) {
  const entradas = opcion.probabilidades.map((p) => ({ valor: p, peso: p.peso }));
  const elegida = rng.weighted(entradas);
  return { resultado: elegida.mods, texto: elegida.texto };
}
