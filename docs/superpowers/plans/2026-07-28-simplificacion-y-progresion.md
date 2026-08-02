# Simplificación y progresión — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL REQUERIDA: usar
> superpowers:subagent-driven-development. Los pasos usan checkbox (`- [ ]`).

**Objetivo:** Pasar de 6 atributos + 5 estados a **4 atributos**, reescribir
todas las tarjetas para que cada decisión mueva la media de forma visible, y
hacer que cada partida se sienta distinta — con carreras que pueden no llegar
al mundial.

**Arquitectura:** El cambio nace en `src/core/stats.js` (la definición de qué
es un peleador) y se propaga a combate, progresión, contenido e interfaz. La
media pasa a ser el promedio simple de los cuatro atributos, lo que fija la
aritmética de diseño: **+4 en un atributo = +1 de media exacto**. La varianza
entre partidas sale de tres campos nuevos en el peleador (reparto inicial,
talento, curva) que nunca se muestran como números.

**Stack:** JS puro, módulos ES, Vite, Vitest + happy-dom. Sin dependencias
nuevas.

**Spec:** `docs/superpowers/specs/2026-07-28-simplificacion-y-progresion.md`

## Restricciones globales

- **Nada de `Math.random()` en `src/core/`.** Todo el azar pasa por el rng con
  semilla; su estado viaja dentro de la partida.
- El núcleo **no muta sus argumentos**; todo serializable a JSON.
- El autoguardado **nunca puede tirar excepción**.
- **Nada de la interfaz se mueve solo**: los bloques quietos, nada reacomoda a
  nada al aparecer contenido.
- **Toda tarjeta con tamaño fijo**, título y descripción incluidos.
- La garantía central: montar contenido en la región central del tablero
  **nunca redibuja las columnas laterales** (probada por identidad de nodo).
- Banderas SVG, **nunca emojis de bandera**. Otros emojis sí, con criterio.
- **Las legendarias no se nerfean**: son raras y desbalancean a propósito.
- Español rioplatense, voz de crónica de box.
- Vitest + happy-dom. Nada de `.only` ni `.skip`.
- **Objetivos de balance nuevos** (reemplazan al viejo "≥85% tres cinturones"):
  al menos un cinturón en **85-90%** de las carreras bien jugadas; **el mundial
  en 20-25%**. Peleas profesionales: **~30-32**. Partida: **27-30 minutos**.

## Mapa de archivos

| Archivo | Responsabilidad después del cambio |
|---|---|
| `src/core/stats.js` | Los 4 atributos, sus etiquetas y límites. Sin estados salvo la lesión. |
| `src/core/fighter.js` | Crear peleadores con reparto inicial, talento y curva. `mediaDe` = promedio simple. |
| `src/core/talento.js` (nuevo) | Talento, curva de maduración y su lectura en señales. |
| `src/core/fight.js` | Combate sobre los 4 atributos. Fatiga interna alimentada por cardio. |
| `src/core/career.js` | Ritmo de 3 decisiones al año. Declive desde 34 acelerado por castigo. |
| `src/core/tramite.js` | Peleas por año según el momento de la carrera. |
| `src/core/cards.js` | Aplicar cartas sobre 4 atributos. |
| `src/content/cards-*.js` | Reescritos: 2 opciones, efectos de +3/+4. |
| `src/ui/screens/panel-peleador.js` | Tablero con 4 atributos, sin estados ni fama. |

---

# BLOQUE 1 — El núcleo de los cuatro atributos

## Task 1.1 · `stats.js`: cuatro atributos, sin estados

**Files:** modificar `src/core/stats.js`; `tests/core/stats.test.js`.

**Interfaces:**
- Produce: `ATRIBUTOS = ['fuerza', 'defensa', 'cardio', 'agilidad']`,
  `ETIQUETAS` con `{ corta, larga }` por atributo, `crearAtributos(valores)`,
  `crearEstado()` → `{ lesion: null }`, `LIMITES_ATRIBUTO = { min: 1, max: 99 }`,
  `clamp`, `aplicarModificadores`, `RANGOS_MEDIA`, `rangoDeMedia`.

