# Campamento de preparación (semanas antes de la pelea) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al aceptar una oferta de pelea, la pelea queda firmada para dentro de N semanas en vez de resolverse en el acto. El jugador vuelve al tablero y pasa por un campamento de 2 o 3 beats (entrenamiento temático + sparring) antes de que se dispare la pelea (careo → plan → pelear).

**Architecture:** Nuevo módulo `src/core/campamento.js` decide el largo del campamento (2-3 beats, según el nivel de la pelea) y arma esos beats con contenido de un nuevo catálogo `src/content/cards-camp.js`. `career.js` gana una función exportada `firmarPelea(partida, { oferta })` que el jugador llama al aceptar (después de negociar): mete los beats de campamento al frente de `cola`, deja `proximaPelea` con el `semanaObjetivo` real, y `siguienteBeat` avanza `semanaGlobal` a medida que se consumen esos beats (mismo sistema de calendario que ya existe, sin inventar uno nuevo). El último beat del campamento trae `datos.ultimo = true`; `main.js` lo usa para saltar a careo/plan/pelear en vez de volver al tablero.

**Tech Stack:** JS puro, ES modules, Vitest + happy-dom, rng con semilla (rng.js), sin dependencias nuevas.

## Global Constraints

- Nada de `Math.random()` en `src/core/` — todo el azar pasa por el rng con semilla que viaja en `partida.rngEstado`.
- `src/core/` no muta sus argumentos; todo tiene que ser serializable a JSON.
- Lógica en `src/core/`, contenido en `src/content/`, DOM solo en `src/ui/`.
- Se puede seguir rechazando la pelea hasta que se firma (nada cambia ahí: el rechazo sigue pasando ANTES de `firmarPelea`).
- Usar `partida.proximaPelea`, `semanasHastaPelea(partida)` y `fechaDe` de `src/core/calendario.js` tal cual existen — no un segundo sistema de tiempo.
- Presupuesto de ritmo: 30-60 beats/carrera, 12-22 peleas/carrera, ≥85% de carreras "jugando bien" con los tres cinturones. Medir con `node scripts/balance-sim.mjs 400` antes y después de cada cambio de probabilidad.
- Español rioplatense, voz de crónica de box, sin emojis.
- Vitest + happy-dom, nada de `.only`/`.skip`.
- Commits chicos y frecuentes (TDD: test rojo → implementación → verde → commit).

---

### Task 1: Catálogo de contenido del campamento

**Files:**
- Create: `src/content/cards-camp.js`
- Test: `tests/content/cards-camp.test.js` (si existe convención de test de contenido; si no, alcanza con el test de `campamento.js` en Task 2 ejercitando el catálogo)

**Interfaces:**
- Produce: `CARTAS_CAMPAMENTO` — array de cartas con la MISMA forma que `CARTAS_EVENTO` (`src/content/cards-events.js`): `{ id, categoria:'campamento', titulo, texto, etapas, rareza, opciones:[{id, texto, mods}, ...] }`. `texto` y `opciones[].texto` pueden contener el marcador `{rival}` (se rellena en `campamento.js`, mismo patrón que `rellenar` en `offers.js`).

- [ ] **Step 1: Escribir el catálogo**

Construir ~9-10 cartas temáticas de campamento (trabajo específico contra el estilo del rival, el peso, la concentración, sparring pesado, prensa/distracciones, descanso táctico), cada una con 2 opciones que representen la disciplina (mods positivos en atributos/forma, con algo de costo en fatiga) contra la distracción (mods negativos en forma/moral, a veces algo de dinero o fama a cambio). Mods SOLO sobre atributos existentes y `forma`/`fatiga`/`moral` (nunca dinero directo en camp: mantiene el campamento enfocado en preparación física/mental). Usar `{rival}` en el texto de al menos la mitad de las cartas. 7-8 `rareza:'normal'`, 2 `rareza:'rara'`, sin legendarias (el campamento es corto, no hace falta ese golpe de suerte ahí).

- [ ] **Step 2: Commit**

```bash
git add src/content/cards-camp.js
git commit -m "content: agrega catalogo de cartas de campamento"
```

---

### Task 2: `src/core/campamento.js` — decidir largo y armar los beats

