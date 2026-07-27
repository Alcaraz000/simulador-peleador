const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  // Feather/Lucide "shopping-cart" completo: la versión vieja tenía solo la
  // canasta y le faltaban las dos ruedas, así que se veía "cortado" abajo
  // (queja textual del usuario). Con las ruedas, el ícono queda entero.
  tienda: [
    'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
    'M8 21a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M19 21a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  ],
  flecha: ['M9 18l6-6-6-6'],
  guante: ['M7 11V7a2 2 0 0 1 4 0v4', 'M11 11V6a2 2 0 0 1 4 0v5', 'M15 11V8a2 2 0 0 1 4 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-3a2 2 0 0 1 4 0'],
  pesa: ['M6 7v10', 'M18 7v10', 'M3 9v6', 'M21 9v6', 'M6 12h12'],
  corazon: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z'],
  rayo: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  microfono: ['M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z', 'M19 10v1a7 7 0 0 1-14 0v-1', 'M12 19v3'],
  trofeo: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0z', 'M7 6H4v2a3 3 0 0 0 3 3', 'M17 6h3v2a3 3 0 0 1-3 3'],
  alerta: ['M12 2 1 21h22z', 'M12 9v5', 'M12 17h.01'],
  check: ['M20 6 9 17l-5-5'],
  cruz: ['M18 6 6 18', 'M6 6l12 12'],

  // --- Creación del peleador (Task 5.3): un ícono por control/tarjeta ---
  persona: [
    'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8z',
    'M4.5 21a7.5 7.5 0 0 1 15 0',
  ],
  mano: [
    'M18 11V6a2 2 0 0 0-4 0',
    'M14 10V4a2 2 0 0 0-4 0v2',
    'M10 10.5V6a2 2 0 0 0-4 0v8',
    'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
  ],
  etiqueta: [
    'M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z',
    'M7.5 7.5h.01',
  ],
  blanco: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
    'M6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
    'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  ],
  balanza: [
    'M12 3v15',
    'M7 6h10',
    'M4 10l3-4 3 4a3 3 0 0 1-6 0z',
    'M14 10l3-4 3 4a3 3 0 0 1-6 0z',
    'M5 21h14',
  ],
  origen: [
    'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z',
    'M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  ],

  // --- Tienda (Task 5.4): un ícono representativo por item ---
  cerebro: [
    'M12 3a4 4 0 0 0-4 4a3 3 0 0 0-2 5a3 3 0 0 0 2 5a4 4 0 0 0 4 3a4 4 0 0 0 4-3a3 3 0 0 0 2-5a3 3 0 0 0-2-5a4 4 0 0 0-4-4z',
    'M12 3v17',
  ],
  maletin: [
    'M4 7h16a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1z',
    'M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
    'M3 12h18',
  ],
  auto: [
    'M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M3 17v-4l2-5h10l3 5h1a2 2 0 0 1 2 2v2h-2',
    'M9 17h6',
    'M3 13h16',
  ],
  casa: [
    'M4 11.5 12 4l8 7.5',
    'M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9',
  ],
  estrella: [
    'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.6 6.6-.9z',
  ],
  ancla: [
    'M12 3a2 2 0 1 0 0 4a2 2 0 0 0 0-4z',
    'M12 7v14',
    'M7 9h10',
    'M4 14a8 8 0 0 0 16 0',
  ],
  globo: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
    'M3 12h18',
    'M12 3c-3 3-3 15 0 18',
    'M12 3c3 3 3 15 0 18',
  ],

  // Dado (v3): el gesto de "Continuar" a la siguiente decisión — el juego se
  // llama así por algo. Cara de 5: cuadrado + 5 puntos (las esquinas y el
  // centro), cada punto es un segmento de largo ~0 con linecap redondo.
  dado: [
    'M4 4h16v16H4z',
    'M8 8h.01',
    'M16 8h.01',
    'M12 12h.01',
    'M8 16h.01',
    'M16 16h.01',
  ],

  // Lista/ranking (v3): botón "ver tabla" en el bloque de récord/ranking del
  // tablero (feedback del usuario: quiere ver quiénes están arriba y abajo).
  lista: [
    'M8 6h13', 'M8 12h13', 'M8 18h13',
    'M3 6h.01', 'M3 12h.01', 'M3 18h.01',
  ],

  // --- Oferta de pelea (v3): bolsa + nivel de riesgo, pedido textual del
  // usuario ("agregar más iconos: bolsa, riesgo bajo, medio, alto"). ---

  // Billete: la bolsa en juego (tile "Bolsa" de renderOferta).
  billete: [
    'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
    'M6 9v.01', 'M18 15v.01',
  ],

  // Escudo: riesgo bajo (protegido, vas seguro).
  escudo: [
    'M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z',
  ],

  // Medidor: riesgo medio (aguja a mitad de camino).
  medidor: [
    'M4 16a8 8 0 0 1 16 0',
    'M12 16 15.5 11',
    'M12 16h.01',
  ],

  // Peligro (octógono, como un cartel de PARE): riesgo alto, silueta bien
  // distinta del triángulo de "alerta" para que las tres bolsas de riesgo se
  // distingan de un vistazo.
  peligro: [
    'M8.5 2h7L21 6.5v11L15.5 22h-7L2 17.5v-11z',
    'M12 7v6',
    'M12 16h.01',
  ],

  // Cabecera del peleador rearmada (Cambio 3): fila "EDAD | FORMA" — un
  // pulso/latido (Feather/Lucide "activity"), distinto de "corazon" (ya
  // usado en la tienda) para que la forma física se reconozca de un vistazo.
  forma: ['M22 12h-4l-3 9L9 3l-3 9H2'],

  // --- Creación del peleador, v6 (rediseño integral: "que tengan iconos
  // diferenciables"): antes TODAS las tarjetas de un mismo paso (origen,
  // apodo, estilo) compartían un único ícono fijo, así que dentro de la
  // grilla no había forma de distinguirlas a simple vista sin leer el
  // título. Estos 5 son puntuales para ese mapeo por id (ver create.js). ---

  // Reloj (origen "tarde", "Arrancaste tarde"): empezaste después que los
  // demás.
  reloj: ['M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z', 'M12 7v5l3 3'],

  // Monitor viejo (origen "videos_viejos", "VHS y madrugadas").
  monitor: ['M3 4h18v13H3z', 'M8 21h8', 'M12 17v4'],

  // Corona (origen legendario "sangre_de_campeon", "Sangre de campeón").
  corona: [
    'M4 19h16',
    'M4 19 3 8l5 4.5L12 5l4 7.5 5-4.5-1 11z',
  ],

  // Viento (estilo "volante": velocidad y juego de piernas). Mismas 3 líneas
  // del ícono "wind" de Feather/Lucide.
  viento: [
    'M12.8 19.6a2 2 0 1 0 1.2-3.6H2',
    'M17.5 8a2.5 2.5 0 1 1 2 4H2',
    'M9.8 4.4a2 2 0 1 1 1.2 3.6H2',
  ],

  // Cruce/intercambio (estilo "zurdo_cruzado": la guardia cambiada). Mismas
  // 4 líneas del ícono "repeat" de Feather/Lucide — dos flechas que se
  // cruzan en direcciones opuestas.
  cruce: [
    'M17 2l4 4-4 4',
    'M3 11v-1a4 4 0 0 1 4-4h14',
    'M7 22l-4-4 4-4',
    'M21 13v1a4 4 0 0 1-4 4H3',
  ],

  // Resumen de fin de año (v7): tendencia ascendente (Feather/Lucide
  // "trending-up") — el ícono de la cabecera del resumen.
  grafico: ['M23 6 13.5 15.5 8.5 10.5 1 18', 'M17 6h6v6'],
};

export function icono(nombre, { tamano = 18, color = 'currentColor' } = {}) {
  const paths = PATHS[nombre];
  if (!paths) throw new Error(`Ícono desconocido: ${nombre}`);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(tamano));
  svg.setAttribute('height', String(tamano));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color);
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  for (const d of paths) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
