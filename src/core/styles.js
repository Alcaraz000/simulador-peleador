import { sortearPorRareza } from './cards.js';

/**
 * Ciclo de ventajas: ya no es un triangulo puro desde que se sumo el
 * contragolpeador (legendario), y crece de nuevo con los cuatro estilos de
 * v4 (volante, presionador, zurdo_cruzado, rustico). Cada estilo tiene que
 * ganarle a al menos otro y perderle a al menos otro (verificado en
 * styles.test.js sobre TODO Object.values(ESTILOS), no una lista fija:
 * ningun estilo queda invicto ni pierde contra todos). Relaciones vigentes:
 *   - tecnico         > noqueador        (lo desborda a puntos)
 *   - noqueador       > menton           (lo apaga antes de que desgaste)
 *   - menton          > tecnico          (lo quiebra a rounds largos)
 *   - menton          > contragolpeador  (la presión no le da tiempo/espacio para esperar)
 *   - contragolpeador > noqueador        (le cobra cada golpe que se manda de más)
 *   - contragolpeador > rustico          (cobra cada golpe sucio que se manda de más)
 *   - volante         > presionador      (la velocidad y el juego de piernas cansan al que viene siempre para adelante)
 *   - presionador     > zurdo_cruzado    (la presión constante no deja tiempo para acomodar la guardia cambiada)
 *   - zurdo_cruzado   > tecnico          (el ángulo zurdo rompe la simetría del ortodoxo clásico)
 *   - rustico         > volante          (una vez que lo agarra en las cuerdas, el roce sucio le corta el vuelo)
 * `tecnico` vs `contragolpeador` queda neutro (0): ninguno tiene el filo
 * clasico contra el otro. Mismo criterio para cualquier par sin relación
 * declarada explícitamente en `fuerteContra`/`debilContra`.
 */
// v13 (simplificación a cuatro atributos): potencia/velocidad/técnica/IQ/
// mentón se funden en fuerza/agilidad/defensa/cardio. `fuerteContra`/
// `debilContra` no se tocan: el ciclo de ventajas no depende de los mods,
// solo de esas relaciones declaradas — así que sigue cerrado tal cual estaba.
export const ESTILOS = {
  noqueador: {
    id: 'noqueador',
    nombre: 'Noqueador',
    descripcion: 'Una mano y se termina. Peligroso temprano, se funde tarde.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { fuerza: 7, defensa: -1, cardio: -4 },
    fuerteContra: ['menton'],
    debilContra: ['tecnico', 'contragolpeador'],
  },
  tecnico: {
    id: 'tecnico',
    nombre: 'Técnico',
    descripcion: 'Preciso y escurridizo. Gana por puntos y desgaste.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { defensa: 8, agilidad: 2, fuerza: -5 },
    fuerteContra: ['noqueador'],
    debilContra: ['menton', 'zurdo_cruzado'],
  },
  menton: {
    id: 'menton',
    nombre: 'Mentón de hierro',
    descripcion: 'Aguanta todo y quiebra al rival en rounds largos.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: { defensa: 6, cardio: 5, agilidad: -4 },
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
    mods: { fuerza: -4, cardio: -3, agilidad: 11, defensa: 6 },
    fuerteContra: ['noqueador', 'rustico'],
    debilContra: ['menton'],
  },
  // --- Catálogo v4 ("más estilos y apodos, y que se elijan 2 al azar") ---
  volante: {
    id: 'volante',
    nombre: 'Volante',
    descripcion: 'Nunca está donde el rival apunta. Gira, pica y se guarda para las rondas finales.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: {
      agilidad: 6, defensa: 1, cardio: 2, fuerza: -5,
    },
    fuerteContra: ['presionador'],
    debilContra: ['rustico'],
  },
  presionador: {
    id: 'presionador',
    nombre: 'Presionador',
    descripcion: 'Camina para adelante desde la campana y no negocia el ring. Te ahoga a metros, no a golpes lindos.',
    disciplinas: ['boxeo'],
    rareza: 'normal',
    mods: {
      fuerza: 5, cardio: 6, defensa: -8,
    },
    fuerteContra: ['zurdo_cruzado'],
    debilContra: ['volante'],
  },
  // Rara. Amelia "La Zurda" Funes (ver coaches.js) le enseña a romper la
  // simetría del boxeo ortodoxo con ángulos que nadie entrena en el barrio.
  zurdo_cruzado: {
    id: 'zurdo_cruzado',
    nombre: 'Zurdo cruzado',
    descripcion: 'La guardia cambiada rompe el libreto de cualquier ortodoxo. Ángulos raros, cabeza en otro lado.',
    disciplinas: ['boxeo'],
    rareza: 'rara',
    mods: {
      defensa: 3, agilidad: 8, cardio: -3,
    },
    fuerteContra: ['tecnico'],
    debilContra: ['presionador'],
  },
  // Rara. Sin códigos: reglamento apenas sugerido. No se nerfea por ser
  // rara — pega fuerte cuando el árbitro mira para otro lado.
  rustico: {
    id: 'rustico',
    nombre: 'Rústico',
    descripcion: 'Códigos, los justos. Cabezazo "sin querer", codo que se resbala, roce bajo el cinturón — todo entra si el árbitro no mira.',
    disciplinas: ['boxeo'],
    rareza: 'rara',
    mods: {
      fuerza: 6, defensa: -1, agilidad: -4,
    },
    fuerteContra: ['volante'],
    debilContra: ['contragolpeador'],
  },
};

export const VENTAJA_ESTILO = 0.06;

export function estilosDisponibles(disciplinaId) {
  return Object.values(ESTILOS).filter((e) => e.disciplinas.includes(disciplinaId));
}

// Pedido v4 ("que solo puedan elegirse 2 opciones al azar"): con 8 estilos
// en el catálogo, mostrar los 4 (ahora 8) fijos de siempre en la creación
// mataba la rejugabilidad. Reparte 2 estilos sin repetir con la MISMA
// distribución de rarezas del proyecto (~70/25/5) — reusa `sortearPorRareza`
// (cards.js), el mismo algoritmo que ya usan `repartirOrigenes` (fighter.js)
// y `repartirApodos` (nicknames.js), nunca un tercer algoritmo de reparto.
export function repartirEstilos(rng, disciplinaId = 'boxeo') {
  return sortearPorRareza(rng, estilosDisponibles(disciplinaId), 2);
}

export function ventajaDeEstilo(estiloA, estiloB) {
  const a = ESTILOS[estiloA];
  if (!a || !ESTILOS[estiloB] || estiloA === estiloB) return 0;
  if (a.fuerteContra.includes(estiloB)) return VENTAJA_ESTILO;
  if (a.debilContra.includes(estiloB)) return -VENTAJA_ESTILO;
  return 0;
}