**Files:**
- Create: `src/core/campamento.js`
- Test: `tests/core/campamento.test.js`

**Interfaces:**
- Consumes: `rng` (de `rng.js`, con `.chance/.int/.weighted`), `elegirPorRareza` (`cards.js`), `crearSparring` (`sparring.js`), `CARTAS_CAMPAMENTO` (Task 1).
- Produces:
  - `decidirLargoCampamento(rng, oferta) -> 2 | 3`
  - `elegirCartaCampamento(rng, { etapa, oferta }) -> carta` (con `{rival}` ya reemplazado por `oferta.rivalApodo` en `texto` y en cada `opciones[].texto`)
  - `armarBeatsCampamento(rng, { jugador, etapa, oferta, semanaInicial }) -> { beats, semanaObjetivo }`
    - `beats`: array de 2 o 3 objetos `{ tipo: 'campCarta'|'campSparring', datos: { oferta, semanas, ultimo, carta? , sparring? } }`.
    - Composición fija: largo 2 → `['campCarta','campSparring']`; largo 3 → `['campCarta','campSparring','campCarta']` (el sparring pedido explícitamente por el usuario SIEMPRE aparece en el campamento).
    - `datos.semanas` de cada beat suma exactamente `semanaObjetivo - semanaInicial` (repartido con `Math.floor`, el resto va al último beat).
    - `datos.ultimo` es `true` solo en el último beat del array.
    - `semanaObjetivo = semanaInicial + (largo * SEMANAS_POR_BEAT_CAMPAMENTO)`.

- [ ] **Step 1: Test — `decidirLargoCampamento` da 2 o 3, nunca otra cosa, y con rng fijo es determinista**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { decidirLargoCampamento } from '../../src/core/campamento.js';

describe('decidirLargoCampamento', () => {
  it('siempre devuelve 2 o 3', () => {
    const ofertaTitulo = { esTitulo: true };
    const ofertaComun = { esTitulo: false };
    for (let s = 1; s <= 200; s++) {
      const rng = createRng(s);
      expect([2, 3]).toContain(decidirLargoCampamento(rng, ofertaTitulo));
      expect([2, 3]).toContain(decidirLargoCampamento(rng, ofertaComun));
    }
  });

  it('una pelea de titulo tiene mas chance de campamento largo que una comun', () => {
    let largosTitulo = 0;
    let largosComunes = 0;
    const N = 500;
    for (let s = 1; s <= N; s++) {
      if (decidirLargoCampamento(createRng(s), { esTitulo: true }) === 3) largosTitulo += 1;
      if (decidirLargoCampamento(createRng(s + 100000), { esTitulo: false }) === 3) largosComunes += 1;
    }
    expect(largosTitulo / N).toBeGreaterThan(largosComunes / N);
  });
});
```

- [ ] **Step 2: Run — falla (`campamento.js` no existe)**

Run: `npx vitest run tests/core/campamento.test.js`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implementar `decidirLargoCampamento`**

```js
import { elegirPorRareza } from './cards.js';
import { crearSparring } from './sparring.js';
import { CARTAS_CAMPAMENTO } from '../content/cards-camp.js';

// Cuántas veces sale un campamento LARGO (3 beats) en vez de corto (2): bajo
// a propósito (ver el informe de balance en el plan) — el presupuesto de
// ritmo (30-60 beats/carrera) no entra si el campamento promedio se acerca a
// 3. Una pelea de título/defensa merece más ceremonia que una de relleno,
// así que su chance es mayor, pero sigue siendo la excepción, no la regla.
const PROB_LARGO = { esTitulo: 0.35, normal: 0.1 };

export const SEMANAS_POR_BEAT_CAMPAMENTO = 3;

export function decidirLargoCampamento(rng, oferta) {
  const prob = oferta.esTitulo ? PROB_LARGO.esTitulo : PROB_LARGO.normal;
  return rng.chance(prob) ? 3 : 2;
}
```

- [ ] **Step 4: Run — pasa**

Run: `npx vitest run tests/core/campamento.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Test — `elegirCartaCampamento` rellena `{rival}` y respeta `etapa`**

