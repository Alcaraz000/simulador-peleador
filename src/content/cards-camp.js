// Cartas de campamento (v13, simplificación a cuatro atributos): siempre
// sobre la pelea ya firmada — el texto puede nombrar al rival vía {rival}
// (lo rellena elegirCartaCampamento, src/core/campamento.js). Cada carta trae
// EXACTAMENTE dos opciones (nunca tres, ver campamento.test.js): la seria
// mejora atributos, la floja no hace nada o cede algo chico a cambio de
// tranquilidad. Sin dinero ni fama y sin legendarias: el campamento dura 2-5
// beats nomás, no alcanza para ese golpe de suerte aparte del que ya reparte
// el mazo de mejoras. La fatiga ya no vive acá (nace en 0 dentro de cada
// pelea, fight.js): estas cartas tocan solo fuerza/defensa/cardio/agilidad.
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

export const CARTAS_CAMPAMENTO = [
  {
    id: 'estudiar_al_rival', categoria: 'campamento', titulo: 'Estudiar a {rival}',
    texto: 'Tu entrenador trajo videos de las últimas peleas de {rival}. Hay patrones para leer, si te tomás el trabajo.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'estudiar', texto: 'Mirar cada pelea, cuaderno en mano.', mods: { agilidad: 3, defensa: 2 } },
      { id: 'confiar', texto: 'Confiar en tu instinto, sin perder tiempo en pantallas.', mods: {} },
    ],
  },
  {
    id: 'trabajo_especifico', categoria: 'campamento', titulo: 'Trabajo específico',
    texto: 'El estilo de {rival} pide un plan puntual: guardia cerrada, distancia larga, lo que haga falta.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'plan', texto: 'Meterle horas al plan específico.', mods: { defensa: 4, agilidad: 1 } },
      { id: 'general', texto: 'Seguir con el trabajo general de siempre.', mods: { fuerza: 2, cardio: 1 } },
    ],
  },
  {
    id: 'el_peso', categoria: 'campamento', titulo: 'El peso',
    texto: 'La báscula no miente: todavía te faltan kilos para dar el peso el día de la pelea.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'cortar_fuerte', texto: 'Cortar fuerte, sin asco.', mods: { defensa: 2, cardio: -3 } },
      { id: 'cortar_progresivo', texto: 'Bajarlo despacio, sin castigar el cuerpo.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'concentracion', categoria: 'campamento', titulo: 'La cabeza en la pelea',
    texto: 'Faltan días y la ansiedad empieza a jugar. Cuesta pensar en otra cosa que no sea {rival}.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'meditar', texto: 'Bajar un cambio: respirar, visualizar, dormir bien.', mods: { defensa: 2 } },
      { id: 'obsesionarte', texto: 'Darle manija a la obsesión: entrenar hasta reventar.', mods: { fuerza: 3, defensa: -2 } },
    ],
  },
  {
    id: 'prensa_del_campamento', categoria: 'campamento', titulo: 'Un cronista se cuela en el gimnasio',
    texto: 'Quiere ver cómo entrenás para la pelea contra {rival}. La nota puede quedar bien, o interrumpir todo.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'dejarlo', texto: 'Dejarlo mirar un rato.', mods: {} },
      { id: 'echarlo', texto: 'Pedirle al entrenador que lo saque.', mods: { defensa: 1 } },
    ],
  },
  {
    id: 'descanso_tactico', categoria: 'campamento', titulo: 'Un día sin gimnasio',
    texto: 'Tu entrenador insiste: falta poco para {rival}, y un cuerpo cansado no rinde. Toca elegir.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'descansar', texto: 'Hacerle caso: un día entero de descanso.', mods: { cardio: 3 } },
      { id: 'seguir', texto: 'Ir igual. Cada día cuenta.', mods: { fuerza: 2, cardio: -2 } },
    ],
  },
  {
    id: 'sparring_extra', categoria: 'campamento', titulo: 'Un round más',
    texto: 'El sparring terminó, pero todavía queda luz. ¿Uno más contra un peleador que se mueve como {rival}?',
    etapas: SIEMPRE, rareza: 'rara',
    opciones: [
      { id: 'sumar', texto: 'Meter un round extra.', mods: { defensa: 3, fuerza: 2, cardio: -2 } },
      { id: 'cortarla', texto: 'Cortarla ahí, no arriesgar de más.', mods: { cardio: 1 } },
    ],
  },
  {
    id: 'entorno_del_campamento', categoria: 'campamento', titulo: 'La casa llena de gente',
    texto: 'Familia, amigos, vecinos: todos quieren pasar antes de la pelea contra {rival}. Es lindo, y también un quilombo.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'recibirlos', texto: 'Recibirlos: hace bien tenerlos cerca.', mods: {} },
      { id: 'aislarte', texto: 'Aislarte hasta la pelea.', mods: { cardio: 1 } },
    ],
  },
  {
    id: 'ultimos_ajustes', categoria: 'campamento', titulo: 'Los últimos ajustes',
    texto: 'Con {rival} ya estudiado y el cuerpo a punto, quedan los detalles finos antes de subir al ring.',
    etapas: SIEMPRE, rareza: 'rara',
    opciones: [
      { id: 'afinar', texto: 'Afinar cada detalle con el entrenador.', mods: { defensa: 3, agilidad: 2 } },
      { id: 'relajarte', texto: 'Bajar la intensidad y llegar fresco.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'dia_franco', categoria: 'campamento', titulo: 'El día franco',
    texto: 'Tu entrenador te ofrece bajar la persiana un día entero antes de {rival}, sin cargo de conciencia.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'tomarlo', texto: 'Tomarlo: un día entero de nada.', mods: { cardio: 3 } },
      { id: 'no_tomarlo', texto: 'Seguir como si nada.', mods: {} },
    ],
  },
  {
    id: 'ropa_nueva_de_entrenar', categoria: 'campamento', titulo: 'Ropa nueva para entrenar',
    texto: 'La marca que te viste manda un cargamento de ropa técnica último modelo justo para el campamento de {rival}.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'usarla', texto: 'Estrenarla en cada sesión.', mods: { agilidad: 1 } },
      { id: 'no_usarla', texto: 'Quedarte con la de siempre, por superstición.', mods: {} },
    ],
  },
  {
    id: 'video_motivacional', categoria: 'campamento', titulo: 'El video antes de dormir',
    texto: 'Tu entrenador te manda, todas las noches, un video viejo de una paliza histórica para "meterte en clima" contra {rival}.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'mirarlos', texto: 'Mirarlos todos, aunque te cueste dormir.', mods: { agilidad: 2, cardio: -1 } },
      { id: 'ignorarlos', texto: 'Borrar el chat y dormir tranquilo.', mods: {} },
    ],
  },
  {
    id: 'sesion_biomecanica', categoria: 'campamento', titulo: 'El biomecánico',
    texto: 'Un especialista carísimo se ofrece a analizarte cuadro por cuadro para afinar cada golpe antes de {rival}.',
    etapas: SIEMPRE, rareza: 'rara',
    opciones: [
      { id: 'hacerlo', texto: 'Hacer la sesión completa.', mods: { defensa: 3, agilidad: 2 } },
      { id: 'pasar', texto: 'Pasar: confiar en el ojo de siempre.', mods: {} },
    ],
  },

  // --- Cartas de azar en el campamento: mismo patrón arriesgar-o-no que
  // cards-events.js, en proporciones variadas.
  {
    id: 'suplemento_del_gimnasio', categoria: 'campamento', titulo: 'El suplemento "importado"',
    texto: 'En el gimnasio venden un suplemento carísimo, de dudoso origen, que promete un plus de rendimiento justo para {rival}.',
    etapas: SIEMPRE, rareza: 'rara',
    opciones: [
      { id: 'comprarlo', texto: 'Comprarlo y probarlo.', probabilidades: [
        { peso: 75, mods: { cardio: 4, fuerza: 2 }, texto: 'Funciona mejor de lo esperado: llegás con las pilas a full.' },
        { peso: 25, mods: { cardio: -3 }, texto: 'Te cae pésimo al estómago. Dos días de entrenamiento livianito, a pura bronca.' },
      ] },
      { id: 'no_comprarlo', texto: 'Ahorrarte la plata y seguir como siempre.', mods: {} },
    ],
  },
  {
    id: 'pronostico_de_la_prensa', categoria: 'campamento', titulo: 'El pronóstico del diario',
    texto: 'Un diario deportivo publica un pronóstico contundente sobre tu pelea contra {rival}. Todo el gimnasio ya lo leyó.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'leerlo', texto: 'Leerlo entero, aunque duela.', probabilidades: [
        { peso: 60, mods: { defensa: 2 }, texto: 'Te dan como amplio favorito. Entrenás con el pecho inflado.' },
        { peso: 40, mods: { cardio: -2 }, texto: 'Te dan como perdedor cantado. Cuesta sacárselo de la cabeza en cada sesión.' },
      ] },
      { id: 'no_leerlo', texto: 'Pedirle al entrenador que no te cuente nada.', mods: {} },
    ],
  },
  {
    id: 'musica_del_gimnasio', categoria: 'campamento', titulo: 'La música del gimnasio',
    texto: 'El parlante de siempre se rompió y alguien trajo el suyo: lo que se elija va a sonar toda la semana antes de {rival}.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'elegirla', texto: 'Elegir vos la lista.', mods: {} },
      { id: 'dejarla', texto: 'Dejar que suene lo que venga.', mods: {} },
    ],
  },
  {
    id: 'visita_de_los_chicos', categoria: 'campamento', titulo: 'La visita de la escuelita',
    texto: 'Los pibes de la escuelita del club piden ir a ver un entrenamiento tuyo antes de {rival}: quieren sacarse fotos y mirar de cerca.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'recibirlos', texto: 'Recibirlos y hacerles un rato.', mods: {} },
      { id: 'otro_dia', texto: 'Pedirles que vuelvan otro día.', mods: { cardio: 1 } },
    ],
  },
  {
    id: 'sparring_de_ultimo_momento', categoria: 'campamento', titulo: 'El sparring de último momento',
    texto: 'A tres días de {rival}, un compañero de gimnasio insiste en un round más "para afinar puntería".',
    etapas: SIEMPRE, rareza: 'rara',
    opciones: [
      { id: 'entrarle', texto: 'Entrarle igual, tan cerca de la pelea.', probabilidades: [
        { peso: 65, mods: { fuerza: 3, agilidad: 2 }, texto: 'Le encontrás el timing justo antes de la pelea de verdad.' },
        { peso: 35, mods: {}, caePelea: true, texto: 'Un cabezazo sin querer te abre una ceja. El médico del gimnasio no te habilita: la pelea se cae.' },
      ] },
      { id: 'cuidarte', texto: 'Cuidarte: para eso ya falta poco.', mods: {} },
    ],
  },
  {
    id: 'pesaje_ajustado', categoria: 'campamento', titulo: 'El pesaje ajustado',
    texto: 'Llegás justo con el peso, sin margen, a horas de subirte a la balanza oficial antes de {rival}.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'apurar_el_corte', texto: 'Apurar el corte esas últimas horas.', probabilidades: [
        { peso: 70, mods: { agilidad: 2 }, texto: 'Diste el peso justo, sin drama.' },
        { peso: 30, mods: { cardio: -3 }, texto: 'Llegaste al límite deshidratado y con las piernas flojas.' },
      ] },
      { id: 'dar_mas_tiempo', texto: 'Pedir un día más antes de la pesada oficial.', mods: {} },
    ],
  },
  {
    id: 'rumor_de_lesion_del_rival', categoria: 'campamento', titulo: 'El rumor sobre {rival}',
    texto: 'Corre la bola en el ambiente: dicen que {rival} esconde una molestia física de verdad.',
    etapas: SIEMPRE, rareza: 'normal',
    opciones: [
      { id: 'investigar', texto: 'Mover contactos para confirmarlo.', probabilidades: [
        { peso: 55, mods: { agilidad: 2 }, texto: 'Confirmás el dato: el rival esconde una molestia real y ajustás el plan.' },
        { peso: 45, mods: {}, texto: 'Era un invento de la prensa para vender entradas.' },
      ] },
      { id: 'ignorarlo', texto: 'Ignorarlo y entrenar para el rival de siempre.', mods: {} },
    ],
  },
];
