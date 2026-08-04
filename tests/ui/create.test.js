import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderCreacion } from '../../src/ui/screens/create.js';
import { createRng } from '../../src/core/rng.js';
import { mediaDe } from '../../src/core/fighter.js';
import { NACIONALIDADES } from '../../src/content/names.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

function cargarCSS() {
  const CSS = readFileSync(join(process.cwd(), 'src/ui/theme.css'), 'utf-8');
  document.head.innerHTML = `<style>${CSS}</style>`;
}

function irAPaso1(overrides = {}) {
  let recibido = null;
  renderCreacion(cont, { onComenzar: (p) => { recibido = p; }, rng: createRng(1), ...overrides });
  return { obtenerRecibido: () => recibido };
}

function ponerApellido(apellido) {
  cont.querySelector('[data-campo="apellido"]').value = apellido;
  cont.querySelector('[data-campo="apellido"]').dispatchEvent(new Event('input'));
}

// Avanza los 4 pasos eligiendo siempre la primera tarjeta ofrecida en cada
// uno, y devuelve justo antes de clickear "Empezar la carrera".
function completarHastaEstilo(apellido = 'Ortiz') {
  ponerApellido(apellido);
  cont.querySelector('[data-accion="siguiente"]').click();

  cont.querySelector('[data-paso="2"] [data-opcion]').click();
  cont.querySelector('[data-paso="3"] [data-opcion]').click();
  cont.querySelector('[data-paso="4"] [data-opcion]').click();
}

