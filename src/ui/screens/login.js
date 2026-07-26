/**
 * ATENCIÓN — esto NO es seguridad real.
 *
 * Este juego es un sitio estático sin backend: todo lo que ves acá (incluido
 * este archivo) se descarga entero al navegador de quien entra. Cualquiera
 * que abra las herramientas de desarrollador puede leer el usuario y la
 * contraseña de acá abajo y pasar sin escribir nada. Esta pantalla es
 * solamente un portón para que la URL de prueba no quede totalmente abierta
 * a quien la encuentre de casualidad — no protege nada de verdad.
 *
 * Por eso la contraseña esperada se guarda en texto plano: "ofuscarla" con
 * un hash, base64 o cualquier otra vuelta no la haría más segura (el
 * navegador seguiría teniendo que comparar contra un valor que también está
 * en este mismo archivo, a la vista), solo la haría *parecer* protegida
 * cuando no lo está. Si algún día esto necesita ser seguro de verdad, hace
 * falta un backend que valide las credenciales del lado del servidor.
 */
import { el, mount } from '../dom.js';

const USUARIO_ESPERADO = 'gabriel';
const CLAVE_ESPERADA = 'boxeo2026';

export const CLAVE_ACCESO = 'simpeleador:acceso:v1';

function storagePorDefecto() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function hayAccesoGuardado(storage) {
  if (!storage) return false;
  try {
    return storage.getItem(CLAVE_ACCESO) === '1';
  } catch {
    return false;
  }
}

function guardarAcceso(storage) {
  if (!storage) return;
  try {
    storage.setItem(CLAVE_ACCESO, '1');
  } catch {
    /* sin storage utilizable: el usuario va a tener que loguearse de nuevo la próxima vez */
  }
}

export function renderLogin(contenedor, { onEntrar, storage = storagePorDefecto() } = {}) {
  if (hayAccesoGuardado(storage)) {
    onEntrar();
    return;
  }

  const usuario = el('input', {
    'data-campo': 'usuario', class: 'carta', placeholder: 'Usuario', autocomplete: 'username',
  });
  const clave = el('input', {
    'data-campo': 'clave', class: 'carta', type: 'password', placeholder: 'Contraseña', autocomplete: 'current-password',
  });
  // `.campo-error` reserva el alto de una línea desde el arranque (pedido
  // general "todo quieto"): sin esto, el div vacío mide 0px hasta el primer
  // intento fallido, y el botón "Entrar al ring" salta hacia abajo justo
  // cuando el jugador reintenta con la contraseña.
  const error = el('div', { 'data-error': '', class: 'rojo campo-error', text: '' });

  function intentarEntrar() {
    if (usuario.value.trim() === USUARIO_ESPERADO && clave.value === CLAVE_ESPERADA) {
      guardarAcceso(storage);
      error.textContent = '';
      onEntrar();
      return;
    }
    error.textContent = 'Usuario o contraseña incorrectos. Probá de nuevo.';
  }

  function alTeclear(ev) {
    if (ev.key === 'Enter') intentarEntrar();
  }
  usuario.addEventListener('keydown', alTeclear);
  clave.addEventListener('keydown', alTeclear);

  mount(contenedor, el('div', { class: 'stack pantalla-corta pantalla-login' }, [
    el('div', { class: 'stack login-hero' }, [
      el('div', { class: 'etiqueta', text: 'Versión de prueba' }),
      el('h1', { text: '🥊 Simulador de Carrera' }),
    ]),
    el('p', { class: 'medio', text: 'Entrená. Peleá. Dejá tu legado. Ingresá para subir al ring.' }),
    el('div', { class: 'panel stack' }, [
      el('label', { class: 'stack' }, [
        el('div', { class: 'etiqueta', text: 'Usuario' }),
        usuario,
      ]),
      el('label', { class: 'stack' }, [
        el('div', { class: 'etiqueta', text: 'Contraseña' }),
        clave,
      ]),
    ]),
    error,
    el('button', { class: 'boton', 'data-accion': 'entrar', text: 'Entrar al ring', onClick: intentarEntrar }),
  ]));
}
