/**
 * v1: solo boxeo. La estructura queda preparada para sumar MMA más adelante
 * (usaGrappling, desenlaces y roundsPorNivel ya contemplan ese caso).
 */
export const DISCIPLINAS = {
  boxeo: {
    id: 'boxeo',
    nombre: 'Boxeo',
    usaGrappling: false,
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

// v13: `pesosDe` desapareció con los pesos por atributo — la media pasó a ser
// el promedio simple de los cuatro (mediaDe, fighter.js), que es justamente
// lo que hace que "+4 en un atributo = +1 de media" sea cierto y legible.
