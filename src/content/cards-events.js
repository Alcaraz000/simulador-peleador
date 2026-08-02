// Mazo de eventos (v13, simplificación a cuatro atributos). Cada carta trae
// `opciones`: DOS es la norma, TRES es especial y aparece poco (acá:
// 'chantaje', la única). Los patrones pedidos por el usuario: elegir qué
// subir, elegir si arriesgar (con `probabilidades`, en proporciones variadas
// — 90/10, 75/25, 60/40, nunca todo parejo), y que una opción pueda no dar
// nada (mods: {} es una opción válida, no un bug).
//
// La fama desaparece del juego (spec 2026-07-28): ninguna carta de acá abajo
// la usa, ni como `efectos.fama` ni como condición. El dinero y el heat de
// rivalidad se mantienen tal cual.
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];
const PRO = ['profesional', 'veterano'];
const JOVEN = ['juvenil', 'amateur'];

export const CARTAS_EVENTO = [
  // --- Juvenil/amateur: la categoría 'evento' tiene que tener variedad
  // propia acá (no versiones diluidas de las de profesional) para que la
  // proporción de rarezas no se desbalancee en esas etapas.
  {
    id: 'escuela_o_gimnasio', categoria: 'evento', titulo: 'El examen y el sparring', etapas: JOVEN, rareza: 'normal',
    texto: 'La profesora avisa: si faltás a la prueba, repetís la materia. Justo cae el mismo día que el sparring fuerte.',
    opciones: [
      { id: 'rendir', texto: 'Rendir el examen y perderte el sparring.', mods: {} },
      { id: 'entrenar', texto: 'Faltar a la prueba y entrenar a full.', mods: { agilidad: 3 } },
    ],
  },
  {
    id: 'laburo_para_bancarse', categoria: 'evento', titulo: 'El turno tarde', etapas: JOVEN, rareza: 'normal',
    texto: 'En el almacén te ofrecen turno tarde: buena plata, pero se cruza con el horario fuerte del gimnasio.',
    opciones: [
      { id: 'tomar', texto: 'Tomar el turno.', efectos: { dinero: 15000 }, mods: { cardio: -2 } },
      { id: 'rechazar', texto: 'Rechazarlo y seguir entrenando full.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'familia_no_ve_futuro', categoria: 'evento', titulo: 'Che, dejá el boxeo', etapas: JOVEN, rareza: 'normal',
    texto: 'En casa insisten: "esto no te va a dar de comer". Quieren que te anotes en un curso y dejes el gimnasio.',
    opciones: [
      { id: 'plantarte', texto: 'Plantarte: esto lo seguís haciendo.', mods: { defensa: 2 } },
      { id: 'ceder', texto: 'Anotarte en el curso igual, para tenerlos tranquilos.', mods: {} },
    ],
  },
  {
    id: 'club_que_cierra', categoria: 'evento', titulo: 'El club baja la persiana', etapas: JOVEN, rareza: 'rara',
    texto: 'El club de tu barrio no pudo pagar el alquiler. De un día para el otro, no hay más gimnasio ahí.',
    opciones: [
      { id: 'gimnasio_lejos', texto: 'Buscar un gimnasio más lejos, con mejor equipamiento.', mods: { defensa: 3 } },
      { id: 'como_se_pueda', texto: 'Armar algo con lo que hay: la plaza, el club de la parroquia, lo que aparezca.', mods: { fuerza: 2, cardio: -1 } },
    ],
  },
  {
    id: 'primer_viaje_afuera', categoria: 'evento', titulo: 'La primera vez que salís a pelear', etapas: JOVEN, rareza: 'rara',
    texto: 'Te toca viajar solo, por primera vez, a pelear a otra provincia. Doce horas de micro y una cama que no es la tuya.',
    opciones: [
      { id: 'aprovechar', texto: 'Aprovechar el viaje: conocer, mirar otros gimnasios, hacer contactos.', mods: { agilidad: 2, cardio: -1 } },
      { id: 'enfocarte', texto: 'No distraerte con nada: dormir, comer bien, pensar solo en la pelea.', mods: { cardio: 3 } },
    ],
  },

  // --- Profesional/veterano: el trío histórico, con azar de verdad ---
  {
    id: 'dopaje', categoria: 'evento', titulo: 'El sobre en el vestuario', etapas: PRO, rareza: 'rara',
    texto: 'Un tipo de traje te deja un sobre. "Es legal en casi todos lados", dice. Casi.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar. Nadie se entera.', probabilidades: [
        { peso: 65, mods: { fuerza: 5, cardio: 3 }, texto: 'Nadie dijo nada. Te sentís una máquina.' },
        { peso: 35, mods: {}, efectos: { dinero: -20000 }, caePelea: true, texto: 'Control sorpresa. Te bajan de la cartelera mientras se aclara todo.' },
      ] },
      { id: 'rechazar', texto: 'Devolverlo sin abrirlo.', mods: { defensa: 2 } },
    ],
  },
  {
    id: 'chantaje', categoria: 'evento', titulo: 'La foto que no existía', etapas: PRO, rareza: 'rara',
    texto: 'Alguien tiene una foto tuya de una noche que preferís olvidar. Pide plata.',
    opciones: [
      { id: 'pagar', texto: 'Pagar y que se termine.', efectos: { dinero: -25000 }, mods: {} },
      // Rebalanceo (Pedido 2, v14, "no entiendo qué hace esta tarjeta"): la
      // rama optimista no traía mods ni efectos — la píldora previa a elegir
      // quedaba en un "50%" pelado, igual que el bug de 'polemica_calculada'
      // (cards-social.js). Un +1 defensa simboliza la tranquilidad de haber
      // llamado el bluff y seguir entrenando sin la cabeza en otro lado.
      { id: 'ignorar', texto: 'Que la publique.', probabilidades: [
        { peso: 50, mods: { defensa: 1 }, texto: 'Era un bluff. Nunca hubo foto.' },
        { peso: 50, mods: { cardio: -2 }, texto: 'La publicó. Quilombo por dos semanas: cuesta concentrarse.' },
      ] },
      { id: 'denunciar', texto: 'Ir a la policía.', mods: { defensa: 2 } },
    ],
  },
  {
    id: 'entrenador_rival', categoria: 'evento', titulo: 'Te ofrecen otro rincón', etapas: PRO, rareza: 'rara',
    texto: 'Un entrenador famoso te quiere en su equipo. El tuyo se hace el que no escuchó.',
    opciones: [
      { id: 'cambiar', texto: 'Cambiar de entrenador.', probabilidades: [
        { peso: 50, mods: { defensa: 4, agilidad: 2 }, texto: 'El tipo sabe. Aprendés cosas nuevas.' },
        { peso: 50, mods: { cardio: -3 }, texto: 'No enganchaste con el método. Entrenás incómodo semanas enteras.' },
      ] },
      { id: 'quedarse', texto: 'Quedarte con el de siempre.', mods: { cardio: 2 } },
    ],
  },

  // --- Profesional/veterano: dilemas de carrera ---
  {
    id: 'sponsor', categoria: 'evento', titulo: 'La marca que te quiere', etapas: PRO, rareza: 'normal',
    texto: 'Una marca de bebidas te ofrece contrato. Hay que filmar una publicidad ridícula.',
    opciones: [
      { id: 'firmar', texto: 'Firmar. La plata es plata.', efectos: { dinero: 40000 }, mods: { cardio: -2 } },
      { id: 'rechazar', texto: 'No. Estoy entrenando.', mods: { cardio: 3 } },
    ],
  },
  {
    id: 'cancelacion', categoria: 'evento', titulo: 'Se cayó la cartelera', etapas: PRO, rareza: 'normal',
    texto: 'El promotor no consiguió el estadio. La pelea se cae a tres días.',
    opciones: [
      { id: 'aguantar', texto: 'Bancar y seguir entrenando.', mods: { defensa: 2 } },
      { id: 'putear', texto: 'Salir a puteario en público.', mods: { cardio: -2 } },
    ],
  },
  {
    id: 'escandalo', categoria: 'vida', titulo: 'Pelea en un boliche', etapas: PRO, rareza: 'normal',
    texto: 'Un pibe te filmó respondiendo a las provocaciones. El video vuela.',
    opciones: [
      { id: 'disculpa', texto: 'Pedir disculpas públicas.', mods: { cardio: -1 } },
      { id: 'bancar', texto: 'Bancarte lo que hiciste.', mods: { defensa: 1 } },
    ],
  },
  {
    id: 'invitacion_exhibicion', categoria: 'evento', titulo: 'Exhibición en el exterior', etapas: PRO, rareza: 'normal',
    texto: 'Te invitan a una exhibición afuera. Paga bien y no es en serio... en teoría.',
    opciones: [
      { id: 'ir', texto: 'Ir.', efectos: { dinero: 30000 }, mods: { cardio: -2 } },
      { id: 'no_ir', texto: 'Quedarte entrenando.', mods: { cardio: 3 } },
    ],
  },

  // --- Vida personal, todas las etapas ---
  {
    id: 'familia_cumple', categoria: 'vida', titulo: 'El cumpleaños de tu vieja', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Es el mismo día que el último sparring fuerte antes de la pelea.',
    opciones: [
      { id: 'ir', texto: 'Ir al cumpleaños.', mods: {} },
      { id: 'entrenar', texto: 'Entrenar igual.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'amigos_asado', categoria: 'vida', titulo: 'Los pibes del barrio', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Te llaman para un asado. Hace meses que no los ves.',
    opciones: [
      { id: 'ir', texto: 'Ir un rato.', mods: {} },
      { id: 'no_ir', texto: 'Dejarlo para después de la pelea.', mods: { cardio: 1 } },
    ],
  },
  {
    id: 'pareja_charla', categoria: 'vida', titulo: 'La charla pendiente', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'normal',
    texto: 'Tu pareja te dice que hace meses que estás en otra. Tiene razón.',
    opciones: [
      { id: 'priorizar', texto: 'Bajar un cambio y estar presente.', mods: {} },
      { id: 'carrera', texto: 'Explicar que esto es ahora o nunca.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'vicio_noche_larga', categoria: 'vida', titulo: 'La noche larga', etapas: PRO, rareza: 'normal', condiciones: { resultadoReciente: 'victoria' },
    texto: 'Después de ganar, la joda se estira. Mañana hay entrenamiento a las siete.',
    opciones: [
      { id: 'seguir', texto: 'Seguirla.', mods: { cardio: -3 } },
      { id: 'irse', texto: 'Irte temprano.', mods: { cardio: 1 } },
    ],
  },
  {
    id: 'rutina_cinco_am', categoria: 'vida', titulo: 'Las cinco de la mañana', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Suena el despertador. Está oscuro y hace frío. Nadie te ve.',
    opciones: [
      { id: 'levantarse', texto: 'Levantarte igual.', mods: { cardio: 2 } },
      { id: 'dormir', texto: 'Dormir media hora más.', mods: {} },
    ],
  },

  // --- Legendarios: raros a propósito (~5%) y potentes de verdad ---
  {
    id: 'sparring_idolo', categoria: 'evento', titulo: 'El ídolo te llama al ring', etapas: SIEMPRE, rareza: 'legendaria',
    texto: 'El campeón que siempre admiraste te invita a entrenar una semana en su campamento. No es algo que le pase a cualquiera.',
    opciones: [
      { id: 'entrenar', texto: 'Meterte a full, aunque duela.', mods: { fuerza: 5, defensa: 3 } },
      { id: 'moderado', texto: 'Aprovechar sin quemarte.', mods: { defensa: 4, cardio: 4 } },
    ],
  },
  {
    id: 'oferta_leyenda', categoria: 'evento', titulo: 'La llamada que esperabas toda la vida', etapas: PRO, rareza: 'legendaria',
    texto: 'Un promotor de primera línea te ofrece la cartelera principal en Las Vegas. Es la oportunidad de tu vida, y exige entrega total.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar y jugarse entero.', efectos: { dinero: 150000 }, mods: { cardio: 5, defensa: 3 } },
      { id: 'cauteloso', texto: 'Aceptar, pero cuidándote.', efectos: { dinero: 80000 }, mods: { defensa: 4, cardio: 2 } },
    ],
  },

  // --- Cartas de riesgo: el patrón arriesgar-o-no. La opción segura no hace
  // nada (ni mods ni efectos); la de riesgo trae `probabilidades` en
  // proporciones bien variadas — nunca todas 50/50 — y algunas hacen caer la
  // pelea de verdad (`caePelea: true`, lo consume `cancelarProximaPelea` en
  // career.js), no solo en el texto.
  {
    id: 'guantes_prestados', categoria: 'evento', titulo: 'Los guantes que te prestó "el Colorado"', etapas: SIEMPRE, rareza: 'rara',
    texto: 'Un boxeador veterano del gimnasio te desliza un par de guantes "especiales" antes de la pesada: jura que el relleno está limado justo lo justo.',
    opciones: [
      { id: 'aceptar', texto: 'Calzártelos y no preguntar nada.', probabilidades: [
        { peso: 75, mods: { fuerza: 4 }, texto: 'Pegás distinto. Nadie sospecha nada, todavía.' },
        { peso: 25, mods: {}, efectos: { dinero: -10000 }, caePelea: true, texto: 'Un veedor de la comisión mete la mano en la bolsa antes de la pesada. Te bajan de la cartelera.' },
      ] },
      { id: 'rechazar', texto: 'Devolvérselos y calzarte los tuyos de siempre.', mods: {} },
    ],
  },
  {
    id: 'sustancia_de_ramon', categoria: 'vida', titulo: 'Lo que te ofreció Ramón en el vestuario', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'rara',
    texto: 'Ramón, tu amigo de toda la vida, te pasa un frasco sin etiqueta. "A mí me cambió la vida", te dice, y ya te lo está poniendo en la mano.',
    opciones: [
      { id: 'aceptar', texto: 'Confiar en Ramón y probarlo.', probabilidades: [
        { peso: 50, mods: { fuerza: 2, defensa: 2, cardio: 2, agilidad: 2 }, texto: 'El cuerpo responde distinto. Te sentís otro peleador, literal.' },
        { peso: 50, mods: {}, caePelea: true, texto: 'Control antidopaje sorpresa. Se cae la pelea y tu nombre queda flotando en el escándalo.' },
      ] },
      { id: 'rechazar', texto: 'Devolverle el frasco sin abrirlo.', mods: {} },
    ],
  },
  {
    id: 'entrenamiento_pesado', categoria: 'evento', titulo: 'Una hora más, todos los días', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Tu entrenador te mira los cuadernos de carga y niega con la cabeza: "esto necesita más". Te propone sumar una hora extra hasta la próxima pelea.',
    opciones: [
      { id: 'aceptar', texto: 'Sumar la hora extra.', probabilidades: [
        { peso: 75, mods: { cardio: 4, agilidad: 3 }, texto: 'El cuerpo aguanta. Terminás cada sesión con más aire del que entraste.' },
        { peso: 25, mods: { cardio: -3, fuerza: -2 }, texto: 'Te pasaste de rosca: el cuerpo no llegó a asimilar nada y quedaste peor que antes.' },
      ] },
      { id: 'rechazar', texto: 'Seguir con la carga de siempre.', mods: {} },
    ],
  },
  {
    id: 'desafio_de_la_vereda', categoria: 'vida', titulo: 'Te desafían en la vereda', etapas: JOVEN, rareza: 'normal',
    texto: 'Un pibe más grande te empuja frente a todos, sin guantes ni árbitro: "dale, a ver si sabés pelear de verdad".',
    opciones: [
      { id: 'aceptar', texto: 'Plantarte y no retroceder.', probabilidades: [
        { peso: 60, mods: { defensa: 3 }, texto: 'Le plantás cara y no te movés un paso. El barrio entero se entera.' },
        { peso: 40, mods: { defensa: -2, cardio: -2 }, texto: 'Te agarró de sorpresa y te dejó marcado.' },
      ] },
      { id: 'rechazar', texto: 'Dar media vuelta e irte.', mods: {} },
    ],
  },
  {
    id: 'apuesta_del_bar', categoria: 'vida', titulo: 'La apuesta en el bar de la esquina', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'normal',
    texto: 'Un cliente engolosinado te reta delante de todos: "poné plata a que ganás por nocaut, y yo la doblo".',
    opciones: [
      { id: 'aceptar', texto: 'Poner la plata sobre la mesa.', probabilidades: [
        { peso: 55, mods: {}, efectos: { dinero: 18000 }, texto: 'El tipo paga sin chistar, medio verde, delante de todo el bar.' },
        { peso: 45, mods: {}, efectos: { dinero: -9000 }, texto: '"Era en joda, loco", te dice cuando le pedís la plata.' },
      ] },
      { id: 'rechazar', texto: 'Guardarte la apuesta para el ring, no para el bar.', mods: {} },
    ],
  },
  {
    id: 'terapia_alternativa', categoria: 'vida', titulo: 'El curandero de la esquina', etapas: PRO, rareza: 'normal',
    texto: 'Te recomiendan a un "especialista" que cura contracturas con manteca de culebra y rezos. Cobra caro y promete milagros.',
    opciones: [
      { id: 'aceptar', texto: 'Pagar la consulta y confiar.', probabilidades: [
        { peso: 50, mods: { cardio: 3 }, efectos: { dinero: -6000 }, texto: 'Extrañamente, funciona: llegás liviano.' },
        { peso: 50, mods: { cardio: -3 }, efectos: { dinero: -6000 }, texto: 'Te deja peor: dos días sin poder mover el cuello y la plata ya voló.' },
      ] },
      { id: 'rechazar', texto: 'Confiar en el kinesiólogo de siempre.', mods: {} },
    ],
  },
  {
    id: 'representante_de_la_nada', categoria: 'evento', titulo: 'El representante que apareció de la nada', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'rara',
    texto: 'Un representante que nadie conoce te promete manejarte la carrera y te pone un adelanto en efectivo en la mano, ahí nomás, para que firmes ya.',
    opciones: [
      { id: 'aceptar', texto: 'Firmar y guardarte la plata.', probabilidades: [
        { peso: 60, mods: {}, efectos: { dinero: 35000 }, texto: 'El tipo cumple. La plata está limpia y el contrato, decente.' },
        { peso: 40, mods: {}, efectos: { dinero: -15000 }, caePelea: true, texto: 'Era un buscavidas: la comisión mete la lupa en un contrato trucho y la próxima pelea se cae mientras se aclara todo.' },
      ] },
      { id: 'rechazar', texto: 'Seguir manejándote solo, como hasta ahora.', mods: {} },
    ],
  },
  {
    id: 'dato_del_ex_sparring', categoria: 'evento', titulo: 'El dato que te vendieron sobre el rival', etapas: ['profesional', 'veterano'], rareza: 'normal',
    texto: 'Un ex sparring de tu próximo rival se te acerca antes de la pelea: dice que sabe dónde tiene floja la guardia, y lo vende barato.',
    opciones: [
      { id: 'aceptar', texto: 'Pagar por el dato.', probabilidades: [
        { peso: 65, mods: { agilidad: 3, defensa: 2 }, efectos: { dinero: -4000 }, texto: 'El dato es real: estudiás el video mil veces y encontrás el hueco.' },
        { peso: 35, mods: {}, efectos: { dinero: -4000 }, texto: 'Era humo. Perdiste la plata y el tiempo mirando un video que no sirve para nada.' },
      ] },
      { id: 'rechazar', texto: 'Confiar en el trabajo de siempre con tu entrenador.', mods: {} },
    ],
  },
  {
    id: 'picado_de_barrio', categoria: 'vida', titulo: 'El picado antes del pesaje', etapas: JOVEN, rareza: 'normal',
    texto: 'Te invitan a un picado en la canchita de tierra del barrio, justo el día antes de pesar para el torneo amateur.',
    opciones: [
      // Rebalanceo (Pedido 2, v14): la rama sin sobresaltos no traía mods ni
      // efectos — píldora "65%" pelada. Un +1 Agilidad por las gambetas de la
      // tarde le da a la píldora algo concreto que anunciar.
      { id: 'jugar', texto: 'Entrar a jugar un rato.', probabilidades: [
        { peso: 65, mods: { agilidad: 1 }, texto: 'Un par de gambetas, te reíste con los pibes y volviste liviano de cabeza.' },
        { peso: 35, mods: { cardio: -3 }, texto: 'Un pisotón mal puesto y el tobillo se hincha como pelota.' },
      ] },
      { id: 'mirar', texto: 'Mirar desde el alambrado, sin arriesgar nada.', mods: {} },
    ],
  },
  {
    id: 'prueba_de_nivel', categoria: 'evento', titulo: 'La prueba de nivel', etapas: ['juvenil'], rareza: 'rara',
    texto: 'El profe te quiere foguear antes de tiempo: sparring fuerte contra los grandes de la categoría de arriba.',
    opciones: [
      { id: 'subir', texto: 'Meterte con los grandes.', probabilidades: [
        { peso: 55, mods: { agilidad: 3, defensa: 2 }, texto: 'Te bancaste el ritmo. El profe te mira distinto desde hoy.' },
        { peso: 45, mods: { cardio: -3, defensa: -2 }, texto: 'Te pasaron por arriba como si nada. Volvés con la cola entre las patas.' },
      ] },
      { id: 'quedarte', texto: 'Seguir en tu categoría, sin apuro.', mods: {} },
    ],
  },
  {
    id: 'flete_de_ultima', categoria: 'vida', titulo: 'El flete de última', etapas: JOVEN, rareza: 'normal',
    texto: 'Se te hizo tarde para el sparring fuerte y no te alcanza ni para el boleto: un camión de reparto para justo al lado.',
    opciones: [
      // Rebalanceo (Pedido 2, v14): la rama sin contratiempos no traía mods
      // ni efectos — píldora "80%" pelada. Un +1 Cardio por ahorrarte la
      // caminata (llegaste descansado en vez de a pie) le da contenido real.
      { id: 'subirse', texto: 'Subirte a upa hasta el gimnasio.', probabilidades: [
        { peso: 80, mods: { cardio: 1 }, texto: 'Llegaste diez minutos tarde nomás. El chofer resultó ser un capo.' },
        { peso: 20, mods: {}, efectos: { dinero: -3000 }, texto: 'Apenas bajaste, notaste que te habían afanado unos mangos del bolsillo.' },
      ] },
      { id: 'caminar', texto: 'Caminar, aunque llegues tarde.', mods: {} },
    ],
  },
  {
    id: 'sparring_clandestino', categoria: 'evento', titulo: 'El sparring clandestino', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'rara',
    texto: 'En un gimnasio de mala muerte arman sparrings "por izquierda" para apostadores, sin comisión ni control médico. Pagan bien, en efectivo.',
    opciones: [
      { id: 'ir', texto: 'Ir y pelear por la plata en negro.', probabilidades: [
        { peso: 60, mods: {}, efectos: { dinero: 22000 }, texto: 'Ganaste limpio y cobraste en el momento. Nadie hizo preguntas.' },
        { peso: 40, mods: { cardio: -3 }, texto: 'Te tocó uno más duro de lo prometido. Volvés a casa marcado y sin nada que mostrar.' },
      ] },
      { id: 'no_ir', texto: 'Ni loco: eso no vale la pena.', mods: {} },
    ],
  },

  // --- Dilemas de dos opciones, algunos sin azar (parte del pedido: "no
  // todo tiene que tener un resultado, alguna opción puede no hacer nada") ---
  {
    id: 'guantes_nuevos', categoria: 'evento', titulo: 'Guantes nuevos en la vidriera', etapas: JOVEN, rareza: 'normal',
    texto: 'Un par de guantes importados en la vidriera del club, carísimos. Los tuyos ya no cierran bien de tan gastados.',
    opciones: [
      { id: 'comprar', texto: 'Juntar la plata y comprarlos.', efectos: { dinero: -8000 }, mods: { fuerza: 1 } },
      { id: 'seguir', texto: 'Seguir con los de siempre: total, todavía atajan.', mods: {} },
    ],
  },
  {
    id: 'cuerpo_pide_tregua', categoria: 'evento', titulo: 'El cuerpo pide tregua', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Terminaste la sesión con las piernas de goma y un cansancio que no es de un día cualquiera. Tu entrenador espera que decidas vos.',
    opciones: [
      { id: 'seguir', texto: 'Apretar los dientes y seguir entrenando.', mods: { fuerza: 2, cardio: -3 } },
      { id: 'descansar', texto: 'Bajar la persiana por hoy y descansar.', mods: { cardio: 2 } },
    ],
  },
  {
    id: 'beca_deportiva', categoria: 'evento', titulo: 'La beca que te ofrecen', etapas: JOVEN, rareza: 'normal',
    texto: 'La secretaría de deportes del municipio ofrece una beca chica, pero exige entrenar también atletismo dos veces por semana.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptarla: la plata ayuda en casa.', efectos: { dinero: 12000 }, mods: { cardio: 1 } },
      { id: 'rechazar', texto: 'Rechazarla: preferís no repartir el tiempo.', mods: {} },
    ],
  },
  {
    id: 'primer_lujo', categoria: 'vida', titulo: 'El primer lujo', etapas: PRO, rareza: 'normal',
    texto: 'Con la última bolsa podrías darte un gusto caro. O guardarla, como te enseñaron en tu casa.',
    opciones: [
      { id: 'gastar', texto: 'Darte el gusto.', efectos: { dinero: -20000 }, mods: {} },
      { id: 'guardar', texto: 'Guardarla, como siempre.', mods: {} },
    ],
  },
  {
    id: 'gimnasio_de_moda', categoria: 'evento', titulo: 'El gimnasio de moda', etapas: PRO, rareza: 'normal',
    texto: 'Un gimnasio nuevo, con máquinas último modelo, te ofrece pase gratis por ser "cara conocida". Queda lejos de tu rincón de siempre.',
    opciones: [
      { id: 'probar', texto: 'Ir a probar unas semanas.', mods: { defensa: 2 } },
      { id: 'quedarte', texto: 'Quedarte en tu gimnasio de siempre.', mods: {} },
    ],
  },
  {
    id: 'consejo_del_viejo_entrenador', categoria: 'evento', titulo: 'El consejo del viejo entrenador', etapas: ['veterano'], rareza: 'normal',
    texto: 'Tu primer entrenador, ya jubilado, te invita a tomar unos mates y "hablar en serio" antes de la próxima pelea.',
    opciones: [
      { id: 'escuchar', texto: 'Ir a escucharlo con la cabeza abierta.', mods: { agilidad: 2 } },
      { id: 'no_ir', texto: 'Agradecer y seguir con la rutina de siempre.', mods: {} },
    ],
  },
  {
    id: 'costilla_que_avisa', categoria: 'evento', titulo: 'La costilla que avisa', etapas: SIEMPRE, rareza: 'rara',
    texto: 'Un pinchazo en las costillas durante el último sparring. Puede ser nada, o puede ser el principio de un problema.',
    opciones: [
      { id: 'seguir', texto: 'Ignorarlo y seguir entrenando fuerte.', probabilidades: [
        { peso: 70, mods: { fuerza: 2 }, texto: 'Era un tirón sin importancia. Seguís de largo.' },
        { peso: 30, mods: { cardio: -4 }, texto: 'Se hizo bola: terminás dos semanas en el diván del kinesiólogo.' },
      ] },
      { id: 'parar', texto: 'Parar antes de arriesgar de más.', mods: {} },
    ],
  },
  {
    id: 'torneo_interbarrial', categoria: 'evento', titulo: 'El torneo interbarrial', etapas: JOVEN, rareza: 'normal',
    texto: 'Organizan un torneo relámpago entre gimnasios del barrio, sin categorías ni pesaje serio. Buena experiencia, cero glamour.',
    opciones: [
      { id: 'anotarte', texto: 'Anotarte y sumar rounds de verdad.', mods: { agilidad: 1, cardio: 1 } },
      { id: 'no_anotarte', texto: 'Dejarlo pasar: no suma nada oficial.', mods: {} },
    ],
  },
  {
    id: 'fotos_viejas_del_gimnasio', categoria: 'vida', titulo: 'Las fotos viejas del gimnasio', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Encontraste una caja con fotos de tus primeros años arriba de un ring. Dan ganas de mirarlas todas, y el tiempo no sobra.',
    opciones: [
      { id: 'mirar', texto: 'Sentarte un rato a mirarlas todas.', mods: {} },
      { id: 'guardar', texto: 'Guardar la caja para otro día.', mods: {} },
    ],
  },
  {
    id: 'turno_en_la_muela', categoria: 'vida', titulo: 'El turno con el dentista', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Hace semanas que pediste hora para esa muela que duele cada vez que apretás los dientes en el ring. Justo hoy te la dan.',
    opciones: [
      { id: 'ir', texto: 'Ir al dentista y perderte la sesión.', mods: { cardio: -1 } },
      { id: 'faltar', texto: 'Faltar al turno y entrenar igual.', mods: {} },
    ],
  },
  {
    id: 'clase_a_los_pibes', categoria: 'vida', titulo: 'Una clase para los pibes del barrio', etapas: SIEMPRE, rareza: 'normal',
    texto: 'El club te pide una tarde para enseñarles lo básico a los chicos que recién arrancan. Sin paga, solo por las ganas.',
    opciones: [
      { id: 'dar_la_clase', texto: 'Dar la clase esa tarde.', mods: {} },
      { id: 'no_ir', texto: 'Decir que no llegás esta vez.', mods: {} },
    ],
  },
  {
    id: 'celular_nuevo', categoria: 'vida', titulo: 'El celular nuevo', etapas: PRO, rareza: 'normal',
    texto: 'El tuyo ya apenas prende, pero el modelo nuevo sale una fortuna. Podrías darte el gusto, o aguantar un poco más.',
    opciones: [
      { id: 'comprarlo', texto: 'Comprarlo de una vez.', efectos: { dinero: -18000 }, mods: {} },
      { id: 'aguantar', texto: 'Aguantar con el viejo un poco más.', mods: {} },
    ],
  },
  {
    id: 'promesa_del_dt_rival', categoria: 'evento', titulo: 'La promesa del DT rival', etapas: PRO, rareza: 'normal',
    texto: 'El entrenador de tu próximo rival te llama aparte, casi en secreto: te ofrece pasarte "un par de mañas" sobre su propio peleador.',
    opciones: [
      { id: 'escuchar', texto: 'Escucharlo, aunque suene sospechoso.', probabilidades: [
        { peso: 70, mods: { agilidad: 3, defensa: 2 }, texto: 'El dato era real: encontraste un hueco de verdad en la guardia del rival.' },
        { peso: 30, mods: { agilidad: -2 }, texto: 'Era todo humo para confundirte. Perdiste horas de video mirando algo que no sirve.' },
      ] },
      { id: 'cortar', texto: 'Cortar la charla ahí mismo.', mods: {} },
    ],
  },
  {
    id: 'bono_por_nocaut', categoria: 'evento', titulo: 'El bono por nocaut', etapas: PRO, rareza: 'normal',
    texto: 'El promotor te desliza una cláusula extra en el contrato: bono grosso si ganás antes del límite.',
    opciones: [
      { id: 'firmar', texto: 'Firmar la cláusula.', probabilidades: [
        { peso: 85, mods: {}, efectos: { dinero: 15000 }, texto: 'El promotor cumple sin chistar apenas se cierra el contrato.' },
        { peso: 15, mods: {}, efectos: { dinero: -5000 }, texto: 'Letra chica: hay que pagar un "seguro" de la cláusula que nadie te explicó bien.' },
      ] },
      { id: 'no_firmar', texto: 'Dejar el contrato como estaba.', mods: {} },
    ],
  },
  {
    id: 'desafio_en_redes', categoria: 'evento', titulo: 'El desafío en redes', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'normal',
    texto: 'Un influencer con más seguidores que técnica te reta a un sparring "amistoso" filmado para sus redes.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar el sparring filmado.', probabilidades: [
        { peso: 2, mods: { agilidad: 2 }, texto: 'Quedás como el profesional serio en medio del circo.' },
        { peso: 1, mods: { agilidad: -2 }, texto: 'El clip se edita para que el influencer quede mejor parado.' },
      ] },
      { id: 'ignorar', texto: 'No entrar en el juego.', mods: {} },
    ],
  },
];
