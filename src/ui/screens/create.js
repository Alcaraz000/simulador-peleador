import { el, mount } from '../dom.js';
import { icono } from '../icons.js';
import { bandera } from '../flags.js';
import { crearTarjeta } from '../components/card.js';
import { abrirPopup } from '../components/popup.js';
import { CATEGORIAS, crearPeleador, repartirOrigenes } from '../../core/fighter.js';
import { repartirApodos } from '../../core/nicknames.js';
import { estilosDisponibles } from '../../core/styles.js';
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

const MANOS = [
  { valor: 'derecha', texto: 'Derecha' },
  { valor: 'zurda', texto: 'Zurda' },
];

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

// Grupo de opciones en chip para un campo del paso 1 (mano hábil, disciplina,
// categoría): un botón por valor posible, todo a la vista, sin desplegable.
function opcionChip(valor, texto, elegida, onElegir) {
  return el('button', {
    type: 'button',
    dataset: { opcion: valor },
    class: `creacion-control creacion-chip${elegida ? ' elegida' : ''}`,
    'aria-pressed': elegida ? 'true' : 'false',
    text: texto,
    onClick: () => onElegir(valor),
  });
}

function grupoChips(campo, opciones, valorActual, onElegir) {
  return el('div', { class: 'fila', dataset: { campo } },
    opciones.map((op) => opcionChip(op.valor, op.texto, valorActual === op.valor, onElegir)));
}

