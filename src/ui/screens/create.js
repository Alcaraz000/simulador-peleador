import { el, mount } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { crearTarjeta } from '../components/card.js';
import { abrirPopup } from '../components/popup.js';
import { CATEGORIAS, crearPeleador, repartirOrigenes } from '../../core/fighter.js';
import { repartirApodos } from '../../core/nicknames.js';
import { repartirEstilos } from '../../core/styles.js';
import { crearEntrenadorDe } from '../../core/coach.js';
import { DISCIPLINAS } from '../../core/disciplines.js';
import { NACIONALIDADES } from '../../content/names.js';
import { createRng } from '../../core/rng.js';
import { formatearMods } from '../../core/cards.js';

// Creación del peleador (v3): pedido del usuario después de jugar la v2 —
// nada de <select>s salvo nacionalidad (que sigue siendo un botón con popup
// de banderas). Mano hábil, disciplina y categoría son chips clickeables
// directos (mismo control visual que .creacion-control, pero uno por
// opción). Los 4 pasos están SIEMPRE montados desde el arranque: los que
// todavía no se pueden elegir se ven apagados (tarjeta:disabled), nunca se
// ocultan. Elegir algo habilita el paso siguiente; nada se deshabilita al
// elegir, así que el jugador puede volver a un paso ya resuelto y cambiar
// de idea en cualquier momento.
//
// v6 (rediseño integral, pedido textual: "que al seleccionar una opción no
// se 'refresque' la pantalla... que solo cambie el estado visual de lo que
// tocaste, sin volver a dibujar la pantalla"). Antes CUALQUIER click (mano
// hábil, un chip de categoría, una tarjeta de origen) llamaba a `pintar()`,
// que tiraba TODO el árbol de esta pantalla (los 4 paneles + el input de
// apellido) y lo reconstruía de cero — se notaba como un "parpadeo" de
// refresco (los `#app > .stack > *` reproducen su animación de entrada de
// nuevo, el input pierde cualquier estado propio del navegador, etc.), y era
// trabajo de sobra: elegir "Zurda" no necesita reconstruir el picker de
// nacionalidad ni las tarjetas de estilo.
//
// Ahora la pantalla se monta UNA sola vez (`construirVista`, al final de
// `renderCreacion`) y cada interacción hace el mínimo cambio real:
//   - Los grupos segmentados (mano/disciplina/categoría) solo alternan la
//     clase `elegida` entre sus propios botones (`actualizarSegmentoElegido`).
//   - Elegir una tarjeta de origen/apodo/estilo solo alterna `tarjeta-elegida`
//     entre las tarjetas DE ESE MISMO paso (`actualizarElegidaEnGrilla`).
//   - Nacionalidad reemplaza únicamente la bandera + el nombre dentro del
//     propio botón (`actualizarNacionalidad`).
//   - Recién cuando un paso pasa de bloqueado a habilitado por PRIMERA vez
//     hace falta reconstruir SU PROPIA grilla (2-3 tarjetas chicas, no toda
//     la pantalla): las tarjetas de `crearTarjeta` fijan `deshabilitada` en
//     el closure de su propio `onClick` al crearse, así que no alcanza con
//     tocarles el atributo `disabled` a mano — hay que crearlas de nuevo con
//     `deshabilitada:false`. Ese `pintar()` por paso (`pasoOrigenCtrl.pintar`,
//     etc.) se llama COMO MUCHO una vez por paso en toda la pantalla (cuando
//     se habilita), nunca en cada click posterior dentro de un paso ya
//     habilitado.

const MANOS = [
  { valor: 'derecha', texto: 'Derecha' },
  { valor: 'zurda', texto: 'Zurda' },
];

// Un ícono por opción, no uno solo repetido en toda la grilla (pedido
// textual: "que tengan iconos diferenciables"). Orígenes y estilos son
// catálogos chicos y fijos (9 y 8 ids), así que cada uno tiene su propio
// ícono pensado para lo que cuenta esa carta.
const ICONO_ORIGEN = {
  barrio: 'casa',
  club: 'guante',
  familia: 'corazon',
  tarde: 'reloj',
  amateur_de_toda_la_vida: 'trofeo',
  videos_viejos: 'monitor',
  sangre_importada: 'globo',
  becado_desde_pibe: 'estrella',
  sangre_de_campeon: 'corona',
};