- [ ] **Paso 1: test que falla**

```js
it('define exactamente los cuatro atributos', () => {
  expect(ATRIBUTOS).toEqual(['fuerza', 'defensa', 'cardio', 'agilidad']);
});

it('el estado ya no lleva forma, moral ni fatiga: solo la lesión', () => {
  expect(crearEstado()).toEqual({ lesion: null });
});
```

- [ ] **Paso 2:** `npx vitest run tests/core/stats.test.js` → FALLA.
- [ ] **Paso 3:** reescribir `ATRIBUTOS`, `ETIQUETAS` (solo los cuatro),
  `crearEstado`. **Borrar** `LIMITES_ESTADO` y toda referencia a forma, moral,
  fatiga, mentón, disciplina personal, técnica, IQ, potencia, velocidad y
  grappling.
- [ ] **Paso 4:** el test pasa. El resto de la suite va a romper en masa: es
  esperado, se arregla en las tareas siguientes.
- [ ] **Paso 5:** commit `feat(core): cuatro atributos, sin estados`.

## Task 1.2 · `fighter.js`: media simple y reparto inicial variable

**Files:** modificar `src/core/fighter.js`; `tests/core/fighter.test.js`.

**Interfaces:**
- Consume: `ATRIBUTOS`, `crearAtributos`, `clamp` de `stats.js`.
- Produce: `mediaDe(peleador)` (promedio simple de los 4, redondeado),
  `crearPeleador({ ..., media, rng })` con reparto desigual,
  `repartirAtributosIniciales(rng, mediaObjetivo)` → `{ fuerza, defensa, cardio, agilidad }`.

**Por qué el reparto desigual:** con cuatro atributos, arrancar 55 de fuerza y
28 de cardio da un peleador completamente distinto a uno parejo en 40, y
obliga al jugador a decidir si tapa el agujero o potencia lo suyo.

- [ ] **Paso 1: test que falla**

```js
it('la media es el promedio simple de los cuatro atributos', () => {
  const p = crearPeleador({ apellido: 'Ortiz', /* ... */ });
  p.atributos = { fuerza: 40, defensa: 50, cardio: 60, agilidad: 70 };
  expect(mediaDe(p)).toBe(55);
});

it('reparte desigual: dos peleadores con la misma media tienen perfiles distintos', () => {
  const a = repartirAtributosIniciales(createRng(1), 40);
  const b = repartirAtributosIniciales(createRng(2), 40);
  const spread = (x) => Math.max(...Object.values(x)) - Math.min(...Object.values(x));
  expect(spread(a)).toBeGreaterThan(8);
  expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
});

it('respeta la media objetivo dentro de un punto', () => {
  for (let s = 1; s <= 30; s += 1) {
    const at = repartirAtributosIniciales(createRng(s), 42);
    const media = Math.round(Object.values(at).reduce((x, y) => x + y, 0) / 4);
    expect(Math.abs(media - 42)).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar. `mediaDe` deja de usar `calcularMedia` con pesos
  por disciplina — es promedio simple, y esa es la razón de que `+4 en uno =
  +1 de media`. `repartirAtributosIniciales` reparte un desvío con el rng
  alrededor de la media objetivo, manteniendo la suma.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): media simple y reparto inicial desigual`.

## Task 1.3 · Guardados viejos: empezar limpio

**Files:** modificar `src/core/save.js`; `tests/core/save.test.js`.

Una partida guardada con seis atributos y cinco estados **no se puede migrar**:
sus números no significan lo mismo. Tiene que caer en carrera nueva, sin
pantalla en blanco ni excepción.

- [ ] **Paso 1: test que falla**

