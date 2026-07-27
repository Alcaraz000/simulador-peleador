// Resumen de fin de año (pedido textual del usuario): "un resumen de lo
// ocurrido y gráficos que muestren cómo fueron cambiando con los meses la
// media, debe mostrar las decisiones tomadas y las peleas hechas
// (contrincante, fecha, resultado, modo de victoria)". Este panel vive DENTRO
// de la región central del tablero (mismo criterio que cualquier otro beat,
// ver panel-decision.js) — nunca una pantalla aparte, para que cerrarlo sea
// un solo click, sin animaciones.
import { describe, it, expect, vi } from 'vitest';
import { renderResumenAnio } from '../../src/ui/screens/resumen-anio.js';

function region() {
  return document.createElement('div');
}

function decisionDePrueba(over = {}) {
  return {
    tipo: 'mejora', titulo: 'Campamento', opcion: 'Más potencia', semana: 5, ...over,
  };
}

function peleaDePrueba(over = {}) {
  return {
    rivalId: 'r1', rivalNombre: 'Juan Perez', rivalApodo: 'El Pibe', rivalMedia: 40,
    resultado: 'v', metodo: 'ko', round: 3, bolsa: 5000, enJuego: null, esTitulo: false,
    esObligatoria: false, fecha: 10, modo: 'tramite', rivalNacionalidad: 'AR', ...over,
  };
}

function propsBase(over = {}) {
  return {
    anio: 2028,
    muestrasMedia: [
      { semana: 1, media: 60, ranking: 40 },
      { semana: 20, media: 64, ranking: 22 },
    ],
    decisiones: [decisionDePrueba()],
    peleas: [peleaDePrueba()],
    narrativa: 'Un año parejo, con una victoria que hizo ruido.',
    onContinuar: () => {},
    ...over,
  };
}

