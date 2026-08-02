// Mazo de mejoras (v13, simplificación a cuatro atributos: fuerza, defensa,
// cardio, agilidad). Cada carta es una tarjeta INDEPENDIENTE: `repartirMejoras`
// (cards.js) ofrece 2 o 3 de éstas lado a lado y el jugador elige UNA entera
// — la variedad de "qué subir" sale de que el catálogo cubra los cuatro
// atributos con cartas distintas, no de opciones dentro de una misma carta.
//
// La aritmética de diseño (spec 2026-07-28): la media es el promedio simple
// de los cuatro atributos, así que +4 en uno mueve la media un punto entero.
// Por eso el efecto típico de una normal/rara es +3 o +4 en el atributo
// principal (con una baja chica de -1 en otro, para que se sienta una
// elección real, no un regalo). Las legendarias no se nerfean: pueden dar
// hasta +8 de un saque — dos puntos enteros de media.
const TODAS = 'todas';
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];
const PRO = ['profesional', 'veterano'];

export const CARTAS_MEJORA = [
  // --- Normales: el grueso del mazo ---
  { id: 'bolsa_pesada', titulo: 'La bolsa pesada hasta que duela', texto: 'Mil golpes por día. Los nudillos se acostumbran, la mano empieza a pegar distinto.', mods: { fuerza: 4, agilidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'sombra_y_guardia', titulo: 'Sombra y guardia, mil veces', texto: 'Repetís el mismo gesto hasta que el cuerpo lo hace solo, sin pensarlo.', mods: { defensa: 4, fuerza: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'soga_sin_parar', titulo: 'La soga hasta que se corte', texto: 'Pies livianos, pulmón que no se queja. La cuerda no perdona a nadie.', mods: { agilidad: 4, cardio: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  // Rebalanceo (Pedido 3, v14): daba +4 Cardio sin ningún costo — la única
  // normal "de regalo" del mazo (todas las demás de un solo atributo pagan
  // una baja chica en otro, ver la nota de diseño arriba), lo que la dejaba
  // dominando de taquito a cualquier carta de cardio con una baja (p. ej. "El
  // circuito que no perdona"). Con la baja de agilidad pasa a competir de
  // igual a igual: mismo cardio, distinto costo.
  {
    id: 'doble_turno', titulo: 'Doble turno como cuando eras pibe', texto: 'Mañana y tarde en el gimnasio, sin chistar — igual que en aquellos años.', mods: { cardio: 4, agilidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', condiciones: { edadMin: 21 },
  },
  { id: 'nadie_te_toca', titulo: 'Nadie te toca la cara', texto: 'Semana entera solo defendiendo. Aburrido y efectivo.', mods: { defensa: 4, agilidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'sparring_duro', titulo: 'Sparring con uno más grande', texto: 'Te comés unas cuantas, pero aprendés a leer el peligro antes de que llegue.', mods: { defensa: 3, cardio: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'contragolpe_de_reloj', titulo: 'Timing de contragolpe', texto: 'Esperar el error ajeno y castigarlo en el momento justo.', mods: { agilidad: 3, defensa: 1 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'normal' },
  { id: 'gancho_al_higado', titulo: 'El gancho al hígado, mil veces', texto: 'Al cuerpo se gana. El que no respira, no pelea.', mods: { fuerza: 4, cardio: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'jab_como_religion', titulo: 'El jab como religión', texto: 'Todo empieza y termina con la mano de adelante.', mods: { agilidad: 4, fuerza: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  // Rebalanceo (Pedido 3, v14, "ojo con mostrar tarjetas donde una es
  // claramente mejor... 'Pesas en serio' al mismo tiempo que 'La bolsa
  // pesada'"): con el mismo costo (agilidad-1) y menos fuerza que "La bolsa
  // pesada hasta que duela" (fuerza+4), esta carta nunca tenía motivo para
  // ganarle — dominada al dígito. Se le cambia el costo a defensa (mismo perfil
  // que "Pegada seca al cuerpo") para que compita en un eje distinto: quien
  // no puede resignar agilidad ahora tiene una alternativa real.
  { id: 'pesas_en_serio', titulo: 'Pesas en serio, por primera vez', texto: 'El profe insiste: sin base física, la técnica se cae en el séptimo round.', mods: { fuerza: 3, defensa: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'circuito_funcional', titulo: 'El circuito que no perdona', texto: 'Diez estaciones, sin pausa, hasta que las piernas pidan clemencia.', mods: { cardio: 4, fuerza: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'clinch_y_salida', titulo: 'Clinch y salida limpia', texto: 'Practicás cómo entrar pegado y salir sin que te castiguen por eso.', mods: { defensa: 3, agilidad: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'pique_de_velocidad', titulo: 'Piques de velocidad en la vereda', texto: 'Salidas cortas y explosivas, antes de que amanezca del todo.', mods: { agilidad: 3, cardio: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'guardia_alta_toda_la_semana', titulo: 'Guardia alta toda la semana', texto: 'Los brazos pesan al final del día, pero nada te entra limpio.', mods: { defensa: 4, fuerza: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'trote_de_madrugada', titulo: 'El trote de las cinco de la mañana', texto: 'Nadie te ve correr, pero el cuerpo se acuerda en el noveno round.', mods: { cardio: 3, defensa: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },
  { id: 'pegada_al_cuerpo', titulo: 'Pegada seca al cuerpo', texto: 'Nada de golpes de exhibición: cada uno busca doler de verdad.', mods: { fuerza: 3, defensa: -1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal' },

  // --- Raras: menos frecuentes, un poco más de efecto ---
  { id: 'video_hasta_la_madrugada', titulo: 'Videos hasta la madrugada', texto: 'Estudiás al rival como si fuera examen final, cuadro por cuadro.', mods: { agilidad: 5, cardio: -1 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'rara' },
  { id: 'campamento_en_la_altura', titulo: 'Campamento en la altura', texto: 'Aire fino, piernas de acero. Cuesta acostumbrarse, pero rinde.', mods: { cardio: 6, fuerza: -1 }, etapas: PRO, disciplinas: TODAS, rareza: 'rara' },
  { id: 'semana_sin_gimnasio', titulo: 'Una semana sin tocar el gimnasio', texto: 'El entrenador insiste: el cuerpo también se construye descansando.', mods: { defensa: 2, cardio: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara' },
  { id: 'trucos_de_veterano', titulo: 'Trucos de veterano', texto: 'Ya no corrés como antes, pero sabés dónde pararte y cuándo tirar.', mods: { defensa: 5, agilidad: -2 }, etapas: ['veterano'], disciplinas: TODAS, rareza: 'rara' },
  {
    id: 'preparacion_de_campeon', titulo: 'Preparación de campeón', texto: 'Entrenás distinto cuando tenés algo puesto que defender.', mods: { fuerza: 3, defensa: 2 }, etapas: PRO, disciplinas: TODAS, rareza: 'rara', condiciones: { campeon: true },
  },
  {
    id: 'hambre_de_debutante', titulo: 'El hambre del que recién empieza', texto: 'Todavía no tenés nada que perder, y eso se nota en cada sesión.', mods: { fuerza: 3, agilidad: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara', condiciones: { edadMax: 23 },
  },
  // Rebalanceo (Pedido 3, v14): sin ningún costo, +3/+3 dominaba de taquito a
  // "Una semana sin tocar el gimnasio" (defensa+2, cardio+2, misma rareza,
  // sin condición) apenas el jugador tenía la plata — nunca había motivo real
  // para elegir la otra. La baja de agilidad (el campamento de altísimo
  // nivel también cansa) le da un costo propio y deja de comerse a su prima
  // más barata.
  {
    id: 'plata_para_el_campamento', titulo: 'Plata para pagarte un campamento en serio', texto: 'Con unos mangos extra, el entrenamiento cambia de categoría.', mods: { cardio: 3, defensa: 3, agilidad: -1 }, etapas: PRO, disciplinas: TODAS, rareza: 'rara', condiciones: { dineroMin: 50000 },
  },

  // --- Legendarias: raras a propósito (~5%) y potentes de verdad. No se
  // nerfean: la gracia es que, de vez en cuando, te toque una carrera de
  // leyenda. Cada una mueve la media un par de puntos enteros de un saque.
  { id: 'racha_mistica', titulo: 'La racha que no se explica', texto: 'Todo lo que tirás entra. El cuerpo responde antes de que lo pienses.', mods: { fuerza: 8 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },
  { id: 'campamento_perfecto', titulo: 'El campamento perfecto', texto: 'Ni un día flojo, ni una excusa, ni una lesión. Todo salió como en los libros.', mods: { cardio: 5, agilidad: 3 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },
  { id: 'secreto_del_entrenador', titulo: 'El secreto que el entrenador guardaba', texto: 'Treinta años de esquina resumidos en una tarde de gimnasio. Ahora es tuyo.', mods: { defensa: 6, agilidad: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'legendaria' },

  // --- Recuperación (Sistema 1: mientras el jugador está lesionado, SOLO
  // estas aparecen — nunca las de gimnasio de arriba, ver cartaAplicaPorEstado
  // en cards.js). Ya no hay "forma" que restaurar (esa variable desapareció
  // con la simplificación): lo que se puede seguir entrenando estando
  // lastimado es trabajo liviano y mental, así que los mods acá son chicos.
  {
    id: 'reposo_activo', titulo: 'Reposo activo, sin forzar nada', texto: 'Bici fija liviana y estiramiento. El cuerpo cura y algo de fondo queda.', mods: { cardio: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'kinesiologia_diaria', titulo: 'Kinesiología todos los días', texto: 'Manos que saben, hielo y paciencia. De a poco, la parte sana vuelve más firme que antes.', mods: { defensa: 2 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'estudiar_desde_el_sillon', titulo: 'Estudiar rivales desde el sillón', texto: 'No podés mover el cuerpo, pero la cabeza sigue entrenando frente a la pantalla.', mods: { agilidad: 2 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS, rareza: 'rara', estados: ['lesionado'],
  },
  {
    id: 'dieta_de_recuperacion', titulo: 'Comer para sanar', texto: 'Proteína, verdura y paciencia. El cuerpo pide tiempo, no plazos.', mods: { cardio: 1, defensa: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
  {
    id: 'paciencia_de_lesionado', titulo: 'La paciencia que no tenías', texto: 'Aprender a esperar sin quemar etapas: la lesión, a su manera, también forma.', mods: { defensa: 2, agilidad: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'rara', estados: ['lesionado'],
  },
  {
    id: 'psicologo_del_bache', titulo: 'La cabeza también se lesiona', texto: 'Charlar con el psicólogo del equipo mientras el cuerpo todavía no responde.', mods: { agilidad: 1, defensa: 1 }, etapas: SIEMPRE, disciplinas: TODAS, rareza: 'normal', estados: ['lesionado'],
  },
];