```js
it('una partida con el esquema viejo se descarta sin romper', () => {
  const viejo = JSON.stringify({ version: 1, jugador: { atributos: { potencia: 50, iq: 40 } } });
  const storage = { getItem: () => viejo, setItem: () => {}, removeItem: () => {} };
  expect(() => cargar(storage)).not.toThrow();
  expect(cargar(storage)).toBeNull();
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** subir `VERSION_ESQUEMA` y validar que `jugador.atributos`
  tenga exactamente las cuatro claves nuevas; si no, devolver `null`.
- [ ] **Paso 4:** pasa.
- [ ] **Paso 5:** commit `feat(core): descarta guardados del esquema viejo`.

---

# BLOQUE 2 — El combate

## Task 2.1 · `fight.js` sobre cuatro atributos

**Files:** modificar `src/core/fight.js`; `tests/core/fight.test.js`.

**Interfaces:**
- Consume: `mediaDe`, `ATRIBUTOS`.
- Produce: `crearPelea`, `simularRound`, `tarjetasJurados` (sin cambio de firma).

**Qué hace cada atributo en la pelea** (es el contrato con el jugador, y tiene
que ser verificable con un test):

| Atributo | Efecto |
|---|---|
| Fuerza | daño por golpe y probabilidad de nocaut |
| Defensa | reduce el daño recibido **y** la probabilidad de caer |
| Cardio | cuánto tarda en subir la fatiga dentro del combate |
| Agilidad | iniciativa: quién conecta primero y esquiva |

**La fatiga vive solo acá.** Nace en 0 al empezar la pelea, sube cada round, y
cardio determina cuánto aguanta antes de que caiga el rendimiento. Ya no sale
ni vuelve al peleador.

- [ ] **Paso 1: test que falla** — uno por atributo, comparando dos peleadores
  idénticos salvo en ese atributo, sobre muchas semillas:

```js
function ganadas(atributoAlto, clave, semillas = 200) {
  let v = 0;
  for (let s = 1; s <= semillas; s += 1) {
    const base = { fuerza: 50, defensa: 50, cardio: 50, agilidad: 50 };
    const jugador = peleadorCon({ ...base, [clave]: atributoAlto });
    const rival = peleadorCon(base);
    if (pelearEntero(jugador, rival, s).ganador === 'jugador') v += 1;
  }
  return v / semillas;
}

it('cada atributo, subido solo, mejora el resultado', () => {
  for (const clave of ['fuerza', 'defensa', 'cardio', 'agilidad']) {
    expect(ganadas(70, clave)).toBeGreaterThan(0.55);
  }
});

it('la fatiga arranca en cero y sube round a round', () => {
  const pelea = crearPelea({ /* ... */ });
  expect(pelea.fatiga.jugador).toBe(0);
  const r1 = simularRound(pelea).pelea;
  expect(r1.fatiga.jugador).toBeGreaterThan(0);
});