```js
it('rellena el marcador {rival} con el apodo del rival en texto y opciones', () => {
  const rng = createRng(1);
  const oferta = { rivalApodo: 'El Zurdo', esTitulo: false };
  const carta = elegirCartaCampamento(rng, { etapa: 'profesional', oferta });
  expect(carta.texto).not.toMatch(/\{rival\}/);
  carta.opciones.forEach((o) => expect(o.texto).not.toMatch(/\{rival\}/));
});

it('nunca elige una carta que no aplique a la etapa', () => {
  for (let s = 1; s <= 100; s++) {
    const rng = createRng(s);
    const carta = elegirCartaCampamento(rng, { etapa: 'juvenil', oferta: { rivalApodo: 'X', esTitulo: false } });
    expect(carta.etapas).toContain('juvenil');
  }
});
```

- [ ] **Step 6: Implementar `elegirCartaCampamento`**

```js
function rellenar(texto, oferta) {
  return texto.replace(/\{rival\}/g, oferta.rivalApodo);
}

export function elegirCartaCampamento(rng, { etapa, oferta }) {
  const elegibles = CARTAS_CAMPAMENTO.filter((c) => c.etapas.includes(etapa));
  const fuente = elegibles.length > 0 ? elegibles : CARTAS_CAMPAMENTO;
  const carta = elegirPorRareza(rng, fuente);
  return {
    ...carta,
    texto: rellenar(carta.texto, oferta),
    opciones: carta.opciones.map((o) => ({ ...o, texto: rellenar(o.texto, oferta) })),
  };
}
```

- [ ] **Step 7: Run — pasa**

Run: `npx vitest run tests/core/campamento.test.js`
Expected: PASS

- [ ] **Step 8: Test — `armarBeatsCampamento`: largo, composición, semanas, `ultimo`, sin mutar `rng`/args**

```js
describe('armarBeatsCampamento', () => {
  it('arma 2 o 3 beats, con exactamente un campSparring y el resto campCarta', () => {
    const rng = createRng(3);
    const oferta = { rivalApodo: 'El Zurdo', esTitulo: false };
    const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
      jugador: jugadorDePrueba(), etapa: 'profesional', oferta, semanaInicial: 10,
    });
    expect([2, 3]).toContain(beats.length);
    expect(beats.filter((b) => b.tipo === 'campSparring')).toHaveLength(1);
    expect(beats.filter((b) => b.tipo === 'campCarta')).toHaveLength(beats.length - 1);
    expect(semanaObjetivo).toBeGreaterThan(10);
  });

  it('el ultimo beat, y solo el ultimo, trae datos.ultimo = true', () => {
    const rng = createRng(4);
    const { beats } = armarBeatsCampamento(rng, {
      jugador: jugadorDePrueba(), etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: true }, semanaInicial: 1,
    });
    beats.forEach((b, i) => expect(b.datos.ultimo).toBe(i === beats.length - 1));
  });

  it('las semanas de los beats suman exactamente semanaObjetivo - semanaInicial', () => {
    const rng = createRng(5);
    const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
      jugador: jugadorDePrueba(), etapa: 'profesional', oferta: { rivalApodo: 'X', esTitulo: false }, semanaInicial: 20,
    });
    const suma = beats.reduce((a, b) => a + b.datos.semanas, 0);
    expect(suma).toBe(semanaObjetivo - 20);
  });

  it('cada beat.datos.oferta es la oferta recibida', () => {
    const rng = createRng(6);
    const oferta = { rivalApodo: 'X', esTitulo: false };
    const { beats } = armarBeatsCampamento(rng, { jugador: jugadorDePrueba(), etapa: 'profesional', oferta, semanaInicial: 1 });
    beats.forEach((b) => expect(b.datos.oferta).toBe(oferta));
  });
});
```

(`jugadorDePrueba()` — usar el mismo helper `crearPeleador(...)` que ya usan `career.test.js`/`sparring.test.js`.)

- [ ] **Step 9: Run — falla**

Run: `npx vitest run tests/core/campamento.test.js`
Expected: FAIL (`armarBeatsCampamento` no definida)

- [ ] **Step 10: Implementar `armarBeatsCampamento`**

