// Gráfico de la media a lo largo del año (pedido textual del usuario:
// "gráficos que muestren cómo fueron cambiando con los meses la media"). SVG
// a mano, sin librerías — ver la skill dataviz: forma de línea (una sola
// serie, sin leyenda), marcas finas, etiquetas directas selectivas (primer y
// último punto, no todos), tooltip nativo por punto (<title>) y una lista de
// respaldo accesible (la "vista de tabla" que pide la skill).
//
// v9 (feedback del usuario sobre la ronda anterior, con captura de pantalla
// en mano): "sigue sin mostrar de enero a diciembre", "faltan el eje Y", "el
// gráfico tiene que aparecer SIEMPRE, incluso con la media plana". Esta
// ronda:
//   1) el eje X siempre marca los 12 meses del año (no solo el primero/último
//      CON DATO) y la línea se extiende (proyectada, no un dato nuevo) hasta
//      los dos bordes del año cuando el dato real no llega — antes la línea
//      se cortaba donde se acababan los datos, dejando "media caja" vacía.
//   2) hay un eje Y de verdad: gridlines + valores, no números flotando.
//   3) el fallback de texto ("Media estable en X...") se elimina: con un solo
//      valor real (o todos iguales) se dibuja una línea PLANA, nunca texto.
import { describe, it, expect } from 'vitest';
import { graficoMedia, graficoRanking } from '../../../src/ui/components/grafico-media.js';
import { ANIO_INICIAL } from '../../../src/core/world.js';

