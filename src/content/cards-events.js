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
    texto: 'Un entrenador famoso te quiere en su equipo. Don Pepe se hace el que no escuchó.',
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
];