describe('renderCreacion — Paso 1 (los datos)', () => {
  it('muestra el paso 1 con todos los campos', () => {
    irAPaso1();
    expect(cont.querySelector('[data-campo="apellido"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="mano"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="disciplina"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="nacionalidad"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="categoria"]')).toBeTruthy();
  });

  it('rotula el paso como "PASO 1"', () => {
    irAPaso1();
    expect(cont.textContent).toContain('PASO 1');
  });

  // Segunda vez que se reporta ("sigue sin parecerse al mockup"). El diseño
  // pide dos filas: apellido | mano hábil arriba; disciplina | nacionalidad |
  // categoría abajo — antes eran 4 filas verticales sueltas (apellido +
  // nacionalidad juntos arriba, mano/disciplina/categoría cada uno solo en
  // su propia fila de ancho completo debajo).
  it('fila superior: apellido y mano hábil van juntos, sin disciplina/nacionalidad/categoría', () => {
    irAPaso1();
    const filaSuperior = cont.querySelector('[data-fila="datos-superior"]');
    expect(filaSuperior).toBeTruthy();
    expect(filaSuperior.contains(cont.querySelector('[data-campo="apellido"]'))).toBe(true);
    expect(filaSuperior.contains(cont.querySelector('[data-campo="mano"]'))).toBe(true);
    expect(filaSuperior.contains(cont.querySelector('[data-campo="disciplina"]'))).toBe(false);
    expect(filaSuperior.contains(cont.querySelector('[data-campo="nacionalidad"]'))).toBe(false);
    expect(filaSuperior.contains(cont.querySelector('[data-campo="categoria"]'))).toBe(false);
  });

  it('fila inferior: disciplina, nacionalidad y categoría van juntas, sin apellido/mano', () => {
    irAPaso1();
    const filaInferior = cont.querySelector('[data-fila="datos-inferior"]');
    expect(filaInferior).toBeTruthy();
    expect(filaInferior.contains(cont.querySelector('[data-campo="disciplina"]'))).toBe(true);
    expect(filaInferior.contains(cont.querySelector('[data-campo="nacionalidad"]'))).toBe(true);
    expect(filaInferior.contains(cont.querySelector('[data-campo="categoria"]'))).toBe(true);
    expect(filaInferior.contains(cont.querySelector('[data-campo="apellido"]'))).toBe(false);
    expect(filaInferior.contains(cont.querySelector('[data-campo="mano"]'))).toBe(false);
  });

  it('la nacionalidad es un botón, no un <select> con emoji', () => {
    irAPaso1();
    const campo = cont.querySelector('[data-campo="nacionalidad"]');
    expect(campo.tagName).toBe('BUTTON');
    expect(campo.querySelector('svg.bandera-svg')).toBeTruthy();
    expect(campo.textContent).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  it('no hay ningún <select> en toda la pantalla de creación', () => {
    irAPaso1();
    expect(cont.querySelectorAll('select')).toHaveLength(0);
  });

  it('mano hábil se elige con botones (chips), no con un <select>: "Derecha" viene elegida por default', () => {
    irAPaso1();
    const grupo = cont.querySelector('[data-campo="mano"]');
    expect(grupo.tagName).not.toBe('SELECT');
    const opciones = grupo.querySelectorAll('[data-opcion]');
    expect(opciones).toHaveLength(2);
    expect(grupo.querySelector('[data-opcion="derecha"]').classList.contains('elegida')).toBe(true);
    expect(grupo.querySelector('[data-opcion="zurda"]').classList.contains('elegida')).toBe(false);
  });

  it('clickear "Zurda" cambia la elección de mano hábil', () => {
    irAPaso1();
    cont.querySelector('[data-campo="mano"] [data-opcion="zurda"]').click();
    expect(cont.querySelector('[data-campo="mano"] [data-opcion="zurda"]').classList.contains('elegida')).toBe(true);
    expect(cont.querySelector('[data-campo="mano"] [data-opcion="derecha"]').classList.contains('elegida')).toBe(false);
  });

  it('categoría se elige con chips: "Peso pluma" y "Peso mediano" como opciones directas', () => {
    irAPaso1();
    const grupo = cont.querySelector('[data-campo="categoria"]');
    expect(grupo.tagName).not.toBe('SELECT');
    expect(grupo.querySelector('[data-opcion="pluma"]')).toBeTruthy();
    expect(grupo.querySelector('[data-opcion="mediano"]')).toBeTruthy();
    cont.querySelector('[data-campo="categoria"] [data-opcion="mediano"]').click();
    expect(cont.querySelector('[data-campo="categoria"] [data-opcion="mediano"]').classList.contains('elegida')).toBe(true);
  });

  // Verificación visual (v4, grilla 3×3): con disciplina/nacionalidad/
  // categoría compartiendo una sola fila de 3 columnas, "Peso pluma"/"Peso
  // mediano" completos se truncaban a "Peso…" (el "Peso" repetido en las dos
  // opciones no ayudaba a distinguirlas, y encima se cortaba). El chip usa
  // el nombre corto ("Pluma"/"Mediano"); el peleador sigue guardando la
  // categoría completa (CATEGORIAS[...].nombre se sigue mostrando entero en
  // el resto del juego, p. ej. la cabecera del tablero).
  it('los chips de categoría usan el nombre corto (sin repetir "Peso"), para que entren en la fila de 3 columnas', () => {
    irAPaso1();
    const grupo = cont.querySelector('[data-campo="categoria"]');
    expect(grupo.querySelector('[data-opcion="pluma"]').textContent).toBe('Pluma');
    expect(grupo.querySelector('[data-opcion="mediano"]').textContent).toBe('Mediano');
  });

  // Categoría es el campo más apretado de la fila inferior (2 chips en 1/3
  // de la fila, contra un solo control en disciplina y nacionalidad): sin el
  // ícono de balanza que llevaba antes (cuando tenía la fila entera para él
  // solo), "Mediano" seguía truncándose a "Medi…" aun con el nombre corto.
  // Se saca el ícono acá puntualmente para devolverle ese espacio a los
  // chips — mano/disciplina siguen con el suyo, no hace falta un ícono en
  // cada campo para que la fila se lea bien.
  it('el campo de categoría no lleva ícono en la fila inferior (le da el espacio a los 2 chips)', () => {
    irAPaso1();
    const filaInferior = cont.querySelector('[data-fila="datos-inferior"]');
    const grupoCategoria = cont.querySelector('[data-campo="categoria"]');
    expect(grupoCategoria.parentElement).toBe(filaInferior);
  });

  it('disciplina se elige con chips, no con un <select>', () => {
    irAPaso1();
    const grupo = cont.querySelector('[data-campo="disciplina"]');
    expect(grupo.tagName).not.toBe('SELECT');
    expect(grupo.querySelector('[data-opcion="boxeo"]')).toBeTruthy();
    expect(grupo.querySelector('[data-opcion="boxeo"]').classList.contains('elegida')).toBe(true);
  });

  it('no deja avanzar sin apellido', () => {
    irAPaso1();
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(cont.querySelector('[data-error]').textContent.length).toBeGreaterThan(0);
  });

  it('con apellido, "Siguiente" rotula el paso 2 (ORIGEN)', () => {
    irAPaso1();
    ponerApellido('Sosa');
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(cont.querySelector('[data-paso="2"]')).toBeTruthy();
    expect(cont.textContent).toContain('PASO 2');
  });

  // Pedido general del usuario ("todo quieto"): los pasos 2 a 4 están
  // siempre montados debajo del paso 1 — si "Siguiente" desaparece del DOM
  // al usarlo, todo lo de abajo salta hacia arriba. El botón se apaga
  // (invisible) pero sigue reservando su lugar en vez de desaparecer.
  it('"Siguiente" sigue montado (oculto, no ausente) despues de avanzar', () => {
    irAPaso1();
    ponerApellido('Sosa');
    cont.querySelector('[data-accion="siguiente"]').click();

    const boton = cont.querySelector('[data-accion="siguiente"]');
    expect(boton).toBeTruthy();
    expect(boton.style.visibility).toBe('hidden');
  });

  it('la linea de error del paso 1 ya esta montada desde el arranque', () => {
    irAPaso1();
    const error = cont.querySelector('[data-error]');
    expect(error).toBeTruthy();
    expect(error.classList.contains('campo-error')).toBe(true);
    expect(error.textContent).toBe('');
  });

  it('todos los controles del paso 1 miden lo mismo (46px), incluidas las opciones en chip', () => {
    cargarCSS();
    irAPaso1();
    const controlesSimples = ['apellido', 'nacionalidad'].map((c) => cont.querySelector(`[data-campo="${c}"]`));
    const controlesChip = [...cont.querySelectorAll('[data-campo="mano"] [data-opcion], [data-campo="disciplina"] [data-opcion], [data-campo="categoria"] [data-opcion]')];
    for (const nodo of [...controlesSimples, ...controlesChip]) {
      expect(window.getComputedStyle(nodo).height).toBe('46px');
    }
  });
});

// v6 (rediseño integral, pedido textual: "que al seleccionar una opción no
// se 'refresque' la pantalla... que solo cambie el estado visual de lo que
// tocaste, sin volver a dibujar toda la pantalla"). Antes CUALQUIER click
// (un chip, una tarjeta) llamaba a un `pintar()` que tiraba TODO el árbol y
// lo reconstruía de cero — estas pruebas verifican por IDENTIDAD DE NODO
// (===, no solo que el contenido final se vea igual) que eso ya no pasa:
// guardan una referencia ANTES del click y comprueban que la MISMA
// instancia sigue en el DOM después (si hubiera un `mount()` de toda la
// pantalla, la referencia vieja quedaría huérfana, desconectada del documento).
describe('renderCreacion — nada se "refresca" al elegir una opción (identidad de nodo)', () => {
  it('elegir un chip de mano hábil no reconstruye la pantalla (el input de apellido y el h1 son el MISMO nodo)', () => {
    irAPaso1();
    const inputAntes = cont.querySelector('[data-campo="apellido"]');
    const h1Antes = cont.querySelector('h1');
    const panelUnoAntes = cont.querySelector('[data-paso="1"]');

    cont.querySelector('[data-campo="mano"] [data-opcion="zurda"]').click();

    expect(cont.querySelector('[data-campo="apellido"]')).toBe(inputAntes);
    expect(cont.querySelector('h1')).toBe(h1Antes);
    expect(cont.querySelector('[data-paso="1"]')).toBe(panelUnoAntes);
    // Y el cambio real sí se refleja: el chip clickeado queda marcado.
    expect(cont.querySelector('[data-campo="mano"] [data-opcion="zurda"]').classList.contains('elegida')).toBe(true);
  });

  it('elegir una tarjeta de origen no reconstruye la pantalla (las OTRAS tarjetas de ese mismo paso son el mismo nodo)', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();

    const tarjetasOrigenAntes = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    const inputAntes = cont.querySelector('[data-campo="apellido"]');

    tarjetasOrigenAntes[0].click();

    // La tarjeta clickeada sigue siendo la MISMA instancia (no se recreó a
    // sí misma para marcarse elegida) y su hermana en el paso también.
    const tarjetasOrigenDespues = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    expect(tarjetasOrigenDespues[0]).toBe(tarjetasOrigenAntes[0]);
    expect(tarjetasOrigenDespues[1]).toBe(tarjetasOrigenAntes[1]);
    expect(cont.querySelector('[data-campo="apellido"]')).toBe(inputAntes);
    expect(tarjetasOrigenDespues[0].classList.contains('tarjeta-elegida')).toBe(true);
  });

  it('elegir la nacionalidad no reconstruye la pantalla (el resto del paso 1 es el mismo nodo)', () => {
    irAPaso1();
    const inputAntes = cont.querySelector('[data-campo="apellido"]');
    const grupoManoAntes = cont.querySelector('[data-campo="mano"]');

    cont.querySelector('[data-campo="nacionalidad"]').click();
    document.querySelector('[data-pais="MX"]').click();

    expect(cont.querySelector('[data-campo="apellido"]')).toBe(inputAntes);
    expect(cont.querySelector('[data-campo="mano"]')).toBe(grupoManoAntes);
  });
});

describe('renderCreacion — el picker de nacionalidad (popup)', () => {
  // v18: el picker se arma desde NACIONALIDADES (de 6 a 12 países), así que la
  // cuenta sale de ahí en vez de estar escrita a mano.
  it('el botón de nacionalidad abre un popup con una bandera por país', () => {
    irAPaso1();
    cont.querySelector('[data-campo="nacionalidad"]').click();
    const grilla = document.querySelector('.popup-banderas-grilla');
    expect(grilla).toBeTruthy();
    const botones = grilla.querySelectorAll('.popup-bandera-boton');
    expect(botones).toHaveLength(NACIONALIDADES.length);
    for (const { codigo } of NACIONALIDADES) {
      expect(grilla.querySelector(`[data-pais="${codigo}"]`)).toBeTruthy();
    }
  });

  it('elegir una bandera del popup actualiza el botón y cierra el popup', () => {
    irAPaso1();
    cont.querySelector('[data-campo="nacionalidad"]').click();
    document.querySelector('[data-pais="MX"]').click();

    expect(document.querySelector('.popup-overlay')).toBeNull();
    expect(cont.querySelector('[data-campo="nacionalidad"]').textContent).toContain('México');
  });
});

describe('renderCreacion — los 4 pasos se ven completos desde el arranque', () => {
  it('los pasos 1 a 4 están todos en pantalla antes de elegir nada (nunca ocultos)', () => {
    irAPaso1();
    expect(cont.querySelector('[data-paso="1"]')).toBeTruthy();
    expect(cont.querySelector('[data-paso="2"]')).toBeTruthy();
    expect(cont.querySelector('[data-paso="3"]')).toBeTruthy();
    expect(cont.querySelector('[data-paso="4"]')).toBeTruthy();
    expect(cont.textContent).toContain('PASO 2');
    expect(cont.textContent).toContain('PASO 3');
    expect(cont.textContent).toContain('PASO 4');
  });

  it('antes de completar el paso 1, las tarjetas de origen (paso 2) ofrecen 2 opciones pero están deshabilitadas', () => {
    irAPaso1();
    const tarjetas = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    expect(tarjetas).toHaveLength(2);
    for (const t of tarjetas) expect(t.disabled).toBe(true);
  });

  it('antes de completar el paso 1, apodo (paso 3) y estilo (paso 4) también están deshabilitados', () => {
    irAPaso1();
    for (const t of cont.querySelectorAll('[data-paso="3"] [data-opcion]')) expect(t.disabled).toBe(true);
    for (const t of cont.querySelectorAll('[data-paso="4"] [data-opcion]')) expect(t.disabled).toBe(true);
  });

  it('clickear una tarjeta deshabilitada de origen no hace nada (sigue en paso 1)', () => {
    irAPaso1();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();
    expect(cont.querySelector('[data-paso="2"] [data-opcion]').classList.contains('tarjeta-elegida')).toBe(false);
  });

  it('completar el paso 1 habilita el origen (paso 2), pero apodo y estilo siguen apagados', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();

    for (const t of cont.querySelectorAll('[data-paso="2"] [data-opcion]')) expect(t.disabled).toBe(false);
    for (const t of cont.querySelectorAll('[data-paso="3"] [data-opcion]')) expect(t.disabled).toBe(true);
    for (const t of cont.querySelectorAll('[data-paso="4"] [data-opcion]')) expect(t.disabled).toBe(true);
  });

  it('elegir un origen habilita el apodo (paso 3) con 3 tarjetas, y estilo sigue apagado', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();

    expect(cont.querySelectorAll('[data-paso="3"] [data-opcion]')).toHaveLength(3);
    for (const t of cont.querySelectorAll('[data-paso="3"] [data-opcion]')) expect(t.disabled).toBe(false);
    for (const t of cont.querySelectorAll('[data-paso="4"] [data-opcion]')) expect(t.disabled).toBe(true);
  });

  it('elegir un apodo habilita el estilo (paso 4), con el entrenador de cada estilo', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();

    const tarjetasEstilo = cont.querySelectorAll('[data-paso="4"] [data-opcion]');
    expect(tarjetasEstilo.length).toBeGreaterThan(0);
    for (const t of tarjetasEstilo) expect(t.disabled).toBe(false);
    // Cada estilo trae su entrenador: nombre y frase visibles en la tarjeta.
    expect(cont.querySelector('[data-paso="4"]').textContent).toContain('Tu entrenador');
  });

  it('no hay botón de "Empezar la carrera" hasta elegir un estilo', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();
    cont.querySelector('[data-paso="2"] [data-opcion]').click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();
    expect(cont.querySelector('[data-accion="comenzar"]')).toBeNull();

    cont.querySelector('[data-paso="4"] [data-opcion]').click();
    expect(cont.querySelector('[data-accion="comenzar"]')).toBeTruthy();
  });
});

