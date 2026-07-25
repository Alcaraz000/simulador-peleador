/**
 * Lineas narrativas de pelea, voz de relator rioplatense. `{yo}` y `{rival}`
 * se reemplazan por los apodos.
 *
 * Dos convenciones de roles, según la categoría (así ya funcionaba `caida`
 * y `ko` antes de esta ampliación, y se mantiene para las nuevas):
 *
 * - `dominio` / `parejo` / `sufriendo` / `campana`: son el veredicto del
 *   round narrado siempre desde el punto de vista del jugador. `{yo}` es
 *   SIEMPRE el jugador, `{rival}` SIEMPRE el rival — sin importar quién
 *   ganó el round (por eso existen las tres categorías separadas).
 * - `jab` / `cuerpo` / `contragolpe` / `cansancio` / `caida` / `ko` /
 *   `sumision`: son momentos puntuales de acción. Ahí `{yo}` es quien
 *   protagoniza la acción de esa línea (el que pega, el que cae, el que
 *   se cansa) y `{rival}` el otro, sin importar si ese protagonista es el
 *   jugador o el rival.
 */
export const LINEAS = {
  dominio: [
    '{yo} lo tiene contra las cuerdas y no lo deja respirar.',
    'Round claro de {yo}: entra, pega y sale limpio.',
    '{yo} lo lee todo y lo castiga de contra.',
    'Se escucha el ruido de los golpes de {yo} desde la última fila.',
    '{yo} le está dando una clase de boxeo.',
    'No hay round acá: es un baile de {yo} solo.',
    '{rival} no encuentra piso y {yo} se lo hace pagar.',
    '{yo} manda en el ring, {rival} solo intenta sobrevivir.',
    'Otra vez {yo} arriba: distancia, timing y castigo.',
    '{yo} le cierra la salida y lo castiga con la derecha.',
    'Round para el olvido de {rival}: {yo} no le da tregua.',
    '{yo} lo tiene mareado y el árbitro ya lo mira de cerca.',
  ],
  parejo: [
    'Round cerrado, los dos se sacan chispas en el centro.',
    'Se estudian, se tocan, nadie se saca ventaja.',
    'Round parejo: {yo} y {rival} se pegan y se aguantan.',
    'Ninguno de los dos quiere ceder el centro del ring.',
    '{yo} busca la distancia justa, {rival} no se la da fácil.',
    'Van punto por punto: round parejo y peleado.',
    'Ni {yo} ni {rival} logran quebrar el ritmo del otro.',
    'Los dos se miden con respeto, sin regalar nada.',
    '{yo} y {rival} se cruzan seguido, sin que ninguno mande.',
    'Round de trámite: se tantean más de lo que pegan.',
  ],
  sufriendo: [
    '{rival} lo tiene a maltraer y {yo} aguanta como puede.',
    'Round duro para {yo}: le entran todas.',
    '{rival} lo encierra y {yo} apenas mueve la cabeza.',
    '{rival} le encuentra la distancia una y otra vez.',
    '{yo} se cubre como puede pero {rival} sigue conectando.',
    'Malas noticias para {yo}: no consigue frenar a {rival}.',
    '{rival} le impone el ritmo y {yo} va siempre un paso atrás.',
    'El rincón de {yo} ya está preocupado, {rival} no afloja.',
    '{yo} busca refugio en las cuerdas pero {rival} no lo suelta.',
    'Otro round para el olvido: {rival} manda y {yo} resiste.',
  ],
  caida: [
    '¡Abajo! {rival} manda a la lona a {yo}.',
    '¡Cayó {yo}! Se levanta con las piernas de goma.',
    'Mano seca de {rival} y {yo} besa la lona.',
    '¡{yo} toca la lona! El árbitro empieza la cuenta.',
    'Golpe justo y {yo} se va abajo, aturdido.',
    '¡Increíble! {rival} lo conecta limpio y {yo} cae de rodillas.',
    '{yo} pierde el equilibrio después del golpe de {rival} y toca piso.',
    'Cuenta de protección para {yo}: {rival} lo sacudió de verdad.',
    '¡Abajo otra vez! {yo} no encuentra las piernas.',
    'Directo de {rival} y {yo} se derrumba contra las cuerdas.',
  ],
  ko: [
    '¡Se terminó! {yo} lo apagó de un golpe.',
    '¡Nocaut! {rival} no se levanta más.',
    'El árbitro no cuenta ni hasta tres: {yo} lo durmió.',
    '¡{yo} lo borró! {rival} no se puede levantar.',
    'Nocaut brutal: {yo} conecta el golpe de la noche y {rival} se derrumba.',
    '¡Se acabó acá! {rival} queda tendido y {yo} festeja en el rincón neutral.',
    '{yo} encuentra el hueco justo y {rival} cae desmayado.',
    'Un zurdazo de {yo} y se apagan las luces para {rival}.',
    '¡Fulminante! {yo} lo saca del ring de un solo golpe.',
    'El referí ni cuenta: {rival} está fuera de combate y {yo} es el dueño de la noche.',
  ],
  sumision: [
    '{yo} lo lleva al piso, le busca el cuello y {rival} golpea el suelo.',
    'Sumisión perfecta de {yo}: no le quedó otra que rendirse.',
    '{yo} lo derriba, le trenza el brazo y {rival} da la palmada.',
    'Técnica pura: {yo} lo ahorca y {rival} no tiene otra que golpear el piso.',
    '{rival} queda atrapado en la llave de {yo} y no le queda otra que rendirse.',
    '{yo} cierra el triángulo y {rival} se rinde antes de quedarse dormido.',
    'Al piso: {yo} domina la posición y le saca la sumisión a {rival}.',
    '{rival} lucha por zafar pero {yo} no afloja hasta que da la palmada.',
  ],
  campana: [
    'Suena la campana.',
    'Se termina el round.',
    'Suena la campana y los rincones se preparan.',
    'Termina el round, arranca el trabajo de esquineros.',
    'Campana. A cortar la hemorragia si hace falta.',
    'Se acaba el round, cada uno para su banco.',
    'Campanazo y silencio en el ring por un minuto.',
    'Fin del round. Toca respirar y escuchar al rincón.',
  ],
  jab: [
    '{yo} arranca tanteando con el jab, buscando la distancia.',
    'Jab de {yo} para abrir el terreno.',
    '{yo} mide a {rival} con el brazo largo antes de meterse.',
    'Primeros intercambios: {yo} pica de afuera con el jab.',
    '{yo} le toca la cara a {rival} para tomarle el tiempo.',
    'Se estudian un segundo y {yo} rompe el hielo con un jab seco.',
    '{yo} usa el jab como regla, midiendo cada paso de {rival}.',
    'Doble jab de {yo} para entrar en confianza.',
    '{yo} empieza a trabajar de afuera, jab y movimiento.',
    '{rival} recibe el primer toque del jab de {yo} y ajusta la guardia.',
  ],
  cuerpo: [
    '{yo} baja el nivel y le entierra un gancho al hígado.',
    'Castigo al cuerpo: {yo} lo va apagando de a poco.',
    '{yo} le mete las manos en las costillas y {rival} se dobla.',
    'Trabajo sucio de {yo}: cuerpo, cuerpo y otra vez cuerpo.',
    '{rival} baja la guardia un segundo y {yo} le clava el gancho corto.',
    '{yo} le corta el aire con un derechazo al plexo.',
    'Ese golpe al hígado de {yo} se va a sentir en el próximo round.',
    '{yo} insiste con la inversión al cuerpo, {rival} empieza a resentirlo.',
    'Un gancho corto de {yo} al cuerpo y {rival} afloja los brazos.',
    '{yo} lo pega en las costillas y se nota que le duele.',
  ],
  contragolpe: [
    '{yo} espera el error y contragolpea justo.',
    '{rival} se abre al atacar y {yo} lo castiga de contra.',
    'Esquiva {yo} y responde con un derechazo de contra.',
    '{yo} lo deja fallar y le devuelve el golpe multiplicado.',
    'Clase de contragolpe: {yo} lo espera y lo conecta seco.',
    '{rival} se anima a entrar y se encuentra con la derecha de {yo}.',
    '{yo} tira la cabeza atrás y sale con un gancho de contra.',
    'Contragolpe perfecto de {yo} apenas {rival} termina su combinación.',
    '{yo} usa la distancia para cazarlo de contra.',
    '{rival} paga caro su ansiedad: {yo} lo agarra entrando.',
  ],
  cansancio: [
    'Se le empiezan a caer los brazos a {yo}, el cardio pasa factura.',
    '{yo} respira con la boca abierta, el ritmo de {rival} lo está fundiendo.',
    'Las piernas de {yo} ya no responden igual que en el primer round.',
    '{yo} baja los brazos un segundo, el cansancio es evidente.',
    'Se nota el desgaste en {yo}: menos movimiento, menos reflejos.',
    '{yo} busca aire apoyado en las cuerdas.',
    'El cuerpo le pesa a {yo} y {rival} lo aprovecha.',
    '{yo} pelea contra el reloj y contra el cansancio, ya no le sobra nada.',
    'Se le nota el tanque vacío a {yo}, cada golpe le cuesta el doble.',
    '{yo} arrastra un poco la guardia, el ritmo lo está pasando por arriba.',
  ],
};
