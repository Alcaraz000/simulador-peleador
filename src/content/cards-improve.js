const TODAS = 'todas';
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

export const CARTAS_MEJORA = [
  { id: 'doble_turno', titulo: 'Doble turno como cuando eras pibe', texto: 'Mañana y tarde en el gimnasio, sin chistar.', mods: { cardio: 4, fatiga: 5 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'bolsa_pesada', titulo: 'La bolsa pesada hasta que duela', texto: 'Mil golpes por día. Los nudillos se acostumbran.', mods: { potencia: 4, velocidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'espejo', titulo: 'Horas frente al espejo', texto: 'Sombra, guardia, pie. Otra vez. Y otra.', mods: { tecnica: 4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'sparring_duro', titulo: 'Sparring con uno más grande', texto: 'Te comés unas cuantas, pero aprendés a leer.', mods: { iq: 4, menton: 2, forma: -4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'saltar_soga', titulo: 'La soga hasta que se corte', texto: 'Pies livianos, cabeza quieta.', mods: { velocidad: 4, cardio: 1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'guardia', titulo: 'Nadie te toca la cara', texto: 'Semana entera solo defendiendo. Aburrido y efectivo.', mods: { defensa: 5, potencia: -2 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'video', titulo: 'Videos hasta la madrugada', texto: 'Estudiás rivales como si fueran para un examen.', mods: { iq: 5, cardio: -2 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS },
  { id: 'cuello', titulo: 'Trabajo de cuello', texto: 'Feo, incómodo y te salva de un nocaut.', mods: { menton: 4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'dieta', titulo: 'Dieta en serio por primera vez', texto: 'Nada de asado hasta después de la pelea.', mods: { disciplinaPersonal: 5, forma: 5 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'altura', titulo: 'Campamento en la altura', texto: 'Aire fino, piernas de acero.', mods: { cardio: 6, forma: -3 }, etapas: ['profesional', 'veterano'], disciplinas: TODAS },
  { id: 'descanso', titulo: 'Una semana sin tocar el gimnasio', texto: 'El entrenador insiste: el cuerpo también se construye descansando.', mods: { forma: 10, fatiga: -20, potencia: -1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'contragolpe', titulo: 'Timing de contragolpe', texto: 'Esperar el error ajeno y castigarlo.', mods: { tecnica: 3, iq: 3, potencia: -1 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS },
  { id: 'gancho_higado', titulo: 'El gancho al hígado, mil veces', texto: 'Al cuerpo se gana. El que no respira, no pelea.', mods: { potencia: 3, tecnica: 2, velocidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'jab', titulo: 'El jab como religión', texto: 'Todo empieza y termina con la mano de adelante.', mods: { tecnica: 3, velocidad: 3, potencia: -2 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'veterania', titulo: 'Trucos de veterano', texto: 'Ya no corrés como antes, pero sabés dónde pararte.', mods: { iq: 6, tecnica: 2, velocidad: -3 }, etapas: ['veterano'], disciplinas: TODAS },
];