it('más cardio = menos fatiga acumulada al mismo round', () => {
  const flojo = correrRounds(peleadorCon({ cardio: 30 }), 5).fatiga.jugador;
  const fuerte = correrRounds(peleadorCon({ cardio: 80 }), 5).fatiga.jugador;
  expect(fuerte).toBeLessThan(flojo);
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** reescribir `efectividad` y el cuerpo de `simularRound` sobre
  los cuatro. Sacar `forma`, `moral` y el mentón de `especiales`.
- [ ] **Paso 4:** pasan. Verificar que 500 peleas simuladas terminan todas y
  que los KO no se disparan ni desaparecen (~30-40% por KO/TKO).
- [ ] **Paso 5:** commit `feat(core): el combate corre sobre los cuatro atributos`.

## Task 2.2 · Rincón y golpe de gracia

**Files:** modificar `src/core/fight-interactive.js`; sus tests.

- [ ] **Paso 1:** test que verifique que `INSTRUCCIONES_RINCON` y
  `resolverGolpeDeGracia` no referencian atributos que ya no existen.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** adaptar. El golpe de gracia usa **fuerza** para el daño y
  **defensa del rival** para la resistencia. El consejo del rincón sigue
  saliendo de la calidad del entrenador.
- [ ] **Paso 4:** pasan. Verificar el determinismo con JSON round-trip a mitad
  de pelea (hay tests que ya lo cubren: no romperlos).
- [ ] **Paso 5:** commit `feat(core): rincón y golpe de gracia sobre los cuatro`.

---

# BLOQUE 3 — Talento, curva y declive

## Task 3.1 · `talento.js`: el techo y la curva

**Files:** crear `src/core/talento.js` + `tests/core/talento.test.js`;
modificar `src/core/fighter.js`.

**Interfaces:**
- Produce: `sortearTalento(rng)` → `{ techo, curva }` donde `techo` es un
  multiplicador de cuánto rinde cada mejora y `curva` ∈ `'temprana' | 'normal' | 'tardia'`;
  `rendimientoDeMejora(jugador, edad)` → multiplicador final.

**Diseño:** `techo` sale de una distribución con el grueso cerca de 1 y colas a
ambos lados (0,7 a 1,3). La `curva` corre el pico: el temprano rinde más antes
de los 26 y menos después; el tardío al revés. **Ninguno de los dos se muestra
nunca como número.**

- [ ] **Paso 1: test que falla**

```js
it('el techo se reparte con la mayoría cerca de 1 y colas a los costados', () => {
  const techos = Array.from({ length: 500 }, (_, i) => sortearTalento(createRng(i + 1)).techo);
  const medio = techos.filter((t) => t >= 0.9 && t <= 1.1).length / techos.length;
  expect(medio).toBeGreaterThan(0.5);
  expect(Math.min(...techos)).toBeLessThan(0.85);
  expect(Math.max(...techos)).toBeGreaterThan(1.15);
});

it('el de curva temprana rinde más joven; el tardío, más grande', () => {
  const temprano = { talento: { techo: 1, curva: 'temprana' } };
  const tardio = { talento: { techo: 1, curva: 'tardia' } };
  expect(rendimientoDeMejora(temprano, 22)).toBeGreaterThan(rendimientoDeMejora(tardio, 22));
  expect(rendimientoDeMejora(tardio, 33)).toBeGreaterThan(rendimientoDeMejora(temprano, 33));
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar; `crearPeleador` guarda `jugador.talento`.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): talento y curva de maduración`.

## Task 3.2 · Declive desde 34, acelerado por castigo

**Files:** modificar `src/core/career.js`; `tests/core/career.test.js`.

**Interfaces:**
- Produce: `edadDeDeclive(jugador)` → número; `castigoAcumulado(jugador)` → número.

**Diseño:** el declive empieza a los **34**. Los **nocauts sufridos y las
caídas** —no las derrotas por puntos— corren esa edad hacia abajo. Un tipo que
ganó siempre por decisión llega entero; uno que comió muchas manos se termina
antes.

- [ ] **Paso 1: test que falla**

```js
it('sin castigo, el declive empieza a los 34', () => {
  expect(edadDeDeclive(peleadorLimpio())).toBe(34);
});

it('los nocauts sufridos adelantan el declive; las derrotas por puntos no', () => {
  expect(edadDeDeclive(conKosSufridos(4))).toBeLessThan(34);
  expect(edadDeDeclive(conDerrotasPorPuntos(4))).toBe(34);
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar sobre `jugador.historial` (guarda método y
  resultado de cada pelea). Determinista, **sin consumir rng**: correr la
  secuencia descalibra el ritmo de toda la carrera.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): el castigo acumulado adelanta el declive`.

## Task 3.3 · Las señales del entrenador

**Files:** crear `src/content/senales-talento.js`; modificar `src/core/coach.js`;
tests.

**Interfaces:**
- Produce: `senalDeTalento(jugador)` → string o `null`.

El jugador **nunca ve el número del techo**. El entrenador tira frases que lo
dejan intuir ("este pibe aprende rápido", "le cuesta más que a los otros"), y
solo después de unas cuantas decisiones, para que no se cante en el minuto uno.

- [ ] **Paso 1:** test que verifique que un techo alto y uno bajo producen
  familias de frases distintas, que no hay número en el texto, y que devuelve
  `null` antes de la quinta decisión.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar con al menos 6 frases por familia (alto, normal,
  bajo), elegidas de forma determinista.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): el entrenador deja intuir el talento`.

---

# BLOQUE 4 — Las tarjetas

## Task 4.1 · `cards.js` sobre cuatro atributos

**Files:** modificar `src/core/cards.js`; sus tests.

- [ ] **Paso 1:** test de que `aplicarCarta` reparte solo sobre `atributos` (ya
  no hay `especiales` ni estados que no sean la lesión) y que el talento
  multiplica el efecto.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar; `aplicarCarta(jugador, carta)` aplica
  `rendimientoDeMejora` sobre los mods positivos. **Los negativos no se
  multiplican**: que el talento te salve de tus propias malas decisiones sería
  raro.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): las cartas aplican sobre cuatro atributos`.

## Task 4.2 · Reescribir `cards-improve.js`

**Files:** reescribir `src/content/cards-improve.js`; tests.

**Contrato de cada carta**: dos opciones, efectos de **+3 o +4** en un atributo
(el número que mueve la media un punto entero), y la posibilidad de que una
opción no dé nada. Rarezas mantenidas; las legendarias pueden dar +8.

- [ ] **Paso 1:** test de contrato sobre el catálogo entero: toda carta declara
  rareza; toda carta tiene 2 opciones salvo las marcadas `especial: true` que
  tienen 3; ningún mod apunta a un atributo inexistente; los efectos positivos
  típicos caen entre 3 y 4, y los legendarios hasta 8.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** escribir **al menos 30 cartas**, en español rioplatense con
  voz de box. Patrones: elegir qué subir, elegir si arriesgar, y alguna donde
  una opción no hace nada.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(content): mazo de mejoras reescrito`.

## Task 4.3 · Reescribir eventos y campamento

**Files:** reescribir `src/content/cards-events.js` y `cards-camp.js`; tests.

Mismo contrato que 4.2. **Las de porcentaje son lo más divertido del juego**
(dicho por el usuario): tienen que ser protagonistas, con probabilidades
variadas (75/25, 60/40, 90/10 — no todas mitad y mitad).

Conservar el sistema de condiciones situacionales que ya existe (edad, si sos
campeón, dinero, si venís de ganar o perder) — **pero sin `fama`**, que se va.

- [ ] **Paso 1:** test de contrato + que ninguna carta referencie fama ni
  estados eliminados.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** escribir **al menos 40 cartas de evento y 20 de campamento**,
  con al menos 15 de porcentaje.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(content): eventos y campamento reescritos`.

## Task 4.4 · Estilos, orígenes, apodos y entrenadores

**Files:** modificar `src/core/styles.js`, `src/core/fighter.js` (ORIGENES),
`src/content/nicknames.js`, `src/content/coaches.js`; tests.

Todos sus `mods` pasan a los cuatro atributos. **El ciclo de ventajas entre
estilos tiene que seguir cerrando**: ningún estilo invicto contra todos ni
perdiendo contra todos — hay un test genérico sobre el catálogo completo que
no se puede aflojar.

- [ ] **Paso 1:** test de que ningún catálogo referencia atributos viejos.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** convertir los cuatro catálogos.
- [ ] **Paso 4:** pasan, incluido el test del ciclo de estilos.
- [ ] **Paso 5:** commit `feat(content): estilos, orígenes, apodos y entrenadores`.

---

# BLOQUE 5 — El ritmo

## Task 5.1 · Tres decisiones al año

**Files:** modificar `src/core/career.js`; tests.

**Diseño:** la carrera sigue yendo de los 15 a los 39 y arranca en enero. Cada
año trae **3 decisiones, una cada 4 meses** (enero, mayo, septiembre). Son 72
en la carrera completa.

- [ ] **Paso 1: test que falla**

```js
it('cada año trae exactamente tres decisiones', () => {
  const porAnio = contarDecisionesPorAnio(jugarCarreraEntera(createRng(1)));
  for (const n of Object.values(porAnio)) expect(n).toBe(3);
});

it('una carrera completa trae ~72 decisiones', () => {
  const total = Object.values(contarDecisionesPorAnio(jugarCarreraEntera(createRng(1))))
    .reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThanOrEqual(68);
  expect(total).toBeLessThanOrEqual(76);
});
```

- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** reemplazar `ETAPAS` y `armarCola` por un ritmo anclado al
  calendario. El resumen de fin de año **ya funciona atado al cruce de año**
  (v12): no romperlo.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): tres decisiones al año, una cada cuatro meses`.

## Task 5.2 · Peleas por momento de la carrera

**Files:** modificar `src/core/tramite.js`; tests.

| Momento | Peleas al año |
|---|---|
| Joven | 2-3 |
| Prime, sin cinturón | 2 |
| Campeón | 1, **y todas importantes** |
| Veterano | 1-2 |
| Veterano y campeón | 1 |

La regla del campeón tiene una razón de diseño: **al que le va bien no puede
tocarle jugar menos**. Pelea una vez al año, pero esa se juega completa.

- [ ] **Paso 1:** test de que el total cae en **30-32 peleas** y de que un
  campeón tiene exactamente una por año, siempre importante.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar sobre `intentosDePelea`.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat(core): peleas por momento de la carrera`.