```js
function repartirSemanas(total, partes) {
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  return Array.from({ length: partes }, (_, i) => (i === partes - 1 ? base + resto : base));
}

export function armarBeatsCampamento(rng, {
  jugador, etapa, oferta, semanaInicial,
}) {
  const largo = decidirLargoCampamento(rng, oferta);
  const semanaObjetivo = semanaInicial + largo * SEMANAS_POR_BEAT_CAMPAMENTO;
  const semanas = repartirSemanas(largo * SEMANAS_POR_BEAT_CAMPAMENTO, largo);
  // Composición fija (Task v3, pedido textual: "que el sparring aparezca más
  // seguido" — un campamento SIEMPRE tiene su sesión de sparring, nunca
  // depende del azar como el beat de sparring suelto de career.js).
  const orden = largo === 2 ? ['carta', 'sparring'] : ['carta', 'sparring', 'carta'];

  const beats = orden.map((clase, i) => {
    const ultimo = i === orden.length - 1;
    if (clase === 'sparring') {
      return {
        tipo: 'campSparring',
        datos: {
          sparring: crearSparring(rng, { jugador }), oferta, semanas: semanas[i], ultimo,
        },
      };
    }
    return {
      tipo: 'campCarta',
      datos: {
        carta: elegirCartaCampamento(rng, { etapa, oferta }), oferta, semanas: semanas[i], ultimo,
      },
    };
  });

  return { beats, semanaObjetivo };
}
```

- [ ] **Step 11: Run — pasa**

Run: `npx vitest run tests/core/campamento.test.js`
Expected: PASS (todos los tests de campamento.js)

- [ ] **Step 12: Commit**

```bash
git add src/core/campamento.js tests/core/campamento.test.js
git commit -m "feat: arma los beats de campamento (largo, sparring garantizado, semanas)"
```

---

### Task 3: `career.js` — `firmarPelea` y `siguienteBeat` avanzando semanas de campamento

**Files:**
- Modify: `src/core/career.js`
- Test: `tests/core/career.test.js`

**Interfaces:**
- Consumes: `armarBeatsCampamento` (Task 2).
- Produces: `export function firmarPelea(partida, { oferta }) -> partida` (nueva, no muta `partida`; usa `rngDe`/clonarPartida igual que el resto del archivo). Deja `partida.cola` con los beats de campamento AL FRENTE de lo que ya hubiera, y `partida.proximaPelea = { oferta, semanaObjetivo }`.
- `siguienteBeat` (ya existe): al hacer `cola.shift()`, si el beat es `campCarta`/`campSparring`, suma `beat.datos.semanas` a `nueva.semanaGlobal` antes de devolver.

- [ ] **Step 1: Test — `firmarPelea` mete los beats de campamento al frente de la cola y fija `proximaPelea`**

```js
import { firmarPelea } from '../../src/core/career.js';

describe('firmarPelea', () => {
  it('mete los beats de campamento al frente de la cola', () => {
    const p = nuevaPartida(1);
    p.etapaIndice = 2; // profesional
    const conCola = { ...p, cola: [{ tipo: 'noticias', datos: {} }] };
    const oferta = { rivalApodo: 'X', esTitulo: false, rivalId: 'r1' };
    const firmada = firmarPelea(conCola, { oferta });
    expect(['campCarta', 'campSparring']).toContain(firmada.cola[0].tipo);
    expect(firmada.cola[firmada.cola.length - 1].tipo).toBe('noticias');
    expect(firmada.proximaPelea.oferta).toBe(oferta);
    expect(firmada.proximaPelea.semanaObjetivo).toBeGreaterThan(p.semanaGlobal);
  });

  it('no muta la partida original', () => {
    const p = nuevaPartida(2);
    const antes = JSON.stringify(p);
    firmarPelea(p, { oferta: { rivalApodo: 'X', esTitulo: false, rivalId: 'r1' } });
    expect(JSON.stringify(p)).toBe(antes);
  });
});
```

- [ ] **Step 2: Run — falla**

Run: `npx vitest run tests/core/career.test.js -t firmarPelea`
Expected: FAIL (`firmarPelea` no exportada)

- [ ] **Step 3: Implementar `firmarPelea` en `career.js`**

Agregar import `armarBeatsCampamento` de `./campamento.js`, y la función (después de `armarCola`, antes de `siguienteBeat`):

