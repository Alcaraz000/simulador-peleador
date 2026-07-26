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

export const CARTAS_CAMPAMENTO = [
  {
    id: 'estudiar_al_rival',
    categoria: 'campamento',
    titulo: 'Estudiar a {rival}',
    texto: 'Don Pepe trajo videos de las últimas peleas de {rival}. Hay patrones para leer, si te tomás el trabajo.',
    etapas: SIEMPRE,
    rareza: 'normal',
    opciones: [
      { id: 'estudiar', texto: 'Mirar cada pelea, cuaderno en mano.', mods: { iq: 4, tecnica: 2, fatiga: 4 } },
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
      { id: 'plan', texto: 'Meterle horas al plan específico.', mods: { defensa: 3, tecnica: 3, fatiga: 5 } },
      { id: 'general', texto: 'Seguir con el trabajo general de siempre.', mods: { potencia: 2, velocidad: 2 } },
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
      { id: 'obsesionarte', texto: 'Darle manija a la obsesión: entrenar hasta reventar.', mods: { potencia: 3, moral: -5, fatiga: 6 } },
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
      { id: 'echarlo', texto: 'Pedirle a Don Pepe que lo saque.', mods: { disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'descanso_tactico',
    categoria: 'campamento',
    titulo: 'Un día sin gimnasio',
    texto: 'Don Pepe insiste: falta poco para {rival}, y un cuerpo cansado no rinde. Toca elegir.',
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
      { id: 'sumar', texto: 'Meter un round extra.', mods: { menton: 3, tecnica: 2, forma: -5, fatiga: 6 } },
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
      { id: 'afinar', texto: 'Afinar cada detalle con Don Pepe.', mods: { tecnica: 3, iq: 2, defensa: 2, fatiga: 3 } },
      { id: 'relajarte', texto: 'Bajar la intensidad y llegar fresco.', mods: { forma: 4, fatiga: -6, tecnica: -1 } },
    ],
  },
];