export function renderCreacion(contenedor, { onComenzar, rng = createRng(Date.now()) }) {
  // Los pools de tarjetas al azar se sortean UNA sola vez al entrar a la
  // creación (no en cada repintado, si no cambiarían de tarjeta cada vez
  // que el jugador toca otra cosa del paso 1).
  const origenesOfrecidos = repartirOrigenes(rng);
  const apodosOfrecidos = repartirApodos(rng);

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

  function pintar() { mount(contenedor, vista()); }

  function validarApellido() {
    if (estado.apellido.trim()) { estado.error = ''; return true; }
    estado.error = 'Poné un apellido para empezar.';
    return false;
  }

  function siguiente() {
    if (!validarApellido()) { pintar(); return; }
    estado.revelado = Math.max(estado.revelado, 2);
    pintar();
  }

  function elegirOrigen(id) {
    estado.origenId = id;
    estado.revelado = Math.max(estado.revelado, 3);
    pintar();
  }

  function elegirApodo(id) {
    estado.apodoId = id;
    estado.revelado = Math.max(estado.revelado, 4);
    pintar();
  }

  function elegirEstilo(id) {
    estado.estiloId = id;
    pintar();
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
          pintar();
        },
      }, [
        bandera(n.codigo, { ancho: 34 }),
        el('div', { class: 'popup-bandera-nombre', text: n.nombre }),
      ])));

    const popup = abrirPopup({ titulo: 'Elegí tu nacionalidad', contenido: grilla });
  }

  function comenzar() {
    if (!validarApellido()) { pintar(); return; }
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

    const paisElegido = NACIONALIDADES.find((n) => n.codigo === estado.nacionalidad);
    const botonNacionalidad = el('button', {
      'data-campo': 'nacionalidad', type: 'button', class: 'creacion-control creacion-nacionalidad',
      onClick: abrirPickerNacionalidad,
    }, [
      bandera(estado.nacionalidad, { ancho: 20 }),
      el('span', { class: 'creacion-nacionalidad-nombre', text: paisElegido?.nombre ?? estado.nacionalidad }),
      icono('flecha', { tamano: 12, color: 'var(--texto-sutil)' }),
    ]);

    const grupoMano = grupoChips('mano', MANOS, estado.mano, (v) => { estado.mano = v; pintar(); });

    const grupoDisciplina = grupoChips(
      'disciplina',
      Object.values(DISCIPLINAS).map((d) => ({ valor: d.id, texto: d.nombre })),
      estado.disciplina,
      (v) => { estado.disciplina = v; pintar(); },
    );

    const grupoCategoria = grupoChips(
      'categoria',
      Object.values(CATEGORIAS).map((c) => ({ valor: c.id, texto: c.nombre })),
      estado.categoria,
      (v) => { estado.categoria = v; pintar(); },
    );

    const filaDatos = el('div', { class: 'stack' }, [
      el('div', { class: 'fila' }, [
        filaConIcono(icono('persona', { tamano: 16, color: 'var(--texto-sutil)' }), campoApellido),
        botonNacionalidad,
      ]),
      filaConIcono(icono('mano', { tamano: 16, color: 'var(--texto-sutil)' }), grupoMano),
      filaConIcono(icono('guante', { tamano: 16, color: 'var(--texto-sutil)' }), grupoDisciplina),
      filaConIcono(icono('balanza', { tamano: 16, color: 'var(--texto-sutil)' }), grupoCategoria),
      estado.error ? el('div', { class: 'rojo', 'data-error': '', text: estado.error }) : null,
      estado.revelado < 2
        ? el('button', {
          class: 'boton', type: 'button', 'data-accion': 'siguiente', text: 'Siguiente', onClick: siguiente,
        })
        : null,
    ]);

    return el('div', { class: 'panel', dataset: { paso: '1' } }, [tituloPaso(1, 'TUS DATOS'), filaDatos]);
  }

  function grillaTarjetas(items, {
    onElegir, elegidoId, iconoNombre, deshabilitado, claseGrilla = 'panel-decision-grilla',
  }) {
    return el('div', { class: claseGrilla }, items.map((item) => {
      const nodo = crearTarjeta({
        icono: icono(iconoNombre, { tamano: 20 }),
        titulo: item.nombre,
        descripcion: item.descripcion,
        efectos: efectosDeMods(item.mods),
        rareza: item.rareza,
        deshabilitada: deshabilitado,
        onElegir: () => onElegir(item.id),
      });
      nodo.dataset.opcion = item.id;
      if (elegidoId === item.id) nodo.classList.add('tarjeta-elegida');
      return nodo;
    }));
  }

  function pasoOrigen() {
    const bloqueado = estado.revelado < 2;
    // 2 tarjetas: grilla de 2 columnas (no la de 3 de siempre) para que no
    // quede una tercera columna vacía y las dos opciones se vean centradas.
    const grilla = grillaTarjetas(origenesOfrecidos, {
      onElegir: elegirOrigen,
      elegidoId: estado.origenId,
      iconoNombre: 'origen',
      deshabilitado: bloqueado,
      claseGrilla: 'panel-decision-grilla-2',
    });
    return el('div', { class: 'panel', dataset: { paso: '2' } }, [tituloPaso(2, 'ORIGEN', bloqueado), grilla]);
  }

  function pasoApodo() {
    const bloqueado = estado.revelado < 3;
    const grilla = grillaTarjetas(apodosOfrecidos, {
      onElegir: elegirApodo, elegidoId: estado.apodoId, iconoNombre: 'etiqueta', deshabilitado: bloqueado,
    });
    return el('div', { class: 'panel', dataset: { paso: '3' } }, [tituloPaso(3, 'APODO', bloqueado), grilla]);
  }

  function pasoEstilo() {
    const bloqueado = estado.revelado < 4;
    const estilos = estilosDisponibles(estado.disciplina);
    // Siempre 4 estilos (noqueador/técnico/mentón/contragolpeador): grilla
    // de 2 columnas arma un 2×2 prolijo en vez de 3 arriba + 1 sola abajo.
    const grilla = el('div', { class: 'panel-decision-grilla-2' }, estilos.map((e) => {
      const entrenador = crearEntrenadorDe(e.id);
      const descripcion = entrenador
        ? `${e.descripcion} Tu entrenador: ${entrenador.nombre} — "${entrenador.frase}"`
        : e.descripcion;
      const nodo = crearTarjeta({
        icono: icono('blanco', { tamano: 20 }),
        titulo: e.nombre,
        descripcion,
        efectos: efectosDeMods(e.mods),
        rareza: e.rareza,
        deshabilitada: bloqueado,
        onElegir: () => elegirEstilo(e.id),
      });
      nodo.dataset.opcion = e.id;
      if (estado.estiloId === e.id) nodo.classList.add('tarjeta-elegida');
      return nodo;
    }));
    return el('div', { class: 'panel', dataset: { paso: '4' } }, [tituloPaso(4, 'ESTILO (Y ENTRENADOR)', bloqueado), grilla]);
  }

  function vista() {
    // Los 4 módulos están siempre montados: los que todavía no se pueden
    // elegir se ven apagados (tarjeta:disabled + título gris), nunca ocultos.
    const pasos = [pasoUno(), pasoOrigen(), pasoApodo(), pasoEstilo()];
    if (estado.estiloId) {
      pasos.push(el('button', {
        class: 'boton', type: 'button', 'data-accion': 'comenzar', text: 'Empezar la carrera', onClick: comenzar,
      }));
    }
    return el('div', { class: 'stack' }, [
      el('div', { class: 'etiqueta', text: 'Nueva carrera' }),
      el('h1', { text: 'Creá tu peleador' }),
      ...pasos,
    ]);
  }

  pintar();
}