describe('graficoMedia', () => {
  it('con 2 o mas muestras (semanas distintas), dibuja una linea con un punto por muestra', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const svg = nodo.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelectorAll('circle').length).toBe(3);
    expect(svg.querySelector('polyline, path')).toBeTruthy();
  });

  it('el eje X respeta el orden temporal: una semana mas alta cae mas a la derecha (cx mayor)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const circles = [...nodo.querySelectorAll('circle')];
    const cx = circles.map((c) => Number(c.getAttribute('cx')));
    expect(cx[0]).toBeLessThan(cx[1]);
    expect(cx[1]).toBeLessThan(cx[2]);
  });

  it('deduplica muestras de la MISMA semana, quedandose con el ultimo valor (varias decisiones en el mismo instante)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 5, media: 60 }, { semana: 5, media: 63 }, { semana: 20, media: 66 }],
    });
    const circles = [...nodo.querySelectorAll('circle')];
    expect(circles).toHaveLength(2);
    // El title del primer punto (semana 5) tiene que reflejar el ULTIMO
    // valor asignado a esa semana (63), no el primero (60).
    const primerTitulo = circles[0].querySelector('title')?.textContent ?? '';
    expect(primerTitulo).toContain('63');
    expect(primerTitulo).not.toContain('60,');
  });

  it('etiqueta el primer y el ultimo punto con su valor (etiquetado directo selectivo, no todos los puntos)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60.4 }, { semana: 10, media: 65 }, { semana: 30, media: 63.2 }],
    });
    const textos = [...nodo.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(textos.some((t) => t.includes('60'))).toBe(true);
    expect(textos.some((t) => t.includes('63'))).toBe(true);
  });

  it('cada punto trae un titulo (tooltip nativo) con mes y valor', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 30, media: 63 }],
    });
    const titles = [...nodo.querySelectorAll('circle title')];
    expect(titles).toHaveLength(2);
    titles.forEach((t) => expect(t.textContent.length).toBeGreaterThan(0));
  });

  it('trae una lista accesible de respaldo (vista de tabla) con un item por punto', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }, { semana: 30, media: 63 }],
    });
    const lista = nodo.querySelector('.sr-only');
    expect(lista).toBeTruthy();
    expect(lista.querySelectorAll('li')).toHaveLength(3);
  });

  // v9: el fallback de texto para "poco dato" se elimina — el pedido
  // explícito es "el gráfico se muestra SIEMPRE, aunque la media no haya
  // cambiado [...] una línea plana también es información".
  it('con una sola muestra Y año conocido, dibuja una linea PLANA a lo largo de todo el año (nunca texto)', () => {
    const nodo = graficoMedia({ muestras: [{ semana: 5, media: 60 }], anio: ANIO_INICIAL });
    const svg = nodo.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(nodo.querySelector(`.${'grafico-media-vacio'}`)).toBeNull();
    // Un solo dato real: un solo círculo (el dato), pero la línea sigue
    // dibujada de punta a punta del año (ver el test de dominio X, más abajo).
    expect(svg.querySelectorAll('circle').length).toBe(1);
    expect(nodo.textContent).toContain('60');
  });

  it('con una sola muestra y SIN año, igual dibuja un grafico (un punto), nunca texto', () => {
    const nodo = graficoMedia({ muestras: [{ semana: 1, media: 60 }] });
    expect(nodo.querySelector('svg')).toBeTruthy();
    expect(nodo.querySelector('circle')).toBeTruthy();
  });

  it('sin muestras, no revienta (defensivo) — este es el único caso legítimo de texto (no hay NADA que graficar)', () => {
    expect(() => graficoMedia({ muestras: [] })).not.toThrow();
    const nodo = graficoMedia({ muestras: [] });
    expect(nodo.querySelector('svg')).toBeNull();
  });

  it('linea y puntos usan el color dorado del tema (identidad visual gotica-fria, una sola serie)', () => {
    const nodo = graficoMedia({
      muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
    });
    const linea = nodo.querySelector('polyline, path[data-linea]');
    expect(linea.getAttribute('stroke')).toBe('#f2c14e');
  });

  // v8 (bug reportado: "en la captura va de Ene a Mar y queda raro"): con
  // `anio`, el eje X siempre abarca el año calendario COMPLETO (semana 1 a
  // 52 de ese año), nunca se achica al tramo entre la primera y la última
  // muestra — aunque los datos reales solo cubran unos meses.
  describe('dominio X fijo (enero a diciembre) cuando se pasa "anio"', () => {
    it('con datos solo hasta marzo, el ultimo punto NO queda en el borde derecho del grafico', () => {
      // Semana 1 = enero; semana 10 ~ marzo (ver LIMITES_MES, calendario.js).
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
        anio: ANIO_INICIAL,
      });
      const circles = [...nodo.querySelectorAll('circle')];
      const ultimoCx = Number(circles[circles.length - 1].getAttribute('cx'));
      const svg = nodo.querySelector('svg');
      const vbAncho = Number(svg.getAttribute('viewBox').split(' ')[2]);
      // El punto de marzo tiene que quedar bastante antes del borde derecho
      // (el año sigue hasta diciembre) — no pegado a él como pasaba antes.
      expect(ultimoCx).toBeLessThan(vbAncho * 0.5);
    });

    // v9 (bug reportado con captura: "sigue yendo de Ene a Abr, ocupa media
    // caja"): que el DOMINIO abarque el año completo no alcanza si la LÍNEA
    // visible se corta donde termina el dato — el usuario ve una caja vacía
    // del lado derecho. La línea (proyectada, ver más abajo) tiene que llegar
    // de verdad hasta el borde derecho del SVG.
    it('la linea (incluida su proyeccion) llega hasta el borde derecho del grafico, aunque el ultimo dato real sea de marzo', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
        anio: ANIO_INICIAL,
      });
      const lineas = [...nodo.querySelectorAll('polyline')];
      const svg = nodo.querySelector('svg');
      const vbAncho = Number(svg.getAttribute('viewBox').split(' ')[2]);
      const maxX = Math.max(...lineas.flatMap((l) => l.getAttribute('points').split(' ').map((p) => Number(p.split(',')[0]))));
      expect(maxX).toBeGreaterThan(vbAncho - 15);
    });

    it('la linea llega hasta el borde IZQUIERDO del grafico, aunque el primer dato real sea de marzo', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 10, media: 60 }, { semana: 20, media: 65 }],
        anio: ANIO_INICIAL,
      });
      const lineas = [...nodo.querySelectorAll('polyline')];
      const minX = Math.min(...lineas.flatMap((l) => l.getAttribute('points').split(' ').map((p) => Number(p.split(',')[0]))));
      const svg = nodo.querySelector('svg');
      const vbAncho = Number(svg.getAttribute('viewBox').split(' ')[2]);
      // Bien cerca del borde izquierdo del área útil (no a mitad de camino).
      expect(minX).toBeLessThan(vbAncho * 0.15);
    });

    it('el eje X siempre marca los 12 meses del año, no solo el tramo con datos (etiqueta "Ene" y "Dic" presentes)', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
        anio: ANIO_INICIAL,
      });
      const textos = [...nodo.querySelectorAll('svg text')].map((t) => t.textContent);
      expect(textos).toContain('Ene');
      expect(textos).toContain('Dic');
    });

    it('con la media 100% plana durante el año (un solo valor real), la linea/proyeccion sigue yendo de punta a punta', () => {
      const nodo = graficoMedia({ muestras: [{ semana: 20, media: 75 }], anio: ANIO_INICIAL });
      const lineas = [...nodo.querySelectorAll('polyline')];
      expect(lineas.length).toBeGreaterThan(0);
      const svg = nodo.querySelector('svg');
      const vbAncho = Number(svg.getAttribute('viewBox').split(' ')[2]);
      const xs = lineas.flatMap((l) => l.getAttribute('points').split(' ').map((p) => Number(p.split(',')[0])));
      expect(Math.min(...xs)).toBeLessThan(vbAncho * 0.15);
      expect(Math.max(...xs)).toBeGreaterThan(vbAncho * 0.85);
      // Nunca aparece el texto de fallback de antes.
      expect(nodo.textContent).not.toMatch(/estable/i);
    });

    it('sin "anio" (llamador defensivo), se cae al rango dinamico de antes (compatibilidad)', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 10, media: 65 }],
      });
      const circles = [...nodo.querySelectorAll('circle')];
      const ultimoCx = Number(circles[circles.length - 1].getAttribute('cx'));
      const svg = nodo.querySelector('svg');
      const vbAncho = Number(svg.getAttribute('viewBox').split(' ')[2]);
      // Sin año fijo, el último punto vuelve a quedar cerca del borde
      // derecho (el rango es el de los propios datos).
      expect(ultimoCx).toBeGreaterThan(vbAncho * 0.8);
    });
  });

  // v9 (pedido: "faltan el eje Y, con sus valores").
  describe('eje Y (gridlines + valores)', () => {
    it('dibuja al menos 2 valores de referencia del eje Y, como texto (no solo los de los puntos)', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 30, media: 70 }],
        anio: ANIO_INICIAL,
      });
      const svg = nodo.querySelector('svg');
      const lineasGrilla = svg.querySelectorAll('.grafico-linea-grilla, line');
      expect(lineasGrilla.length).toBeGreaterThanOrEqual(2);
    });

    it('los valores del eje Y quedan a la IZQUIERDA del área de dibujo (no flotando sobre los puntos)', () => {
      const nodo = graficoMedia({
        muestras: [{ semana: 1, media: 60 }, { semana: 30, media: 70 }],
        anio: ANIO_INICIAL,
      });
      const svg = nodo.querySelector('svg');
      const grilla = [...svg.querySelectorAll('.grafico-linea-grilla')];
      expect(grilla.length).toBeGreaterThan(0);
      const inicioGrilla = Number(grilla[0].getAttribute('x1'));
      const etiquetasEje = [...svg.querySelectorAll('text')].filter((t) => /^-?\d+(\.\d+)?$/.test(t.textContent.trim()));
      // Al menos una etiqueta numérica del eje vive a la izquierda de donde
      // arranca el área de dibujo (las gridlines), nunca sobre ella.
      expect(etiquetasEje.some((t) => Number(t.getAttribute('x')) < inicioGrilla)).toBe(true);
    });
  });
});

