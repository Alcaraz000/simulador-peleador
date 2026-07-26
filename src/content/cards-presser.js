/**
 * El careo: preguntas/chicanas que le tocan al jugador antes de la pelea, y
 * cómo responde en cada uno de los cuatro tonos.
 *
 * `hablante` distingue quién habla (Task v3, pedido textual del usuario: una
 * de las líneas "no tiene nada que ver, no es lo que te diría un peleador,
 * sino más bien un periodista deportivo" — la corrección no es solo de
 * texto, es de VOZ):
 *   - 'rival': una chicana que el propio contrincante te tira en la cara,
 *     delante de las cámaras. Provocación directa, de peleador a peleador.
 *   - 'periodista': una pregunta de un cronista en la conferencia. Ambos
 *     conviven en una rueda de prensa real, así que la mezcla es a
 *     propósito — lo que se corrigió es que antes TODO se mostraba como si
 *     te lo dijera el rival mirándote fijo, aunque el contenido fuera
 *     claramente periodístico (ver presser.js: la UI arma el encabezado
 *     distinto según `hablante`).
 */
export const PREGUNTAS_CAREO = [
  // --- Chicanas del propio rival --------------------------------------
  {
    id: 'suerte', hablante: 'rival',
    texto: '"Vos no llegaste hasta acá por mérito. Llegaste de gancho, y eso en el ring se nota."',
    respuestas: [
      { tono: 'provocador', texto: '"Suerte va a necesitar él para llegar al segundo round."' },
      { tono: 'frio', texto: '"Los números están. Mirá el récord y después hablamos."' },
      { tono: 'humilde', texto: '"Puede ser. Trabajo todos los días para que no dependa de eso."' },
      { tono: 'canchero', texto: '"Si esto es suerte, la banco. Que me dure."' },
    ],
  },
  {
    id: 'amenaza', hablante: 'rival',
    texto: '"Contá los días que te quedan enteros, porque de esta no salís como entraste."',
    respuestas: [
      { tono: 'provocador', texto: '"El único que va a contar algo sos vos: los segundos en la lona."' },
      { tono: 'frio', texto: '"Le gano 7 de 10 y lo sabe. Por eso grita."' },
      { tono: 'humilde', texto: '"Es una leyenda. Yo vengo a dar lo mejor y ver qué pasa."' },
      { tono: 'canchero', texto: '"Traje pochoclos para escucharlo. Avisen cuando diga algo cierto."' },
    ],
  },
  {
    id: 'peso', hablante: 'rival',
    texto: '"Andá pesándote bien, no sea cosa que llegues seco como la última vez."',
    respuestas: [
      { tono: 'provocador', texto: '"Voy a llegar entero. El que va a estar seco es él, de tanto hablar."' },
      { tono: 'frio', texto: '"El peso está controlado desde hace ocho semanas."' },
      { tono: 'humilde', texto: '"Es lo más difícil de esto. Le estamos poniendo mucho trabajo."' },
      { tono: 'canchero', texto: '"Doy el peso y todavía me sobra para un choripán."' },
    ],
  },
  {
    id: 'estilo', hablante: 'rival',
    texto: '"Ese estilo tuyo aburre hasta a tu propia esquina. A mí no me vas a aburrir: te voy a cazar."',
    respuestas: [
      { tono: 'provocador', texto: '"Aburrido va a ser verte dormir en la lona."' },
      { tono: 'frio', texto: '"Mi estilo gana peleas. No vine a entretener."' },
      { tono: 'humilde', texto: '"Entiendo la crítica. Voy a buscar la pelea."' },
      { tono: 'canchero', texto: '"Si querés show, andá al circo. Yo vengo a ganar."' },
    ],
  },
  {
    id: 'edad', hablante: 'rival',
    texto: '"¿No estás grande para esto? Andate a jugar a las bochas y dejame el ring a mí."',
    respuestas: [
      { tono: 'provocador', texto: '"Grande y todavía te paso por arriba."' },
      { tono: 'frio', texto: '"Los años son experiencia. Los números no bajaron."' },
      { tono: 'humilde', texto: '"Algún día va a ser cierto. Hoy todavía no."' },
      { tono: 'canchero', texto: '"Grande es mi viejo y todavía me gana al truco."' },
    ],
  },
  {
    id: 'menton', hablante: 'rival',
    texto: '"Con ese mentón de vidrio que tenés, no te doy ni al segundo round."',
    respuestas: [
      { tono: 'provocador', texto: '"Vidrio el que vas a necesitar vos para juntar los dientes del piso."' },
      { tono: 'frio', texto: '"Mi mentón aguantó cosas peores que tu mano. Seguimos."' },
      { tono: 'humilde', texto: '"Puede que tenga razón. Por eso entreno la guardia el doble."' },
      { tono: 'canchero', texto: '"¿Vidrio? Ya me rompí antes y acá sigo, mirá vos."' },
    ],
  },
  {
    id: 'record', hablante: 'rival',
    texto: '"Ese récord tuyo lo hiciste noqueando taxistas. Conmigo se te acaba la joda."',
    respuestas: [
      { tono: 'provocador', texto: '"Y con vos sigo la joda, pero en la lona."' },
      { tono: 'frio', texto: '"Un récord se hace ganando lo que te ponen adelante. Vos sos lo que sigue."' },
      { tono: 'humilde', texto: '"Puede que no haya peleado con los mejores todavía. Por eso acepté esta."' },
      { tono: 'canchero', texto: '"Taxistas o campeones, yo cobro el viaje igual."' },
    ],
  },
  {
    id: 'familia', hablante: 'rival',
    texto: '"Andá despidiéndote de tu gente, porque de esta no salís entero."',
    respuestas: [
      { tono: 'provocador', texto: '"El que se tiene que despedir sos vos, de tus propias piernas."' },
      { tono: 'frio', texto: '"Mi gente me ve entrenar todos los días. Sabe cómo llego."' },
      { tono: 'humilde', texto: '"Mi familia sabe que doy todo. Pase lo que pase, vuelvo entero."' },
      { tono: 'canchero', texto: '"Ya avisé que voy a llegar tarde a cenar, nada más."' },
    ],
  },
  {
    id: 'respeto', hablante: 'rival',
    texto: '"A vos no te tengo ni fe ni respeto. Sos un cartel más en mi camino."',
    respuestas: [
      { tono: 'provocador', texto: '"El respeto te lo vas a llevar a las trompadas, no de yapa."' },
      { tono: 'frio', texto: '"No necesito tu respeto. Necesito ganar. Con eso alcanza."' },
      { tono: 'humilde', texto: '"No pido respeto antes de pelear. Lo pido después, si me lo gano."' },
      { tono: 'canchero', texto: '"Tranquilo, que después de esto vas a tener que anotarme el nombre."' },
    ],
  },
  {
    id: 'plata_rival', hablante: 'rival',
    texto: '"¿Peleás por la guita o porque de verdad creés que me ganás? Porque las dos juntas no te van a alcanzar."',
    respuestas: [
      { tono: 'provocador', texto: '"Peleo por las dos, y las dos te las voy a sacar."' },
      { tono: 'frio', texto: '"Peleo por el cinturón. La plata es consecuencia de ganar."' },
      { tono: 'humilde', texto: '"Peleo para que a mi familia no le vuelva a faltar nada."' },
      { tono: 'canchero', texto: '"¿Vos laburás gratis? Bueno, yo tampoco."' },
    ],
  },

  // --- Preguntas de la prensa ------------------------------------------
  {
    id: 'video_joda', hablante: 'periodista',
    texto: '"Se filtró un video tuyo de joda la semana de la pelea. ¿Cómo repercute eso en la preparación?"',
    respuestas: [
      { tono: 'provocador', texto: '"Mi vida privada no le importa a nadie. Rindo y punto."' },
      { tono: 'frio', texto: '"Es un tema resuelto con el cuerpo técnico. Nada que agregar."' },
      { tono: 'humilde', texto: '"Me equivoqué. Pido disculpas y lo corrijo en el ring."' },
      { tono: 'canchero', texto: '"¿Un asado con amigos ahora es delito? Dale."' },
    ],
  },
  {
    id: 'prediccion', hablante: 'periodista',
    texto: '"Una predicción para la pelea, para los que nos están escuchando."',
    respuestas: [
      { tono: 'provocador', texto: '"Nocaut en el primero. Anotalo."' },
      { tono: 'frio', texto: '"Gano por decisión clara. Sin sobresaltos."' },
      { tono: 'humilde', texto: '"No hago predicciones. Se pelea el día de la pelea."' },
      { tono: 'canchero', texto: '"Gano yo. ¿Querés que te lo dibuje?"' },
    ],
  },
  {
    id: 'talentos_dudas', hablante: 'periodista',
    texto: '"Hay quienes dicen que llegaste hasta acá con algo de suerte. ¿Qué les responde?"',
    respuestas: [
      { tono: 'provocador', texto: '"Que se guarden la opinión para cuando lo vean de cerca."' },
      { tono: 'frio', texto: '"Que miren los números. Ahí está la respuesta."' },
      { tono: 'humilde', texto: '"Que tienen derecho a dudar. Yo sigo laburando igual."' },
      { tono: 'canchero', texto: '"Que la suerte también hay que saber administrarla, ¿no?"' },
    ],
  },
  {
    id: 'negocio', hablante: 'periodista',
    texto: '"¿Cuánto de esta pelea es negocio y cuánto es deporte, la verdad?"',
    respuestas: [
      { tono: 'provocador', texto: '"Va a ser un gran negocio para mí cuando lo tire a él."' },
      { tono: 'frio', texto: '"Es un contrato como cualquier otro. Adentro del ring, deporte puro."' },
      { tono: 'humilde', texto: '"Ojalá algún día no tuviera que pensar en la plata. Por ahora, las dos cosas."' },
      { tono: 'canchero', texto: '"Negocio, deporte... yo solo sé que después me pagan."' },
    ],
  },
  {
    id: 'mentalidad', hablante: 'periodista',
    texto: '"¿Cómo se prepara mentalmente para una pelea así?"',
    respuestas: [
      { tono: 'provocador', texto: '"Pensando en la cara que va a poner cuando lo agarre."' },
      { tono: 'frio', texto: '"Rutina, visualización y descanso. Nada nuevo."' },
      { tono: 'humilde', texto: '"Con mucho apoyo del equipo. Solo no podría."' },
      { tono: 'canchero', texto: '"Con la mente tranquila. Ya gané esta antes, en mi cabeza."' },
    ],
  },
  {
    id: 'legado', hablante: 'periodista',
    texto: '"¿Qué significaría este resultado para su carrera, gane o pierda?"',
    respuestas: [
      { tono: 'provocador', texto: '"Ganando, un paso más para que nadie se anime a cruzarme."' },
      { tono: 'frio', texto: '"Un dato más en el camino. Ni me cambia ni me define solo."' },
      { tono: 'humilde', texto: '"Significa mucho para mí y para los que me bancan desde el barrio."' },
      { tono: 'canchero', texto: '"Va a ser una anécdota más para cuando sea viejo y cuente historias."' },
    ],
  },
];

