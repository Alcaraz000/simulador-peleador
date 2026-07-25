import { el, mount } from '../dom.js';
import { crearTarjeta, RAREZAS } from '../components/card.js';

// Panel de decisión (v2): vive DENTRO de la región central del shell, nunca
// reemplaza la pantalla. Es una capa fina de DOM — no decide nada de juego,
// solo pinta las opciones que le pasan y avisa cuál se eligió. Quien lo llama
// (main.js) decide qué pasa después: resolver el azar, aplicar el efecto,
// animar los atributos del panel izquierdo, etc.

/**
 * @param {HTMLElement} region - normalmente `shell.regiones.centro`.
 * @param {{
 *   titulo: string, bajada?: string, texto?: string,
 *   opciones: Array<{id:string, titulo:string, descripcion?:string, efectos?:Array, rareza?:string, icono?:Node}>,
 *   rareza?: 'normal'|'rara'|'legendaria' - rareza de la CARTA entera (evento/redes);
 *     va como etiqueta en el encabezado, nunca en las tarjetas de opción.
 *   onElegir?: (id:string) => void,
 * }} opciones
 */
export function renderPanelDecision(region, {
  titulo, bajada = '', texto = '', opciones, rareza = 'normal', onElegir = () => {},
}) {
  const meta = RAREZAS[rareza] ?? RAREZAS.normal;

  let elegido = false;
  const botones = opciones.map((opcion) => {
    const boton = crearTarjeta({
      icono: opcion.icono ?? null,
      titulo: opcion.titulo,
      descripcion: opcion.descripcion ?? '',
      efectos: opcion.efectos ?? [],
      rareza: opcion.rareza ?? 'normal',
      onElegir: () => {
        if (elegido) return;
        elegido = true;
        for (const b of botones) b.disabled = true;
        onElegir(opcion.id);
      },
    });
    boton.dataset.opcion = opcion.id;
    return boton;
  });

  const cabecera = el('div', { class: 'panel-decision-cabecera' }, [
    el('div', { class: 'fila', style: 'align-items:flex-start' }, [
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'etiqueta', text: titulo }),
        bajada ? el('h1', { text: bajada }) : null,
      ]),
      meta.etiqueta ? el('span', { class: `tarjeta-etiqueta ${meta.id}`, style: 'flex:0 0 auto', text: meta.etiqueta }) : null,
    ]),
    texto ? el('p', { class: 'medio', text: texto }) : null,
  ]);

  const grilla = el('div', { class: 'panel-decision-grilla' }, botones);

  mount(region, el('div', { class: 'stack panel-decision' }, [cabecera, grilla]));
}

/**
 * La transición que reemplaza a la vieja pantalla de resultado (v1): no es
 * una pantalla nueva, es lo próximo que se pinta en la MISMA región central,
 * después de aplicar el efecto de la decisión. Dejar legible el desenlace es
 * lo único que le importa a esta función.
 *
 * @param {HTMLElement} region - normalmente `shell.regiones.centro`.
 */
export function renderDesenlace(region, {
  titulo = 'Resultado', texto = '', deltasTexto = [], onContinuar = () => {},
}) {
  mount(region, el('div', { class: 'stack panel-decision-desenlace' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('div', { class: 'panel' }, [
      texto ? el('p', { class: 'medio', text: texto }) : null,
      deltasTexto.length > 0 ? el('div', { class: 'mods', text: deltasTexto.join(' · ') }) : null,
    ]),
    el('button', { class: 'boton', type: 'button', text: 'Seguir', onClick: onContinuar }),
  ]));
}