describe('graficoRanking', () => {
  function muestras(over = []) {
    return [{ semana: 1, ranking: 40 }, { semana: 10, ranking: 20 }, { semana: 30, ranking: 5 }, ...over];
  }

  it('dibuja una linea con un punto por muestra (misma forma que graficoMedia)', () => {
    const nodo = graficoRanking({ muestras: muestras(), anio: ANIO_INICIAL });
    const svg = nodo.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.querySelectorAll('circle').length).toBe(3);
    expect(svg.querySelector('polyline')).toBeTruthy();
  });

  // El corazón del pedido: "el ranking es al revés que la media, el puesto 1
  // es lo mejor. Que se lea bien esa inversión" — un puesto MEJOR (numero
  // MAS CHICO) tiene que quedar MAS ARRIBA (cy mas chico) en el SVG, al
  // reves que un valor de media mas alto.
  it('invierte el eje: un puesto MEJOR (numero mas chico) queda MAS ARRIBA (cy mas chico)', () => {
    const nodo = graficoRanking({
      muestras: [{ semana: 1, ranking: 50 }, { semana: 10, ranking: 1 }],
      anio: ANIO_INICIAL,
    });
    const circles = [...nodo.querySelectorAll('circle')];
    const cy = circles.map((c) => Number(c.getAttribute('cy')));
    // El puesto 1 (mejor) tiene un cy MENOR que el puesto 50 (peor): más
    // arriba en el SVG (donde y crece hacia abajo).
    expect(cy[1]).toBeLessThan(cy[0]);
  });

  // v9 (pedido: sacar el cartel "Más arriba, mejor puesto" — la inversión se
  // tiene que entender por el DISEÑO, no por un texto. Acá: los propios
  // valores del eje Y, en orden decreciente de arriba hacia abajo, ya
  // muestran que el número chico (mejor puesto) vive arriba.
  it('el eje Y del ranking muestra los valores en orden DECRECIENTE de arriba hacia abajo (sin necesitar un cartel aparte)', () => {
    const nodo = graficoRanking({
      muestras: [{ semana: 1, ranking: 45 }, { semana: 30, ranking: 5 }],
      anio: ANIO_INICIAL,
    });
    const svg = nodo.querySelector('svg');
    const etiquetas = [...svg.querySelectorAll('text')].filter((t) => /^#\d+$/.test(t.textContent.trim()) && Number(t.getAttribute('x')) < 30);
    expect(etiquetas.length).toBeGreaterThanOrEqual(2);
    const ordenadas = etiquetas
      .map((t) => ({ y: Number(t.getAttribute('y')), valor: Number(t.textContent.replace('#', '')) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < ordenadas.length; i += 1) {
      expect(ordenadas[i].valor).toBeGreaterThanOrEqual(ordenadas[i - 1].valor);
    }
  });

  it('formatea los valores directos como "#N", no un numero pelado', () => {
    const nodo = graficoRanking({ muestras: muestras(), anio: ANIO_INICIAL });
    const textos = [...nodo.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(textos.some((t) => /^#\d+$/.test(t))).toBe(true);
  });

  it('descarta muestras sin ranking (null, partida vieja sin mundo) en vez de romper', () => {
    const nodo = graficoRanking({
      muestras: [
        { semana: 1, ranking: null }, { semana: 10, ranking: 20 }, { semana: 30, ranking: 5 },
      ],
      anio: ANIO_INICIAL,
    });
    expect(() => nodo).not.toThrow();
    expect(nodo.querySelectorAll('circle').length).toBe(2);
  });

  it('con una sola muestra valida Y año conocido, dibuja una linea plana (nunca texto)', () => {
    const nodo = graficoRanking({ muestras: [{ semana: 1, ranking: 12 }], anio: ANIO_INICIAL });
    expect(nodo.querySelector('svg')).toBeTruthy();
    expect(nodo.textContent).toContain('#12');
  });

  it('sin ninguna muestra valida, no revienta (defensivo) y cae a la lectura simple (unico caso legitimo de texto)', () => {
    expect(() => graficoRanking({ muestras: [] })).not.toThrow();
    const nodo = graficoRanking({ muestras: [{ semana: 1, ranking: null }] });
    expect(nodo.querySelector('svg')).toBeNull();
  });

  it('linea y puntos usan el mismo dorado del tema (una sola serie, sin leyenda)', () => {
    const nodo = graficoRanking({ muestras: muestras(), anio: ANIO_INICIAL });
    const linea = nodo.querySelector('polyline');
    expect(linea.getAttribute('stroke')).toBe('#f2c14e');
  });

  it('trae una lista accesible de respaldo, igual que graficoMedia', () => {
    const nodo = graficoRanking({ muestras: muestras(), anio: ANIO_INICIAL });
    const lista = nodo.querySelector('.sr-only');
    expect(lista).toBeTruthy();
    expect(lista.querySelectorAll('li')).toHaveLength(3);
  });
});
