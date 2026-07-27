// Textos de sabor para las peleas que se "resuelven solas" (v6, rediseño de
// ritmo: "no todas las peleas se juegan igual" — ver esPeleaImportante en
// offers.js y armarLotePeleas en core/tramite.js). El jugador nunca ve estas
// peleas beat a beat; ve un resumen corto, con crónica de verdad, no un
// renglón de log ("3 peleas: 3-0"). Parametrizados con {cantidad} ("Tres
// peleas", ya armado en core/tramite.js), {record} ("3-0") y {ko} (una
// cláusula ya armada como ", dos por nocaut" o "" si ninguna fue por nocaut
// — así el template puede escribir "{record}{ko}." sin preocuparse por si
// hay o no KOs esta vez).
//
// Tres tonos (v6, "'veterano' no es una categoría... úsalo para el tono de
// las noticias y los textos"): 'amateur' (formación, todavía no cuenta),
// 'profesional' (el grueso de la carrera) y 'veterano' (el mismo profesional,
// más golpeado, con más kilometraje encima — el tono cambia, la mecánica no).

export const TRAMITE_AMATEUR = {
  perfecta: [
    '{cantidad} en el circuito amateur: {record}{ko}. Todavía no cuenta para el récord de verdad, pero el nombre empieza a sonar.',
    'Temporada amateur prolija: {record}{ko}. Nada de esto va al historial profesional — es puro aprendizaje.',
  ],
  mixta: [
    '{cantidad} en el circuito amateur: {record}. Se gana, se pierde, se aprende — nada de esto pesa en el récord de verdad todavía.',
    'Amateur, de a poco: {record}{ko}. El cinturón de verdad está lejos, pero el oficio se empieza a notar.',
  ],
  derrotas: [
    '{cantidad} en el circuito amateur, {record}: duro, pero es la etapa para pagar el derecho de piso, no para que quede en ningún papel.',
    'Amateur difícil: {record}. Nadie las cuenta cuando debutes de verdad, y eso alivia.',
  ],
  unaGanada: [
    'Una más en el circuito amateur, ganada. No queda en ningún registro oficial, pero en el gimnasio ya te miran distinto.',
    'Ganaste en el amateur otra vez. No suma al récord que un día vas a defender, pero suma confianza.',
  ],
  unaPerdida: [
    'Perdiste en el circuito amateur. No queda anotada en ningún lado que importe, pero duele igual.',
    'Una caída en el amateur. Nadie te la va a recordar el día de mañana — hoy, sí escuece.',
  ],
};

export const TRAMITE_PROFESIONAL = {
  perfecta: [
    '{cantidad} en el año: {record}{ko}. Cartelera de trámite, resuelta sin sobresaltos.',
    'El mánager llenó la agenda: {record}{ko}, y ni un susto en ninguna.',
    'Temporada tranquila: {record}. Nombres de relleno, pero el récord no distingue: suma igual.',
  ],
  mixta: [
    '{cantidad} en el año: {record}. No todo puede salir perfecto en una cartelera tan cargada.',
    'Año parejo de trámite: {record}{ko}. Alguna se te escapó, pero el rumbo general sigue en pie.',
  ],
  derrotas: [
    '{cantidad} en el año, {record}: un tramo flojo, sin nada en juego más que el orgullo.',
    'Cartelera de trámite dura: {record}. Nada que ponga en riesgo un cinturón, pero el récord lo va a recordar.',
  ],
  unaGanada: [
    'Una pelea de trámite, resuelta sin drama: sumás una victoria más al récord.',
    'Cartelera chica, cumplida: ganaste sin que nadie se sorprenda.',
  ],
  unaPerdida: [
    'Una pelea de trámite que se te dio vuelta. No había nada grande en juego, pero la derrota igual queda anotada.',
    'Perdiste una que "no debía" perderse. Pasa, hasta en las carteleras chicas.',
  ],
};