```js
export function firmarPelea(partida, { oferta }) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);
  const { beats, semanaObjetivo } = armarBeatsCampamento(rng, {
    jugador: nueva.jugador, etapa: etapa.id, oferta, semanaInicial: nueva.semanaGlobal ?? 1,
  });
  nueva.cola = [...beats, ...nueva.cola];
  nueva.proximaPelea = { oferta, semanaObjetivo };
  nueva.rngEstado = rng.estado();
  return nueva;
}
```

- [ ] **Step 4: Run — pasa**

Run: `npx vitest run tests/core/career.test.js -t firmarPelea`
Expected: PASS

- [ ] **Step 5: Test — `siguienteBeat` avanza `semanaGlobal` al consumir un beat de campamento**

```js
it('siguienteBeat avanza semanaGlobal al consumir un beat de campamento', () => {
  const p = nuevaPartida(3);
  const firmada = firmarPelea(p, { oferta: { rivalApodo: 'X', esTitulo: false, rivalId: 'r1' } });
  const semanaAntes = firmada.semanaGlobal;
  const paso = siguienteBeat(firmada);
  expect(['campCarta', 'campSparring']).toContain(paso.beat.tipo);
  expect(paso.partida.semanaGlobal).toBe(semanaAntes + paso.beat.datos.semanas);
});

it('consumiendo todo el campamento, semanaGlobal llega exactamente a semanaObjetivo', () => {
  const p = nuevaPartida(3);
  let actual = firmarPelea(p, { oferta: { rivalApodo: 'X', esTitulo: false, rivalId: 'r1' } });
  const objetivo = actual.proximaPelea.semanaObjetivo;
  let ultimoBeat = null;
  for (let i = 0; i < 5 && !ultimoBeat; i++) {
    const paso = siguienteBeat(actual);
    actual = paso.partida;
    if (paso.beat.datos.ultimo) ultimoBeat = paso.beat;
  }
  expect(ultimoBeat).not.toBeNull();
  expect(actual.semanaGlobal).toBe(objetivo);
});
```

- [ ] **Step 6: Run — falla**

Run: `npx vitest run tests/core/career.test.js -t "avanza semanaGlobal"`
Expected: FAIL (semanaGlobal no se mueve todavía)

- [ ] **Step 7: Implementar en `siguienteBeat`**

En `career.js`, justo después de `const beat = nueva.cola.shift() ?? null;`:

```js
  const beat = nueva.cola.shift() ?? null;
  if (beat && (beat.tipo === 'campCarta' || beat.tipo === 'campSparring')) {
    nueva.semanaGlobal = (nueva.semanaGlobal ?? 1) + (beat.datos.semanas ?? 0);
  }
  nueva.beatActual = beat;
```

- [ ] **Step 8: Run — pasa**

Run: `npx vitest run tests/core/career.test.js`
Expected: PASS (todo el archivo)

- [ ] **Step 9: Commit**

```bash
git add src/core/career.js tests/core/career.test.js
git commit -m "feat: firmarPelea encola el campamento y siguienteBeat avanza semanaGlobal"
```

---

### Task 4: UI — `main.js` orquesta firmar → campamento → careo/plan/pelear

**Files:**
- Modify: `src/main.js`
- Modify: `src/ui/screens/sparring.js` (agregar `titulo`/`bajada` opcionales, con los valores actuales como default — no rompe el beat de sparring suelto que ya existe)
- Test: no hay tests de `main.js` hoy (UI, sin test unitario) — verificar a mano con `npm run dev` o con el flujo `run` si se pide, y confiar en los tests de `core/` + un smoke manual.

**Interfaces:**
- Consumes: `firmarPelea` (career.js, Task 3), `resolverOpcion` (events.js, ya importado), `registrarGolpe`/`resultadoSparring` (sparring.js, ya importado), `careo`/`elegirPlan` (ya existen en `main.js`).

- [ ] **Step 1: Cablear `jugarBeat` para los dos tipos nuevos**

En `jugarBeat`, agregar:
```js
if (beat.tipo === 'campCarta') return beatCampCarta(beat);
if (beat.tipo === 'campSparring') return beatCampSparring(beat);
```

- [ ] **Step 2: `negociar(...).onCerrar` firma en vez de ir directo a careo**

