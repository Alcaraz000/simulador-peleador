/**
 * Opinión del entrenador sobre la pelea que te están por ofrecer (Task v3,
 * pedido textual del usuario: "una frase de tu entrenador, si recomienda, si
 * no, si cree que no se puede ganar, si cree que hay pocas chances..."). La
 * categoría la decide `opinionEntrenador` en core/offers.js (compara tu media
 * con la del rival y tu estado físico); acá solo vive el texto, con varias
 * variantes por categoría para que no suene repetido en una carrera larga.
 *
 * Marcadores: {rival} (apodo del rival), {bolsa} (bolsa formateada),
 * {enJuego} (solo en el pool de título, ver OPINIONES_ENTRENADOR_TITULO).
 */
export const OPINIONES_ENTRENADOR = {
  muy_confiado: [
    'Andá tranquilo. A {rival} lo pasás por arriba, esto no te tiene que quitar el sueño.',
    'Esto es un trámite. {rival} no te llega ni a los talones.',
    'Con lo que venís mostrando, {rival} es rival de sparring, no de cartel.',
    'Dormí tranquilo esta semana: {rival} no te complica en nada.',
    'Aceptá sin pensarlo. Contra {rival} vas a manejar la pelea de punta a punta.',
  ],
  confiado: [
    'Lo tenés a favor. {rival} pelea bien, pero vos estás un escalón arriba.',
    'Salís favorito ante {rival}, y con razón. Hacé tu pelea y esto se resuelve solo.',
    'Confío en vos contra {rival}. No te relajes, pero es tuya para perder.',
    'Los números te dan mejor que a {rival}. Aprovechá esa ventaja.',
    'Es una buena oferta contra {rival}, un rival que podés manejar. Yo la tomaría.',
  ],
  parejo: [
    'Esto va a estar mano a mano con {rival}. Ni fácil ni imposible.',
    'Pelea pareja con {rival}. El que la piense mejor esa noche se la lleva.',
    '{rival} te complica, pero no te gana solo. Va a ser cuestión de detalles.',
    'No hay favorito claro contra {rival}. Preparate en serio, esta se juega punto a punto.',
    'Cincuenta y cincuenta contra {rival}. Si entrenamos bien, se inclina para nuestro lado.',
  ],
  cauteloso: [
    'Cuidado con {rival}: está un poco por encima tuyo esta vez.',
    'No es imposible contra {rival}, pero vas de abajo. Hay que pelear inteligente, no valiente.',
    'Si aceptás, aceptá sabiendo que {rival} te complica en serio.',
    'Te tengo fe, pero seamos honestos: hoy {rival} parte mejor parado.',
    'Yo la tomaría con pinzas. Contra {rival} un error se paga caro.',
  ],
  desafio: [
    'Contra {rival} vas de underdog. Si querés ir, te banco, pero te gana más veces de las que perdés.',
    'Contra {rival} es un desafío grande. Puede salir una hazaña o puede salir feo.',
    'Yo lo pensaría dos veces contra {rival}. Si te la jugás, por {bolsa} vale la pena intentarlo.',
    '{rival} te tiene mejor parado de punta a punta. Vas a necesitar la noche perfecta.',
    'Esta la aceptaría solo si estás mentalizado para sufrir. {rival} no te va a regalar nada.',
  ],
  no_recomendado: [
    'No la aceptaría. {rival} te gana nueve de cada diez esta noche.',
    'Con cómo estás llegando, {rival} es un riesgo que no hace falta correr.',
    'Sinceramente no lo veo. {rival} te pasa por arriba tal como estás parado.',
    'No es el momento para {rival}. Si podés, esperá otra oferta.',
    'Contra {rival}, así como llegás, te puede lastimar en serio. Yo paso.',
  ],
};

// Variantes que además nombran lo que está en juego (Task v3: "que la
// recomendación tenga en cuenta lo que está en juego y la bolsa"): se usan
// cuando la oferta es de título o defensa, para que la opinión del
// entrenador no ignore el peso del cinturón, solo el matchup.
export const OPINIONES_ENTRENADOR_TITULO = {
  muy_confiado: [
    'Andá y traé el {enJuego}. Contra {rival} no debería costarte nada.',
    'Este cinturón ya casi es tuyo. {rival} no te va a discutir nada en serio.',
  ],
  confiado: [
    'Es por el {enJuego} contra {rival}, y lo tenés a favor. No aflojes hasta el campanazo final.',
    'Vas por el {enJuego} con ventaja sobre {rival}. Concentración y esto queda en casa.',
  ],
  parejo: [
    'Se juega el {enJuego} contra {rival} y va a estar durísima. No hay margen para relajarse ni un round.',
    'Por un cinturón así, {rival} va a dar todo lo que tiene. Nosotros también.',
  ],
  cauteloso: [
    'El {enJuego} vale la pena el riesgo, pero {rival} te complica en serio esta vez.',
    'Es una gran chance por el {enJuego}, aunque hoy partís de abajo contra {rival}.',
  ],
  desafio: [
    'Por un {enJuego} me la juego aunque {rival} salga favorito. Estas oportunidades no vuelven.',
    'Sé que vas de underdog contra {rival}, pero un {enJuego} bien vale el riesgo.',
  ],
  no_recomendado: [
    'Ni por el {enJuego} te recomiendo esto. {rival} te puede lastimar en serio.',
    'Entiendo la tentación del {enJuego}, pero contra {rival} así como estás, no.',
  ],
};
