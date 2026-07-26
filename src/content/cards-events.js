const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];
const PRO = ['profesional', 'veterano'];
const JOVEN = ['juvenil', 'amateur'];

export const CARTAS_EVENTO = [
  // Juvenil/amateur (Task 6.2, revisión del coordinador): antes de esto, la
  // categoría 'evento' en estas dos etapas tenía UNA sola carta elegible —
  // sparring_idolo, la legendaria (ver el comentario más abajo) — porque
  // todas las demás eran etapas: PRO. Con un pool de uno, "legendaria ~5%"
  // no significaba nada: salía garantizado (medido: 56% de las carreras).
  // Estas cinco son propias de esa edad (16-20), no versiones diluidas de
  // las de profesional: la escuela, la plata, el laburo, el club que te
  // sostenía, la familia que no te banca. Con esto el pool de 'evento' en
  // juvenil/amateur pasa a tener el mismo peso normal/rara/legendaria que
  // el resto del catálogo (ver el test de distribución en events.test.js).
  {
    id: 'escuela_o_gimnasio', categoria: 'evento', titulo: 'El examen y el sparring', etapas: JOVEN, rareza: 'normal',
    texto: 'La profesora avisa: si faltás a la prueba, repetís la materia. Justo cae el mismo día que el sparring fuerte.',
    opciones: [
      { id: 'rendir', texto: 'Rendir el examen.', mods: { disciplinaPersonal: 5, forma: -3 } },
      { id: 'entrenar', texto: 'Faltar y entrenar.', mods: { forma: 4, disciplinaPersonal: -5 } },
    ],
  },
  {
    id: 'laburo_para_bancarse', categoria: 'evento', titulo: 'El turno tarde', etapas: JOVEN, rareza: 'normal',
    texto: 'En el almacén te ofrecen turno tarde: buena plata, pero se cruza con el horario fuerte del gimnasio.',
    opciones: [
      { id: 'tomar', texto: 'Tomar el turno.', efectos: { dinero: 15000 }, mods: { forma: -4 } },
      { id: 'rechazar', texto: 'Rechazarlo y seguir entrenando full.', mods: { forma: 5, disciplinaPersonal: 2 } },
    ],
  },
  {
    id: 'familia_no_ve_futuro', categoria: 'evento', titulo: 'Che, dejá el boxeo', etapas: JOVEN, rareza: 'normal',
    texto: 'En casa insisten: "esto no te va a dar de comer". Quieren que te anotes en un curso y dejes el gimnasio.',
    opciones: [
      { id: 'plantarte', texto: 'Plantarte: esto lo seguís haciendo.', mods: { disciplinaPersonal: 5, moral: -4 } },
      { id: 'ceder', texto: 'Anotarte en el curso igual, para tenerlos tranquilos.', mods: { moral: 6, forma: -4 } },
    ],
  },
  {
    id: 'club_que_cierra', categoria: 'evento', titulo: 'El club baja la persiana', etapas: JOVEN, rareza: 'rara',
    texto: 'El club de tu barrio no pudo pagar el alquiler. De un día para el otro, no hay más gimnasio ahí.',
    opciones: [
      { id: 'gimnasio_lejos', texto: 'Buscar un gimnasio más lejos, con mejor equipamiento.', mods: { tecnica: 4, defensa: 2, forma: -3 } },
      { id: 'como_se_pueda', texto: 'Armar algo con lo que hay: la plaza, el club de la parroquia, lo que aparezca.', mods: { disciplinaPersonal: 6, potencia: -2 } },
    ],
  },
  {
    id: 'primer_viaje_afuera', categoria: 'evento', titulo: 'La primera vez que salís a pelear', etapas: JOVEN, rareza: 'rara',
    texto: 'Te toca viajar solo, por primera vez, a pelear a otra provincia. Doce horas de micro y una cama que no es la tuya.',
    opciones: [
      { id: 'aprovechar', texto: 'Aprovechar el viaje: conocer, mirar otros gimnasios, hacer contactos.', mods: { iq: 4, disciplinaPersonal: 2, cardio: -2 } },
      { id: 'enfocarte', texto: 'No distraerte con nada: dormir, comer bien, pensar solo en la pelea.', mods: { forma: 6, cardio: 2 } },
    ],
  },
  {
    id: 'dopaje', categoria: 'evento', titulo: 'El sobre en el vestuario', etapas: PRO, rareza: 'rara',
    texto: 'Un tipo de traje te deja un sobre. "Es legal en casi todos lados", dice. Casi.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar. Nadie se entera.', probabilidades: [
        { peso: 6, mods: { potencia: 5, cardio: 4 }, texto: 'Nadie dijo nada. Te sentís una máquina.' },
        { peso: 4, mods: { forma: -15 }, texto: 'Control sorpresa. Zafaste raspando, pero quedaste marcado.' },
      ] },
      { id: 'rechazar', texto: 'Devolverlo sin abrirlo.', mods: { disciplinaPersonal: 6, moral: 5 } },
    ],
  },
  {
    id: 'chantaje', categoria: 'evento', titulo: 'La foto que no existía', etapas: PRO, rareza: 'rara',
    texto: 'Alguien tiene una foto tuya de una noche que preferís olvidar. Pide plata.',
    opciones: [
      { id: 'pagar', texto: 'Pagar y que se termine.', efectos: { dinero: -25000 }, mods: { moral: -5 } },
      { id: 'ignorar', texto: 'Que la publique.', probabilidades: [
        { peso: 5, mods: { moral: 5 }, texto: 'Era un bluff. Nunca hubo foto.' },
        { peso: 5, mods: { moral: -10 }, texto: 'La publicó. Escándalo por dos semanas.' },
      ] },
      { id: 'denunciar', texto: 'Ir a la policía.', efectos: { fama: 4 }, mods: { disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'sponsor', categoria: 'evento', titulo: 'La marca que te quiere', etapas: PRO, rareza: 'normal',
    texto: 'Una marca de bebidas te ofrece contrato. Hay que filmar una publicidad ridícula.',
    opciones: [
      { id: 'firmar', texto: 'Firmar. La plata es plata.', efectos: { dinero: 40000, fama: 6 }, mods: { forma: -3 } },
      { id: 'rechazar', texto: 'No. Estoy entrenando.', mods: { forma: 5, disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'entrenador', categoria: 'evento', titulo: 'Te ofrecen otro rincón', etapas: PRO, rareza: 'rara',
    texto: 'Un entrenador famoso te quiere en su equipo. El tuyo se hace el que no escuchó.',
    opciones: [
      { id: 'cambiar', texto: 'Cambiar de entrenador.', probabilidades: [
        { peso: 5, mods: { tecnica: 6, iq: 3 }, texto: 'El tipo sabe. Aprendés cosas nuevas.' },
        { peso: 5, mods: { moral: -10, forma: -5 }, texto: 'No enganchaste con el método. Estás incómodo.' },
      ] },
      { id: 'quedarse', texto: 'Quedarte con el de siempre.', mods: { moral: 8 } },
    ],
  },
  {
    id: 'cancelacion', categoria: 'evento', titulo: 'Se cayó la cartelera', etapas: PRO, rareza: 'normal',
    texto: 'El promotor no consiguió el estadio. La pelea se cae a tres días.',
    opciones: [
      { id: 'aguantar', texto: 'Bancar y seguir entrenando.', mods: { disciplinaPersonal: 4, forma: -2 } },
      { id: 'putear', texto: 'Salir a puteario en público.', efectos: { fama: 5 }, mods: { moral: -3 } },
    ],
  },
  {
    id: 'escandalo', categoria: 'evento', titulo: 'Pelea en un boliche', etapas: PRO, rareza: 'normal',
    texto: 'Un pibe te filmó respondiendo a las provocaciones. El video vuela.',
    opciones: [
      { id: 'disculpa', texto: 'Pedir disculpas públicas.', mods: { moral: -3, disciplinaPersonal: 4 } },
      { id: 'bancar', texto: 'Bancarte lo que hiciste.', efectos: { fama: 8 }, mods: { moral: 3 } },
    ],
  },
  {
    id: 'invitacion', categoria: 'evento', titulo: 'Exhibición en el exterior', etapas: PRO, rareza: 'normal',
    texto: 'Te invitan a una exhibición afuera. Paga bien y no es en serio... en teoría.',
    opciones: [
      { id: 'ir', texto: 'Ir.', efectos: { dinero: 30000, fama: 4 }, mods: { fatiga: 10 } },
      { id: 'no_ir', texto: 'Quedarte entrenando.', mods: { forma: 6 } },
    ],
  },
  {
    id: 'familia', categoria: 'vida', titulo: 'El cumpleaños de tu vieja', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Es el mismo día que el último sparring fuerte antes de la pelea.',
    opciones: [
      { id: 'ir', texto: 'Ir al cumpleaños.', mods: { moral: 10, forma: -4 } },
      { id: 'entrenar', texto: 'Entrenar igual.', mods: { forma: 5, moral: -6 } },
    ],
  },
  {
    id: 'amigos', categoria: 'vida', titulo: 'Los pibes del barrio', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Te llaman para un asado. Hace meses que no los ves.',
    opciones: [
      { id: 'ir', texto: 'Ir un rato.', mods: { moral: 8, disciplinaPersonal: -3 } },
      { id: 'no_ir', texto: 'Dejarlo para después de la pelea.', mods: { disciplinaPersonal: 4, moral: -3 } },
    ],
  },
  {
    id: 'pareja', categoria: 'vida', titulo: 'La charla pendiente', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'normal',
    texto: 'Tu pareja te dice que hace meses que estás en otra. Tiene razón.',
    opciones: [
      { id: 'priorizar', texto: 'Bajar un cambio y estar presente.', mods: { moral: 12, forma: -5 } },
      { id: 'carrera', texto: 'Explicar que esto es ahora o nunca.', mods: { disciplinaPersonal: 5, moral: -8 } },
    ],
  },
  {
    id: 'vicio', categoria: 'vida', titulo: 'La noche larga', etapas: PRO, rareza: 'normal',
    texto: 'Después de ganar, la joda se estira. Mañana hay entrenamiento a las siete.',
    opciones: [
      { id: 'seguir', texto: 'Seguirla.', mods: { moral: 6, forma: -8, disciplinaPersonal: -5 } },
      { id: 'irse', texto: 'Irte temprano.', mods: { disciplinaPersonal: 5, forma: 3, moral: -2 } },
    ],
  },
  {
    id: 'rutina', categoria: 'vida', titulo: 'Las cinco de la mañana', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Suena el despertador. Está oscuro y hace frío. Nadie te ve.',
    opciones: [
      { id: 'levantarse', texto: 'Levantarte igual.', mods: { disciplinaPersonal: 6, cardio: 2, moral: -2 } },
      { id: 'dormir', texto: 'Dormir media hora más.', mods: { forma: 3, disciplinaPersonal: -4 } },
    ],
  },

  // Legendarios: raros a propósito (~5% del sorteo) y potentes de verdad —
  // no se nerfean. La idea es que, cada tanto, te toque un evento que
  // reescriba el resto de la carrera.
  {
    id: 'sparring_idolo', categoria: 'evento', titulo: 'El ídolo te llama al ring', etapas: SIEMPRE, rareza: 'legendaria',
    texto: 'El campeón que mirabas por tele de pibe te invita a entrenar una semana en su campamento. No es algo que le pase a cualquiera.',
    opciones: [
      { id: 'entrenar', texto: 'Meterte a full, aunque duela.', mods: { tecnica: 6, iq: 6, potencia: 4 } },
      { id: 'moderado', texto: 'Aprovechar sin quemarte.', mods: { tecnica: 4, iq: 4, forma: 6 } },
    ],
  },
  {
    id: 'oferta_leyenda', categoria: 'evento', titulo: 'La llamada que esperabas toda la vida', etapas: PRO, rareza: 'legendaria',
    texto: 'Un promotor de primera línea te ofrece la cartelera principal en Las Vegas. Es la oportunidad de tu vida, y exige entrega total.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar y jugarse entero.', efectos: { dinero: 150000, fama: 20 }, mods: { moral: 15, disciplinaPersonal: 5 } },
      { id: 'cauteloso', texto: 'Aceptar, pero cuidándote.', efectos: { dinero: 80000, fama: 10 }, mods: { moral: 6, forma: 4 } },
    ],
  },

  // Cartas de riesgo (Task v3, "cartas nuevas con azar"): el pedido textual del
  // usuario nombraba tres ejemplos ("sustancia sospechosa", "guantes pesados",
  // "entrenamiento pesado") aclarando que son solo ejemplos para reescribir con
  // la misma mugre — de ahí salen 'guantes_truchos', 'sustancia_de_ramon' y
  // 'entrenamiento_pesado' de acá abajo, más el resto sumado con el mismo
  // patrón: una opción seria/seca que NO HACE NADA (ni un solo mod: el pedido
  // es explícito — "rechazar no hace nada", para que la otra rama sea de
  // verdad tentadora) contra una de riesgo con `probabilidades`. Antes de esta
  // task las únicas tres cartas con azar de todo el juego (dopaje/chantaje/
  // entrenador, arriba) tenían `etapas: PRO`: un jugador podía terminar la
  // carrera entera sin ver un solo roll con suspenso si nunca llegaba a
  // profesional o se quedaba poco tiempo ahí. Estas aparecen desde juvenil.
  //
  // `caePelea: true` (guantes_truchos, sustancia_de_ramon, plata_facil_del_representante)
  // es la única forma real de "se te cae la pelea": lo consume main.js
  // (ver `caePelea` en events.js/cards.js) para de verdad sacar la oferta
  // pendiente de la cola vía `cancelarProximaPelea` (career.js) — no es un
  // efecto de humo que el texto promete y el juego ignora.
  {
    id: 'guantes_truchos', categoria: 'evento', titulo: 'Los guantes que te prestó "el Colorado"', etapas: SIEMPRE, rareza: 'rara',
    texto: 'Un boxeador veterano del gimnasio te desliza un par de guantes "especiales" antes de la pesada: jura que el relleno está limado justo lo justo. Nadie está mirando.',
    opciones: [
      { id: 'aceptar', texto: 'Calzártelos y no preguntar nada.', probabilidades: [
        { peso: 75, mods: { potencia: 5 }, texto: 'Pegás distinto. Nadie sospecha nada — todavía.' },
        { peso: 25, mods: {}, efectos: { fama: -10 }, caePelea: true, texto: 'Un veedor de la comisión mete la mano en la bolsa antes de la pesada. Circo mediático: te bajan de la cartelera.' },
      ] },
      { id: 'rechazar', texto: 'Devolvérselos y calzarte los tuyos de siempre.', mods: {} },
    ],
  },
  {
    id: 'sustancia_de_ramon', categoria: 'vida', titulo: 'Lo que te ofreció Ramón en el vestuario', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'rara',
    texto: 'Ramón, tu amigo de toda la vida, te pasa un frasco sin etiqueta. "A mí me cambió la vida", te dice, y ya te lo está poniendo en la mano.',
    opciones: [
      { id: 'aceptar', texto: 'Confiar en Ramón y probarlo.', probabilidades: [
        { peso: 50, mods: {
          potencia: 2, velocidad: 2, tecnica: 2, defensa: 2, cardio: 2, iq: 2,
        }, texto: 'El cuerpo responde distinto. Te sentís otro peleador — literal.' },
        { peso: 50, mods: {}, efectos: { fama: -15 }, caePelea: true, texto: 'Control antidopaje sorpresa. La noticia explota antes de que puedas explicar nada: se cae la pelea y tu nombre queda flotando en el escándalo.' },
      ] },
      { id: 'rechazar', texto: 'Devolverle el frasco sin abrirlo.', mods: {} },
    ],
  },
  {
    id: 'entrenamiento_pesado', categoria: 'evento', titulo: 'Una hora más, todos los días', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Tu entrenador te mira los cuadernos de carga y niega con la cabeza: "esto necesita más". Te propone sumar una hora extra hasta la próxima pelea, sin faltar un solo día.',
    opciones: [
      { id: 'aceptar', texto: 'Sumar la hora extra.', probabilidades: [
        { peso: 75, mods: { cardio: 5, velocidad: 5 }, texto: 'El cuerpo aguanta. Terminás cada sesión con más aire del que entraste.' },
        { peso: 25, mods: { cardio: -5, potencia: -5 }, texto: 'Te pasaste de rosca: el cuerpo no llegó a asimilar nada y quedaste peor que antes.' },
      ] },
      { id: 'rechazar', texto: 'Seguir con la carga de siempre.', mods: {} },
    ],
  },
  {
    id: 'desafio_de_la_vereda', categoria: 'vida', titulo: 'Te desafían en la vereda', etapas: JOVEN, rareza: 'normal',
    texto: 'Un pibe más grande te empuja frente a todos, sin guantes ni árbitro: "dale, a ver si sabés pelear de verdad".',
    opciones: [
      { id: 'aceptar', texto: 'Plantarte y no retroceder.', probabilidades: [
        { peso: 60, mods: { menton: 3, disciplinaPersonal: 2 }, texto: 'Le plantás cara y no te movés un paso. El barrio entero se entera.' },
        { peso: 40, mods: { forma: -12 }, texto: 'Te agarró de sorpresa y te dejó marcado. Volvés a tu casa con la cara hinchada y la lección aprendida.' },
      ] },
      { id: 'rechazar', texto: 'Dar media vuelta e irte.', mods: {} },
    ],
  },
  {
    id: 'apuesta_del_bar', categoria: 'vida', titulo: 'La apuesta en el bar de la esquina', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'normal',
    texto: 'Un cliente engolosinado te reta delante de todos: "poné plata a que ganás por nocaut, y yo la doblo".',
    opciones: [
      { id: 'aceptar', texto: 'Poner la plata sobre la mesa.', probabilidades: [
        { peso: 55, mods: {}, efectos: { dinero: 18000, fama: 3 }, texto: 'El tipo paga sin chistar, medio verde, delante de todo el bar.' },
        { peso: 45, mods: {}, efectos: { dinero: -9000 }, texto: '"Era en joda, loco", te dice cuando le pedís la plata. No hay forma de cobrar.' },
      ] },
      { id: 'rechazar', texto: 'Guardarte la apuesta para el ring, no para el bar.', mods: {} },
    ],
  },
  {
    id: 'terapia_alternativa', categoria: 'vida', titulo: 'El curandero de la esquina', etapas: ['profesional', 'veterano'], rareza: 'normal',
    texto: 'Te recomiendan a un "especialista" que cura contracturas con manteca de culebra y rezos. Cobra caro y promete milagros justo antes de la pelea.',
    opciones: [
      { id: 'aceptar', texto: 'Pagar la consulta y confiar.', probabilidades: [
        { peso: 50, mods: { forma: 12, fatiga: -10 }, efectos: { dinero: -6000 }, texto: 'Extrañamente, funciona: llegás liviano y sin un solo dolor.' },
        { peso: 50, mods: { forma: -10 }, efectos: { dinero: -6000 }, texto: 'Te deja peor: dos días sin poder mover el cuello y la plata ya voló.' },
      ] },
      { id: 'rechazar', texto: 'Confiar en el kinesiólogo de siempre.', mods: {} },
    ],
  },
  {
    id: 'plata_facil_del_representante', categoria: 'evento', titulo: 'El representante que apareció de la nada', etapas: ['amateur', 'profesional', 'veterano'], rareza: 'rara',
    texto: 'Un representante que nadie conoce te promete manejarte la carrera y te pone un adelanto en efectivo en la mano, ahí nomás, para que firmes ya.',
    opciones: [
      { id: 'aceptar', texto: 'Firmar y guardarte la plata.', probabilidades: [
        { peso: 60, mods: {}, efectos: { dinero: 35000, fama: 3 }, texto: 'El tipo cumple. La plata está limpia y el contrato, decente.' },
        { peso: 40, mods: {}, efectos: { dinero: -15000 }, caePelea: true, texto: 'Era un buscavidas: la comisión mete la lupa en un contrato trucho y la próxima pelea se cae mientras se aclara todo.' },
      ] },
      { id: 'rechazar', texto: 'Seguir manejándote solo, como hasta ahora.', mods: {} },
    ],
  },
  {
    id: 'dato_del_ex_sparring', categoria: 'evento', titulo: 'El dato que te vendieron sobre el rival', etapas: ['profesional', 'veterano'], rareza: 'normal',
    texto: 'Un ex sparring de tu próximo rival se te acerca antes de la pelea: dice que sabe exactamente dónde tiene floja la guardia, y lo vende barato.',
    opciones: [
      { id: 'aceptar', texto: 'Pagar por el dato.', probabilidades: [
        { peso: 65, mods: { iq: 5, tecnica: 3 }, efectos: { dinero: -4000 }, texto: 'El dato es real: estudiás el video mil veces y encontrás el hueco.' },
        { peso: 35, mods: {}, efectos: { dinero: -4000 }, texto: 'Era humo. Perdiste la plata y el tiempo mirando un video que no sirve para nada.' },
      ] },
      { id: 'rechazar', texto: 'Confiar en el trabajo de siempre con tu entrenador.', mods: {} },
    ],
  },

  // --- Decisiones de DOS opciones con dilema real (Pedido 1, v4): pedido
  // textual del usuario — "no todo sea siempre elegir entre tres mejoras
  // equivalentes"; a veces una disyuntiva corta y con carácter, una opción
  // que hace algo con costo y la otra que no cambia nada o casi nada. Viven
  // en el MISMO catálogo/pool que las de tres (arriba: 'chantaje' tiene 3
  // opciones, por ejemplo) para que el jugador se las cruce mezcladas, sin
  // patrón previsible — nunca en un silo aparte. Repartidas entre juvenil,
  // amateur ('JOVEN'), profesional y veterano ('PRO', y una exclusiva de
  // veterano más abajo). Ver también cards-camp.js para las del campamento.
  {
    id: 'guantes_nuevos', categoria: 'evento', titulo: 'Guantes nuevos en la vidriera', etapas: JOVEN, rareza: 'normal',
    texto: 'Un par de guantes importados en la vidriera del club, carísimos. Los tuyos ya no cierran bien de tan gastados.',
    opciones: [
      { id: 'comprar', texto: 'Juntar la plata y comprarlos.', efectos: { dinero: -8000 }, mods: { potencia: 2, tecnica: 1 } },
      { id: 'seguir', texto: 'Seguir con los de siempre: total, todavía atajan.', mods: {} },
    ],
  },
  {
    id: 'cuerpo_pide_tregua', categoria: 'evento', titulo: 'El cuerpo pide tregua', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Terminaste la sesión con las piernas de goma y un cansancio que no es de un día cualquiera. Tu entrenador te mira y espera que decidas vos.',
    opciones: [
      { id: 'seguir', texto: 'Apretar los dientes y seguir entrenando.', mods: { potencia: 2, velocidad: 2, cardio: -8 } },
      { id: 'descansar', texto: 'Bajar la persiana por hoy y descansar.', mods: { forma: 4 } },
    ],
  },
  {
    id: 'beca_deportiva', categoria: 'evento', titulo: 'La beca que te ofrecen', etapas: JOVEN, rareza: 'normal',
    texto: 'La secretaría de deportes del municipio ofrece una beca chica, pero exige entrenar también atletismo dos veces por semana.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptarla: la plata ayuda en casa.', efectos: { dinero: 12000 }, mods: { cardio: 2, tecnica: -2 } },
      { id: 'rechazar', texto: 'Rechazarla: preferís no repartir el tiempo.', mods: {} },
    ],
  },
  {
    id: 'primer_lujo', categoria: 'vida', titulo: 'El primer lujo', etapas: PRO, rareza: 'normal',
    texto: 'Con la última bolsa podrías darte un gusto caro. O guardarla, como te enseñaron en tu casa.',
    opciones: [
      { id: 'gastar', texto: 'Darte el gusto.', efectos: { dinero: -20000 }, mods: { moral: 6 } },
      { id: 'guardar', texto: 'Guardarla, como siempre.', mods: {} },
    ],
  },
  {
    id: 'gimnasio_de_moda', categoria: 'evento', titulo: 'El gimnasio de moda', etapas: PRO, rareza: 'normal',
    texto: 'Un gimnasio nuevo, con máquinas último modelo, te ofrece pase gratis por ser "cara conocida". Queda lejos de tu rincón de siempre.',
    opciones: [
      { id: 'probar', texto: 'Ir a probar unas semanas.', mods: { tecnica: 3, disciplinaPersonal: -3 } },
      { id: 'quedarte', texto: 'Quedarte en tu gimnasio de siempre.', mods: {} },
    ],
  },
  {
    id: 'consejo_del_viejo_entrenador', categoria: 'evento', titulo: 'El consejo del viejo entrenador', etapas: ['veterano'], rareza: 'normal',
    texto: 'Tu primer entrenador, ya jubilado, te invita a tomar unos mates y "hablar en serio" antes de la próxima pelea.',
    opciones: [
      { id: 'escuchar', texto: 'Ir a escucharlo con la cabeza abierta.', mods: { iq: 3, moral: 3 } },
      { id: 'no_ir', texto: 'Agradecer y seguir con la rutina de siempre.', mods: {} },
    ],
  },
  {
    id: 'la_costilla_que_avisa', categoria: 'evento', titulo: 'La costilla que avisa', etapas: SIEMPRE, rareza: 'rara',
    texto: 'Un pinchazo en las costillas durante el último sparring. Puede ser nada, o puede ser el principio de un problema.',
    opciones: [
      { id: 'seguir', texto: 'Ignorarlo y seguir entrenando fuerte.', probabilidades: [
        { peso: 70, mods: { potencia: 3 }, texto: 'Era un tirón sin importancia. Seguís de largo.' },
        { peso: 30, mods: { forma: -18 }, texto: 'Se hizo bola: terminás dos semanas en el diván del kinesiólogo.' },
      ] },
      { id: 'parar', texto: 'Parar antes de arriesgar de más.', mods: {} },
    ],
  },
  {
    id: 'torneo_interbarrial', categoria: 'evento', titulo: 'El torneo interbarrial', etapas: JOVEN, rareza: 'normal',
    texto: 'Organizan un torneo relámpago entre gimnasios del barrio, sin categorías ni pesaje serio. Buena experiencia, cero glamour.',
    opciones: [
      { id: 'anotarte', texto: 'Anotarte y sumar rounds de verdad.', mods: { iq: 2, cardio: 2, forma: -4 } },
      { id: 'no_anotarte', texto: 'Dejarlo pasar: no suma nada oficial.', mods: {} },
    ],
  },
  {
    id: 'fotos_viejas', categoria: 'vida', titulo: 'Las fotos viejas del gimnasio', etapas: SIEMPRE, rareza: 'normal',
    texto: 'Encontraste una caja con fotos de tus primeros años arriba de un ring. Dan ganas de mirarlas todas, y el tiempo no sobra.',
    opciones: [
      { id: 'mirar', texto: 'Sentarte un rato a mirarlas todas.', mods: { moral: 5, disciplinaPersonal: -2 } },
      { id: 'guardar', texto: 'Guardar la caja para otro día.', mods: {} },
    ],
  },
];
