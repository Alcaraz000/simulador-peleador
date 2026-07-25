const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];
const PRO = ['profesional', 'veterano'];

export const CARTAS_EVENTO = [
  {
    id: 'dopaje', categoria: 'evento', titulo: 'El sobre en el vestuario', etapas: PRO,
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
    id: 'chantaje', categoria: 'evento', titulo: 'La foto que no existía', etapas: PRO,
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
    id: 'sponsor', categoria: 'evento', titulo: 'La marca que te quiere', etapas: PRO,
    texto: 'Una marca de bebidas te ofrece contrato. Hay que filmar una publicidad ridícula.',
    opciones: [
      { id: 'firmar', texto: 'Firmar. La plata es plata.', efectos: { dinero: 40000, fama: 6 }, mods: { forma: -3 } },
      { id: 'rechazar', texto: 'No. Estoy entrenando.', mods: { forma: 5, disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'entrenador', categoria: 'evento', titulo: 'Te ofrecen otro rincón', etapas: PRO,
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
    id: 'cancelacion', categoria: 'evento', titulo: 'Se cayó la cartelera', etapas: PRO,
    texto: 'El promotor no consiguió el estadio. La pelea se cae a tres días.',
    opciones: [
      { id: 'aguantar', texto: 'Bancar y seguir entrenando.', mods: { disciplinaPersonal: 4, forma: -2 } },
      { id: 'putear', texto: 'Salir a puteario en público.', efectos: { fama: 5 }, mods: { moral: -3 } },
    ],
  },
  {
    id: 'escandalo', categoria: 'evento', titulo: 'Pelea en un boliche', etapas: PRO,
    texto: 'Un pibe te filmó respondiendo a las provocaciones. El video vuela.',
    opciones: [
      { id: 'disculpa', texto: 'Pedir disculpas públicas.', mods: { moral: -3, disciplinaPersonal: 4 } },
      { id: 'bancar', texto: 'Bancarte lo que hiciste.', efectos: { fama: 8 }, mods: { moral: 3 } },
    ],
  },
  {
    id: 'invitacion', categoria: 'evento', titulo: 'Exhibición en el exterior', etapas: PRO,
    texto: 'Te invitan a una exhibición afuera. Paga bien y no es en serio... en teoría.',
    opciones: [
      { id: 'ir', texto: 'Ir.', efectos: { dinero: 30000, fama: 4 }, mods: { fatiga: 10 } },
      { id: 'no_ir', texto: 'Quedarte entrenando.', mods: { forma: 6 } },
    ],
  },
  {
    id: 'familia', categoria: 'vida', titulo: 'El cumpleaños de tu vieja', etapas: SIEMPRE,
    texto: 'Es el mismo día que el último sparring fuerte antes de la pelea.',
    opciones: [
      { id: 'ir', texto: 'Ir al cumpleaños.', mods: { moral: 10, forma: -4 } },
      { id: 'entrenar', texto: 'Entrenar igual.', mods: { forma: 5, moral: -6 } },
    ],
  },
  {
    id: 'amigos', categoria: 'vida', titulo: 'Los pibes del barrio', etapas: SIEMPRE,
    texto: 'Te llaman para un asado. Hace meses que no los ves.',
    opciones: [
      { id: 'ir', texto: 'Ir un rato.', mods: { moral: 8, disciplinaPersonal: -3 } },
      { id: 'no_ir', texto: 'Dejarlo para después de la pelea.', mods: { disciplinaPersonal: 4, moral: -3 } },
    ],
  },
  {
    id: 'pareja', categoria: 'vida', titulo: 'La charla pendiente', etapas: ['amateur', 'profesional', 'veterano'],
    texto: 'Tu pareja te dice que hace meses que estás en otra. Tiene razón.',
    opciones: [
      { id: 'priorizar', texto: 'Bajar un cambio y estar presente.', mods: { moral: 12, forma: -5 } },
      { id: 'carrera', texto: 'Explicar que esto es ahora o nunca.', mods: { disciplinaPersonal: 5, moral: -8 } },
    ],
  },
  {
    id: 'vicio', categoria: 'vida', titulo: 'La noche larga', etapas: PRO,
    texto: 'Después de ganar, la joda se estira. Mañana hay entrenamiento a las siete.',
    opciones: [
      { id: 'seguir', texto: 'Seguirla.', mods: { moral: 6, forma: -8, disciplinaPersonal: -5 } },
      { id: 'irse', texto: 'Irte temprano.', mods: { disciplinaPersonal: 5, forma: 3, moral: -2 } },
    ],
  },
  {
    id: 'rutina', categoria: 'vida', titulo: 'Las cinco de la mañana', etapas: SIEMPRE,
    texto: 'Suena el despertador. Está oscuro y hace frío. Nadie te ve.',
    opciones: [
      { id: 'levantarse', texto: 'Levantarte igual.', mods: { disciplinaPersonal: 6, cardio: 2, moral: -2 } },
      { id: 'dormir', texto: 'Dormir media hora más.', mods: { forma: 3, disciplinaPersonal: -4 } },
    ],
  },
];
