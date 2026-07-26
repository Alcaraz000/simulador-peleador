import { describe, it, expect, beforeEach } from 'vitest';
import { renderLogin, CLAVE_ACCESO } from '../../src/ui/screens/login.js';

function storageFalso() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    _datos: datos,
  };
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderLogin', () => {
  it('muestra los campos de usuario y contraseña', () => {
    renderLogin(cont, { onEntrar: () => {}, storage: storageFalso() });
    expect(cont.querySelector('[data-campo="usuario"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="clave"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="clave"]').type).toBe('password');
  });

  it('con credenciales correctas llama a onEntrar', () => {
    let llamado = false;
    renderLogin(cont, { onEntrar: () => { llamado = true; }, storage: storageFalso() });
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    cont.querySelector('[data-accion="entrar"]').click();
    expect(llamado).toBe(true);
  });

  it('con credenciales incorrectas no llama a onEntrar y muestra un error visible', () => {
    let llamado = false;
    renderLogin(cont, { onEntrar: () => { llamado = true; }, storage: storageFalso() });
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'mal';
    cont.querySelector('[data-accion="entrar"]').click();
    expect(llamado).toBe(false);
    expect(cont.querySelector('[data-error]').textContent.length).toBeGreaterThan(0);
  });

  it('no llama a onEntrar si el usuario es correcto pero la contraseña no', () => {
    let llamado = false;
    renderLogin(cont, { onEntrar: () => { llamado = true; }, storage: storageFalso() });
    cont.querySelector('[data-campo="usuario"]').value = 'otro';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    cont.querySelector('[data-accion="entrar"]').click();
    expect(llamado).toBe(false);
  });

  // Pedido general del usuario ("todo quieto"): el botón "Entrar al ring" no
  // puede saltar de lugar cuando aparece el mensaje de error. La línea de
  // error ya está montada (con su alto reservado) ANTES del primer intento,
  // no recién cuando falla.
  it('la linea de error ya esta montada desde el arranque, con el alto reservado', () => {
    renderLogin(cont, { onEntrar: () => {}, storage: storageFalso() });
    const error = cont.querySelector('[data-error]');
    expect(error).toBeTruthy();
    expect(error.classList.contains('campo-error')).toBe(true);
    expect(error.textContent).toBe('');
  });

  it('el acceso queda recordado y al volver a montar ya no pide login', () => {
    const storage = storageFalso();
    renderLogin(cont, { onEntrar: () => {}, storage });
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    cont.querySelector('[data-accion="entrar"]').click();
    expect(storage._datos.get(CLAVE_ACCESO)).toBe('1');

    document.body.innerHTML = '<div id="app"></div>';
    cont = document.getElementById('app');
    let llamado = false;
    renderLogin(cont, { onEntrar: () => { llamado = true; }, storage });
    expect(llamado).toBe(true);
    expect(cont.querySelector('[data-campo="usuario"]')).toBeFalsy();
  });

  it('funciona sin storage (undefined): pide login y no explota al entrar', () => {
    let llamado = false;
    expect(() => {
      renderLogin(cont, { onEntrar: () => { llamado = true; }, storage: null });
    }).not.toThrow();
    expect(cont.querySelector('[data-campo="usuario"]')).toBeTruthy();
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    expect(() => cont.querySelector('[data-accion="entrar"]').click()).not.toThrow();
    expect(llamado).toBe(true);
  });

  it('funciona si el storage tira error al leer o escribir', () => {
    const roto = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('cuota'); },
      removeItem: () => {},
    };
    let llamado = false;
    expect(() => {
      renderLogin(cont, { onEntrar: () => { llamado = true; }, storage: roto });
    }).not.toThrow();
    expect(cont.querySelector('[data-campo="usuario"]')).toBeTruthy();
    cont.querySelector('[data-campo="usuario"]').value = 'gabriel';
    cont.querySelector('[data-campo="clave"]').value = 'boxeo2026';
    expect(() => cont.querySelector('[data-accion="entrar"]').click()).not.toThrow();
    expect(llamado).toBe(true);
  });
});
