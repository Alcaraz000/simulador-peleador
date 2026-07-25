import { el, mount } from '../dom.js';
import { CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio } from '../../core/fighter.js';
import { estilosDisponibles } from '../../core/styles.js';
import { DISCIPLINAS } from '../../core/disciplines.js';
import { NACIONALIDADES } from '../../content/names.js';
import { createRng } from '../../core/rng.js';

function opciones(select, items, valorActual) {
  select.innerHTML = '';
  for (const item of items) {
    const opt = el('option', { value: item.valor, text: item.texto });
    select.appendChild(opt);
  }
  if (valorActual && items.some((i) => i.valor === valorActual)) select.value = valorActual;
}

function campo(etiqueta, control) {
  return el('label', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: etiqueta }),
    control,
  ]);
}

export function renderCreacion(contenedor, { onComenzar }) {
  const nombre = el('input', { 'data-campo': 'nombre', class: 'carta', placeholder: 'Nombre y apellido' });
  const apodo = el('input', { 'data-campo': 'apodo', class: 'carta', placeholder: 'Apodo' });
  const nacionalidad = el('select', { 'data-campo': 'nacionalidad', class: 'carta' });
  const disciplina = el('select', { 'data-campo': 'disciplina', class: 'carta' });
  const categoria = el('select', { 'data-campo': 'categoria', class: 'carta' });
  const estilo = el('select', { 'data-campo': 'estilo', class: 'carta' });
  const origen = el('select', { 'data-campo': 'origen', class: 'carta' });
  const mano = el('select', { 'data-campo': 'mano', class: 'carta' });
  const error = el('div', { 'data-error': '', class: 'rojo', text: '' });

  opciones(nacionalidad, NACIONALIDADES.map((n) => ({ valor: n.codigo, texto: `${n.bandera} ${n.nombre}` })));
  opciones(disciplina, Object.values(DISCIPLINAS).map((d) => ({ valor: d.id, texto: d.nombre })));
  opciones(categoria, Object.values(CATEGORIAS).map((c) => ({ valor: c.id, texto: c.nombre })));
  opciones(origen, ORIGENES.map((o) => ({ valor: o.id, texto: `${o.nombre} — ${o.descripcion}` })));
  opciones(mano, [{ valor: 'derecha', texto: 'Derecha' }, { valor: 'zurda', texto: 'Zurda' }]);

  function refrescarEstilos() {
    const disponibles = estilosDisponibles(disciplina.value).map((e) => ({ valor: e.id, texto: `${e.nombre} — ${e.descripcion}` }));
    opciones(estilo, disponibles, estilo.value);
  }
  disciplina.addEventListener('change', refrescarEstilos);
  refrescarEstilos();

  function aleatorio() {
    const rng = createRng(Date.now());
    const sugerido = peleadorAleatorio(rng, { edad: 15 });
    nombre.value = sugerido.nombre;
    apodo.value = sugerido.apodo;
    nacionalidad.value = sugerido.nacionalidad;
    disciplina.value = sugerido.disciplina;
    refrescarEstilos();
    estilo.value = sugerido.estilo;
    categoria.value = sugerido.categoria;
    origen.value = sugerido.origen;
    mano.value = sugerido.mano;
    error.textContent = '';
  }

  function comenzar() {
    if (!nombre.value.trim()) {
      error.textContent = 'Poné un nombre para empezar.';
      return;
    }
    const peleador = crearPeleador({
      nombre: nombre.value.trim(),
      apodo: apodo.value.trim() || 'Sin apodo',
      nacionalidad: nacionalidad.value,
      disciplina: disciplina.value,
      estilo: estilo.value,
      categoria: categoria.value,
      origen: origen.value,
      mano: mano.value,
      esJugador: true,
      media: 38,
    });
    onComenzar(peleador);
  }

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Nueva carrera' }),
    el('h1', { text: 'Creá tu peleador' }),
    el('p', { class: 'medio', text: 'Tenés 15 años y todo por delante. Elegí de dónde venís.' }),
    campo('Nombre', nombre),
    campo('Apodo', apodo),
    campo('Nacionalidad', nacionalidad),
    campo('Disciplina', disciplina),
    campo('Categoría', categoria),
    campo('Estilo de pelea', estilo),
    campo('Origen', origen),
    campo('Mano hábil', mano),
    error,
    el('button', { class: 'boton secundario', 'data-accion': 'aleatorio', text: 'Sorprendeme', onClick: aleatorio }),
    el('button', { class: 'boton', 'data-accion': 'comenzar', text: 'Empezar la carrera', onClick: comenzar }),
  ]));
}
