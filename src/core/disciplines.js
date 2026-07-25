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
    roundsPorNivel: { amateur: 3, profesional: 8, titulo: 12 },
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
