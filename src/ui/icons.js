const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  tienda: ['M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6'],
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
