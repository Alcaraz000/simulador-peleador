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
const CUERPOS_SUCESO = {
  victoria: [
    'Otro resultado que reordena la conversación en la categoría.',
    'La noticia ya corre por los gimnasios rivales.',
    'Nada cambia el calendario, pero sí las apuestas de la próxima cartelera.',
  ],
  titulo: [
    'El cinturón cambia de manos y con él, la conversación de toda la categoría.',
    'Los promotores ya piensan en la próxima defensa.',
    'El vestuario todavía festeja: no todos los días se corona a alguien nuevo.',
  ],
  retiro: [
    'El anuncio deja un lugar vacío en el ranking que alguien va a pelear.',
    'Otro nombre que se despide del ring por la puerta grande.',
    'Los rumores venían de hace rato, pero la confirmación igual pega fuerte.',
  ],
  lesion: [
    'El parte médico no da mayores precisiones por ahora.',
    'El calendario de la categoría se reordena mientras dura la baja.',
    'El entorno pide paciencia y evitar apurar los tiempos de vuelta.',
  ],
  ranking: [
    'La tabla se sigue moviendo semana a semana.',
    'Un movimiento así no pasa desapercibido para los promotores.',
    'Arriba se respira distinto, y ya se nota en las ofertas que empiezan a llegar.',
  ],
  debut: [
    'Otra promesa que se suma a pelear por un lugar en la categoría.',
    'Todavía no lo conoce nadie, pero en el gimnasio ya hablan de él.',
    'La categoría nunca se queda quieta: siempre hay una cara nueva golpeando la puerta.',
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
