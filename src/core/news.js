import { PLANTILLAS } from '../content/news-templates.js';

let contador = 0;

function reemplazarMarcadores(plantilla, datos, tipo) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => {
    const valor = datos[clave];
    if (valor === undefined || valor === null || valor === '') {
      throw new Error(`Falta el marcador "${clave}" para una noticia de tipo ${tipo}`);
    }
    return String(valor);
  });
}

export function generarNoticia(rng, { tipo, datos = {}, fecha = 0 }) {
  const plantilla = PLANTILLAS[tipo];
  if (!plantilla) throw new Error(`Tipo de noticia desconocido: ${tipo}`);

  const titular = reemplazarMarcadores(rng.pick(plantilla.titulares), datos, tipo);
  const cuerpo = reemplazarMarcadores(rng.pick(plantilla.cuerpos), datos, tipo);

  contador += 1;
  return {
    id: `noticia_${contador}`, tipo, titular, cuerpo, fecha, nueva: true,
  };
}

const MAPA_SUCESOS = {
  victoria: 'victoria',
  titulo: 'titulo',
  retiro: 'retiro',
  lesion: 'lesion',
  ascenso: 'ranking',
  // Pedido 2 (v6, "que aparezcan peleadores nuevos"): un debutante que
  // reemplaza a un retirado (avanzarMundo, world.js) no es un resultado de
  // pelea — necesita su propio tipo, si no caía en 'victoria' por defecto.
  debut: 'debut',
};

// Los sucesos que vienen del mundo (avanzarMundo en world.js) ya traen el
// titular armado como prosa ("X noqueó a Y."), sin datos sueltos para
// reconstruir un cuerpo específico con marcadores. El cuerpo acá es
// atmosférico, sin marcadores: cualquiera de las variantes sirve para
// cualquier suceso de ese tipo.
// Verificación visual (v9): con el feed en 30 noticias y el grueso siendo
// de tipo 'victoria', tres variantes por tipo alcanzaban para que la MISMA
// frase apareciera siete veces en pantalla al mismo tiempo. No es un
// problema de selección (el hash reparte bien): es aritmética — pocas
// variantes contra muchas noticias. La solución es contenido, no algoritmo.
const CUERPOS_SUCESO = {
  victoria: [
    'Otro resultado que reordena la conversación en la categoría.',
    'La noticia ya corre por los gimnasios rivales.',
    'Nada cambia el calendario, pero sí las apuestas de la próxima cartelera.',
    'En el ranking nadie lo dice en voz alta, pero todos toman nota.',
    'Un resultado más para la pila de los que hay que tener en cuenta.',
    'Los que estaban en la cartelera miraron con atención.',
    'El teléfono del promotor no paró de sonar desde la campana final.',
    'De esas noches que después se cuentan distinto según quién las cuente.',
    'La cartelera de la categoría se acomoda un poco más.',
    'Nada que no se supiera, pero ahora está escrito en el récord.',
  ],
  titulo: [
    'El cinturón cambia de manos y con él, la conversación de toda la categoría.',
    'Los promotores ya piensan en la próxima defensa.',
    'El vestuario todavía festeja: no todos los días se corona a alguien nuevo.',
    'Se acabó un reinado y empieza otro, con todo lo que eso arrastra.',
    'La foto con el cinturón al hombro ya está dando la vuelta.',
    'A partir de esta noche, todos los caminos de la categoría pasan por él.',
    'El que quiera el cinturón ahora sabe a qué puerta golpear.',
  ],
  retiro: [
    'El anuncio deja un lugar vacío en el ranking que alguien va a pelear.',
    'Otro nombre que se despide del ring por la puerta grande.',
    'Los rumores venían de hace rato, pero la confirmación igual pega fuerte.',
    'Se va con el récord cerrado y la nariz torcida, como corresponde.',
    'Colgó los guantes en el gimnasio donde había empezado.',
    'Deja una escuela y unas cuantas peleas que se van a seguir mirando.',
    'El aplauso duró más que el discurso.',
  ],
  lesion: [
    'El parte médico no da mayores precisiones por ahora.',
    'El calendario de la categoría se reordena mientras dura la baja.',
    'El entorno pide paciencia y evitar apurar los tiempos de vuelta.',
    'En el gimnasio bajan el tono: nadie quiere hablar de plazos.',
    'La fecha que tenía firmada se cae, y con ella los planes del año.',
    'Dicen que volvió del médico sin decir una palabra.',
  ],
  ranking: [
    'La tabla se sigue moviendo semana a semana.',
    'Un movimiento así no pasa desapercibido para los promotores.',
    'Arriba se respira distinto, y ya se nota en las ofertas que empiezan a llegar.',
    'Subir es fácil comparado con bancarse el lugar.',
    'Los de arriba lo miran de reojo; los de abajo, con ganas.',
    'Un par de puestos que valen más de lo que parecen.',
  ],
  debut: [
    'Otra promesa que se suma a pelear por un lugar en la categoría.',
    'Todavía no lo conoce nadie, pero en el gimnasio ya hablan de él.',
    'La categoría nunca se queda quieta: siempre hay una cara nueva golpeando la puerta.',
    'Llega con más hambre que récord, que para empezar alcanza.',
    'El que lo entrena dice que hay con qué. Habrá que verlo arriba del ring.',
    'Debutó sin público propio y se fue con unos cuantos aplausos prestados.',
  ],
};

