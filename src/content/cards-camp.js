// Cartas de campamento (Task v3, "las semanas de preparación antes de una
// pelea"): a diferencia de CARTAS_MEJORA/CARTAS_EVENTO, estas son SIEMPRE
// sobre la pelea que ya está firmada — el texto puede nombrar al rival vía el
// marcador {rival} (lo rellena `elegirCartaCampamento`, en
// src/core/campamento.js, con `oferta.rivalApodo`, mismo patrón que
// `rellenar` en offers.js). Cada carta enfrenta el trabajo disciplinado
// contra la distracción: la opción seria mejora atributos/forma (a veces con
// un costo de fatiga), la floja cede moral o forma a cambio de algo liviano.
// Sin dinero ni fama: el campamento es puramente físico/mental, no un evento
// de vida — y sin legendarias: dura 2-3 beats nomás, no alcanza para ese
// golpe de suerte aparte del que ya reparte 'mejora'.

const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

// Sistema 2 (feedback del usuario: "la media avanza muy lento"): mismo
// criterio que cards-improve.js — los mods de atributos de combate de las
// opciones "serias" (la que cuesta fatiga/disciplina) suben +1 respecto de
// la v3, así el campamento de cada pelea también empuja la MEDIA de forma
// perceptible.
export const CARTAS_CAMPAMENTO = [
  {
    id: 'estudiar_al_rival',
    categoria: 'campamento',
    titulo: 'Estudiar a {rival}',
    texto: 'Tu entrenador trajo videos de las últimas peleas de {rival}. Hay patrones para leer, si te tomás el trabajo.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'estudiar', texto: 'Mirar cada pelea, cuaderno en mano.', mods: { iq: 5, tecnica: 3, fatiga: 4 } },
      { id: 'confiar', texto: 'Confiar en tu instinto, sin perder tiempo en pantallas.', mods: { moral: 4, iq: -2 } },
    ],
  },
  {
    id: 'trabajo_especifico',
    categoria: 'campamento',
    titulo: 'Trabajo específico',
    texto: 'El estilo de {rival} pide un plan puntual: guardia cerrada, distancia larga, lo que haga falta.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'plan', texto: 'Meterle horas al plan específico.', mods: { defensa: 4, tecnica: 4, fatiga: 5 } },
      { id: 'general', texto: 'Seguir con el trabajo general de siempre.', mods: { potencia: 3, velocidad: 3 } },
    ],
  },
  {
    id: 'el_peso',
    categoria: 'campamento',
    titulo: 'El peso',
    texto: 'La báscula no miente: todavía te faltan kilos para dar el peso el día de la pelea.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'cortar_fuerte', texto: 'Cortar fuerte, sin asco.', mods: { forma: -6, disciplinaPersonal: 5 } },
      { id: 'cortar_progresivo', texto: 'Bajarlo despacio, sin castigar el cuerpo.', mods: { cardio: 2, forma: 2, fatiga: 3 } },
    ],
  },
  {
    id: 'concentracion',
    categoria: 'campamento',
    titulo: 'La cabeza en la pelea',
    texto: 'Faltan días y la ansiedad empieza a jugar. Cuesta pensar en otra cosa que no sea {rival}.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'meditar', texto: 'Bajar un cambio: respirar, visualizar, dormir bien.', mods: { moral: 6, fatiga: -4 } },
      { id: 'obsesionarte', texto: 'Darle manija a la obsesión: entrenar hasta reventar.', mods: { potencia: 4, moral: -5, fatiga: 6 } },
    ],
  },
  {
    id: 'prensa_del_campamento',
    categoria: 'campamento',
    titulo: 'Un cronista se cuela en el gimnasio',
    texto: 'Quiere ver cómo entrenás para la pelea contra {rival}. La nota puede quedar bien, o interrumpir todo.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'dejarlo', texto: 'Dejarlo mirar un rato.', mods: { moral: 3, forma: -3 } },
      { id: 'echarlo', texto: 'Pedirle al entrenador que lo saque.', mods: { disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'descanso_tactico',
    categoria: 'campamento',
    titulo: 'Un día sin gimnasio',
    texto: 'Tu entrenador insiste: falta poco para {rival}, y un cuerpo cansado no rinde. Toca elegir.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'descansar', texto: 'Hacerle caso: un día entero de descanso.', mods: { forma: 5, fatiga: -12, potencia: -1 } },
      { id: 'seguir', texto: 'Ir igual. Cada día cuenta.', mods: { potencia: 2, fatiga: 8 } },
    ],
  },
  {
    id: 'sparring_extra',
    categoria: 'campamento',
    titulo: 'Un round más',
    texto: 'El sparring terminó, pero todavía queda luz. ¿Uno más contra un peleador que se mueve como {rival}?',
    etapas: SIEMPRE,
    rareza: 'rara',
    opciones: [
      { id: 'sumar', texto: 'Meter un round extra.', mods: { menton: 3, tecnica: 3, forma: -5, fatiga: 6 } },
      { id: 'cortarla', texto: 'Cortarla ahí, no arriesgar de más.', mods: { forma: 3 } },
    ],
  },
  {
    id: 'entorno_del_campamento',
    categoria: 'campamento',
    titulo: 'La casa llena de gente',
    texto: 'Familia, amigos, vecinos: todos quieren pasar antes de la pelea contra {rival}. Es lindo, y también un quilombo.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'recibirlos', texto: 'Recibirlos: hace bien tenerlos cerca.', mods: { moral: 7, forma: -3 } },
      { id: 'aislarte', texto: 'Aislarte hasta la pelea.', mods: { disciplinaPersonal: 4, moral: -3 } },
    ],
  },
  {
    id: 'ultimos_ajustes',
    categoria: 'campamento',
    titulo: 'Los últimos ajustes',
    texto: 'Con {rival} ya estudiado y el cuerpo a punto, quedan los detalles finos antes de subir al ring.',
    etapas: SIEMPRE,
    rareza: 'rara',
    opciones: [
      { id: 'afinar', texto: 'Afinar cada detalle con el entrenador.', mods: { tecnica: 4, iq: 3, defensa: 3, fatiga: 3 } },
      { id: 'relajarte', texto: 'Bajar la intensidad y llegar fresco.', mods: { forma: 4, fatiga: -6, tecnica: -1 } },
    ],
  },

  // --- Decisiones de DOS opciones con dilema real (Pedido 1, v4): mismo
  // patrón que las nuevas de cards-events.js — una opción cuesta algo, la
  // otra directamente no cambia nada. El campamento YA es 100% de dos
  // opciones (nunca tres, ver campamento.test.js), así que estas se mezclan
  // sin más trámite con las de siempre.
  {
    id: 'dia_franco',
    categoria: 'campamento',
    titulo: 'El día franco',
    texto: 'Tu entrenador te ofrece bajar la persiana un día entero antes de {rival}, sin cargo de conciencia.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'tomarlo', texto: 'Tomarlo: un día entero de nada.', mods: { forma: 6, fatiga: -14 } },
      { id: 'no_tomarlo', texto: 'Seguir como si nada.', mods: {} },
    ],
  },
  {
    id: 'ropa_nueva_de_entrenar',
    categoria: 'campamento',
    titulo: 'Ropa nueva para entrenar',
    texto: 'La marca que te viste manda un cargamento de ropa técnica último modelo justo para el campamento de {rival}.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'usarla', texto: 'Estrenarla en cada sesión.', mods: { moral: 3, forma: 2 } },
      { id: 'no_usarla', texto: 'Quedarte con la de siempre, por superstición.', mods: {} },
    ],
  },
  {
    id: 'video_motivacional',
    categoria: 'campamento',
    titulo: 'El video antes de dormir',
    texto: 'Tu entrenador te manda, todas las noches, un video viejo de una paliza histórica para "meterte en clima" contra {rival}.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'mirarlos', texto: 'Mirarlos todos, aunque te cueste dormir.', mods: { iq: 2, moral: -3 } },
      { id: 'ignorarlos', texto: 'Borrar el chat y dormir tranquilo.', mods: {} },
    ],
  },
  {
    id: 'sesion_biomecanica',
    categoria: 'campamento',
    titulo: 'El biomecánico',
    texto: 'Un especialista carísimo se ofrece a analizarte cuadro por cuadro para afinar cada golpe antes de {rival}.',
    etapas: SIEMPRE,
    rareza: 'rara',
    opciones: [
      { id: 'hacerlo', texto: 'Hacer la sesión completa.', mods: { tecnica: 5, iq: 2, fatiga: 3 } },
      { id: 'pasar', texto: 'Pasar: confiar en el ojo de siempre.', mods: {} },
    ],
  },

  // --- Pedido 2 y 3 (v7, "más tarjetas de % y también en el campamento" +
  // "más de dos opciones, con alguna que no haga nada"): el campamento nunca
  // había tenido azar — `resolverOpcion` (events.js) ya lo soportaba de
  // arranque (beatCampCarta lo usa igual que evento/redes), así que sumarlo
  // acá es puro contenido nuevo, sin tocar el motor.
  {
    id: 'suplemento_del_gimnasio',
    categoria: 'campamento',
    titulo: 'El suplemento "importado"',
    texto: 'En el gimnasio venden un suplemento carísimo, de dudoso origen, que promete un plus de rendimiento justo para {rival}.',
    etapas: SIEMPRE,
    rareza: 'rara',
    opciones: [
      { id: 'comprarlo', texto: 'Comprarlo y probarlo.', efectos: { dinero: -9000 }, probabilidades: [
        { peso: 75, mods: { cardio: 4, potencia: 2 }, texto: 'Funciona mejor de lo esperado: llegás con las pilas a full.' },
        { peso: 25, mods: { forma: -8 }, texto: 'Te cae pésimo al estómago. Dos días de entrenamiento livianito, a pura bronca.' },
      ] },
      { id: 'no_comprarlo', texto: 'Ahorrarte la plata y seguir como siempre.', mods: {} },
    ],
  },
  {
    id: 'pronostico_de_la_prensa',
    categoria: 'campamento',
    titulo: 'El pronóstico del diario',
    texto: 'Un diario deportivo publica un pronóstico contundente sobre tu pelea contra {rival}. Para bien o para mal, todo el gimnasio ya lo leyó.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'leerlo', texto: 'Leerlo entero, aunque duela.', probabilidades: [
        { peso: 60, mods: { moral: 6 }, texto: 'Te dan como ampli favorito. Entrenás con el pecho inflado.' },
        { peso: 40, mods: { moral: -7 }, texto: 'Te dan como perdedor cantado. Cuesta sacárselo de la cabeza en cada sesión.' },
      ] },
      { id: 'no_leerlo', texto: 'Pedirle al entrenador que no te cuente nada.', mods: {} },
    ],
  },
  {
    id: 'musica_del_gimnasio',
    categoria: 'campamento',
    titulo: 'La música del gimnasio',
    texto: 'El parlante de siempre se rompió y alguien trajo el suyo: lo que se elija va a sonar toda la semana antes de {rival}.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'elegirla', texto: 'Elegir vos la lista.', mods: { moral: 4, disciplinaPersonal: -2 } },
      { id: 'dejarla', texto: 'Dejar que suene lo que venga.', mods: {} },
    ],
  },
  {
    id: 'visita_de_los_chicos',
    categoria: 'campamento',
    titulo: 'La visita de la escuelita',
    texto: 'Los pibes de la escuelita del club piden ir a ver un entrenamiento tuyo antes de {rival}: quieren sacarse fotos y mirar de cerca.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'recibirlos', texto: 'Recibirlos y hacerles un rato.', mods: { moral: 6, forma: -3 } },
      { id: 'otro_dia', texto: 'Pedirles que vuelvan otro día.', mods: {} },
    ],
  },
];
