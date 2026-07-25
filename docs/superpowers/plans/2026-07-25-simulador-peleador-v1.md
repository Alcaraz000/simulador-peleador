# SimuladorPeleador v1 — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la rebanada jugable (v1) de un simulador de carrera de deportes de combate: una carrera completa de ~15 a ~39 años, jugable en una sentada, con motor de tarjetas, peleas round-por-round, 6 minijuegos y pantalla de legado.

**Architecture:** Núcleo de lógica puro en `src/core/` (funciones sin efectos secundarios, todo el azar inyectado vía un RNG con semilla) más una capa fina de render DOM en `src/ui/`. El estado de la carrera es un único objeto serializable; cada "beat" jugable lo transforma y se autoguarda en `localStorage`. La pelea es una máquina de estados que se avanza round por round, lo que permite intercalar los minijuegos interactivos.

**Tech Stack:** JavaScript puro (módulos ES nativos), Vite (dev server + build estático), Vitest (tests), happy-dom (tests de UI). Sin frameworks, sin dependencias nativas, sin paso de compilación obligatorio.

**Spec:** `docs/superpowers/specs/2026-07-24-simulador-carrera-peleador-design.md`

## Global Constraints

- **Sin backend, sin cuentas.** 100% del lado del cliente; guardado en `localStorage`. Publicable como sitio estático por link.
- **Sin dependencias nativas.** Solo librerías JS puras (el usuario no tiene Visual Studio Build Tools). Nada que requiera compilación en `npm install`.
- **Sin emojis en la UI.** Íconos SVG inline estilo Lucide, definidos en `src/ui/icons.js`.
- **Paleta "Sangre y gloria"** (valores exactos, en `theme.css` como tokens): fondo `#0d0708`, superficie `#140b0c`, superficie elevada `#160c0d`, borde `#241416`, borde fuerte `#3a1e20`, acento rojo `#ef4444`, acento dorado `#f2c14e`, positivo verde `#8fd694`, texto `#f1e2e2`, texto atenuado `#b08a8a`, texto sutil `#8a6a6a`.
- **Tipografía condensada en mayúsculas** para títulos y etiquetas; `font-family: 'Bahnschrift', 'Segoe UI', system-ui, sans-serif`.
- **Mobile-first.** Ancho de contenido máximo `430px` centrado; debe funcionar en celular y computadora.
- **Números claros a la vista** (cifras exactas, no barras vagas), con flecha `▲` cuando un atributo sube.
- **Voz argentina/latina, tono realista con humor.** Textos verosímiles, sin eventos absurdos.
- **Todo el azar pasa por el RNG con semilla** (`createRng`). Ninguna función de `src/core/` llama a `Math.random()` directamente. Los tests dependen de esto.
- **v1:** disciplinas Boxeo y MMA; género masculino; categorías Pluma y Mediano.
- **Nomenclatura para evitar colisión:** el campo `disciplina` del peleador es el deporte (`'boxeo' | 'mma'`). El atributo especial "Disciplina" (constancia personal) se llama `disciplinaPersonal` en el código y se muestra como "DISCIPLINA" en la UI.
- **Commits frecuentes**, uno por tarea como mínimo, con mensaje en español.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Único documento; monta `#app` y carga `src/main.js`. |
| `package.json` | Scripts `dev`, `build`, `test`. Solo devDeps. |
| `src/main.js` | Bootstrap: carga/crea partida, enrutador por estado, autoguardado. |
| `src/core/rng.js` | RNG con semilla (mulberry32) y helpers de azar. |
| `src/core/stats.js` | Atributos, MEDIA, estado (forma/fatiga/moral), aplicación de modificadores. |
| `src/core/disciplines.js` | Boxeo y MMA: pesos de atributos, desenlaces posibles, rounds. |
| `src/core/styles.js` | Estilos/builds, sus modificadores y la tabla de cruces. |
| `src/core/fighter.js` | Creación del peleador, categorías de peso, físico. |
| `src/core/roster.js` | Generación de rivales de categoría + carga del elenco de parodias. |
| `src/core/world.js` | Mundo vivo: simulación de rivales, rankings, retiros. |
| `src/core/rivalry.js` | Rivalidades, head-to-head, emergencia del archirrival. |
| `src/core/fight.js` | Máquina de estados de la pelea (rounds, daño, desenlaces). |
| `src/core/fight-interactive.js` | Enganches interactivos: rincón entre rounds, golpe de gracia. |
| `src/core/injuries.js` | Lesiones: aparición, severidad, recuperación. |
| `src/core/offers.js` | Ofertas de pelea, títulos, defensas obligatorias. |
| `src/core/negotiation.js` | Minijuego de negociación de bolsa (push your luck). |
| `src/core/money.js` | Economía: bolsas, sponsors, compras de staff y lujos. |
| `src/core/cards.js` | Motor genérico de tarjetas: elegir, aplicar efectos, encadenar. |
| `src/core/presser.js` | Minijuego de careo: hype, ventaja mental, tells del rival. |
| `src/core/sparring.js` | Minijuego de sparring/reflejos. |
| `src/core/news.js` | Generación de titulares desde plantillas. |
| `src/core/career.js` | Máquina de la carrera: etapas, bloques, cola de beats. |
| `src/core/save.js` | Serializar/deserializar en `localStorage` con versión de esquema. |
| `src/core/legacy.js` | Cálculo de legados y biografía generada. |
| `src/content/names.js` | Nombres, apodos, nacionalidades, gimnasios. |
| `src/content/parodies.js` | Elenco fijo de parodias de íconos. |
| `src/content/cards-improve.js` | Cartas de mejora escritas a mano. |
| `src/content/cards-events.js` | Decisiones, eventos aleatorios y vida personal. |
| `src/content/cards-social.js` | Cartas de posteo en redes. |
| `src/content/cards-presser.js` | Preguntas y respuestas de careo. |
| `src/content/news-templates.js` | Plantillas de noticias. |
| `src/content/fight-lines.js` | Líneas narrativas de pelea por round. |
| `src/ui/dom.js` | Helpers de DOM (`el`, `on`, `mount`, `clear`). |
| `src/ui/icons.js` | Íconos SVG inline. |
| `src/ui/theme.css` | Tokens de la paleta, tipografía, layout, componentes base. |
| `src/ui/screens/*.js` | Una pantalla por archivo (ver tareas 21-24). |
| `tests/**` | Espejo de `src/core/` y `src/ui/`. |

---

## Task 1: Setup del proyecto

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `tests/setup.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: proyecto ejecutable con `npm test`, `npm run dev`, `npm run build`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/setup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/main.js';

describe('setup', () => {
  it('expone la version del juego', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
```

- [ ] **Step 2: Crear `package.json`**

```json
{
  "name": "simulador-peleador",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "happy-dom": "^15.11.6",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Crear `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/ui/**', 'happy-dom']],
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 4: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Simulador de Carrera</title>
    <link rel="stylesheet" href="/src/ui/theme.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `src/main.js` mínimo**

```js
export const VERSION = '0.1.0';
```

- [ ] **Step 6: Crear `src/ui/theme.css` vacío (placeholder para que `index.html` no falle)**

```css
/* Los tokens reales se definen en la Task 20. */
```

- [ ] **Step 7: Instalar y correr el test**

Run: `npm install && npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Verificar que `.gitignore` cubre `node_modules/` y `dist/`**

El `.gitignore` ya existe con `node_modules/`, `dist/` y `.superpowers/`. Confirmar con `git status --short` que no aparece `node_modules`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.js index.html src/main.js src/ui/theme.css tests/setup.test.js
git commit -m "chore: scaffolding del proyecto con Vite y Vitest"
```

---

## Task 2: RNG determinista

**Files:**
- Create: `src/core/rng.js`
- Test: `tests/core/rng.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `createRng(seed: number|string) → Rng`, donde `Rng` tiene:
  - `next(): number` — float en [0,1)
  - `int(min: number, max: number): number` — entero inclusivo
  - `float(min: number, max: number): number`
  - `chance(p: number): boolean` — `p` en [0,1]
  - `pick<T>(arr: T[]): T`
  - `weighted<T>(entries: Array<{valor: T, peso: number}>): T`
  - `shuffle<T>(arr: T[]): T[]` — copia nueva
  - `seed: number` — semilla original, serializable
  - `estado(): number` — contador interno, para guardar/restaurar
  - `restaurar(estado: number): void`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/core/rng.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';

describe('createRng', () => {
  it('es determinista para la misma semilla', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('da secuencias distintas para semillas distintas', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('acepta semilla de texto', () => {
    const a = createRng('pelea');
    const b = createRng('pelea');
    expect(a.next()).toBe(b.next());
  });

  it('next devuelve floats en [0,1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int respeta los limites inclusive', () => {
    const rng = createRng(9);
    const vistos = new Set();
    for (let i = 0; i < 400; i++) vistos.add(rng.int(1, 3));
    expect([...vistos].sort()).toEqual([1, 2, 3]);
  });

  it('chance(0) es siempre falso y chance(1) siempre verdadero', () => {
    const rng = createRng(4);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick devuelve un elemento del arreglo', () => {
    const rng = createRng(11);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
  });

  it('weighted favorece el peso mayor', () => {
    const rng = createRng(5);
    let altos = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.weighted([{ valor: 'alto', peso: 9 }, { valor: 'bajo', peso: 1 }]) === 'alto') altos++;
    }
    expect(altos).toBeGreaterThan(800);
  });

  it('weighted ignora pesos cero', () => {
    const rng = createRng(6);
    for (let i = 0; i < 50; i++) {
      expect(rng.weighted([{ valor: 'si', peso: 1 }, { valor: 'no', peso: 0 }])).toBe('si');
    }
  });

  it('shuffle no muta el original y conserva los elementos', () => {
    const rng = createRng(8);
    const original = [1, 2, 3, 4, 5];
    const copia = [...original];
    const mezclado = rng.shuffle(original);
    expect(original).toEqual(copia);
    expect([...mezclado].sort()).toEqual(copia);
  });

  it('se puede guardar y restaurar el estado', () => {
    const rng = createRng(42);
    rng.next();
    rng.next();
    const guardado = rng.estado();
    const esperado = [rng.next(), rng.next()];
    rng.restaurar(guardado);
    expect([rng.next(), rng.next()]).toEqual(esperado);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/rng.test.js`
Expected: FAIL — no se puede resolver `../../src/core/rng.js`.

- [ ] **Step 3: Implementar `src/core/rng.js`**

```js
/**
 * RNG determinista con semilla (mulberry32).
 * Todo el azar del juego pasa por acá: hace las partidas reproducibles
 * y los tests estables.
 */

function semillaDesdeTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(semilla) {
  const base = typeof semilla === 'string' ? semillaDesdeTexto(semilla) : (semilla >>> 0);
  let estadoInterno = base;

  function next() {
    estadoInterno = (estadoInterno + 0x6d2b79f5) >>> 0;
    let t = estadoInterno;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng = {
    seed: base,
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(entries) {
      const total = entries.reduce((acc, e) => acc + Math.max(0, e.peso), 0);
      if (total <= 0) return entries[0].valor;
      let tirada = next() * total;
      for (const e of entries) {
        tirada -= Math.max(0, e.peso);
        if (tirada < 0) return e.valor;
      }
      return entries[entries.length - 1].valor;
    },
    shuffle(arr) {
      const copia = [...arr];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
    estado: () => estadoInterno,
    restaurar(valor) {
      estadoInterno = valor >>> 0;
    },
  };

  return rng;
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/rng.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/rng.js tests/core/rng.test.js
git commit -m "feat: RNG determinista con semilla"
```

---

## Task 3: Atributos, MEDIA y estado

**Files:**
- Create: `src/core/stats.js`
- Test: `tests/core/stats.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `ATRIBUTOS: string[]` = `['potencia','velocidad','tecnica','defensa','cardio','iq','grappling']`
  - `ETIQUETAS: Record<string,{corta:string,larga:string}>` — etiquetas de UI (`POT`/`Potencia`, etc.), incluye `disciplinaPersonal` y `menton`.
  - `crearAtributos(valores?: object): object` — todos los atributos, default 40, clamp 1..99.
  - `crearEstado(): {forma:number, fatiga:number, moral:number, lesion:null|object}` — forma 60, fatiga 10, moral 60.
  - `clamp(valor:number, min:number, max:number): number`
  - `calcularMedia(atributos: object, pesos: object): number` — entero.
  - `aplicarModificadores(objetivo: object, mods: object): {resultado: object, deltas: object}` — no muta; clampea 1..99 para atributos y 0..100 para estado.
  - `etiquetaEstado(nombre:string, valor:number): string` — texto tipo `EN PUNTO` / `NORMAL` / `OXIDADO`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/core/stats.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  ATRIBUTOS, ETIQUETAS, crearAtributos, crearEstado, clamp,
  calcularMedia, aplicarModificadores, etiquetaEstado,
} from '../../src/core/stats.js';

describe('atributos', () => {
  it('define los siete atributos', () => {
    expect(ATRIBUTOS).toEqual(['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq', 'grappling']);
  });

  it('tiene etiqueta corta y larga para cada atributo y especial', () => {
    for (const clave of [...ATRIBUTOS, 'disciplinaPersonal', 'menton']) {
      expect(ETIQUETAS[clave].corta).toBeTruthy();
      expect(ETIQUETAS[clave].larga).toBeTruthy();
    }
  });

  it('crearAtributos arranca en 40 y acepta overrides', () => {
    const a = crearAtributos({ potencia: 70 });
    expect(a.potencia).toBe(70);
    expect(a.cardio).toBe(40);
  });

  it('crearAtributos clampea entre 1 y 99', () => {
    const a = crearAtributos({ potencia: 200, cardio: -5 });
    expect(a.potencia).toBe(99);
    expect(a.cardio).toBe(1);
  });

  it('crearEstado arranca con valores sanos y sin lesion', () => {
    expect(crearEstado()).toEqual({ forma: 60, fatiga: 10, moral: 60, lesion: null });
  });
});

describe('clamp', () => {
  it('acota por arriba y por abajo', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe('calcularMedia', () => {
  it('promedia segun los pesos y devuelve entero', () => {
    const atributos = crearAtributos({ potencia: 80, velocidad: 60 });
    const media = calcularMedia(atributos, { potencia: 0.5, velocidad: 0.5 });
    expect(media).toBe(70);
  });

  it('ignora atributos sin peso', () => {
    const atributos = crearAtributos({ potencia: 80, grappling: 99 });
    expect(calcularMedia(atributos, { potencia: 1 })).toBe(80);
  });
});

describe('aplicarModificadores', () => {
  it('suma modificadores sin mutar el original', () => {
    const base = crearAtributos({ potencia: 50 });
    const { resultado, deltas } = aplicarModificadores(base, { potencia: 3 });
    expect(base.potencia).toBe(50);
    expect(resultado.potencia).toBe(53);
    expect(deltas.potencia).toBe(3);
  });

  it('clampea atributos en 99 y reporta el delta real', () => {
    const base = crearAtributos({ potencia: 98 });
    const { resultado, deltas } = aplicarModificadores(base, { potencia: 5 });
    expect(resultado.potencia).toBe(99);
    expect(deltas.potencia).toBe(1);
  });

  it('clampea estado entre 0 y 100', () => {
    const estado = crearEstado();
    const { resultado } = aplicarModificadores(estado, { forma: 999, fatiga: -999 }, { min: 0, max: 100 });
    expect(resultado.forma).toBe(100);
    expect(resultado.fatiga).toBe(0);
  });

  it('ignora claves que no existen en el objetivo', () => {
    const base = crearAtributos();
    const { resultado } = aplicarModificadores(base, { inventado: 10 });
    expect(resultado.inventado).toBeUndefined();
  });
});

describe('etiquetaEstado', () => {
  it('describe la forma en palabras', () => {
    expect(etiquetaEstado('forma', 90)).toBe('EN PUNTO');
    expect(etiquetaEstado('forma', 55)).toBe('NORMAL');
    expect(etiquetaEstado('forma', 20)).toBe('OXIDADO');
  });

  it('describe la fatiga al reves que la forma', () => {
    expect(etiquetaEstado('fatiga', 85)).toBe('FUNDIDO');
    expect(etiquetaEstado('fatiga', 15)).toBe('ENTERO');
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/stats.test.js`
Expected: FAIL — no se puede resolver `../../src/core/stats.js`.

- [ ] **Step 3: Implementar `src/core/stats.js`**

```js
export const ATRIBUTOS = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq', 'grappling'];

export const ETIQUETAS = {
  potencia: { corta: 'POT', larga: 'Potencia' },
  velocidad: { corta: 'VEL', larga: 'Velocidad' },
  tecnica: { corta: 'TÉC', larga: 'Técnica' },
  defensa: { corta: 'DEF', larga: 'Defensa' },
  cardio: { corta: 'CAR', larga: 'Cardio' },
  iq: { corta: 'IQ', larga: 'IQ de pelea' },
  grappling: { corta: 'GRA', larga: 'Grappling' },
  disciplinaPersonal: { corta: 'DIS', larga: 'Disciplina' },
  menton: { corta: 'MEN', larga: 'Mentón' },
};

export const LIMITES_ATRIBUTO = { min: 1, max: 99 };
export const LIMITES_ESTADO = { min: 0, max: 100 };

export function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

export function crearAtributos(valores = {}) {
  const salida = {};
  for (const clave of ATRIBUTOS) {
    const bruto = valores[clave] ?? 40;
    salida[clave] = clamp(Math.round(bruto), LIMITES_ATRIBUTO.min, LIMITES_ATRIBUTO.max);
  }
  return salida;
}

export function crearEstado() {
  return { forma: 60, fatiga: 10, moral: 60, lesion: null };
}

export function calcularMedia(atributos, pesos) {
  let suma = 0;
  let pesoTotal = 0;
  for (const [clave, peso] of Object.entries(pesos)) {
    if (typeof atributos[clave] !== 'number' || peso <= 0) continue;
    suma += atributos[clave] * peso;
    pesoTotal += peso;
  }
  if (pesoTotal === 0) return 0;
  return Math.round(suma / pesoTotal);
}

export function aplicarModificadores(objetivo, mods, limites = LIMITES_ATRIBUTO) {
  const resultado = { ...objetivo };
  const deltas = {};
  for (const [clave, delta] of Object.entries(mods)) {
    if (typeof resultado[clave] !== 'number') continue;
    const antes = resultado[clave];
    const despues = clamp(antes + delta, limites.min, limites.max);
    resultado[clave] = despues;
    if (despues !== antes) deltas[clave] = despues - antes;
  }
  return { resultado, deltas };
}

const ESCALAS = {
  forma: [[80, 'EN PUNTO'], [40, 'NORMAL'], [0, 'OXIDADO']],
  moral: [[80, 'ENCENDIDO'], [40, 'ESTABLE'], [0, 'BAJONEADO']],
  fatiga: [[80, 'FUNDIDO'], [50, 'CANSADO'], [25, 'LIVIANO'], [0, 'ENTERO']],
};

export function etiquetaEstado(nombre, valor) {
  const escala = ESCALAS[nombre];
  if (!escala) return String(valor);
  for (const [umbral, etiqueta] of escala) {
    if (valor >= umbral) return etiqueta;
  }
  return escala[escala.length - 1][1];
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/stats.test.js`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/stats.js tests/core/stats.test.js
git commit -m "feat: atributos, MEDIA y estado del peleador"
```

---

## Task 4: Disciplinas y estilos de pelea

**Files:**
- Create: `src/core/disciplines.js`
- Create: `src/core/styles.js`
- Test: `tests/core/disciplines.test.js`
- Test: `tests/core/styles.test.js`

**Interfaces:**
- Consumes: `ATRIBUTOS` de `src/core/stats.js`.
- Produces (`disciplines.js`):
  - `DISCIPLINAS: Record<'boxeo'|'mma', Disciplina>` donde `Disciplina` = `{ id, nombre, usaGrappling: boolean, pesos: object, desenlaces: string[], roundsPorNivel: {amateur:number, profesional:number, titulo:number} }`
  - `getDisciplina(id: string): Disciplina` — tira error si no existe.
  - `pesosDe(id: string): object`
- Produces (`styles.js`):
  - `ESTILOS: Record<string, Estilo>` con ids `noqueador`, `tecnico`, `grappler`, `menton`; `Estilo` = `{ id, nombre, descripcion, disciplinas: string[], mods: object, fuerteContra: string[], debilContra: string[] }`
  - `estilosDisponibles(disciplinaId: string): Estilo[]`
  - `ventajaDeEstilo(estiloA: string, estiloB: string): number` — `+0.06`, `-0.06` o `0`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/core/disciplines.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DISCIPLINAS, getDisciplina, pesosDe } from '../../src/core/disciplines.js';

describe('disciplinas', () => {
  it('define boxeo y mma', () => {
    expect(Object.keys(DISCIPLINAS).sort()).toEqual(['boxeo', 'mma']);
  });

  it('boxeo no usa grappling y mma si', () => {
    expect(DISCIPLINAS.boxeo.usaGrappling).toBe(false);
    expect(DISCIPLINAS.mma.usaGrappling).toBe(true);
  });

  it('boxeo no le da peso al grappling', () => {
    expect(pesosDe('boxeo').grappling ?? 0).toBe(0);
  });

  it('mma le da peso al grappling', () => {
    expect(pesosDe('mma').grappling).toBeGreaterThan(0);
  });

  it('los pesos de cada disciplina suman 1', () => {
    for (const disciplina of Object.values(DISCIPLINAS)) {
      const suma = Object.values(disciplina.pesos).reduce((a, b) => a + b, 0);
      expect(suma).toBeCloseTo(1, 5);
    }
  });

  it('solo mma admite sumision', () => {
    expect(DISCIPLINAS.mma.desenlaces).toContain('sumision');
    expect(DISCIPLINAS.boxeo.desenlaces).not.toContain('sumision');
  });

  it('las peleas de titulo tienen mas rounds que las amateur', () => {
    for (const disciplina of Object.values(DISCIPLINAS)) {
      expect(disciplina.roundsPorNivel.titulo).toBeGreaterThan(disciplina.roundsPorNivel.amateur);
    }
  });

  it('getDisciplina tira error con un id desconocido', () => {
    expect(() => getDisciplina('karate')).toThrow(/karate/);
  });
});
```

Crear `tests/core/styles.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { ESTILOS, estilosDisponibles, ventajaDeEstilo } from '../../src/core/styles.js';

describe('estilos', () => {
  it('define los cuatro estilos de la v1', () => {
    expect(Object.keys(ESTILOS).sort()).toEqual(['grappler', 'menton', 'noqueador', 'tecnico']);
  });

  it('el grappler es exclusivo de mma', () => {
    expect(ESTILOS.grappler.disciplinas).toEqual(['mma']);
    expect(estilosDisponibles('boxeo').map((e) => e.id)).not.toContain('grappler');
    expect(estilosDisponibles('mma').map((e) => e.id)).toContain('grappler');
  });

  it('boxeo ofrece tres estilos', () => {
    expect(estilosDisponibles('boxeo')).toHaveLength(3);
  });

  it('cada estilo tiene al menos un bonus y un malus', () => {
    for (const estilo of Object.values(ESTILOS)) {
      const valores = Object.values(estilo.mods);
      expect(valores.some((v) => v > 0)).toBe(true);
      expect(valores.some((v) => v < 0)).toBe(true);
    }
  });

  it('la ventaja de estilo es simetrica', () => {
    expect(ventajaDeEstilo('tecnico', 'noqueador')).toBeCloseTo(0.06, 5);
    expect(ventajaDeEstilo('noqueador', 'tecnico')).toBeCloseTo(-0.06, 5);
  });

  it('no hay ventaja contra el mismo estilo', () => {
    expect(ventajaDeEstilo('noqueador', 'noqueador')).toBe(0);
  });

  it('devuelve 0 con estilos desconocidos', () => {
    expect(ventajaDeEstilo('inventado', 'noqueador')).toBe(0);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/disciplines.test.js tests/core/styles.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/core/disciplines.js`**

```js
export const DISCIPLINAS = {
  boxeo: {
    id: 'boxeo',
    nombre: 'Boxeo',
    usaGrappling: false,
    pesos: { potencia: 0.20, velocidad: 0.18, tecnica: 0.20, defensa: 0.17, cardio: 0.13, iq: 0.12 },
    desenlaces: ['ko', 'tko', 'decision', 'descalificacion'],
    roundsPorNivel: { amateur: 3, profesional: 8, titulo: 12 },
  },
  mma: {
    id: 'mma',
    nombre: 'MMA',
    usaGrappling: true,
    pesos: { potencia: 0.16, velocidad: 0.14, tecnica: 0.16, defensa: 0.13, cardio: 0.13, iq: 0.12, grappling: 0.16 },
    desenlaces: ['ko', 'tko', 'sumision', 'decision', 'descalificacion'],
    roundsPorNivel: { amateur: 3, profesional: 3, titulo: 5 },
  },
};

export function getDisciplina(id) {
  const disciplina = DISCIPLINAS[id];
  if (!disciplina) throw new Error(`Disciplina desconocida: ${id}`);
  return disciplina;
}

export function pesosDe(id) {
  return getDisciplina(id).pesos;
}
```

- [ ] **Step 4: Implementar `src/core/styles.js`**

```js
export const ESTILOS = {
  noqueador: {
    id: 'noqueador',
    nombre: 'Noqueador',
    descripcion: 'Una mano y se termina. Peligroso temprano, se funde tarde.',
    disciplinas: ['boxeo', 'mma'],
    mods: { potencia: 7, menton: 2, cardio: -4, tecnica: -3 },
    fuerteContra: ['grappler'],
    debilContra: ['tecnico'],
  },
  tecnico: {
    id: 'tecnico',
    nombre: 'Técnico',
    descripcion: 'Preciso y escurridizo. Gana por puntos y desgaste.',
    disciplinas: ['boxeo', 'mma'],
    mods: { tecnica: 6, defensa: 4, velocidad: 2, potencia: -5, menton: -2 },
    fuerteContra: ['noqueador'],
    debilContra: ['menton'],
  },
  grappler: {
    id: 'grappler',
    nombre: 'Grappler',
    descripcion: '控 controla, lleva al piso y busca la sumisión.',
    disciplinas: ['mma'],
    mods: { grappling: 9, cardio: 3, velocidad: -3, potencia: -3 },
    fuerteContra: ['menton'],
    debilContra: ['noqueador'],
  },
  menton: {
    id: 'menton',
    nombre: 'Mentón de hierro',
    descripcion: 'Aguanta todo y quiebra al rival en rounds largos.',
    disciplinas: ['boxeo', 'mma'],
    mods: { menton: 9, cardio: 5, velocidad: -4, tecnica: -3 },
    fuerteContra: ['tecnico'],
    debilContra: ['grappler'],
  },
};

export const VENTAJA_ESTILO = 0.06;

export function estilosDisponibles(disciplinaId) {
  return Object.values(ESTILOS).filter((e) => e.disciplinas.includes(disciplinaId));
}

export function ventajaDeEstilo(estiloA, estiloB) {
  const a = ESTILOS[estiloA];
  if (!a || !ESTILOS[estiloB] || estiloA === estiloB) return 0;
  if (a.fuerteContra.includes(estiloB)) return VENTAJA_ESTILO;
  if (a.debilContra.includes(estiloB)) return -VENTAJA_ESTILO;
  return 0;
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/disciplines.test.js tests/core/styles.test.js`
Expected: PASS (15 tests).

- [ ] **Step 6: Corregir el caracter suelto en la descripcion del grappler**

En `src/core/styles.js`, la descripción del grappler debe ser exactamente:

```js
    descripcion: 'Controla, lleva al piso y busca la sumisión.',
```

Run: `npx vitest run tests/core/styles.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/disciplines.js src/core/styles.js tests/core/disciplines.test.js tests/core/styles.test.js
git commit -m "feat: disciplinas (boxeo/MMA) y estilos de pelea con cruces"
```

---

## Task 5: Creación del peleador

**Files:**
- Create: `src/content/names.js`
- Create: `src/core/fighter.js`
- Test: `tests/core/fighter.test.js`

**Interfaces:**
- Consumes: `crearAtributos`, `crearEstado`, `calcularMedia`, `aplicarModificadores` de `stats.js`; `getDisciplina`, `pesosDe` de `disciplines.js`; `ESTILOS`, `estilosDisponibles` de `styles.js`; `createRng` de `rng.js`.
- Produces (`names.js`): `NOMBRES: string[]`, `APELLIDOS: string[]`, `APODOS: string[]`, `NACIONALIDADES: Array<{codigo,nombre,gentilicio}>`, `GIMNASIOS: string[]`.
- Produces (`fighter.js`):
  - `CATEGORIAS: Record<'pluma'|'mediano', {id,nombre,pesoMin,pesoMax,alturaMedia}>`
  - `ORIGENES: Array<{id,nombre,descripcion,mods}>` — 4 orígenes/infancias.
  - `crearPeleador(opciones): Peleador` — opciones: `{nombre, apodo, nacionalidad, disciplina, estilo, categoria, mano, altura, alcance, origen, esJugador?, edad?}`.
  - `peleadorAleatorio(rng, opciones?): Peleador`
  - `mediaDe(peleador): number`
  - `recordTexto(peleador): string` — `'9-3'` o `'9-3-1'`.

`Peleador` (forma exacta, todo serializable):

```js
{
  id: string,
  esJugador: boolean,
  nombre: string, apodo: string, nacionalidad: string,
  disciplina: 'boxeo'|'mma', estilo: string, categoria: 'pluma'|'mediano',
  mano: 'derecha'|'zurda', altura: number, alcance: number, origen: string,
  edad: number,
  atributos: object,               // los 7 de ATRIBUTOS
  especiales: { disciplinaPersonal: number, menton: number },
  estado: { forma, fatiga, moral, lesion },
  record: { v: number, d: number, e: number, ko: number, sub: number, dec: number },
  dinero: number, fama: number,
  titulos: string[], defensas: number,
  ranking: number|null,
  gimnasio: string,
  staff: string[], lujos: string[],
  historial: Array<object>,        // peleas, se llena en Task 8
  retirado: boolean,
  personalidad: string,            // se asigna en Task 6 para rivales
}
```

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/core/fighter.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio, mediaDe, recordTexto,
} from '../../src/core/fighter.js';
import { ESTILOS } from '../../src/core/styles.js';

const base = {
  nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR',
  disciplina: 'boxeo', estilo: 'noqueador', categoria: 'pluma',
  mano: 'zurda', altura: 172, alcance: 178, origen: 'barrio',
};

describe('categorias', () => {
  it('define pluma y mediano', () => {
    expect(Object.keys(CATEGORIAS).sort()).toEqual(['mediano', 'pluma']);
  });

  it('pluma pesa menos que mediano', () => {
    expect(CATEGORIAS.pluma.pesoMax).toBeLessThan(CATEGORIAS.mediano.pesoMin);
  });
});

describe('crearPeleador', () => {
  it('arma un peleador con la forma esperada', () => {
    const p = crearPeleador({ ...base, esJugador: true });
    expect(p.esJugador).toBe(true);
    expect(p.nombre).toBe('Lucas Ortiz');
    expect(p.edad).toBe(15);
    expect(p.record).toEqual({ v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 });
    expect(p.retirado).toBe(false);
    expect(p.especiales.menton).toBeGreaterThan(0);
    expect(p.estado.lesion).toBeNull();
  });

  it('genera un id unico', () => {
    const a = crearPeleador(base);
    const b = crearPeleador(base);
    expect(a.id).not.toBe(b.id);
  });

  it('aplica los modificadores del estilo', () => {
    const noqueador = crearPeleador({ ...base, estilo: 'noqueador' });
    const tecnico = crearPeleador({ ...base, estilo: 'tecnico' });
    expect(noqueador.atributos.potencia).toBeGreaterThan(tecnico.atributos.potencia);
    expect(tecnico.atributos.tecnica).toBeGreaterThan(noqueador.atributos.tecnica);
  });

  it('aplica los modificadores del origen', () => {
    const conMods = ORIGENES.find((o) => Object.keys(o.mods).length > 0);
    expect(conMods).toBeTruthy();
  });

  it('rechaza un estilo que no corresponde a la disciplina', () => {
    expect(() => crearPeleador({ ...base, disciplina: 'boxeo', estilo: 'grappler' })).toThrow(/grappler/);
  });

  it('rechaza una categoria desconocida', () => {
    expect(() => crearPeleador({ ...base, categoria: 'pesado' })).toThrow(/pesado/);
  });

  it('en boxeo el grappling queda en el minimo', () => {
    const p = crearPeleador(base);
    expect(p.atributos.grappling).toBe(1);
  });

  it('en mma el grappling arranca util', () => {
    const p = crearPeleador({ ...base, disciplina: 'mma', estilo: 'grappler' });
    expect(p.atributos.grappling).toBeGreaterThan(30);
  });
});

describe('peleadorAleatorio', () => {
  it('es determinista con la misma semilla', () => {
    const a = peleadorAleatorio(createRng(5));
    const b = peleadorAleatorio(createRng(5));
    expect(a.nombre).toBe(b.nombre);
    expect(a.atributos).toEqual(b.atributos);
  });

  it('respeta las opciones forzadas', () => {
    const p = peleadorAleatorio(createRng(3), { disciplina: 'mma', categoria: 'mediano' });
    expect(p.disciplina).toBe('mma');
    expect(p.categoria).toBe('mediano');
    expect(ESTILOS[p.estilo].disciplinas).toContain('mma');
  });

  it('acepta un nivel objetivo de media', () => {
    const flojo = peleadorAleatorio(createRng(1), { media: 45 });
    const crack = peleadorAleatorio(createRng(1), { media: 85 });
    expect(mediaDe(crack)).toBeGreaterThan(mediaDe(flojo));
  });
});

describe('mediaDe', () => {
  it('devuelve un entero entre 1 y 99', () => {
    const media = mediaDe(crearPeleador(base));
    expect(Number.isInteger(media)).toBe(true);
    expect(media).toBeGreaterThan(0);
    expect(media).toBeLessThanOrEqual(99);
  });
});

describe('recordTexto', () => {
  it('omite los empates cuando son cero', () => {
    const p = crearPeleador(base);
    p.record = { v: 9, d: 3, e: 0, ko: 7, sub: 0, dec: 2 };
    expect(recordTexto(p)).toBe('9-3');
  });

  it('muestra los empates cuando existen', () => {
    const p = crearPeleador(base);
    p.record = { v: 9, d: 3, e: 1, ko: 7, sub: 0, dec: 2 };
    expect(recordTexto(p)).toBe('9-3-1');
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/fighter.test.js`
Expected: FAIL — no se puede resolver `../../src/core/fighter.js`.

- [ ] **Step 3: Implementar `src/content/names.js`**

```js
export const NOMBRES = [
  'Lucas', 'Matías', 'Nahuel', 'Ramiro', 'Emiliano', 'Facundo', 'Bruno', 'Iván',
  'Thiago', 'Gonzalo', 'Julián', 'Ezequiel', 'Dante', 'Alan', 'Maxi', 'Rodrigo',
];

export const APELLIDOS = [
  'Ortiz', 'Sosa', 'Quiroga', 'Medina', 'Ferreyra', 'Bustos', 'Peralta', 'Cabrera',
  'Ledesma', 'Molina', 'Aguirre', 'Vera', 'Ibáñez', 'Zárate', 'Ojeda', 'Ríos',
];

export const APODOS = [
  'El Relámpago', 'La Roca', 'El Toro', 'El Puma', 'Manos de Piedra', 'El Zurdo',
  'La Hiena', 'El Chino', 'El Tanque', 'Dinamita', 'El Profesor', 'El Lobo',
  'La Bestia', 'El Cirujano', 'El Fantasma', 'Corazón de León',
];

export const NACIONALIDADES = [
  { codigo: 'AR', nombre: 'Argentina', gentilicio: 'argentino' },
  { codigo: 'MX', nombre: 'México', gentilicio: 'mexicano' },
  { codigo: 'US', nombre: 'Estados Unidos', gentilicio: 'estadounidense' },
  { codigo: 'BR', nombre: 'Brasil', gentilicio: 'brasileño' },
  { codigo: 'GB', nombre: 'Reino Unido', gentilicio: 'británico' },
  { codigo: 'RU', nombre: 'Rusia', gentilicio: 'ruso' },
  { codigo: 'CU', nombre: 'Cuba', gentilicio: 'cubano' },
  { codigo: 'JP', nombre: 'Japón', gentilicio: 'japonés' },
];

export const GIMNASIOS = [
  'La Catedral', 'El Galpón', 'Sudor y Fierro', 'Club Atlético Progreso',
  'La Fábrica', 'Templo del Ring', 'La Cueva', 'Bunker MMA',
];
```

- [ ] **Step 4: Implementar `src/core/fighter.js`**

```js
import { crearAtributos, crearEstado, calcularMedia, aplicarModificadores, clamp } from './stats.js';
import { getDisciplina, pesosDe } from './disciplines.js';
import { ESTILOS, estilosDisponibles } from './styles.js';
import { NOMBRES, APELLIDOS, APODOS, NACIONALIDADES, GIMNASIOS } from '../content/names.js';

export const CATEGORIAS = {
  pluma: { id: 'pluma', nombre: 'Peso pluma', pesoMin: 55, pesoMax: 57, alturaMedia: 170 },
  mediano: { id: 'mediano', nombre: 'Peso mediano', pesoMin: 70, pesoMax: 73, alturaMedia: 180 },
};

export const ORIGENES = [
  { id: 'barrio', nombre: 'El barrio', descripcion: 'Aprendiste a la mala, en la calle.', mods: { potencia: 3, menton: 3, tecnica: -3 } },
  { id: 'club', nombre: 'El club del barrio', descripcion: 'Escuelita, disciplina y horarios.', mods: { tecnica: 4, disciplinaPersonal: 5, potencia: -2 } },
  { id: 'familia', nombre: 'Familia de peleadores', descripcion: 'Lo tenés en la sangre.', mods: { iq: 5, tecnica: 2, menton: -2 } },
  { id: 'tarde', nombre: 'Arrancaste tarde', descripcion: 'Llegaste de grande, con hambre.', mods: { cardio: 4, disciplinaPersonal: 3, iq: -3 } },
];

export const EDAD_INICIAL = 15;

let contadorId = 0;
function nuevoId(prefijo = 'ftr') {
  contadorId += 1;
  return `${prefijo}_${Date.now().toString(36)}_${contadorId}`;
}

function baseAtributos(disciplina, mediaObjetivo) {
  const nivel = clamp(Math.round(mediaObjetivo), 1, 99);
  const valores = {};
  for (const clave of ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq']) {
    valores[clave] = nivel;
  }
  valores.grappling = getDisciplina(disciplina).usaGrappling ? nivel : 1;
  return crearAtributos(valores);
}

export function crearPeleador(opciones) {
  const {
    nombre, apodo, nacionalidad, disciplina, estilo, categoria,
    mano = 'derecha', altura, alcance, origen = 'barrio',
    esJugador = false, edad = EDAD_INICIAL, media = 40,
    gimnasio = GIMNASIOS[0], personalidad = 'respetuoso',
  } = opciones;

  if (!CATEGORIAS[categoria]) throw new Error(`Categoría desconocida: ${categoria}`);
  const disc = getDisciplina(disciplina);
  const est = ESTILOS[estilo];
  if (!est) throw new Error(`Estilo desconocido: ${estilo}`);
  if (!est.disciplinas.includes(disciplina)) {
    throw new Error(`El estilo ${estilo} no está disponible en ${disciplina}`);
  }
  const orig = ORIGENES.find((o) => o.id === origen);
  if (!orig) throw new Error(`Origen desconocido: ${origen}`);

  let atributos = baseAtributos(disciplina, media);
  let especiales = { disciplinaPersonal: 40, menton: 40 };

  for (const mods of [est.mods, orig.mods]) {
    const soloAtributos = {};
    const soloEspeciales = {};
    for (const [clave, valor] of Object.entries(mods)) {
      if (clave in atributos) soloAtributos[clave] = valor;
      else if (clave in especiales) soloEspeciales[clave] = valor;
    }
    atributos = aplicarModificadores(atributos, soloAtributos).resultado;
    especiales = aplicarModificadores(especiales, soloEspeciales).resultado;
  }

  if (!disc.usaGrappling) atributos.grappling = 1;

  const cat = CATEGORIAS[categoria];
  return {
    id: nuevoId(esJugador ? 'jug' : 'riv'),
    esJugador,
    nombre, apodo, nacionalidad,
    disciplina, estilo, categoria,
    mano,
    altura: altura ?? cat.alturaMedia,
    alcance: alcance ?? (altura ?? cat.alturaMedia) + 6,
    origen,
    edad,
    atributos,
    especiales,
    estado: crearEstado(),
    record: { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 },
    dinero: 0,
    fama: 0,
    titulos: [],
    defensas: 0,
    ranking: null,
    gimnasio,
    staff: [],
    lujos: [],
    historial: [],
    retirado: false,
    personalidad,
  };
}

export function peleadorAleatorio(rng, opciones = {}) {
  const disciplina = opciones.disciplina ?? rng.pick(['boxeo', 'mma']);
  const categoria = opciones.categoria ?? rng.pick(Object.keys(CATEGORIAS));
  const estilo = opciones.estilo ?? rng.pick(estilosDisponibles(disciplina)).id;
  const nacionalidad = opciones.nacionalidad ?? rng.pick(NACIONALIDADES).codigo;
  const cat = CATEGORIAS[categoria];
  const altura = opciones.altura ?? cat.alturaMedia + rng.int(-6, 6);

  return crearPeleador({
    nombre: opciones.nombre ?? `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`,
    apodo: opciones.apodo ?? rng.pick(APODOS),
    nacionalidad,
    disciplina,
    estilo,
    categoria,
    mano: opciones.mano ?? (rng.chance(0.2) ? 'zurda' : 'derecha'),
    altura,
    alcance: altura + rng.int(2, 10),
    origen: opciones.origen ?? rng.pick(ORIGENES).id,
    edad: opciones.edad ?? rng.int(19, 33),
    media: opciones.media ?? rng.int(40, 70),
    gimnasio: opciones.gimnasio ?? rng.pick(GIMNASIOS),
    personalidad: opciones.personalidad ?? 'respetuoso',
    esJugador: false,
  });
}

export function mediaDe(peleador) {
  return calcularMedia(peleador.atributos, pesosDe(peleador.disciplina));
}

export function recordTexto(peleador) {
  const { v, d, e } = peleador.record;
  return e > 0 ? `${v}-${d}-${e}` : `${v}-${d}`;
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/fighter.test.js`
Expected: PASS (16 tests).

- [ ] **Step 6: Correr toda la suite**

Run: `npm test`
Expected: PASS (todos los tests anteriores siguen verdes).

- [ ] **Step 7: Commit**

```bash
git add src/content/names.js src/core/fighter.js tests/core/fighter.test.js
git commit -m "feat: creacion de peleador, categorias, origenes y generacion aleatoria"
```

---

## Task 6: Elenco de parodias y roster de categoría

**Files:**
- Create: `src/content/parodies.js`
- Create: `src/core/roster.js`
- Test: `tests/core/roster.test.js`

**Interfaces:**
- Consumes: `peleadorAleatorio`, `crearPeleador`, `CATEGORIAS` de `fighter.js`; `createRng`.
- Produces (`parodies.js`): `PARODIAS: Array<Parodia>` con al menos 8 entradas. `Parodia` = `{ id, nombre, apodo, referencia, nacionalidad, disciplina, categoria, estilo, personalidad, rol: 'activo'|'leyenda', media: number, edad: number, frase: string }`.
- Produces (`roster.js`):
  - `PERSONALIDADES: string[]` = `['respetuoso','provocador','tramposo','showman','mentor','agresivo','mercenario']`
  - `parodiasDe(disciplina, categoria, rol?): Parodia[]`
  - `crearDesdeParodia(parodia): Peleador` — peleador completo, con `esParodia: true` y `referencia`.
  - `crearRoster(rng, {disciplina, categoria, cantidad?}): Peleador[]` — mezcla parodias activas + inventados, ordenado por MEDIA descendente, con `ranking` 1..N asignado.
  - `leyendasDe(disciplina): Parodia[]`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/core/roster.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PARODIAS } from '../../src/content/parodies.js';
import {
  PERSONALIDADES, parodiasDe, crearDesdeParodia, crearRoster, leyendasDe,
} from '../../src/core/roster.js';
import { mediaDe } from '../../src/core/fighter.js';

describe('parodias', () => {
  it('tiene al menos ocho personajes', () => {
    expect(PARODIAS.length).toBeGreaterThanOrEqual(8);
  });

  it('cada parodia declara a quien parodia', () => {
    for (const p of PARODIAS) {
      expect(p.referencia).toBeTruthy();
      expect(p.nombre).toBeTruthy();
      expect(p.frase).toBeTruthy();
    }
  });

  it('tiene ids unicos', () => {
    const ids = PARODIAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mezcla activos y leyendas', () => {
    const roles = new Set(PARODIAS.map((p) => p.rol));
    expect(roles).toContain('activo');
    expect(roles).toContain('leyenda');
  });

  it('todas usan una personalidad valida', () => {
    for (const p of PARODIAS) expect(PERSONALIDADES).toContain(p.personalidad);
  });
});

describe('parodiasDe', () => {
  it('filtra por disciplina y categoria', () => {
    const encontradas = parodiasDe('boxeo', 'pluma');
    for (const p of encontradas) {
      expect(p.disciplina).toBe('boxeo');
      expect(p.categoria).toBe('pluma');
    }
  });

  it('puede filtrar por rol', () => {
    for (const p of parodiasDe('boxeo', 'pluma', 'activo')) expect(p.rol).toBe('activo');
  });
});

describe('crearDesdeParodia', () => {
  it('convierte una parodia en peleador completo', () => {
    const peleador = crearDesdeParodia(PARODIAS[0]);
    expect(peleador.esParodia).toBe(true);
    expect(peleador.referencia).toBe(PARODIAS[0].referencia);
    expect(peleador.nombre).toBe(PARODIAS[0].nombre);
    expect(peleador.atributos).toBeTruthy();
  });

  it('respeta la media declarada dentro de un margen', () => {
    const parodia = PARODIAS.find((p) => p.rol === 'activo');
    const peleador = crearDesdeParodia(parodia);
    expect(Math.abs(mediaDe(peleador) - parodia.media)).toBeLessThanOrEqual(8);
  });
});

describe('crearRoster', () => {
  it('genera la cantidad pedida', () => {
    const roster = crearRoster(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster).toHaveLength(10);
  });

  it('todos comparten disciplina y categoria', () => {
    const roster = crearRoster(createRng(2), { disciplina: 'mma', categoria: 'mediano', cantidad: 8 });
    for (const p of roster) {
      expect(p.disciplina).toBe('mma');
      expect(p.categoria).toBe('mediano');
    }
  });

  it('incluye al menos una parodia activa si existe para esa categoria', () => {
    const roster = crearRoster(createRng(3), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster.some((p) => p.esParodia)).toBe(true);
  });

  it('asigna ranking 1..N ordenado por media', () => {
    const roster = crearRoster(createRng(4), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });
    expect(roster.map((p) => p.ranking)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < roster.length; i++) {
      expect(mediaDe(roster[i - 1])).toBeGreaterThanOrEqual(mediaDe(roster[i]));
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = crearRoster(createRng(9), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 8 });
    const b = crearRoster(createRng(9), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 8 });
    expect(a.map((p) => p.nombre)).toEqual(b.map((p) => p.nombre));
  });

  it('no repite nombres', () => {
    const roster = crearRoster(createRng(12), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 12 });
    const nombres = roster.map((p) => p.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});

describe('leyendasDe', () => {
  it('devuelve solo leyendas de esa disciplina', () => {
    for (const p of leyendasDe('boxeo')) {
      expect(p.rol).toBe('leyenda');
      expect(p.disciplina).toBe('boxeo');
    }
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/roster.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/content/parodies.js`**

```js
/**
 * Elenco fijo de parodias obvias de iconos del deporte.
 * Son personajes inventados con nombres-chiste: no representan a personas reales.
 */
export const PARODIAS = [
  {
    id: 'tyzon',
    nombre: 'Dyke Tyzon',
    apodo: 'El Ciclón',
    referencia: 'Mike Tyson',
    nacionalidad: 'US',
    disciplina: 'boxeo',
    categoria: 'pluma',
    estilo: 'noqueador',
    personalidad: 'agresivo',
    rol: 'activo',
    media: 78,
    edad: 26,
    frase: 'Todos tienen un plan hasta que les apago la luz.',
  },
  {
    id: 'mcconnor',
    nombre: 'Conor McConnor',
    apodo: 'El Bocón',
    referencia: 'Conor McGregor',
    nacionalidad: 'GB',
    disciplina: 'mma',
    categoria: 'pluma',
    estilo: 'noqueador',
    personalidad: 'provocador',
    rol: 'activo',
    media: 76,
    edad: 28,
    frase: 'No vine a pelear, vine a cobrar. Y de paso te duermo.',
  },
  {
    id: 'alla',
    nombre: 'Muhammad Allá',
    apodo: 'El Más Grande',
    referencia: 'Muhammad Ali',
    nacionalidad: 'US',
    disciplina: 'boxeo',
    categoria: 'mediano',
    estilo: 'tecnico',
    personalidad: 'showman',
    rol: 'leyenda',
    media: 88,
    edad: 52,
    frase: 'Flotá como mariposa, cobrá como abeja reina.',
  },
  {
    id: 'nurmagomedon',
    nombre: 'Jabib Nurmagomedón',
    apodo: 'El Oso',
    referencia: 'Khabib Nurmagomedov',
    nacionalidad: 'RU',
    disciplina: 'mma',
    categoria: 'pluma',
    estilo: 'grappler',
    personalidad: 'respetuoso',
    rol: 'activo',
    media: 80,
    edad: 29,
    frase: 'Mandá tu ubicación. Voy tranquilo.',
  },
  {
    id: 'canolo',
    nombre: 'Canolo Álvarez',
    apodo: 'El Pelirrojo',
    referencia: 'Canelo Álvarez',
    nacionalidad: 'MX',
    disciplina: 'boxeo',
    categoria: 'mediano',
    estilo: 'tecnico',
    personalidad: 'mercenario',
    rol: 'activo',
    media: 82,
    edad: 30,
    frase: 'Si la bolsa es buena, subo con cualquiera.',
  },
  {
    id: 'silvo',
    nombre: 'Anderson Silvo',
    apodo: 'La Araña',
    referencia: 'Anderson Silva',
    nacionalidad: 'BR',
    disciplina: 'mma',
    categoria: 'mediano',
    estilo: 'tecnico',
    personalidad: 'mentor',
    rol: 'leyenda',
    media: 85,
    edad: 47,
    frase: 'La técnica no envejece, pibe. Las piernas sí.',
  },
  {
    id: 'mayweder',
    nombre: 'Floyd Mayweder',
    apodo: 'El Intocable',
    referencia: 'Floyd Mayweather',
    nacionalidad: 'US',
    disciplina: 'boxeo',
    categoria: 'pluma',
    estilo: 'tecnico',
    personalidad: 'provocador',
    rol: 'leyenda',
    media: 87,
    edad: 49,
    frase: 'Cero derrotas. Contá de nuevo: cero.',
  },
  {
    id: 'monzonte',
    nombre: 'Carlos Monzonte',
    apodo: 'El Escopeta',
    referencia: 'Carlos Monzón',
    nacionalidad: 'AR',
    disciplina: 'boxeo',
    categoria: 'mediano',
    estilo: 'menton',
    personalidad: 'agresivo',
    rol: 'leyenda',
    media: 86,
    edad: 55,
    frase: 'Acá se viene a aguantar. El que aguanta, gana.',
  },
  {
    id: 'jonez',
    nombre: 'Jon Jonez',
    apodo: 'Huesos',
    referencia: 'Jon Jones',
    nacionalidad: 'US',
    disciplina: 'mma',
    categoria: 'mediano',
    estilo: 'grappler',
    personalidad: 'tramposo',
    rol: 'activo',
    media: 84,
    edad: 31,
    frase: 'Los controles antidoping y yo tenemos una relación complicada.',
  },
  {
    id: 'pacman',
    nombre: 'Manny Paquito',
    apodo: 'El Huracán',
    referencia: 'Manny Pacquiao',
    nacionalidad: 'JP',
    disciplina: 'boxeo',
    categoria: 'pluma',
    estilo: 'noqueador',
    personalidad: 'respetuoso',
    rol: 'activo',
    media: 79,
    edad: 33,
    frase: 'Ocho categorías. Y todavía tengo hambre.',
  },
];
```

- [ ] **Step 4: Implementar `src/core/roster.js`**

```js
import { crearPeleador, peleadorAleatorio, mediaDe } from './fighter.js';
import { PARODIAS } from '../content/parodies.js';

export const PERSONALIDADES = [
  'respetuoso', 'provocador', 'tramposo', 'showman', 'mentor', 'agresivo', 'mercenario',
];

export function parodiasDe(disciplina, categoria, rol = null) {
  return PARODIAS.filter(
    (p) => p.disciplina === disciplina && p.categoria === categoria && (rol === null || p.rol === rol),
  );
}

export function leyendasDe(disciplina) {
  return PARODIAS.filter((p) => p.rol === 'leyenda' && p.disciplina === disciplina);
}

export function crearDesdeParodia(parodia) {
  const peleador = crearPeleador({
    nombre: parodia.nombre,
    apodo: parodia.apodo,
    nacionalidad: parodia.nacionalidad,
    disciplina: parodia.disciplina,
    estilo: parodia.estilo,
    categoria: parodia.categoria,
    origen: 'familia',
    edad: parodia.edad,
    media: parodia.media,
    personalidad: parodia.personalidad,
  });
  peleador.esParodia = true;
  peleador.referencia = parodia.referencia;
  peleador.parodiaId = parodia.id;
  peleador.frase = parodia.frase;
  peleador.retirado = parodia.rol === 'leyenda';
  return peleador;
}

export function crearRoster(rng, { disciplina, categoria, cantidad = 10 }) {
  const roster = [];
  const nombresUsados = new Set();

  for (const parodia of parodiasDe(disciplina, categoria, 'activo')) {
    if (roster.length >= cantidad) break;
    const peleador = crearDesdeParodia(parodia);
    roster.push(peleador);
    nombresUsados.add(peleador.nombre);
  }

  let intentos = 0;
  while (roster.length < cantidad && intentos < cantidad * 50) {
    intentos += 1;
    const candidato = peleadorAleatorio(rng, {
      disciplina,
      categoria,
      media: rng.int(45, 75),
      personalidad: rng.pick(PERSONALIDADES),
    });
    if (nombresUsados.has(candidato.nombre)) continue;
    nombresUsados.add(candidato.nombre);
    roster.push(candidato);
  }

  roster.sort((a, b) => mediaDe(b) - mediaDe(a));
  roster.forEach((peleador, indice) => {
    peleador.ranking = indice + 1;
  });
  return roster;
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/roster.test.js`
Expected: PASS (14 tests).

- [ ] **Step 6: Commit**

```bash
git add src/content/parodies.js src/core/roster.js tests/core/roster.test.js
git commit -m "feat: elenco de parodias y roster de categoria con rankings"
```

---

## Task 7: Mundo vivo, rankings y archirrival

**Files:**
- Create: `src/core/world.js`
- Create: `src/core/rivalry.js`
- Test: `tests/core/world.test.js`
- Test: `tests/core/rivalry.test.js`

**Interfaces:**
- Consumes: `crearRoster`, `mediaDe`, `createRng`.
- Produces (`world.js`):
  - `crearMundo(rng, {disciplina, categoria, cantidad?}): Mundo` donde `Mundo` = `{ roster: Peleador[], anio: number, campeonId: string|null, titulares: object[] }`
  - `avanzarMundo(mundo, rng, {aniosPasados: number}): {mundo: Mundo, sucesos: Suceso[]}` — no muta; los rivales pelean entre sí, envejecen, se retiran, cambia el ranking. `Suceso` = `{ tipo: 'victoria'|'titulo'|'retiro'|'lesion'|'ascenso', peleadorId, rivalId?, texto: string }`
  - `recalcularRankings(roster): Peleador[]`
  - `buscarRival(mundo, {excluirIds?: string[], rankingCerca?: number}): Peleador|null`
- Produces (`rivalry.js`):
  - `crearRivalidad(peleadorId, rivalId): Rivalidad` = `{ rivalId, heat: number, h2h: {v:number,d:number,e:number}, esArchirrival: boolean, hitos: string[] }`
  - `registrarCruce(rivalidades, rivalId, resultado: 'v'|'d'|'e', {heat?: number}): Rivalidad[]`
  - `subirHeat(rivalidades, rivalId, cantidad: number): Rivalidad[]`
  - `elegirArchirrival(rivalidades): Rivalidad|null` — el de más heat con 2+ cruces; marca `esArchirrival`.
  - `h2hTexto(rivalidad): string` — `'1-1'`.

- [ ] **Step 1: Escribir `tests/core/world.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearMundo, avanzarMundo, recalcularRankings, buscarRival } from '../../src/core/world.js';
import { mediaDe } from '../../src/core/fighter.js';

const opciones = { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 };

describe('crearMundo', () => {
  it('arma roster con ranking y anio inicial', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.roster).toHaveLength(10);
    expect(mundo.roster[0].ranking).toBe(1);
    expect(typeof mundo.anio).toBe('number');
    expect(mundo.titulares).toEqual([]);
  });

  it('corona campeon al numero uno', () => {
    const mundo = crearMundo(createRng(1), opciones);
    expect(mundo.campeonId).toBe(mundo.roster[0].id);
  });
});

describe('avanzarMundo', () => {
  it('no muta el mundo original', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const antes = JSON.stringify(mundo);
    avanzarMundo(mundo, createRng(3), { aniosPasados: 1 });
    expect(JSON.stringify(mundo)).toBe(antes);
  });

  it('envejece a los peleadores', () => {
    const mundo = crearMundo(createRng(2), opciones);
    const edadAntes = mundo.roster[0].edad;
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(3), { aniosPasados: 2 });
    const mismo = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    if (mismo) expect(mismo.edad).toBe(edadAntes + 2);
  });

  it('genera peleas entre rivales y sucesos', () => {
    const mundo = crearMundo(createRng(4), opciones);
    const { sucesos } = avanzarMundo(mundo, createRng(5), { aniosPasados: 1 });
    expect(sucesos.length).toBeGreaterThan(0);
    expect(sucesos.every((s) => typeof s.texto === 'string' && s.texto.length > 0)).toBe(true);
  });

  it('acumula peleas en los records', () => {
    const mundo = crearMundo(createRng(6), opciones);
    const totalAntes = mundo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(7), { aniosPasados: 1 });
    const totalDespues = nuevo.roster.reduce((a, p) => a + p.record.v + p.record.d, 0);
    expect(totalDespues).toBeGreaterThan(totalAntes);
  });

  it('retira a los muy veteranos y avisa', () => {
    const mundo = crearMundo(createRng(8), opciones);
    mundo.roster[0].edad = 41;
    const { mundo: nuevo, sucesos } = avanzarMundo(mundo, createRng(9), { aniosPasados: 1 });
    const retirado = nuevo.roster.find((p) => p.id === mundo.roster[0].id);
    expect(retirado.retirado).toBe(true);
    expect(sucesos.some((s) => s.tipo === 'retiro')).toBe(true);
  });

  it('mantiene el ranking consecutivo entre los activos', () => {
    const mundo = crearMundo(createRng(10), opciones);
    const { mundo: nuevo } = avanzarMundo(mundo, createRng(11), { aniosPasados: 3 });
    const activos = nuevo.roster.filter((p) => !p.retirado);
    expect(activos.map((p) => p.ranking)).toEqual(activos.map((_, i) => i + 1));
  });

  it('es determinista con la misma semilla', () => {
    const mundo = crearMundo(createRng(12), opciones);
    const a = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    const b = avanzarMundo(mundo, createRng(13), { aniosPasados: 2 });
    expect(a.sucesos).toEqual(b.sucesos);
  });
});

describe('recalcularRankings', () => {
  it('ordena por media y no rankea retirados', () => {
    const mundo = crearMundo(createRng(14), opciones);
    mundo.roster[0].retirado = true;
    const ordenado = recalcularRankings(mundo.roster);
    const activos = ordenado.filter((p) => !p.retirado);
    expect(activos[0].ranking).toBe(1);
    expect(ordenado.find((p) => p.retirado).ranking).toBeNull();
    for (let i = 1; i < activos.length; i++) {
      expect(mediaDe(activos[i - 1])).toBeGreaterThanOrEqual(mediaDe(activos[i]));
    }
  });
});

describe('buscarRival', () => {
  it('devuelve un activo del roster', () => {
    const mundo = crearMundo(createRng(15), opciones);
    const rival = buscarRival(mundo, {});
    expect(mundo.roster.map((p) => p.id)).toContain(rival.id);
    expect(rival.retirado).toBe(false);
  });

  it('excluye los ids pedidos', () => {
    const mundo = crearMundo(createRng(16), opciones);
    const excluidos = mundo.roster.slice(0, 8).map((p) => p.id);
    const rival = buscarRival(mundo, { excluirIds: excluidos });
    expect(excluidos).not.toContain(rival.id);
  });

  it('prefiere rivales cerca del ranking pedido', () => {
    const mundo = crearMundo(createRng(17), opciones);
    const rival = buscarRival(mundo, { rankingCerca: 3 });
    expect(Math.abs(rival.ranking - 3)).toBeLessThanOrEqual(3);
  });

  it('devuelve null si no queda nadie', () => {
    const mundo = crearMundo(createRng(18), opciones);
    const todos = mundo.roster.map((p) => p.id);
    expect(buscarRival(mundo, { excluirIds: todos })).toBeNull();
  });
});
```

- [ ] **Step 2: Escribir `tests/core/rivalry.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  crearRivalidad, registrarCruce, subirHeat, elegirArchirrival, h2hTexto,
} from '../../src/core/rivalry.js';

describe('rivalidades', () => {
  it('crea una rivalidad limpia', () => {
    const r = crearRivalidad('jug_1', 'riv_1');
    expect(r).toEqual({ rivalId: 'riv_1', heat: 10, h2h: { v: 0, d: 0, e: 0 }, esArchirrival: false, hitos: [] });
  });

  it('registrar un cruce crea la rivalidad si no existia', () => {
    const lista = registrarCruce([], 'riv_1', 'v');
    expect(lista).toHaveLength(1);
    expect(lista[0].h2h.v).toBe(1);
  });

  it('acumula cruces y sube el heat', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    const heatInicial = lista[0].heat;
    lista = registrarCruce(lista, 'riv_1', 'd');
    expect(lista[0].h2h).toEqual({ v: 1, d: 1, e: 0 });
    expect(lista[0].heat).toBeGreaterThan(heatInicial);
  });

  it('no muta la lista original', () => {
    const lista = registrarCruce([], 'riv_1', 'v');
    const copia = JSON.stringify(lista);
    registrarCruce(lista, 'riv_1', 'd');
    expect(JSON.stringify(lista)).toBe(copia);
  });

  it('subirHeat acota entre 0 y 100', () => {
    let lista = subirHeat([], 'riv_1', 500);
    expect(lista[0].heat).toBe(100);
    lista = subirHeat(lista, 'riv_1', -500);
    expect(lista[0].heat).toBe(0);
  });

  it('elegirArchirrival exige al menos dos cruces', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    expect(elegirArchirrival(lista)).toBeNull();
    lista = registrarCruce(lista, 'riv_1', 'd');
    expect(elegirArchirrival(lista).rivalId).toBe('riv_1');
  });

  it('elige al de mas heat y lo marca', () => {
    let lista = registrarCruce([], 'riv_1', 'v');
    lista = registrarCruce(lista, 'riv_1', 'd');
    lista = registrarCruce(lista, 'riv_2', 'v');
    lista = registrarCruce(lista, 'riv_2', 'v');
    lista = subirHeat(lista, 'riv_2', 60);
    const archi = elegirArchirrival(lista);
    expect(archi.rivalId).toBe('riv_2');
    expect(archi.esArchirrival).toBe(true);
  });

  it('h2hTexto omite empates en cero', () => {
    const r = crearRivalidad('jug_1', 'riv_1');
    r.h2h = { v: 1, d: 1, e: 0 };
    expect(h2hTexto(r)).toBe('1-1');
    r.h2h = { v: 1, d: 1, e: 1 };
    expect(h2hTexto(r)).toBe('1-1-1');
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/world.test.js tests/core/rivalry.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 4: Implementar `src/core/rivalry.js`**

```js
import { clamp } from './stats.js';

export const HEAT_INICIAL = 10;
export const HEAT_POR_CRUCE = 18;

export function crearRivalidad(_peleadorId, rivalId) {
  return { rivalId, heat: HEAT_INICIAL, h2h: { v: 0, d: 0, e: 0 }, esArchirrival: false, hitos: [] };
}

function clonar(rivalidades) {
  return rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] }));
}

function asegurar(lista, rivalId) {
  let rivalidad = lista.find((r) => r.rivalId === rivalId);
  if (!rivalidad) {
    rivalidad = crearRivalidad(null, rivalId);
    lista.push(rivalidad);
  }
  return rivalidad;
}

export function registrarCruce(rivalidades, rivalId, resultado, { heat = HEAT_POR_CRUCE, hito = null } = {}) {
  const lista = clonar(rivalidades);
  const rivalidad = asegurar(lista, rivalId);
  rivalidad.h2h[resultado] += 1;
  rivalidad.heat = clamp(rivalidad.heat + heat, 0, 100);
  if (hito) rivalidad.hitos.push(hito);
  return lista;
}

export function subirHeat(rivalidades, rivalId, cantidad) {
  const lista = clonar(rivalidades);
  const rivalidad = asegurar(lista, rivalId);
  rivalidad.heat = clamp(rivalidad.heat + cantidad, 0, 100);
  return lista;
}

export function cruces(rivalidad) {
  return rivalidad.h2h.v + rivalidad.h2h.d + rivalidad.h2h.e;
}

export function elegirArchirrival(rivalidades) {
  const candidatos = rivalidades.filter((r) => cruces(r) >= 2);
  if (candidatos.length === 0) return null;
  const ganador = candidatos.reduce((mejor, actual) => (actual.heat > mejor.heat ? actual : mejor));
  ganador.esArchirrival = true;
  for (const r of rivalidades) if (r !== ganador) r.esArchirrival = false;
  return ganador;
}

export function h2hTexto(rivalidad) {
  const { v, d, e } = rivalidad.h2h;
  return e > 0 ? `${v}-${d}-${e}` : `${v}-${d}`;
}
```

- [ ] **Step 5: Implementar `src/core/world.js`**

```js
import { crearRoster } from './roster.js';
import { mediaDe } from './fighter.js';
import { clamp } from './stats.js';

export const EDAD_RETIRO = 40;
export const ANIO_INICIAL = 2026;

export function crearMundo(rng, { disciplina, categoria, cantidad = 10 }) {
  const roster = crearRoster(rng, { disciplina, categoria, cantidad });
  return {
    disciplina,
    categoria,
    roster,
    anio: ANIO_INICIAL,
    campeonId: roster[0]?.id ?? null,
    titulares: [],
  };
}

export function recalcularRankings(roster) {
  const activos = roster.filter((p) => !p.retirado).sort((a, b) => mediaDe(b) - mediaDe(a));
  const retirados = roster.filter((p) => p.retirado);
  activos.forEach((p, i) => { p.ranking = i + 1; });
  retirados.forEach((p) => { p.ranking = null; });
  return [...activos, ...retirados];
}

function clonarRoster(roster) {
  return roster.map((p) => ({
    ...p,
    atributos: { ...p.atributos },
    especiales: { ...p.especiales },
    estado: { ...p.estado },
    record: { ...p.record },
    titulos: [...p.titulos],
    staff: [...p.staff],
    lujos: [...p.lujos],
    historial: [...p.historial],
  }));
}

function declive(peleador, rng) {
  if (peleador.edad < 32) {
    if (rng.chance(0.5)) peleador.atributos.tecnica = clamp(peleador.atributos.tecnica + 1, 1, 99);
    if (rng.chance(0.4)) peleador.atributos.iq = clamp(peleador.atributos.iq + 1, 1, 99);
    return;
  }
  peleador.atributos.velocidad = clamp(peleador.atributos.velocidad - rng.int(1, 3), 1, 99);
  peleador.atributos.cardio = clamp(peleador.atributos.cardio - rng.int(0, 2), 1, 99);
}

export function avanzarMundo(mundo, rng, { aniosPasados = 1 } = {}) {
  const roster = clonarRoster(mundo.roster);
  const sucesos = [];
  let campeonId = mundo.campeonId;

  for (let anio = 0; anio < Math.max(1, Math.round(aniosPasados)); anio++) {
    for (const peleador of roster) {
      if (peleador.retirado || peleador.esJugador) continue;
      peleador.edad += 1;
      declive(peleador, rng);
      if (peleador.edad >= EDAD_RETIRO) {
        peleador.retirado = true;
        sucesos.push({
          tipo: 'retiro',
          peleadorId: peleador.id,
          texto: `${peleador.nombre} anuncia su retiro a los ${peleador.edad} años.`,
        });
      }
    }

    const activos = roster.filter((p) => !p.retirado && !p.esJugador);
    const mezclados = rng.shuffle(activos);
    for (let i = 0; i + 1 < mezclados.length; i += 2) {
      const a = mezclados[i];
      const b = mezclados[i + 1];
      const fuerza = mediaDe(a) - mediaDe(b);
      const probA = clamp(0.5 + fuerza * 0.02, 0.1, 0.9);
      const ganador = rng.chance(probA) ? a : b;
      const perdedor = ganador === a ? b : a;
      const porKo = rng.chance(0.35);
      ganador.record.v += 1;
      if (porKo) ganador.record.ko += 1; else ganador.record.dec += 1;
      perdedor.record.d += 1;
      sucesos.push({
        tipo: 'victoria',
        peleadorId: ganador.id,
        rivalId: perdedor.id,
        texto: porKo
          ? `${ganador.nombre} noqueó a ${perdedor.nombre}.`
          : `${ganador.nombre} le ganó por puntos a ${perdedor.nombre}.`,
      });
      if (perdedor.id === campeonId) {
        campeonId = ganador.id;
        ganador.titulos.push(`Título ${mundo.categoria}`);
        sucesos.push({
          tipo: 'titulo',
          peleadorId: ganador.id,
          rivalId: perdedor.id,
          texto: `¡${ganador.nombre} es el nuevo campeón: le arrebató el cinturón a ${perdedor.nombre}!`,
        });
      }
    }
  }

  const ordenado = recalcularRankings(roster);
  const campeonSigueActivo = ordenado.some((p) => p.id === campeonId && !p.retirado);
  if (!campeonSigueActivo) {
    const nuevo = ordenado.find((p) => !p.retirado);
    campeonId = nuevo ? nuevo.id : null;
    if (nuevo) {
      sucesos.push({
        tipo: 'titulo',
        peleadorId: nuevo.id,
        texto: `${nuevo.nombre} queda como campeón con el cinturón vacante.`,
      });
    }
  }

  return {
    mundo: { ...mundo, roster: ordenado, anio: mundo.anio + Math.round(aniosPasados), campeonId },
    sucesos,
  };
}

export function buscarRival(mundo, { excluirIds = [], rankingCerca = null } = {}) {
  const candidatos = mundo.roster.filter(
    (p) => !p.retirado && !p.esJugador && !excluirIds.includes(p.id),
  );
  if (candidatos.length === 0) return null;
  if (rankingCerca === null) return candidatos[0];
  return candidatos.reduce((mejor, actual) => {
    const distMejor = Math.abs((mejor.ranking ?? 99) - rankingCerca);
    const distActual = Math.abs((actual.ranking ?? 99) - rankingCerca);
    return distActual < distMejor ? actual : mejor;
  });
}
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/world.test.js tests/core/rivalry.test.js`
Expected: PASS (22 tests).

- [ ] **Step 7: Commit**

```bash
git add src/core/world.js src/core/rivalry.js tests/core/world.test.js tests/core/rivalry.test.js
git commit -m "feat: mundo vivo con rankings, retiros y rivalidades con archirrival"
```

---

## Task 8: Motor de pelea round por round

**Files:**
- Create: `src/content/fight-lines.js`
- Create: `src/core/fight.js`
- Test: `tests/core/fight.test.js`

**Interfaces:**
- Consumes: `pesosDe`, `getDisciplina`; `ventajaDeEstilo`; `calcularMedia`, `clamp`; `createRng`.
- Produces (`fight-lines.js`): `LINEAS: Record<'dominio'|'parejo'|'sufriendo'|'caida'|'ko'|'sumision'|'campana', string[]>` — cada línea usa los marcadores `{yo}` y `{rival}`.
- Produces (`fight.js`):
  - `PLANES: Record<'frente'|'afuera'|'aguantar', {id,nombre,descripcion,mods:{agresion:number,gasto:number,defensa:number}}>`
  - `crearPelea({jugador, rival, disciplina, nivel, plan, rng}): Pelea`
  - `simularRound(pelea): {pelea: Pelea, eventos: Evento[]}` — avanza exactamente un round; no muta.
  - `peleaTerminada(pelea): boolean`
  - `resultadoDe(pelea): Resultado|null`

`Pelea` (serializable): `{ jugadorId, rivalId, disciplina, nivel, rounds, roundActual, plan, aguante: {jugador:number, rival:number}, fatiga: {jugador:number, rival:number}, tarjetas: {jugador:number, rival:number}, caidas: {jugador:number, rival:number}, pendiente: null|'rincon'|'golpe', terminada: boolean, resultado: null|Resultado, snapshot: {jugador: object, rival: object}, semilla: number, rngEstado: number }`

`Resultado` = `{ ganador: 'jugador'|'rival'|'empate', metodo: 'ko'|'tko'|'sumision'|'decision'|'descalificacion', round: number, texto: string }`

`Evento` = `{ round: number, tipo: string, texto: string }`

- [ ] **Step 1: Escribir `tests/core/fight.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { PLANES, crearPelea, simularRound, peleaTerminada, resultadoDe } from '../../src/core/fight.js';

function armar({ estiloJugador = 'tecnico', estiloRival = 'tecnico', mediaJugador = 60, mediaRival = 60, disciplina = 'boxeo', nivel = 'profesional', plan = 'afuera', semilla = 1 } = {}) {
  const jugador = crearPeleador({
    nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina,
    estilo: estiloJugador, categoria: 'pluma', origen: 'barrio', media: mediaJugador, esJugador: true,
  });
  const rival = crearPeleador({
    nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina,
    estilo: estiloRival, categoria: 'pluma', origen: 'barrio', media: mediaRival,
  });
  return crearPelea({ jugador, rival, disciplina, nivel, plan, rng: createRng(semilla) });
}

function pelearHasta(pelea) {
  let actual = pelea;
  const todos = [];
  let guardia = 0;
  while (!peleaTerminada(actual) && guardia < 40) {
    guardia += 1;
    const paso = simularRound(actual);
    actual = paso.pelea;
    todos.push(...paso.eventos);
  }
  return { pelea: actual, eventos: todos };
}

describe('planes', () => {
  it('define los tres planes', () => {
    expect(Object.keys(PLANES).sort()).toEqual(['afuera', 'aguantar', 'frente']);
  });

  it('ir al frente cuesta mas gas que aguantar', () => {
    expect(PLANES.frente.mods.gasto).toBeGreaterThan(PLANES.aguantar.mods.gasto);
  });
});

describe('crearPelea', () => {
  it('arranca en el round 1 con aguante lleno', () => {
    const pelea = armar();
    expect(pelea.roundActual).toBe(1);
    expect(pelea.aguante.jugador).toBe(100);
    expect(pelea.aguante.rival).toBe(100);
    expect(pelea.terminada).toBe(false);
    expect(pelea.resultado).toBeNull();
  });

  it('usa los rounds que corresponden al nivel', () => {
    expect(armar({ nivel: 'amateur' }).rounds).toBe(3);
    expect(armar({ nivel: 'titulo' }).rounds).toBe(12);
    expect(armar({ disciplina: 'mma', nivel: 'titulo' }).rounds).toBe(5);
  });

  it('rechaza un plan desconocido', () => {
    expect(() => armar({ plan: 'inventado' })).toThrow(/inventado/);
  });

  it('guarda un snapshot de ambos peleadores', () => {
    const pelea = armar();
    expect(pelea.snapshot.jugador.nombre).toBe('Jugador');
    expect(pelea.snapshot.rival.nombre).toBe('Rival');
  });
});

describe('simularRound', () => {
  it('no muta la pelea original', () => {
    const pelea = armar();
    const antes = JSON.stringify(pelea);
    simularRound(pelea);
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  it('avanza el round y produce eventos narrados', () => {
    const { pelea, eventos } = simularRound(armar());
    expect(pelea.roundActual).toBe(2);
    expect(eventos.length).toBeGreaterThan(0);
    for (const e of eventos) {
      expect(e.texto).toBeTruthy();
      expect(e.texto).not.toMatch(/\{yo\}|\{rival\}/);
    }
  });

  it('acumula fatiga', () => {
    const { pelea } = simularRound(armar({ plan: 'frente' }));
    expect(pelea.fatiga.jugador).toBeGreaterThan(0);
  });

  it('suma tarjetas a alguien cada round', () => {
    const { pelea } = simularRound(armar());
    expect(pelea.tarjetas.jugador + pelea.tarjetas.rival).toBeGreaterThan(0);
  });

  it('no hace nada si la pelea ya termino', () => {
    const { pelea } = pelearHasta(armar({ nivel: 'amateur' }));
    const paso = simularRound(pelea);
    expect(paso.eventos).toEqual([]);
    expect(paso.pelea.roundActual).toBe(pelea.roundActual);
  });
});

describe('desenlace', () => {
  it('siempre termina con un resultado valido', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla }));
      expect(peleaTerminada(pelea)).toBe(true);
      const r = resultadoDe(pelea);
      expect(['jugador', 'rival', 'empate']).toContain(r.ganador);
      expect(['ko', 'tko', 'sumision', 'decision', 'descalificacion']).toContain(r.metodo);
      expect(r.round).toBeGreaterThanOrEqual(1);
      expect(r.texto).toBeTruthy();
    }
  });

  it('en boxeo nunca hay sumision', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla, disciplina: 'boxeo' }));
      expect(resultadoDe(pelea).metodo).not.toBe('sumision');
    }
  });

  it('un peleador muy superior gana la mayoria de las veces', () => {
    let ganadas = 0;
    for (let semilla = 1; semilla <= 40; semilla++) {
      const { pelea } = pelearHasta(armar({ mediaJugador: 85, mediaRival: 45, semilla }));
      if (resultadoDe(pelea).ganador === 'jugador') ganadas++;
    }
    expect(ganadas).toBeGreaterThan(30);
  });

  it('la ventaja de estilo mueve la aguja', () => {
    const contar = (estiloJugador) => {
      let ganadas = 0;
      for (let semilla = 1; semilla <= 60; semilla++) {
        const { pelea } = pelearHasta(armar({ estiloJugador, estiloRival: 'noqueador', semilla }));
        if (resultadoDe(pelea).ganador === 'jugador') ganadas++;
      }
      return ganadas;
    };
    expect(contar('tecnico')).toBeGreaterThan(contar('grappler') - 100);
    expect(contar('tecnico')).toBeGreaterThanOrEqual(20);
  });

  it('es determinista con la misma semilla', () => {
    const a = pelearHasta(armar({ semilla: 77 }));
    const b = pelearHasta(armar({ semilla: 77 }));
    expect(a.eventos).toEqual(b.eventos);
    expect(resultadoDe(a.pelea)).toEqual(resultadoDe(b.pelea));
  });

  it('el ganador por decision es el que tiene mas tarjetas', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla }));
      const r = resultadoDe(pelea);
      if (r.metodo !== 'decision') continue;
      if (r.ganador === 'jugador') expect(pelea.tarjetas.jugador).toBeGreaterThan(pelea.tarjetas.rival);
      if (r.ganador === 'rival') expect(pelea.tarjetas.rival).toBeGreaterThan(pelea.tarjetas.jugador);
      if (r.ganador === 'empate') expect(pelea.tarjetas.jugador).toBe(pelea.tarjetas.rival);
    }
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/fight.test.js`
Expected: FAIL — no se puede resolver `../../src/core/fight.js`.

- [ ] **Step 3: Implementar `src/content/fight-lines.js`**

```js
/** Lineas narrativas de pelea. {yo} y {rival} se reemplazan por los apodos. */
export const LINEAS = {
  dominio: [
    '{yo} lo tiene contra las cuerdas y no lo deja respirar.',
    'Round claro de {yo}: entra, pega y sale limpio.',
    '{yo} lo lee todo y lo castiga de contra.',
    'Se escucha el ruido de los golpes de {yo} desde la última fila.',
  ],
  parejo: [
    'Round cerrado, los dos se sacan chispas en el centro.',
    'Se estudian, se tocan, nadie se saca ventaja.',
    'Round parejo: {yo} y {rival} se pegan y se aguantan.',
  ],
  sufriendo: [
    '{rival} lo tiene a maltraer y {yo} aguanta como puede.',
    'Round duro para {yo}: le entran todas.',
    '{rival} lo encierra y {yo} apenas mueve la cabeza.',
  ],
  caida: [
    '¡Abajo! {rival} manda a la lona a {yo}.',
    '¡Cayó {yo}! Se levanta con las piernas de goma.',
    'Mano seca de {rival} y {yo} besa la lona.',
  ],
  ko: [
    '¡Se terminó! {yo} lo apagó de un golpe.',
    '¡Nocaut! {rival} no se levanta más.',
    'El árbitro no cuenta ni hasta tres: {yo} lo durmió.',
  ],
  sumision: [
    '{yo} lo lleva al piso, le busca el cuello y {rival} golpea el suelo.',
    'Sumisión perfecta de {yo}: no le quedó otra que rendirse.',
  ],
  campana: [
    'Suena la campana.',
    'Se termina el round.',
  ],
};
```

- [ ] **Step 4: Implementar `src/core/fight.js`**

```js
import { getDisciplina, pesosDe } from './disciplines.js';
import { ventajaDeEstilo } from './styles.js';
import { calcularMedia, clamp } from './stats.js';
import { LINEAS } from '../content/fight-lines.js';

export const PLANES = {
  frente: {
    id: 'frente',
    nombre: 'Ir al frente',
    descripcion: 'Presión sin descanso. Más daño, más gasto.',
    mods: { agresion: 0.12, gasto: 1.5, defensa: -0.08 },
  },
  afuera: {
    id: 'afuera',
    nombre: 'Boxear de afuera',
    descripcion: 'Distancia y precisión. Equilibrado.',
    mods: { agresion: 0, gasto: 1.0, defensa: 0.04 },
  },
  aguantar: {
    id: 'aguantar',
    nombre: 'Aguantar y contragolpear',
    descripcion: 'Defensa primero, buscando el error del rival.',
    mods: { agresion: -0.08, gasto: 0.7, defensa: 0.12 },
  },
};

function snapshotDe(peleador) {
  return {
    id: peleador.id,
    nombre: peleador.nombre,
    apodo: peleador.apodo,
    estilo: peleador.estilo,
    atributos: { ...peleador.atributos },
    especiales: { ...peleador.especiales },
    estado: { ...peleador.estado },
  };
}

export function crearPelea({ jugador, rival, disciplina, nivel = 'profesional', plan = 'afuera', rng }) {
  if (!PLANES[plan]) throw new Error(`Plan desconocido: ${plan}`);
  const disc = getDisciplina(disciplina);
  const rounds = disc.roundsPorNivel[nivel];
  if (!rounds) throw new Error(`Nivel desconocido: ${nivel}`);

  return {
    jugadorId: jugador.id,
    rivalId: rival.id,
    disciplina,
    nivel,
    rounds,
    roundActual: 1,
    plan,
    aguante: { jugador: 100, rival: 100 },
    fatiga: { jugador: jugador.estado.fatiga ?? 0, rival: rival.estado.fatiga ?? 0 },
    tarjetas: { jugador: 0, rival: 0 },
    caidas: { jugador: 0, rival: 0 },
    pendiente: null,
    terminada: false,
    resultado: null,
    snapshot: { jugador: snapshotDe(jugador), rival: snapshotDe(rival) },
    semilla: rng.seed,
    rngEstado: rng.estado(),
  };
}

export function peleaTerminada(pelea) {
  return pelea.terminada;
}

export function resultadoDe(pelea) {
  return pelea.resultado;
}

function rngDe(pelea, createRng) {
  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);
  return rng;
}

function efectividad(snapshot, disciplina, fatiga, planMods, esJugador) {
  const media = calcularMedia(snapshot.atributos, pesosDe(disciplina));
  const forma = (snapshot.estado.forma ?? 60) / 60;
  const moral = (snapshot.estado.moral ?? 60) / 60;
  const castigoFatiga = 1 - clamp(fatiga, 0, 100) / 220;
  const castigoLesion = snapshot.estado.lesion ? 0.88 : 1;
  const agresion = esJugador ? planMods.agresion : 0;
  return media * forma * 0.5 + media * 0.5 * moral * castigoFatiga * castigoLesion * (1 + agresion);
}

function texto(plantilla, yo, rival) {
  return plantilla.replaceAll('{yo}', yo).replaceAll('{rival}', rival);
}

function clonarPelea(pelea) {
  return {
    ...pelea,
    aguante: { ...pelea.aguante },
    fatiga: { ...pelea.fatiga },
    tarjetas: { ...pelea.tarjetas },
    caidas: { ...pelea.caidas },
    snapshot: pelea.snapshot,
  };
}

export function simularRound(pelea, { createRng: crear } = {}) {
  if (pelea.terminada) return { pelea, eventos: [] };
  const createRng = crear ?? require_createRng();
  const nueva = clonarPelea(pelea);
  const rng = rngDe(nueva, createRng);
  const disc = getDisciplina(nueva.disciplina);
  const planMods = PLANES[nueva.plan].mods;
  const round = nueva.roundActual;
  const eventos = [];

  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  const efJ = efectividad(nueva.snapshot.jugador, nueva.disciplina, nueva.fatiga.jugador, planMods, true);
  const efR = efectividad(nueva.snapshot.rival, nueva.disciplina, nueva.fatiga.rival, planMods, false);
  const ventaja = ventajaDeEstilo(nueva.snapshot.jugador.estilo, nueva.snapshot.rival.estilo);
  const probJ = clamp(efJ / (efJ + efR) + ventaja + rng.float(-0.08, 0.08), 0.05, 0.95);

  const ganaRound = rng.chance(probJ);
  const margen = Math.abs(probJ - 0.5);

  if (ganaRound) nueva.tarjetas.jugador += 1; else nueva.tarjetas.rival += 1;

  const dano = Math.round((6 + margen * 30) * rng.float(0.7, 1.4));
  if (ganaRound) nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  else nueva.aguante.jugador = clamp(nueva.aguante.jugador - dano, 0, 100);

  const gastoBase = 9;
  const cardioJ = nueva.snapshot.jugador.atributos.cardio;
  const cardioR = nueva.snapshot.rival.atributos.cardio;
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + gastoBase * planMods.gasto * (60 / cardioJ), 0, 100);
  nueva.fatiga.rival = clamp(nueva.fatiga.rival + gastoBase * (60 / cardioR), 0, 100);

  const clave = ganaRound ? (margen > 0.12 ? 'dominio' : 'parejo') : (margen > 0.12 ? 'sufriendo' : 'parejo');
  eventos.push({ round, tipo: clave, texto: texto(rng.pick(LINEAS[clave]), apodoJ, apodoR) });

  const atacante = ganaRound ? 'jugador' : 'rival';
  const defensor = ganaRound ? 'rival' : 'jugador';
  const aguanteDefensor = nueva.aguante[defensor];
  const mentonDefensor = nueva.snapshot[defensor].especiales.menton;
  const potenciaAtacante = nueva.snapshot[atacante].atributos.potencia;

  const probCaida = clamp((100 - aguanteDefensor) / 260 + (potenciaAtacante - mentonDefensor) / 500, 0, 0.4);
  if (rng.chance(probCaida)) {
    nueva.caidas[defensor] += 1;
    const yo = defensor === 'jugador' ? apodoJ : apodoR;
    const otro = defensor === 'jugador' ? apodoR : apodoJ;
    eventos.push({ round, tipo: 'caida', texto: texto(rng.pick(LINEAS.caida), yo, otro) });
    nueva.aguante[defensor] = clamp(nueva.aguante[defensor] - 10, 0, 100);
  }

  const puedeSumision = disc.desenlaces.includes('sumision');
  const grapplingAtacante = nueva.snapshot[atacante].atributos.grappling;
  const grapplingDefensor = nueva.snapshot[defensor].atributos.grappling;
  const probSumision = puedeSumision
    ? clamp((grapplingAtacante - grapplingDefensor) / 400 + (100 - aguanteDefensor) / 500, 0, 0.18)
    : 0;

  const probKo = clamp((100 - nueva.aguante[defensor]) / 130 - 0.55, 0, 0.5)
    + (nueva.caidas[defensor] >= 2 ? 0.25 : 0);

  let metodo = null;
  if (nueva.aguante[defensor] <= 0 || rng.chance(probKo)) {
    metodo = nueva.caidas[defensor] >= 2 ? 'tko' : 'ko';
  } else if (rng.chance(probSumision)) {
    metodo = 'sumision';
  }

  if (metodo) {
    const yo = atacante === 'jugador' ? apodoJ : apodoR;
    const otro = atacante === 'jugador' ? apodoR : apodoJ;
    const lineas = metodo === 'sumision' ? LINEAS.sumision : LINEAS.ko;
    eventos.push({ round, tipo: metodo, texto: texto(rng.pick(lineas), yo, otro) });
    nueva.terminada = true;
    nueva.resultado = {
      ganador: atacante,
      metodo,
      round,
      texto: `${atacante === 'jugador' ? apodoJ : apodoR} gana por ${metodo.toUpperCase()} en el round ${round}.`,
    };
  } else if (round >= nueva.rounds) {
    const j = nueva.tarjetas.jugador;
    const r = nueva.tarjetas.rival;
    const ganador = j > r ? 'jugador' : r > j ? 'rival' : 'empate';
    eventos.push({ round, tipo: 'campana', texto: 'Se termina la pelea. Van a las tarjetas.' });
    nueva.terminada = true;
    nueva.resultado = {
      ganador,
      metodo: 'decision',
      round,
      texto: ganador === 'empate'
        ? 'Fallo empatado: se reparten los puntos.'
        : `${ganador === 'jugador' ? apodoJ : apodoR} gana por decisión ${j > r ? `${j}-${r}` : `${r}-${j}`}.`,
    };
  } else {
    eventos.push({ round, tipo: 'campana', texto: rng.pick(LINEAS.campana) });
    nueva.roundActual = round + 1;
  }

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}

function require_createRng() {
  throw new Error('simularRound necesita createRng: pasalo como opción.');
}
```

- [ ] **Step 5: Reemplazar el acoplamiento de `createRng` por un import directo**

El paso anterior deja una función `require_createRng` que tira error. Cambiarla por un import real: en la cabecera de `src/core/fight.js` agregar

```js
import { createRng } from './rng.js';
```

y en `simularRound` reemplazar la línea

```js
  const createRng = crear ?? require_createRng();
```

por

```js
  const crearRng = crear ?? createRng;
```

actualizando la llamada `rngDe(nueva, createRng)` a `rngDe(nueva, crearRng)`, y borrar por completo la función `require_createRng` del final del archivo.

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/fight.test.js`
Expected: PASS (17 tests).

- [ ] **Step 7: Correr toda la suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/content/fight-lines.js src/core/fight.js tests/core/fight.test.js
git commit -m "feat: motor de pelea round por round con planes y desenlaces"
```

---

## Task 9: Rincón y golpe de gracia

**Files:**
- Create: `src/core/fight-interactive.js`
- Modify: `src/core/fight.js` (marcar `pendiente` al cerrar round y al abrirse la ventana de KO)
- Test: `tests/core/fight-interactive.test.js`

**Interfaces:**
- Consumes: `simularRound`, `PLANES` de `fight.js`; `clamp`; `createRng`.
- Produces:
  - `INSTRUCCIONES_RINCON: Record<'acelerar'|'respirar'|'cuerpo', {id,nombre,texto,plan:string,mods:{aguanteRival:number,fatigaJugador:number,ventanaGolpe:number}}>`
  - `ZONAS_GOLPE: Record<'menton'|'sien'|'higado', {id,nombre,dificultad:number,danoBase:number}>`
  - `avanzarPelea(pelea): {pelea, eventos}` — envuelve `simularRound` y setea `pendiente`.
  - `estadoRincon(pelea): {tarjetasTexto: string, fatigaJugador: number, fatigaRival: number, consejo: string}`
  - `aplicarInstruccionRincon(pelea, instruccionId): Pelea` — limpia `pendiente`.
  - `abrirGolpeDeGracia(pelea): {zonaAbierta: string, zonas: object[], ventanaMs: number}`
  - `resolverGolpeDeGracia(pelea, {zonaElegida, precision, aTiempo}): {pelea, eventos}` — `precision` 0..1; `aTiempo` booleano.

- [ ] **Step 1: Escribir `tests/core/fight-interactive.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea } from '../../src/core/fight.js';
import {
  INSTRUCCIONES_RINCON, ZONAS_GOLPE, avanzarPelea, estadoRincon,
  aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia,
} from '../../src/core/fight-interactive.js';

function armar({ semilla = 1, nivel = 'profesional' } = {}) {
  const jugador = crearPeleador({
    nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
  });
  const rival = crearPeleador({
    nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina: 'boxeo',
    estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 58,
  });
  return crearPelea({ jugador, rival, disciplina: 'boxeo', nivel, plan: 'afuera', rng: createRng(semilla) });
}

describe('instrucciones del rincon', () => {
  it('define las tres instrucciones', () => {
    expect(Object.keys(INSTRUCCIONES_RINCON).sort()).toEqual(['acelerar', 'cuerpo', 'respirar']);
  });

  it('respirar baja fatiga y acelerar la sube', () => {
    expect(INSTRUCCIONES_RINCON.respirar.mods.fatigaJugador).toBeLessThan(0);
    expect(INSTRUCCIONES_RINCON.acelerar.mods.fatigaJugador).toBeGreaterThan(0);
  });

  it('ir al cuerpo mejora la chance de golpe de gracia', () => {
    expect(INSTRUCCIONES_RINCON.cuerpo.mods.ventanaGolpe).toBeGreaterThan(0);
  });

  it('cada instruccion mapea a un plan valido', () => {
    for (const i of Object.values(INSTRUCCIONES_RINCON)) {
      expect(['frente', 'afuera', 'aguantar']).toContain(i.plan);
    }
  });
});

describe('avanzarPelea', () => {
  it('marca pendiente rincon al cerrar un round sin desenlace', () => {
    const { pelea } = avanzarPelea(armar());
    if (!pelea.terminada) expect(pelea.pendiente).toBe('rincon');
  });

  it('no marca pendiente si la pelea termino', () => {
    let pelea = armar({ nivel: 'amateur' });
    let guardia = 0;
    while (!pelea.terminada && guardia < 20) {
      guardia += 1;
      pelea = avanzarPelea(pelea).pelea;
      if (pelea.pendiente) pelea = aplicarInstruccionRincon(pelea, 'respirar');
    }
    expect(pelea.terminada).toBe(true);
    expect(pelea.pendiente).toBeNull();
  });
});

describe('estadoRincon', () => {
  it('describe como viene la pelea', () => {
    const { pelea } = avanzarPelea(armar());
    const estado = estadoRincon(pelea);
    expect(estado.tarjetasTexto).toMatch(/\d/);
    expect(typeof estado.fatigaJugador).toBe('number');
    expect(estado.consejo.length).toBeGreaterThan(0);
  });
});

describe('aplicarInstruccionRincon', () => {
  it('limpia el pendiente y cambia el plan', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'acelerar');
    expect(despues.pendiente).toBeNull();
    expect(despues.plan).toBe(INSTRUCCIONES_RINCON.acelerar.plan);
  });

  it('respirar baja la fatiga del jugador', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'respirar');
    expect(despues.fatiga.jugador).toBeLessThanOrEqual(pelea.fatiga.jugador);
  });

  it('ir al cuerpo castiga el aguante del rival', () => {
    const { pelea } = avanzarPelea(armar());
    const despues = aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(despues.aguante.rival).toBeLessThanOrEqual(pelea.aguante.rival);
  });

  it('no muta la pelea original', () => {
    const { pelea } = avanzarPelea(armar());
    const antes = JSON.stringify(pelea);
    aplicarInstruccionRincon(pelea, 'cuerpo');
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  it('rechaza una instruccion desconocida', () => {
    const { pelea } = avanzarPelea(armar());
    expect(() => aplicarInstruccionRincon(pelea, 'inventada')).toThrow(/inventada/);
  });
});

describe('golpe de gracia', () => {
  function peleaConRivalGroggy() {
    const pelea = armar();
    return { ...pelea, aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
  }

  it('define las tres zonas', () => {
    expect(Object.keys(ZONAS_GOLPE).sort()).toEqual(['higado', 'menton', 'sien']);
  });

  it('el menton es la zona mas dificil y la que mas dana', () => {
    expect(ZONAS_GOLPE.menton.dificultad).toBeGreaterThan(ZONAS_GOLPE.higado.dificultad);
    expect(ZONAS_GOLPE.menton.danoBase).toBeGreaterThan(ZONAS_GOLPE.higado.danoBase);
  });

  it('abrir la ventana informa la zona abierta y las tres opciones', () => {
    const info = abrirGolpeDeGracia(peleaConRivalGroggy());
    expect(Object.keys(ZONAS_GOLPE)).toContain(info.zonaAbierta);
    expect(info.zonas).toHaveLength(3);
    expect(info.ventanaMs).toBeGreaterThan(0);
  });

  it('acertar la zona abierta con buena precision suele terminar la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 10 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: info.zonaAbierta, precision: 1, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeGreaterThan(14);
  });

  it('no llegar a tiempo cuesta la chance y suma fatiga', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'higado', precision: 1, aTiempo: false,
    });
    expect(despues.terminada).toBe(false);
    expect(despues.pendiente).toBeNull();
    expect(despues.fatiga.jugador).toBeGreaterThan(pelea.fatiga.jugador);
    expect(despues.aguante.rival).toBeGreaterThanOrEqual(pelea.aguante.rival);
    expect(eventos.some((e) => /se recompone|se rearma|perdiste/i.test(e.texto))).toBe(true);
  });

  it('pegar en una zona tapada casi nunca termina la pelea', () => {
    let kos = 0;
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = { ...armar({ semilla }), aguante: { jugador: 80, rival: 30 }, pendiente: 'golpe' };
      const info = abrirGolpeDeGracia(pelea);
      const tapada = Object.keys(ZONAS_GOLPE).find((z) => z !== info.zonaAbierta);
      const { pelea: despues } = resolverGolpeDeGracia(pelea, {
        zonaElegida: tapada, precision: 0.2, aTiempo: true,
      });
      if (despues.terminada) kos += 1;
    }
    expect(kos).toBeLessThan(8);
  });

  it('siempre limpia el pendiente y narra algo', () => {
    const pelea = peleaConRivalGroggy();
    const { pelea: despues, eventos } = resolverGolpeDeGracia(pelea, {
      zonaElegida: 'menton', precision: 0.5, aTiempo: true,
    });
    expect(despues.pendiente).toBeNull();
    expect(eventos.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/fight-interactive.test.js`
Expected: FAIL — no se puede resolver `../../src/core/fight-interactive.js`.

- [ ] **Step 3: Implementar `src/core/fight-interactive.js`**

```js
import { createRng } from './rng.js';
import { clamp } from './stats.js';
import { simularRound, PLANES } from './fight.js';

export const UMBRAL_GROGGY = 22;
export const VENTANA_MS = 3200;

export const INSTRUCCIONES_RINCON = {
  acelerar: {
    id: 'acelerar',
    nombre: 'Pisá el acelerador',
    texto: 'Ir a buscarlo. Das vuelta las tarjetas si aguantás el gas.',
    plan: 'frente',
    mods: { aguanteRival: -4, fatigaJugador: 6, ventanaGolpe: 0.05 },
  },
  respirar: {
    id: 'respirar',
    nombre: 'Boxeá y respirá',
    texto: 'Movés y tocás sin arriesgar. Recuperás fatiga.',
    plan: 'aguantar',
    mods: { aguanteRival: 0, fatigaJugador: -10, ventanaGolpe: 0 },
  },
  cuerpo: {
    id: 'cuerpo',
    nombre: 'Todo al cuerpo',
    texto: 'Castigás el cuerpo. Le abrís la puerta al nocaut.',
    plan: 'afuera',
    mods: { aguanteRival: -8, fatigaJugador: 3, ventanaGolpe: 0.18 },
  },
};

export const ZONAS_GOLPE = {
  menton: { id: 'menton', nombre: 'Mentón', dificultad: 0.75, danoBase: 60 },
  sien: { id: 'sien', nombre: 'Sien', dificultad: 0.5, danoBase: 42 },
  higado: { id: 'higado', nombre: 'Hígado', dificultad: 0.3, danoBase: 34 },
};

function clonar(pelea) {
  return {
    ...pelea,
    aguante: { ...pelea.aguante },
    fatiga: { ...pelea.fatiga },
    tarjetas: { ...pelea.tarjetas },
    caidas: { ...pelea.caidas },
  };
}

export function avanzarPelea(pelea) {
  const paso = simularRound(pelea);
  if (paso.pelea.terminada) return { pelea: { ...paso.pelea, pendiente: null }, eventos: paso.eventos };

  const bonus = pelea.bonusVentana ?? 0;
  const rivalGroggy = paso.pelea.aguante.rival <= UMBRAL_GROGGY;
  const rng = createRng(paso.pelea.semilla);
  rng.restaurar(paso.pelea.rngEstado);
  const seAbre = rivalGroggy && rng.chance(clamp(0.45 + bonus, 0, 0.9));
  const rngEstado = rng.estado();

  return {
    pelea: { ...paso.pelea, rngEstado, pendiente: seAbre ? 'golpe' : 'rincon', bonusVentana: 0 },
    eventos: paso.eventos,
  };
}

export function estadoRincon(pelea) {
  const { jugador, rival } = pelea.tarjetas;
  const diferencia = jugador - rival;
  const tarjetasTexto = diferencia === 0
    ? `Empatado ${jugador}-${rival}`
    : diferencia > 0 ? `Vas ${jugador}-${rival} arriba` : `Vas ${jugador}-${rival} abajo`;

  let consejo;
  if (diferencia < 0 && pelea.fatiga.jugador > 60) {
    consejo = 'Te está afanando los rounds y venís sin gas. Elegí con qué te la juegás.';
  } else if (diferencia < 0) {
    consejo = 'Te está afanando los rounds con el jab. O le metés presión o esto se va en las tarjetas.';
  } else if (pelea.fatiga.jugador > 60) {
    consejo = 'Vas bien, pero estás fundido. Cuidá el gas y no regales nada.';
  } else {
    consejo = 'Lo tenés medido. Sostené el plan y no te apures.';
  }

  return {
    tarjetasTexto,
    fatigaJugador: Math.round(pelea.fatiga.jugador),
    fatigaRival: Math.round(pelea.fatiga.rival),
    aguanteRival: Math.round(pelea.aguante.rival),
    consejo,
  };
}

export function aplicarInstruccionRincon(pelea, instruccionId) {
  const instruccion = INSTRUCCIONES_RINCON[instruccionId];
  if (!instruccion) throw new Error(`Instrucción desconocida: ${instruccionId}`);
  const nueva = clonar(pelea);
  nueva.plan = instruccion.plan;
  nueva.aguante.rival = clamp(nueva.aguante.rival + instruccion.mods.aguanteRival, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + instruccion.mods.fatigaJugador, 0, 100);
  nueva.bonusVentana = instruccion.mods.ventanaGolpe;
  nueva.pendiente = null;
  return nueva;
}

export function abrirGolpeDeGracia(pelea) {
  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);
  const zonaAbierta = rng.weighted([
    { valor: 'higado', peso: 5 },
    { valor: 'sien', peso: 3 },
    { valor: 'menton', peso: 1 },
  ]);
  const zonas = Object.values(ZONAS_GOLPE).map((zona) => ({
    ...zona,
    estado: zona.id === zonaAbierta ? 'abierto' : zona.id === 'menton' ? 'tapado' : 'riesgoso',
  }));
  return { zonaAbierta, zonas, ventanaMs: VENTANA_MS };
}

export function resolverGolpeDeGracia(pelea, { zonaElegida, precision, aTiempo }) {
  const nueva = clonar(pelea);
  nueva.pendiente = null;
  nueva.bonusVentana = 0;
  const eventos = [];
  const round = nueva.roundActual;
  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  if (!aTiempo) {
    nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 8, 0, 100);
    nueva.aguante.rival = clamp(nueva.aguante.rival + 8, 0, 100);
    eventos.push({
      round,
      tipo: 'ventana_perdida',
      texto: `${apodoJ} duda medio segundo de más y ${apodoR} se recompone. Perdiste la chance.`,
    });
    return { pelea: nueva, eventos };
  }

  const rng = createRng(nueva.semilla);
  rng.restaurar(nueva.rngEstado);
  const { zonaAbierta } = abrirGolpeDeGracia(pelea);
  const zona = ZONAS_GOLPE[zonaElegida] ?? ZONAS_GOLPE.higado;
  const acerto = zonaElegida === zonaAbierta;

  const potencia = nueva.snapshot.jugador.atributos.potencia;
  const mentonRival = nueva.snapshot.rival.especiales.menton;
  const base = clamp(precision, 0, 1) * (acerto ? 1 : 0.35) * (1 - zona.dificultad * 0.4);
  const probKo = clamp(base * 1.5 + (potencia - mentonRival) / 300, 0, 0.97);

  const dano = Math.round(zona.danoBase * clamp(precision, 0, 1) * (acerto ? 1 : 0.4));
  nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 5, 0, 100);

  if (nueva.aguante.rival <= 0 || rng.chance(probKo)) {
    nueva.terminada = true;
    nueva.resultado = {
      ganador: 'jugador',
      metodo: nueva.caidas.rival >= 1 ? 'tko' : 'ko',
      round,
      texto: `${apodoJ} gana por nocaut en el round ${round}.`,
    };
    eventos.push({
      round,
      tipo: 'ko',
      texto: acerto
        ? `${apodoJ} la manda al ${zona.nombre.toLowerCase()} y ${apodoR} se dobla. ¡Se terminó!`
        : `${apodoJ} pega donde puede y ${apodoR} igual se cae. ¡Nocaut!`,
    });
  } else {
    nueva.caidas.rival += acerto ? 1 : 0;
    eventos.push({
      round,
      tipo: 'golpe_fallado',
      texto: acerto
        ? `${apodoJ} conecta al ${zona.nombre.toLowerCase()} pero ${apodoR} aguanta y se rearma.`
        : `${apodoJ} apunta al ${zona.nombre.toLowerCase()} y encuentra la guardia. ${apodoR} se recompone.`,
    });
  }

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/fight-interactive.test.js`
Expected: PASS (18 tests).

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/fight-interactive.js tests/core/fight-interactive.test.js
git commit -m "feat: minijuegos del rincon y golpe de gracia integrados a la pelea"
```

---

## Task 10: Lesiones

**Files:**
- Create: `src/core/injuries.js`
- Test: `tests/core/injuries.test.js`

**Interfaces:**
- Consumes: `clamp`; `createRng`.
- Produces:
  - `LESIONES: Array<{id,nombre,severidad:1|2|3,bloques:number,costo:number,modsForma:number,texto:string}>` — al menos 6.
  - `tirarLesion(rng, {peleador, contexto: 'pelea'|'entrenamiento', danoRecibido?: number}): Lesion|null` — `Lesion` = `{id, nombre, severidad, bloquesRestantes, costo, texto}`.
  - `aplicarLesion(peleador, lesion): Peleador` — no muta; baja forma, setea `estado.lesion`.
  - `recuperar(peleador, {bloques?: number}): {peleador: Peleador, curada: boolean}`
  - `curarConDinero(peleador, lesion): {peleador: Peleador, gasto: number, ok: boolean}`
  - `puedePelear(peleador): boolean` — falso solo con severidad 3 activa.
  - **Regla indulgente:** ninguna lesión retira al jugador. `forzaRetiro` existe solo si `severidad === 3` y `edad >= 36`, y aun así devuelve `false` salvo que `rng.chance(0.15)`.

- [ ] **Step 1: Escribir `tests/core/injuries.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  LESIONES, tirarLesion, aplicarLesion, recuperar, curarConDinero, puedePelear,
} from '../../src/core/injuries.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de lesiones', () => {
  it('tiene al menos seis lesiones con severidad 1 a 3', () => {
    expect(LESIONES.length).toBeGreaterThanOrEqual(6);
    const severidades = new Set(LESIONES.map((l) => l.severidad));
    expect([...severidades].sort()).toEqual([1, 2, 3]);
  });

  it('las mas graves duran mas y cuestan mas', () => {
    const leve = LESIONES.find((l) => l.severidad === 1);
    const grave = LESIONES.find((l) => l.severidad === 3);
    expect(grave.bloques).toBeGreaterThan(leve.bloques);
    expect(grave.costo).toBeGreaterThan(leve.costo);
  });
});

describe('tirarLesion', () => {
  it('es determinista', () => {
    const a = tirarLesion(createRng(5), { peleador: jugador(), contexto: 'pelea', danoRecibido: 80 });
    const b = tirarLesion(createRng(5), { peleador: jugador(), contexto: 'pelea', danoRecibido: 80 });
    expect(a).toEqual(b);
  });

  it('casi nunca lesiona en entrenamiento', () => {
    let lesiones = 0;
    for (let s = 1; s <= 100; s++) {
      if (tirarLesion(createRng(s), { peleador: jugador(), contexto: 'entrenamiento' })) lesiones++;
    }
    expect(lesiones).toBeLessThan(15);
  });

  it('lesiona mas seguido cuanto mas dano se recibio', () => {
    const contar = (dano) => {
      let n = 0;
      for (let s = 1; s <= 100; s++) {
        if (tirarLesion(createRng(s), { peleador: jugador(), contexto: 'pelea', danoRecibido: dano })) n++;
      }
      return n;
    };
    expect(contar(95)).toBeGreaterThan(contar(10));
  });

  it('la disciplina personal alta protege', () => {
    const contar = (disciplinaPersonal) => {
      let n = 0;
      for (let s = 1; s <= 100; s++) {
        const p = jugador();
        p.especiales = { ...p.especiales, disciplinaPersonal };
        if (tirarLesion(createRng(s), { peleador: p, contexto: 'pelea', danoRecibido: 70 })) n++;
      }
      return n;
    };
    expect(contar(95)).toBeLessThan(contar(15));
  });

  it('devuelve una lesion con bloques restantes', () => {
    let lesion = null;
    for (let s = 1; s <= 200 && !lesion; s++) {
      lesion = tirarLesion(createRng(s), { peleador: jugador(), contexto: 'pelea', danoRecibido: 99 });
    }
    expect(lesion).toBeTruthy();
    expect(lesion.bloquesRestantes).toBeGreaterThan(0);
    expect(lesion.texto).toBeTruthy();
  });
});

describe('aplicarLesion', () => {
  it('no muta y baja la forma', () => {
    const p = jugador();
    const formaAntes = p.estado.forma;
    const lesion = { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, bloquesRestantes: 1, costo: 5000, texto: 'x' };
    const nuevo = aplicarLesion(p, lesion);
    expect(p.estado.lesion).toBeNull();
    expect(nuevo.estado.lesion.id).toBe('ceja');
    expect(nuevo.estado.forma).toBeLessThan(formaAntes);
  });
});

describe('recuperar', () => {
  it('descuenta bloques y cura al llegar a cero', () => {
    let p = aplicarLesion(jugador(), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    let paso = recuperar(p, { bloques: 1 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion.bloquesRestantes).toBe(1);
    paso = recuperar(paso.peleador, { bloques: 1 });
    expect(paso.curada).toBe(true);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  it('sin lesion no hace nada', () => {
    const paso = recuperar(jugador(), { bloques: 3 });
    expect(paso.curada).toBe(false);
    expect(paso.peleador.estado.lesion).toBeNull();
  });
});

describe('curarConDinero', () => {
  it('cura al instante si alcanza la plata', () => {
    let p = aplicarLesion(jugador({ dinero: 100000 }), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(true);
    expect(paso.gasto).toBe(20000);
    expect(paso.peleador.dinero).toBe(80000);
    expect(paso.peleador.estado.lesion).toBeNull();
  });

  it('falla si no alcanza y no cobra nada', () => {
    let p = aplicarLesion(jugador({ dinero: 100 }), {
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloquesRestantes: 2, costo: 20000, texto: 'x',
    });
    const paso = curarConDinero(p, p.estado.lesion);
    expect(paso.ok).toBe(false);
    expect(paso.gasto).toBe(0);
    expect(paso.peleador.dinero).toBe(100);
    expect(paso.peleador.estado.lesion).not.toBeNull();
  });
});

describe('puedePelear', () => {
  it('permite pelear sano o con lesion leve', () => {
    expect(puedePelear(jugador())).toBe(true);
    const leve = aplicarLesion(jugador(), { id: 'ceja', nombre: 'Ceja', severidad: 1, bloquesRestantes: 1, costo: 1, texto: 'x' });
    expect(puedePelear(leve)).toBe(true);
  });

  it('bloquea solo con lesion grave', () => {
    const grave = aplicarLesion(jugador(), { id: 'rodilla', nombre: 'Rodilla', severidad: 3, bloquesRestantes: 3, costo: 1, texto: 'x' });
    expect(puedePelear(grave)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/injuries.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/core/injuries.js`**

```js
import { clamp } from './stats.js';

export const LESIONES = [
  { id: 'ceja', nombre: 'Corte en la ceja', severidad: 1, bloques: 1, costo: 4000, modsForma: -8, texto: 'Te abrieron la ceja. Nada grave, pero molesta.' },
  { id: 'nariz', nombre: 'Nariz rota', severidad: 1, bloques: 1, costo: 6000, modsForma: -10, texto: 'Nariz rota. Vas a respirar por la boca un tiempo.' },
  { id: 'costillas', nombre: 'Costillas golpeadas', severidad: 2, bloques: 2, costo: 18000, modsForma: -18, texto: 'Costillas golpeadas: cada respiración te recuerda la pelea.' },
  { id: 'mano', nombre: 'Mano fracturada', severidad: 2, bloques: 2, costo: 22000, modsForma: -20, texto: 'Te fracturaste la mano. Yeso y paciencia.' },
  { id: 'hombro', nombre: 'Hombro dislocado', severidad: 2, bloques: 3, costo: 28000, modsForma: -22, texto: 'Hombro dislocado. Kinesiología por un buen rato.' },
  { id: 'rodilla', nombre: 'Ligamentos de la rodilla', severidad: 3, bloques: 4, costo: 60000, modsForma: -30, texto: 'Ligamentos de la rodilla. Esta es de las que asustan.' },
  { id: 'conmocion', nombre: 'Conmoción', severidad: 3, bloques: 4, costo: 55000, modsForma: -28, texto: 'Conmoción cerebral. El médico fue tajante: descanso.' },
];

const PROB_BASE = { pelea: 0.18, entrenamiento: 0.05 };

export function tirarLesion(rng, { peleador, contexto = 'pelea', danoRecibido = 0 }) {
  const base = PROB_BASE[contexto] ?? 0.05;
  const porDano = clamp(danoRecibido, 0, 100) / 400;
  const proteccion = (peleador.especiales?.disciplinaPersonal ?? 40) / 500;
  const staffProtege = (peleador.staff ?? []).includes('kinesiologo') ? 0.06 : 0;
  const prob = clamp(base + porDano - proteccion - staffProtege, 0.01, 0.6);
  if (!rng.chance(prob)) return null;

  const pesos = LESIONES.map((l) => ({
    valor: l,
    peso: l.severidad === 1 ? 6 : l.severidad === 2 ? 3 : 1,
  }));
  const elegida = rng.weighted(pesos);
  return {
    id: elegida.id,
    nombre: elegida.nombre,
    severidad: elegida.severidad,
    bloquesRestantes: elegida.bloques,
    costo: elegida.costo,
    modsForma: elegida.modsForma,
    texto: elegida.texto,
  };
}

function clonar(peleador) {
  return { ...peleador, estado: { ...peleador.estado } };
}

export function aplicarLesion(peleador, lesion) {
  const nuevo = clonar(peleador);
  const catalogo = LESIONES.find((l) => l.id === lesion.id);
  const modsForma = lesion.modsForma ?? catalogo?.modsForma ?? -10;
  nuevo.estado.lesion = { ...lesion };
  nuevo.estado.forma = clamp(nuevo.estado.forma + modsForma, 0, 100);
  return nuevo;
}

export function recuperar(peleador, { bloques = 1 } = {}) {
  if (!peleador.estado.lesion) return { peleador, curada: false };
  const nuevo = clonar(peleador);
  const restantes = nuevo.estado.lesion.bloquesRestantes - bloques;
  if (restantes <= 0) {
    nuevo.estado.lesion = null;
    nuevo.estado.forma = clamp(nuevo.estado.forma + 10, 0, 100);
    return { peleador: nuevo, curada: true };
  }
  nuevo.estado.lesion = { ...nuevo.estado.lesion, bloquesRestantes: restantes };
  return { peleador: nuevo, curada: false };
}

export function curarConDinero(peleador, lesion) {
  if (!lesion || peleador.dinero < lesion.costo) {
    return { peleador, gasto: 0, ok: false };
  }
  const nuevo = clonar(peleador);
  nuevo.dinero -= lesion.costo;
  nuevo.estado.lesion = null;
  nuevo.estado.forma = clamp(nuevo.estado.forma + 15, 0, 100);
  return { peleador: nuevo, gasto: lesion.costo, ok: true };
}

export function puedePelear(peleador) {
  const lesion = peleador.estado.lesion;
  return !lesion || lesion.severidad < 3;
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/injuries.test.js`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/injuries.js tests/core/injuries.test.js
git commit -m "feat: lesiones indulgentes con recuperacion por bloques o dinero"
```

---

## Task 11: Ofertas de pelea, títulos y negociación de bolsa

**Files:**
- Create: `src/core/offers.js`
- Create: `src/core/negotiation.js`
- Test: `tests/core/offers.test.js`
- Test: `tests/core/negotiation.test.js`

**Interfaces:**
- Consumes: `buscarRival`, `mediaDe`, `clamp`, `createRng`.
- Produces (`offers.js`):
  - `NIVELES: Record<'local'|'regional'|'eliminatoria'|'titulo'|'defensa', {id,nombre,nivelPelea,multiplicadorBolsa,famaBase}>`
  - `generarOferta(rng, {jugador, mundo, etapa, rivalidades?, forzarTitulo?}): Oferta|null`
  - `Oferta` = `{ id, rivalId, rivalNombre, rivalApodo, rivalMedia, rivalRecord: string, rivalEstilo, nivel, nivelPelea, bolsa, riesgo: 'bajo'|'medio'|'alto', enJuego: string, esTitulo: boolean, esObligatoria: boolean, esRevancha: boolean, textoGancho: string }`
  - `evaluarRiesgo(jugador, rival): 'bajo'|'medio'|'alto'`
  - `rechazarOferta(jugador, oferta): {jugador, texto: string}` — cuesta fama.
  - `aplicarResultado(jugador, {oferta, resultado, mundo}): {jugador, titulosGanados: string[], texto: string}`
- Produces (`negotiation.js`):
  - `MOVIDAS: Record<'cerrar'|'masPlata'|'taquilla'|'apretar', {id,nombre,texto,riesgoBase:number,mejora:{bolsa?:number,condicion?:string}}>`
  - `crearNegociacion(oferta, {tieneManager?: boolean}): Negociacion`
  - `jugarMovida(negociacion, movidaId, rng): {negociacion, evento: {tipo:'acepta'|'rechaza'|'cierra', texto: string}}`
  - `resultadoNegociacion(negociacion): {bolsa: number, condiciones: string[], perdida: boolean}`

- [ ] **Step 1: Escribir `tests/core/offers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador, mediaDe } from '../../src/core/fighter.js';
import { crearMundo } from '../../src/core/world.js';
import { NIVELES, generarOferta, evaluarRiesgo, rechazarOferta, aplicarResultado } from '../../src/core/offers.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}
const mundo = () => crearMundo(createRng(1), { disciplina: 'boxeo', categoria: 'pluma', cantidad: 10 });

describe('niveles', () => {
  it('el titulo paga mas que lo local', () => {
    expect(NIVELES.titulo.multiplicadorBolsa).toBeGreaterThan(NIVELES.local.multiplicadorBolsa);
  });

  it('cada nivel mapea a un nivel de pelea valido', () => {
    for (const n of Object.values(NIVELES)) {
      expect(['amateur', 'profesional', 'titulo']).toContain(n.nivelPelea);
    }
  });
});

describe('generarOferta', () => {
  it('genera una oferta completa', () => {
    const oferta = generarOferta(createRng(2), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(oferta.rivalId).toBeTruthy();
    expect(oferta.rivalRecord).toMatch(/\d+-\d+/);
    expect(oferta.bolsa).toBeGreaterThan(0);
    expect(['bajo', 'medio', 'alto']).toContain(oferta.riesgo);
    expect(oferta.enJuego.length).toBeGreaterThan(0);
    expect(oferta.textoGancho.length).toBeGreaterThan(0);
  });

  it('en juvenil y amateur no ofrece titulos', () => {
    for (const etapa of ['juvenil', 'amateur']) {
      const oferta = generarOferta(createRng(3), { jugador: jugador(), mundo: mundo(), etapa });
      expect(oferta.esTitulo).toBe(false);
    }
  });

  it('paga mas en profesional que en amateur', () => {
    const am = generarOferta(createRng(4), { jugador: jugador(), mundo: mundo(), etapa: 'amateur' });
    const pro = generarOferta(createRng(4), { jugador: jugador({ fama: 40 }), mundo: mundo(), etapa: 'profesional' });
    expect(pro.bolsa).toBeGreaterThan(am.bolsa);
  });

  it('mas fama, mas bolsa', () => {
    const pobre = generarOferta(createRng(5), { jugador: jugador({ fama: 0 }), mundo: mundo(), etapa: 'profesional' });
    const famoso = generarOferta(createRng(5), { jugador: jugador({ fama: 90 }), mundo: mundo(), etapa: 'profesional' });
    expect(famoso.bolsa).toBeGreaterThan(pobre.bolsa);
  });

  it('puede forzar una pelea de titulo', () => {
    const oferta = generarOferta(createRng(6), {
      jugador: jugador(), mundo: mundo(), etapa: 'profesional', forzarTitulo: true,
    });
    expect(oferta.esTitulo).toBe(true);
    expect(oferta.nivelPelea).toBe('titulo');
  });

  it('marca revancha si ya se cruzaron', () => {
    const m = mundo();
    const rival = m.roster[3];
    const oferta = generarOferta(createRng(7), {
      jugador: jugador(), mundo: m, etapa: 'profesional',
      rivalidades: [{ rivalId: rival.id, heat: 80, h2h: { v: 0, d: 1, e: 0 }, esArchirrival: true, hitos: [] }],
    });
    if (oferta.rivalId === rival.id) expect(oferta.esRevancha).toBe(true);
  });

  it('devuelve null si no hay rivales disponibles', () => {
    const m = mundo();
    for (const p of m.roster) p.retirado = true;
    expect(generarOferta(createRng(8), { jugador: jugador(), mundo: m, etapa: 'profesional' })).toBeNull();
  });

  it('es determinista', () => {
    const a = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    const b = generarOferta(createRng(9), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });
    expect(a).toEqual(b);
  });
});

describe('evaluarRiesgo', () => {
  it('un rival muy superior es riesgo alto', () => {
    const yo = jugador();
    const rival = crearPeleador({
      nombre: 'Bestia', apodo: 'La Bestia', nacionalidad: 'US', disciplina: 'boxeo',
      estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 90,
    });
    expect(mediaDe(rival)).toBeGreaterThan(mediaDe(yo));
    expect(evaluarRiesgo(yo, rival)).toBe('alto');
  });

  it('un rival muy inferior es riesgo bajo', () => {
    const yo = jugador();
    const rival = crearPeleador({
      nombre: 'Novato', apodo: 'El Novato', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 30,
    });
    expect(evaluarRiesgo(yo, rival)).toBe('bajo');
  });
});

describe('rechazarOferta', () => {
  it('cuesta fama y devuelve un texto', () => {
    const yo = jugador({ fama: 30 });
    const oferta = generarOferta(createRng(10), { jugador: yo, mundo: mundo(), etapa: 'profesional' });
    const paso = rechazarOferta(yo, oferta);
    expect(paso.jugador.fama).toBeLessThan(30);
    expect(paso.texto).toBeTruthy();
  });

  it('nunca deja la fama negativa', () => {
    const yo = jugador({ fama: 0 });
    const oferta = generarOferta(createRng(11), { jugador: yo, mundo: mundo(), etapa: 'profesional' });
    expect(rechazarOferta(yo, oferta).jugador.fama).toBe(0);
  });
});

describe('aplicarResultado', () => {
  const oferta = () => generarOferta(createRng(12), { jugador: jugador(), mundo: mundo(), etapa: 'profesional' });

  it('ganar suma victoria, bolsa y fama', () => {
    const yo = jugador({ fama: 10, dinero: 0 });
    const o = oferta();
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 3, texto: 'KO' },
    });
    expect(paso.jugador.record.v).toBe(1);
    expect(paso.jugador.record.ko).toBe(1);
    expect(paso.jugador.dinero).toBe(o.bolsa);
    expect(paso.jugador.fama).toBeGreaterThan(10);
  });

  it('perder suma derrota pero igual paga la bolsa', () => {
    const yo = jugador({ dinero: 0 });
    const o = oferta();
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'decision', round: 8, texto: 'Perdiste' },
    });
    expect(paso.jugador.record.d).toBe(1);
    expect(paso.jugador.dinero).toBe(o.bolsa);
  });

  it('empatar suma empate', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'empate', metodo: 'decision', round: 8, texto: 'Empate' },
    });
    expect(paso.jugador.record.e).toBe(1);
  });

  it('ganar un titulo lo suma y arranca las defensas', () => {
    const o = { ...oferta(), esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(jugador(), {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 5, texto: 'KO' },
    });
    expect(paso.titulosGanados).toContain('Título regional');
    expect(paso.jugador.titulos).toContain('Título regional');
  });

  it('defender un titulo suma una defensa', () => {
    const yo = jugador({ titulos: ['Título regional'], defensas: 0 });
    const o = { ...oferta(), esObligatoria: true, esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'decision', round: 12, texto: 'Ganó' },
    });
    expect(paso.jugador.defensas).toBe(1);
  });

  it('perder el titulo lo saca de la lista', () => {
    const yo = jugador({ titulos: ['Título regional'] });
    const o = { ...oferta(), esTitulo: true, enJuego: 'Título regional' };
    const paso = aplicarResultado(yo, {
      oferta: o, mundo: mundo(),
      resultado: { ganador: 'rival', metodo: 'ko', round: 4, texto: 'Perdió' },
    });
    expect(paso.jugador.titulos).not.toContain('Título regional');
  });

  it('guarda la pelea en el historial', () => {
    const paso = aplicarResultado(jugador(), {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(paso.jugador.historial).toHaveLength(1);
    expect(paso.jugador.historial[0].metodo).toBe('ko');
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    aplicarResultado(yo, {
      oferta: oferta(), mundo: mundo(),
      resultado: { ganador: 'jugador', metodo: 'ko', round: 2, texto: 'KO' },
    });
    expect(JSON.stringify(yo)).toBe(antes);
  });
});
```

- [ ] **Step 2: Escribir `tests/core/negotiation.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { MOVIDAS, crearNegociacion, jugarMovida, resultadoNegociacion } from '../../src/core/negotiation.js';

const oferta = { id: 'of_1', bolsa: 8000, enJuego: 'Título regional' };

describe('movidas', () => {
  it('define las cuatro movidas', () => {
    expect(Object.keys(MOVIDAS).sort()).toEqual(['apretar', 'cerrar', 'masPlata', 'taquilla']);
  });

  it('cerrar no tiene riesgo y apretar es la mas riesgosa', () => {
    expect(MOVIDAS.cerrar.riesgoBase).toBe(0);
    expect(MOVIDAS.apretar.riesgoBase).toBeGreaterThan(MOVIDAS.masPlata.riesgoBase);
  });
});

describe('crearNegociacion', () => {
  it('arranca con la bolsa de la oferta y paciencia llena', () => {
    const n = crearNegociacion(oferta);
    expect(n.bolsa).toBe(8000);
    expect(n.bolsaInicial).toBe(8000);
    expect(n.paciencia).toBe(100);
    expect(n.cerrada).toBe(false);
    expect(n.perdida).toBe(false);
  });

  it('el super manager baja el riesgo', () => {
    expect(crearNegociacion(oferta, { tieneManager: true }).reduccionRiesgo).toBeGreaterThan(0);
    expect(crearNegociacion(oferta, { tieneManager: false }).reduccionRiesgo).toBe(0);
  });
});

describe('jugarMovida', () => {
  it('cerrar termina la negociacion sin riesgo', () => {
    const { negociacion, evento } = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(1));
    expect(negociacion.cerrada).toBe(true);
    expect(negociacion.perdida).toBe(false);
    expect(evento.tipo).toBe('cierra');
  });

  it('pedir mas plata a veces sube la bolsa', () => {
    let subio = false;
    for (let s = 1; s <= 30 && !subio; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(s));
      if (negociacion.bolsa > 8000) subio = true;
    }
    expect(subio).toBe(true);
  });

  it('cada movida arriesgada baja la paciencia', () => {
    const { negociacion } = jugarMovida(crearNegociacion(oferta), 'masPlata', createRng(2));
    expect(negociacion.paciencia).toBeLessThan(100);
  });

  it('apretar puede hacer que el promotor se levante', () => {
    let perdidas = 0;
    for (let s = 1; s <= 40; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'apretar', createRng(s));
      if (negociacion.perdida) perdidas++;
    }
    expect(perdidas).toBeGreaterThan(10);
  });

  it('el manager reduce las perdidas', () => {
    const contar = (tieneManager) => {
      let n = 0;
      for (let s = 1; s <= 60; s++) {
        const { negociacion } = jugarMovida(crearNegociacion(oferta, { tieneManager }), 'apretar', createRng(s));
        if (negociacion.perdida) n++;
      }
      return n;
    };
    expect(contar(true)).toBeLessThan(contar(false));
  });

  it('taquilla agrega una condicion cuando el promotor acepta', () => {
    let conCondicion = false;
    for (let s = 1; s <= 40 && !conCondicion; s++) {
      const { negociacion } = jugarMovida(crearNegociacion(oferta), 'taquilla', createRng(s));
      if (negociacion.condiciones.includes(MOVIDAS.taquilla.mejora.condicion)) conCondicion = true;
    }
    expect(conCondicion).toBe(true);
  });

  it('no se puede seguir jugando una negociacion cerrada', () => {
    const cerrada = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(3)).negociacion;
    const { negociacion, evento } = jugarMovida(cerrada, 'apretar', createRng(4));
    expect(negociacion).toEqual(cerrada);
    expect(evento).toBeNull();
  });

  it('rechaza una movida desconocida', () => {
    expect(() => jugarMovida(crearNegociacion(oferta), 'inventada', createRng(5))).toThrow(/inventada/);
  });

  it('no muta la negociacion original', () => {
    const n = crearNegociacion(oferta);
    const antes = JSON.stringify(n);
    jugarMovida(n, 'masPlata', createRng(6));
    expect(JSON.stringify(n)).toBe(antes);
  });
});

describe('resultadoNegociacion', () => {
  it('al perder devuelve la bolsa inicial degradada', () => {
    let n = crearNegociacion(oferta);
    let guardia = 0;
    while (!n.perdida && guardia < 50) {
      guardia += 1;
      n = jugarMovida(n, 'apretar', createRng(guardia)).negociacion;
    }
    const r = resultadoNegociacion(n);
    expect(r.perdida).toBe(true);
    expect(r.bolsa).toBeLessThan(8000);
  });

  it('al cerrar devuelve la bolsa negociada', () => {
    const n = jugarMovida(crearNegociacion(oferta), 'cerrar', createRng(7)).negociacion;
    const r = resultadoNegociacion(n);
    expect(r.perdida).toBe(false);
    expect(r.bolsa).toBe(8000);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/offers.test.js tests/core/negotiation.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 4: Implementar `src/core/offers.js`**

```js
import { buscarRival } from './world.js';
import { mediaDe, recordTexto } from './fighter.js';
import { clamp } from './stats.js';

export const NIVELES = {
  local: { id: 'local', nombre: 'Torneo local', nivelPelea: 'amateur', multiplicadorBolsa: 0.4, famaBase: 2 },
  regional: { id: 'regional', nombre: 'Cartelera regional', nivelPelea: 'profesional', multiplicadorBolsa: 1, famaBase: 4 },
  eliminatoria: { id: 'eliminatoria', nombre: 'Eliminatoria', nivelPelea: 'profesional', multiplicadorBolsa: 1.8, famaBase: 7 },
  titulo: { id: 'titulo', nombre: 'Pelea de título', nivelPelea: 'titulo', multiplicadorBolsa: 4, famaBase: 15 },
  defensa: { id: 'defensa', nombre: 'Defensa obligatoria', nivelPelea: 'titulo', multiplicadorBolsa: 3.2, famaBase: 10 },
};

const BOLSA_BASE = 3000;

export function evaluarRiesgo(jugador, rival) {
  const diferencia = mediaDe(rival) - mediaDe(jugador);
  if (diferencia >= 8) return 'alto';
  if (diferencia <= -8) return 'bajo';
  return 'medio';
}

function nivelPara(etapa, { esCampeon, forzarTitulo }) {
  if (forzarTitulo) return NIVELES.titulo;
  if (esCampeon) return NIVELES.defensa;
  if (etapa === 'juvenil' || etapa === 'amateur') return NIVELES.local;
  if (etapa === 'veterano') return NIVELES.eliminatoria;
  return NIVELES.regional;
}

let contadorOferta = 0;

export function generarOferta(rng, { jugador, mundo, etapa, rivalidades = [], forzarTitulo = false }) {
  const esCampeon = jugador.titulos.length > 0;
  const nivel = nivelPara(etapa, { esCampeon, forzarTitulo });

  const archirrival = rivalidades.find((r) => r.esArchirrival);
  const rankingObjetivo = clamp((jugador.ranking ?? 10) - rng.int(0, 3), 1, 12);
  const rival = (archirrival && rng.chance(0.3)
    ? mundo.roster.find((p) => p.id === archirrival.rivalId && !p.retirado)
    : null) ?? buscarRival(mundo, { excluirIds: [jugador.id], rankingCerca: rankingObjetivo });

  if (!rival) return null;

  const riesgo = evaluarRiesgo(jugador, rival);
  const bolsa = Math.round(
    BOLSA_BASE * nivel.multiplicadorBolsa * (1 + jugador.fama / 60) * (1 + mediaDe(rival) / 120) * rng.float(0.9, 1.15),
  );

  const cruce = rivalidades.find((r) => r.rivalId === rival.id);
  const esRevancha = Boolean(cruce && (cruce.h2h.v + cruce.h2h.d + cruce.h2h.e) > 0);
  const esTitulo = nivel.id === 'titulo' || nivel.id === 'defensa';
  const enJuego = esTitulo
    ? (jugador.titulos[0] ?? `Título ${mundo.categoria}`)
    : nivel.id === 'eliminatoria' ? 'Puesto de retador' : `Subís al ranking si ganás`;

  contadorOferta += 1;
  const gancho = esRevancha
    ? `${rival.apodo} quiere la revancha. Vos sabés lo que pasó la última vez.`
    : rival.esParodia
      ? `${rival.nombre} te nombró en una entrevista. El teléfono no para.`
      : `"${rival.apodo}" ${rival.nombre} te quiere cruzar.`;

  return {
    id: `of_${contadorOferta}`,
    rivalId: rival.id,
    rivalNombre: rival.nombre,
    rivalApodo: rival.apodo,
    rivalMedia: mediaDe(rival),
    rivalRecord: recordTexto(rival),
    rivalEstilo: rival.estilo,
    rivalPersonalidad: rival.personalidad,
    nivel: nivel.id,
    nivelPelea: nivel.nivelPelea,
    bolsa,
    riesgo,
    enJuego,
    esTitulo,
    esObligatoria: nivel.id === 'defensa',
    esRevancha,
    famaBase: nivel.famaBase,
    textoGancho: gancho,
  };
}

function clonarJugador(jugador) {
  return {
    ...jugador,
    record: { ...jugador.record },
    estado: { ...jugador.estado },
    titulos: [...jugador.titulos],
    historial: [...jugador.historial],
  };
}

export function rechazarOferta(jugador, oferta) {
  const nuevo = clonarJugador(jugador);
  const costo = oferta.esObligatoria ? 12 : 4;
  nuevo.fama = clamp(nuevo.fama - costo, 0, 100);
  const texto = oferta.esObligatoria
    ? `Rechazaste una defensa obligatoria. La comisión te la va a hacer pagar.`
    : `Le dijiste que no a ${oferta.rivalApodo}. Algunos dicen que le escapaste.`;
  return { jugador: nuevo, texto };
}

export function aplicarResultado(jugador, { oferta, resultado }) {
  const nuevo = clonarJugador(jugador);
  const titulosGanados = [];
  const gano = resultado.ganador === 'jugador';
  const empate = resultado.ganador === 'empate';

  if (gano) {
    nuevo.record.v += 1;
    if (resultado.metodo === 'ko' || resultado.metodo === 'tko') nuevo.record.ko += 1;
    else if (resultado.metodo === 'sumision') nuevo.record.sub += 1;
    else nuevo.record.dec += 1;
  } else if (empate) {
    nuevo.record.e += 1;
  } else {
    nuevo.record.d += 1;
  }

  nuevo.dinero += oferta.bolsa;

  const famaDelta = gano ? oferta.famaBase : empate ? Math.round(oferta.famaBase / 3) : -Math.round(oferta.famaBase / 2);
  nuevo.fama = clamp(nuevo.fama + famaDelta, 0, 100);
  nuevo.estado.moral = clamp(nuevo.estado.moral + (gano ? 10 : empate ? 0 : -12), 0, 100);

  if (oferta.esTitulo) {
    if (gano) {
      if (oferta.esObligatoria) {
        nuevo.defensas += 1;
      } else if (!nuevo.titulos.includes(oferta.enJuego)) {
        nuevo.titulos.push(oferta.enJuego);
        titulosGanados.push(oferta.enJuego);
      }
    } else if (!empate) {
      nuevo.titulos = nuevo.titulos.filter((t) => t !== oferta.enJuego);
    }
  }

  nuevo.historial.push({
    rivalId: oferta.rivalId,
    rivalNombre: oferta.rivalNombre,
    rivalApodo: oferta.rivalApodo,
    resultado: gano ? 'v' : empate ? 'e' : 'd',
    metodo: resultado.metodo,
    round: resultado.round,
    bolsa: oferta.bolsa,
    enJuego: oferta.enJuego,
    esTitulo: oferta.esTitulo,
  });

  const texto = gano
    ? `Le ganaste a ${oferta.rivalApodo} por ${resultado.metodo.toUpperCase()}.`
    : empate
      ? `Empataste con ${oferta.rivalApodo}. Nadie quedó conforme.`
      : `${oferta.rivalApodo} te ganó por ${resultado.metodo.toUpperCase()}.`;

  return { jugador: nuevo, titulosGanados, texto };
}
```

- [ ] **Step 5: Implementar `src/core/negotiation.js`**

```js
import { clamp } from './stats.js';

export const MOVIDAS = {
  cerrar: {
    id: 'cerrar',
    nombre: 'Cerrá el trato',
    texto: 'Firmás lo que hay sobre la mesa. Buen trato, a la lona.',
    riesgoBase: 0,
    mejora: {},
  },
  masPlata: {
    id: 'masPlata',
    nombre: 'Pedí más plata',
    texto: 'Vas por un 25% más. Si acepta, gran salto; si no, se enfría.',
    riesgoBase: 0.3,
    mejora: { bolsa: 0.25 },
  },
  taquilla: {
    id: 'taquilla',
    nombre: 'Quiero % de la taquilla',
    texto: 'Si es un gran evento, cobrás mucho más. Al promotor no le gusta.',
    riesgoBase: 0.35,
    mejora: { bolsa: 0.15, condicion: '% de taquilla' },
  },
  apretar: {
    id: 'apretar',
    nombre: 'Apretá: "o subís o no hay pelea"',
    texto: 'Todo o nada. Puede duplicar la bolsa... o mandarte a tu casa.',
    riesgoBase: 0.6,
    mejora: { bolsa: 1 },
  },
};

export const REDUCCION_MANAGER = 0.1;

export function crearNegociacion(oferta, { tieneManager = false } = {}) {
  return {
    ofertaId: oferta.id,
    bolsaInicial: oferta.bolsa,
    bolsa: oferta.bolsa,
    paciencia: 100,
    condiciones: [],
    movidas: 0,
    cerrada: false,
    perdida: false,
    reduccionRiesgo: tieneManager ? REDUCCION_MANAGER : 0,
  };
}

function clonar(negociacion) {
  return { ...negociacion, condiciones: [...negociacion.condiciones] };
}

export function riesgoDe(negociacion, movidaId) {
  const movida = MOVIDAS[movidaId];
  const porDesgaste = (100 - negociacion.paciencia) / 250;
  return clamp(movida.riesgoBase + porDesgaste - negociacion.reduccionRiesgo, 0, 0.95);
}

export function jugarMovida(negociacion, movidaId, rng) {
  const movida = MOVIDAS[movidaId];
  if (!movida) throw new Error(`Movida desconocida: ${movidaId}`);
  if (negociacion.cerrada || negociacion.perdida) return { negociacion, evento: null };

  const nueva = clonar(negociacion);
  nueva.movidas += 1;

  if (movidaId === 'cerrar') {
    nueva.cerrada = true;
    return {
      negociacion: nueva,
      evento: { tipo: 'cierra', texto: `Cerrado: US$ ${nueva.bolsa.toLocaleString('es-AR')}. Apretón de manos y a entrenar.` },
    };
  }

  const riesgo = riesgoDe(negociacion, movidaId);
  nueva.paciencia = clamp(nueva.paciencia - Math.round(riesgo * 60), 0, 100);

  if (rng.chance(riesgo)) {
    nueva.perdida = true;
    return {
      negociacion: nueva,
      evento: { tipo: 'rechaza', texto: 'El promotor junta los papeles y se levanta. "Buscate otro."' },
    };
  }

  if (movida.mejora.bolsa) {
    nueva.bolsa = Math.round(nueva.bolsa * (1 + movida.mejora.bolsa));
  }
  if (movida.mejora.condicion && !nueva.condiciones.includes(movida.mejora.condicion)) {
    nueva.condiciones.push(movida.mejora.condicion);
  }

  return {
    negociacion: nueva,
    evento: { tipo: 'acepta', texto: `El promotor resopla y acepta: US$ ${nueva.bolsa.toLocaleString('es-AR')}.` },
  };
}

export function resultadoNegociacion(negociacion) {
  if (negociacion.perdida) {
    return {
      bolsa: Math.round(negociacion.bolsaInicial * 0.7),
      condiciones: [],
      perdida: true,
    };
  }
  return { bolsa: negociacion.bolsa, condiciones: [...negociacion.condiciones], perdida: false };
}
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/offers.test.js tests/core/negotiation.test.js`
Expected: PASS (31 tests).

- [ ] **Step 7: Commit**

```bash
git add src/core/offers.js src/core/negotiation.js tests/core/offers.test.js tests/core/negotiation.test.js
git commit -m "feat: ofertas de pelea, titulos y negociacion de bolsa"
```

---

## Task 12: Dinero, staff y tienda

**Files:**
- Create: `src/core/money.js`
- Test: `tests/core/money.test.js`

**Interfaces:**
- Consumes: `clamp`.
- Produces:
  - `STAFF: Array<{id,nombre,descripcion,precio,efecto:string}>` — 5 entradas: `entrenador`, `kinesiologo`, `psicologo`, `preparador`, `manager`.
  - `LUJOS: Array<{id,nombre,precio,fama:number,legado:number}>` — 5 entradas.
  - `catalogo(jugador): {staff: ItemUI[], lujos: ItemUI[]}` donde `ItemUI` = item + `{comprado: boolean, alcanza: boolean}`.
  - `comprar(jugador, itemId): {jugador, ok: boolean, texto: string}`
  - `tieneStaff(jugador, staffId): boolean`
  - `bonusCartas(jugador): {opcionesExtra: number, bonusValor: number}` — del entrenador.
  - `cobrarSponsor(jugador, rng): {jugador, monto: number, texto: string}|null`

- [ ] **Step 1: Escribir `tests/core/money.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  STAFF, LUJOS, catalogo, comprar, tieneStaff, bonusCartas, cobrarSponsor,
} from '../../src/core/money.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo', () => {
  it('define cinco de staff y cinco lujos', () => {
    expect(STAFF).toHaveLength(5);
    expect(LUJOS).toHaveLength(5);
  });

  it('todos tienen precio positivo e id unico', () => {
    const ids = [...STAFF, ...LUJOS].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of [...STAFF, ...LUJOS]) expect(item.precio).toBeGreaterThan(0);
  });

  it('marca lo comprado y lo que no alcanza', () => {
    const yo = jugador({ dinero: STAFF[0].precio, staff: [STAFF[1].id] });
    const c = catalogo(yo);
    expect(c.staff.find((i) => i.id === STAFF[1].id).comprado).toBe(true);
    expect(c.staff.find((i) => i.id === STAFF[0].id).alcanza).toBe(true);
    const caro = c.staff.concat(c.lujos).find((i) => i.precio > yo.dinero);
    if (caro) expect(caro.alcanza).toBe(false);
  });
});

describe('comprar', () => {
  it('descuenta la plata y suma el staff', () => {
    const item = STAFF[0];
    const paso = comprar(jugador({ dinero: item.precio + 100 }), item.id);
    expect(paso.ok).toBe(true);
    expect(paso.jugador.dinero).toBe(100);
    expect(paso.jugador.staff).toContain(item.id);
    expect(paso.texto).toBeTruthy();
  });

  it('un lujo suma fama y queda en la lista', () => {
    const item = LUJOS[0];
    const paso = comprar(jugador({ dinero: item.precio, fama: 10 }), item.id);
    expect(paso.ok).toBe(true);
    expect(paso.jugador.lujos).toContain(item.id);
    expect(paso.jugador.fama).toBeGreaterThan(10);
  });

  it('falla si no alcanza y no cobra', () => {
    const item = STAFF[0];
    const paso = comprar(jugador({ dinero: 0 }), item.id);
    expect(paso.ok).toBe(false);
    expect(paso.jugador.dinero).toBe(0);
    expect(paso.jugador.staff).not.toContain(item.id);
  });

  it('no permite comprar dos veces lo mismo', () => {
    const item = STAFF[0];
    const yo = jugador({ dinero: item.precio * 3, staff: [item.id] });
    const paso = comprar(yo, item.id);
    expect(paso.ok).toBe(false);
    expect(paso.jugador.dinero).toBe(yo.dinero);
  });

  it('rechaza un id desconocido', () => {
    expect(() => comprar(jugador({ dinero: 999999 }), 'inventado')).toThrow(/inventado/);
  });

  it('no muta el jugador original', () => {
    const yo = jugador({ dinero: 999999 });
    const antes = JSON.stringify(yo);
    comprar(yo, STAFF[0].id);
    expect(JSON.stringify(yo)).toBe(antes);
  });
});

describe('tieneStaff', () => {
  it('detecta el staff contratado', () => {
    expect(tieneStaff(jugador({ staff: ['entrenador'] }), 'entrenador')).toBe(true);
    expect(tieneStaff(jugador(), 'entrenador')).toBe(false);
  });
});

describe('bonusCartas', () => {
  it('sin entrenador no da bonus', () => {
    expect(bonusCartas(jugador())).toEqual({ opcionesExtra: 0, bonusValor: 0 });
  });

  it('con entrenador da mas opciones y mejores numeros', () => {
    const bonus = bonusCartas(jugador({ staff: ['entrenador'] }));
    expect(bonus.opcionesExtra).toBeGreaterThan(0);
    expect(bonus.bonusValor).toBeGreaterThan(0);
  });
});

describe('cobrarSponsor', () => {
  it('sin fama no aparece sponsor', () => {
    let hubo = false;
    for (let s = 1; s <= 40 && !hubo; s++) {
      if (cobrarSponsor(jugador({ fama: 0 }), createRng(s))) hubo = true;
    }
    expect(hubo).toBe(false);
  });

  it('con mucha fama aparece seguido y paga', () => {
    let cobros = 0;
    for (let s = 1; s <= 40; s++) {
      const paso = cobrarSponsor(jugador({ fama: 90 }), createRng(s));
      if (paso) {
        cobros++;
        expect(paso.monto).toBeGreaterThan(0);
        expect(paso.jugador.dinero).toBe(paso.monto);
        expect(paso.texto).toBeTruthy();
      }
    }
    expect(cobros).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/money.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/core/money.js`**

```js
import { clamp } from './stats.js';

export const STAFF = [
  { id: 'entrenador', nombre: 'Entrenador de elite', descripcion: 'Mejores cartas de mejora: más opciones y números más altos.', precio: 120000, efecto: 'cartas' },
  { id: 'kinesiologo', nombre: 'Kinesiólogo personal', descripcion: 'Cuerpo blindado: menos riesgo de lesión.', precio: 90000, efecto: 'lesiones' },
  { id: 'psicologo', nombre: 'Psicólogo deportivo', descripcion: 'Cabeza fría: la mala racha te dura menos.', precio: 80000, efecto: 'moral' },
  { id: 'preparador', nombre: 'Preparador físico', descripcion: 'El declive de las piernas llega más tarde.', precio: 140000, efecto: 'declive' },
  { id: 'manager', nombre: 'Súper mánager', descripcion: 'El mejor agente: mejores ofertas y bolsas más gordas.', precio: 160000, efecto: 'ofertas' },
];

export const LUJOS = [
  { id: 'auto', nombre: 'Auto deportivo', precio: 60000, fama: 3, legado: 1 },
  { id: 'casa', nombre: 'Casa propia', precio: 150000, fama: 4, legado: 2 },
  { id: 'mansion', nombre: 'Mansión con ring', precio: 600000, fama: 8, legado: 4 },
  { id: 'yate', nombre: 'Yate', precio: 1200000, fama: 10, legado: 6 },
  { id: 'isla', nombre: 'Isla privada', precio: 4000000, fama: 15, legado: 10 },
];

const TODOS = [...STAFF, ...LUJOS];

function buscarItem(itemId) {
  const item = TODOS.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item desconocido: ${itemId}`);
  return item;
}

function esStaff(itemId) {
  return STAFF.some((i) => i.id === itemId);
}

export function tieneStaff(jugador, staffId) {
  return (jugador.staff ?? []).includes(staffId);
}

function yaComprado(jugador, itemId) {
  return esStaff(itemId)
    ? (jugador.staff ?? []).includes(itemId)
    : (jugador.lujos ?? []).includes(itemId);
}

export function catalogo(jugador) {
  const marcar = (item) => ({
    ...item,
    comprado: yaComprado(jugador, item.id),
    alcanza: jugador.dinero >= item.precio,
  });
  return { staff: STAFF.map(marcar), lujos: LUJOS.map(marcar) };
}

function clonar(jugador) {
  return { ...jugador, staff: [...(jugador.staff ?? [])], lujos: [...(jugador.lujos ?? [])] };
}

export function comprar(jugador, itemId) {
  const item = buscarItem(itemId);
  if (yaComprado(jugador, itemId)) {
    return { jugador, ok: false, texto: `Ya tenés ${item.nombre.toLowerCase()}.` };
  }
  if (jugador.dinero < item.precio) {
    return { jugador, ok: false, texto: `No te alcanza para ${item.nombre.toLowerCase()}.` };
  }
  const nuevo = clonar(jugador);
  nuevo.dinero -= item.precio;
  if (esStaff(itemId)) {
    nuevo.staff.push(itemId);
    return { jugador: nuevo, ok: true, texto: `${item.nombre} se suma al equipo.` };
  }
  nuevo.lujos.push(itemId);
  nuevo.fama = clamp(nuevo.fama + item.fama, 0, 100);
  return { jugador: nuevo, ok: true, texto: `Te compraste ${item.nombre.toLowerCase()}. Que se note.` };
}

export function bonusCartas(jugador) {
  return tieneStaff(jugador, 'entrenador')
    ? { opcionesExtra: 1, bonusValor: 1 }
    : { opcionesExtra: 0, bonusValor: 0 };
}

export function cobrarSponsor(jugador, rng) {
  const prob = clamp(jugador.fama / 180, 0, 0.5);
  if (jugador.fama <= 0 || !rng.chance(prob)) return null;
  const monto = Math.round(1500 * (1 + jugador.fama / 12) * rng.float(0.8, 1.4));
  const nuevo = clonar(jugador);
  nuevo.dinero += monto;
  const marcas = ['una marca de indumentaria', 'una cervecería', 'una casa de suplementos', 'una app de apuestas'];
  return {
    jugador: nuevo,
    monto,
    texto: `Te firmó ${rng.pick(marcas)}: US$ ${monto.toLocaleString('es-AR')} al bolsillo.`,
  };
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/money.test.js`
Expected: PASS (13 tests).

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/money.js tests/core/money.test.js
git commit -m "feat: economia con staff, lujos y sponsors"
```

---

## Task 13: Motor de cartas y cartas de mejora

**Files:**
- Create: `src/core/cards.js`
- Create: `src/content/cards-improve.js`
- Test: `tests/core/cards.test.js`

**Interfaces:**
- Consumes: `aplicarModificadores`, `clamp`; `bonusCartas`; `createRng`.
- Produces (`cards-improve.js`): `CARTAS_MEJORA: Array<CartaMejora>` — 14 cartas. `CartaMejora` = `{ id, titulo, texto, mods: object, etapas: string[], disciplinas: string[]|'todas' }`.
- Produces (`cards.js`):
  - `formatearMods(mods): string[]` — `['+3 Velocidad', '-2 Potencia']`, usa `ETIQUETAS`.
  - `repartirMejoras(rng, {jugador, etapa, cantidad?}): CartaMejora[]` — 3 por defecto + `opcionesExtra` del entrenador; sin repetidos; filtradas por etapa y disciplina; el `bonusValor` sube los modificadores positivos.
  - `aplicarCarta(jugador, carta): {jugador, deltas: object, texto: string}` — reparte los mods entre `atributos`, `especiales` y `estado`.
  - `resolverProbabilidad(rng, opcion): {resultado: object, texto: string}` — para opciones con `probabilidades: Array<{peso, mods, texto}>`.

- [ ] **Step 1: Escribir `tests/core/cards.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_MEJORA } from '../../src/content/cards-improve.js';
import { formatearMods, repartirMejoras, aplicarCarta, resolverProbabilidad } from '../../src/core/cards.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de mejoras', () => {
  it('tiene al menos catorce cartas con id unico', () => {
    expect(CARTAS_MEJORA.length).toBeGreaterThanOrEqual(14);
    const ids = CARTAS_MEJORA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta tiene titulo, texto y al menos un modificador', () => {
    for (const carta of CARTAS_MEJORA) {
      expect(carta.titulo.length).toBeGreaterThan(0);
      expect(carta.texto.length).toBeGreaterThan(0);
      expect(Object.keys(carta.mods).length).toBeGreaterThan(0);
    }
  });

  it('las cartas de grappling son solo de mma', () => {
    for (const carta of CARTAS_MEJORA) {
      if ('grappling' in carta.mods) expect(carta.disciplinas).toEqual(['mma']);
    }
  });
});

describe('formatearMods', () => {
  it('escribe los modificadores con signo y nombre largo', () => {
    expect(formatearMods({ velocidad: 3 })).toEqual(['+3 Velocidad']);
    expect(formatearMods({ potencia: -2 })).toEqual(['-2 Potencia']);
  });

  it('lista varios en orden de aparicion', () => {
    expect(formatearMods({ cardio: 5, potencia: -3 })).toEqual(['+5 Cardio', '-3 Potencia']);
  });
});

describe('repartirMejoras', () => {
  it('reparte tres cartas por defecto', () => {
    expect(repartirMejoras(createRng(1), { jugador: jugador(), etapa: 'profesional' })).toHaveLength(3);
  });

  it('no repite cartas', () => {
    const cartas = repartirMejoras(createRng(2), { jugador: jugador(), etapa: 'profesional' });
    expect(new Set(cartas.map((c) => c.id)).size).toBe(cartas.length);
  });

  it('nunca ofrece cartas de otra disciplina', () => {
    const cartas = repartirMejoras(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    for (const carta of cartas) {
      expect(carta.disciplinas === 'todas' || carta.disciplinas.includes('boxeo')).toBe(true);
    }
  });

  it('el entrenador de elite da una opcion mas', () => {
    const conEntrenador = repartirMejoras(createRng(4), {
      jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional',
    });
    expect(conEntrenador).toHaveLength(4);
  });

  it('el entrenador mejora los numeros positivos', () => {
    const sin = repartirMejoras(createRng(5), { jugador: jugador(), etapa: 'profesional' });
    const con = repartirMejoras(createRng(5), { jugador: jugador({ staff: ['entrenador'] }), etapa: 'profesional' });
    const positivos = (cartas) => cartas.reduce(
      (acc, c) => acc + Object.values(c.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0), 0,
    );
    expect(positivos(con)).toBeGreaterThan(positivos(sin));
  });

  it('es determinista', () => {
    const a = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    const b = repartirMejoras(createRng(6), { jugador: jugador(), etapa: 'profesional' });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('respeta el filtro de etapa', () => {
    const cartas = repartirMejoras(createRng(7), { jugador: jugador(), etapa: 'juvenil' });
    for (const carta of cartas) expect(carta.etapas).toContain('juvenil');
  });
});

describe('aplicarCarta', () => {
  it('sube el atributo y devuelve el delta', () => {
    const yo = jugador();
    const antes = yo.atributos.velocidad;
    const paso = aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.jugador.atributos.velocidad).toBe(antes + 3);
    expect(paso.deltas.velocidad).toBe(3);
  });

  it('reparte a especiales y a estado', () => {
    const yo = jugador();
    const paso = aplicarCarta(yo, {
      id: 'x', titulo: 'T', texto: 't', mods: { disciplinaPersonal: 4, forma: 6, menton: 2 },
    });
    expect(paso.jugador.especiales.disciplinaPersonal).toBe(yo.especiales.disciplinaPersonal + 4);
    expect(paso.jugador.especiales.menton).toBe(yo.especiales.menton + 2);
    expect(paso.jugador.estado.forma).toBe(yo.estado.forma + 6);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    aplicarCarta(yo, { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('devuelve un texto con los cambios', () => {
    const paso = aplicarCarta(jugador(), { id: 'x', titulo: 'T', texto: 't', mods: { velocidad: 3 } });
    expect(paso.texto).toContain('Velocidad');
  });
});

describe('resolverProbabilidad', () => {
  const opcion = {
    id: 'o', texto: 'Arriesgar',
    probabilidades: [
      { peso: 1, mods: { forma: 3 }, texto: 'Salió bien.' },
      { peso: 1, mods: { forma: -3 }, texto: 'Salió mal.' },
    ],
  };

  it('devuelve uno de los resultados posibles', () => {
    const paso = resolverProbabilidad(createRng(1), opcion);
    expect([3, -3]).toContain(paso.resultado.forma);
    expect(paso.texto.length).toBeGreaterThan(0);
  });

  it('es determinista', () => {
    expect(resolverProbabilidad(createRng(9), opcion)).toEqual(resolverProbabilidad(createRng(9), opcion));
  });

  it('respeta los pesos', () => {
    const cargada = {
      probabilidades: [
        { peso: 9, mods: { forma: 1 }, texto: 'casi siempre' },
        { peso: 1, mods: { forma: -1 }, texto: 'casi nunca' },
      ],
    };
    let positivos = 0;
    for (let s = 1; s <= 200; s++) {
      if (resolverProbabilidad(createRng(s), cargada).resultado.forma === 1) positivos++;
    }
    expect(positivos).toBeGreaterThan(150);
  });

  it('con una sola opcion siempre da esa', () => {
    const unica = { probabilidades: [{ peso: 1, mods: { forma: 5 }, texto: 'única' }] };
    expect(resolverProbabilidad(createRng(3), unica).resultado.forma).toBe(5);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/cards.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/content/cards-improve.js`**

```js
const TODAS = 'todas';
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];

export const CARTAS_MEJORA = [
  { id: 'doble_turno', titulo: 'Doble turno como cuando eras pibe', texto: 'Mañana y tarde en el gimnasio, sin chistar.', mods: { cardio: 4, fatiga: 5 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'bolsa_pesada', titulo: 'La bolsa pesada hasta que duela', texto: 'Mil golpes por día. Los nudillos se acostumbran.', mods: { potencia: 4, velocidad: -1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'espejo', titulo: 'Horas frente al espejo', texto: 'Sombra, guardia, pie. Otra vez. Y otra.', mods: { tecnica: 4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'sparring_duro', titulo: 'Sparring con uno más grande', texto: 'Te comés unas cuantas, pero aprendés a leer.', mods: { iq: 4, menton: 2, forma: -4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'saltar_soga', titulo: 'La soga hasta que se corte', texto: 'Pies livianos, cabeza quieta.', mods: { velocidad: 4, cardio: 1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'guardia', titulo: 'Nadie te toca la cara', texto: 'Semana entera solo defendiendo. Aburrido y efectivo.', mods: { defensa: 5, potencia: -2 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'video', titulo: 'Videos hasta la madrugada', texto: 'Estudiás rivales como si fueran para un examen.', mods: { iq: 5, cardio: -2 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS },
  { id: 'cuello', titulo: 'Trabajo de cuello', texto: 'Feo, incómodo y te salva de un nocaut.', mods: { menton: 4 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'dieta', titulo: 'Dieta en serio por primera vez', texto: 'Nada de asado hasta después de la pelea.', mods: { disciplinaPersonal: 5, forma: 5 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'altura', titulo: 'Campamento en la altura', texto: 'Aire fino, piernas de acero.', mods: { cardio: 6, forma: -3 }, etapas: ['profesional', 'veterano'], disciplinas: TODAS },
  { id: 'descanso', titulo: 'Una semana sin tocar el gimnasio', texto: 'El entrenador insiste: el cuerpo también se construye descansando.', mods: { forma: 10, fatiga: -20, potencia: -1 }, etapas: SIEMPRE, disciplinas: TODAS },
  { id: 'contragolpe', titulo: 'Timing de contragolpe', texto: 'Esperar el error ajeno y castigarlo.', mods: { tecnica: 3, iq: 3, potencia: -1 }, etapas: ['amateur', 'profesional', 'veterano'], disciplinas: TODAS },
  { id: 'derribos', titulo: 'Cientos de derribos', texto: 'Entrás, levantás, caés. Repetir.', mods: { grappling: 5, cardio: -1 }, etapas: SIEMPRE, disciplinas: ['mma'] },
  { id: 'jiujitsu', titulo: 'Jiu-jitsu con el profe viejo', texto: 'Te enseña a ahorcar sin fuerza. Pura palanca.', mods: { grappling: 6, potencia: -2 }, etapas: SIEMPRE, disciplinas: ['mma'] },
  { id: 'veterania', titulo: 'Trucos de veterano', texto: 'Ya no corrés como antes, pero sabés dónde pararte.', mods: { iq: 6, tecnica: 2, velocidad: -3 }, etapas: ['veterano'], disciplinas: TODAS },
];
```

- [ ] **Step 4: Implementar `src/core/cards.js`**

```js
import { ETIQUETAS, aplicarModificadores, clamp, LIMITES_ESTADO } from './stats.js';
import { bonusCartas } from './money.js';

export function formatearMods(mods) {
  return Object.entries(mods).map(([clave, valor]) => {
    const nombre = ETIQUETAS[clave]?.larga ?? clave;
    const signo = valor > 0 ? '+' : '';
    return `${signo}${valor} ${nombre}`;
  });
}

function cartaAplica(carta, { etapa, disciplina }) {
  const porEtapa = carta.etapas.includes(etapa);
  const porDisciplina = carta.disciplinas === 'todas' || carta.disciplinas.includes(disciplina);
  return porEtapa && porDisciplina;
}

export function repartirMejoras(rng, { jugador, etapa, cantidad = 3, catalogo = null }) {
  const fuente = catalogo ?? CATALOGO_MEJORAS();
  const bonus = bonusCartas(jugador);
  const total = cantidad + bonus.opcionesExtra;
  const elegibles = fuente.filter((c) => cartaAplica(c, { etapa, disciplina: jugador.disciplina }));
  const mezcladas = rng.shuffle(elegibles).slice(0, total);

  if (bonus.bonusValor === 0) return mezcladas;
  return mezcladas.map((carta) => {
    const mods = {};
    for (const [clave, valor] of Object.entries(carta.mods)) {
      mods[clave] = valor > 0 ? valor + bonus.bonusValor : valor;
    }
    return { ...carta, mods };
  });
}

export function aplicarCarta(jugador, carta) {
  const nuevo = {
    ...jugador,
    atributos: { ...jugador.atributos },
    especiales: { ...jugador.especiales },
    estado: { ...jugador.estado },
  };

  const paraAtributos = {};
  const paraEspeciales = {};
  const paraEstado = {};
  for (const [clave, valor] of Object.entries(carta.mods)) {
    if (clave in nuevo.atributos) paraAtributos[clave] = valor;
    else if (clave in nuevo.especiales) paraEspeciales[clave] = valor;
    else if (clave in nuevo.estado) paraEstado[clave] = valor;
  }

  const a = aplicarModificadores(nuevo.atributos, paraAtributos);
  const e = aplicarModificadores(nuevo.especiales, paraEspeciales);
  const s = aplicarModificadores(nuevo.estado, paraEstado, LIMITES_ESTADO);
  nuevo.atributos = a.resultado;
  nuevo.especiales = e.resultado;
  nuevo.estado = s.resultado;

  const deltas = { ...a.deltas, ...e.deltas, ...s.deltas };
  return { jugador: nuevo, deltas, texto: formatearMods(deltas).join(' · ') };
}

export function resolverProbabilidad(rng, opcion) {
  const entradas = opcion.probabilidades.map((p) => ({ valor: p, peso: p.peso }));
  const elegida = rng.weighted(entradas);
  return { resultado: elegida.mods, texto: elegida.texto };
}

let catalogoCache = null;
function CATALOGO_MEJORAS() {
  if (!catalogoCache) throw new Error('El catálogo de mejoras no fue inicializado.');
  return catalogoCache;
}

export function inicializarCatalogoMejoras(cartas) {
  catalogoCache = cartas;
}
```

- [ ] **Step 5: Simplificar la inicialización del catálogo**

El `catalogoCache` obliga a un paso extra que nadie va a recordar. Reemplazar el bloque final de `src/core/cards.js` (desde `let catalogoCache = null;` hasta el final del archivo) por un import directo, y agregar el import en la cabecera:

```js
import { CARTAS_MEJORA } from '../content/cards-improve.js';
```

y en `repartirMejoras` cambiar

```js
  const fuente = catalogo ?? CATALOGO_MEJORAS();
```

por

```js
  const fuente = catalogo ?? CARTAS_MEJORA;
```

Borrar `CATALOGO_MEJORAS`, `catalogoCache` e `inicializarCatalogoMejoras`.

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/cards.test.js`
Expected: PASS (19 tests).

- [ ] **Step 7: Commit**

```bash
git add src/core/cards.js src/content/cards-improve.js tests/core/cards.test.js
git commit -m "feat: motor de cartas y catalogo de mejoras"
```

---

## Task 14: Eventos, vida personal y redes

**Files:**
- Create: `src/content/cards-events.js`
- Create: `src/content/cards-social.js`
- Create: `src/core/events.js`
- Test: `tests/core/events.test.js`

**Interfaces:**
- Consumes: `aplicarCarta`, `resolverProbabilidad`, `formatearMods`; `subirHeat`; `clamp`; `createRng`.
- Produces (`cards-events.js`): `CARTAS_EVENTO: Array<CartaEvento>` — 12 cartas (dopaje, chantaje, sponsor, cambio de entrenador, cancelación, escándalo, invitación, familia, amigos, pareja, vicio, rutina). `CartaEvento` = `{ id, categoria: 'evento'|'vida', titulo, texto, etapas: string[], opciones: Array<Opcion> }`. `Opcion` = `{ id, texto, mods?: object, probabilidades?: Array<{peso,mods,texto}>, efectos?: {dinero?:number, fama?:number, heatRival?:number} }`.
- Produces (`cards-social.js`): `CARTAS_REDES: Array<CartaRedes>` — 8 cartas con 3 opciones cada una (`provocar`, `humilde`, `promocionar`).
- Produces (`events.js`):
  - `elegirEvento(rng, {jugador, etapa, categoria?}): CartaEvento`
  - `elegirCartaRedes(rng, {jugador, oferta?}): CartaRedes`
  - `resolverOpcion(rng, {jugador, carta, opcionId, rivalidades?}): {jugador, rivalidades, texto: string, deltasTexto: string[]}`

- [ ] **Step 1: Escribir `tests/core/events.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_REDES } from '../../src/content/cards-social.js';
import { elegirEvento, elegirCartaRedes, resolverOpcion } from '../../src/core/events.js';

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de eventos', () => {
  it('tiene al menos doce cartas con id unico', () => {
    expect(CARTAS_EVENTO.length).toBeGreaterThanOrEqual(12);
    const ids = CARTAS_EVENTO.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta ofrece dos o tres opciones', () => {
    for (const carta of CARTAS_EVENTO) {
      expect(carta.opciones.length).toBeGreaterThanOrEqual(2);
      expect(carta.opciones.length).toBeLessThanOrEqual(3);
    }
  });

  it('cada opcion tiene efecto directo o probabilistico', () => {
    for (const carta of CARTAS_EVENTO) {
      for (const opcion of carta.opciones) {
        const tieneAlgo = Boolean(opcion.mods || opcion.probabilidades || opcion.efectos);
        expect(tieneAlgo).toBe(true);
      }
    }
  });

  it('mezcla eventos de carrera y de vida personal', () => {
    const categorias = new Set(CARTAS_EVENTO.map((c) => c.categoria));
    expect(categorias).toContain('evento');
    expect(categorias).toContain('vida');
  });
});

describe('catalogo de redes', () => {
  it('tiene al menos ocho cartas de tres opciones', () => {
    expect(CARTAS_REDES.length).toBeGreaterThanOrEqual(8);
    for (const carta of CARTAS_REDES) expect(carta.opciones).toHaveLength(3);
  });

  it('siempre hay una opcion que sube el heat del rival', () => {
    for (const carta of CARTAS_REDES) {
      expect(carta.opciones.some((o) => (o.efectos?.heatRival ?? 0) > 0)).toBe(true);
    }
  });
});

describe('elegirEvento', () => {
  it('respeta la etapa', () => {
    const carta = elegirEvento(createRng(1), { jugador: jugador(), etapa: 'juvenil' });
    expect(carta.etapas).toContain('juvenil');
  });

  it('puede filtrar por categoria', () => {
    const carta = elegirEvento(createRng(2), { jugador: jugador(), etapa: 'profesional', categoria: 'vida' });
    expect(carta.categoria).toBe('vida');
  });

  it('es determinista', () => {
    const a = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    const b = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    expect(a.id).toBe(b.id);
  });
});

describe('elegirCartaRedes', () => {
  it('devuelve una carta del catalogo', () => {
    const carta = elegirCartaRedes(createRng(4), { jugador: jugador() });
    expect(CARTAS_REDES.map((c) => c.id)).toContain(carta.id);
  });
});

describe('resolverOpcion', () => {
  const carta = {
    id: 'test', categoria: 'evento', titulo: 'T', texto: 't', etapas: ['profesional'],
    opciones: [
      { id: 'directo', texto: 'Directo', mods: { cardio: 5 } },
      { id: 'plata', texto: 'Plata', efectos: { dinero: 5000, fama: 3 } },
      { id: 'riesgo', texto: 'Riesgo', probabilidades: [
        { peso: 1, mods: { forma: 5 }, texto: 'Salió bien.' },
        { peso: 1, mods: { forma: -5 }, texto: 'Salió mal.' },
      ] },
      { id: 'picante', texto: 'Picante', efectos: { heatRival: 20 } },
    ],
  };

  it('aplica modificadores directos', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(5), { jugador: yo, carta, opcionId: 'directo' });
    expect(paso.jugador.atributos.cardio).toBe(yo.atributos.cardio + 5);
    expect(paso.deltasTexto).toContain('+5 Cardio');
  });

  it('aplica efectos de dinero y fama', () => {
    const yo = jugador({ dinero: 100, fama: 10 });
    const paso = resolverOpcion(createRng(6), { jugador: yo, carta, opcionId: 'plata' });
    expect(paso.jugador.dinero).toBe(5100);
    expect(paso.jugador.fama).toBe(13);
  });

  it('resuelve las opciones con probabilidad', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(7), { jugador: yo, carta, opcionId: 'riesgo' });
    expect(Math.abs(paso.jugador.estado.forma - yo.estado.forma)).toBe(5);
    expect(paso.texto).toMatch(/Salió/);
  });

  it('sube el heat del rival indicado', () => {
    const paso = resolverOpcion(createRng(8), {
      jugador: jugador(), carta, opcionId: 'picante',
      rivalidades: [], rivalObjetivoId: 'riv_1',
    });
    expect(paso.rivalidades.find((r) => r.rivalId === 'riv_1').heat).toBeGreaterThan(0);
  });

  it('la fama nunca sale del rango 0-100', () => {
    const cartaExtrema = {
      ...carta,
      opciones: [{ id: 'boom', texto: 'x', efectos: { fama: 999 } }],
    };
    const paso = resolverOpcion(createRng(9), { jugador: jugador({ fama: 90 }), carta: cartaExtrema, opcionId: 'boom' });
    expect(paso.jugador.fama).toBe(100);
  });

  it('el dinero nunca queda negativo', () => {
    const cartaCara = { ...carta, opciones: [{ id: 'caro', texto: 'x', efectos: { dinero: -999999 } }] };
    const paso = resolverOpcion(createRng(10), { jugador: jugador({ dinero: 100 }), carta: cartaCara, opcionId: 'caro' });
    expect(paso.jugador.dinero).toBe(0);
  });

  it('rechaza una opcion inexistente', () => {
    expect(() => resolverOpcion(createRng(11), { jugador: jugador(), carta, opcionId: 'inventada' })).toThrow(/inventada/);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    resolverOpcion(createRng(12), { jugador: yo, carta, opcionId: 'directo' });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('es determinista', () => {
    const a = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    const b = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    expect(a.texto).toBe(b.texto);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/events.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/content/cards-events.js`**

```js
const SIEMPRE = ['juvenil', 'amateur', 'profesional', 'veterano'];
const PRO = ['profesional', 'veterano'];

export const CARTAS_EVENTO = [
  {
    id: 'dopaje', categoria: 'evento', titulo: 'El sobre en el vestuario', etapas: PRO,
    texto: 'Un tipo de traje te deja un sobre. "Es legal en casi todos lados", dice. Casi.',
    opciones: [
      { id: 'aceptar', texto: 'Aceptar. Nadie se entera.', probabilidades: [
        { peso: 6, mods: { potencia: 5, cardio: 4 }, texto: 'Nadie dijo nada. Te sentís una máquina.' },
        { peso: 4, mods: { forma: -15 }, texto: 'Control sorpresa. Zafaste raspando, pero quedaste marcado.' },
      ] },
      { id: 'rechazar', texto: 'Devolverlo sin abrirlo.', mods: { disciplinaPersonal: 6, moral: 5 } },
    ],
  },
  {
    id: 'chantaje', categoria: 'evento', titulo: 'La foto que no existía', etapas: PRO,
    texto: 'Alguien tiene una foto tuya de una noche que preferís olvidar. Pide plata.',
    opciones: [
      { id: 'pagar', texto: 'Pagar y que se termine.', efectos: { dinero: -25000 }, mods: { moral: -5 } },
      { id: 'ignorar', texto: 'Que la publique.', probabilidades: [
        { peso: 5, mods: { moral: 5 }, texto: 'Era un bluff. Nunca hubo foto.' },
        { peso: 5, mods: { moral: -10 }, texto: 'La publicó. Escándalo por dos semanas.' },
      ] },
      { id: 'denunciar', texto: 'Ir a la policía.', efectos: { fama: 4 }, mods: { disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'sponsor', categoria: 'evento', titulo: 'La marca que te quiere', etapas: PRO,
    texto: 'Una marca de bebidas te ofrece contrato. Hay que filmar una publicidad ridícula.',
    opciones: [
      { id: 'firmar', texto: 'Firmar. La plata es plata.', efectos: { dinero: 40000, fama: 6 }, mods: { forma: -3 } },
      { id: 'rechazar', texto: 'No. Estoy entrenando.', mods: { forma: 5, disciplinaPersonal: 3 } },
    ],
  },
  {
    id: 'entrenador', categoria: 'evento', titulo: 'Te ofrecen otro rincón', etapas: PRO,
    texto: 'Un entrenador famoso te quiere en su equipo. Don Pepe se hace el que no escuchó.',
    opciones: [
      { id: 'cambiar', texto: 'Cambiar de entrenador.', probabilidades: [
        { peso: 5, mods: { tecnica: 6, iq: 3 }, texto: 'El tipo sabe. Aprendés cosas nuevas.' },
        { peso: 5, mods: { moral: -10, forma: -5 }, texto: 'No enganchaste con el método. Estás incómodo.' },
      ] },
      { id: 'quedarse', texto: 'Quedarte con el de siempre.', mods: { moral: 8 } },
    ],
  },
  {
    id: 'cancelacion', categoria: 'evento', titulo: 'Se cayó la cartelera', etapas: PRO,
    texto: 'El promotor no consiguió el estadio. La pelea se cae a tres días.',
    opciones: [
      { id: 'aguantar', texto: 'Bancar y seguir entrenando.', mods: { disciplinaPersonal: 4, forma: -2 } },
      { id: 'putear', texto: 'Salir a puteario en público.', efectos: { fama: 5 }, mods: { moral: -3 } },
    ],
  },
  {
    id: 'escandalo', categoria: 'evento', titulo: 'Pelea en un boliche', etapas: PRO,
    texto: 'Un pibe te filmó respondiendo a las provocaciones. El video vuela.',
    opciones: [
      { id: 'disculpa', texto: 'Pedir disculpas públicas.', mods: { moral: -3, disciplinaPersonal: 4 } },
      { id: 'bancar', texto: 'Bancarte lo que hiciste.', efectos: { fama: 8 }, mods: { moral: 3 } },
    ],
  },
  {
    id: 'invitacion', categoria: 'evento', titulo: 'Exhibición en el exterior', etapas: PRO,
    texto: 'Te invitan a una exhibición afuera. Paga bien y no es en serio... en teoría.',
    opciones: [
      { id: 'ir', texto: 'Ir.', efectos: { dinero: 30000, fama: 4 }, mods: { fatiga: 10 } },
      { id: 'no_ir', texto: 'Quedarte entrenando.', mods: { forma: 6 } },
    ],
  },
  {
    id: 'familia', categoria: 'vida', titulo: 'El cumpleaños de tu vieja', etapas: SIEMPRE,
    texto: 'Es el mismo día que el último sparring fuerte antes de la pelea.',
    opciones: [
      { id: 'ir', texto: 'Ir al cumpleaños.', mods: { moral: 10, forma: -4 } },
      { id: 'entrenar', texto: 'Entrenar igual.', mods: { forma: 5, moral: -6 } },
    ],
  },
  {
    id: 'amigos', categoria: 'vida', titulo: 'Los pibes del barrio', etapas: SIEMPRE,
    texto: 'Te llaman para un asado. Hace meses que no los ves.',
    opciones: [
      { id: 'ir', texto: 'Ir un rato.', mods: { moral: 8, disciplinaPersonal: -3 } },
      { id: 'no_ir', texto: 'Dejarlo para después de la pelea.', mods: { disciplinaPersonal: 4, moral: -3 } },
    ],
  },
  {
    id: 'pareja', categoria: 'vida', titulo: 'La charla pendiente', etapas: ['amateur', 'profesional', 'veterano'],
    texto: 'Tu pareja te dice que hace meses que estás en otra. Tiene razón.',
    opciones: [
      { id: 'priorizar', texto: 'Bajar un cambio y estar presente.', mods: { moral: 12, forma: -5 } },
      { id: 'carrera', texto: 'Explicar que esto es ahora o nunca.', mods: { disciplinaPersonal: 5, moral: -8 } },
    ],
  },
  {
    id: 'vicio', categoria: 'vida', titulo: 'La noche larga', etapas: PRO,
    texto: 'Después de ganar, la joda se estira. Mañana hay entrenamiento a las siete.',
    opciones: [
      { id: 'seguir', texto: 'Seguirla.', mods: { moral: 6, forma: -8, disciplinaPersonal: -5 } },
      { id: 'irse', texto: 'Irte temprano.', mods: { disciplinaPersonal: 5, forma: 3, moral: -2 } },
    ],
  },
  {
    id: 'rutina', categoria: 'vida', titulo: 'Las cinco de la mañana', etapas: SIEMPRE,
    texto: 'Suena el despertador. Está oscuro y hace frío. Nadie te ve.',
    opciones: [
      { id: 'levantarse', texto: 'Levantarte igual.', mods: { disciplinaPersonal: 6, cardio: 2, moral: -2 } },
      { id: 'dormir', texto: 'Dormir media hora más.', mods: { forma: 3, disciplinaPersonal: -4 } },
    ],
  },
];
```

- [ ] **Step 4: Implementar `src/content/cards-social.js`**

```js
export const CARTAS_REDES = [
  {
    id: 'post_general', titulo: '¿Qué posteás?',
    texto: 'Tenés el teléfono en la mano y la cabeza caliente.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"El que sigue en la lista ya sabe quién es."', efectos: { fama: 6, heatRival: 22 } },
      { id: 'humilde', tono: 'humilde', texto: '"Gracias al equipo. A seguir laburando."', efectos: { fama: 2 }, mods: { moral: 4 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Subís el afiche de la próxima pelea.', efectos: { fama: 4, dinero: 2000 } },
    ],
  },
  {
    id: 'post_entrenamiento', titulo: 'Video de entrenamiento',
    texto: 'Grabaste una sesión donde volaste. ¿La subís?',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Con la leyenda: "Y todavía no estoy al 100%".', efectos: { fama: 5, heatRival: 15 } },
      { id: 'humilde', tono: 'humilde', texto: 'Sin texto. Que hable el trabajo.', efectos: { fama: 3 }, mods: { disciplinaPersonal: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Etiquetando a los sponsors.', efectos: { fama: 2, dinero: 4000 } },
    ],
  },
  {
    id: 'post_derrota', titulo: 'Después de una derrota',
    texto: 'Todos esperan que digas algo.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"Revancha cuando quieras. Si tenés."', efectos: { fama: 7, heatRival: 30 } },
      { id: 'humilde', tono: 'humilde', texto: '"Ganó el mejor. Vuelvo."', efectos: { fama: 2 }, mods: { moral: 6 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Silencio y una foto entrenando.', efectos: { fama: 1 }, mods: { disciplinaPersonal: 4 } },
    ],
  },
  {
    id: 'post_rival', titulo: 'Te tiraron un palo',
    texto: 'Un rival dijo que sos "producto de marketing".',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Contestarle con todo.', efectos: { fama: 8, heatRival: 28 } },
      { id: 'humilde', tono: 'humilde', texto: 'Ignorarlo elegantemente.', efectos: { fama: 1 }, mods: { moral: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Usarlo para vender la pelea.', efectos: { fama: 5, dinero: 3000, heatRival: 10 } },
    ],
  },
  {
    id: 'post_titulo', titulo: 'Hablando del cinturón',
    texto: 'Todos preguntan cuándo vas por el título.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"El campeón me esquiva y todos lo saben."', efectos: { fama: 7, heatRival: 25 } },
      { id: 'humilde', tono: 'humilde', texto: '"Paso a paso. Primero el que sigue."', efectos: { fama: 2 }, mods: { iq: 2 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Anunciar que estás cerca.', efectos: { fama: 5 } },
    ],
  },
  {
    id: 'post_barrio', titulo: 'Foto en el barrio',
    texto: 'Volviste al gimnasio donde empezaste.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"De acá salí. Ustedes salieron de una academia."', efectos: { fama: 4, heatRival: 12 } },
      { id: 'humilde', tono: 'humilde', texto: '"Nunca me fui de acá."', efectos: { fama: 4 }, mods: { moral: 6 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Pedir apoyo para el club.', efectos: { fama: 3, dinero: 1500 } },
    ],
  },
  {
    id: 'post_peso', titulo: 'Foto en la balanza',
    texto: 'Diste el peso sin sufrir. Se nota.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: '"Yo llego entero. Otros llegan secos."', efectos: { fama: 5, heatRival: 18 } },
      { id: 'humilde', tono: 'humilde', texto: '"Trabajo de todo el equipo."', efectos: { fama: 2 }, mods: { forma: 3 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Etiquetar al nutricionista sponsor.', efectos: { fama: 2, dinero: 3500 } },
    ],
  },
  {
    id: 'post_pelea_grande', titulo: 'La semana de la pelea',
    texto: 'Falta poco y la gente está encendida.',
    opciones: [
      { id: 'provocar', tono: 'provocador', texto: 'Prometer nocaut en el primero.', efectos: { fama: 9, heatRival: 32 }, mods: { moral: -3 } },
      { id: 'humilde', tono: 'humilde', texto: 'Agradecer y pedir respeto.', efectos: { fama: 2 }, mods: { moral: 5 } },
      { id: 'promocionar', tono: 'promocional', texto: 'Empujar la venta de entradas.', efectos: { fama: 4, dinero: 6000 } },
    ],
  },
];
```

- [ ] **Step 5: Implementar `src/core/events.js`**

```js
import { aplicarCarta, resolverProbabilidad, formatearMods } from './cards.js';
import { subirHeat } from './rivalry.js';
import { clamp } from './stats.js';
import { CARTAS_EVENTO } from '../content/cards-events.js';
import { CARTAS_REDES } from '../content/cards-social.js';

export function elegirEvento(rng, { jugador, etapa, categoria = null }) {
  const elegibles = CARTAS_EVENTO.filter(
    (c) => c.etapas.includes(etapa) && (categoria === null || c.categoria === categoria),
  );
  const fuente = elegibles.length > 0 ? elegibles : CARTAS_EVENTO;
  return rng.pick(fuente);
}

export function elegirCartaRedes(rng, { jugador, oferta = null }) {
  if (oferta && rng.chance(0.5)) {
    const deSemana = CARTAS_REDES.find((c) => c.id === 'post_pelea_grande');
    if (deSemana) return deSemana;
  }
  return rng.pick(CARTAS_REDES);
}

export function resolverOpcion(rng, { jugador, carta, opcionId, rivalidades = [], rivalObjetivoId = null }) {
  const opcion = carta.opciones.find((o) => o.id === opcionId);
  if (!opcion) throw new Error(`Opción desconocida: ${opcionId}`);

  let mods = { ...(opcion.mods ?? {}) };
  let texto = opcion.textoResultado ?? '';

  if (opcion.probabilidades) {
    const tirada = resolverProbabilidad(rng, opcion);
    mods = { ...mods, ...tirada.resultado };
    texto = tirada.texto;
  }

  const paso = aplicarCarta(jugador, { ...carta, mods });
  let nuevo = paso.jugador;

  const efectos = opcion.efectos ?? {};
  if (typeof efectos.dinero === 'number') {
    nuevo = { ...nuevo, dinero: Math.max(0, nuevo.dinero + efectos.dinero) };
  }
  if (typeof efectos.fama === 'number') {
    nuevo = { ...nuevo, fama: clamp(nuevo.fama + efectos.fama, 0, 100) };
  }

  let nuevasRivalidades = rivalidades;
  if (efectos.heatRival && rivalObjetivoId) {
    nuevasRivalidades = subirHeat(rivalidades, rivalObjetivoId, efectos.heatRival);
  }

  const deltasTexto = formatearMods(paso.deltas);
  const extras = [];
  if (efectos.dinero) extras.push(`${efectos.dinero > 0 ? '+' : '-'}US$ ${Math.abs(efectos.dinero).toLocaleString('es-AR')}`);
  if (efectos.fama) extras.push(`${efectos.fama > 0 ? '+' : ''}${efectos.fama} Fama`);

  return {
    jugador: nuevo,
    rivalidades: nuevasRivalidades,
    texto,
    deltasTexto: [...deltasTexto, ...extras],
  };
}
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/events.test.js`
Expected: PASS (17 tests).

- [ ] **Step 7: Commit**

```bash
git add src/content/cards-events.js src/content/cards-social.js src/core/events.js tests/core/events.test.js
git commit -m "feat: eventos, vida personal y cartas de redes"
```

---

## Task 15: Careo y sparring

**Files:**
- Create: `src/content/cards-presser.js`
- Create: `src/core/presser.js`
- Create: `src/core/sparring.js`
- Test: `tests/core/presser.test.js`
- Test: `tests/core/sparring.test.js`

**Interfaces:**
- Consumes: `clamp`; `subirHeat`; `createRng`.
- Produces (`cards-presser.js`): `PREGUNTAS_CAREO: Array<{id, texto, respuestas: Array<{tono, texto}>}>` — 8 preguntas, cada una con 4 respuestas (`provocador`, `frio`, `humilde`, `canchero`).
- Produces (`presser.js`):
  - `TONOS: Record<'provocador'|'frio'|'humilde'|'canchero', {id,nombre,pistaEfecto}>`
  - `TELLS: Record<string, {incomoda: string, agranda: string, texto: string}>` — por personalidad del rival.
  - `crearCareo(rng, {oferta, rondas?}): Careo` = `{ ofertaId, rivalApodo, personalidad, tell, hype, ventajaMental, ronda, rondas, preguntas, terminado }`
  - `responderCareo(careo, tonoId, rng): {careo, evento: {texto, hypeDelta, ventajaDelta}}`
  - `resultadoCareo(careo): {hype, ventajaMental, bonusFama, bonusMoral, heatRival}`
- Produces (`sparring.js`):
  - `crearSparring(rng, {jugador, objetivos?}): Sparring` = `{ objetivos, secuencia: number[], indice: number, aciertos, tiempos: number[], terminado }`
  - `registrarGolpe(sparring, {acerto: boolean, ms: number}): Sparring`
  - `resultadoSparring(sparring, jugador): {nivel: 'perfecto'|'bien'|'flojo', mods: object, texto: string}`

- [ ] **Step 1: Escribir `tests/core/presser.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PREGUNTAS_CAREO } from '../../src/content/cards-presser.js';
import { TONOS, TELLS, crearCareo, responderCareo, resultadoCareo } from '../../src/core/presser.js';

const oferta = {
  id: 'of_1', rivalId: 'riv_1', rivalApodo: 'El Ciclón', rivalNombre: 'Dyke Tyzon',
  rivalPersonalidad: 'agresivo', esTitulo: true,
};

describe('contenido del careo', () => {
  it('tiene al menos ocho preguntas con cuatro respuestas', () => {
    expect(PREGUNTAS_CAREO.length).toBeGreaterThanOrEqual(8);
    for (const p of PREGUNTAS_CAREO) {
      expect(p.respuestas).toHaveLength(4);
      expect(new Set(p.respuestas.map((r) => r.tono)).size).toBe(4);
    }
  });

  it('define los cuatro tonos', () => {
    expect(Object.keys(TONOS).sort()).toEqual(['canchero', 'frio', 'humilde', 'provocador']);
  });

  it('hay un tell por personalidad', () => {
    for (const personalidad of ['respetuoso', 'provocador', 'tramposo', 'showman', 'mentor', 'agresivo', 'mercenario']) {
      expect(TELLS[personalidad]).toBeTruthy();
      expect(TELLS[personalidad].texto.length).toBeGreaterThan(0);
    }
  });
});

describe('crearCareo', () => {
  it('arranca en la ronda 1 con tres preguntas', () => {
    const careo = crearCareo(createRng(1), { oferta });
    expect(careo.ronda).toBe(1);
    expect(careo.rondas).toBe(3);
    expect(careo.preguntas).toHaveLength(3);
    expect(careo.terminado).toBe(false);
  });

  it('trae el tell de la personalidad del rival', () => {
    const careo = crearCareo(createRng(2), { oferta });
    expect(careo.tell).toEqual(TELLS.agresivo);
  });

  it('el hype arranca en un valor medio', () => {
    const careo = crearCareo(createRng(3), { oferta });
    expect(careo.hype).toBeGreaterThan(0);
    expect(careo.hype).toBeLessThan(100);
  });

  it('es determinista', () => {
    const a = crearCareo(createRng(4), { oferta });
    const b = crearCareo(createRng(4), { oferta });
    expect(a.preguntas.map((p) => p.id)).toEqual(b.preguntas.map((p) => p.id));
  });
});

describe('responderCareo', () => {
  it('provocar sube el hype', () => {
    const careo = crearCareo(createRng(5), { oferta });
    const { careo: despues, evento } = responderCareo(careo, 'provocador', createRng(6));
    expect(despues.hype).toBeGreaterThan(careo.hype);
    expect(evento.hypeDelta).toBeGreaterThan(0);
  });

  it('el tono que incomoda al rival da ventaja mental', () => {
    const careo = crearCareo(createRng(7), { oferta });
    const { careo: despues } = responderCareo(careo, careo.tell.incomoda, createRng(8));
    expect(despues.ventajaMental).toBeGreaterThan(careo.ventajaMental);
  });

  it('el tono que lo agranda te quita ventaja', () => {
    const careo = crearCareo(createRng(9), { oferta });
    const { careo: despues } = responderCareo(careo, careo.tell.agranda, createRng(10));
    expect(despues.ventajaMental).toBeLessThan(careo.ventajaMental);
  });

  it('humilde baja el hype', () => {
    const careo = crearCareo(createRng(11), { oferta });
    const { careo: despues } = responderCareo(careo, 'humilde', createRng(12));
    expect(despues.hype).toBeLessThanOrEqual(careo.hype);
  });

  it('avanza la ronda y termina al completar', () => {
    let careo = crearCareo(createRng(13), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'frio', createRng(i)).careo;
    expect(careo.terminado).toBe(true);
    expect(careo.ronda).toBe(4);
  });

  it('no hace nada si ya termino', () => {
    let careo = crearCareo(createRng(14), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'frio', createRng(i)).careo;
    const { careo: igual, evento } = responderCareo(careo, 'provocador', createRng(20));
    expect(igual).toEqual(careo);
    expect(evento).toBeNull();
  });

  it('no muta el careo original', () => {
    const careo = crearCareo(createRng(15), { oferta });
    const antes = JSON.stringify(careo);
    responderCareo(careo, 'provocador', createRng(16));
    expect(JSON.stringify(careo)).toBe(antes);
  });

  it('el hype y la ventaja quedan acotados', () => {
    let careo = crearCareo(createRng(17), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'provocador', createRng(i)).careo;
    expect(careo.hype).toBeLessThanOrEqual(100);
    expect(careo.ventajaMental).toBeGreaterThanOrEqual(-100);
    expect(careo.ventajaMental).toBeLessThanOrEqual(100);
  });

  it('rechaza un tono desconocido', () => {
    const careo = crearCareo(createRng(18), { oferta });
    expect(() => responderCareo(careo, 'inventado', createRng(19))).toThrow(/inventado/);
  });
});

describe('resultadoCareo', () => {
  it('mas hype da mas fama', () => {
    let careo = crearCareo(createRng(21), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'provocador', createRng(i)).careo;
    const r = resultadoCareo(careo);
    expect(r.bonusFama).toBeGreaterThan(0);
    expect(r.heatRival).toBeGreaterThan(0);
  });

  it('la ventaja mental se traduce en moral', () => {
    let careo = crearCareo(createRng(22), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, careo.tell.incomoda, createRng(i)).careo;
    expect(resultadoCareo(careo).bonusMoral).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Escribir `tests/core/sparring.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring, registrarGolpe, resultadoSparring } from '../../src/core/sparring.js';

const jugador = () => crearPeleador({
  nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
});

describe('crearSparring', () => {
  it('arranca sin aciertos y con una secuencia de paos', () => {
    const s = crearSparring(createRng(1), { jugador: jugador() });
    expect(s.indice).toBe(0);
    expect(s.aciertos).toBe(0);
    expect(s.terminado).toBe(false);
    expect(s.secuencia.length).toBe(s.objetivos);
  });

  it('la secuencia usa posiciones de la grilla 0-5', () => {
    const s = crearSparring(createRng(2), { jugador: jugador() });
    for (const pos of s.secuencia) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(5);
    }
  });

  it('es determinista', () => {
    expect(crearSparring(createRng(3), { jugador: jugador() }).secuencia)
      .toEqual(crearSparring(createRng(3), { jugador: jugador() }).secuencia);
  });
});

describe('registrarGolpe', () => {
  it('suma acierto y avanza el indice', () => {
    const s = registrarGolpe(crearSparring(createRng(4), { jugador: jugador() }), { acerto: true, ms: 300 });
    expect(s.aciertos).toBe(1);
    expect(s.indice).toBe(1);
    expect(s.tiempos).toEqual([300]);
  });

  it('errar avanza pero no suma', () => {
    const s = registrarGolpe(crearSparring(createRng(5), { jugador: jugador() }), { acerto: false, ms: 900 });
    expect(s.aciertos).toBe(0);
    expect(s.indice).toBe(1);
  });

  it('termina al completar la secuencia', () => {
    let s = crearSparring(createRng(6), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: true, ms: 250 });
    expect(s.terminado).toBe(true);
  });

  it('no registra nada despues de terminar', () => {
    let s = crearSparring(createRng(7), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: true, ms: 250 });
    const igual = registrarGolpe(s, { acerto: true, ms: 100 });
    expect(igual).toEqual(s);
  });

  it('no muta el original', () => {
    const s = crearSparring(createRng(8), { jugador: jugador() });
    const antes = JSON.stringify(s);
    registrarGolpe(s, { acerto: true, ms: 200 });
    expect(JSON.stringify(s)).toBe(antes);
  });
});

describe('resultadoSparring', () => {
  function jugar(aciertos, ms) {
    let s = crearSparring(createRng(9), { jugador: jugador() });
    for (let i = 0; i < s.objetivos; i++) s = registrarGolpe(s, { acerto: i < aciertos, ms });
    return s;
  }

  it('todo acertado y rapido es perfecto', () => {
    const r = resultadoSparring(jugar(10, 220), jugador());
    expect(r.nivel).toBe('perfecto');
    expect(Object.values(r.mods).some((v) => v > 0)).toBe(true);
  });

  it('mitad acertado es bien o flojo', () => {
    const r = resultadoSparring(jugar(5, 600), jugador());
    expect(['bien', 'flojo']).toContain(r.nivel);
  });

  it('casi nada acertado es flojo y no da mods', () => {
    const r = resultadoSparring(jugar(1, 900), jugador());
    expect(r.nivel).toBe('flojo');
    expect(Object.keys(r.mods)).toHaveLength(0);
  });

  it('siempre devuelve un texto', () => {
    expect(resultadoSparring(jugar(7, 400), jugador()).texto.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/presser.test.js tests/core/sparring.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 4: Implementar `src/content/cards-presser.js`**

```js
export const PREGUNTAS_CAREO = [
  {
    id: 'talentos', texto: '"Dicen que llegaste hasta acá por suerte. ¿Qué respondés?"',
    respuestas: [
      { tono: 'provocador', texto: '"Suerte va a necesitar él para llegar al segundo round."' },
      { tono: 'frio', texto: '"Los números están. Miren el récord y después hablamos."' },
      { tono: 'humilde', texto: '"Puede ser. Trabajo todos los días para que no dependa de eso."' },
      { tono: 'canchero', texto: '"Si esto es suerte, banco. Que me dure."' },
    ],
  },
  {
    id: 'video_joda', texto: '"Se filtró un video tuyo de joda la semana de la pelea. ¿Explicás?"',
    respuestas: [
      { tono: 'provocador', texto: '"Mi vida privada no le importa a nadie. Rindo y punto."' },
      { tono: 'frio', texto: '"Es un tema resuelto con el cuerpo técnico. Nada que agregar."' },
      { tono: 'humilde', texto: '"Me equivoqué. Pido disculpas y lo corrijo en el ring."' },
      { tono: 'canchero', texto: '"¿Un asado con amigos ahora es delito? Dale."' },
    ],
  },
  {
    id: 'amenaza', texto: 'El rival, mirándote fijo: "Contá los días que te quedan enteros."',
    respuestas: [
      { tono: 'provocador', texto: '"El único que va a contar algo sos vos: los segundos en la lona."' },
      { tono: 'frio', texto: '"Le gano 7 de 10 y lo sabe. Por eso grita."' },
      { tono: 'humilde', texto: '"Es una leyenda. Yo vengo a dar lo mejor y ver qué pasa."' },
      { tono: 'canchero', texto: '"Traje pochoclos para escucharlo. Avisen cuando diga algo cierto."' },
    ],
  },
  {
    id: 'peso', texto: '"¿Vas a dar el peso o vas a llegar seco como la última vez?"',
    respuestas: [
      { tono: 'provocador', texto: '"Voy a llegar entero. El que va a estar seco es él, de tanto hablar."' },
      { tono: 'frio', texto: '"El peso está controlado desde hace ocho semanas."' },
      { tono: 'humilde', texto: '"Es lo más difícil de esto. Le estamos poniendo mucho trabajo."' },
      { tono: 'canchero', texto: '"Doy el peso y todavía me sobra para un choripán."' },
    ],
  },
  {
    id: 'plata', texto: '"¿Peleás por la plata o por la gloria?"',
    respuestas: [
      { tono: 'provocador', texto: '"Por las dos. Y las dos se las saco a él."' },
      { tono: 'frio', texto: '"Peleo por el cinturón. La plata es consecuencia."' },
      { tono: 'humilde', texto: '"Peleo para que mi familia no vuelva a pasarla mal."' },
      { tono: 'canchero', texto: '"¿Vos trabajás gratis? Bueno, yo tampoco."' },
    ],
  },
  {
    id: 'estilo', texto: '"Dicen que tu estilo es aburrido."',
    respuestas: [
      { tono: 'provocador', texto: '"Aburrido va a ser verlo dormir en la lona."' },
      { tono: 'frio', texto: '"Mi estilo gana peleas. No vine a entretener."' },
      { tono: 'humilde', texto: '"Entiendo la crítica. Voy a buscar la pelea."' },
      { tono: 'canchero', texto: '"Si querés show, andá al circo. Yo vengo a ganar."' },
    ],
  },
  {
    id: 'edad', texto: '"¿No estás grande para esto?"',
    respuestas: [
      { tono: 'provocador', texto: '"Grande y todavía te paso por arriba."' },
      { tono: 'frio', texto: '"Los años son experiencia. Los números no bajaron."' },
      { tono: 'humilde', texto: '"Algún día va a ser cierto. Hoy todavía no."' },
      { tono: 'canchero', texto: '"Grande es mi viejo y todavía me gana al truco."' },
    ],
  },
  {
    id: 'prediccion', texto: '"Una predicción para la pelea."',
    respuestas: [
      { tono: 'provocador', texto: '"Nocaut en el primero. Anotalo."' },
      { tono: 'frio', texto: '"Gano por decisión clara. Sin sobresaltos."' },
      { tono: 'humilde', texto: '"No hago predicciones. Se pelea el día de la pelea."' },
      { tono: 'canchero', texto: '"Gano yo. ¿Querés que te lo dibuje?"' },
    ],
  },
];
```

- [ ] **Step 5: Implementar `src/core/presser.js`**

```js
import { clamp } from './stats.js';
import { PREGUNTAS_CAREO } from '../content/cards-presser.js';

export const TONOS = {
  provocador: { id: 'provocador', nombre: 'Provocador', pistaEfecto: '+ HYPE · riesgo: lo agranda' },
  frio: { id: 'frio', nombre: 'Frío / técnico', pistaEfecto: '+ VENTAJA MENTAL' },
  humilde: { id: 'humilde', nombre: 'Humilde', pistaEfecto: '– HYPE · + respeto' },
  canchero: { id: 'canchero', nombre: 'Canchero', pistaEfecto: '+ FAMA · impredecible' },
};

export const TELLS = {
  agresivo: { incomoda: 'frio', agranda: 'provocador', texto: 'Es explosivo y soberbio. Si lo provocás, se agranda. La frialdad técnica lo descoloca.' },
  provocador: { incomoda: 'humilde', agranda: 'canchero', texto: 'Vive del ida y vuelta. La humildad lo deja sin libreto; la joda le da pie.' },
  respetuoso: { incomoda: 'provocador', agranda: 'humilde', texto: 'Es un caballero. La provocación lo saca de eje; la humildad lo relaja.' },
  showman: { incomoda: 'frio', agranda: 'canchero', texto: 'Vino a actuar. La seriedad le arruina el show; la joda lo alimenta.' },
  tramposo: { incomoda: 'frio', agranda: 'provocador', texto: 'Busca sacarte del plan. Los datos fríos lo exponen; el barro es su terreno.' },
  mentor: { incomoda: 'canchero', agranda: 'humilde', texto: 'Te trata de aprendiz. La cancha lo irrita; la humildad le confirma el papel.' },
  mercenario: { incomoda: 'humilde', agranda: 'frio', texto: 'Solo le importa la bolsa. La humildad lo deja sin argumento; los números lo entretienen.' },
};

export const HYPE_INICIAL = 45;

export function crearCareo(rng, { oferta, rondas = 3 }) {
  const personalidad = oferta.rivalPersonalidad ?? 'respetuoso';
  return {
    ofertaId: oferta.id,
    rivalId: oferta.rivalId,
    rivalApodo: oferta.rivalApodo,
    personalidad,
    tell: TELLS[personalidad] ?? TELLS.respetuoso,
    hype: HYPE_INICIAL + (oferta.esTitulo ? 15 : 0),
    ventajaMental: 0,
    ronda: 1,
    rondas,
    preguntas: rng.shuffle(PREGUNTAS_CAREO).slice(0, rondas),
    terminado: false,
  };
}

const EFECTOS_TONO = {
  provocador: { hype: 12, ventaja: 0 },
  frio: { hype: 2, ventaja: 8 },
  humilde: { hype: -4, ventaja: 3 },
  canchero: { hype: 7, ventaja: 2 },
};

export function responderCareo(careo, tonoId, rng) {
  if (!TONOS[tonoId]) throw new Error(`Tono desconocido: ${tonoId}`);
  if (careo.terminado) return { careo, evento: null };

  const base = EFECTOS_TONO[tonoId];
  let hypeDelta = base.hype + rng.int(-2, 2);
  let ventajaDelta = base.ventaja;

  if (tonoId === careo.tell.incomoda) ventajaDelta += 14;
  if (tonoId === careo.tell.agranda) ventajaDelta -= 16;

  const nuevo = {
    ...careo,
    hype: clamp(careo.hype + hypeDelta, 0, 100),
    ventajaMental: clamp(careo.ventajaMental + ventajaDelta, -100, 100),
    ronda: careo.ronda + 1,
  };
  nuevo.terminado = nuevo.ronda > careo.rondas;

  const texto = ventajaDelta > 8
    ? `${careo.rivalApodo} se queda sin respuesta. Le pegaste donde duele.`
    : ventajaDelta < 0
      ? `${careo.rivalApodo} se agranda con eso. La sala explota a su favor.`
      : 'La sala murmura. Nadie se llevó la ronda.';

  return { careo: nuevo, evento: { texto, hypeDelta, ventajaDelta } };
}

export function resultadoCareo(careo) {
  return {
    hype: careo.hype,
    ventajaMental: careo.ventajaMental,
    bonusFama: Math.round(careo.hype / 12),
    bonusMoral: Math.round(careo.ventajaMental / 6),
    heatRival: Math.round(careo.hype / 5),
  };
}
```

- [ ] **Step 6: Implementar `src/core/sparring.js`**

```js
import { clamp } from './stats.js';

export const OBJETIVOS_POR_DEFECTO = 10;
export const MS_PERFECTO = 320;
export const MS_BIEN = 700;

export function crearSparring(rng, { jugador, objetivos = OBJETIVOS_POR_DEFECTO }) {
  const secuencia = [];
  for (let i = 0; i < objetivos; i++) secuencia.push(rng.int(0, 5));
  return {
    objetivos,
    secuencia,
    indice: 0,
    aciertos: 0,
    tiempos: [],
    terminado: false,
    atributoObjetivo: jugador.disciplina === 'mma' ? 'velocidad' : 'velocidad',
  };
}

export function registrarGolpe(sparring, { acerto, ms }) {
  if (sparring.terminado) return sparring;
  const nuevo = {
    ...sparring,
    indice: sparring.indice + 1,
    aciertos: sparring.aciertos + (acerto ? 1 : 0),
    tiempos: [...sparring.tiempos, ms],
  };
  nuevo.terminado = nuevo.indice >= nuevo.objetivos;
  return nuevo;
}

export function promedioReaccion(sparring) {
  if (sparring.tiempos.length === 0) return 0;
  return Math.round(sparring.tiempos.reduce((a, b) => a + b, 0) / sparring.tiempos.length);
}

export function resultadoSparring(sparring, jugador) {
  const ratio = sparring.objetivos === 0 ? 0 : sparring.aciertos / sparring.objetivos;
  const promedio = promedioReaccion(sparring);

  if (ratio >= 0.9 && promedio <= MS_PERFECTO) {
    return {
      nivel: 'perfecto',
      mods: { velocidad: 2, forma: 3 },
      texto: `Sesión perfecta: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. Don Pepe casi sonríe.`,
    };
  }
  if (ratio >= 0.5) {
    return {
      nivel: 'bien',
      mods: { velocidad: 1 },
      texto: `Buena sesión: ${sparring.aciertos}/${sparring.objetivos}. Todavía te falta filo.`,
    };
  }
  return {
    nivel: 'flojo',
    mods: {},
    texto: `Sesión floja: ${sparring.aciertos}/${sparring.objetivos}. "Así en el ring te comen", te dice el entrenador.`,
  };
}
```

- [ ] **Step 7: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/presser.test.js tests/core/sparring.test.js`
Expected: PASS (25 tests).

- [ ] **Step 8: Correr toda la suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/content/cards-presser.js src/core/presser.js src/core/sparring.js tests/core/presser.test.js tests/core/sparring.test.js
git commit -m "feat: minijuegos de careo y sparring"
```

---

## Task 16: Noticias

**Files:**
- Create: `src/content/news-templates.js`
- Create: `src/core/news.js`
- Test: `tests/core/news.test.js`

**Interfaces:**
- Consumes: `createRng`.
- Produces (`news-templates.js`): `PLANTILLAS: Record<TipoNoticia, string[]>` con tipos `victoria`, `derrota`, `titulo`, `defensa`, `retiro`, `lesion`, `ranking`, `escandalo`, `revancha`, `record`. Marcadores válidos: `{nombre}`, `{apodo}`, `{rival}`, `{metodo}`, `{round}`, `{titulo}`, `{numero}`.
- Produces (`news.js`):
  - `generarNoticia(rng, {tipo, datos}): Noticia` = `{ id, tipo, titular, fecha: number }` — tira error si el tipo no existe o si queda un marcador sin reemplazar.
  - `noticiasDeSucesos(rng, sucesos, {anio}): Noticia[]` — traduce los `Suceso` del mundo (Task 7).
  - `agregarNoticias(feed, nuevas, {maximo?: number}): Noticia[]` — más nuevas primero, recorta a `maximo` (default 30).

- [ ] **Step 1: Escribir `tests/core/news.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PLANTILLAS } from '../../src/content/news-templates.js';
import { generarNoticia, noticiasDeSucesos, agregarNoticias } from '../../src/core/news.js';

describe('plantillas', () => {
  it('cubre los diez tipos de noticia', () => {
    expect(Object.keys(PLANTILLAS).sort()).toEqual([
      'defensa', 'derrota', 'escandalo', 'lesion', 'ranking',
      'record', 'retiro', 'revancha', 'titulo', 'victoria',
    ]);
  });

  it('cada tipo tiene al menos dos variantes', () => {
    for (const variantes of Object.values(PLANTILLAS)) {
      expect(variantes.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('generarNoticia', () => {
  const datos = { nombre: 'Lucas Ortiz', apodo: 'El Relámpago', rival: 'El Toro', metodo: 'KO', round: 3, titulo: 'Título regional', numero: 5 };

  it('devuelve un titular sin marcadores sueltos', () => {
    for (const tipo of Object.keys(PLANTILLAS)) {
      for (let s = 1; s <= 5; s++) {
        const noticia = generarNoticia(createRng(s), { tipo, datos });
        expect(noticia.titular).not.toMatch(/\{[a-z]+\}/);
        expect(noticia.tipo).toBe(tipo);
        expect(noticia.id).toBeTruthy();
      }
    }
  });

  it('es determinista', () => {
    const a = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    const b = generarNoticia(createRng(7), { tipo: 'victoria', datos });
    expect(a.titular).toBe(b.titular);
  });

  it('rechaza un tipo desconocido', () => {
    expect(() => generarNoticia(createRng(1), { tipo: 'inventado', datos })).toThrow(/inventado/);
  });

  it('avisa si falta un dato de la plantilla', () => {
    expect(() => generarNoticia(createRng(1), { tipo: 'victoria', datos: {} })).toThrow(/marcador/i);
  });
});

describe('noticiasDeSucesos', () => {
  it('convierte sucesos del mundo en noticias', () => {
    const sucesos = [
      { tipo: 'victoria', peleadorId: 'a', rivalId: 'b', texto: 'X noqueó a Y.' },
      { tipo: 'retiro', peleadorId: 'c', texto: 'Z se retira.' },
    ];
    const noticias = noticiasDeSucesos(createRng(1), sucesos, { anio: 2030 });
    expect(noticias).toHaveLength(2);
    for (const n of noticias) {
      expect(n.titular.length).toBeGreaterThan(0);
      expect(n.fecha).toBe(2030);
    }
  });

  it('con lista vacia devuelve vacio', () => {
    expect(noticiasDeSucesos(createRng(1), [], { anio: 2030 })).toEqual([]);
  });
});

describe('agregarNoticias', () => {
  const noticia = (id) => ({ id, tipo: 'victoria', titular: `Titular ${id}`, fecha: 2030 });

  it('pone las nuevas primero', () => {
    const feed = agregarNoticias([noticia('vieja')], [noticia('nueva')]);
    expect(feed[0].id).toBe('nueva');
  });

  it('recorta al maximo', () => {
    const muchas = Array.from({ length: 50 }, (_, i) => noticia(`n${i}`));
    expect(agregarNoticias([], muchas, { maximo: 30 })).toHaveLength(30);
  });

  it('no muta el feed original', () => {
    const feed = [noticia('a')];
    agregarNoticias(feed, [noticia('b')]);
    expect(feed).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/news.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/content/news-templates.js`**

```js
export const PLANTILLAS = {
  victoria: [
    '{apodo} se lo sacó de encima: le ganó a {rival} por {metodo} en el round {round}.',
    '{nombre} sigue invicto en su racha: {metodo} sobre {rival}.',
    'Noche redonda para {apodo}: liquidó a {rival} por {metodo}.',
  ],
  derrota: [
    '{rival} le cortó la racha a {apodo}: {metodo} en el {round}.',
    'Golpe duro para {nombre}: cayó ante {rival} por {metodo}.',
    'Se terminó el invicto: {rival} venció a {apodo} por {metodo}.',
  ],
  titulo: [
    '¡{apodo} es campeón! Se quedó con el {titulo}.',
    'Nuevo rey de la categoría: {nombre} conquistó el {titulo}.',
    'Histórico: {apodo} le arrebató el {titulo} a {rival}.',
  ],
  defensa: [
    '{apodo} defendió el {titulo} y ya suma {numero}.',
    'El cinturón sigue en casa: {nombre} retuvo ante {rival}.',
  ],
  retiro: [
    '{nombre} cuelga los guantes. Se termina una era.',
    'Adiós al ring: {apodo} anunció su retiro.',
  ],
  lesion: [
    '{apodo} se lesionó: parte médico reservado.',
    'Preocupación en el equipo de {nombre} por una lesión.',
  ],
  ranking: [
    '{apodo} sube al puesto {numero} del ranking.',
    'Movimiento en la tabla: {nombre} ahora es el número {numero}.',
  ],
  escandalo: [
    'Escándalo alrededor de {nombre}: la federación pide explicaciones.',
    '{apodo} en el ojo de la tormenta tras la polémica.',
  ],
  revancha: [
    'Se viene la revancha: {apodo} vs {rival}, otra vez.',
    'La rivalidad no termina: {nombre} y {rival} se cruzan de nuevo.',
  ],
  record: [
    '{apodo} alcanzó las {numero} victorias en su carrera.',
    'Marca histórica: {nombre} llegó a {numero} triunfos.',
  ],
};
```

- [ ] **Step 4: Implementar `src/core/news.js`**

```js
import { PLANTILLAS } from '../content/news-templates.js';

let contador = 0;

export function generarNoticia(rng, { tipo, datos = {}, fecha = 0 }) {
  const variantes = PLANTILLAS[tipo];
  if (!variantes) throw new Error(`Tipo de noticia desconocido: ${tipo}`);

  const plantilla = rng.pick(variantes);
  const titular = plantilla.replace(/\{(\w+)\}/g, (_, clave) => {
    const valor = datos[clave];
    if (valor === undefined || valor === null || valor === '') {
      throw new Error(`Falta el marcador "${clave}" para una noticia de tipo ${tipo}`);
    }
    return String(valor);
  });

  contador += 1;
  return { id: `noticia_${contador}`, tipo, titular, fecha };
}

const MAPA_SUCESOS = {
  victoria: 'victoria',
  titulo: 'titulo',
  retiro: 'retiro',
  lesion: 'lesion',
  ascenso: 'ranking',
};

export function noticiasDeSucesos(rng, sucesos, { anio }) {
  return sucesos.map((suceso) => {
    contador += 1;
    return {
      id: `noticia_${contador}`,
      tipo: MAPA_SUCESOS[suceso.tipo] ?? 'victoria',
      titular: suceso.texto,
      fecha: anio,
    };
  });
}

export function agregarNoticias(feed, nuevas, { maximo = 30 } = {}) {
  return [...nuevas, ...feed].slice(0, maximo);
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/news.test.js`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add src/content/news-templates.js src/core/news.js tests/core/news.test.js
git commit -m "feat: generador de noticias del mundo"
```

---

## Task 17: Máquina de carrera

**Files:**
- Create: `src/core/career.js`
- Test: `tests/core/career.test.js`

**Interfaces:**
- Consumes: prácticamente todo el núcleo anterior.
- Produces:
  - `ETAPAS: Array<{id, nombre, bloques, aniosPorBloque, edadDesde, probPelea, probEvento, probRedes, frase}>` — juvenil/amateur/profesional/veterano; total de bloques = 20.
  - `crearPartida({jugador, semilla}): Partida`
  - `Partida` = `{ version: 1, semilla, rngEstado, jugador, mundo, rivalidades, noticias, etapaIndice, bloque, bloqueGlobal, cola: Beat[], beatActual: Beat|null, historialBeats: number, terminada: boolean, legado: null|object }`
  - `Beat` = `{ tipo: 'mejora'|'evento'|'redes'|'sparring'|'oferta'|'careo'|'pelea'|'noticias', datos: object }`
  - `siguienteBeat(partida): {partida, beat: Beat|null}` — si la cola está vacía arma el bloque siguiente; si no quedan bloques marca `terminada`.
  - `etapaActual(partida): Etapa`
  - `avanzarBloque(partida): Partida` — envejece al jugador, avanza el mundo, recupera lesiones, cobra sponsor.
  - `totalBeatsEstimado(): number` — para tests de ritmo.

- [ ] **Step 1: Escribir `tests/core/career.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { ETAPAS, crearPartida, siguienteBeat, etapaActual, avanzarBloque } from '../../src/core/career.js';

function nuevaPartida(semilla = 1) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla });
}

function jugarTodo(partida, limite = 400) {
  let actual = partida;
  const beats = [];
  let guardia = 0;
  while (!actual.terminada && guardia < limite) {
    guardia += 1;
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat) beats.push(paso.beat);
  }
  return { partida: actual, beats };
}

describe('etapas', () => {
  it('define las cuatro etapas en orden', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['juvenil', 'amateur', 'profesional', 'veterano']);
  });

  it('suman veinte bloques', () => {
    expect(ETAPAS.reduce((a, e) => a + e.bloques, 0)).toBe(20);
  });

  it('la carrera cubre de los 15 a los ~39', () => {
    const finEstimado = ETAPAS.reduce((edad, e) => edad + e.bloques * e.aniosPorBloque, 15);
    expect(finEstimado).toBeGreaterThanOrEqual(38);
    expect(finEstimado).toBeLessThanOrEqual(41);
  });

  it('en juvenil se pelea menos que en profesional', () => {
    const juvenil = ETAPAS.find((e) => e.id === 'juvenil');
    const pro = ETAPAS.find((e) => e.id === 'profesional');
    expect(juvenil.probPelea).toBeLessThan(pro.probPelea);
  });
});

describe('crearPartida', () => {
  it('arranca en el bloque 1 de la etapa juvenil', () => {
    const p = nuevaPartida();
    expect(p.etapaIndice).toBe(0);
    expect(p.bloque).toBe(1);
    expect(p.terminada).toBe(false);
    expect(p.legado).toBeNull();
    expect(p.version).toBe(1);
  });

  it('crea el mundo con la disciplina y categoria del jugador', () => {
    const p = nuevaPartida();
    expect(p.mundo.disciplina).toBe('boxeo');
    expect(p.mundo.categoria).toBe('pluma');
    expect(p.mundo.roster.length).toBeGreaterThan(5);
  });

  it('el jugador arranca con 15 anios y sin rivalidades', () => {
    const p = nuevaPartida();
    expect(p.jugador.edad).toBe(15);
    expect(p.rivalidades).toEqual([]);
  });

  it('es determinista con la misma semilla', () => {
    expect(nuevaPartida(9).mundo.roster.map((r) => r.nombre))
      .toEqual(nuevaPartida(9).mundo.roster.map((r) => r.nombre));
  });
});

describe('siguienteBeat', () => {
  it('el primer beat de cada bloque es una mejora', () => {
    const { beat } = siguienteBeat(nuevaPartida());
    expect(beat.tipo).toBe('mejora');
    expect(beat.datos.cartas.length).toBeGreaterThanOrEqual(3);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    siguienteBeat(p);
    expect(JSON.stringify(p)).toBe(antes);
  });

  it('marca terminada al agotar los bloques', () => {
    const { partida } = jugarTodo(nuevaPartida());
    expect(partida.terminada).toBe(true);
  });
});

describe('ritmo de la carrera', () => {
  it('produce entre 30 y 60 beats', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const { beats } = jugarTodo(nuevaPartida(semilla));
      expect(beats.length).toBeGreaterThanOrEqual(30);
      expect(beats.length).toBeLessThanOrEqual(60);
    }
  });

  it('incluye peleas, mejoras y eventos', () => {
    const { beats } = jugarTodo(nuevaPartida(3));
    const tipos = new Set(beats.map((b) => b.tipo));
    expect(tipos).toContain('mejora');
    expect(tipos).toContain('oferta');
    expect(tipos.has('evento') || tipos.has('redes')).toBe(true);
  });

  it('siempre hay una oferta antes de una pelea', () => {
    const { beats } = jugarTodo(nuevaPartida(4));
    beats.forEach((beat, i) => {
      if (beat.tipo !== 'pelea') return;
      const previos = beats.slice(0, i).map((b) => b.tipo);
      expect(previos).toContain('oferta');
    });
  });

  it('el jugador llega cerca de los 39 al final', () => {
    const { partida } = jugarTodo(nuevaPartida(6));
    expect(partida.jugador.edad).toBeGreaterThanOrEqual(36);
    expect(partida.jugador.edad).toBeLessThanOrEqual(42);
  });
});

describe('etapaActual', () => {
  it('empieza en juvenil y termina en veterano', () => {
    const p = nuevaPartida();
    expect(etapaActual(p).id).toBe('juvenil');
    const { partida } = jugarTodo(p);
    expect(['profesional', 'veterano']).toContain(etapaActual(partida).id);
  });
});

describe('avanzarBloque', () => {
  it('envejece al jugador y avanza el anio del mundo', () => {
    const p = nuevaPartida();
    const despues = avanzarBloque(p);
    expect(despues.jugador.edad).toBeGreaterThan(p.jugador.edad);
    expect(despues.mundo.anio).toBeGreaterThan(p.mundo.anio);
  });

  it('genera noticias del mundo', () => {
    const despues = avanzarBloque(nuevaPartida());
    expect(despues.noticias.length).toBeGreaterThan(0);
  });

  it('recupera lesiones con el paso de los bloques', () => {
    const p = nuevaPartida();
    p.jugador.estado.lesion = { id: 'ceja', nombre: 'Ceja', severidad: 1, bloquesRestantes: 1, costo: 1, texto: 'x' };
    expect(avanzarBloque(p).jugador.estado.lesion).toBeNull();
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida();
    const antes = JSON.stringify(p);
    avanzarBloque(p);
    expect(JSON.stringify(p)).toBe(antes);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/career.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/core/career.js`**

```js
import { createRng } from './rng.js';
import { crearMundo, avanzarMundo } from './world.js';
import { repartirMejoras } from './cards.js';
import { elegirEvento, elegirCartaRedes } from './events.js';
import { generarOferta } from './offers.js';
import { crearSparring } from './sparring.js';
import { noticiasDeSucesos, agregarNoticias } from './news.js';
import { recuperar, puedePelear } from './injuries.js';
import { cobrarSponsor } from './money.js';
import { clamp } from './stats.js';

export const ETAPAS = [
  {
    id: 'juvenil', nombre: 'Juvenil', bloques: 3, aniosPorBloque: 1, edadDesde: 15,
    probPelea: 0.4, probEvento: 0.5, probRedes: 0, probSparring: 0.5,
    frase: 'Nadie sabe quién sos. Todavía.',
  },
  {
    id: 'amateur', nombre: 'Amateur', bloques: 3, aniosPorBloque: 1, edadDesde: 18,
    probPelea: 0.9, probEvento: 0.6, probRedes: 0.3, probSparring: 0.4,
    frase: 'El ascenso no consagra ídolos. Ganate el salto.',
  },
  {
    id: 'profesional', nombre: 'Profesional', bloques: 11, aniosPorBloque: 1.3, edadDesde: 21,
    probPelea: 1, probEvento: 0.6, probRedes: 0.45, probSparring: 0.25,
    frase: 'Acá se cobra y se sangra. Bienvenido.',
  },
  {
    id: 'veterano', nombre: 'Veterano', bloques: 3, aniosPorBloque: 1.3, edadDesde: 36,
    probPelea: 0.8, probEvento: 0.7, probRedes: 0.4, probSparring: 0.1,
    frase: 'Cada pelea puede ser la última. Elegí bien.',
  },
];

export function etapaActual(partida) {
  return ETAPAS[Math.min(partida.etapaIndice, ETAPAS.length - 1)];
}

export function crearPartida({ jugador, semilla }) {
  const rng = createRng(semilla);
  const mundo = crearMundo(rng, {
    disciplina: jugador.disciplina,
    categoria: jugador.categoria,
    cantidad: 12,
  });
  return {
    version: 1,
    semilla,
    rngEstado: rng.estado(),
    jugador,
    mundo,
    rivalidades: [],
    noticias: [],
    etapaIndice: 0,
    bloque: 1,
    bloqueGlobal: 1,
    cola: [],
    beatActual: null,
    historialBeats: 0,
    terminada: false,
    legado: null,
  };
}

function rngDe(partida) {
  const rng = createRng(partida.semilla);
  rng.restaurar(partida.rngEstado);
  return rng;
}

function clonarPartida(partida) {
  return {
    ...partida,
    jugador: {
      ...partida.jugador,
      atributos: { ...partida.jugador.atributos },
      especiales: { ...partida.jugador.especiales },
      estado: { ...partida.jugador.estado },
      record: { ...partida.jugador.record },
      titulos: [...partida.jugador.titulos],
      staff: [...partida.jugador.staff],
      lujos: [...partida.jugador.lujos],
      historial: [...partida.jugador.historial],
    },
    rivalidades: partida.rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] })),
    noticias: [...partida.noticias],
    cola: [...partida.cola],
  };
}

export function avanzarBloque(partida) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);

  nueva.jugador.edad += etapa.aniosPorBloque;
  nueva.jugador.estado.fatiga = clamp(nueva.jugador.estado.fatiga - 25, 0, 100);
  nueva.jugador.estado.forma = clamp(nueva.jugador.estado.forma + 5, 0, 100);

  const recuperacion = recuperar(nueva.jugador, { bloques: 1 });
  nueva.jugador = recuperacion.peleador;

  const sponsor = cobrarSponsor(nueva.jugador, rng);
  if (sponsor) nueva.jugador = sponsor.jugador;

  const paso = avanzarMundo(nueva.mundo, rng, { aniosPasados: Math.round(etapa.aniosPorBloque) });
  nueva.mundo = paso.mundo;

  const nuevas = noticiasDeSucesos(rng, paso.sucesos, { anio: paso.mundo.anio });
  if (sponsor) {
    nuevas.unshift({
      id: `noticia_sponsor_${nueva.bloqueGlobal}`,
      tipo: 'escandalo',
      titular: sponsor.texto,
      fecha: paso.mundo.anio,
    });
  }
  nueva.noticias = agregarNoticias(nueva.noticias, nuevas);

  nueva.rngEstado = rng.estado();
  return nueva;
}

function armarCola(partida) {
  const rng = rngDe(partida);
  const etapa = etapaActual(partida);
  const cola = [];

  cola.push({
    tipo: 'mejora',
    datos: { cartas: repartirMejoras(rng, { jugador: partida.jugador, etapa: etapa.id }) },
  });

  if (rng.chance(etapa.probSparring)) {
    cola.push({ tipo: 'sparring', datos: { sparring: crearSparring(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probEvento)) {
    const categoria = rng.chance(0.5) ? 'vida' : 'evento';
    cola.push({ tipo: 'evento', datos: { carta: elegirEvento(rng, { jugador: partida.jugador, etapa: etapa.id, categoria }) } });
  }

  if (rng.chance(etapa.probRedes)) {
    cola.push({ tipo: 'redes', datos: { carta: elegirCartaRedes(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probPelea) && puedePelear(partida.jugador)) {
    const forzarTitulo = etapa.id === 'profesional'
      && partida.jugador.titulos.length === 0
      && (partida.jugador.ranking ?? 99) <= 3;
    const oferta = generarOferta(rng, {
      jugador: partida.jugador,
      mundo: partida.mundo,
      etapa: etapa.id,
      rivalidades: partida.rivalidades,
      forzarTitulo,
    });
    if (oferta) cola.push({ tipo: 'oferta', datos: { oferta } });
  }

  cola.push({ tipo: 'noticias', datos: {} });

  return { cola, rngEstado: rng.estado() };
}

export function siguienteBeat(partida) {
  if (partida.terminada) return { partida, beat: null };

  let nueva = clonarPartida(partida);

  if (nueva.cola.length === 0) {
    const etapa = etapaActual(nueva);
    if (nueva.bloque > etapa.bloques) {
      if (nueva.etapaIndice >= ETAPAS.length - 1) {
        nueva.terminada = true;
        nueva.beatActual = null;
        return { partida: nueva, beat: null };
      }
      nueva.etapaIndice += 1;
      nueva.bloque = 1;
    }
    if (nueva.bloqueGlobal > 1) nueva = avanzarBloque(nueva);
    const armado = armarCola(nueva);
    nueva.cola = armado.cola;
    nueva.rngEstado = armado.rngEstado;
    nueva.bloque += 1;
    nueva.bloqueGlobal += 1;
  }

  const beat = nueva.cola.shift() ?? null;
  nueva.beatActual = beat;
  nueva.historialBeats += beat ? 1 : 0;
  return { partida: nueva, beat };
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/career.test.js`
Expected: PASS (18 tests).

Si el test de ritmo devuelve menos de 30 beats, subir `probEvento` de `profesional` a `0.75`; si devuelve más de 60, bajarla a `0.45`. No tocar `bloques`: el total de 20 está fijado por el test de etapas.

- [ ] **Step 5: Commit**

```bash
git add src/core/career.js tests/core/career.test.js
git commit -m "feat: maquina de carrera con etapas, bloques y cola de beats"
```

---

## Task 18: Guardado y autoguardado

**Files:**
- Create: `src/core/save.js`
- Test: `tests/core/save.test.js`

**Interfaces:**
- Consumes: nada del núcleo (solo serializa).
- Produces:
  - `CLAVE_GUARDADO` = `'simpeleador:save:v1'`
  - `VERSION_ESQUEMA` = `1`
  - `serializar(partida): string`
  - `deserializar(texto): Partida` — tira error si el JSON es inválido o la versión no coincide.
  - `guardar(partida, storage?): boolean` — `storage` default `globalThis.localStorage`; devuelve `false` si no hay storage o si falla (cuota llena).
  - `cargar(storage?): Partida|null`
  - `borrar(storage?): void`
  - `haySlot(storage?): boolean`

- [ ] **Step 1: Escribir `tests/core/save.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import {
  CLAVE_GUARDADO, VERSION_ESQUEMA, serializar, deserializar, guardar, cargar, borrar, haySlot,
} from '../../src/core/save.js';

function storageFalso() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    _datos: datos,
  };
}

function partidaDePrueba() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 45, esJugador: true,
  });
  return crearPartida({ jugador, semilla: 42 });
}

let storage;
beforeEach(() => { storage = storageFalso(); });

describe('serializar / deserializar', () => {
  it('ida y vuelta conserva la partida', () => {
    const partida = partidaDePrueba();
    const recuperada = deserializar(serializar(partida));
    expect(recuperada.jugador.nombre).toBe(partida.jugador.nombre);
    expect(recuperada.semilla).toBe(partida.semilla);
    expect(recuperada.mundo.roster).toHaveLength(partida.mundo.roster.length);
  });

  it('escribe la version del esquema', () => {
    expect(JSON.parse(serializar(partidaDePrueba())).version).toBe(VERSION_ESQUEMA);
  });

  it('rechaza JSON invalido', () => {
    expect(() => deserializar('no es json')).toThrow(/inv[aá]lid/i);
  });

  it('rechaza otra version de esquema', () => {
    const texto = JSON.stringify({ ...partidaDePrueba(), version: 99 });
    expect(() => deserializar(texto)).toThrow(/versi[oó]n/i);
  });
});

describe('guardar / cargar', () => {
  it('guarda y recupera', () => {
    const partida = partidaDePrueba();
    expect(guardar(partida, storage)).toBe(true);
    expect(cargar(storage).jugador.nombre).toBe(partida.jugador.nombre);
  });

  it('usa la clave versionada', () => {
    guardar(partidaDePrueba(), storage);
    expect(storage._datos.has(CLAVE_GUARDADO)).toBe(true);
  });

  it('cargar sin slot devuelve null', () => {
    expect(cargar(storage)).toBeNull();
  });

  it('cargar un slot corrupto devuelve null y limpia', () => {
    storage.setItem(CLAVE_GUARDADO, '{{{roto');
    expect(cargar(storage)).toBeNull();
    expect(storage.getItem(CLAVE_GUARDADO)).toBeNull();
  });

  it('devuelve false si el storage explota', () => {
    const roto = { getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem: () => {} };
    expect(guardar(partidaDePrueba(), roto)).toBe(false);
  });

  it('devuelve false si no hay storage', () => {
    expect(guardar(partidaDePrueba(), null)).toBe(false);
    expect(cargar(null)).toBeNull();
  });
});

describe('haySlot y borrar', () => {
  it('detecta y borra el slot', () => {
    expect(haySlot(storage)).toBe(false);
    guardar(partidaDePrueba(), storage);
    expect(haySlot(storage)).toBe(true);
    borrar(storage);
    expect(haySlot(storage)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/save.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/core/save.js`**

```js
export const VERSION_ESQUEMA = 1;
export const CLAVE_GUARDADO = 'simpeleador:save:v1';

function storagePorDefecto() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function serializar(partida) {
  return JSON.stringify({ ...partida, version: VERSION_ESQUEMA });
}

export function deserializar(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('Partida guardada inválida: no se pudo leer el JSON.');
  }
  if (!datos || typeof datos !== 'object') {
    throw new Error('Partida guardada inválida: formato inesperado.');
  }
  if (datos.version !== VERSION_ESQUEMA) {
    throw new Error(`Versión de guardado incompatible: ${datos.version}`);
  }
  return datos;
}

export function guardar(partida, storage = storagePorDefecto()) {
  if (!storage) return false;
  try {
    storage.setItem(CLAVE_GUARDADO, serializar(partida));
    return true;
  } catch {
    return false;
  }
}

export function cargar(storage = storagePorDefecto()) {
  if (!storage) return null;
  const texto = storage.getItem(CLAVE_GUARDADO);
  if (!texto) return null;
  try {
    return deserializar(texto);
  } catch {
    borrar(storage);
    return null;
  }
}

export function borrar(storage = storagePorDefecto()) {
  if (!storage) return;
  try {
    storage.removeItem(CLAVE_GUARDADO);
  } catch {
    /* sin storage utilizable */
  }
}

export function haySlot(storage = storagePorDefecto()) {
  if (!storage) return false;
  return storage.getItem(CLAVE_GUARDADO) !== null;
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/save.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/save.js tests/core/save.test.js
git commit -m "feat: guardado versionado en localStorage"
```

---

## Task 19: Legado y biografía

**Files:**
- Create: `src/core/legacy.js`
- Test: `tests/core/legacy.test.js`

**Interfaces:**
- Consumes: `recordTexto`, `mediaDe`; `h2hTexto`, `elegirArchirrival`; `LUJOS`.
- Produces:
  - `calcularLegado(partida): Legado`
  - `Legado` = `{ record: string, peleas: number, titulos: string[], defensas: number, dineroTotal: number, lesionesGraves: number, mediaFinal: number, archirrival: null|{nombre, apodo, h2h: string}, momentos: string[], biografia: string, legados: Array<{id, nombre, puntaje: number, etiqueta: string, texto: string}> }`
  - Los cinco legados: `deportivo`, `nacional`, `economico`, `mediatico`, `etico`. Puntaje 0-100 con etiqueta (`Leyenda` ≥85, `Grande` ≥65, `Respetado` ≥45, `Un nombre más` ≥25, `Olvidable` <25).

- [ ] **Step 1: Escribir `tests/core/legacy.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { calcularLegado } from '../../src/core/legacy.js';

function partida(overrides = {}) {
  const jugador = {
    ...crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    ...overrides,
  };
  const base = crearPartida({ jugador, semilla: 1 });
  return { ...base, jugador };
}

describe('calcularLegado', () => {
  it('devuelve la estructura completa', () => {
    const legado = calcularLegado(partida());
    expect(typeof legado.record).toBe('string');
    expect(Array.isArray(legado.titulos)).toBe(true);
    expect(Array.isArray(legado.momentos)).toBe(true);
    expect(typeof legado.biografia).toBe('string');
    expect(legado.legados).toHaveLength(5);
  });

  it('nombra los cinco legados', () => {
    const ids = calcularLegado(partida()).legados.map((l) => l.id).sort();
    expect(ids).toEqual(['deportivo', 'economico', 'etico', 'mediatico', 'nacional']);
  });

  it('todos los puntajes quedan entre 0 y 100', () => {
    for (const l of calcularLegado(partida({ dinero: 999999999, fama: 100 })).legados) {
      expect(l.puntaje).toBeGreaterThanOrEqual(0);
      expect(l.puntaje).toBeLessThanOrEqual(100);
    }
  });

  it('una carrera vacia da legado deportivo bajo', () => {
    const legado = calcularLegado(partida());
    expect(legado.legados.find((l) => l.id === 'deportivo').puntaje).toBeLessThan(30);
  });

  it('titulos y victorias suben el legado deportivo', () => {
    const legado = calcularLegado(partida({
      record: { v: 40, d: 2, e: 0, ko: 30, sub: 0, dec: 10 },
      titulos: ['Título mundial'], defensas: 8,
    }));
    expect(legado.legados.find((l) => l.id === 'deportivo').puntaje).toBeGreaterThan(70);
  });

  it('la plata y los lujos suben el legado economico', () => {
    const pobre = calcularLegado(partida({ dinero: 0, lujos: [] }));
    const rico = calcularLegado(partida({ dinero: 5000000, lujos: ['auto', 'casa', 'mansion'] }));
    const puntaje = (l) => l.legados.find((x) => x.id === 'economico').puntaje;
    expect(puntaje(rico)).toBeGreaterThan(puntaje(pobre));
  });

  it('la fama sube el legado mediatico', () => {
    const puntaje = (fama) => calcularLegado(partida({ fama })).legados.find((l) => l.id === 'mediatico').puntaje;
    expect(puntaje(95)).toBeGreaterThan(puntaje(5));
  });

  it('la disciplina personal sube el legado etico', () => {
    const alto = partida();
    alto.jugador.especiales = { ...alto.jugador.especiales, disciplinaPersonal: 95 };
    const bajo = partida();
    bajo.jugador.especiales = { ...bajo.jugador.especiales, disciplinaPersonal: 10 };
    const puntaje = (p) => calcularLegado(p).legados.find((l) => l.id === 'etico').puntaje;
    expect(puntaje(alto)).toBeGreaterThan(puntaje(bajo));
  });

  it('cada legado trae etiqueta y texto', () => {
    for (const l of calcularLegado(partida()).legados) {
      expect(l.etiqueta.length).toBeGreaterThan(0);
      expect(l.texto.length).toBeGreaterThan(0);
      expect(l.nombre.length).toBeGreaterThan(0);
    }
  });

  it('la biografia menciona nombre y record', () => {
    const legado = calcularLegado(partida({ record: { v: 20, d: 3, e: 0, ko: 15, sub: 0, dec: 5 } }));
    expect(legado.biografia).toContain('Lucas Ortiz');
    expect(legado.biografia).toContain('20');
  });

  it('lista los momentos memorables del historial', () => {
    const p = partida({
      historial: [
        { rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', resultado: 'v', metodo: 'ko', round: 1, bolsa: 100, enJuego: 'Título mundial', esTitulo: true },
        { rivalId: 'r2', rivalNombre: 'Otro', rivalApodo: 'El Otro', resultado: 'd', metodo: 'decision', round: 12, bolsa: 100, enJuego: 'Ranking', esTitulo: false },
      ],
      titulos: ['Título mundial'],
    });
    const legado = calcularLegado(p);
    expect(legado.momentos.length).toBeGreaterThan(0);
    expect(legado.momentos.join(' ')).toContain('Dyke Tyzon');
  });

  it('destaca al archirrival', () => {
    const p = partida();
    p.rivalidades = [{ rivalId: p.mundo.roster[0].id, heat: 90, h2h: { v: 1, d: 1, e: 0 }, esArchirrival: true, hitos: [] }];
    const legado = calcularLegado(p);
    expect(legado.archirrival).not.toBeNull();
    expect(legado.archirrival.h2h).toBe('1-1');
  });

  it('sin rivalidades el archirrival es null', () => {
    expect(calcularLegado(partida()).archirrival).toBeNull();
  });

  it('cuenta las lesiones graves del historial medico', () => {
    const p = partida();
    p.jugador.lesionesSufridas = [{ severidad: 3 }, { severidad: 1 }, { severidad: 3 }];
    expect(calcularLegado(p).lesionesGraves).toBe(2);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/core/legacy.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/core/legacy.js`**

```js
import { recordTexto, mediaDe } from './fighter.js';
import { h2hTexto } from './rivalry.js';
import { LUJOS } from './money.js';
import { clamp } from './stats.js';

const ESCALA = [
  [85, 'Leyenda'],
  [65, 'Grande'],
  [45, 'Respetado'],
  [25, 'Un nombre más'],
  [0, 'Olvidable'],
];

function etiquetaDe(puntaje) {
  for (const [umbral, etiqueta] of ESCALA) if (puntaje >= umbral) return etiqueta;
  return 'Olvidable';
}

function puntajeDeportivo(jugador) {
  const { v, d } = jugador.record;
  const peleas = v + d + jugador.record.e;
  const ratio = peleas === 0 ? 0 : v / peleas;
  return clamp(
    Math.round(v * 1.2 + jugador.titulos.length * 18 + jugador.defensas * 4 + ratio * 20),
    0, 100,
  );
}

function puntajeEconomico(jugador) {
  const porLujos = (jugador.lujos ?? []).reduce(
    (acc, id) => acc + (LUJOS.find((l) => l.id === id)?.legado ?? 0), 0,
  );
  return clamp(Math.round(Math.log10(Math.max(1, jugador.dinero)) * 12 + porLujos * 4), 0, 100);
}

function puntajeMediatico(jugador) {
  return clamp(Math.round(jugador.fama * 0.85 + jugador.titulos.length * 5), 0, 100);
}

function puntajeEtico(jugador) {
  const disciplina = jugador.especiales?.disciplinaPersonal ?? 40;
  return clamp(Math.round(disciplina * 0.9 + (jugador.estado?.moral ?? 50) * 0.2), 0, 100);
}

function puntajeNacional(jugador, deportivo, mediatico) {
  const bonusLocal = jugador.nacionalidad === 'AR' ? 10 : 0;
  return clamp(Math.round(deportivo * 0.5 + mediatico * 0.4 + bonusLocal), 0, 100);
}

function momentosDe(jugador) {
  const momentos = [];
  for (const pelea of jugador.historial ?? []) {
    if (pelea.esTitulo && pelea.resultado === 'v') {
      momentos.push(`Le ganó a ${pelea.rivalNombre} y se quedó con el ${pelea.enJuego}.`);
    } else if (pelea.metodo === 'ko' && pelea.round === 1 && pelea.resultado === 'v') {
      momentos.push(`Durmió a ${pelea.rivalNombre} en el primer round.`);
    } else if (pelea.esTitulo && pelea.resultado === 'd') {
      momentos.push(`Perdió el ${pelea.enJuego} contra ${pelea.rivalNombre}.`);
    }
  }
  if (momentos.length === 0 && (jugador.historial ?? []).length > 0) {
    const primera = jugador.historial[0];
    momentos.push(`Su debut fue contra ${primera.rivalNombre}.`);
  }
  return momentos.slice(0, 6);
}

function biografiaDe(jugador, legados, archirrival) {
  const { v, d, e } = jugador.record;
  const peleas = v + d + e;
  const deportivo = legados.find((l) => l.id === 'deportivo').puntaje;

  const apertura = `${jugador.nombre}, "${jugador.apodo}", cerró su carrera con ${v} victorias y ${d} derrotas en ${peleas} peleas.`;
  const medio = jugador.titulos.length > 0
    ? ` Se colgó ${jugador.titulos.length === 1 ? 'un cinturón' : `${jugador.titulos.length} cinturones`} y defendió ${jugador.defensas} ${jugador.defensas === 1 ? 'vez' : 'veces'}.`
    : ' Nunca llegó a colgarse un cinturón, aunque estuvo cerca más de una vez.';
  const rival = archirrival
    ? ` Su historia quedó atada a ${archirrival.nombre}: ${archirrival.h2h} en los cara a cara.`
    : ' Nunca encontró un rival que lo marcara de por vida.';
  const cierre = deportivo >= 65
    ? ' En el gimnasio del barrio todavía cuelga su foto.'
    : deportivo >= 35
      ? ' Los que lo vieron pelear se acuerdan. Los demás, no tanto.'
      : ' Fue uno de los miles que lo intentaron. Y eso ya es algo.';

  return apertura + medio + rival + cierre;
}

export function calcularLegado(partida) {
  const { jugador } = partida;
  const deportivo = puntajeDeportivo(jugador);
  const economico = puntajeEconomico(jugador);
  const mediatico = puntajeMediatico(jugador);
  const etico = puntajeEtico(jugador);
  const nacional = puntajeNacional(jugador, deportivo, mediatico);

  const legados = [
    { id: 'deportivo', nombre: 'Legado deportivo', puntaje: deportivo, texto: 'Lo que hiciste arriba del ring.' },
    { id: 'nacional', nombre: 'Legado nacional', puntaje: nacional, texto: 'Lo que significaste para tu país.' },
    { id: 'economico', nombre: 'Legado económico', puntaje: economico, texto: 'Lo que construiste con la plata.' },
    { id: 'mediatico', nombre: 'Legado mediático', puntaje: mediatico, texto: 'Cuánto se habló de vos.' },
    { id: 'etico', nombre: 'Legado ético', puntaje: etico, texto: 'Cómo hiciste las cosas.' },
  ].map((l) => ({ ...l, etiqueta: etiquetaDe(l.puntaje) }));

  const rivalidad = (partida.rivalidades ?? []).find((r) => r.esArchirrival);
  const datosRival = rivalidad
    ? partida.mundo.roster.find((p) => p.id === rivalidad.rivalId)
    : null;
  const archirrival = rivalidad && datosRival
    ? { nombre: datosRival.nombre, apodo: datosRival.apodo, h2h: h2hTexto(rivalidad) }
    : null;

  const { v, d, e } = jugador.record;

  return {
    record: recordTexto(jugador),
    peleas: v + d + e,
    titulos: [...jugador.titulos],
    defensas: jugador.defensas,
    dineroTotal: jugador.dinero,
    lesionesGraves: (jugador.lesionesSufridas ?? []).filter((l) => l.severidad === 3).length,
    mediaFinal: mediaDe(jugador),
    archirrival,
    momentos: momentosDe(jugador),
    biografia: biografiaDe(jugador, legados, archirrival),
    legados,
  };
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/core/legacy.test.js`
Expected: PASS (14 tests).

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: PASS — el núcleo completo está verde.

- [ ] **Step 6: Commit**

```bash
git add src/core/legacy.js tests/core/legacy.test.js
git commit -m "feat: calculo de legado y biografia generada"
```

---

## Task 20: Tema visual, helpers de DOM e íconos

**Files:**
- Modify: `src/ui/theme.css` (reemplaza el placeholder de la Task 1)
- Create: `src/ui/dom.js`
- Create: `src/ui/icons.js`
- Test: `tests/ui/dom.test.js`

**Interfaces:**
- Produces (`dom.js`):
  - `el(tag, props?, hijos?): HTMLElement` — `props` acepta `class`, `text`, `html`, `dataset`, `onClick` y atributos sueltos; `hijos` puede ser nodo, string, array o `null`.
  - `clear(nodo): void`
  - `mount(contenedor, ...nodos): HTMLElement`
  - `fmtDinero(n: number): string` — `'US$ 66K'`, `'US$ 1,2M'`, `'US$ 940'`.
  - `fmtDelta(n: number): string` — `'+3'` / `'-2'`.
- Produces (`icons.js`): `icono(nombre, {tamano?, color?}): SVGElement` para `tienda`, `flecha`, `guante`, `pesa`, `corazon`, `microfono`, `trofeo`, `alerta`, `check`, `cruz`. Sin emojis.

- [ ] **Step 1: Escribir `tests/ui/dom.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { el, clear, mount, fmtDinero, fmtDelta } from '../../src/ui/dom.js';
import { icono } from '../../src/ui/icons.js';

describe('el', () => {
  it('crea un elemento con clase y texto', () => {
    const nodo = el('div', { class: 'tile', text: 'Hola' });
    expect(nodo.tagName).toBe('DIV');
    expect(nodo.className).toBe('tile');
    expect(nodo.textContent).toBe('Hola');
  });

  it('acepta hijos sueltos y en array', () => {
    const nodo = el('div', {}, [el('span', { text: 'a' }), 'b', null]);
    expect(nodo.children).toHaveLength(1);
    expect(nodo.textContent).toBe('ab');
  });

  it('setea dataset y atributos', () => {
    const nodo = el('button', { dataset: { id: 'x' }, 'aria-label': 'Cerrar' });
    expect(nodo.dataset.id).toBe('x');
    expect(nodo.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('conecta onClick', () => {
    let clicks = 0;
    const nodo = el('button', { onClick: () => { clicks += 1; } });
    nodo.click();
    expect(clicks).toBe(1);
  });
});

describe('clear y mount', () => {
  it('clear vacia el nodo', () => {
    const nodo = el('div', {}, [el('span'), el('span')]);
    clear(nodo);
    expect(nodo.children).toHaveLength(0);
  });

  it('mount limpia y agrega', () => {
    const cont = el('div', {}, [el('span')]);
    mount(cont, el('p'), el('p'));
    expect(cont.children).toHaveLength(2);
  });
});

describe('fmtDinero', () => {
  it('formatea miles y millones', () => {
    expect(fmtDinero(940)).toBe('US$ 940');
    expect(fmtDinero(66000)).toBe('US$ 66K');
    expect(fmtDinero(1200000)).toBe('US$ 1,2M');
  });

  it('cero se muestra completo', () => {
    expect(fmtDinero(0)).toBe('US$ 0');
  });
});

describe('fmtDelta', () => {
  it('agrega el signo', () => {
    expect(fmtDelta(3)).toBe('+3');
    expect(fmtDelta(-2)).toBe('-2');
    expect(fmtDelta(0)).toBe('0');
  });
});

describe('icono', () => {
  it('devuelve un svg sin emojis', () => {
    const svg = icono('trofeo');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.outerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('respeta tamano y color', () => {
    const svg = icono('guante', { tamano: 24, color: '#ef4444' });
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('stroke')).toBe('#ef4444');
  });

  it('tira error con un nombre desconocido', () => {
    expect(() => icono('inventado')).toThrow(/inventado/);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/ui/dom.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 3: Escribir `src/ui/theme.css`**

```css
:root {
  --fondo: #0d0708;
  --superficie: #140b0c;
  --superficie-alta: #160c0d;
  --borde: #241416;
  --borde-fuerte: #3a1e20;
  --rojo: #ef4444;
  --dorado: #f2c14e;
  --verde: #8fd694;
  --texto: #f1e2e2;
  --texto-medio: #b08a8a;
  --texto-sutil: #8a6a6a;
  --radio: 10px;
  --ancho: 430px;
  --fuente: 'Bahnschrift', 'Segoe UI', system-ui, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font-family: var(--fuente);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

#app {
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 16px 14px 48px;
}

h1, h2, h3, .etiqueta {
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
}

h1 { font-size: 22px; font-weight: 800; }
h2 { font-size: 17px; font-weight: 800; }

.etiqueta {
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--texto-sutil);
}

.panel {
  background: var(--superficie-alta);
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 13px 14px;
}

.tile {
  background: var(--superficie);
  border-radius: 8px;
  padding: 8px 4px;
  text-align: center;
}

.tile .valor { font-size: 16px; font-weight: 800; }
.tile .nombre { font-size: 7.5px; letter-spacing: 1px; color: var(--texto-sutil); }

.fila { display: flex; gap: 6px; }
.fila > * { flex: 1; }
.stack > * + * { margin-top: 8px; }

.media-num {
  font-size: 52px;
  font-weight: 800;
  color: var(--rojo);
  line-height: 0.9;
  letter-spacing: -2px;
}

.delta-sube { color: var(--verde); font-size: 10px; }
.delta-baja { color: var(--rojo); font-size: 10px; }
.dorado { color: var(--dorado); }
.verde { color: var(--verde); }
.rojo { color: var(--rojo); }
.sutil { color: var(--texto-sutil); }
.medio { color: var(--texto-medio); }

.boton {
  display: block;
  width: 100%;
  background: var(--rojo);
  color: #1a0505;
  border: none;
  border-radius: 9px;
  padding: 13px;
  font-family: var(--fuente);
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
}

.boton.secundario { background: #241012; color: var(--texto); }
.boton.verde-cta { background: var(--verde); color: #0c1a0e; }
.boton:disabled { opacity: 0.45; cursor: not-allowed; }

.carta {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 9px;
  padding: 11px 12px;
  color: var(--texto);
  font-family: var(--fuente);
  font-size: 14px;
  cursor: pointer;
}

.carta:hover, .carta:focus-visible { border-color: var(--borde-fuerte); }
.carta .titulo { font-weight: 800; letter-spacing: 0.5px; }
.carta .desc { font-size: 12px; color: var(--texto-medio); margin-top: 3px; }
.carta .mods { font-size: 11px; color: var(--verde); margin-top: 6px; }

.barra { height: 8px; background: #241012; border-radius: 4px; overflow: hidden; }
.barra > i { display: block; height: 100%; background: var(--rojo); }
.barra.dorada > i { background: linear-gradient(90deg, var(--dorado), var(--rojo)); }
.barra.verde-barra > i { background: var(--verde); }

.chip {
  display: inline-block;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: #241012;
  color: var(--texto-medio);
  padding: 3px 8px;
  border-radius: 20px;
}

.log { font-size: 13px; line-height: 1.6; }
.log > p { margin: 0 0 6px; }
.log > p.destacado { color: var(--dorado); font-weight: 700; }

.grilla-paos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  justify-items: center;
}

.pao {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--superficie-alta);
  border: 2px solid var(--borde);
  cursor: pointer;
}

.pao.activo {
  background: radial-gradient(circle, var(--dorado), var(--rojo));
  border-color: #ffd76b;
  box-shadow: 0 0 24px rgba(242, 193, 78, 0.55);
}

@media (min-width: 720px) {
  #app { max-width: 560px; }
}
```

- [ ] **Step 4: Implementar `src/ui/dom.js`**

```js
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
```

- [ ] **Step 5: Implementar `src/ui/icons.js`**

```js
const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  tienda: ['M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6'],
  flecha: ['M9 18l6-6-6-6'],
  guante: ['M7 11V7a2 2 0 0 1 4 0v4', 'M11 11V6a2 2 0 0 1 4 0v5', 'M15 11V8a2 2 0 0 1 4 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-3a2 2 0 0 1 4 0'],
  pesa: ['M6 7v10', 'M18 7v10', 'M3 9v6', 'M21 9v6', 'M6 12h12'],
  corazon: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z'],
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
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/ui/dom.test.js`
Expected: PASS (11 tests).

- [ ] **Step 7: Commit**

```bash
git add src/ui/theme.css src/ui/dom.js src/ui/icons.js tests/ui/dom.test.js
git commit -m "feat: tema Sangre y gloria, helpers de DOM e iconos SVG"
```

---

## Task 21: Pantallas de creación y dashboard

**Files:**
- Create: `src/ui/screens/create.js`
- Create: `src/ui/screens/dashboard.js`
- Test: `tests/ui/create.test.js`
- Test: `tests/ui/dashboard.test.js`

**Interfaces:**
- Consumes: `el`, `mount`, `fmtDinero`, `fmtDelta`, `icono`; `CATEGORIAS`, `ORIGENES`, `crearPeleador`, `peleadorAleatorio`, `mediaDe`, `recordTexto`; `estilosDisponibles`; `DISCIPLINAS`; `ETIQUETAS`, `etiquetaEstado`; `NACIONALIDADES`, `APODOS`, `GIMNASIOS`; `createRng`.
- Produces:
  - `renderCreacion(contenedor, {onComenzar}): void` — formulario + botón "Sorprendeme"; `onComenzar(peleador)` recibe el peleador ya construido.
  - `renderDashboard(contenedor, {partida, onSiguiente, onTienda, onFicha}): void`

- [ ] **Step 1: Escribir `tests/ui/create.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderCreacion } from '../../src/ui/screens/create.js';
import { mediaDe } from '../../src/core/fighter.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderCreacion', () => {
  it('muestra los campos principales', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    expect(cont.querySelector('[data-campo="nombre"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="disciplina"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="categoria"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="estilo"]')).toBeTruthy();
    expect(cont.querySelector('[data-campo="origen"]')).toBeTruthy();
  });

  it('no usa emojis', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    expect(cont.innerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('los estilos cambian con la disciplina', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const disciplina = cont.querySelector('[data-campo="disciplina"]');
    const estilo = cont.querySelector('[data-campo="estilo"]');

    disciplina.value = 'boxeo';
    disciplina.dispatchEvent(new Event('change'));
    const boxeo = [...estilo.options].map((o) => o.value);
    expect(boxeo).not.toContain('grappler');

    disciplina.value = 'mma';
    disciplina.dispatchEvent(new Event('change'));
    const mma = [...estilo.options].map((o) => o.value);
    expect(mma).toContain('grappler');
  });

  it('el boton sorprendeme completa el formulario', () => {
    renderCreacion(cont, { onComenzar: () => {} });
    const nombre = cont.querySelector('[data-campo="nombre"]');
    nombre.value = '';
    cont.querySelector('[data-accion="aleatorio"]').click();
    expect(nombre.value.length).toBeGreaterThan(0);
  });

  it('comenzar entrega un peleador valido', () => {
    let recibido = null;
    renderCreacion(cont, { onComenzar: (p) => { recibido = p; } });
    cont.querySelector('[data-campo="nombre"]').value = 'Lucas Ortiz';
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(recibido).toBeTruthy();
    expect(recibido.nombre).toBe('Lucas Ortiz');
    expect(recibido.esJugador).toBe(true);
    expect(recibido.edad).toBe(15);
    expect(mediaDe(recibido)).toBeGreaterThan(0);
  });

  it('no deja comenzar sin nombre', () => {
    let llamado = false;
    renderCreacion(cont, { onComenzar: () => { llamado = true; } });
    cont.querySelector('[data-campo="nombre"]').value = '   ';
    cont.querySelector('[data-accion="comenzar"]').click();
    expect(llamado).toBe(false);
    expect(cont.querySelector('[data-error]').textContent.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Escribir `tests/ui/dashboard.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { renderDashboard } from '../../src/ui/screens/dashboard.js';

function partida() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  });
  jugador.record = { v: 9, d: 3, e: 0, ko: 7, sub: 0, dec: 2 };
  jugador.dinero = 66000;
  jugador.fama = 11;
  return crearPartida({ jugador, semilla: 1 });
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderDashboard', () => {
  it('muestra MEDIA, apodo y record', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.querySelector('[data-media]').textContent).toMatch(/\d+/);
    expect(cont.textContent).toContain('EL RELÁMPAGO');
    expect(cont.querySelector('[data-record]').textContent).toBe('9-3');
  });

  it('muestra los seis atributos compactos', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.querySelectorAll('[data-atributo]')).toHaveLength(6);
  });

  it('en mma muestra grappling', () => {
    const jugador = crearPeleador({
      nombre: 'X', apodo: 'X', nacionalidad: 'AR', disciplina: 'mma',
      estilo: 'grappler', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    });
    renderDashboard(cont, { partida: crearPartida({ jugador, semilla: 1 }), onSiguiente: () => {} });
    const nombres = [...cont.querySelectorAll('[data-atributo]')].map((n) => n.dataset.atributo);
    expect(nombres).toContain('grappling');
  });

  it('formatea el dinero', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent).toContain('US$ 66K');
  });

  it('el historial es clickeable', () => {
    let abierto = false;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {}, onFicha: () => { abierto = true; } });
    cont.querySelector('[data-accion="historial"]').click();
    expect(abierto).toBe(true);
  });

  it('la cabecera del peleador abre la ficha', () => {
    let abierto = false;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {}, onFicha: () => { abierto = true; } });
    cont.querySelector('[data-accion="ficha"]').click();
    expect(abierto).toBe(true);
  });

  it('el boton principal dispara onSiguiente', () => {
    let siguiente = 0;
    renderDashboard(cont, { partida: partida(), onSiguiente: () => { siguiente += 1; } });
    cont.querySelector('[data-accion="siguiente"]').click();
    expect(siguiente).toBe(1);
  });

  it('muestra la etapa actual', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.textContent.toUpperCase()).toContain('JUVENIL');
  });

  it('no usa emojis', () => {
    renderDashboard(cont, { partida: partida(), onSiguiente: () => {} });
    expect(cont.innerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/ui/create.test.js tests/ui/dashboard.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 4: Implementar `src/ui/screens/create.js`**

```js
import { el, mount } from '../dom.js';
import { CATEGORIAS, ORIGENES, crearPeleador, peleadorAleatorio } from '../../core/fighter.js';
import { estilosDisponibles } from '../../core/styles.js';
import { DISCIPLINAS } from '../../core/disciplines.js';
import { NACIONALIDADES } from '../../content/names.js';
import { createRng } from '../../core/rng.js';

function opciones(select, items, valorActual) {
  select.innerHTML = '';
  for (const item of items) {
    const opt = el('option', { value: item.valor, text: item.texto });
    select.appendChild(opt);
  }
  if (valorActual && items.some((i) => i.valor === valorActual)) select.value = valorActual;
}

function campo(etiqueta, control) {
  return el('label', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: etiqueta }),
    control,
  ]);
}

export function renderCreacion(contenedor, { onComenzar }) {
  const nombre = el('input', { 'data-campo': 'nombre', class: 'carta', placeholder: 'Nombre y apellido' });
  const apodo = el('input', { 'data-campo': 'apodo', class: 'carta', placeholder: 'Apodo' });
  const nacionalidad = el('select', { 'data-campo': 'nacionalidad', class: 'carta' });
  const disciplina = el('select', { 'data-campo': 'disciplina', class: 'carta' });
  const categoria = el('select', { 'data-campo': 'categoria', class: 'carta' });
  const estilo = el('select', { 'data-campo': 'estilo', class: 'carta' });
  const origen = el('select', { 'data-campo': 'origen', class: 'carta' });
  const mano = el('select', { 'data-campo': 'mano', class: 'carta' });
  const error = el('div', { 'data-error': '', class: 'rojo', text: '' });

  opciones(nacionalidad, NACIONALIDADES.map((n) => ({ valor: n.codigo, texto: n.nombre })));
  opciones(disciplina, Object.values(DISCIPLINAS).map((d) => ({ valor: d.id, texto: d.nombre })));
  opciones(categoria, Object.values(CATEGORIAS).map((c) => ({ valor: c.id, texto: c.nombre })));
  opciones(origen, ORIGENES.map((o) => ({ valor: o.id, texto: `${o.nombre} — ${o.descripcion}` })));
  opciones(mano, [{ valor: 'derecha', texto: 'Derecha' }, { valor: 'zurda', texto: 'Zurda' }]);

  function refrescarEstilos() {
    const disponibles = estilosDisponibles(disciplina.value).map((e) => ({ valor: e.id, texto: `${e.nombre} — ${e.descripcion}` }));
    opciones(estilo, disponibles, estilo.value);
  }
  disciplina.addEventListener('change', refrescarEstilos);
  refrescarEstilos();

  function aleatorio() {
    const rng = createRng(Date.now());
    const sugerido = peleadorAleatorio(rng, { edad: 15 });
    nombre.value = sugerido.nombre;
    apodo.value = sugerido.apodo;
    nacionalidad.value = sugerido.nacionalidad;
    disciplina.value = sugerido.disciplina;
    refrescarEstilos();
    estilo.value = sugerido.estilo;
    categoria.value = sugerido.categoria;
    origen.value = sugerido.origen;
    mano.value = sugerido.mano;
    error.textContent = '';
  }

  function comenzar() {
    if (!nombre.value.trim()) {
      error.textContent = 'Poné un nombre para empezar.';
      return;
    }
    const peleador = crearPeleador({
      nombre: nombre.value.trim(),
      apodo: apodo.value.trim() || 'Sin apodo',
      nacionalidad: nacionalidad.value,
      disciplina: disciplina.value,
      estilo: estilo.value,
      categoria: categoria.value,
      origen: origen.value,
      mano: mano.value,
      esJugador: true,
      media: 38,
    });
    onComenzar(peleador);
  }

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Nueva carrera' }),
    el('h1', { text: 'Creá tu peleador' }),
    el('p', { class: 'medio', text: 'Tenés 15 años y todo por delante. Elegí de dónde venís.' }),
    campo('Nombre', nombre),
    campo('Apodo', apodo),
    campo('Nacionalidad', nacionalidad),
    campo('Disciplina', disciplina),
    campo('Categoría', categoria),
    campo('Estilo de pelea', estilo),
    campo('Origen', origen),
    campo('Mano hábil', mano),
    error,
    el('button', { class: 'boton secundario', 'data-accion': 'aleatorio', text: 'Sorprendeme', onClick: aleatorio }),
    el('button', { class: 'boton', 'data-accion': 'comenzar', text: 'Empezar la carrera', onClick: comenzar }),
  ]));
}
```

- [ ] **Step 5: Implementar `src/ui/screens/dashboard.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';
import { icono } from '../icons.js';
import { mediaDe, recordTexto } from '../../core/fighter.js';
import { getDisciplina } from '../../core/disciplines.js';
import { ETIQUETAS, etiquetaEstado } from '../../core/stats.js';
import { etapaActual } from '../../core/career.js';
import { h2hTexto } from '../../core/rivalry.js';

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
        el('h1', { text: `"${jugador.apodo}" ${jugador.nombre}`.toUpperCase() }),
        el('div', { class: 'etiqueta', text: `${jugador.categoria} · ${jugador.mano} · ${disciplina.nombre}` }),
      ]),
      el('div', { class: 'etiqueta', text: 'Ficha' }),
    ]),
    el('div', { class: 'etiqueta', style: 'margin-top:8px' , text:
      `${jugador.gimnasio} · ${partida.mundo.anio} · ${Math.floor(jugador.edad)} años · forma: ${etiquetaEstado('forma', jugador.estado.forma)}` }),
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
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/ui/create.test.js tests/ui/dashboard.test.js`
Expected: PASS (15 tests).

- [ ] **Step 7: Commit**

```bash
git add src/ui/screens/create.js src/ui/screens/dashboard.js tests/ui/create.test.js tests/ui/dashboard.test.js
git commit -m "feat: pantallas de creacion de peleador y dashboard"
```

---

## Task 22: Pantallas de tarjetas, tienda y minijuegos de preparación

**Files:**
- Create: `src/ui/screens/card.js`
- Create: `src/ui/screens/shop.js`
- Create: `src/ui/screens/presser.js`
- Create: `src/ui/screens/sparring.js`
- Create: `src/ui/screens/negotiation.js`
- Test: `tests/ui/card.test.js`
- Test: `tests/ui/minijuegos.test.js`

**Interfaces:**
- Consumes: `el`, `mount`, `fmtDinero`; `icono`; `formatearMods`; `catalogo`, `comprar`; `TONOS`, `responderCareo`; `registrarGolpe`, `resultadoSparring`; `MOVIDAS`, `jugarMovida`, `riesgoDe`, `resultadoNegociacion`.
- Produces:
  - `renderTarjeta(contenedor, {titulo, bajada, texto, opciones, onElegir, pie?}): void` — `opciones` = `Array<{id, titulo, desc?, mods?: string[], nota?}>`. Pantalla genérica usada por mejora, evento y redes.
  - `renderResultadoTarjeta(contenedor, {titulo, texto, deltas: string[], onContinuar}): void`
  - `renderTienda(contenedor, {jugador, onComprar, onCerrar}): void`
  - `renderCareo(contenedor, {careo, onResponder, onTerminar}): void`
  - `renderSparring(contenedor, {sparring, jugador, onGolpe, onTerminar}): void` — arranca con botón **Empezar**; sin él, no se prende ningún pao.
  - `renderNegociacion(contenedor, {negociacion, oferta, onMovida, onCerrar}): void`

- [ ] **Step 1: Escribir `tests/ui/card.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderTarjeta, renderResultadoTarjeta } from '../../src/ui/screens/card.js';

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

const opciones = [
  { id: 'a', titulo: 'Pelota parada', desc: 'Tiros libres sin apuro.', mods: ['+3 Técnica'] },
  { id: 'b', titulo: 'Piernas nuevas', desc: 'Doble turno.', mods: ['+3 Velocidad'] },
  { id: 'c', titulo: 'Referente', desc: 'Primero en llegar.', mods: ['+3 IQ de pelea'] },
];

describe('renderTarjeta', () => {
  it('muestra titulo, texto y todas las opciones', () => {
    renderTarjeta(cont, { titulo: 'Pretemporada', bajada: 'Elegí una.', texto: 'El campamento rindió.', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('Pretemporada');
    expect(cont.textContent).toContain('El campamento rindió.');
    expect(cont.querySelectorAll('[data-opcion]')).toHaveLength(3);
  });

  it('muestra los modificadores de cada opcion', () => {
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones, onElegir: () => {} });
    expect(cont.textContent).toContain('+3 Técnica');
  });

  it('devuelve el id de la opcion elegida', () => {
    let elegido = null;
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones, onElegir: (id) => { elegido = id; } });
    cont.querySelector('[data-opcion="b"]').click();
    expect(elegido).toBe('b');
  });

  it('funciona con dos opciones', () => {
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones: opciones.slice(0, 2), onElegir: () => {} });
    expect(cont.querySelectorAll('[data-opcion]')).toHaveLength(2);
  });

  it('no usa emojis', () => {
    renderTarjeta(cont, { titulo: 'T', texto: 't', opciones, onElegir: () => {} });
    expect(cont.innerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('renderResultadoTarjeta', () => {
  it('muestra el resultado y los deltas', () => {
    renderResultadoTarjeta(cont, { titulo: 'Resultado', texto: 'Salió bien.', deltas: ['+3 Cardio'], onContinuar: () => {} });
    expect(cont.textContent).toContain('Salió bien.');
    expect(cont.textContent).toContain('+3 Cardio');
  });

  it('continuar dispara el callback', () => {
    let sigue = false;
    renderResultadoTarjeta(cont, { titulo: 'R', texto: 't', deltas: [], onContinuar: () => { sigue = true; } });
    cont.querySelector('[data-accion="continuar"]').click();
    expect(sigue).toBe(true);
  });
});
```

- [ ] **Step 2: Escribir `tests/ui/minijuegos.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearSparring } from '../../src/core/sparring.js';
import { crearCareo } from '../../src/core/presser.js';
import { crearNegociacion } from '../../src/core/negotiation.js';
import { renderTienda } from '../../src/ui/screens/shop.js';
import { renderCareo } from '../../src/ui/screens/presser.js';
import { renderSparring } from '../../src/ui/screens/sparring.js';
import { renderNegociacion } from '../../src/ui/screens/negotiation.js';

const jugador = (extra = {}) => ({
  ...crearPeleador({
    nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
  }),
  ...extra,
});

const oferta = {
  id: 'of_1', rivalId: 'riv_1', rivalApodo: 'El Ciclón', rivalNombre: 'Dyke Tyzon',
  rivalPersonalidad: 'agresivo', esTitulo: true, bolsa: 8000, enJuego: 'Título regional',
};

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderTienda', () => {
  it('lista staff y lujos', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 200000 }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.querySelectorAll('[data-item]').length).toBeGreaterThanOrEqual(10);
    expect(cont.textContent).toContain('Entrenador de elite');
  });

  it('muestra la plata disponible', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 1200000 }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toContain('US$ 1,2M');
  });

  it('deshabilita lo que no se puede pagar', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 0 }), onComprar: () => {}, onCerrar: () => {} });
    const caros = [...cont.querySelectorAll('[data-item]')].filter((b) => b.disabled);
    expect(caros.length).toBeGreaterThan(0);
  });

  it('marca lo ya comprado', () => {
    renderTienda(cont, { jugador: jugador({ dinero: 999999, staff: ['entrenador'] }), onComprar: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-item="entrenador"]').textContent).toMatch(/equipo/i);
  });

  it('comprar devuelve el id', () => {
    let comprado = null;
    renderTienda(cont, { jugador: jugador({ dinero: 999999 }), onComprar: (id) => { comprado = id; }, onCerrar: () => {} });
    cont.querySelector('[data-item="kinesiologo"]').click();
    expect(comprado).toBe('kinesiologo');
  });

  it('cerrar dispara el callback', () => {
    let cerrado = false;
    renderTienda(cont, { jugador: jugador(), onComprar: () => {}, onCerrar: () => { cerrado = true; } });
    cont.querySelector('[data-accion="cerrar"]').click();
    expect(cerrado).toBe(true);
  });
});

describe('renderCareo', () => {
  const careo = () => crearCareo(createRng(1), { oferta });

  it('muestra hype, tell y cuatro respuestas', () => {
    renderCareo(cont, { careo: careo(), onResponder: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-hype]')).toBeTruthy();
    expect(cont.textContent).toContain('El Ciclón');
    expect(cont.querySelectorAll('[data-tono]')).toHaveLength(4);
  });

  it('muestra la ronda actual', () => {
    renderCareo(cont, { careo: careo(), onResponder: () => {}, onTerminar: () => {} });
    expect(cont.textContent).toMatch(/1\s*(de|\/)\s*3/i);
  });

  it('elegir un tono lo reporta', () => {
    let tono = null;
    renderCareo(cont, { careo: careo(), onResponder: (t) => { tono = t; }, onTerminar: () => {} });
    cont.querySelector('[data-tono="frio"]').click();
    expect(tono).toBe('frio');
  });

  it('al terminar muestra el boton de cierre', () => {
    const terminado = { ...careo(), terminado: true };
    renderCareo(cont, { careo: terminado, onResponder: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });
});

describe('renderSparring', () => {
  const sparring = () => crearSparring(createRng(1), { jugador: jugador() });

  it('arranca con boton Empezar y sin paos activos', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="empezar"]')).toBeTruthy();
    expect(cont.querySelector('.pao.activo')).toBeNull();
  });

  it('al empezar se prende un pao', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    expect(cont.querySelector('.pao.activo')).toBeTruthy();
  });

  it('pegarle al pao activo reporta acierto', () => {
    let evento = null;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    cont.querySelector('.pao.activo').click();
    expect(evento.acerto).toBe(true);
    expect(typeof evento.ms).toBe('number');
  });

  it('pegarle a un pao apagado reporta error', () => {
    let evento = null;
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: (e) => { evento = e; }, onTerminar: () => {} });
    cont.querySelector('[data-accion="empezar"]').click();
    const apagado = [...cont.querySelectorAll('.pao')].find((p) => !p.classList.contains('activo'));
    apagado.click();
    expect(evento.acerto).toBe(false);
  });

  it('muestra la grilla de seis paos', () => {
    renderSparring(cont, { sparring: sparring(), jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelectorAll('.pao')).toHaveLength(6);
  });

  it('al terminar ofrece continuar', () => {
    const listo = { ...sparring(), terminado: true, aciertos: 8, indice: 10 };
    renderSparring(cont, { sparring: listo, jugador: jugador(), onGolpe: () => {}, onTerminar: () => {} });
    expect(cont.querySelector('[data-accion="terminar"]')).toBeTruthy();
  });
});

describe('renderNegociacion', () => {
  const negociacion = () => crearNegociacion(oferta);

  it('muestra la bolsa y las cuatro movidas', () => {
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toContain('US$ 8K');
    expect(cont.querySelectorAll('[data-movida]')).toHaveLength(4);
  });

  it('muestra el riesgo de cada movida arriesgada', () => {
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-movida="apretar"]').textContent).toMatch(/\d+%/);
  });

  it('elegir una movida la reporta', () => {
    let movida = null;
    renderNegociacion(cont, { negociacion: negociacion(), oferta, onMovida: (m) => { movida = m; }, onCerrar: () => {} });
    cont.querySelector('[data-movida="masPlata"]').click();
    expect(movida).toBe('masPlata');
  });

  it('al cerrarse muestra el resultado y el boton de seguir', () => {
    const cerrada = { ...negociacion(), cerrada: true };
    renderNegociacion(cont, { negociacion: cerrada, oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.querySelector('[data-accion="seguir"]')).toBeTruthy();
  });

  it('al perderla lo avisa', () => {
    const perdida = { ...negociacion(), perdida: true };
    renderNegociacion(cont, { negociacion: perdida, oferta, onMovida: () => {}, onCerrar: () => {} });
    expect(cont.textContent).toMatch(/levant|perdi/i);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/ui/card.test.js tests/ui/minijuegos.test.js`
Expected: FAIL — no se pueden resolver los módulos.

- [ ] **Step 4: Implementar `src/ui/screens/card.js`**

```js
import { el, mount } from '../dom.js';

export function renderTarjeta(contenedor, { titulo, bajada = '', texto, opciones, onElegir, pie = null }) {
  const botones = opciones.map((opcion) => el('button', {
    class: 'carta', 'data-opcion': opcion.id, onClick: () => onElegir(opcion.id),
  }, [
    opcion.etiqueta ? el('div', { class: 'etiqueta', text: opcion.etiqueta }) : null,
    el('div', { class: 'titulo', text: opcion.titulo }),
    opcion.desc ? el('div', { class: 'desc', text: opcion.desc }) : null,
    opcion.mods && opcion.mods.length > 0
      ? el('div', { class: 'mods', text: opcion.mods.join(' · ') })
      : null,
    opcion.nota ? el('div', { class: 'etiqueta', text: opcion.nota }) : null,
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    bajada ? el('h1', { text: bajada }) : null,
    el('p', { class: 'medio', text: texto }),
    ...botones,
    pie ? el('div', { class: 'etiqueta', text: pie }) : null,
  ]));
}

export function renderResultadoTarjeta(contenedor, { titulo, texto, deltas = [], onContinuar }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: titulo }),
    el('div', { class: 'panel' }, [
      el('p', { text: texto }),
      deltas.length > 0 ? el('div', { class: 'mods', text: deltas.join(' · ') }) : null,
    ]),
    el('button', { class: 'boton', 'data-accion': 'continuar', text: 'Continuar', onClick: onContinuar }),
  ]));
}
```

- [ ] **Step 5: Implementar `src/ui/screens/shop.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';
import { catalogo } from '../../core/money.js';

function itemBoton(item, onComprar) {
  return el('button', {
    class: 'carta', 'data-item': item.id, disabled: item.comprado || !item.alcanza ? '' : null,
    onClick: () => { if (!item.comprado && item.alcanza) onComprar(item.id); },
  }, [
    el('div', { class: 'titulo', text: item.nombre }),
    item.descripcion ? el('div', { class: 'desc', text: item.descripcion }) : null,
    el('div', {
      class: item.comprado ? 'mods' : 'desc verde',
      text: item.comprado ? 'En el equipo' : fmtDinero(item.precio),
    }),
  ]);
}

export function renderTienda(contenedor, { jugador, onComprar, onCerrar }) {
  const { staff, lujos } = catalogo(jugador);
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'fila', style: 'align-items:baseline' }, [
      el('div', {}, [
        el('div', { class: 'etiqueta', text: 'Tu equipo' }),
        el('h1', { text: 'La tienda' }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'etiqueta', text: 'Disponible' }),
        el('div', { class: 'verde', style: 'font-size:20px;font-weight:800', text: fmtDinero(jugador.dinero) }),
      ]),
    ]),
    el('div', { class: 'etiqueta dorado', text: 'Staff · te mejoran el juego' }),
    ...staff.map((i) => itemBoton(i, onComprar)),
    el('div', { class: 'etiqueta dorado', text: 'Lujo · date el gusto' }),
    ...lujos.map((i) => itemBoton(i, onComprar)),
    el('button', { class: 'boton verde-cta', 'data-accion': 'cerrar', text: 'Listo, cerrar', onClick: onCerrar }),
  ]));
}
```

- [ ] **Step 6: Implementar `src/ui/screens/presser.js`**

```js
import { el, mount } from '../dom.js';
import { TONOS } from '../../core/presser.js';

export function renderCareo(contenedor, { careo, onResponder, onTerminar }) {
  const pregunta = careo.preguntas[Math.min(careo.ronda - 1, careo.preguntas.length - 1)];

  const barraHype = el('div', { class: 'barra dorada', 'data-hype': String(careo.hype) }, [
    el('i', { style: `width:${careo.hype}%` }),
  ]);

  const respuestas = careo.terminado ? [] : pregunta.respuestas.map((r) => el('button', {
    class: 'carta', 'data-tono': r.tono, onClick: () => onResponder(r.tono),
  }, [
    el('div', { class: 'etiqueta', text: TONOS[r.tono].nombre }),
    el('div', { class: 'desc', text: r.texto }),
    el('div', { class: 'etiqueta', text: TONOS[r.tono].pistaEfecto }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Careo · previa de la pelea' }),
    el('h1', { text: 'La conferencia' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Hype de la pelea — ${careo.hype}/100` }),
      barraHype,
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Ventaja mental: ${careo.ventajaMental > 0 ? 'a tu favor' : careo.ventajaMental < 0 ? 'en contra' : 'pareja'}` }),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: `Lo incomoda: ${TONOS[careo.tell.incomoda].nombre}` }),
      el('div', { class: 'medio', style: 'font-size:12px', text: careo.tell.texto }),
    ]),
    el('div', { class: 'etiqueta', text: `Ronda ${Math.min(careo.ronda, careo.rondas)} de ${careo.rondas}` }),
    careo.terminado ? null : el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: `${careo.rivalApodo}, mirándote fijo:` }),
      el('p', { style: 'font-style:italic', text: pregunta.texto }),
    ]),
    ...respuestas,
    careo.terminado
      ? el('button', { class: 'boton', 'data-accion': 'terminar', text: 'Terminar el careo', onClick: onTerminar })
      : null,
  ]));
}
```

- [ ] **Step 7: Implementar `src/ui/screens/sparring.js`**

```js
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
```

- [ ] **Step 8: Implementar `src/ui/screens/negotiation.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';
import { MOVIDAS, riesgoDe, resultadoNegociacion } from '../../core/negotiation.js';

export function renderNegociacion(contenedor, { negociacion, oferta, onMovida, onCerrar }) {
  const cerrada = negociacion.cerrada || negociacion.perdida;
  const resultado = cerrada ? resultadoNegociacion(negociacion) : null;

  const movidas = cerrada ? [] : Object.values(MOVIDAS).map((movida) => {
    const riesgo = Math.round(riesgoDe(negociacion, movida.id) * 100);
    return el('button', {
      class: 'carta', 'data-movida': movida.id, onClick: () => onMovida(movida.id),
    }, [
      el('div', { class: movida.id === 'cerrar' ? 'titulo verde' : 'titulo dorado', text: movida.nombre }),
      el('div', { class: 'desc', text: movida.texto }),
      el('div', {
        class: 'etiqueta',
        text: movida.id === 'cerrar' ? 'Seguro' : `Riesgo que se levante: ${riesgo}%`,
      }),
    ]);
  });

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Firma del contrato' }),
    el('h1', { text: 'La negociación' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Bolsa sobre la mesa' }),
      el('div', { class: 'verde', style: 'font-size:30px;font-weight:800', text: fmtDinero(negociacion.bolsa) }),
      el('div', { class: 'etiqueta', text: `Empezó en ${fmtDinero(negociacion.bolsaInicial)} · ${oferta.enJuego}` }),
      negociacion.condiciones.length > 0
        ? el('div', { class: 'mods', text: negociacion.condiciones.join(' · ') })
        : null,
    ]),
    el('div', {}, [
      el('div', { class: 'etiqueta', text: `Paciencia del promotor: ${negociacion.paciencia}/100` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${negociacion.paciencia}%` })]),
    ]),
    ...movidas,
    cerrada ? el('div', { class: 'panel' }, [
      el('p', {
        class: negociacion.perdida ? 'rojo' : 'verde',
        text: negociacion.perdida
          ? `El promotor se levantó. Firmás una peor: ${fmtDinero(resultado.bolsa)}.`
          : `Cerrado: ${fmtDinero(resultado.bolsa)}.`,
      }),
    ]) : null,
    cerrada
      ? el('button', { class: 'boton', 'data-accion': 'seguir', text: 'A entrenar', onClick: onCerrar })
      : null,
  ]));
}
```

- [ ] **Step 9: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/ui/card.test.js tests/ui/minijuegos.test.js`
Expected: PASS (28 tests).

- [ ] **Step 10: Commit**

```bash
git add src/ui/screens/card.js src/ui/screens/shop.js src/ui/screens/presser.js src/ui/screens/sparring.js src/ui/screens/negotiation.js tests/ui/card.test.js tests/ui/minijuegos.test.js
git commit -m "feat: pantallas de tarjetas, tienda, careo, sparring y negociacion"
```

---

## Task 23: Pantalla de pelea

**Files:**
- Create: `src/ui/screens/fight.js`
- Test: `tests/ui/fight.test.js`

**Interfaces:**
- Consumes: `el`, `mount`; `PLANES`; `INSTRUCCIONES_RINCON`, `ZONAS_GOLPE`, `estadoRincon`, `abrirGolpeDeGracia`; `recordTexto`.
- Produces:
  - `renderOferta(contenedor, {oferta, jugador, onAceptar, onRechazar}): void`
  - `renderPlan(contenedor, {oferta, onElegirPlan}): void`
  - `renderPelea(contenedor, {pelea, eventos, onSiguienteRound, onFin}): void` — muestra el log acumulado, marcadores y el botón para avanzar; al terminar muestra el resultado.
  - `renderRincon(contenedor, {pelea, onInstruccion}): void`
  - `renderGolpeDeGracia(contenedor, {pelea, info, onGolpe, ventanaMs}): void` — corre el temporizador de la ventana; si expira llama `onGolpe({aTiempo:false})`.

- [ ] **Step 1: Escribir `tests/ui/fight.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPelea } from '../../src/core/fight.js';
import { abrirGolpeDeGracia, ZONAS_GOLPE } from '../../src/core/fight-interactive.js';
import { renderOferta, renderPlan, renderPelea, renderRincon, renderGolpeDeGracia } from '../../src/ui/screens/fight.js';

const jugador = crearPeleador({
  nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
  estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
});
const rival = crearPeleador({
  nombre: 'Dyke Tyzon', apodo: 'El Ciclón', nacionalidad: 'US', disciplina: 'boxeo',
  estilo: 'noqueador', categoria: 'pluma', origen: 'barrio', media: 70,
});
const oferta = {
  id: 'of_1', rivalId: rival.id, rivalNombre: rival.nombre, rivalApodo: rival.apodo,
  rivalMedia: 70, rivalRecord: '15-2', rivalEstilo: 'noqueador', rivalPersonalidad: 'agresivo',
  nivel: 'titulo', nivelPelea: 'titulo', bolsa: 25000, riesgo: 'alto',
  enJuego: 'Título regional', esTitulo: true, esObligatoria: false, esRevancha: false,
  famaBase: 15, textoGancho: 'Dyke Tyzon te quiere cruzar.',
};
const pelea = () => crearPelea({ jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(1) });

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderOferta', () => {
  it('muestra rival, bolsa, riesgo y que esta en juego', () => {
    renderOferta(cont, { oferta, jugador, onAceptar: () => {}, onRechazar: () => {} });
    expect(cont.textContent).toContain('Dyke Tyzon');
    expect(cont.textContent).toContain('15-2');
    expect(cont.textContent).toContain('US$ 25K');
    expect(cont.textContent.toLowerCase()).toContain('alto');
    expect(cont.textContent).toContain('Título regional');
  });

  it('aceptar y rechazar disparan sus callbacks', () => {
    let aceptado = false; let rechazado = false;
    renderOferta(cont, { oferta, jugador, onAceptar: () => { aceptado = true; }, onRechazar: () => { rechazado = true; } });
    cont.querySelector('[data-accion="aceptar"]').click();
    cont.querySelector('[data-accion="rechazar"]').click();
    expect(aceptado).toBe(true);
    expect(rechazado).toBe(true);
  });
});

describe('renderPlan', () => {
  it('ofrece los tres planes', () => {
    renderPlan(cont, { oferta, onElegirPlan: () => {} });
    expect(cont.querySelectorAll('[data-plan]')).toHaveLength(3);
  });

  it('devuelve el plan elegido', () => {
    let plan = null;
    renderPlan(cont, { oferta, onElegirPlan: (p) => { plan = p; } });
    cont.querySelector('[data-plan="frente"]').click();
    expect(plan).toBe('frente');
  });
});

describe('renderPelea', () => {
  it('muestra el round y los apodos', () => {
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('El Relámpago');
    expect(cont.textContent).toContain('El Ciclón');
    expect(cont.textContent).toMatch(/round\s*1/i);
  });

  it('muestra el log de eventos', () => {
    const eventos = [{ round: 1, tipo: 'dominio', texto: 'Lo tiene contra las cuerdas.' }];
    renderPelea(cont, { pelea: pelea(), eventos, onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('Lo tiene contra las cuerdas.');
  });

  it('el boton avanza el round', () => {
    let avances = 0;
    renderPelea(cont, { pelea: pelea(), eventos: [], onSiguienteRound: () => { avances += 1; }, onFin: () => {} });
    cont.querySelector('[data-accion="round"]').click();
    expect(avances).toBe(1);
  });

  it('al terminar muestra el resultado y el boton de cierre', () => {
    const terminada = {
      ...pelea(), terminada: true,
      resultado: { ganador: 'jugador', metodo: 'ko', round: 4, texto: 'El Relámpago gana por KO en el round 4.' },
    };
    renderPelea(cont, { pelea: terminada, eventos: [], onSiguienteRound: () => {}, onFin: () => {} });
    expect(cont.textContent).toContain('gana por KO');
    expect(cont.querySelector('[data-accion="fin"]')).toBeTruthy();
    expect(cont.querySelector('[data-accion="round"]')).toBeNull();
  });
});

describe('renderRincon', () => {
  it('muestra el estado y las tres instrucciones', () => {
    const enRincon = { ...pelea(), roundActual: 3, pendiente: 'rincon', tarjetas: { jugador: 1, rival: 2 } };
    renderRincon(cont, { pelea: enRincon, onInstruccion: () => {} });
    expect(cont.querySelectorAll('[data-instruccion]')).toHaveLength(3);
    expect(cont.textContent.toLowerCase()).toContain('rincón');
  });

  it('devuelve la instruccion elegida', () => {
    let instruccion = null;
    const enRincon = { ...pelea(), pendiente: 'rincon' };
    renderRincon(cont, { pelea: enRincon, onInstruccion: (i) => { instruccion = i; } });
    cont.querySelector('[data-instruccion="cuerpo"]').click();
    expect(instruccion).toBe('cuerpo');
  });
});

describe('renderGolpeDeGracia', () => {
  it('muestra las tres zonas y cual esta abierta', () => {
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: () => {}, ventanaMs: 3000 });
    expect(cont.querySelectorAll('[data-zona]')).toHaveLength(3);
    expect(cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).textContent.toLowerCase()).toContain('abierto');
  });

  it('elegir una zona reporta el golpe a tiempo', () => {
    let golpe = null;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: (g) => { golpe = g; }, ventanaMs: 3000 });
    cont.querySelector(`[data-zona="${info.zonaAbierta}"]`).click();
    expect(golpe.aTiempo).toBe(true);
    expect(golpe.zonaElegida).toBe(info.zonaAbierta);
    expect(golpe.precision).toBeGreaterThanOrEqual(0);
    expect(golpe.precision).toBeLessThanOrEqual(1);
  });

  it('si se acaba la ventana reporta que no llegaste', async () => {
    vi.useFakeTimers();
    let golpe = null;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: (g) => { golpe = g; }, ventanaMs: 1000 });
    vi.advanceTimersByTime(1200);
    expect(golpe).not.toBeNull();
    expect(golpe.aTiempo).toBe(false);
    vi.useRealTimers();
  });

  it('no reporta dos veces si ya elegiste', () => {
    vi.useFakeTimers();
    let llamadas = 0;
    const groggy = { ...pelea(), aguante: { jugador: 80, rival: 12 }, pendiente: 'golpe' };
    const info = abrirGolpeDeGracia(groggy);
    renderGolpeDeGracia(cont, { pelea: groggy, info, onGolpe: () => { llamadas += 1; }, ventanaMs: 1000 });
    cont.querySelector('[data-zona="higado"]').click();
    vi.advanceTimersByTime(1500);
    expect(llamadas).toBe(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/ui/fight.test.js`
Expected: FAIL — no se puede resolver el módulo.

- [ ] **Step 3: Implementar `src/ui/screens/fight.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';
import { PLANES } from '../../core/fight.js';
import { INSTRUCCIONES_RINCON, ZONAS_GOLPE, estadoRincon } from '../../core/fight-interactive.js';
import { recordTexto } from '../../core/fighter.js';

const ETIQUETA_RIESGO = { bajo: 'Riesgo bajo', medio: 'Riesgo medio', alto: 'Riesgo alto' };

export function renderOferta(contenedor, { oferta, jugador, onAceptar, onRechazar }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Oferta de pelea' }),
    el('h1', { text: oferta.esTitulo ? 'Pelea de título' : 'Te ofrecen una pelea' }),
    el('p', { class: 'medio', text: oferta.textoGancho }),
    el('div', { class: 'panel' }, [
      el('div', { style: 'font-size:18px;font-weight:800', text: `"${oferta.rivalApodo}" ${oferta.rivalNombre}` }),
      el('div', { class: 'etiqueta', text: `Media ${oferta.rivalMedia} · récord ${oferta.rivalRecord} · ${oferta.rivalEstilo}` }),
      el('div', { class: 'fila', style: 'margin-top:10px' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor verde', text: fmtDinero(oferta.bolsa) }),
          el('div', { class: 'nombre', text: 'Bolsa' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: ETIQUETA_RIESGO[oferta.riesgo] }),
          el('div', { class: 'nombre', text: 'Riesgo' }),
        ]),
      ]),
      el('div', { class: 'chip', style: 'margin-top:10px', text: `En juego: ${oferta.enJuego}` }),
      oferta.esRevancha ? el('div', { class: 'chip rojo', text: 'Revancha' }) : null,
      oferta.esObligatoria ? el('div', { class: 'chip dorado', text: 'Defensa obligatoria' }) : null,
    ]),
    el('button', { class: 'boton', 'data-accion': 'aceptar', text: 'Aceptar la pelea', onClick: onAceptar }),
    el('button', { class: 'boton secundario', 'data-accion': 'rechazar', text: 'Rechazar', onClick: onRechazar }),
  ]));
}

export function renderPlan(contenedor, { oferta, onElegirPlan }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Preparación' }),
    el('h1', { text: 'El plan de pelea' }),
    el('p', { class: 'medio', text: `Contra ${oferta.rivalApodo}. ¿Cómo la encarás?` }),
    ...Object.values(PLANES).map((plan) => el('button', {
      class: 'carta', 'data-plan': plan.id, onClick: () => onElegirPlan(plan.id),
    }, [
      el('div', { class: 'titulo', text: plan.nombre }),
      el('div', { class: 'desc', text: plan.descripcion }),
    ])),
  ]));
}

export function renderPelea(contenedor, { pelea, eventos, onSiguienteRound, onFin }) {
  const { jugador, rival } = pelea.snapshot;
  const log = el('div', { class: 'log' }, eventos.map((e) => el('p', {
    class: ['ko', 'sumision', 'caida'].includes(e.tipo) ? 'destacado' : '',
    text: e.texto,
  })));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: pelea.terminada ? 'Fin de la pelea' : `Round ${pelea.roundActual} de ${pelea.rounds}` }),
    el('h1', { text: `${jugador.apodo} vs ${rival.apodo}` }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Aguante de ${rival.apodo}: ${Math.round(pelea.aguante.rival)}%` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${pelea.aguante.rival}%` })]),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Tu aguante: ${Math.round(pelea.aguante.jugador)}%` }),
      el('div', { class: 'barra verde-barra' }, [el('i', { style: `width:${pelea.aguante.jugador}%` })]),
      el('div', { class: 'etiqueta', style: 'margin-top:8px', text: `Tarjetas ${pelea.tarjetas.jugador}-${pelea.tarjetas.rival}` }),
    ]),
    el('div', { class: 'panel' }, [log]),
    pelea.terminada
      ? el('div', { class: 'panel' }, [el('p', { class: 'dorado', text: pelea.resultado.texto })])
      : null,
    pelea.terminada
      ? el('button', { class: 'boton', 'data-accion': 'fin', text: 'Ver consecuencias', onClick: onFin })
      : el('button', { class: 'boton', 'data-accion': 'round', text: 'Siguiente round', onClick: onSiguienteRound }),
  ]));
}

export function renderRincon(contenedor, { pelea, onInstruccion }) {
  const estado = estadoRincon(pelea);
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: `Fin del round ${pelea.roundActual - 1} · el rincón` }),
    el('h1', { text: 'El rincón' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: estado.tarjetasTexto }),
      el('div', { class: 'fila', style: 'margin-top:8px' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.fatigaJugador}` }),
          el('div', { class: 'nombre', text: 'Tu fatiga' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.fatigaRival}` }),
          el('div', { class: 'nombre', text: 'Fatiga rival' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: `${estado.aguanteRival}` }),
          el('div', { class: 'nombre', text: 'Aguante rival' }),
        ]),
      ]),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: 'Tu entrenador' }),
      el('p', { style: 'font-style:italic', text: `"${estado.consejo}"` }),
    ]),
    el('div', { class: 'etiqueta', text: '¿Qué hacés este round?' }),
    ...Object.values(INSTRUCCIONES_RINCON).map((i) => el('button', {
      class: 'carta', 'data-instruccion': i.id, onClick: () => onInstruccion(i.id),
    }, [
      el('div', { class: 'titulo', text: i.nombre }),
      el('div', { class: 'desc', text: i.texto }),
    ])),
  ]));
}

export function renderGolpeDeGracia(contenedor, { pelea, info, onGolpe, ventanaMs = 3200 }) {
  let resuelto = false;
  const desde = Date.now();

  function resolver(datos) {
    if (resuelto) return;
    resuelto = true;
    clearTimeout(temporizador);
    onGolpe(datos);
  }

  const temporizador = setTimeout(() => {
    resolver({ zonaElegida: null, precision: 0, aTiempo: false });
  }, ventanaMs);

  const zonas = info.zonas.map((zona) => el('button', {
    class: 'carta', 'data-zona': zona.id,
    onClick: () => {
      const transcurrido = Date.now() - desde;
      const precision = Math.max(0, Math.min(1, 1 - transcurrido / ventanaMs));
      resolver({ zonaElegida: zona.id, precision, aTiempo: true });
    },
  }, [
    el('div', { class: 'titulo', text: zona.nombre }),
    el('div', {
      class: zona.estado === 'abierto' ? 'desc verde' : zona.estado === 'tapado' ? 'desc rojo' : 'desc dorado',
      text: zona.estado === 'abierto' ? 'Abierto' : zona.estado === 'tapado' ? 'Tapado' : 'Riesgoso',
    }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: `Round ${pelea.roundActual}` }),
    el('h1', { text: '¡Lo tenés groggy!' }),
    el('p', { class: 'medio', text: 'Sube la guardia por instinto. Leé dónde quedó abierto y mandala. Rápido.' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta', text: `Aguante del rival: ${Math.round(pelea.aguante.rival)}%` }),
      el('div', { class: 'barra' }, [el('i', { style: `width:${pelea.aguante.rival}%` })]),
    ]),
    ...zonas,
  ]));
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/ui/fight.test.js`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/fight.js tests/ui/fight.test.js
git commit -m "feat: pantalla de pelea con rincon y golpe de gracia"
```

---

## Task 24: Noticias, legado y armado final del juego

**Files:**
- Create: `src/ui/screens/news.js`
- Create: `src/ui/screens/legacy.js`
- Create: `src/ui/screens/profile.js`
- Modify: `src/main.js` (reemplaza el archivo de la Task 1)
- Test: `tests/ui/legacy.test.js`
- Test: `tests/integration/partida.test.js`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `renderNoticias(contenedor, {noticias, onContinuar}): void`
  - `renderLegado(contenedor, {legado, jugador, onNuevaCarrera}): void`
  - `renderFicha(contenedor, {jugador, seccion, onCerrar}): void` — pestañas atributos / historial.
  - `main.js`: `VERSION`, `iniciar(contenedor?, storage?)` — el router completo; `jugarBeat(estado)` no se exporta.

- [ ] **Step 1: Escribir `tests/ui/legacy.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { renderLegado } from '../../src/ui/screens/legacy.js';
import { renderNoticias } from '../../src/ui/screens/news.js';
import { renderFicha } from '../../src/ui/screens/profile.js';

function jugadorConCarrera() {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 70, esJugador: true,
  });
  jugador.record = { v: 25, d: 4, e: 1, ko: 18, sub: 0, dec: 7 };
  jugador.titulos = ['Título regional'];
  jugador.defensas = 3;
  jugador.dinero = 1500000;
  jugador.fama = 78;
  jugador.historial = [{
    rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón',
    resultado: 'v', metodo: 'ko', round: 4, bolsa: 90000, enJuego: 'Título regional', esTitulo: true,
  }];
  return jugador;
}

let cont;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cont = document.getElementById('app');
});

describe('renderLegado', () => {
  it('muestra record, titulos y los cinco legados', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.textContent).toContain('25-4-1');
    expect(cont.textContent).toContain('Título regional');
    expect(cont.querySelectorAll('[data-legado]')).toHaveLength(5);
  });

  it('muestra la biografia generada', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.textContent).toContain('Lucas Ortiz');
  });

  it('ofrece empezar otra carrera', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    let nueva = false;
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => { nueva = true; } });
    cont.querySelector('[data-accion="nueva"]').click();
    expect(nueva).toBe(true);
  });

  it('no usa emojis', () => {
    const jugador = jugadorConCarrera();
    const partida = { ...crearPartida({ jugador, semilla: 1 }), jugador };
    renderLegado(cont, { legado: calcularLegado(partida), jugador, onNuevaCarrera: () => {} });
    expect(cont.innerHTML).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('renderNoticias', () => {
  it('lista los titulares', () => {
    const noticias = [
      { id: 'n1', tipo: 'victoria', titular: 'Fulano noqueó a Mengano.', fecha: 2030 },
      { id: 'n2', tipo: 'retiro', titular: 'Zutano se retira.', fecha: 2030 },
    ];
    renderNoticias(cont, { noticias, onContinuar: () => {} });
    expect(cont.querySelectorAll('[data-noticia]')).toHaveLength(2);
    expect(cont.textContent).toContain('Zutano se retira.');
  });

  it('con el feed vacio avisa que no pasó nada', () => {
    renderNoticias(cont, { noticias: [], onContinuar: () => {} });
    expect(cont.textContent.length).toBeGreaterThan(0);
    expect(cont.querySelector('[data-accion="continuar"]')).toBeTruthy();
  });
});

describe('renderFicha', () => {
  it('muestra todos los atributos', () => {
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'atributos', onCerrar: () => {} });
    expect(cont.querySelectorAll('[data-atributo-full]').length).toBeGreaterThanOrEqual(6);
  });

  it('muestra el historial de peleas', () => {
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'historial', onCerrar: () => {} });
    expect(cont.textContent).toContain('Dyke Tyzon');
  });

  it('cerrar dispara el callback', () => {
    let cerrado = false;
    renderFicha(cont, { jugador: jugadorConCarrera(), seccion: 'atributos', onCerrar: () => { cerrado = true; } });
    cont.querySelector('[data-accion="cerrar"]').click();
    expect(cerrado).toBe(true);
  });
});
```

- [ ] **Step 2: Escribir `tests/integration/partida.test.js`**

Este test juega una carrera entera **sin UI**, usando solo el núcleo. Es la red de seguridad de todo el juego.

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../../src/core/career.js';
import { crearPelea, simularRound } from '../../src/core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia } from '../../src/core/fight-interactive.js';
import { aplicarCarta } from '../../src/core/cards.js';
import { resolverOpcion } from '../../src/core/events.js';
import { aplicarResultado } from '../../src/core/offers.js';
import { registrarCruce, elegirArchirrival } from '../../src/core/rivalry.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { serializar, deserializar } from '../../src/core/save.js';

function jugarCarrera(semilla) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 38, esJugador: true,
  });
  let partida = crearPartida({ jugador, semilla });
  const rng = createRng(semilla + 1000);
  let peleas = 0;
  let guardia = 0;

  while (!partida.terminada && guardia < 500) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;
    if (!beat) continue;

    if (beat.tipo === 'mejora') {
      const carta = rng.pick(beat.datos.cartas);
      partida = { ...partida, jugador: aplicarCarta(partida.jugador, carta).jugador };
    }

    if (beat.tipo === 'evento' || beat.tipo === 'redes') {
      const carta = beat.datos.carta;
      const opcion = rng.pick(carta.opciones);
      const resuelto = resolverOpcion(rng, {
        jugador: partida.jugador, carta, opcionId: opcion.id,
        rivalidades: partida.rivalidades, rivalObjetivoId: partida.mundo.roster[0].id,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    }

    if (beat.tipo === 'oferta') {
      const { oferta } = beat.datos;
      const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
      let pelea = crearPelea({
        jugador: partida.jugador, rival, disciplina: partida.jugador.disciplina,
        nivel: oferta.nivelPelea, plan: 'afuera', rng,
      });

      let vueltas = 0;
      while (!pelea.terminada && vueltas < 40) {
        vueltas += 1;
        const avance = avanzarPelea(pelea);
        pelea = avance.pelea;
        if (pelea.pendiente === 'rincon') pelea = aplicarInstruccionRincon(pelea, 'cuerpo');
        else if (pelea.pendiente === 'golpe') {
          const info = abrirGolpeDeGracia(pelea);
          pelea = resolverGolpeDeGracia(pelea, {
            zonaElegida: info.zonaAbierta, precision: 0.8, aTiempo: true,
          }).pelea;
        }
      }

      expect(pelea.terminada).toBe(true);
      peleas += 1;

      const resultado = aplicarResultado(partida.jugador, { oferta, resultado: pelea.resultado });
      const signo = pelea.resultado.ganador === 'jugador' ? 'v' : pelea.resultado.ganador === 'rival' ? 'd' : 'e';
      const rivalidades = registrarCruce(partida.rivalidades, oferta.rivalId, signo);
      elegirArchirrival(rivalidades);
      partida = { ...partida, jugador: resultado.jugador, rivalidades };
    }
  }

  return { partida, peleas };
}

describe('carrera completa de punta a punta', () => {
  it('termina sin colgarse y con peleas jugadas', () => {
    for (const semilla of [1, 2, 3]) {
      const { partida, peleas } = jugarCarrera(semilla);
      expect(partida.terminada).toBe(true);
      expect(peleas).toBeGreaterThan(5);
    }
  });

  it('el record cierra con la cantidad de peleas jugadas', () => {
    const { partida, peleas } = jugarCarrera(4);
    const { v, d, e } = partida.jugador.record;
    expect(v + d + e).toBe(peleas);
  });

  it('el peleador mejora respecto del arranque', () => {
    const { partida } = jugarCarrera(5);
    expect(partida.jugador.atributos.tecnica).toBeGreaterThan(20);
    expect(partida.jugador.historial.length).toBeGreaterThan(5);
  });

  it('genera noticias durante la carrera', () => {
    const { partida } = jugarCarrera(6);
    expect(partida.noticias.length).toBeGreaterThan(0);
  });

  it('el legado final es coherente', () => {
    const { partida } = jugarCarrera(7);
    const legado = calcularLegado(partida);
    expect(legado.legados).toHaveLength(5);
    expect(legado.peleas).toBe(partida.jugador.record.v + partida.jugador.record.d + partida.jugador.record.e);
    expect(legado.biografia.length).toBeGreaterThan(40);
  });

  it('la partida sobrevive a un guardado y una carga', () => {
    const { partida } = jugarCarrera(8);
    const recuperada = deserializar(serializar(partida));
    expect(recuperada.jugador.record).toEqual(partida.jugador.record);
    expect(recuperada.noticias.length).toBe(partida.noticias.length);
  });

  it('es determinista con la misma semilla', () => {
    const a = jugarCarrera(9);
    const b = jugarCarrera(9);
    expect(a.partida.jugador.record).toEqual(b.partida.jugador.record);
  });

  it('el dinero nunca queda negativo', () => {
    const { partida } = jugarCarrera(10);
    expect(partida.jugador.dinero).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run tests/ui/legacy.test.js tests/integration/partida.test.js`
Expected: FAIL — no se pueden resolver los módulos de UI (el de integración puede fallar por otras razones; se arregla en los pasos siguientes).

- [ ] **Step 4: Implementar `src/ui/screens/news.js`**

```js
import { el, mount } from '../dom.js';

export function renderNoticias(contenedor, { noticias, onContinuar }) {
  const items = noticias.slice(0, 8).map((n) => el('div', {
    class: 'panel', 'data-noticia': n.id,
  }, [
    el('div', { class: 'etiqueta', text: `${n.fecha} · ${n.tipo}` }),
    el('div', { text: n.titular }),
  ]));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'El mundo sigue girando' }),
    el('h1', { text: 'Noticias' }),
    items.length > 0 ? el('div', { class: 'stack' }, items)
      : el('p', { class: 'medio', text: 'Semana tranquila. Nadie habló de nadie.' }),
    el('button', { class: 'boton', 'data-accion': 'continuar', text: 'Continuar', onClick: onContinuar }),
  ]));
}
```

- [ ] **Step 5: Implementar `src/ui/screens/profile.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';
import { ETIQUETAS } from '../../core/stats.js';
import { getDisciplina } from '../../core/disciplines.js';
import { recordTexto } from '../../core/fighter.js';

const METODOS = { ko: 'KO', tko: 'TKO', sumision: 'Sumisión', decision: 'Decisión', descalificacion: 'DQ' };

export function renderFicha(contenedor, { jugador, seccion = 'atributos', onCerrar }) {
  const disciplina = getDisciplina(jugador.disciplina);
  const claves = ['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq'];
  if (disciplina.usaGrappling) claves.push('grappling');

  const atributos = el('div', { class: 'stack' }, [
    ...claves.map((c) => el('div', { class: 'panel', 'data-atributo-full': c, style: 'display:flex;justify-content:space-between' }, [
      el('span', { text: ETIQUETAS[c].larga }),
      el('span', { style: 'font-weight:800', text: String(jugador.atributos[c]) }),
    ])),
    ...['disciplinaPersonal', 'menton'].map((c) => el('div', { class: 'panel', 'data-atributo-full': c, style: 'display:flex;justify-content:space-between' }, [
      el('span', { text: ETIQUETAS[c].larga }),
      el('span', { style: 'font-weight:800', text: String(jugador.especiales[c]) }),
    ])),
  ]);

  const historial = jugador.historial.length === 0
    ? el('p', { class: 'medio', text: 'Todavía no subiste al ring.' })
    : el('div', { class: 'stack' }, jugador.historial.map((p, i) => el('div', {
      class: 'panel', style: 'display:flex;justify-content:space-between;gap:8px',
    }, [
      el('div', {}, [
        el('div', { style: 'font-weight:800', text: `${i + 1}. ${p.rivalNombre}` }),
        el('div', { class: 'etiqueta', text: `${METODOS[p.metodo] ?? p.metodo} · round ${p.round} · ${p.enJuego}` }),
      ]),
      el('div', {
        class: p.resultado === 'v' ? 'verde' : p.resultado === 'd' ? 'rojo' : 'sutil',
        style: 'font-weight:800',
        text: p.resultado === 'v' ? 'Ganó' : p.resultado === 'd' ? 'Perdió' : 'Empate',
      }),
    ])));

  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta', text: 'Ficha del peleador' }),
    el('h1', { text: `"${jugador.apodo}" ${jugador.nombre}`.toUpperCase() }),
    el('div', { class: 'etiqueta', text: `Récord ${recordTexto(jugador)} · ${fmtDinero(jugador.dinero)} ganados` }),
    seccion === 'historial' ? historial : atributos,
    el('button', { class: 'boton', 'data-accion': 'cerrar', text: 'Volver', onClick: onCerrar }),
  ]));
}
```

- [ ] **Step 6: Implementar `src/ui/screens/legacy.js`**

```js
import { el, mount, fmtDinero } from '../dom.js';

export function renderLegado(contenedor, { legado, jugador, onNuevaCarrera }) {
  mount(contenedor, el('div', { class: 'stack' }, [
    el('div', { class: 'etiqueta rojo', text: 'Fin de la carrera' }),
    el('h1', { text: `"${jugador.apodo}" ${jugador.nombre}`.toUpperCase() }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'fila' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: legado.record }),
          el('div', { class: 'nombre', text: 'Récord' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor dorado', text: String(legado.titulos.length) }),
          el('div', { class: 'nombre', text: 'Títulos' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor', text: String(legado.defensas) }),
          el('div', { class: 'nombre', text: 'Defensas' }),
        ]),
        el('div', { class: 'tile' }, [
          el('div', { class: 'valor verde', text: fmtDinero(legado.dineroTotal) }),
          el('div', { class: 'nombre', text: 'Ganado' }),
        ]),
      ]),
      legado.titulos.length > 0
        ? el('div', { class: 'mods', style: 'margin-top:8px', text: legado.titulos.join(' · ') })
        : null,
    ]),
    legado.archirrival ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta rojo', text: 'Archirrival' }),
      el('div', { style: 'font-weight:800', text: `"${legado.archirrival.apodo}" ${legado.archirrival.nombre}` }),
      el('div', { class: 'etiqueta', text: `Cara a cara: ${legado.archirrival.h2h}` }),
    ]) : null,
    legado.momentos.length > 0 ? el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Momentos memorables' }),
      el('div', { class: 'log' }, legado.momentos.map((m) => el('p', { text: m }))),
    ]) : null,
    el('div', { class: 'panel' }, [
      el('div', { class: 'etiqueta dorado', text: 'Biografía' }),
      el('p', { text: legado.biografia }),
    ]),
    el('div', { class: 'etiqueta', text: 'Tu legado' }),
    ...legado.legados.map((l) => el('div', {
      class: 'panel', 'data-legado': l.id, style: 'display:flex;justify-content:space-between;gap:10px',
    }, [
      el('div', {}, [
        el('div', { style: 'font-weight:800', text: l.nombre }),
        el('div', { class: 'etiqueta', text: l.texto }),
      ]),
      el('div', { style: 'text-align:right' }, [
        el('div', { class: 'dorado', style: 'font-weight:800', text: l.etiqueta }),
        el('div', { class: 'etiqueta', text: `${l.puntaje}/100` }),
      ]),
    ])),
    el('button', { class: 'boton', 'data-accion': 'nueva', text: 'Nueva carrera', onClick: onNuevaCarrera }),
  ]));
}
```

- [ ] **Step 7: Reemplazar `src/main.js` con el router completo**

```js
import { createRng } from './core/rng.js';
import { crearPartida, siguienteBeat } from './core/career.js';
import { crearPelea } from './core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia, VENTANA_MS } from './core/fight-interactive.js';
import { aplicarCarta, formatearMods } from './core/cards.js';
import { resolverOpcion } from './core/events.js';
import { generarOferta, aplicarResultado, rechazarOferta } from './core/offers.js';
import { crearNegociacion, jugarMovida, resultadoNegociacion } from './core/negotiation.js';
import { crearCareo, responderCareo, resultadoCareo } from './core/presser.js';
import { registrarGolpe, resultadoSparring } from './core/sparring.js';
import { registrarCruce, elegirArchirrival, subirHeat } from './core/rivalry.js';
import { comprar } from './core/money.js';
import { tirarLesion, aplicarLesion } from './core/injuries.js';
import { calcularLegado } from './core/legacy.js';
import { guardar, cargar, borrar } from './core/save.js';
import { clamp } from './core/stats.js';

import { renderCreacion } from './ui/screens/create.js';
import { renderDashboard } from './ui/screens/dashboard.js';
import { renderTarjeta, renderResultadoTarjeta } from './ui/screens/card.js';
import { renderTienda } from './ui/screens/shop.js';
import { renderCareo } from './ui/screens/presser.js';
import { renderSparring } from './ui/screens/sparring.js';
import { renderNegociacion } from './ui/screens/negotiation.js';
import { renderOferta, renderPlan, renderPelea, renderRincon, renderGolpeDeGracia } from './ui/screens/fight.js';
import { renderNoticias } from './ui/screens/news.js';
import { renderFicha } from './ui/screens/profile.js';
import { renderLegado } from './ui/screens/legacy.js';

export const VERSION = '0.1.0';

export function iniciar(contenedor = document.getElementById('app'), storage = undefined) {
  let partida = cargar(storage);
  let rng = createRng(partida ? partida.semilla + 7777 : Date.now());

  const persistir = () => { if (partida) guardar(partida, storage); };

  function irADashboard() {
    persistir();
    renderDashboard(contenedor, {
      partida,
      onSiguiente: siguiente,
      onTienda: abrirTienda,
      onFicha: (jugador, seccion = 'atributos') => renderFicha(contenedor, {
        jugador, seccion, onCerrar: irADashboard,
      }),
    });
  }

  function abrirTienda() {
    renderTienda(contenedor, {
      jugador: partida.jugador,
      onComprar: (id) => {
        const paso = comprar(partida.jugador, id);
        if (paso.ok) partida = { ...partida, jugador: paso.jugador };
        abrirTienda();
      },
      onCerrar: irADashboard,
    });
  }

  function siguiente() {
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    if (partida.terminada) return finDeCarrera();
    if (!paso.beat) return irADashboard();
    jugarBeat(paso.beat);
  }

  function jugarBeat(beat) {
    if (beat.tipo === 'mejora') return beatMejora(beat);
    if (beat.tipo === 'evento') return beatCarta(beat, 'Decisión');
    if (beat.tipo === 'redes') return beatCarta(beat, 'Redes sociales');
    if (beat.tipo === 'sparring') return beatSparring(beat);
    if (beat.tipo === 'oferta') return beatOferta(beat);
    if (beat.tipo === 'noticias') return beatNoticias();
    return irADashboard();
  }

  function beatMejora(beat) {
    renderTarjeta(contenedor, {
      titulo: 'Campamento',
      bajada: 'El trabajo rindió',
      texto: 'El dado trajo tres mejoras. Elegí una.',
      opciones: beat.datos.cartas.map((c) => ({
        id: c.id, titulo: c.titulo, desc: c.texto, mods: formatearMods(c.mods),
      })),
      onElegir: (id) => {
        const carta = beat.datos.cartas.find((c) => c.id === id);
        const aplicado = aplicarCarta(partida.jugador, carta);
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        irADashboard();
      },
    });
  }

  function beatCarta(beat, titulo) {
    const carta = beat.datos.carta;
    renderTarjeta(contenedor, {
      titulo,
      bajada: carta.titulo,
      texto: carta.texto,
      opciones: carta.opciones.map((o) => ({
        id: o.id,
        titulo: o.texto,
        mods: o.mods ? formatearMods(o.mods) : [],
        nota: o.probabilidades ? 'El resultado se define al azar' : null,
      })),
      onElegir: (id) => {
        const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
        const resuelto = resolverOpcion(rng, {
          jugador: partida.jugador, carta, opcionId: id,
          rivalidades: partida.rivalidades, rivalObjetivoId,
        });
        partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
        renderResultadoTarjeta(contenedor, {
          titulo,
          texto: resuelto.texto || 'Listo.',
          deltas: resuelto.deltasTexto,
          onContinuar: irADashboard,
        });
      },
    });
  }

  function beatSparring(beat) {
    let sparring = beat.datos.sparring;
    const pintar = () => renderSparring(contenedor, {
      sparring,
      jugador: partida.jugador,
      onGolpe: (evento) => {
        sparring = registrarGolpe(sparring, evento);
        pintar();
      },
      onTerminar: () => {
        const resultado = resultadoSparring(sparring, partida.jugador);
        const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
        partida = { ...partida, jugador: aplicado.jugador, ultimosDeltas: aplicado.deltas };
        renderResultadoTarjeta(contenedor, {
          titulo: 'Sparring',
          texto: resultado.texto,
          deltas: formatearMods(aplicado.deltas),
          onContinuar: irADashboard,
        });
      },
    });
    pintar();
  }

  function beatOferta(beat) {
    const { oferta } = beat.datos;
    renderOferta(contenedor, {
      oferta,
      jugador: partida.jugador,
      onAceptar: () => negociar(oferta),
      onRechazar: () => {
        const paso = rechazarOferta(partida.jugador, oferta);
        partida = { ...partida, jugador: paso.jugador };
        renderResultadoTarjeta(contenedor, {
          titulo: 'Oferta rechazada', texto: paso.texto, deltas: [], onContinuar: irADashboard,
        });
      },
    });
  }

  function negociar(oferta) {
    let negociacion = crearNegociacion(oferta, {
      tieneManager: partida.jugador.staff.includes('manager'),
    });
    const pintar = () => renderNegociacion(contenedor, {
      negociacion,
      oferta,
      onMovida: (movidaId) => {
        negociacion = jugarMovida(negociacion, movidaId, rng).negociacion;
        pintar();
      },
      onCerrar: () => {
        const final = resultadoNegociacion(negociacion);
        careo({ ...oferta, bolsa: final.bolsa });
      },
    });
    pintar();
  }

  function careo(oferta) {
    if (!oferta.esTitulo && (partida.jugador.fama ?? 0) < 20) return elegirPlan(oferta);
    let estado = crearCareo(rng, { oferta });
    const pintar = () => renderCareo(contenedor, {
      careo: estado,
      onResponder: (tono) => {
        estado = responderCareo(estado, tono, rng).careo;
        pintar();
      },
      onTerminar: () => {
        const r = resultadoCareo(estado);
        const jugador = {
          ...partida.jugador,
          fama: clamp(partida.jugador.fama + r.bonusFama, 0, 100),
          estado: { ...partida.jugador.estado, moral: clamp(partida.jugador.estado.moral + r.bonusMoral, 0, 100) },
        };
        partida = {
          ...partida,
          jugador,
          rivalidades: subirHeat(partida.rivalidades, oferta.rivalId, r.heatRival),
        };
        elegirPlan(oferta);
      },
    });
    pintar();
  }

  function elegirPlan(oferta) {
    renderPlan(contenedor, { oferta, onElegirPlan: (plan) => pelear(oferta, plan) });
  }

  function pelear(oferta, plan) {
    const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
    let pelea = crearPelea({
      jugador: partida.jugador, rival,
      disciplina: partida.jugador.disciplina, nivel: oferta.nivelPelea, plan, rng,
    });
    const log = [];

    const pintarPelea = () => renderPelea(contenedor, {
      pelea, eventos: log,
      onSiguienteRound: avanzar,
      onFin: () => cerrarPelea(oferta, pelea),
    });

    function avanzar() {
      const paso = avanzarPelea(pelea);
      pelea = paso.pelea;
      log.push(...paso.eventos);
      if (pelea.pendiente === 'golpe') return pintarGolpe();
      if (pelea.pendiente === 'rincon') return pintarRincon();
      pintarPelea();
    }

    function pintarRincon() {
      renderRincon(contenedor, {
        pelea,
        onInstruccion: (id) => {
          pelea = aplicarInstruccionRincon(pelea, id);
          pintarPelea();
        },
      });
    }

    function pintarGolpe() {
      const info = abrirGolpeDeGracia(pelea);
      renderGolpeDeGracia(contenedor, {
        pelea, info, ventanaMs: VENTANA_MS,
        onGolpe: (datos) => {
          const paso = resolverGolpeDeGracia(pelea, datos);
          pelea = paso.pelea;
          log.push(...paso.eventos);
          pintarPelea();
        },
      });
    }

    pintarPelea();
  }

  function cerrarPelea(oferta, pelea) {
    const paso = aplicarResultado(partida.jugador, { oferta, resultado: pelea.resultado });
    let jugador = paso.jugador;

    const danoRecibido = 100 - pelea.aguante.jugador;
    const lesion = tirarLesion(rng, { peleador: jugador, contexto: 'pelea', danoRecibido });
    if (lesion) {
      jugador = aplicarLesion(jugador, lesion);
      jugador.lesionesSufridas = [...(jugador.lesionesSufridas ?? []), lesion];
    }

    const signo = pelea.resultado.ganador === 'jugador' ? 'v' : pelea.resultado.ganador === 'rival' ? 'd' : 'e';
    const rivalidades = registrarCruce(partida.rivalidades, oferta.rivalId, signo);
    elegirArchirrival(rivalidades);

    partida = { ...partida, jugador, rivalidades };

    renderResultadoTarjeta(contenedor, {
      titulo: 'Después de la pelea',
      texto: `${paso.texto}${lesion ? ` ${lesion.texto}` : ''}`,
      deltas: [`Bolsa: ${oferta.bolsa}`],
      onContinuar: irADashboard,
    });
  }

  function beatNoticias() {
    renderNoticias(contenedor, { noticias: partida.noticias, onContinuar: irADashboard });
  }

  function finDeCarrera() {
    const legado = calcularLegado(partida);
    partida = { ...partida, legado };
    persistir();
    renderLegado(contenedor, {
      legado,
      jugador: partida.jugador,
      onNuevaCarrera: () => {
        borrar(storage);
        partida = null;
        arrancar();
      },
    });
  }

  function arrancar() {
    if (partida && !partida.terminada) return irADashboard();
    if (partida && partida.terminada && partida.legado) return finDeCarrera();
    renderCreacion(contenedor, {
      onComenzar: (jugador) => {
        const semilla = Date.now();
        partida = crearPartida({ jugador, semilla });
        rng = createRng(semilla + 7777);
        irADashboard();
      },
    });
  }

  arrancar();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  iniciar();
}
```

- [ ] **Step 8: Ajustar `aplicarCarta` para aceptar cartas sin título**

`beatSparring` llama `aplicarCarta(jugador, { mods })` sin `titulo`. Verificar en `src/core/cards.js` que `aplicarCarta` solo lee `carta.mods` — si toca cualquier otro campo de la carta, quitarlo. No hace falta cambiar la firma.

Run: `npx vitest run tests/core/cards.test.js`
Expected: PASS.

- [ ] **Step 9: Correr los tests nuevos**

Run: `npx vitest run tests/ui/legacy.test.js tests/integration/partida.test.js`
Expected: PASS (18 tests).

- [ ] **Step 10: Correr toda la suite**

Run: `npm test`
Expected: PASS — todos los tests del proyecto en verde.

- [ ] **Step 11: Verificación manual en el navegador**

Run: `npm run dev`

Abrir la URL que imprime Vite y confirmar, con los ojos:
1. Aparece la pantalla de creación; "Sorprendeme" completa los campos.
2. Al empezar se ve el dashboard con MEDIA, récord, atributos y la paleta oscura con rojo.
3. "Continuar" trae la carta de mejora con tres opciones y sus modificadores.
4. Llega una oferta, se puede negociar, hacer el careo, elegir plan y pelear round por round.
5. El rincón aparece entre rounds; si el rival queda groggy aparece el golpe de gracia con su temporizador.
6. La tienda abre desde el ícono del banner y permite comprar.
7. Al recargar la página, la carrera continúa donde estaba (autoguardado).
8. Al terminar la carrera se ve la pantalla de legado con los cinco legados y la biografía.

- [ ] **Step 12: Build de producción**

Run: `npm run build`
Expected: genera `dist/` sin errores. Ese directorio es lo que se publica por link.

- [ ] **Step 13: Commit**

```bash
git add src/ui/screens/news.js src/ui/screens/legacy.js src/ui/screens/profile.js src/main.js tests/ui/legacy.test.js tests/integration/partida.test.js
git commit -m "feat: noticias, pantalla de legado y armado completo del juego"
```

---

## Notas de implementación

- **Orden de las tareas.** Las 1-19 construyen el núcleo y son independientes de la UI; las 20-24 arman la interfaz sobre ese núcleo. Se pueden ejecutar en orden estricto; la 24 depende de todas.
- **Si un test de balance falla por poco** (cantidad de beats, porcentaje de victorias, frecuencia de lesiones), ajustar la constante que indica el paso correspondiente — no reescribir el test para que pase. Los rangos están puestos anchos a propósito.
- **`ultimosDeltas`** se usa solo para pintar las flechas ▲ del dashboard; es un campo opcional de la partida y no afecta la lógica.
- **Publicación.** El resultado de `npm run build` (`dist/`) se sube a cualquier hosting estático gratuito. No hay variables de entorno ni secretos.

