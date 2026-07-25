import { PLANTILLAS } from '../content/news-templates.js';

let contador = 0;

export function generarNoticia(rng, { tipo, datos = {}, fecha = 0 }) {
  const variantes = PLANTILLAS[tipo];
  if (!variantes) throw new Error(`Tipo de noticia desconocido: ${tipo}`);

  const plantilla = rng.pick(variantes);
  const titular = plantilla.replace(/\{(\w+)\}/g, (_, clave) => {
    const valor = datos[clave];
    if (valor === undefined || valor === null || valor === '') {
      throw new Error(`Falta el marcador "${clave}" para una noticia de tipo ${tipo}`);
    }
    return String(valor);
  });

  contador += 1;
  return { id: `noticia_${contador}`, tipo, titular, fecha };
}

const MAPA_SUCESOS = {
  victoria: 'victoria',
  titulo: 'titulo',
  retiro: 'retiro',
  lesion: 'lesion',
  ascenso: 'ranking',
};

export function noticiasDeSucesos(rng, sucesos, { anio }) {
  return sucesos.map((suceso) => {
    contador += 1;
    return {
      id: `noticia_${contador}`,
      tipo: MAPA_SUCESOS[suceso.tipo] ?? 'victoria',
      titular: suceso.texto,
      fecha: anio,
    };
  });
}

export function agregarNoticias(feed, nuevas, { maximo = 30 } = {}) {
  return [...nuevas, ...feed].slice(0, maximo);
}

// Etiqueta legible para mostrar en el feed (ui/screens/news.js): antes se
// mostraba n.tipo crudo ("victoria", "escandalo") tal cual el id interno.
const ETIQUETAS_TIPO = {
  victoria: 'Resultado',
  derrota: 'Resultado',
  titulo: 'Título',
  defensa: 'Título',
  retiro: 'Retiro',
  lesion: 'Lesión',
  ranking: 'Ranking',
  sponsor: 'Sponsor',
  escandalo: 'Escándalo',
  revancha: 'Rivalidad',
  record: 'Récord',
};

export function etiquetaTipo(tipo) {
  return ETIQUETAS_TIPO[tipo] ?? 'Noticia';
}
