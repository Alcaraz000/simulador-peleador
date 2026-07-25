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
