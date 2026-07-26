// Cada tipo de noticia tiene titular (una línea) y cuerpo (un párrafo corto).
// Ambos comparten el mismo set de marcadores por tipo, así que `datos` sirve
// para generar los dos sin pedirle nada extra a quien llama. Mínimo 3
// variantes de titular y 3 de cuerpo por tipo, para que el feed no se sienta
// repetido en una carrera larga.
export const PLANTILLAS = {
  victoria: {
    titulares: [
      '{apodo} se lo sacó de encima: le ganó a {rival} por {metodo} en el round {round}.',
      '{nombre} sigue invicto en su racha: {metodo} sobre {rival}.',
      'Noche redonda para {apodo}: liquidó a {rival} por {metodo}.',
    ],
    cuerpos: [
      'El round {round} quedó para el recuerdo: nadie esperaba un final tan claro.',
      'En el vestuario ya hablan de la revancha con {rival}, aunque todavía nadie la pidió en serio.',
      'La victoria llega en un buen momento: la crítica empezaba a hacer preguntas incómodas sobre {nombre}.',
    ],
  },
  derrota: {
    titulares: [
      '{rival} le cortó la racha a {apodo}: {metodo} en el {round}.',
      'Golpe duro para {nombre}: cayó ante {rival} por {metodo}.',
      'Se terminó el invicto: {rival} venció a {apodo} por {metodo}.',
    ],
    cuerpos: [
      'Se terminó rápido: en el {round} ya se veía venir.',
      'El equipo de {apodo} pide calma: "una derrota no borra el camino recorrido".',
      '{rival} lo dejó claro arriba del ring, sin necesidad de gritarlo después.',
    ],
  },
  titulo: {
    titulares: [
      '¡{apodo} es campeón! Se quedó con el {titulo}.',
      'Nuevo rey de la categoría: {nombre} conquistó el {titulo}.',
      'Histórico: {apodo} le arrebató el {titulo} a {rival}.',
    ],
    cuerpos: [
      'La ceremonia de entrega ya tiene fecha, y el brillo del {titulo} no deja dormir a nadie del equipo.',
      'Contra {rival} no había margen de error, y {apodo} lo entendió mejor que nadie.',
      'El vestuario todavía festeja: un {titulo} así no se consigue todos los días.',
    ],
  },
  defensa: {
    titulares: [
      '{apodo} defendió el {titulo} y ya suma {numero}.',
      'El cinturón sigue en casa: {nombre} retuvo ante {rival}.',
      'Nadie se lo saca: {apodo} defendió el {titulo} una vez más.',
    ],
    cuerpos: [
      'Van {numero} defensas y la pregunta ya no es si puede, sino hasta cuándo.',
      '{rival} lo intentó todo, pero el {titulo} no cambió de dueño.',
      'La comisión ya empieza a mirar quién viene después para desafiar a {nombre}.',
    ],
  },
  retiro: {
    titulares: [
      '{nombre} cuelga los guantes. Se termina una era.',
      'Adiós al ring: {apodo} anunció su retiro.',
      'Sin vuelta atrás: {nombre} confirmó que no pelea nunca más.',
    ],
    cuerpos: [
      'La noticia agarró a todos de sorpresa, aunque los rumores venían de hace meses.',
      'El gimnasio de {apodo} ya piensa en el próximo capítulo, lejos de los guantes.',
      'Se guarda una carrera entera de anécdotas y ni una sola excusa.',
    ],
  },
  lesion: {
    titulares: [
      '{apodo} se lesionó: parte médico reservado.',
      'Preocupación en el equipo de {nombre} por una lesión.',
      'Parate obligado: {apodo} no pelea por lesión.',
    ],
    cuerpos: [
      'El cuerpo médico prefiere no arriesgar y pide paciencia.',
      'En el gimnasio de {nombre} bajan la ansiedad: "se cuida ahora para volver mejor".',
      'Todavía no hay fecha de regreso confirmada para {apodo}.',
    ],
  },
  ranking: {
    titulares: [
      '{apodo} sube al puesto {numero} del ranking.',
      'Movimiento en la tabla: {nombre} ahora es el número {numero}.',
      'La tabla se reordena: {apodo} entra en el top {numero}.',
    ],
    cuerpos: [
      'Los promotores ya empiezan a mover fichas para una pelea grande.',
      'Nadie duda: {nombre} se ganó el lugar arriba del ring, no en un escritorio.',
      'El puesto {numero} abre la puerta a rivales que antes ni atendían el teléfono.',
    ],
  },
  escandalo: {
    titulares: [
      'Escándalo alrededor de {nombre}: la federación pide explicaciones.',
      '{apodo} en el ojo de la tormenta tras la polémica.',
      'Ruido extra deportivo: {nombre} tuvo que salir a aclarar todo.',
    ],
    cuerpos: [
      'Los detalles todavía son confusos, pero el teléfono de {apodo} no para de sonar.',
      'La comisión evalúa si corresponde algún tipo de sanción.',
      'El entorno de {nombre} pide que se enfoquen en lo deportivo y nada más.',
    ],
  },
  revancha: {
    titulares: [
      'Se viene la revancha: {apodo} vs {rival}, otra vez.',
      'La rivalidad no termina: {nombre} y {rival} se cruzan de nuevo.',
      'Otra vez frente a frente: {apodo} y {rival} vuelven a cruzarse.',
    ],
    cuerpos: [
      'Nadie quedó conforme la primera vez, y esta vez promete ser peor.',
      'Los promotores no podían dejar pasar la chance de venderla otra vez.',
      '{nombre} ya avisó que esta vez no hay excusas que valgan.',
    ],
  },
  record: {
    titulares: [
      '{apodo} alcanzó las {numero} victorias en su carrera.',
      'Marca histórica: {nombre} llegó a {numero} triunfos.',
      'Número redondo: {apodo} ya suma {numero} en su cuenta.',
    ],
    cuerpos: [
      'Los números empiezan a hablar solos en la carrera de {nombre}.',
      'Ya pocos discuten el lugar de {apodo} entre los mejores de su época.',
      'Otra marca para el currículum de {nombre}, que no para de sumar.',
    ],
  },
  // Pedido v6 ("las noticias también deberían nombrar al jugador... te lo
  // sacaron"): faltaba el reverso de `titulo` — perder el cinturón, no solo
  // ganarlo o defenderlo.
  titulo_perdido: {
    titulares: [
      '{rival} le bajó el {titulo} a {apodo}.',
      'Cambio de manos forzado: {nombre} perdió el {titulo} ante {rival}.',
      'Se terminó el reinado: {apodo} ya no tiene el {titulo}.',
    ],
    cuerpos: [
      'Nadie lo esperaba tan pronto, pero el cinturón ya tiene otro dueño.',
      'En el gimnasio de {nombre} ya prometen ir por la revancha apenas se pueda.',
      '{rival} no dio ventajas y el {titulo} cambió de manos sin discusión.',
    ],
  },
  // "ganaste una revancha": distinto del tipo `revancha` de arriba (que
  // anuncia que el cruce SE VIENE) — este es el resultado, ya jugado.
  revancha_ganada: {
    titulares: [
      '{apodo} se cobró la revancha ante {rival}.',
      'Esta vez sí: {nombre} dio vuelta la historia con {rival}.',
      'Cuentas saldadas: {apodo} venció a {rival} en la revancha.',
    ],
    cuerpos: [
      'La primera vez había quedado una espina, y esta victoria la saca del todo.',
      'Nadie puede decir ahora que fue casualidad.',
      'El folclore de la rivalidad suma un capítulo más, esta vez a favor de {nombre}.',
    ],
  },
  // "debutaste como profesional": distinto del `debut` que ya emite
  // noticiasDeSucesos para un NPC nuevo (ese usa el titular armado desde
  // `suceso.texto`, nunca esta plantilla) — este es el propio.
  debut: {
    titulares: [
      '{apodo} debuta como profesional.',
      'Primer paso en la categoría rentada: {nombre} ya es profesional.',
      'Nuevo nombre en la categoría: debutó {apodo}.',
    ],
    cuerpos: [
      'El camino recién empieza, pero ya queda una primera marca en el papel.',
      'En el gimnasio de {nombre} lo tienen claro: esto es apenas el principio.',
      'Todavía no lo conoce nadie afuera del barrio, pero eso está por cambiar.',
    ],
  },
};