describe('renderCreacion — grillas: sin huecos, sin apilarse mal', () => {
  it('el paso 2 (origen, 2 tarjetas) usa una grilla de 2 columnas', () => {
    irAPaso1();
    const grilla = cont.querySelector('[data-paso="2"] .panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    expect(grilla.querySelectorAll('[data-opcion]')).toHaveLength(2);
  });

  it('el paso 3 (apodo, 3 tarjetas) usa la grilla de 3 columnas de siempre', () => {
    irAPaso1();
    const grilla = cont.querySelector('[data-paso="3"] .panel-decision-grilla');
    expect(grilla).toBeTruthy();
    expect(grilla.classList.contains('panel-decision-grilla-2')).toBe(false);
    expect(grilla.querySelectorAll('[data-opcion]')).toHaveLength(3);
  });

  it('el paso 4 (estilo) ofrece exactamente 2 tarjetas al azar (de un catálogo de 8), en una grilla de 2 columnas', () => {
    irAPaso1();
    const grilla = cont.querySelector('[data-paso="4"] .panel-decision-grilla-2');
    expect(grilla).toBeTruthy();
    expect(grilla.querySelectorAll('[data-opcion]')).toHaveLength(2);
  });
});

describe('renderCreacion — tamaño fijo de tarjeta (título y descripción no deforman la grilla)', () => {
  it('título y descripción miden siempre lo mismo aunque el texto sea más corto o más largo', () => {
    cargarCSS();
    irAPaso1();
    const tarjetas = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);
    const alturasTitulo = tarjetas.map((t) => window.getComputedStyle(t.querySelector('.tarjeta-titulo')).height);
    const alturasDesc = tarjetas.map((t) => window.getComputedStyle(t.querySelector('.tarjeta-desc')).height);
    expect(new Set(alturasTitulo).size).toBe(1);
    expect(new Set(alturasDesc).size).toBe(1);
  });
});

