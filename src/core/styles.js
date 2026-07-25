/**
 * Ciclo de ventajas (piedra-papel-tijera):
 * técnico > noqueador > mentón de hierro > técnico
 */
export const ESTILOS = {
  noqueador: {
    id: 'noqueador',
    nombre: 'Noqueador',
    descripcion: 'Una mano y se termina. Peligroso temprano, se funde tarde.',
    disciplinas: ['boxeo'],
    mods: { potencia: 7, menton: 2, cardio: -4, tecnica: -3 },
    fuerteContra: ['menton'],
    debilContra: ['tecnico'],
  },
  tecnico: {
    id: 'tecnico',
    nombre: 'Técnico',
    descripcion: 'Preciso y escurridizo. Gana por puntos y desgaste.',
    disciplinas: ['boxeo'],
    mods: { tecnica: 6, defensa: 4, velocidad: 2, potencia: -5, menton: -2 },
    fuerteContra: ['noqueador'],
    debilContra: ['menton'],
  },
  menton: {
    id: 'menton',
    nombre: 'Mentón de hierro',
    descripcion: 'Aguanta todo y quiebra al rival en rounds largos.',
    disciplinas: ['boxeo'],
    mods: { menton: 9, cardio: 5, velocidad: -4, tecnica: -3 },
    fuerteContra: ['tecnico'],
    debilContra: ['noqueador'],
  },
};

export const VENTAJA_ESTILO = 0.06;

export function estilosDisponibles(disciplinaId) {
  return Object.values(ESTILOS).filter((e) => e.disciplinas.includes(disciplinaId));
}

export function ventajaDeEstilo(estiloA, estiloB) {
  const a = ESTILOS[estiloA];
  if (!a || !ESTILOS[estiloB] || estiloA === estiloB) return 0;
  if (a.fuerteContra.includes(estiloB)) return VENTAJA_ESTILO;
  if (a.debilContra.includes(estiloB)) return -VENTAJA_ESTILO;
  return 0;
}
