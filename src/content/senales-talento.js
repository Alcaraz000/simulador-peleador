// Lo que le dice el entrenador al jugador para que INTUYA qué le tocó, sin
// mostrarle nunca un número (spec v13: "el talento se intuye, no se lee").
//
// Tres familias según cómo viene rindiendo el pibe. La gracia es que el
// jugador arme su propia teoría: si a los tres años el entrenador todavía
// dice que le cuesta, ya sabe qué carrera le espera.
export const SENALES_TALENTO = {
  alto: [
    'Este pibe agarra todo a la primera. Le mostrás algo y ya lo está haciendo mejor que vos.',
    'Hay algo raro acá. Cosas que a otros les llevan años, este las tiene en meses.',
    'Yo entrené a muchos. A este lo miro y me acuerdo por qué me metí en esto.',
    'No te lo digo para inflarte: el cuerpo te responde distinto que al resto.',
    'Lo que estás haciendo en un mes, a los otros les lleva una temporada.',
    'Ojo con este. Si sigue así, en dos años lo vamos a estar cuidando de los promotores.',
  ],
  normal: [
    'Vas bien. Ni rápido ni lento: como tiene que ser.',
    'El trabajo rinde. No hay magia, hay laburo.',
    'Estás donde tenés que estar para el tiempo que llevás.',
    'Nada que reprochar. Seguí así y vamos a estar bien.',
    'Progresás parejo. En este deporte eso ya es bastante.',
    'No sos un fenómeno ni falta que hace. Sos prolijo y eso aguanta.',
  ],
  bajo: [
    'Te cuesta más que a los otros, y no te lo digo para bajarte: te lo digo para que lo sepas.',
    'Vas a tener que laburar el doble. Es así, hay cuerpos y cuerpos.',
    'Lo que a otro le sale de una, a vos te va a llevar tres. Hay que bancarla.',
    'No te voy a mentir: el físico no te acompaña como quisiéramos.',
    'Vas lento. Pero el que llega tarde también llega, si no se baja antes.',
    'A vos la carrera te la va a dar la cabeza, no el cuerpo. Empezá a acostumbrarte.',
  ],
};

// A partir de cuántas decisiones el entrenador se anima a opinar. Antes de
// eso no hay con qué: nadie sabe cómo le rinde el trabajo a un pibe que
// recién empieza, y cantarlo en el minuto uno le sacaría toda la gracia.
export const DECISIONES_ANTES_DE_OPINAR = 5;