export const TRAMITE_VETERANO = {
  perfecta: [
    '{cantidad} en el año, con el cuerpo ya golpeado por los años: {record}{ko}. La experiencia todavía rinde.',
    'A esta altura de la carrera, {cantidad} de trámite: {record}. Se nota el oficio de tantos años arriba del ring.',
  ],
  mixta: [
    '{cantidad} en el año, ya con kilometraje encima: {record}. El cuerpo cobra, pero el nombre todavía abre puertas.',
    'Temporada pareja para un veterano: {record}{ko}. Ni todo declive, ni toda gloria.',
  ],
  derrotas: [
    '{cantidad} en el año, {record}: los años empiezan a pesar más que las ganas.',
    'Tramo duro para un peleador con tanto camino recorrido: {record}. El cuerpo manda la carta.',
  ],
  unaGanada: [
    'Una pelea de trámite más, ganada con el oficio de los años, sin apuro.',
    'A esta altura, todavía sabés cómo llevarte una fácil: ganaste sin sobresaltos.',
  ],
  unaPerdida: [
    'Una pelea de trámite que un peleador con más piernas antes ganaba solo. Los años pasan factura.',
    'Perdiste una que en tu prime ni discutías. El cuerpo ya no perdona.',
  ],
};

export const POOLS_TRAMITE = {
  amateur: TRAMITE_AMATEUR,
  profesional: TRAMITE_PROFESIONAL,
  veterano: TRAMITE_VETERANO,
};

// ===== Pedido 1 (v7): "que la pelea se anuncie antes" ======================
// Aperturas cortas para la tarjeta de anuncio del combate de trámite
// destacado (ver panel-tramite.js): la frase de tu entrenador sobre ESE
// matchup puntual ya sale de `oferta.fraseEntrenador` (offers.js, la misma
// que arma la oferta de una pelea grande) — acá solo hace falta una apertura
// breve que le dé pie, variada para que no suene igual carrera tras carrera.
export const ANUNCIO_TRAMITE = [
  'Ya te consiguieron rival.',
  'El mánager cerró la próxima fecha.',
  'Nueva fecha en el calendario.',
  'Ya hay rival para la próxima.',
  'El teléfono sonó con una oferta más.',
];

// ===== Pedido 2 (v7): crónica del combate de trámite jugado con el
// minijuego ==================================================================
// La tabla marcador->resultado (armarMarcador/resultadoDeMarcador,
// tramite.js): 'ko' (3-0), 'unanime' (3-1), 'dividida' (3-2), cada una con
// su texto para la victoria ('v') y la derrota ('d'). Marcador {rival} (mote
// del rival) y {marcador} ("3-0", ya armado en panel-tramite.js).
export const RESULTADO_DESTACADO_TRAMITE = {
  ko: {
    v: [
      'Lo sacaste con un {marcador} de punta a punta: {rival} no vio de dónde vino.',
      '{marcador} y al piso. {rival} no tuvo margen para reaccionar.',
      'Nocaut limpio, {marcador}. Una noche redonda contra {rival}.',
    ],
    d: [
      '{rival} te encontró primero: {marcador} y las luces se apagaron antes de tiempo.',
      'Perdiste por nocaut, {marcador}. {rival} no te dio ni un respiro.',
      'Duro golpe: {marcador} en contra. {rival} te paró antes de la distancia.',
    ],
  },
  unanime: {
    v: [
      'Ganaste claro, {marcador} en las planillas. {rival} nunca te discutió la pelea de verdad.',
      'Decisión unánime a favor, {marcador}: manejaste el ritmo casi todo el combate.',
      '{marcador}. Le ganaste el pulso a {rival} sin sobresaltos grandes.',
    ],
    d: [
      'Perdiste por decisión unánime, {marcador}: {rival} te ganó el pulso esta vez.',
      '{marcador} en contra. No alcanzó para convencer a las planillas.',
      'Noche difícil: {rival} se llevó las tarjetas, {marcador}.',
    ],
  },
  dividida: {
    v: [
      'La ganaste por muy poco, {marcador} dividido: {rival} la hizo pelear hasta el final.',
      'Apretada de verdad: {marcador}. Podía haber salido para cualquier lado.',
      '{marcador}, al límite. {rival} no te la regaló ni un segundo.',
    ],
    d: [
      'La perdiste en el límite, {marcador} dividido: pudo haber salido para tu lado.',
      'Se te escapó por poco: {marcador} en contra, ante {rival}.',
      '{marcador}, ajustadísimo. No alcanzó, pero estuviste ahí.',
    ],
  },
};