Reemplazar:
```js
onCerrar: () => {
  const final = resultadoNegociacion(negociacion);
  careo({ ...oferta, bolsa: final.bolsa });
},
```
por:
```js
onCerrar: () => {
  const final = resultadoNegociacion(negociacion);
  partida = firmarPelea(partida, { oferta: { ...oferta, bolsa: final.bolsa } });
  irADashboard();
},
```

- [ ] **Step 3: `beatCampCarta` — mismo patrón que `beatCarta`, pero al terminar decide entre `irADashboard` y `careo`**

```js
function beatCampCarta(beat) {
  const { carta, oferta, ultimo } = beat.datos;
  centro(() => renderPanelDecision(centroContenido(), {
    titulo: 'Campamento',
    bajada: carta.titulo,
    texto: carta.texto,
    rareza: carta.rareza,
    opciones: carta.opciones.map((o) => opcionCartaAOpcion(o, 'pesa')),
    onElegir: (id) => {
      const opcion = carta.opciones.find((o) => o.id === id);
      const resuelto = resolverOpcion(rng, {
        jugador: partida.jugador, carta, opcionId: id, rivalidades: partida.rivalidades,
      });
      if (ultimo) {
        partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
        careo(oferta);
        return;
      }
      aplicarEfectoYSeguir({ jugador: resuelto.jugador, rivalidades: resuelto.rivalidades, deltas: resuelto.deltas });
    },
  }));
}
```

(Las cartas de campamento no usan `probabilidades` en Task 1, así que no hace falta el camino de `animarRoll` — si algún día se agrega una carta con `probabilidades`, hay que replicar ese camino de `beatCarta`.)

- [ ] **Step 4: `beatCampSparring` — mismo patrón que `beatSparring`, con el mismo desenlace condicional**

```js
function beatCampSparring(beat) {
  let sparring = beat.datos.sparring;
  const { oferta, ultimo } = beat.datos;
  const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);

  function pintarSparring() {
    renderSparring(centroContenido(), {
      sparring,
      jugador: partida.jugador,
      titulo: `Campamento · contra ${rival ? `"${rival.apodo}"` : oferta.rivalApodo}`,
      bajada: 'Últimos rounds antes de la pelea',
      onGolpe: (evento) => {
        sparring = registrarGolpe(sparring, evento);
        pintarSparring();
      },
      onTerminar: () => {
        const resultado = resultadoSparring(sparring, partida.jugador);
        const aplicado = aplicarCarta(partida.jugador, { mods: resultado.mods });
        if (ultimo) {
          partida = { ...partida, jugador: aplicado.jugador };
          careo(oferta);
          return;
        }
        aplicarEfectoYSeguir({ jugador: aplicado.jugador, deltas: aplicado.deltas });
      },
    });
  }

  centro(pintarSparring);
}
```

- [ ] **Step 5: `renderSparring` acepta título/bajada opcionales**

En `src/ui/screens/sparring.js`, cambiar la firma y las dos líneas de cabecera:
```js
export function renderSparring(contenedor, {
  sparring, jugador, onGolpe, onTerminar,
  titulo = `Entrenamiento · ${jugador.gimnasio}`, bajada = 'Sparring de reflejos',
}) {
  ...
  el('div', { class: 'etiqueta', text: titulo }),
  el('h1', { text: bajada }),
  ...
}
```

- [ ] **Step 6: Import `firmarPelea` en `main.js`**

```js
import { crearPartida, siguienteBeat, firmarPelea } from './core/career.js';
```

- [ ] **Step 7: Verificar el flujo a mano**

Run: `npm run dev`, crear un peleador, llegar a la etapa profesional, aceptar una oferta, confirmar que:
  - Vuelve al tablero (no a la pelea).
  - El módulo "Próxima pelea" muestra la cuenta en semanas y el rival firmado.
  - Aparecen 2-3 beats de campamento (uno de ellos el minijuego de sparring).
  - Al terminar el último, entra a careo/plan/pelea con normalidad.
  - Guardar a mitad de campamento (recargar la página) retoma bien: la cuenta sigue siendo coherente.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/ui/screens/sparring.js