/**
 * Narración del resultado de cada ronda del careo (Task v3: variedad para
 * que no suene repetido). `{rival}` se reemplaza por el apodo del rival.
 * Tres categorías, elegidas en core/presser.js según cuánta ventaja mental
 * dejó la respuesta: 'incomoda' (le pegaste donde le duele), 'agranda' (le
 * diste pie para crecerse) y 'neutral' (nadie se llevó la ronda).
 */
export const NARRACION_CAREO = {
  incomoda: [
    '{rival} se queda sin respuesta. Le pegaste justo donde duele.',
    '{rival} traga saliva y busca cambiar de tema. Ahí lo tenés.',
    'La sala lo nota: a {rival} esa no se la esperaba.',
    '{rival} pierde el hilo un segundo. Se le nota en la cara.',
    'Silencio incómodo del lado de {rival}. Round tuyo, claro.',
  ],
  agranda: [
    '{rival} se agranda con eso. La sala explota a su favor.',
    'Le diste pie para lucirse: {rival} sonríe y redobla la apuesta.',
    '{rival} toma envión con tu respuesta. No era lo que hacía falta decir.',
    'La sala se pone de su lado: {rival} se creció con eso.',
    '{rival} levanta la voz, cómodo. Le regalaste el momento.',
  ],
  neutral: [
    'La sala murmura. Nadie se llevó la ronda.',
    'Ronda pareja: ni vos ni {rival} sumaron demasiado.',
    'Cruce de trámite. Se sigue con la siguiente pregunta.',
    '{rival} asiente sin darle mayor peso. Sigue la rueda de prensa.',
    'Ni fu ni fa. La conferencia sigue su curso.',
  ],
};
