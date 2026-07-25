/**
 * Ciclo de ventajas: ya no es un triangulo puro desde que se sumo el
 * contragolpeador (legendario). Cada estilo tiene que ganarle a al menos
 * otro y perderle a al menos otro (verificado en styles.test.js: ningun
 * estilo queda invicto ni pierde contra todos). Relaciones vigentes:
 *   - tecnico         > noqueador        (lo desborda a puntos)
 *   - noqueador       > menton           (lo apaga antes de que desgaste)
 *   - menton          > tecnico          (lo quiebra a rounds largos)
 *   - menton          > contragolpeador  (la presión no le da tiempo/espacio para esperar)
 *   - contragolpeador > noqueador        (le cobra cada golpe que se manda de más)
 * `tecnico` vs `contragolpeador` queda neutro (0): ninguno tiene el filo
 * clasico contra el otro.
 */
export const ESTILOS = {
  noqueador: {
    id: 'noqueador',
    nombre: 'Noqueador',
    descripcion: 'Una mano y se termina. Peligroso temprano, se funde tarde.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { potencia: 7, menton: 2, cardio: -4, tecnica: -3 },
    fuerteContra: ['menton'],
    debilContra: ['tecnico', 'contragolpeador'],
  },
  tecnico: {
    id: 'tecnico',
    nombre: 'Técnico',
    descripcion: 'Preciso y escurridizo. Gana por puntos y desgaste.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { tecnica: 6, defensa: 4, velocidad: 2, potencia: -5, menton: -2 },
    fuerteContra: ['noqueador'],
    debilContra: ['menton'],
  },
  menton: {
    id: 'menton',
    nombre: 'Mentón de hierro',
    descripcion: 'Aguanta todo y quiebra al rival en rounds largos.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { menton: 9, cardio: 5, velocidad: -4, tecnica: -3 },
    fuerteContra: ['tecnico', 'contragolpeador'],
    debilContra: ['noqueador'],
  },
  // Legendario. Con Nicolino Lecho de entrenador (ver src/content/coaches.js):
  // espera el error del rival y lo cobra caro. No se nerfea a propósito.
  contragolpeador: {
    id: 'contragolpeador',
    nombre: 'Contragolpeador',
    descripcion: 'Espera el error ajeno y lo cobra caro. Al que se abre de más, lo cierra en el momento.',
    disciplinas: ['boxeo'],
    rareza: 'legendaria',
    mods: { potencia: -4, cardio: -3, velocidad: 5, tecnica: 6, iq: 6 },
    fuerteContra: ['noqueador'],
    debilContra: ['menton'],
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
