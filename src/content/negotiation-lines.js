/**
 * Narración de cada movida de la negociación de la bolsa (Task v3, pedido
 * textual del usuario: "falta un campo que describa lo que acaba de
 * ocurrir... debe de haber distintas variaciones"). Cada movida tiene un
 * pool de variantes para el caso en que el promotor acepta y otro para
 * cuando se calienta. Marcadores: {bolsa} (la bolsa que queda sobre la
 * mesa, ya formateada) y {condicion} (solo en taquilla, cuando corresponde).
 */
export const LINEAS_NEGOCIACION = {
  masPlata: {
    acepta: [
      'Pedís un 25% más arriba de la mesa. El promotor resopla, putea por lo bajo, pero afloja: quedan {bolsa} sobre la mesa.',
      'Vas por más plata. Después de un ida y vuelta largo, el promotor cede: {bolsa}.',
      'Pedís el aumento sin vueltas. Al promotor no le hace gracia, pero firma por {bolsa}.',
      'Tirás la cifra más alta arriba de la mesa. El tipo hace cuentas en voz alta y termina aceptando: {bolsa}.',
    ],
    rechaza: [
      'Pedís un 25% más y el promotor te mira como si fueras un chiste. "Ni en pedo" te dice, y la oferta baja a {bolsa}.',
      'Vas por más plata y el promotor se ofende: "¿Vos quién te creés que sos?". La cifra cae a {bolsa}.',
      'Pedís el aumento y el clima se pone tenso. El promotor no cede nada y encima recorta: {bolsa}.',
      'El promotor escucha tu pedido y niega con la cabeza. "Así no negocio yo": la bolsa baja a {bolsa}.',
    ],
  },
  taquilla: {
    acepta: [
      'Pedís un {condicion}. Al promotor no le hace ni gracia, pero cede: además quedan {bolsa} sobre la mesa.',
      'Vas por tu tajada de la taquilla. Después de discutirlo un rato largo, el promotor firma: {bolsa} más {condicion}.',
      'Le proponés {condicion} y, aunque refunfuña, el promotor termina aceptando: {bolsa}.',
      'Pedís entrar en la recaudación. El promotor lo piensa, hace un cálculo rápido y dice que sí: {bolsa} con {condicion}.',
    ],
    rechaza: [
      'Pedís tu tajada de la taquilla y el promotor se pone rígido: "Esto no es una sociedad". La oferta baja a {bolsa}.',
      'Vas por el {condicion} y el promotor lo toma como una falta de respeto. La cifra cae a {bolsa}.',
      'Le proponés entrar en la recaudación y el tipo corta en seco: "Ni loco". Te quedan {bolsa}.',
      'Pedís {condicion} y el promotor se levanta a medias de la silla. Al final se sienta, pero con menos plata sobre la mesa: {bolsa}.',
    ],
  },
  apretar: {
    acepta: [
      'Vas con el ultimátum: o sube o no hay pelea. Un silencio largo... y el promotor cede: {bolsa} sobre la mesa.',
      'Apretás en serio: "esto o nada". El promotor putea, pero al final firma por {bolsa}.',
      'Jugás la carta más fuerte. El promotor te mide con la mirada, calcula lo que pierde si te vas, y afloja: {bolsa}.',
      'Le plantás el ultimátum sin vueltas. Después de un rato incómodo, termina aceptando: {bolsa}.',
    ],
    rechaza: [
      'Apretás con el ultimátum y el promotor explota: junta los papeles, putea, y te dice que te arreglás con lo que quedó: {bolsa}.',
      'Vas con el "o subís o no hay pelea" y el promotor se para de la silla. Vuelve a sentarse, pero furioso, y te deja {bolsa}.',
      'Jugás fuerte y el promotor se lo toma a mal: "Buscate otro que te pague eso". La oferta queda en {bolsa}.',
      'Le plantás el ultimátum y el clima se rompe. El promotor cede al final, pero recortado: {bolsa}.',
    ],
  },
};

/** Variedad para "cerrar el trato" (sin riesgo, pero también con voz propia). */
export const LINEAS_CIERRE = [
  'Cerrás en {bolsa}. Apretón de manos y a entrenar.',
  'Firmás lo que hay sobre la mesa: {bolsa}. Buen trato, a la lona.',
  'Das por cerrado el número: {bolsa}. El promotor ya está pensando en la promoción.',
  'Ponés la firma por {bolsa}. Nada de vueltas: ahora a preparar la pelea.',
];
