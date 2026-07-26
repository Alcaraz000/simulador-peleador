const TODAS = 'todas';
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

export const CARTAS_MEJORA = [
  { id: 'doble_turno', titulo: 'Doble turno como cuando eras pibe', texto: 'Mañana y tarde en el gimnasio, sin chistar.', mods: { cardio: 4, fatiga: 5 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'bolsa_pesada', titulo: 'La bolsa pesada hasta que duela', texto: 'Mil golpes por día. Los nudillos se acostumbran.', mods: { potencia: 4, velocidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'espejo', titulo: 'Horas frente al espejo', texto: 'Sombra, guardia, pie. Otra vez. Y otra.', mods: { tecnica: 4 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'sparring_duro', titulo: 'Sparring con uno más grande', texto: 'Te comés unas cuantas, pero aprendés a leer.', mods: { iq: 4, menton: 2, forma: -4 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'saltar_soga', titulo: 'La soga hasta que se corte', texto: 'Pies livianos, cabeza quieta.', mods: { velocidad: 4, cardio: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'guardia', titulo: 'Nadie te toca la cara', texto: 'Semana entera solo defendiendo. Aburrido y efectivo.', mods: { defensa: 5, potencia: -2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'video', titulo: 'Videos hasta la madrugada', texto: 'Estudiás rivales como si fueran para un examen.', mods: { iq: 5, cardio: -2 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'rara' },
  { id: 'cuello', titulo: 'Trabajo de cuello', texto: 'Feo, incómodo y te salva de un nocaut.', mods: { menton: 4, defensa: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'dieta', titulo: 'Dieta en serio por primera vez', texto: 'Nada de asado hasta después de la pelea.', mods: { disciplinaPersonal: 5, forma: 5, cardio: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara' },
  { id: 'altura', titulo: 'Campamento en la altura', texto: 'Aire fino, piernas de acero.', mods: { cardio: 6, forma: -3 }, etapas: ['profesional', 'veterano'], disciplinas: TODAS, rareza: 'rara' },
  { id: 'descanso', titulo: 'Una semana sin tocar el gimnasio', texto: 'El entrenador insiste: el cuerpo también se construye descansando.', mods: { forma: 10, fatiga: -20, potencia: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara' },
  { id: 'contragolpe', titulo: 'Timing de contragolpe', texto: 'Esperar el error ajeno y castigarlo.', mods: { tecnica: 3, iq: 3, potencia: -1 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'normal' },
  { id: 'gancho_higado', titulo: 'El gancho al hígado, mil veces', texto: 'Al cuerpo se gana. El que no respira, no pelea.', mods: { potencia: 3, tecnica: 2, velocidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'jab', titulo: 'El jab como religión', texto: 'Todo empieza y termina con la mano de adelante.', mods: { tecnica: 3, velocidad: 3, potencia: -2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'veterania', titulo: 'Trucos de veterano', texto: 'Ya no corrés como antes, pero sabés dónde pararte.', mods: { iq: 6, tecnica: 2, velocidad: -3 }, etapas: ['veterano'], disciplinas: TODAS, rareza: 'rara' },

  // Legendarias: raras a propósito (~5% del sorteo) y deliberadamente potentes.
  // No se nerfean — la gracia es que, de vez en cuando, te toque una carrera
  // de leyenda.
  { id: 'racha_mistica', titulo: 'La racha que no se explica', texto: 'Todo lo que tirás entra. El cuerpo responde antes de que lo pienses.', mods: { potencia: 8, tecnica: 6 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },
  { id: 'campamento_perfecto', titulo: 'El campamento perfecto', texto: 'Ni un día flojo, ni una excusa, ni una lesión. Todo salió como en los libros.', mods: { cardio: 8, velocidad: 5 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },
  { id: 'secreto_del_entrenador', titulo: 'El secreto que el entrenador guardaba', texto: 'Treinta años de esquina resumidos en una tarde de gimnasio. Ahora es tuyo.', mods: { iq: 10, menton: 4 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },

  // --- Recuperación (Sistema 1, feedback del usuario: "las tarjetas que
  // aparecen están condicionadas al estado del jugador" — lesionado tiene que
  // ver kinesiología, reposo, cuidado; nunca machaque de gimnasio). Solo
  // elegibles con `estados: ['lesionado']` (ver cartaAplicaPorEstado,
  // cards.js): mientras estás sano, `repartirMejoras` nunca las reparte.
  {
    id: 'reposo_estricto', titulo: 'Reposo estricto, sin vueltas', texto: 'El médico fue claro: nada de forzar. Descansar bien también es entrenar.', mods: { forma: 8, fatiga: -15 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'kinesiologia_diaria', titulo: 'Kinesiología todos los días', texto: 'Bici fija, hielo, manos que saben. De a poco, vuelve.', mods: { forma: 10 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'dieta_de_recuperacion', titulo: 'Comer para sanar', texto: 'Proteína, verdura y paciencia. El cuerpo pide tiempo, no plazos.', mods: { forma: 6, disciplinaPersonal: 3 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'psicologo_del_bache', titulo: 'La cabeza también se lesiona', texto: 'Charlar con el psicólogo del equipo mientras el cuerpo no responde.', mods: { moral: 8, forma: 3 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'video_desde_el_sillon', titulo: 'Estudiar rivales desde el sillón', texto: 'No podés mover el cuerpo, pero la cabeza sigue entrenando.', mods: { iq: 4, forma: 4 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'rara', estados: ['lesionado'],
  },
  {
    id: 'paciencia_de_lesionado', titulo: 'La paciencia que no tenías', texto: 'Aprender a esperar sin quemar etapas: la lesión, a su manera, también forma.', mods: { disciplinaPersonal: 5, forma: 5 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara', estados: ['lesionado'],
  },
];
