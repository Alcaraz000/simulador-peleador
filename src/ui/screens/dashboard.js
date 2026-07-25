import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { mediaDe, recordTexto } from '../../core/fighter.js';
import { getDisciplina } from '../../core/disciplines.js';
import { ETIQUETAS, etiquetaEstado } from '../../core/stats.js';
import { etapaActual } from '../../core/career.js';
import { h2hTexto } from '../../core/rivalry.js';
import { banderaDe } from '../../content/names.js';

const BASE = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];

function tileAtributo(clave, valor, subio) {
  return el('div', { class: 'tile', 'data-atributo': clave }, [
    el('div', { class: 'valor' }, [
      String(valor),
      subio ? el('span', { class: 'delta-sube', text: '▲' }) : null,
    ]),
    el('div', { class: 'nombre', text: ETIQUETAS[clave].corta }),
  ]);
}

function tileRecurso(nombre, valor, clase = '') {
  return el('div', { class: 'tile' }, [
    el('div', { class: `valor ${clase}`, text: String(valor) }),
    el('div', { class: 'nombre', text: nombre }),
  ]);
}

export function renderDashboard(contenedor, { partida, onSiguiente, onTienda = () => {}, onFicha = () => {} }) {
  const { jugador } = partida;
  const etapa = etapaActual(partida);
  const disciplina = getDisciplina(jugador.disciplina);
  const claves = disciplina.usaGrappling ? [...BASE.slice(0, 5), 'grappling'] : BASE;
  const subidos = partida.ultimosDeltas ?? {};
  const archi = (partida.rivalidades ?? []).find((r) => r.esArchirrival);
  const datosArchi = archi ? partida.mundo.roster.find((p) => p.id === archi.rivalId) : null;

  const cabecera = el('div', { class: 'panel', 'data-accion': 'ficha', onClick: () => onFicha(jugador) }, [
    el('div', { class: 'fila', style: 'align-items:center' }, [
      el('div', { class: 'media-num', 'data-media': '', text: String(mediaDe(jugador)), style: 'flex:0 0 auto' }),
      el('div', { style: 'flex:1' }, [
        el('div', { class: 'etiqueta', text: 'Media' }),
        el('h1', { text: `${banderaDe(jugador.nacionalidad)} "${jugador.apodo}" ${jugador.nombre}`.toUpperCase() }),
        el('div', { class: 'etiqueta', text: `${jugador.categoria} · ${jugador.mano} · ${disciplina.nombre}` }),
      ]),
      el('div', { class: 'etiqueta', text: 'Ficha' }),
    ]),
    el('div', { class: 'etiqueta', style: 'margin-top:8px' , text:
      `${jugador.gimnasio} · ${partida.mundo.anio} · ${Math.floor(jugador.edad)} años · forma: ${etiquetaEstado('forma', jugador.estado.forma)}` }),
    jugador.titulos.length > 0
      ? el('div', { style: 'margin-top:8px' }, jugador.titulos.map((t) => el('span', { class: 'chip dorado', text: `🏆 ${t}` })))
      : null,
  ]);

  const historial = el('div', {
    class: 'panel', 'data-accion': 'historial', onClick: () => onFicha(jugador, 'historial'),
    style: 'display:flex;align-items:center;gap:14px',
  }, [
    el('div', { style: 'text-align:center' }, [
      el('div', { 'data-record': '', style: 'font-size:26px;font-weight:800', text: recordTexto(jugador) }),
      el('div', { class: 'nombre etiqueta', text: 'Récord' }),
    ]),
    el('div', { style: 'flex:1;font-size:12px', class: 'medio' }, [
      `${jugador.record.v + jugador.record.d + jugador.record.e} peleas · ${jugador.record.ko} por KO`,
    ]),
    el('div', { class: 'rojo etiqueta', text: 'Historial' }),
  ]);

  const atributos = el('div', { class: 'fila' },
    claves.map((c) => tileAtributo(c, jugador.atributos[c], Boolean(subidos[c]))));

  const recursos = el('div', { class: 'fila' }, [
    tileRecurso('Títulos', jugador.titulos.length, 'dorado'),
    tileRecurso('Ranking', jugador.ranking ? `#${jugador.ranking}` : '—'),
    tileRecurso('Fama', jugador.fama),
    tileRecurso('Ganado', fmtDinero(jugador.dinero), 'verde'),
    datosArchi ? tileRecurso(`vs ${datosArchi.apodo}`, h2hTexto(archi), 'rojo') : null,
  ].filter(Boolean));

  const banner = el('div', { class: 'panel', style: 'display:flex;align-items:center;gap:10px' }, [
    el('div', { style: 'flex:1' }, [
      el('div', { class: 'dorado', style: 'font-weight:800;letter-spacing:1px', text: etapa.nombre.toUpperCase() }),
      el('div', { class: 'medio', style: 'font-size:12px', text: etapa.frase }),
    ]),
    el('button', {
      class: 'boton secundario', 'data-accion': 'tienda',
      style: 'width:auto;padding:10px', onClick: onTienda,
    }, [icono('tienda', { color: '#f2c14e' })]),
  ]);

  const siguiente = el('button', {
    class: 'boton', 'data-accion': 'siguiente', text: 'Continuar', onClick: onSiguiente,
  });

  mount(contenedor, el('div', { class: 'stack' }, [
    cabecera, historial, atributos, recursos, banner,
    el('div', { class: 'etiqueta', text: 'Lo que viene ahora' }),
    siguiente,
  ]));
}
