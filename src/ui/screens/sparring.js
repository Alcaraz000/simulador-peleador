import { el, mount } from '../dom.js';

export function renderSparring(contenedor, { sparring, jugador, onGolpe, onTerminar }) {
  let activo = null;
  let desde = 0;

  const paos = Array.from({ length: 6 }, (_, i) => el('div', {
    class: 'pao', 'data-pao': String(i),
    onClick: () => {
      if (activo === null) return;
      const acerto = i === activo;
      const ms = Math.max(1, Date.now() - desde);
      prender(null);
      onGolpe({ acerto, ms });
    },
  }));

  function prender(indice) {
    activo = indice;
    paos.forEach((pao, i) => pao.classList.toggle('activo', i === indice));
    if (indice !== null) desde = Date.now();
  }

  function empezar() {
    const posicion = sparring.secuencia[sparring.indice] ?? 0;
    prender(posicion);
    boton.remove();
  }

  const boton = sparring.terminado
    ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Continuar', onClick: onTerminar })
    : el('button', { class: 'boton', 'data-accion': 'empezar', text: 'Empezar', onClick: empezar });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: `Entrenamiento · ${jugador.gimnasio}` }),
    el('h1', { text: 'Sparring de reflejos' }),
    el('p', { class: 'medio', text: '"Pegá el que se prende. Rápido, que en el ring no avisan."' }),
    el('div', { class: 'fila' }, [
      el('div', { class: 'tile' }, [
        el('div', { class: 'valor dorado', text: String(sparring.aciertos) }),
        el('div', { class: 'nombre', text: 'Aciertos' }),
      ]),
      el('div', { class: 'tile' }, [
        el('div', { class: 'valor', text: `${sparring.indice}/${sparring.objetivos}` }),
        el('div', { class: 'nombre', text: 'Golpes' }),
      ]),
    ]),
    el('div', { class: 'panel' }, [el('div', { class: 'grilla-paos' }, paos)]),
    boton,
  ]));

  if (!sparring.terminado && sparring.indice > 0) empezar();
}
