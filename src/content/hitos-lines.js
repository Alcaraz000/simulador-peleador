// Textos de los popups de hitos (Sistema 4, feedback del usuario: "faltan
// popups cuando pasen cosas importantes: cuando se gana un cinturón, cuando
// se pierde un cinturón, cuando se avanza de categoría..."). Mismo criterio
// que content/news-templates.js: mínimo 3 variantes de título y de cuerpo
// por tipo, con marcadores {llave}, así el cartel no se siente siempre
// igual. `textoDeHito` (core/hitos.js) es quien elige la variante y rellena
// los marcadores.

export const TITULO_GANADO = {
  titulos: ['¡Sos campeón!', 'Noche de gloria', 'Corona nueva'],
  cuerpos: [
    'Levantaste el {cinturon}. Nadie te lo puede sacar esta noche.',
    'El {cinturon} es tuyo. Así se escribe una carrera.',
    'Te colgaste el {cinturon} al cuello. Que dure mucho.',
  ],
};

export const TITULO_PERDIDO = {
  titulos: ['Se cayó el cinturón', 'Noche para el olvido', 'Cambio de manos'],
  cuerpos: [
    'Perdiste el {cinturon}. Duele, pero la carrera sigue.',
    'Te sacaron el {cinturon}. Ahora hay que remar de nuevo.',
    'El {cinturon} ya no es tuyo. Levantarse también es parte del oficio.',
  ],
};

export const DEFENSA_EXITOSA = {
  titulos: ['Lo defendiste', 'Sigue en casa', 'Nadie te lo saca'],
  cuerpos: [
    'El {cinturon} sigue siendo tuyo. Otro retador que se quedó en el intento.',
    'Defendiste el {cinturon} con las manos bien puestas.',
    'Otra defensa exitosa del {cinturon}. El reinado sigue.',
  ],
};

export const ETAPA_AVANZA = {
  titulos: ['Nuevo capítulo', 'Subís de categoría', 'Otro nivel'],
  cuerpos: [
    'Arranca la etapa {etapa}. {frase}',
    'Dejás atrás una etapa y entrás a {etapa}. {frase}',
    'La carrera te lleva a {etapa}. {frase}',
  ],
};

export const PRIMERA_PELEA = {
  titulos: ['Debut', 'Arrancó todo', 'Primera vez arriba del ring'],
  cuerpos: [
    'Tu primera pelea ya quedó en el historial. Todo lo demás, a partir de acá.',
    'La primera de muchas. Bienvenido a la carrera.',
    'Ya sos un peleador con historial, aunque sea de una sola línea.',
  ],
};

export const RIVALIDAD_CONSAGRADA = {
  titulos: ['Ya hay una rivalidad', 'Se picó', 'Nace una rivalidad'],
  cuerpos: [
    'Vos y {rival} ya se cruzaron las veces suficientes. Esto va a dar que hablar.',
    'La cosa con {rival} pasó a mayores.',
    '{rival} y vos ya tienen historia. El resto de la carrera se va a acordar.',
  ],
};

export const RACHA = {
  titulos: ['Racha', 'Imparable', 'No para'],
  cuerpos: [
    '{cantidad} peleas, {cantidad} victorias. Estás en otra categoría.',
    'Van {cantidad} seguidas sin perder. Nadie te frena.',
    'La racha de {cantidad} habla sola.',
  ],
};
