export function el(tag, props = {}, hijos = null) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'html') nodo.innerHTML = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave === 'onClick') nodo.addEventListener('click', valor);
    else nodo.setAttribute(clave, valor);
  }
  agregar(nodo, hijos);
  return nodo;
}

function agregar(nodo, hijos) {
  if (hijos === null || hijos === undefined) return;
  const lista = Array.isArray(hijos) ? hijos : [hijos];
  for (const hijo of lista) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.appendChild(typeof hijo === 'string' || typeof hijo === 'number'
      ? document.createTextNode(String(hijo))
      : hijo);
  }
}

export function clear(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

export function mount(contenedor, ...nodos) {
  clear(contenedor);
  agregar(contenedor, nodos);
  return contenedor;
}

export function fmtDinero(n) {
  const valor = Math.round(n);
  if (Math.abs(valor) >= 1000000) {
    return `US$ ${(valor / 1000000).toFixed(1).replace('.', ',').replace(',0', '')}M`;
  }
  if (Math.abs(valor) >= 1000) return `US$ ${Math.round(valor / 1000)}K`;
  return `US$ ${valor}`;
}

export function fmtDelta(n) {
  return n > 0 ? `+${n}` : String(n);
}
