export const VERSION_ESQUEMA = 1;
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
  if (!tieneEsquemaV2(datos)) {
    throw new Error('Partida guardada de un esquema anterior (v1): hace falta empezar una carrera nueva.');
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