const ICONO_ESTILO = {
  noqueador: 'rayo',
  tecnico: 'blanco',
  menton: 'escudo',
  contragolpeador: 'medidor',
  volante: 'viento',
  presionador: 'guante',
  zurdo_cruzado: 'cruce',
  rustico: 'peligro',
};

// Los apodos son un catálogo de 42 (content/nicknames.js): mapear uno por
// id a mano no rinde. En vez de eso, un hash determinístico (nunca
// Math.random) elige entre un puñado de íconos ya usados en otras partes del
// juego — mismo id siempre da el mismo ícono, y entre los 3 que se ofrecen a
// la vez lo normal es que no coincidan.
const POOL_ICONO_APODO = ['rayo', 'estrella', 'corazon', 'trofeo', 'alerta', 'guante', 'blanco', 'escudo'];

function iconoDeApodo(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return POOL_ICONO_APODO[hash % POOL_ICONO_APODO.length];
}

// Traduce los `mods` de un origen/apodo/estilo a las píldoras de efecto que
// espera crearTarjeta. A diferencia de main.js (efectosDeMods de los beats),
// acá no hay caso especial de fatiga: origen/apodo/estilo nunca la tocan.
function efectosDeMods(mods = {}) {
  return Object.entries(mods).map(([clave, valor]) => ({
    texto: formatearMods({ [clave]: valor })[0],
    signo: valor >= 0 ? 'positivo' : 'negativo',
  }));
}

function tituloPaso(numero, texto, bloqueado = false) {
  return el('div', { class: `paso-titulo${bloqueado ? ' paso-titulo-bloqueado' : ''}` }, [
    el('span', { class: 'etiqueta dorado', text: `PASO ${numero}` }),
    el('span', { class: 'etiqueta', text: ` · ${texto}` }),
  ]);
}

// Fila icono + control, ambos a la misma altura (46px, ver theme.css
// .creacion-control): el ícono es siempre un nodo ya armado (icono('mano')
// o, para nacionalidad, la bandera SVG real del país elegido — nunca un
// emoji de bandera). El "control" puede ser un input/botón único o un grupo
// de chips (.fila con varios botones adentro): en ambos casos ocupa el
// resto del ancho de la fila (ver .creacion-campo > *:not(svg) en theme.css).
function filaConIcono(iconoNodo, control) {
  return el('div', { class: 'creacion-campo' }, [iconoNodo, control]);
}

function opcionSegmento(valor, texto, elegida, onElegir) {
  return el('button', {
    type: 'button',
    dataset: { opcion: valor },
    class: `creacion-segmento${elegida ? ' elegida' : ''}`,
    'aria-pressed': elegida ? 'true' : 'false',
    text: texto,
    onClick: () => onElegir(valor),
  });
}

// Alterna la clase `elegida` (y su `aria-pressed`) entre los botones de un
// mismo grupo segmentado o una misma grilla de tarjetas, sin reconstruir
// ningún nodo — el cambio quirúrgico que reemplaza al `pintar()` de antes.
function actualizarSegmentoElegido(contenedor, valorElegido) {
  for (const boton of contenedor.querySelectorAll('[data-opcion]')) {
    const elegida = boton.dataset.opcion === valorElegido;
    boton.classList.toggle('elegida', elegida);
    boton.setAttribute('aria-pressed', elegida ? 'true' : 'false');
  }
}

function actualizarElegidaEnGrilla(grilla, idElegido) {
  for (const nodo of grilla.querySelectorAll('[data-opcion]')) {
    nodo.classList.toggle('tarjeta-elegida', nodo.dataset.opcion === idElegido);
  }
}

