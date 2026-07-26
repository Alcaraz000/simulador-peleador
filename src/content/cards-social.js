export const CARTAS_REDES = [
  {
    id: 'post_general', titulo: '¿Qué posteás?', rareza: 'normal',
    texto: 'Tenés el teléfono en la mano y la cabeza caliente.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"El que sigue en la lista ya sabe quién es."', efectos: { fama: 6, heatRival: 22 } },
      { id: 'humilde', tono: 'humilde', texto: '"Gracias al equipo. A seguir laburando."', efectos: { fama: 2 }, mods: { moral: 4 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Subís el afiche de la próxima pelea.', efectos: { fama: 4, dinero: 2000 } },
    ],
  },
  {
    id: 'post_entrenamiento', titulo: 'Video de entrenamiento', rareza: 'normal',
    texto: 'Grabaste una sesión donde volaste. ¿La subís?',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Con la leyenda: "Y todavía no estoy al 100%".', efectos: { fama: 5, heatRival: 15 } },
      { id: 'humilde', tono: 'humilde', texto: 'Sin texto. Que hable el trabajo.', efectos: { fama: 3 }, mods: { disciplinaPersonal: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Etiquetando a los sponsors.', efectos: { fama: 2, dinero: 4000 } },
    ],
  },
  {
    id: 'post_derrota', titulo: 'Después de una derrota', rareza: 'normal',
    texto: 'Todos esperan que digas algo.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"Revancha cuando quieras. Si tenés."', efectos: { fama: 7, heatRival: 30 } },
      { id: 'humilde', tono: 'humilde', texto: '"Ganó el mejor. Vuelvo."', efectos: { fama: 2 }, mods: { moral: 6 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Silencio y una foto entrenando.', efectos: { fama: 1 }, mods: { disciplinaPersonal: 4 } },
    ],
  },
  {
    id: 'post_rival', titulo: 'Te tiraron un palo', rareza: 'normal',
    texto: 'Un rival dijo que sos "producto de marketing".',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Contestarle con todo.', efectos: { fama: 8, heatRival: 28 } },
      { id: 'humilde', tono: 'humilde', texto: 'Ignorarlo elegantemente.', efectos: { fama: 1 }, mods: { moral: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Usarlo para vender la pelea.', efectos: { fama: 5, dinero: 3000, heatRival: 10 } },
    ],
  },
  {
    id: 'post_titulo', titulo: 'Hablando del cinturón', rareza: 'normal',
    texto: 'Todos preguntan cuándo vas por el título.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"El campeón me esquiva y todos lo saben."', efectos: { fama: 7, heatRival: 25 } },
      { id: 'humilde', tono: 'humilde', texto: '"Paso a paso. Primero el que sigue."', efectos: { fama: 2 }, mods: { iq: 2 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Anunciar que estás cerca.', efectos: { fama: 5 } },
    ],
  },
  {
    id: 'post_barrio', titulo: 'Foto en el barrio', rareza: 'normal',
    texto: 'Volviste al gimnasio donde empezaste.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"De acá salí. Ustedes salieron de una academia."', efectos: { fama: 4, heatRival: 12 } },
      { id: 'humilde', tono: 'humilde', texto: '"Nunca me fui de acá."', efectos: { fama: 4 }, mods: { moral: 6 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Pedir apoyo para el club.', efectos: { fama: 3, dinero: 1500 } },
    ],
  },
  {
    id: 'post_peso', titulo: 'Foto en la balanza', rareza: 'normal',
    texto: 'Diste el peso sin sufrir. Se nota.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"Yo llego entero. Otros llegan secos."', efectos: { fama: 5, heatRival: 18 } },
      { id: 'humilde', tono: 'humilde', texto: '"Trabajo de todo el equipo."', efectos: { fama: 2 }, mods: { forma: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Etiquetar al nutricionista sponsor.', efectos: { fama: 2, dinero: 3500 } },
    ],
  },
  {
    id: 'post_pelea_grande', titulo: 'La semana de la pelea', rareza: 'normal',
    texto: 'Falta poco y la gente está encendida.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Prometer nocaut en el primero.', efectos: { fama: 9, heatRival: 32 }, mods: { moral: -3 } },
      { id: 'humilde', tono: 'humilde', texto: 'Agradecer y pedir respeto.', efectos: { fama: 2 }, mods: { moral: 5 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Empujar la venta de entradas.', efectos: { fama: 4, dinero: 6000 } },
    ],
  },

  // Legendaria: rara a propósito (~5% del sorteo) y potente de verdad — no se
  // nerfea. El clip se hizo viral solo; la fama que deja cualquiera de las
  // tres respuestas está muy por encima de un post cualquiera.
  {
    id: 'post_viral', titulo: 'Se hizo viral solo', rareza: 'legendaria',
    texto: 'Un clip tuyo entrenando explotó en todas las redes de la noche a la mañana. Millones de vistas y no hiciste nada para lograrlo.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"Y esto es solo el calentamiento."', efectos: { fama: 15, heatRival: 35 } },
      { id: 'humilde', tono: 'humilde', texto: '"Ni yo lo puedo creer. Gracias a todos."', efectos: { fama: 18 }, mods: { moral: 8 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Aprovechar la ola para vender todo lo que se pueda.', efectos: { fama: 10, dinero: 20000 } },
    ],
  },
];