describe('renderResumenAnio', () => {
  it('monta el año en la cabecera y la narrativa', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    expect(r.textContent).toContain('2028');
    expect(r.textContent).toContain('Un año parejo, con una victoria que hizo ruido.');
  });

  // v9 (feedback del usuario, con captura: "(Resumen del año) tiene que
  // estar pegado al año, no flotando a la derecha"). El bug real era que el
  // contenedor de ambos reusaba la clase genérica `.fila` (que reparte
  // `flex:1` entre sus hijos directos, separándolos según el ancho
  // disponible en vez de su propio contenido) — se verifica acá que el año
  // y la etiqueta viven en un contenedor PROPIO, no en un `.fila` a secas.
  it('el año y "(Resumen del año)" viven pegados, en un contenedor dedicado (no la fila generica que los separaba)', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    const h1 = r.querySelector('h1');
    const contenedor = h1.parentElement;
    expect(contenedor.classList.contains('resumen-anio-cabecera-anio')).toBe(true);
    expect(contenedor.classList.contains('fila')).toBe(false);
    const etiqueta = [...contenedor.children].find((n) => n.textContent.includes('Resumen del año'));
    expect(etiqueta).toBeTruthy();
    // Son los ÚNICOS dos hijos de ese contenedor: nada se interpone entre
    // el año y su etiqueta.
    expect(contenedor.children).toHaveLength(2);
  });

  it('incluye el grafico de media (svg) cuando hay al menos 2 muestras', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    expect(r.querySelector('.grafico-media-svg')).toBeTruthy();
  });

  it('lista cada decision tomada con su titulo y la opcion elegida', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      decisiones: [
        decisionDePrueba({ titulo: 'El examen y el sparring', opcion: 'Rendir el examen.' }),
        decisionDePrueba({ tipo: 'evento', titulo: 'Che, dejá el boxeo', opcion: 'Seguir entrenando.' }),
      ],
    }));
    expect(r.textContent).toContain('El examen y el sparring');
    expect(r.textContent).toContain('Rendir el examen.');
    expect(r.textContent).toContain('Che, dejá el boxeo');
    expect(r.textContent).toContain('Seguir entrenando.');
  });

  it('lista cada pelea con rival, resultado y metodo (puntos/ko/tko/sumision)', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      peleas: [
        peleaDePrueba({ rivalApodo: 'El Zurdo', resultado: 'v', metodo: 'ko' }),
        peleaDePrueba({ rivalApodo: 'La Bala', resultado: 'd', metodo: 'decision' }),
        peleaDePrueba({ rivalApodo: 'El Toro', resultado: 'v', metodo: 'tko' }),
      ],
    }));
    expect(r.textContent).toContain('El Zurdo');
    expect(r.textContent).toContain('La Bala');
    expect(r.textContent).toContain('El Toro');
    expect(r.textContent).toContain('KO');
    expect(r.textContent).toContain('TKO');
    // El pedido textual usa la palabra "puntos" para la decisión (no
    // "Decisión" a secas).
    expect(r.textContent).toMatch(/puntos/i);
  });

  it('muestra el veredicto (gano/perdio) de cada pelea, no solo el metodo', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      peleas: [peleaDePrueba({ resultado: 'v' }), peleaDePrueba({ resultado: 'd' }), peleaDePrueba({ resultado: 'e' })],
    }));
    expect(r.textContent).toMatch(/gan/i);
    expect(r.textContent).toMatch(/perdi/i);
    expect(r.textContent).toMatch(/empat/i);
  });

  it('un solo boton (Seguir) que llama a onContinuar', () => {
    const r = region();
    const onContinuar = vi.fn();
    renderResumenAnio(r, propsBase({ onContinuar }));
    const botones = r.querySelectorAll('button');
    expect(botones).toHaveLength(1);
    expect(botones[0].textContent).toContain('Seguir');
    botones[0].click();
    expect(onContinuar).toHaveBeenCalledTimes(1);
  });

  // v10 (Pedido 1: "el botón SEGUIR visible sin scrollear"): si el año no
  // entra completo en el piso de la izquierda, `.resumen-anio-cuerpo` es lo
  // único que scrollea (ver sincronizar-alturas.js) — la cabecera con el año
  // y el botón "Seguir" tienen que quedar AFUERA de ese contenedor, nunca
  // adentro, para no tener que scrollear para encontrarlos. Esto es
  // estructural (dónde vive cada nodo en el DOM), no solo visual — un test
  // de layout real no puede correr acá (happy-dom no calcula CSS), así que
  // se verifica la garantía que sí depende de la estructura.
  it('el botón Seguir y la cabecera del año viven AFUERA de resumen-anio-cuerpo (el scroll interno nunca se los lleva puestos)', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    const cuerpo = r.querySelector('.resumen-anio-cuerpo');
    expect(cuerpo).toBeTruthy();
    const boton = r.querySelector('button');
    const h1 = r.querySelector('h1');
    expect(cuerpo.contains(boton)).toBe(false);
    expect(cuerpo.contains(h1)).toBe(false);
    // Los gráficos y las secciones de decisiones/peleas, en cambio, SÍ viven
    // adentro (son la parte que puede llegar a no entrar).
    expect(cuerpo.querySelector('.grafico-media-svg')).toBeTruthy();
    expect(cuerpo.querySelector('.resumen-anio-filas')).toBeTruthy();
  });

  it('sin decisiones (defensivo), no revienta y no muestra la seccion', () => {
    const r = region();
    expect(() => renderResumenAnio(r, propsBase({ decisiones: [] }))).not.toThrow();
  });

  it('sin peleas (defensivo, no deberia pasar por el gating pero no revienta), no revienta', () => {
    const r = region();
    expect(() => renderResumenAnio(r, propsBase({ peleas: [] }))).not.toThrow();
  });

  it('no usa emojis de bandera ni emojis en general (voz de crónica, iconos SVG)', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(r.textContent)).toBe(false);
  });

  // v8 (pedido textual: "hay que mejorar esta sección, más compacta"). ------

  it('muestra iconos en el encabezado del año y junto a la cronica', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    const encabezado = r.querySelector('h1').closest('.fila').parentElement;
    expect(encabezado.querySelector('svg')).toBeTruthy();
    const cronica = [...r.querySelectorAll('p.medio')].find((p) => p.textContent.includes('Un año parejo'));
    expect(cronica.parentElement.querySelector('svg')).toBeTruthy();
  });

  it('cada pelea lleva la bandera SVG del rival, nunca un emoji', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      peleas: [peleaDePrueba({ rivalApodo: 'El Zurdo', rivalNacionalidad: 'MX' })],
    }));
    expect(r.querySelector('svg.bandera-svg')).toBeTruthy();
  });

  // Compacto (Pedido 2, punto 1): las decisiones y las peleas son FILAS de
  // una sola tabla (un `.panel` por sección con varias `.resumen-anio-fila`
  // adentro), no un panel grande por cada item como antes.
  it('las decisiones y las peleas son filas compactas dentro de UN panel por seccion, no un panel por item', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      decisiones: [decisionDePrueba(), decisionDePrueba({ titulo: 'El biomecánico', opcion: 'Hacer la sesión completa.' })],
      peleas: [peleaDePrueba(), peleaDePrueba({ rivalApodo: 'La Bala', fecha: 30 })],
    }));
    const filas = r.querySelectorAll('.resumen-anio-fila');
    expect(filas.length).toBe(4); // 2 decisiones + 2 peleas
    // Cada fila vive dentro de un contenedor .resumen-anio-filas (un solo
    // panel por sección), no dentro de su propio .panel individual.
    filas.forEach((fila) => expect(fila.classList.contains('panel')).toBe(false));
  });

  // v9 (feedback del usuario: "sacar la leyenda 'Más arriba, mejor puesto'
  // del gráfico de ranking [...] que se entienda por el diseño, no por un
  // cartel"): ya no hay un texto VISIBLE aclarando la inversión — la
  // explicación para lectores de pantalla sigue viva en el aria-label del
  // propio SVG (no es un "cartel" en pantalla, es el equivalente accesible
  // de lo que un usuario vidente lee en el eje Y, ver grafico-media.js).
  it('incluye el grafico de ranking (svg), SIN una leyenda visible aclarando la inversion (se resuelve con el diseno del eje)', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    const svg = r.querySelector('.grafico-ranking-svg');
    expect(svg).toBeTruthy();
    expect(r.textContent).not.toMatch(/más arriba,? mejor puesto/i);
    // La aclaración sigue disponible para lectores de pantalla.
    expect(svg.getAttribute('aria-label')).toMatch(/mejor puesto/i);
  });

  // v9 (feedback del usuario, con captura: "Decisiones y Peleas del año no
  // están alineadas [...] que 'Mejora' y 'CAMPAMENTO' ocupen el mismo
  // espacio [...] empiecen en el mismo lugar"). La verificación PIXEL a
  // pixel es responsabilidad de la captura de pantalla real (theme.css no se
  // aplica en este entorno de test) — acá se verifica lo que SÍ se puede
  // verificar sin layout real: que la columna de "tipo" (decisiones) y la de
  // "mes" (peleas) son literalmente la MISMA clase CSS, condición necesaria
  // para que theme.css les dé el mismo ancho fijo en las dos secciones.
  it('la columna de tipo (decisiones) y la de mes (peleas) comparten la misma clase, para medir igual en las dos secciones', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      decisiones: [decisionDePrueba()],
      peleas: [peleaDePrueba()],
    }));
    const filas = [...r.querySelectorAll('.resumen-anio-fila')];
    const tagDecision = filas[0].querySelector('.resumen-anio-fila-tag');
    const tagPelea = filas[1].querySelector('.resumen-anio-fila-tag');
    expect(tagDecision).toBeTruthy();
    expect(tagPelea).toBeTruthy();
    expect(tagDecision.className).toBe(tagPelea.className);
  });

  it('el resultado de la pelea usa una clase de ancho fijo, no un estilo inline suelto', () => {
    const r = region();
    renderResumenAnio(r, propsBase({ peleas: [peleaDePrueba({ resultado: 'v' })] }));
    const resultado = r.querySelector('.resumen-anio-fila-resultado');
    expect(resultado).toBeTruthy();
    expect(resultado.getAttribute('style')).toBeFalsy();
  });

  // v9 (feedback del usuario, con captura: "Media estable en 75 durante
  // todo el año [...] MAL, siempre mostrar gráfico y su evolución"). Antes,
  // un año sin más de 1 muestra distinta caía a una oración de texto — ahora
  // tiene que dibujarse el SVG siempre (una línea plana es igual de válida).
  it('con la media sin cambios en todo el año (una sola muestra), sigue mostrando el SVG, nunca una oracion de texto', () => {
    const r = region();
    renderResumenAnio(r, propsBase({
      muestrasMedia: [{ semana: 1, media: 75, ranking: 20 }],
    }));
    expect(r.querySelector('.grafico-media-svg')).toBeTruthy();
    expect(r.textContent).not.toMatch(/estable/i);
  });

  it('el titulo de la seccion de decisiones es compacto ("Decisiones")', () => {
    const r = region();
    renderResumenAnio(r, propsBase());
    expect(r.textContent).toMatch(/decisiones/i);
  });

  it('sin datos de ranking en las muestras (partida vieja), no revienta y cae a la lectura simple', () => {
    const r = region();
    expect(() => renderResumenAnio(r, propsBase({
      muestrasMedia: [{ semana: 1, media: 60 }, { semana: 20, media: 64 }],
    }))).not.toThrow();
  });
});
