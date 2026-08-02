// "Momentos memorables" de la pantalla de legado (legacy.js). Varias
// variantes por tipo de hito: cuatro líneas del mismo tipo (p.ej. dos
// defensas de título contra rivales distintos) no pueden sonar calcadas.
// `{rival}` y `{enJuego}` se reemplazan con los datos de la pelea.
//
// Ojo: esto NO era la causa real de la queja del usuario ("dos frases
// idénticas, mismo rival, mismo cinturón"). Esa causa era que ganar un
// título y defenderlo comparten `esTitulo:true` + `resultado:'v'` y
// legacy.js les ponía la MISMA frase a los dos. La variedad de acá es la
// segunda parte del pedido ("dale variedad a la redacción") una vez que la
// causa de fondo ya está separada en categorías distintas.
export const MOMENTOS = {
  tituloGanado: [
    'Le ganó a {rival} y se colgó el {enJuego}.',
    'Contra {rival}, se llevó el {enJuego} para casa.',
    'Noche de gloria: venció a {rival} y se convirtió en dueño del {enJuego}.',
    'Ahí nomás, ante {rival}, conquistó el {enJuego}.',
  ],
  tituloDefendido: [
    'Defendió el {enJuego} ante {rival}.',
    'Retuvo el {enJuego}: {rival} no se lo pudo sacar.',
    'Una defensa más del {enJuego}, esta vez ante {rival}.',
    'El {enJuego} siguió en su poder tras vencer a {rival}.',
  ],
  tituloPerdido: [
    'Perdió el {enJuego} contra {rival}.',
    'Se le escapó el {enJuego}: cayó ante {rival}.',
    '{rival} le arrebató el {enJuego}.',
  ],
  koPrimerRound: [
    'Durmió a {rival} en el primer round.',
    'Liquidó a {rival} antes de que sonara la campana del segundo round.',
    'Fulminante: {rival} ni llegó al segundo round.',
    'Un solo asalto le alcanzó para borrar a {rival}.',
  ],
  debut: [
    'Su debut fue contra {rival}.',
    'Todo empezó con {rival}, en su primera noche arriba del ring.',
  ],
};

