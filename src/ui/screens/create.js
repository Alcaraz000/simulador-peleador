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

// Creación del peleador (Task 5.3): ya no es un formulario seco de <select>s
// de una sola pantalla — es una tirada de tarjetas que se revuelve de a un
// paso. Paso 1 son los datos (dos filas, todos los controles a 46px); pasos
// 2/3/4 son origen, apodo y estilo, cada uno con 2-4 tarjetas al azar (ver
// repartirOrigenes/repartirApodos en el core). Nada se deshabilita al
// elegir: el jugador puede volver a un paso ya resuelto y cambiar de idea.

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

function tituloPaso(numero, texto) {
  return el('div', { class: 'paso-titulo' }, [
    el('span', { class: 'etiqueta dorado', text: `PASO ${numero}` }),
    el('span', { class: 'etiqueta', text: ` · ${texto}` }),
  ]);
}

// Fila icono + control, ambos a la misma altura (46px, ver theme.css
// .creacion-control): el ícono es siempre un nodo ya armado (icono('mano')
// o, para nacionalidad, la bandera SVG real del país elegido — nunca un
// emoji de bandera).
function filaConIcono(iconoNodo, control) {
  return el('div', { class: 'creacion-campo' }, [iconoNodo, control]);
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
    revelado: 1, // hasta qué paso se reveló (1 a 4)
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

    const campoMano = el('select', { 'data-campo': 'mano', class: 'creacion-control' },
      MANOS.map((m) => el('option', { value: m.valor, text: m.texto })));
    campoMano.value = estado.mano;
    campoMano.addEventListener('change', () => { estado.mano = campoMano.value; });

    const campoDisciplina = el('select', { 'data-campo': 'disciplina', class: 'creacion-control' },
      Object.values(DISCIPLINAS).map((d) => el('option', { value: d.id, text: d.nombre })));
    campoDisciplina.value = estado.disciplina;
    campoDisciplina.addEventListener('change', () => {
      estado.disciplina = campoDisciplina.value;
      pintar();
    });

    const campoCategoria = el('select', { 'data-campo': 'categoria', class: 'creacion-control' },
      Object.values(CATEGORIAS).map((c) => el('option', { value: c.id, text: c.nombre })));
    campoCategoria.value = estado.categoria;
    campoCategoria.addEventListener('change', () => { estado.categoria = campoCategoria.value; });

    const paisElegido = NACIONALIDADES.find((n) => n.codigo === estado.nacionalidad);
    const botonNacionalidad = el('button', {
      'data-campo': 'nacionalidad', type: 'button', class: 'creacion-control creacion-nacionalidad',
      onClick: abrirPickerNacionalidad,
    }, [
      bandera(estado.nacionalidad, { ancho: 20 }),
      el('span', { class: 'creacion-nacionalidad-nombre', text: paisElegido?.nombre ?? estado.nacionalidad }),
      icono('flecha', { tamano: 12, color: 'var(--texto-sutil)' }),
    ]);

    const filaDatos = el('div', { class: 'stack' }, [
      el('div', { class: 'fila' }, [
        filaConIcono(icono('persona', { tamano: 16, color: 'var(--texto-sutil)' }), campoApellido),
        filaConIcono(icono('mano', { tamano: 16, color: 'var(--texto-sutil)' }), campoMano),
      ]),
      el('div', { class: 'fila' }, [
        filaConIcono(icono('guante', { tamano: 16, color: 'var(--texto-sutil)' }), campoDisciplina),
        botonNacionalidad,
        filaConIcono(icono('balanza', { tamano: 16, color: 'var(--texto-sutil)' }), campoCategoria),
      ]),
      estado.error ? el('div', { class: 'rojo', 'data-error': '', text: estado.error }) : null,
      estado.revelado < 2
        ? el('button', {
          class: 'boton', type: 'button', 'data-accion': 'siguiente', text: 'Siguiente', onClick: siguiente,
        })
        : null,
    ]);

    return el('div', { class: 'panel', dataset: { paso: '1' } }, [tituloPaso(1, 'TUS DATOS'), filaDatos]);
  }

  function grillaTarjetas(items, { onElegir, elegidoId, iconoNombre }) {
    return el('div', { class: 'panel-decision-grilla' }, items.map((item) => {
      const nodo = crearTarjeta({
        icono: icono(iconoNombre, { tamano: 20 }),
        titulo: item.nombre,
        descripcion: item.descripcion,
        efectos: efectosDeMods(item.mods),
        rareza: item.rareza,
        onElegir: () => onElegir(item.id),
      });
      nodo.dataset.opcion = item.id;
      if (elegidoId === item.id) nodo.classList.add('tarjeta-elegida');
      return nodo;
    }));
  }

  function pasoOrigen() {
    const grilla = grillaTarjetas(origenesOfrecidos, {
      onElegir: elegirOrigen, elegidoId: estado.origenId, iconoNombre: 'origen',
    });
    return el('div', { class: 'panel', dataset: { paso: '2' } }, [tituloPaso(2, 'ORIGEN'), grilla]);
  }

  function pasoApodo() {
    const grilla = grillaTarjetas(apodosOfrecidos, {
      onElegir: elegirApodo, elegidoId: estado.apodoId, iconoNombre: 'etiqueta',
    });
    return el('div', { class: 'panel', dataset: { paso: '3' } }, [tituloPaso(3, 'APODO'), grilla]);
  }

  function pasoEstilo() {
    const estilos = estilosDisponibles(estado.disciplina);
    const grilla = el('div', { class: 'panel-decision-grilla' }, estilos.map((e) => {
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
        onElegir: () => elegirEstilo(e.id),
      });
      nodo.dataset.opcion = e.id;
      if (estado.estiloId === e.id) nodo.classList.add('tarjeta-elegida');
      return nodo;
    }));
    return el('div', { class: 'panel', dataset: { paso: '4' } }, [tituloPaso(4, 'ESTILO (Y ENTRENADOR)'), grilla]);
  }

  function vista() {
    const pasos = [pasoUno()];
    if (estado.revelado >= 2) pasos.push(pasoOrigen());
    if (estado.revelado >= 3) pasos.push(pasoApodo());
    if (estado.revelado >= 4) pasos.push(pasoEstilo());
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
