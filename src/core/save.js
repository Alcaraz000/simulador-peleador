import { ATRIBUTOS } from './stats.js';

// v13 (Bloque 1, simplificación y progresión): de seis atributos + cinco
// estados a cuatro atributos y nada más. A diferencia del cambio v1→v2 (que
// mantuvo VERSION_ESQUEMA fijo y se apoyó solo en un chequeo de forma, ver
// tieneEsquemaV2 más abajo), acá el número SÍ sube: los atributos de una
// partida vieja no significan lo mismo (50 de "potencia" no es comparable a
// 50 de "fuerza") y no hay ninguna cuenta razonable que los migre. Subir
// VERSION_ESQUEMA alcanza para tirar cualquier guardado real ya publicado
// (todos quedaron grabados con version:1) sin tocar nada más; el chequeo de
// forma de jugador.atributos (tieneAtributosVigentes, más abajo) es la
// misma red de seguridad de siempre, por si algún día el número vuelve a
// quedar fijo entre dos versiones.
//
// v18 (rankings por puntos): sube de nuevo, 2 -> 3, por exactamente el mismo
// motivo que la vez anterior. Los puntos de ranking (`puntosRanking`) se
// SIEMBRAN al crear el mundo (`crearRoster`, roster.js) y de ahí en más solo se
// mueven peleando: una partida guardada con el esquema 2 no los tiene en ningún
// peleador, ni en el jugador ni en los 180 del roster. Cargarla no explota,
// pero deja las cuatro tablas con todos en cero, ordenadas por el desempate de
// id — es decir, un ranking sin ningún sentido, que es peor que un error
// visible. Y no hay migración razonable: los puntos representan a quién
// enfrentó cada uno, y esa historia no existe en el guardado viejo.
export const VERSION_ESQUEMA = 3;
export const CLAVE_GUARDADO = 'simpeleador:save:v1';

function storagePorDefecto() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function serializar(partida) {
  return JSON.stringify({ ...partida, version: VERSION_ESQUEMA });
}

// VERSION_ESQUEMA no cambió entre la v1 (publicada) y la v2 (en desarrollo):
// una partida v1 guardada de verdad PASA el chequeo de `version` de arriba
// tal cual. Le faltan campos que el resto del juego v2 da por sentado que
// existen (`semanaGlobal` en la partida — calendario.js; `apellido` y
// `entrenador` en el jugador — panel-peleador.js/coach.js), y sin este
// chequeo cargarla no explota ACÁ sino más adelante, a mitad de partida, con
// una pantalla en blanco o una excepción. Se valida por PRESENCIA de la key,
// no por su contenido: `apellido` en v2 puede legítimamente valer `null`
// (crearPeleador la fija así si no se pasó un apellido), así que el punto no
// es "tiene apellido cargado", es "tiene la FORMA de v2".
function tieneEsquemaV2(datos) {
  const jugador = datos.jugador;
  return (
    typeof datos.semanaGlobal === 'number'
    && jugador !== null && typeof jugador === 'object'
    && Object.prototype.hasOwnProperty.call(jugador, 'apellido')
    && jugador.entrenador !== null && typeof jugador.entrenador === 'object'
  );
}

// v13: jugador.atributos tiene que traer EXACTAMENTE las cuatro claves
// vigentes (fuerza/defensa/cardio/agilidad), ni una más ni una menos. Una
// partida vieja (seis atributos: potencia/velocidad/tecnica/defensa/cardio/
// iq, más grappling) no matchea, y tampoco matchearía una a mitad de
// camino. No se valida el VALOR de cada atributo (con crearAtributos
// clampeado siempre va a ser un número sano) — solo la FORMA.
function tieneAtributosVigentes(datos) {
  const atributos = datos?.jugador?.atributos;
  if (!atributos || typeof atributos !== 'object') return false;
  const esperadas = [...ATRIBUTOS].sort();
  const recibidas = Object.keys(atributos).sort();
  return (
    esperadas.length === recibidas.length
    && esperadas.every((clave, indice) => clave === recibidas[indice])
  );
}

export function deserializar(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('Partida guardada inválida: no se pudo leer el JSON.');
  }
  if (!datos || typeof datos !== 'object') {
    throw new Error('Partida guardada inválida: formato inesperado.');
  }
  if (datos.version !== VERSION_ESQUEMA) {
    throw new Error(`Versión de guardado incompatible: ${datos.version}`);
  }
  if (!tieneEsquemaV2(datos) || !tieneAtributosVigentes(datos)) {
    throw new Error('Partida guardada de un esquema anterior: hace falta empezar una carrera nueva.');
  }
  return datos;
}

export function guardar(partida, storage = storagePorDefecto()) {
  if (!storage) return false;
  try {
    storage.setItem(CLAVE_GUARDADO, serializar(partida));
    return true;
  } catch {
    return false;
  }
}

export function cargar(storage = storagePorDefecto()) {
  if (!storage) return null;
  let texto;
  try {
    texto = storage.getItem(CLAVE_GUARDADO);
  } catch {
    return null;
  }
  if (!texto) return null;
  try {
    return deserializar(texto);
  } catch {
    borrar(storage);
    return null;
  }
}

export function borrar(storage = storagePorDefecto()) {
  if (!storage) return;
  try {
    storage.removeItem(CLAVE_GUARDADO);
  } catch {
    /* sin storage utilizable */
  }
}

export function haySlot(storage = storagePorDefecto()) {
  if (!storage) return false;
  try {
    return storage.getItem(CLAVE_GUARDADO) !== null;
  } catch {
    return false;
  }
}