## Task 5.3 · La tarjeta previa a la pelea

**Files:** modificar `src/core/career.js`, `src/main.js`,
`src/ui/screens/panel-tramite.js`; tests.

Dos momentos distintos, según el tipo de pelea:

- **Pelea simulada** → tarjeta de **charla con el entrenador**: te dice contra
  quién vas. No es de acción.
- **Pelea importante** → tarjeta de **aceptar o rechazar**.

- [ ] **Paso 1:** test de que una pelea simulada encola la charla y una
  importante encola la oferta, nunca al revés.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar, con al menos 8 variantes de texto para la charla.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat: la pelea se anuncia antes de ocurrir`.

---

# BLOQUE 6 — Balance de rejugabilidad

## Task 6.1 · Calibrar el nuevo eje

**Files:** modificar `scripts/balance-sim.mjs`, y lo que haga falta ajustar;
`tests/core/career.test.js`.

**Los objetivos cambian.** El viejo "≥85% consigue los tres cinturones" se
reemplaza:

| Métrica | Objetivo |
|---|---|
| Al menos un cinturón | 85-90% |
| Llega al mundial | **20-25%** |
| Peleas profesionales | 30-32 |
| Media final promedio | ~85-90 |
| Minutos estimados | 27-30 |

**Lo que hace rejugable el juego es que el mundial pueda fallar.** Si al
calibrar el número se va para arriba, la palanca correcta **no** es regalar
cinturones: es que el talento y el reparto inicial pesen más.

- [ ] **Paso 1:** actualizar el script para reportar las métricas nuevas,
  incluida la **dispersión de la media final** (un juego rejugable tiene una
  desviación grande, no todas las carreras terminando en el mismo número).
- [ ] **Paso 2:** medir el estado actual con 400 semillas y anotarlo.
- [ ] **Paso 3:** calibrar hasta entrar en los rangos. Documentar cada perilla
  tocada y por qué, en el comentario de `career.js` (que ya es el registro
  histórico del ritmo).
- [ ] **Paso 4:** actualizar los tests de balance a los objetivos nuevos, con
  muestra grande (n≥1000) — **hubo un test flaky en este proyecto por muestra
  chica: con n=150 las sub-muestras variaban 12 puntos**. No repetirlo.
- [ ] **Paso 5:** commit `chore(balance): calibra el eje de rejugabilidad`.

## Task 6.2 · La carrera que no llegó también se cuenta

**Files:** modificar `src/ui/screens/legacy.js`, `src/core/stats-carrera.js`;
tests.

Si 3 de cada 4 carreras no llegan al mundial, **el cierre no puede tratarlas
como un fracaso**. Un campeón nacional que defendió cuatro veces y se retiró
invicto tiene una gran historia.

- [ ] **Paso 1:** test de que el cierre de una carrera sin mundial destaca
  logros propios (cinturones que sí ganó, rachas, mejor rival vencido) y no
  usa lenguaje de derrota.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar. El cierre se arma sobre lo que el peleador **sí**
  hizo. Escribir variantes para al menos cuatro finales distintos: campeón
  mundial, campeón nacional, campeón regional, y el que no ganó ninguno.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit `feat: el cierre le hace justicia a cada carrera`.

---

# BLOQUE 7 — Interfaz

## Task 7.1 · El tablero

**Files:** modificar `src/ui/screens/panel-peleador.js`, `src/ui/theme.css`;
tests.

- Cuatro cuadros de atributo en una fila, del mismo tamaño, con el número
  arriba y el nombre completo abajo (ya está así: mantenerlo).
- **Se va la sección de Estado entera** y **se va la fama**.
- El aporte del entrenador sigue con su badge dorado y la invariante
  `base + aporte === atributos[clave]`.
- `animarAtributos` y el resaltado verde/rojo siguen funcionando: los ganchos
  son `[data-atributo="clave"] .valor`.
- Con cuatro cuadros en vez de seis hay más ancho: **aprovecharlo**, sin dejar
  espacio muerto. Las columnas siguen sin pasar del piso de la izquierda.

- [ ] **Paso 1:** test de que se muestran 4 cuadros, ninguno de estado, y que
  no aparece la fama.
- [ ] **Paso 2:** correr → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** pasan. **Verificar visualmente** con Playwright en 390px y
  desktop, midiendo que ninguna columna se pase del piso de la izquierda.
- [ ] **Paso 5:** commit `feat(ui): el tablero muestra los cuatro atributos`.

## Task 7.2 · El resto de las pantallas

**Files:** `src/ui/screens/profile.js`, `fight.js`, `panel-tramite.js`,
`create.js`, `resumen-anio.js`, `shop.js`; tests.

- [ ] **Paso 1:** buscar en todo `src/ui/` referencias a atributos y estados
  eliminados, y a la fama. Listarlas.
- [ ] **Paso 2:** test de que ninguna pantalla referencia lo eliminado.
- [ ] **Paso 3:** adaptar cada una.
- [ ] **Paso 4:** pasan; suite completa verde.
- [ ] **Paso 5:** commit `feat(ui): todas las pantallas sobre los cuatro atributos`.

---

# BLOQUE 8 — Cierre

## Task 8.1 · Barrida y publicación

- [ ] **Paso 1:** jugar varias carreras completas por la UI real (happy-dom) y
  anotar todo: errores de consola, textos rotos, marcadores `{algo}` sin
  reemplazar, números sin sentido, pantallas colgadas.
- [ ] **Paso 2:** **verificación visual con Playwright**: tablero, creación,
  pelea, resumen de año, cierre de carrera, en 390px y desktop.
- [ ] **Paso 3:** correr el balance final y confirmar los rangos del Bloque 6.
- [ ] **Paso 4:** `npx vitest run` completo + `npm run build`.
- [ ] **Paso 5:** merge a `master` y push (dispara el deploy a Pages).

---

## Notas para quien ejecute

- **El orden importa.** El Bloque 1 rompe la suite entera a propósito; recién
  vuelve a verde después del Bloque 4. No intentar mantenerla verde en el medio.
- **Medir, no afirmar.** En este proyecto ya pasó dos veces que un informe
  dijera "está hecho" y la captura del usuario lo desmintiera. Cuando el
  criterio sea visual, mirar la pantalla; cuando sea estadístico, correr la
  simulación y pegar los números.
- **El presupuesto de tiempo es real**: 27-30 minutos. Cada beat que se suma
  se paga en minutos.
