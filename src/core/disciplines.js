/**
 * v1: solo boxeo. La estructura queda preparada para sumar MMA más adelante
 * (usaGrappling, desenlaces y roundsPorNivel ya contemplan ese caso).
 */
export const DISCIPLINAS = {
  boxeo: {
    id: 'boxeo',
    nombre: 'Boxeo',
    usaGrappling: false,
    pesos: { potencia: 0.20, velocidad: 0.18, tecnica: 0.20, defensa: 0.17, cardio: 0.13, iq: 0.12 },
    desenlaces: ['ko', 'tko', 'decision', 'descalificacion'],
    // `eliminatoria` (Pedido 4, barrida de experto en boxeo): la pelea que
    // define quién pasa a disputar el título se juega a la misma distancia
    // QUE un título (como un final eliminator real de un organismo grande) —
    // no a la distancia genérica de una regional de trámite (8).
    roundsPorNivel: {
      amateur: 3, profesional: 8, eliminatoria: 12, titulo: 12,
    },
  },
};

export function getDisciplina(id) {
  const disciplina = DISCIPLINAS[id];
  if (!disciplina) throw new Error(`Disciplina desconocida: ${id}`);
  return disciplina;
}

export function pesosDe(id) {
  return getDisciplina(id).pesos;
}
