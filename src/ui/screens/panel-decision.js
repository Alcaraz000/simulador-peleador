import { el, mount } from '../dom.js';
import { crearTarjeta, RAREZAS } from '../components/card.js';
import { emblemaResultado, NOMBRE_METODO, VEREDICTO } from '../components/emblema-resultado.js';

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

  // Con exactamente 2 opciones, la grilla de 3 columnas de siempre deja una
  // tercera columna vacía y las tarjetas quedan chicas y descolgadas a la
  // izquierda (queja del usuario): se reusa `.panel-decision-grilla-2`
  // (creada en create.js) para que las 2 se centren y ocupen bien el ancho.
  const claseGrilla = opciones.length === 2 ? 'panel-decision-grilla-2' : 'panel-decision-grilla';
  const grilla = el('div', { class: claseGrilla }, botones);

  mount(region, el('div', { class: 'stack panel-decision' }, [cabecera, grilla]));
}

/**
 * La transición que reemplaza a la vieja pantalla de resultado (v1): no es
 * una pantalla nueva, es lo próximo que se pinta en la MISMA región central,
 * después de aplicar el efecto de la decisión. Dejar legible el desenlace es
 * lo único que le importa a esta función.
 *
 * `previa` (v13, Bloque 6, "la tarjeta previa a la pelea"): un lote de
 * trámite resuelto entero como charla + resumen fusionados en un solo beat
 * (`peleasResueltas`, ver el comentario grande de esa sección en career.js)
 * trae la voz del entrenador avisando contra quién fue la pelea ANTES del
 * resultado — un solo "Seguir", misma información que antes hubiera costado
 * dos pantallas. Opcional (texto vacío por default): el resto de los
 * llamadores de `renderDesenlace` (evento sin pelea, lesión sin oferta,
 * destacado de trámite) no tienen ninguna charla previa que mostrar y siguen
 * exactamente igual que siempre.
 *
 * @param {HTMLElement} region - normalmente `shell.regiones.centro`.
 */
/**
 * El desenlace de una pelea o de un beat.
 *
 * `resultado` ('v'|'d'|'e') y `metodo` ('ko'|'tko'|'decision'|...) son
 * OPCIONALES: cuando vienen los dos, el desenlace deja de ser un panel de
 * texto y se corona con el emblema del método pintado del color del veredicto
 * (ver emblema-resultado.js) — el pedido v17.5, punto 3. Cuando no vienen (un
 * desenlace que no es una pelea: un lote de trámite, el cierre de un
 * campamento), sigue siendo el mismo panel de siempre.
 */
export function renderDesenlace(region, {
  titulo = 'Resultado', texto = '', previa = '', deltasTexto = [], onContinuar = () => {},
  resultado = null, metodo = null, resultados = null,
}) {
  const conEmblema = Boolean(resultado && metodo);
  // Un LOTE de peleas (el año de trámite: dos o tres combates resueltos de
  // una) no tiene un solo veredicto que coronar, así que en vez del emblema
  // grande van los chicos, uno por pelea, con el rival y cómo terminó. Era la
  // pantalla de la captura del usuario: tres resultados apretados en una
  // línea de texto corrida.
  const lote = Array.isArray(resultados) && resultados.length > 0 ? resultados : null;
  mount(region, el('div', { class: 'stack panel-decision-desenlace' }, [
    conEmblema ? el('div', { class: `desenlace-hero desenlace-hero-${resultado}` }, [
      emblemaResultado({ resultado, metodo }),
      el('div', { class: 'desenlace-hero-texto' }, [
        el('div', { class: 'desenlace-veredicto', text: VEREDICTO[resultado] ?? titulo }),
        el('div', { class: 'desenlace-metodo', text: NOMBRE_METODO[metodo] ?? metodo }),
      ]),
    ]) : null,
    conEmblema ? null : el('div', { class: 'etiqueta', text: titulo }),
    lote ? el('div', { class: 'desenlace-lote' }, lote.map((r) => el('div', {
      class: `desenlace-lote-item desenlace-hero-${r.resultado}`,
    }, [
      emblemaResultado({ resultado: r.resultado, metodo: r.metodo }),
      el('div', { class: 'desenlace-lote-texto' }, [
        el('div', { class: 'desenlace-lote-rival', text: r.rival }),
        el('div', { class: 'desenlace-lote-metodo', text: NOMBRE_METODO[r.metodo] ?? r.metodo }),
      ]),
    ]))) : null,
    // El panel NO se estira: un desenlace son dos líneas de texto, y una caja
    // de 600px con dos líneas en el medio es tan vacía como el hueco que venía
    // a tapar, solo que con borde. El panel se queda compacto y lo que se
    // centra en el hueco es el bloque entero (ver .panel-decision-desenlace en
    // theme.css), con el botón siempre al pie.
    el('div', { class: 'panel' }, [
      previa ? el('p', { class: 'medio desenlace-previa', style: 'font-style:italic;margin:0 0 8px', text: previa }) : null,
      texto ? el('p', { class: 'medio', text: texto }) : null,
      deltasTexto.length > 0 ? el('div', { class: 'mods', text: deltasTexto.join(' · ') }) : null,
    ]),
    el('button', { class: 'boton', type: 'button', text: 'Seguir', onClick: onContinuar }),
  ]));
}