// Grupo de opciones para un campo del paso 1 (mano hábil, disciplina,
// categoría): un control "segmentado" (un solo borde compartido, sin gap
// entre opciones) en vez de una tarjeta suelta por opción. `onElegir` recibe
// el valor elegido; el propio grupo se encarga de resaltarlo (nunca hace
// falta pintar nada más para esto).
function grupoChips(campo, opciones, valorActual, onElegir, etiquetaAria) {
  const contenedor = el('div', {
    class: 'creacion-segmentado', dataset: { campo }, role: 'group', 'aria-label': etiquetaAria,
  }, opciones.map((op) => opcionSegmento(op.valor, op.texto, valorActual === op.valor, (v) => {
    onElegir(v);
    actualizarSegmentoElegido(contenedor, v);
  })));
  return contenedor;
}

// Construye (o reconstruye) el contenido de una grilla de tarjetas de un
// paso dado. Se llama UNA vez al armar la pantalla y, como mucho, una vez
// más cuando ese paso pasa de bloqueado a habilitado (ver el comentario
// largo al principio del archivo): las tarjetas de `crearTarjeta` fijan
// `deshabilitada` en el closure de su propio botón al crearse, así que
// habilitar el paso implica crearlas de nuevo, no tocarles el atributo a
// mano.
function pintarGrillaTarjetas(grilla, items, {
  onElegir, elegidoIdActual, iconoDe, deshabilitado,
}) {
  const nodos = items.map((item) => {
    const nodo = crearTarjeta({
      icono: icono(iconoDe(item), { tamano: 20 }),
      titulo: item.nombre,
      descripcion: item.descripcion,
      efectos: efectosDeMods(item.mods),
      rareza: item.rareza,
      deshabilitada: deshabilitado,
      onElegir: () => {
        onElegir(item.id);
        actualizarElegidaEnGrilla(grilla, item.id);
      },
    });
    nodo.dataset.opcion = item.id;
    if (elegidoIdActual() === item.id) nodo.classList.add('tarjeta-elegida');
    return nodo;
  });
  mount(grilla, ...nodos);
}