const CUERPOS_SUCESO_GENERICO = [
  'El mundo de la categoría sigue moviéndose, con o sin vos arriba del ring.',
  'Otra novedad que se suma al día a día del boxeo.',
  'La noticia corre rápido entre gimnasios y promotores.',
];

// Hash chico y estable de un texto. Sirve para elegir variante de cuerpo sin
// azar y sin contadores de módulo: la misma noticia siempre trae el mismo
// párrafo, en cualquier corrida y después de cargar una partida guardada.
function hashTexto(texto) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) {
    h = (h * 31 + texto.charCodeAt(i)) % 100000;
  }
  return h;
}

// Pedido 3 (v9, "aparecen muchas noticias nuevas de golpe, quiero que no
// sean tantas, más esporádicas"): con el roster de 100 (CANTIDAD_MUNDO,
// career.js) y la elite de 20 que sí genera noticia (TAMANO_ELITE, world.js)
// un solo bloque puede volcar 20+ sucesos de golpe al feed — la categoría
// entera "hablando" en la misma tanda, que se lee como ruido, no como
// noticias. Los de TÍTULO (cinturón ganado/perdido/vacante) SIEMPRE entran
// enteros: son puntuales (a lo sumo un par por bloque) y estructuralmente
// importantes — el jugador tiene que enterarse SIEMPRE de quién es el
// campeón, perder alguno rompería el relato del mundo. `retiro`/`debut`/
// `victoria`, que son el grueso real de la tanda, se recortan cada uno a un
// puñado (`LIMITES_SUCESOS_POR_BLOQUE`). La selección es DETERMINÍSTICA
// (orden estable por `hashTexto`, la misma función que ya elige la variante
// de cuerpo acá arriba) — nunca Math.random ni una tirada de más del rng
// compartido, que correría la secuencia de azar de toda la carrera.
const LIMITES_SUCESOS_POR_BLOQUE = { retiro: 3, debut: 3, victoria: 4 };

export function recortarSucesos(sucesos, limites = LIMITES_SUCESOS_POR_BLOQUE) {
  const porTipo = new Map();
  const sinLimite = [];

  for (const suceso of sucesos) {
    if (!(suceso.tipo in limites)) { sinLimite.push(suceso); continue; }
    const lista = porTipo.get(suceso.tipo) ?? [];
    lista.push(suceso);
    porTipo.set(suceso.tipo, lista);
  }

  const recortados = [];
  for (const [tipo, lista] of porTipo) {
    const tope = limites[tipo];
    recortados.push(...(lista.length <= tope
      ? lista
      : [...lista].sort((a, b) => hashTexto(a.texto) - hashTexto(b.texto)).slice(0, tope)));
  }

  return [...sinLimite, ...recortados];
}

// El cuerpo de estas noticias no usa `rng`: aunque la firma la recibe (por
// compatibilidad y porque en teoría podría necesitarla), consumir tiradas acá
// correría toda la secuencia de azar del resto de la carrera (avanzarMundo se
// llama en cada bloque, con varios sucesos cada vez) — el ritmo de la carrera
// está calibrado bloque a bloque contra esa secuencia (ver el comentario
// sobre ETAPAS en career.js). La variedad de cuerpos no necesita azar de
// verdad: alcanza con que no salga siempre la misma variante.
export function noticiasDeSucesos(rng, sucesos, { anio }) {
  return sucesos.map((suceso, indice) => {
    contador += 1;
    const tipo = MAPA_SUCESOS[suceso.tipo] ?? 'victoria';
    const variantesCuerpo = CUERPOS_SUCESO[tipo] ?? CUERPOS_SUCESO_GENERICO;
    const variante = (hashTexto(suceso.texto) + indice) % variantesCuerpo.length;
    return {
      id: `noticia_${contador}`,
      tipo,
      titular: suceso.texto,
      cuerpo: variantesCuerpo[variante],
      fecha: anio,
      nueva: true,
    };
  });
}

export function agregarNoticias(feed, nuevas, { maximo = 30 } = {}) {
  return [...nuevas, ...feed].slice(0, maximo);
}

/** Apaga la marca "nueva" de todo el feed (el jugador ya las vio). No muta el original. */
export function marcarLeidas(feed) {
  return feed.map((n) => (n.nueva ? { ...n, nueva: false } : n));
}

// Etiqueta legible para mostrar en el feed (panel-noticias.js): antes se
// mostraba n.tipo crudo ("victoria", "escandalo") tal cual el id interno.
const ETIQUETAS_TIPO = {
  victoria: 'Resultado',
  derrota: 'Resultado',
  titulo: 'Título',
  defensa: 'Título',
  titulo_perdido: 'Título',
  retiro: 'Retiro',
  lesion: 'Lesión',
  ranking: 'Ranking',
  sponsor: 'Sponsor',
  debut: 'Debut',
  escandalo: 'Escándalo',
  revancha: 'Rivalidad',
  revancha_ganada: 'Rivalidad',
  record: 'Récord',
};

export function etiquetaTipo(tipo) {
  return ETIQUETAS_TIPO[tipo] ?? 'Noticia';
}
