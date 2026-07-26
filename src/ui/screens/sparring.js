import { el, mount } from '../dom.js';

// Presupuesto total de la RONDA (Pedido v6: "quiero que el timer sea por
// todo el juego, no solo por cada golpe [...] no quiero que se reinicie").
// Antes (Task v4) cada pao encendido tenía su propio DURACION_MS de 1500ms
// que se reiniciaba con cada golpe; el usuario pidió lo contrario: UN solo
// reloj para todo el minijuego, que arranca con el primer "Empezar" y corre
// sin cortes hasta que se completan los OBJETIVOS_POR_DEFECTO golpes (ver
// core/sparring.js) o se acaba el tiempo.
//
// Por qué 7000ms es justo (balance verificado con una simulación de
// reacciones, no a ojo): con 10 golpes, 7000ms da 700ms de presupuesto
// promedio por golpe — EXACTO el umbral de "bien" (MS_BIEN, core/sparring.js)
// y con margen de sobra para "perfecto" (320ms×10 = 3200ms, o sea 3800ms de
// aire). Simulando reacciones con dispersión realista: un jugador "bueno"
// (~450ms de media) completa los 10 casi siempre y saca "bien" o mejor; uno
// "al límite" de MS_BIEN (~700ms de media) llega en el margen y el resultado
// queda partido entre "bien" y "flojo" — borderline, como corresponde a
// alguien justo en el límite; uno genuinamente lento (900ms+ de media) no
// llega a completarlos y sale "flojo". No hace falta ajustar el número.
export const DURACION_RONDA_MS = 7000;

// El reloj de ronda vive por CONTENEDOR, no por instancia de render: main.js
// vuelve a llamar a renderSparring en cada golpe (arma un árbol de nodos
// nuevo cada vez, mismo patrón que el resto de los paneles de acción), pero
// el `contenedor` que le pasa es el MISMO nodo durante toda la sesión del
// minijuego (solo cambia cuando arranca un beat nuevo — ver montarTablero en
// main.js, que recién ahí reconstruye `[data-bloque="contenido"]`). Un
// WeakMap deja que el reloj sobreviva a esos remounts sin tener que cambiar
// la firma de la función ni el llamador, y sin fugar memoria (se limpia solo
// si el contenedor deja de existir en cualquier otro lado).
const rondasPorContenedor = new WeakMap();

function limpiarRonda(contenedor) {
  const ronda = rondasPorContenedor.get(contenedor);
  if (ronda) clearTimeout(ronda.timerId);
  rondasPorContenedor.delete(contenedor);
}

export function renderSparring(contenedor, {
  sparring, jugador, onGolpe, onTiempoAgotado = () => {}, onTerminar,
  titulo = `Entrenamiento · ${jugador.gimnasio}`, bajada = 'Sparring de reflejos',
}) {
  let activo = null;
  let desde = 0;

  // La ronda ya terminó (a mano o porque se acabó el tiempo): no puede
  // quedar un reloj pendiente esperando golpes que ya no van a llegar.
  if (sparring.terminado) limpiarRonda(contenedor);

  const relleno = el('i', { style: 'width:100%' });
  const barraTiempo = el('div', { class: 'barra barra-sparring' }, [relleno]);

  // <button> (no <div>): antes no se podía llegar a un pao con el teclado
  // (sin tabindex/role, Tab lo saltaba entero). aria-label describe el
  // número — el color/animación de "activo" ya avisa cuál pegar, pero un
  // lector de pantalla no ve el resplandor dorado.
  const paos = Array.from({ length: 6 }, (_, i) => el('button', {
    type: 'button',
    class: 'pao', 'data-pao': String(i), 'aria-label': `Pao ${i + 1}`,
    onClick: () => {
      if (activo === null) return;
      const acerto = i === activo;
      const ms = Math.max(1, Date.now() - desde);
      resolverGolpe({ acerto, ms });
    },
  }));

  function resolverGolpe(evento) {
    prender(null);
    onGolpe(evento);
  }

  function prender(indice) {
    activo = indice;
    paos.forEach((pao, i) => pao.classList.toggle('activo', i === indice));
    if (indice !== null) desde = Date.now();
  }

  // Refleja en la barra CUÁNTO QUEDA del reloj de ronda — nunca cuánto queda
  // de este golpe puntual. Se llama en cada remount (cada golpe), así que el
  // ancho de arranque de la transición es la fracción real ya consumida (no
  // 100% de nuevo): la barra sigue vaciándose de forma continua a través de
  // los sucesivos remounts, en vez de saltar llena cada vez que le pegás a
  // un pao — eso es justamente lo que pedía "no quiero que se reinicie".
  function animarBarraTiempo() {
    const ronda = rondasPorContenedor.get(contenedor);
    const restante = ronda ? Math.max(0, ronda.fin - Date.now()) : 0;
    const fraccion = (restante / DURACION_RONDA_MS) * 100;
    relleno.style.transition = 'none';
    relleno.style.width = `${fraccion}%`;
    // Fuerza el reflow para que el navegador registre el ancho de arranque
    // ANTES de animar hacia 0 (mismo truco que ya usaba esta barra): sin
    // este paso el cambio se funde con el próximo estilo y nunca se ve
    // arrancar desde la fracción correcta.
    void relleno.offsetWidth;
    relleno.style.transition = `width ${restante}ms linear`;
    relleno.style.width = '0%';
  }

  function empezar() {
    // Solo la PRIMERA vez (todo el minijuego, no cada golpe) se crea el
    // reloj: si ya existe uno para este contenedor, esta sesión ya arrancó
    // en un remount anterior y hay que dejarlo correr tal cual, sin
    // reiniciarlo ni reprogramarlo.
    if (!rondasPorContenedor.has(contenedor)) {
      const timerId = setTimeout(() => {
        rondasPorContenedor.delete(contenedor);
        onTiempoAgotado();
      }, DURACION_RONDA_MS);
      rondasPorContenedor.set(contenedor, { fin: Date.now() + DURACION_RONDA_MS, timerId });
    }
    const posicion = sparring.secuencia[sparring.indice] ?? 0;
    prender(posicion);
    boton.remove();
    animarBarraTiempo();
  }

  const boton = sparring.terminado
    ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Continuar', onClick: onTerminar })
    : el('button', { class: 'boton', 'data-accion': 'empezar', text: 'Empezar', onClick: empezar });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('h1', { text: bajada }),
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
    sparring.terminado ? null : barraTiempo,
    el('div', { class: 'panel' }, [el('div', { class: 'grilla-paos' }, paos)]),
    boton,
  ]));

  if (!sparring.terminado && sparring.indice > 0) empezar();

  // `detener()` corta el reloj de ronda pendiente SIN disparar onTiempoAgotado
  // ni onGolpe (mismo contrato que crearBarraPrecision/animarRoll): lo usa
  // quien monta este componente (main.js) si el jugador se va de la pantalla
  // a mitad de la sesión — nunca se deja el timer corriendo en segundo plano.
  return {
    detener() {
      limpiarRonda(contenedor);
    },
  };
}