export function renderCreacion(contenedor, { onComenzar, rng = createRng(Date.now()) }) {
  // Los pools de tarjetas al azar se sortean UNA sola vez al entrar a la
  // creación (no en cada repintado, si no cambiarían de tarjeta cada vez
  // que el jugador toca otra cosa del paso 1).
  const origenesOfrecidos = repartirOrigenes(rng);
  const apodosOfrecidos = repartirApodos(rng);
  // Pedido v4: con el catálogo de estilos creciendo (8, ver styles.js), se
  // ofrecen solo 2 al azar (repartirEstilos, misma distribución 70/25/5 que
  // orígenes/apodos) — nunca los 8 fijos de siempre. Se sortea con la
  // disciplina por default porque `estilosDisponibles` es lo único que hoy
  // depende de disciplina, y el juego solo tiene 'boxeo'.
  const estilosOfrecidos = repartirEstilos(rng, Object.keys(DISCIPLINAS)[0]);

  const estado = {
    apellido: '',
    mano: 'derecha',
    disciplina: Object.keys(DISCIPLINAS)[0],
    nacionalidad: NACIONALIDADES[0].codigo,
    categoria: Object.keys(CATEGORIAS)[0],
    revelado: 1, // hasta qué paso se habilitó (1 a 4); nunca oculta pasos, solo los apaga
    origenId: null,
    apodoId: null,
    estiloId: null,
    error: '',
  };

  // Controles de los pasos 2/3/4 (`{ panel, pintar }`) y la raíz montada:
  // se asignan en `construirVista()`, pero los closures de abajo (elegir*)
  // ya los referencian por nombre — para cuando de verdad se llamen (un
  // click, siempre después de terminar de montar) ya van a estar asignados.
  let pasoOrigenCtrl;
  let pasoApodoCtrl;
  let pasoEstiloCtrl;
  let raiz;
  let botonComenzar = null;

  function validarApellido() {
    if (estado.apellido.trim()) { estado.error = ''; return true; }
    estado.error = 'Poné un apellido para empezar.';
    return false;
  }

  function elegirOrigen(id) {
    estado.origenId = id;
    if (estado.revelado < 3) {
      estado.revelado = 3;
      pasoApodoCtrl.pintar();
    }
  }

  function elegirApodo(id) {
    estado.apodoId = id;
    if (estado.revelado < 4) {
      estado.revelado = 4;
      pasoEstiloCtrl.pintar();
    }
  }

  function mostrarBotonComenzar() {
    // Se agrega al FINAL de la pantalla (pedido general "nada se mueve"):
    // sumar un botón nuevo al pie no empuja ni reacomoda nada de lo que ya
    // estaba arriba, así que no hace falta reservarle el lugar de antemano
    // como sí necesita "Siguiente" (que vive en medio del contenido).
    if (botonComenzar) return;
    botonComenzar = el('button', {
      class: 'boton', type: 'button', 'data-accion': 'comenzar', text: 'Empezar la carrera', onClick: comenzar,
    });
    raiz.appendChild(botonComenzar);
  }

  function elegirEstilo(id) {
    estado.estiloId = id;
    mostrarBotonComenzar();
  }

  function comenzar() {
    if (!validarApellido()) return;
    const peleador = crearPeleador({
      apellido: estado.apellido.trim(),
      apodoId: estado.apodoId,
      nacionalidad: estado.nacionalidad,
      disciplina: estado.disciplina,
      estilo: estado.estiloId,
      categoria: estado.categoria,
      origen: estado.origenId,
      mano: estado.mano,
      esJugador: true,
      media: 38,
    });
    onComenzar(peleador);
  }

  function pasoUno() {
    const campoApellido = el('input', {
      'data-campo': 'apellido', class: 'creacion-control', placeholder: 'Apellido',
    });
    campoApellido.value = estado.apellido;
    campoApellido.addEventListener('input', () => { estado.apellido = campoApellido.value; });

    const nombreNacionalidadNodo = el('span', {
      class: 'creacion-nacionalidad-nombre',
      text: NACIONALIDADES.find((n) => n.codigo === estado.nacionalidad)?.nombre ?? estado.nacionalidad,
    });
    const botonNacionalidad = el('button', {
      'data-campo': 'nacionalidad', type: 'button', class: 'creacion-control creacion-nacionalidad',
      onClick: () => abrirPickerNacionalidad(),
    }, [
      bandera(estado.nacionalidad, { ancho: 20 }),
      nombreNacionalidadNodo,
      icono('flecha', { tamano: 12, color: 'var(--texto-sutil)' }),
    ]);

    // Reemplaza SOLO la bandera (siempre el primer hijo del botón) y el
    // nombre — el botón entero no se reconstruye.
    function actualizarNacionalidad() {
      const paisElegido = NACIONALIDADES.find((n) => n.codigo === estado.nacionalidad);
      botonNacionalidad.replaceChild(bandera(estado.nacionalidad, { ancho: 20 }), botonNacionalidad.firstChild);
      nombreNacionalidadNodo.textContent = paisElegido?.nombre ?? estado.nacionalidad;
    }

    function abrirPickerNacionalidad() {
      const grilla = el('div', { class: 'popup-banderas-grilla' },
        NACIONALIDADES.map((n) => el('button', {
          type: 'button',
          'data-pais': n.codigo,
          class: `popup-bandera-boton${estado.nacionalidad === n.codigo ? ' elegida' : ''}`,
          onClick: () => {
            estado.nacionalidad = n.codigo;
            popup.cerrar();
            actualizarNacionalidad();
          },
        }, [
          bandera(n.codigo, { ancho: 34 }),
          el('div', { class: 'popup-bandera-nombre', text: n.nombre }),
        ])));

      const popup = abrirPopup({ titulo: 'Elegí tu nacionalidad', contenido: grilla });
    }

    const grupoMano = grupoChips('mano', MANOS, estado.mano, (v) => { estado.mano = v; }, 'Mano hábil');

    const grupoDisciplina = grupoChips(
      'disciplina',
      Object.values(DISCIPLINAS).map((d) => ({ valor: d.id, texto: d.nombre })),
      estado.disciplina,
      (v) => { estado.disciplina = v; },
      'Disciplina',
    );

    // Nombre corto en el chip (v4, verificación visual): "Peso pluma"/"Peso
    // mediano" completos comparten fila con disciplina y nacionalidad (3
    // columnas) y se truncaban a "Peso…" — el prefijo repetido en las dos
    // opciones no distinguía nada y encima se cortaba. El resto del juego
    // (cabecera del tablero, etc.) sigue mostrando el nombre completo desde
    // CATEGORIAS; esto es solo la etiqueta del chip.
    const grupoCategoria = grupoChips(
      'categoria',
      Object.values(CATEGORIAS).map((c) => {
        const corto = c.nombre.replace(/^Peso\s+/i, '');
        return { valor: c.id, texto: corto.charAt(0).toUpperCase() + corto.slice(1) };
      }),
      estado.categoria,
      (v) => { estado.categoria = v; },
      'Categoría',
    );

    // Espacio de error y botón "Siguiente" SIEMPRE montados (pedido general
    // del usuario, "todo quieto"): antes se sacaban del DOM por completo
    // (error: solo si había mensaje; botón: solo si `revelado < 2`), y como
    // los pasos 2 a 4 están siempre a la vista debajo de este panel (nunca
    // ocultos), sacar/poner cualquiera de los dos los empujaba hacia
    // arriba/abajo. Ahora el alto queda reservado siempre: el error usa
    // `.campo-error` (alto mínimo de una línea aunque esté vacío) y el botón
    // se apaga con `visibility:hidden` una vez que ya se avanzó de paso —
    // sigue ocupando su lugar, solo que invisible (clickearlo de nuevo no
    // hace nada raro: `siguiente()` es idempotente).
    const campoError = el('div', { class: 'rojo campo-error', 'data-error': '', text: estado.error });
    const botonSiguiente = el('button', {
      class: 'boton',
      type: 'button',
      'data-accion': 'siguiente',
      text: 'Siguiente',
      onClick: () => siguiente(),
      style: estado.revelado < 2 ? null : 'visibility:hidden',
    });

    function siguiente() {
      if (!validarApellido()) {
        campoError.textContent = estado.error;
        return;
      }
      campoError.textContent = '';
      if (estado.revelado < 2) {
        estado.revelado = 2;
        botonSiguiente.style.visibility = 'hidden';
        pasoOrigenCtrl.pintar();
      }
    }

    // Segunda vez que se reporta ("sigue sin parecerse al mockup"): el diseño
    // pide dos filas (`docs/superpowers/specs/2026-07-25-v2-diseno.md`),
    // apellido | mano hábil arriba y disciplina | nacionalidad | categoría
    // abajo — antes apellido y nacionalidad compartían la fila de arriba y
    // mano/disciplina/categoría bajaban cada uno solo, en una fila de ancho
    // completo propia (mucho más vertical de lo pedido).
    const filaDatos = el('div', { class: 'stack' }, [
      el('div', { class: 'fila', dataset: { fila: 'datos-superior' } }, [
        filaConIcono(icono('persona', { tamano: 16, color: 'var(--texto-sutil)' }), campoApellido),
        filaConIcono(icono('mano', { tamano: 16, color: 'var(--texto-sutil)' }), grupoMano),
      ]),
      // Categoría va SIN el ícono de balanza que llevaba antes (cuando tenía
      // la fila entera para ella sola): es el campo más apretado de esta
      // fila de 3 columnas (2 chips contra un solo control en disciplina y
      // nacionalidad) — sin el ícono, esos 24px extra evitan que "Mediano"
      // se trunque a "Medi…" (verificación visual, v4).
      el('div', { class: 'fila', dataset: { fila: 'datos-inferior' } }, [
        filaConIcono(icono('guante', { tamano: 16, color: 'var(--texto-sutil)' }), grupoDisciplina),
        botonNacionalidad,
        grupoCategoria,
      ]),
      campoError,
      botonSiguiente,
    ]);

    return el('div', { class: 'panel', dataset: { paso: '1' } }, [tituloPaso(1, 'TUS DATOS'), filaDatos]);
  }

  // 2 tarjetas: grilla de 2 columnas (no la de 3 de siempre) para que no
  // quede una tercera columna vacía y las dos opciones se vean centradas.
  function pasoOrigen() {
    const tituloNodo = tituloPaso(2, 'ORIGEN', estado.revelado < 2);
    const grilla = el('div', { class: 'panel-decision-grilla-2' });

    function pintar() {
      const bloqueado = estado.revelado < 2;
      tituloNodo.classList.toggle('paso-titulo-bloqueado', bloqueado);
      pintarGrillaTarjetas(grilla, origenesOfrecidos, {
        onElegir: elegirOrigen,
        elegidoIdActual: () => estado.origenId,
        iconoDe: (item) => ICONO_ORIGEN[item.id] ?? 'origen',
        deshabilitado: bloqueado,
      });
    }

    pintar();
    return { panel: el('div', { class: 'panel', dataset: { paso: '2' } }, [tituloNodo, grilla]), pintar };
  }

  function pasoApodo() {
    const tituloNodo = tituloPaso(3, 'APODO', estado.revelado < 3);
    const grilla = el('div', { class: 'panel-decision-grilla' });

    function pintar() {
      const bloqueado = estado.revelado < 3;
      tituloNodo.classList.toggle('paso-titulo-bloqueado', bloqueado);
      pintarGrillaTarjetas(grilla, apodosOfrecidos, {
        onElegir: elegirApodo,
        elegidoIdActual: () => estado.apodoId,
        iconoDe: (item) => iconoDeApodo(item.id),
        deshabilitado: bloqueado,
      });
    }

    pintar();
    return { panel: el('div', { class: 'panel', dataset: { paso: '3' } }, [tituloNodo, grilla]), pintar };
  }

  // v4: 2 estilos al azar (estilosOfrecidos, sorteados una sola vez arriba)
  // de un catálogo de 8: grilla de 2 columnas los centra en una sola fila.
  // Arma la descripción con el entrenador propio (no usa `pintarGrillaTarjetas`
  // genérico porque necesita ese texto compuesto por tarjeta).
  function pasoEstilo() {
    const tituloNodo = tituloPaso(4, 'ESTILO (Y ENTRENADOR)', estado.revelado < 4);
    const grilla = el('div', { class: 'panel-decision-grilla-2' });

    function pintar() {
      const bloqueado = estado.revelado < 4;
      tituloNodo.classList.toggle('paso-titulo-bloqueado', bloqueado);
      const nodos = estilosOfrecidos.map((e) => {
        const entrenador = crearEntrenadorDe(e.id);
        const descripcion = entrenador
          ? `${e.descripcion} Tu entrenador: ${entrenador.nombre} — "${entrenador.frase}"`
          : e.descripcion;
        const nodo = crearTarjeta({
          icono: icono(ICONO_ESTILO[e.id] ?? 'blanco', { tamano: 20 }),
          titulo: e.nombre,
          descripcion,
          efectos: efectosDeMods(e.mods),
          rareza: e.rareza,
          deshabilitada: bloqueado,
          onElegir: () => {
            elegirEstilo(e.id);
            actualizarElegidaEnGrilla(grilla, e.id);
          },
        });
        nodo.dataset.opcion = e.id;
        if (estado.estiloId === e.id) nodo.classList.add('tarjeta-elegida');
        return nodo;
      });
      mount(grilla, ...nodos);
    }

    pintar();
    return { panel: el('div', { class: 'panel', dataset: { paso: '4' } }, [tituloNodo, grilla]), pintar };
  }

  function construirVista() {
    // Los 4 módulos están siempre montados: los que todavía no se pueden
    // elegir se ven apagados (tarjeta:disabled + título gris), nunca
    // ocultos. Se arman UNA sola vez acá — de ahí en más, cada interacción
    // actualiza en el lugar (ver el comentario largo al principio del
    // archivo), nunca vuelve a llamar a esta función.
    const panelUno = pasoUno();
    pasoOrigenCtrl = pasoOrigen();
    pasoApodoCtrl = pasoApodo();
    pasoEstiloCtrl = pasoEstilo();

    raiz = el('div', { class: 'stack' }, [
      el('div', { class: 'etiqueta', text: 'Nueva carrera' }),
      el('h1', { text: 'Creá tu peleador' }),
      panelUno,
      pasoOrigenCtrl.panel,
      pasoApodoCtrl.panel,
      pasoEstiloCtrl.panel,
    ]);
    mount(contenedor, raiz);
  }

  construirVista();
}