describe('renderCreacion — se puede volver atrás a un paso ya resuelto', () => {
  it('elegir otra tarjeta de origen ya revelado cambia la elección sin romper el paso 3/4', () => {
    irAPaso1();
    ponerApellido('Ortiz');
    cont.querySelector('[data-accion="siguiente"]').click();

    const opcionesOrigen = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')];
    opcionesOrigen[0].click();
    cont.querySelector('[data-paso="3"] [data-opcion]').click();
    cont.querySelector('[data-paso="4"] [data-opcion]').click();

    // El jugador se arrepiente y vuelve a tocar el otro origen: el paso 2
    // sigue interactivo (no se deshabilitó al elegir) y los pasos 3/4 no
    // desaparecen ni vuelven a apagarse. Cada click re-pinta todo el árbol
    // (mismo patrón que el resto de las pantallas), así que hay que volver a
    // buscar los nodos después de cada click en vez de guardar la referencia
    // vieja.
    const idOriginal = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')][0].dataset.opcion;
    const idOtra = [...cont.querySelectorAll('[data-paso="2"] [data-opcion]')][1].dataset.opcion;
    cont.querySelectorAll('[data-paso="2"] [data-opcion]')[1].click();

    expect(cont.querySelector('[data-paso="3"]')).toBeTruthy();
    expect(cont.querySelector('[data-paso="4"]')).toBeTruthy();
    const otraOpcionDeNuevo = cont.querySelector(`[data-paso="2"] [data-opcion="${idOtra}"]`);
    const primeraDeNuevo = cont.querySelector(`[data-paso="2"] [data-opcion="${idOriginal}"]`);
    expect(otraOpcionDeNuevo.classList.contains('tarjeta-elegida')).toBe(true);
    expect(primeraDeNuevo.classList.contains('tarjeta-elegida')).toBe(false);
    expect(cont.querySelector('[data-paso="3"] [data-opcion]').disabled).toBe(false);
    expect(cont.querySelector('[data-paso="4"] [data-opcion]').disabled).toBe(false);
  });

  it('se puede volver a tocar mano hábil o categoría en el paso 1 y el cambio se refleja en el peleador final', () => {
    const { obtenerRecibido } = irAPaso1();
    cont.querySelector('[data-campo="mano"] [data-opcion="zurda"]').click();
    cont.querySelector('[data-campo="categoria"] [data-opcion="mediano"]').click();
    completarHastaEstilo('Ortiz');
    cont.querySelector('[data-accion="comenzar"]').click();

    const recibido = obtenerRecibido();
    expect(recibido.mano).toBe('zurda');
    expect(recibido.categoria).toBe('mediano');
  });
});

describe('renderCreacion — el resultado', () => {
  it('entrega un peleador válido al completar los 4 pasos', () => {
    const { obtenerRecibido } = irAPaso1();
    completarHastaEstilo('Ortiz');
    cont.querySelector('[data-accion="comenzar"]').click();

    const recibido = obtenerRecibido();
    expect(recibido).toBeTruthy();
    expect(recibido.apellido).toBe('Ortiz');
    expect(recibido.nombre).toBe('Ortiz');
    expect(recibido.apodo).toBeTruthy();
    expect(recibido.origen).toBeTruthy();
    expect(recibido.estilo).toBeTruthy();
    expect(recibido.entrenador).toBeTruthy();
    expect(recibido.esJugador).toBe(true);
    expect(recibido.edad).toBe(15);
    expect(mediaDe(recibido)).toBeGreaterThan(0);
  });

  it('recorta espacios del apellido', () => {
    const { obtenerRecibido } = irAPaso1();
    completarHastaEstilo('  Vera  ');
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(obtenerRecibido().apellido).toBe('Vera');
  });
});