git commit -m "feat: cablea el campamento en el tablero (firmar, campCarta, campSparring)"
```

---

### Task 5: Rebalance — medir y ajustar el presupuesto de ritmo

**Files:**
- Modify: `scripts/balance-sim.mjs` (simular firmar+campamento en vez de resolver la oferta en el acto)
- Modify: `tests/core/career.test.js` (`jugarGanandoTodo` debe pasar por `firmarPelea` + consumir el campamento, para que el test de 30-60 beats y el de 85% cinturones midan el camino real)
- Modify: `src/core/career.js` (`ETAPAS`: `probEvento`/`probRedes`/`probSparring`/`PERIODO_NOTICIAS`, lo que haga falta tocar)
- Modify: `src/core/campamento.js` (`PROB_LARGO` si hace falta bajarla más)

**Interfaces:**
- Ninguna nueva; este task solo ajusta constantes y helpers de test/medición ya definidos en los tasks anteriores.

- [ ] **Step 1: Actualizar `jugarGanandoTodo` (career.test.js) para simular el camino real**

Al toparse con un beat `'oferta'`, en vez de resolver la pelea ahí mismo, llamar `firmarPelea` y seguir consumiendo beats (incluidos `campCarta`/`campSparring`, aplicando su efecto con la misma cabecera "elegir la opción con más mods positivos" que ya usa el resto del helper) hasta toparse con el beat que trae `datos.ultimo === true`; ahí sí resolver `aplicarResultado` con victoria.

- [ ] **Step 2: Espejar el mismo cambio en `scripts/balance-sim.mjs`** (`jugarCarrera`)

Mismo patrón: al ver `beat.tipo === 'oferta'`, llamar `firmarPelea`, seguir el loop consumiendo `campCarta`/`campSparring` (aplicando mods, contándolos en `beats` igual que cualquier otro), y recién sumar el resultado de la pelea cuando aparece el beat `ultimo`.

- [ ] **Step 3: Correr la línea de base CON el camino real (antes de tocar ninguna probabilidad)**

Run: `node scripts/balance-sim.mjs 400`
Anotar los tres números clave: beats/carrera avg y dentro-de-[30,60], ofertas/carrera avg y dentro-de-[12,22], % con los tres cinturones.

- [ ] **Step 4: Si beats/carrera se pasa de 60 (va a pasar), recortar**

Candidatos, en este orden (medir después de CADA uno, no todos juntos):
1. `PERIODO_NOTICIAS` (career.js): subirlo (menos beats de noticias).
2. `probSparring` por etapa: bajarlo fuerte o llevarlo a 0 en `profesional` (el campamento ya garantiza sparring en cada pelea; el suelto se vuelve redundante ahí).
3. `probEvento`/`probRedes` por etapa: bajarlos, sobre todo en `profesional` (11 de los 20 bloques).
4. `PROB_LARGO` (campamento.js): bajar más la chance de campamento de 3 beats.
5. Solo si nada de lo anterior alcanza: bajar `probPelea` en `profesional` (impacta directo el eje de 12-22 peleas — tocar último y con cuidado).

- [ ] **Step 5: Re-correr `node scripts/balance-sim.mjs 400` después de cada ajuste, iterar hasta que:**
- beats/carrera: 30-60 en (casi) todas las semillas, avg cómodo por debajo de 60 (dejar margen, apuntar a que el max tampoco toque el techo).
- ofertas/carrera: avg dentro de 12-22, piso duro ≥8 en todas las semillas.
- 3 cinturones: ≥85% en la corrida "creación real" (o la que use el harness actualizado).

- [ ] **Step 6: Correr la suite completa**

Run: `npx vitest run`
Expected: todo verde, incluidos los tests de ritmo/cinturones de `career.test.js` (que ahora miden el camino real con campamento).

- [ ] **Step 7: `npm run build`**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 8: Commit**

```bash
git add scripts/balance-sim.mjs tests/core/career.test.js src/core/career.js src/core/campamento.js
git commit -m "chore: rebalancea el ritmo de la carrera para el presupuesto de campamento"
```

(Si después de iterar el presupuesto NO entra sin sacrificar un eje importante — p. ej. hay que bajar tanto `probPelea` que las peleas caen debajo de 12, o bajar tanto el contenido suelto que la carrera se siente vacía — parar acá y reportarlo con los números en vez de forzarlo.)