// Task 6.2 ("La carrera que no llegó también se cuenta"): el cierre de
// carrera se arma sobre lo que el peleador SÍ hizo, nunca sobre lo que le
// faltó. Con el rediseño de rejugabilidad, 3 de cada 4 carreras no llegan al
// mundial — un campeón nacional que defendió cuatro veces y se retiró
// invicto tiene una gran historia, y el cierre tiene que tratarla como tal.
//
// Cuatro finales (uno por nivel máximo de título alguna vez conquistado) más
// un set de "hitos" que se suman según lo que de verdad pasó en la carrera
// (invicto, racha larga, rival grande vencido, cuerpo castigado, defensas
// múltiples, carrera extensa). Ninguno usa lenguaje de derrota o fracaso:
// ni siquiera el que nunca ganó un cinturón — ese cierre se arma sobre la
// trayectoria, el corazón puesto y las noches peleadas, nunca sobre lo que
// no consiguió.
//
// Varias variantes por bloque (mismo criterio que MOMENTOS arriba): dos
// carreras del mismo nivel no pueden cerrar con el mismo párrafo. La
// selección es determinista (ver `indiceEstable`/`fraseDe` en legacy.js):
// un hash de los datos reales de la carrera, nunca Math.random().
export const CIERRE = {
  aperturaMundial: [
    '{nombre} se calzó el Cinturón mundial y cerró la carrera profesional con {record}.',
    'Pocos llegan tan arriba: {nombre} fue campeón del mundo, con un {record} que respalda cada paso.',
    '{nombre} escribió su nombre entre los campeones del mundo. Carrera profesional: {record}.',
    'La cima del boxeo existe, y {nombre} la pisó: campeón mundial, {record} en el historial.',
    'Hubo una noche en la que {nombre} se convirtió en campeón del mundo. La carrera terminó con {record}.',
  ],
  aperturaNacional: [
    '{nombre} se colgó el Cinturón nacional y cerró la carrera profesional con {record}.',
    'Campeón nacional: {nombre} llegó a lo más alto del boxeo de su país, con {record} en el registro.',
    '{nombre} construyó una carrera de campeón, dueño del Cinturón nacional, con {record} en el historial.',
    'El Cinturón nacional terminó en la cintura de {nombre}, después de una carrera de {record}.',
    'Ser el mejor de todo un país no es poca cosa, y {nombre} lo fue. Cierra con {record}.',
  ],
  aperturaRegional: [
    '{nombre} se quedó con el Cinturón regional y cerró la carrera profesional con {record}.',
    'Campeón regional: {nombre} pisó firme el primer peldaño de todos, con {record} en el historial.',
    '{nombre} llegó a ser campeón de su región, con un {record} que abrió la puerta grande.',
    'El Cinturón regional pasó por la cintura de {nombre}, tras una carrera de {record}.',
    'Antes de ser cualquier otra cosa, un boxeador es campeón regional. {nombre} lo fue, con {record}.',
  ],
  aperturaSinTitulo: [
    '{nombre} cerró su carrera profesional con {record}, sin cinturones en la valija pero con cada pelea puesta.',
    '{nombre} nunca se colgó un cinturón, pero subió al ring en {peleas} peleas y dejó todo en cada una.',
    'El nombre de {nombre} no quedó en ningún cinturón, pero sí en la memoria de quien lo vio pelear: {record} en el historial.',
    '{nombre} hizo su carrera lejos de las coronas, con {record} arriba del ring y la cabeza siempre en alto.',
    'Sin título de por medio, {nombre} cerró una carrera de {record} construida pelea a pelea.',
  ],
  cierreMundial: [
    'El cinturón más grande del boxeo pasó por su cintura. Eso no se lo saca nadie.',
    'Hay un lugar en la historia chica del boxeo para los que llegaron a la cima, y ahí quedó para siempre.',
    'De acá en más, cuando se hable de los mejores de su categoría, su nombre va a estar en la lista.',
    'No todos los que suben a un ring sueñan con ser campeones del mundo. Él lo fue.',
    'Fue, durante un tiempo, el mejor del planeta en lo suyo. Con eso alcanza para una vida entera.',
  ],
  cierreNacional: [
    'No hizo falta el mundo entero para dejar huella: alcanzó con ser el mejor de su país.',
    'Campeón nacional es un título que se gana arriba del ring, nunca se regala.',
    'En su país, todavía se van a acordar de cuando era el número uno.',
    'El cinturón nacional le quedó bien puesto. Con eso alcanza para contar una carrera entera.',
    'Ser el mejor de un país entero, aunque sea por una temporada, ya es una carrera lograda.',
  ],
  cierreRegional: [
    'Todo campeón, en algún momento, fue campeón regional primero. Él llegó a serlo.',
    'No cualquiera se cuelga un cinturón. Este lo tiene guardado para siempre.',
    'El gimnasio del barrio y la cartelera regional: ahí fue el mejor que hubo.',
    'Un cinturón regional no es poca cosa: hay que ganarlo arriba del ring, como todos los demás.',
    'Empezar a ganar cinturones por algún lado hay que hacerlo. Él lo hizo, y le alcanzó para una historia.',
  ],
  cierreSinTitulo: [
    'No todos los que suben a un ring se llevan un cinturón a casa. Todos los que suben, arriesgan lo mismo.',
    'El boxeo también se trata de esto: de subir, pelea tras pelea, sin ninguna garantía.',
    'Hay carreras que se cuentan por cinturones y otras que se cuentan por el corazón que le pusieron. Esta es de las segundas.',
    'Nunca hizo falta un cinturón para que esta carrera valiera la pena contarla.',
    'Subió al ring todas las veces que hicieron falta. Esa cuenta, nadie se la puede borrar.',
  ],
  invicto: [
    'Se retiró invicto: en toda la carrera profesional, nadie lo bajó del ring con la mano levantada.',
    'Ni una sola vez tuvo que resignarse a ver el marcador en contra: cerró invicto.',
    'Invicto. En {peleas} peleas profesionales, siempre salió con la mano en alto.',
    'Cerró la carrera sin una sola marca en contra: invicto de punta a punta.',
  ],
  racha: [
    'Tuvo una racha de {racha} victorias seguidas que nadie le pudo cortar.',
    'Encadenó {racha} triunfos al hilo: una racha que habla sola.',
    'Hubo un tramo de la carrera en el que ganó {racha} peleas seguidas, una atrás de la otra.',
    '{racha} victorias consecutivas fueron su mejor momento arriba del ring.',
  ],
  rivalGrande: [
    'Entre sus víctimas está {rival}, uno de los más duros que le tocó enfrentar.',
    'Le ganó a {rival}, y esa sola victoria ya vale una carrera.',
    'Se cruzó con {rival} arriba del ring, y salió con la mano levantada.',
    'A {rival} no le ganaba cualquiera. Él sí.',
  ],
  cuerpoCastigado: [
    'El cuerpo le pasó factura antes de tiempo: los golpes que absorbió arriba del ring se sintieron en los últimos años.',
    'No todo fue gratis: el castigo que se llevó en el ring le adelantó el desgaste de las piernas.',
    'Peleó con el cuerpo cada vez más golpeado, y aun así, siguió subiendo al ring.',
    'Los años finales los peleó con un cuerpo que ya había pagado caro cada nocaut sufrido.',
  ],
  defensasNotables: [
    'Defendió el título {defensas} veces: no fue un campeón de una sola noche.',
    '{defensas} defensas exitosas dicen que no fue casualidad.',
    'Puso el cinturón en juego {defensas} veces, y las {defensas} veces se lo quedó.',
    'Un campeón se mide en las defensas, y este puso el título en juego {defensas} veces.',
  ],
  perdioElCetro: [
    'Después lo perdió, pero nadie le puede sacar los años en los que fue el mejor.',
    'El cinturón cambió de dueño más adelante. El título de haberlo sido, no.',
    'Con el tiempo el título pasó a otras manos. La historia de haber llegado ya está escrita.',
    'Terminó la carrera sin el cinturón puesto, pero con la certeza de haberlo llevado.',
  ],
  carreraLarga: [
    'Peleó {peleas} veces en su carrera profesional: pocos aguantan tantas noches arriba del ring.',
    '{peleas} peleas profesionales son muchas noches jugándose todo.',
    'Subió al ring {peleas} veces como profesional. Eso, solo, ya cuenta una carrera larga.',
    'Una carrera de {peleas} peleas no la hace cualquiera.',
  ],
};
