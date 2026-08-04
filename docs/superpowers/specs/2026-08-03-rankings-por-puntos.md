# Rankings por puntos (v18) — estado y plan para retomar

**Última actualización:** 2026-08-03 · **Avance: 100% — terminado** · Rama `v17`

---

## Qué se está haciendo y por qué

Los rankings se calculaban con una **fórmula** sobre atributos y récord global.
Cada ajuste generaba un absurdo nuevo: si pesaba la media, un 0-2 superaba a un
25-18; si pesaba el récord global, ganarle a cualquiera te subía en las tres
tablas por igual.

El rediseño acordado con el usuario: **el puesto no sale de una fórmula, sale
de a quién enfrentaste**. Cada peleador —el jugador y los NPC— lleva sus
propios puntos en cada división, y solo se mueven peleando contra alguien que
esté EN esa división.

### Decisiones ya cerradas con el usuario (no volver a discutir)

1. **Las cuatro tablas y la cadena**
   - **Amateur**: pool propio, ~6:1 local. Desaparece al debutar como pro.
   - **Regional**: top 20 de tu país.
   - **Nacional**: top 10 del regional (subconjunto).
   - **Mundial**: las elites nacionales de TODOS los países, reordenadas entre
     sí, top 30.
   - Condición innegociable del usuario: *"no le veo sentido a que alguien
     pueda ser top 30 del mundo y NO top 10 de su propio país"*. Por eso el
     mundial se arma DESDE los nacionales.

2. **Se puede estar en varias tablas a la vez.** Si el rival está en el
   regional y en el nacional, la pelea mueve las dos. Si está solo en el
   mundial, solo esa.

3. **Se puede subir en una tabla sin moverse en otra.** Ganarle a un extranjero
   del mundial sube en el mundial y no toca el nacional.

4. **Decaimiento por inactividad**: sí, los puntos bajan si no peleás.

5. **El campeón va en un renglón propio**, arriba de la numeración, mientras
   tenga el cinturón (como WBC/WBA/IBF).

6. **El matchmaking muestra el/los puesto(s) del rival** en la pantalla de
   oferta.

7. **Los NPC tienen puntos reales**, no una posición calculada.

8. **Hitos**: entrar y salir de cada tabla se registra con fecha y se muestra
   en los momentos del cierre de carrera (📈 entró / 📉 se cayó).

### Decisiones cerradas en la sesión del 2026-08-03 (segunda vuelta)

9. **El acceso a los cinturones se migró a las tablas de puntos.** Antes
   `puedeDisputar` leía `jugador.ranking` (la fórmula vieja, un puesto global
   entre los ~180 del mundo): el rediseño cambiaba lo que el jugador VE pero no
   lo que decide cuándo pelea por un título, y las dos cosas podían
   contradecirse. Ahora cada cinturón mira SU división.

10. **12 países en vez de 6, con el roster del mundo de 100 a 180.** Con 100
    repartidos entre doce banderas cada país extranjero quedaba con ~5
    peleadores y la cadena se volvía decorativa.

---

## Estado del código

Todo vive en la rama `v17`, commiteado y con la suite en verde.

### Hecho

| Pieza | Dónde |
|---|---|
| Modelo de puntos por división | `src/core/puntos-ranking.js` |
| Siembra inicial de los NPC | `puntosInicialesDe` + `src/core/roster.js` |
| Rankings ordenados por puntos | `ordenarPorPuntos`, `divisiones.js` |
| Cadena regional → nacional → mundial | `rankingsProfesionales`, `divisiones.js` |
| Puntos en peleas NPC | `avanzarMundo`, `src/core/world.js` |
| Decaimiento anual | `decaerPuntos` |
| Amateur se cierra al debutar / ~6:1 local | `divisiones.js`, `roster.js` |
| Hitos de ranking y su aparición en el cierre | `career.js`, `legacy.js` |
| Puntos en las peleas JUGADAS del jugador | `aplicarPuntosDePelea`, `cerrarPelea` (`main.js`) |
| **Puntos en el lote de trámite** | `peleasPuntuables` (`tramite.js`) + `aplicarPuntosDeLote` (`career.js`) |
| **Puntos en el destacado del minijuego** | `beatTramiteDestacado`, `main.js` |
| **Decaimiento del jugador** | `avanzarBloque`, `career.js` |
| **Renglón de campeón fuera de la numeración** | `tablasDeDivisiones` (`world.js`) + `ranking.js` + `theme.css` |
| **12 países** | `NACIONALIDADES`/`NOMBRES_POR_PAIS` (`names.js`) + 6 dibujantes en `flags.js` |
| **Roster de 180** | `CANTIDAD_MUNDO` (`career.js`), `MINIMO_LOCALES` 46 (`world.js`) |
| **Puestos divisionales del rival en la oferta** | `rivalPuestos` (`offers.js`) + `chipsDePuestos` (`fight.js`) |
| **Escaleras nacionales de CADA país** | `fotoDeRankings`/`puestosDelCruce` (`divisiones.js`) |
| **Carteleras entre compatriotas** | `emparejarPorPais` (`world.js`) + `soloNacionalidad` en `buscarRival` |
| **Títulos por división** | `puedeDisputar(jugador, cinturon, misPuestos)`, `offers.js` |

**Escala de puntos** (verificada a mano):

| Cruce | Delta |
|---|---|
| Ganás #15 vs #1 | +268 |
| Ganás #5 vs #5 | +100 |
| Ganás #1 vs #20 | +10 |
| Perdés #15 vs #1 | −10 |
| Perdés #1 vs #20 | −298 |
| Ganás sin puesto vs #5 | +292 |
| Ganás contra alguien fuera de la tabla | 0 |
| Perdés contra alguien fuera de la tabla | −120 |

---

## El bug grande de esta ronda: la economía de puntos se drenaba

El spec anterior decía *"verificado en el mundo simulado: a 12 años las tablas
se mantienen en 20/10/23"*. **A 12 años sí; a 25 —una carrera completa— no.**
Medido sobre 8 semillas, las tablas se derrumbaban a 2/1/5 y el total de puntos
del mundo caía un 94% (71.000 → 4.400). El año 8 es el codo de la curva, justo
después de donde llegaba la verificación vieja.

La descomposición del flujo, año por año, fue lo que lo destrabó:

```
entre los que siguen activos, el mundo GANA ~400 puntos por año
los que se retiran se llevan entre 3.000 y 7.400
los que debutan entran con cero
```

O sea: las peleas funcionaban bien; lo que no cerraba era el recambio
generacional. Y había **dos multiplicadores** que lo convertían en espiral:

1. **El filtro `puntos > 0`** para entrar a una tabla. Menos gente en la tabla →
   menos rivales que puedan dar puntos (solo se suma contra alguien que ESTÉ en
   la división) → menos puntos todavía → tabla más chica. Una vez que
   arrancaba, no había vuelta atrás. **Se sacó**: la tabla es siempre el top N
   de su pool y nunca se vacía, así que el bucle pasa a ser estabilizador.

2. **`avanzarMundo` calculaba regional/nacional SOLO para el país del jugador.**
   Un ghanés no figuraba en ninguna tabla calculada, así que solo podía PERDER
   puntos nacionales, nunca ganarlos — y con los años la elite de cada país (de
   donde sale el mundial) se volvía arbitraria. **Se arregló** con
   `fotoDeRankings`, que arma la escalera de cada país.

Y encima el emparejamiento era global (cualquiera del planeta contra
cualquiera), así que con doce países casi ningún cruce caía dentro del mismo
país y las escaleras nacionales no tenían con qué moverse. Ahora
`emparejarPorPais` arma las carteleras sobre todo entre compatriotas, con los
impares de cada país cruzándose entre ellos — más creíble y, sobre todo, es lo
que alimenta la cadena.

**Resultado medido tras los arreglos** (8 semillas × 25 años): tablas llenas en
20/10/30 todos los años, el #1 del regional entre 463 y 1084 puntos, el #20 con
puntos reales (spread, no un empate en cero), y **cero violaciones** del
invariante innegociable (nadie en el mundial sin ser elite de su país).

Herramientas de medición usadas (scratch, no versionadas): trayectoria de las
tablas año a año, descomposición del flujo de puntos, y calidad de la tabla
(cuántos de los 20 tienen puntos de verdad). Conviene rehacerlas si se vuelve a
tocar el balance — son ~40 líneas cada una.

---

## El rebalanceo, y por qué se movió cada número

Al migrar los títulos a las tablas de puntos los cinturones quedaron **más
difíciles**, no más fáciles. Tres hallazgos, en orden:

1. **"Al menos un cinturón" cayó a 62%** (rango pedido: 83-92%). El
   matchmaking del jugador elegía rival por media global, así que con doce
   países casi nunca le tocaba un compatriota rankeado y ninguna de sus peleas
   movía la escalera que necesitaba. Se agregó preferencia por compatriotas
   (`soloNacionalidad` en `buscarRival`), igual que en el mundo NPC.

2. **La tasa de mundial se desplomó a 5%.** Efecto colateral del punto 1: con
   el jugador encerrado en su país no enfrentaba a nadie de la tabla mundial.
   Por eso `FRACCION_RIVAL_LOCAL` no es un número fijo sino uno por cinturón
   buscado — `{ regional: 0.85, nacional: 0.8, mundial: 0.25 }`. Es además el
   arco real de un boxeador: te hacés en casa y salís a buscar al mundo.

3. **Seguía en 10% con `rankingMax: 3`.** Ese 3 era un puesto entre los ~180
   activos, sacado de una fórmula que se trepaba rápido; contra una tabla
   mundial de 30 lugares con puntos que los NPC acumulan en carreras enteras, un
   jugador de ~31 peleas no llega nunca. Subió a 12 (contendiente rankeado, como
   en el boxeo real) y `PELEAS_MINIMAS_TITULO.mundial` bajó de 28 a 21, que con
   el ranking ya difícil sumaba doble castigo.

**Medido tras el ajuste** (`node scripts/balance-sim.mjs 300`):

| Eje | Rango pedido | Medido |
|---|---|---|
| Al menos un cinturón | 83–92 % | 88,0 % |
| Llegó al mundial | 18–28 % | 20,7 % |
| Media final | 84–92 | 87,0 |
| Desviación | ≥ 6 | 9,09 |
| Peleas profesionales | ~30–32 | 31,1 |
| Minutos estimados | 27–30 | 29,9 |

`CANTIDAD_MUNDO` también es una palanca de balance, no solo de ambientación: un
mundo más chico es más fácil de escalar. La tasa de mundial da 20,7% con 180,
25,3% con 160 y 27,5% con 140 — por eso quedó en 180, el único valor que la
deja centrada en vez de pegada al techo del rango.

**Costo conocido:** la suite pasó de ~5 a ~9,5 minutos de reloj. No es una
regresión del juego (avanzarMundo mide 1,3ms por año) sino de los tests, que
simulan 1500 carreras completas sobre un roster casi el doble de grande. Se
recortó lo que se podía sin perder señal: los tres tests de `Bloque 6` miran
exactamente la misma muestra, así que ahora se calcula una sola vez en vez de
tres.

---

## Los tests que se van a volver a romper

Hay tests **atados a semillas**: cambiar la generación del mundo corre la
secuencia de rng y esas semillas dejan de caer en la carta que el test espera.

- `tests/ui/main-shell.test.js` — los cuatro del "evento con azar". **Ya no
  persiguen semillas**: `prepararPartidaGuardadaEventoConAzar` recorre semillas
  hasta encontrar una carta con `probabilidades` y devuelve también qué opción
  tiene el roll y cuáles son sus ramas, así los tests afirman sobre la
  estructura y no sobre el texto de una carta puntual. Se había perseguido la
  semilla seis veces (6→10→16→11→30→83) antes de hacerlo robusto.
- `tests/core/career.test.js` — "Bloque 6". Ese NO es deriva sino BALANCE: si
  falla, hay que retunear de verdad.

**Rangos de balance a respetar** (`tests/core/career.test.js`):
- al menos un cinturón: 83–92 %
- llegó al mundial: 18–28 %
- media final: 84–92, desviación ≥ 6
- peleas jugables por carrera: 9–14

Palancas, de la más gruesa a la más fina:
1. `CANTIDAD_MUNDO` (`career.js`) — mueve TODO; un mundo más chico es más fácil.
2. `CINTURONES[].rankingMax` y `PELEAS_MINIMAS_TITULO` (`offers.js`) — el acceso
   a cada cinturón por separado.
3. `FRACCION_RIVAL_LOCAL` (`offers.js`) — de qué tabla puede sumar puntos el
   jugador en cada etapa.
4. Los cupos en `divisiones.js`.

---

## Al publicar: las partidas guardadas viejas se descartan

`VERSION_ESQUEMA` (`src/core/save.js`) sube de 2 a 3, así que cualquier partida
en curso guardada con la versión publicada anterior se descarta al cargar, con
el mensaje de siempre ("hace falta empezar una carrera nueva").

Es a propósito y no hay alternativa razonable: los puntos de ranking se siembran
al crear el mundo y de ahí solo se mueven peleando, así que un guardado viejo no
los tiene en ningún peleador. Cargarlo no rompe nada visible, pero deja las
cuatro tablas con todos en cero y ordenadas por el desempate de id — un ranking
sin sentido, que es peor que un error a la vista. Migrar tampoco se puede: los
puntos representan a quién enfrentó cada uno, y esa historia no existe en el
guardado anterior.

---

## Cómo verificar

```bash
npm test                    # suite completa (~9,5 min, 1729 tests)
npm run build               # el build que se publica — los tests NO lo cubren
npm run dev                 # dev server en :5173
```

**Regla aprendida a la mala:** al medir layout, medir el **descendiente
visible más bajo**, no el contenedor — un contenedor puede medir bien y
desbordar. Y distinguir aire *centrado* (arriba y abajo) de aire *acumulado al
pie* (eso sí es un hueco).

**Segunda regla, de esta ronda:** verificar el mundo simulado a la LARGA
(25 años, una carrera completa), no a 12. El bug más grande de este rediseño
vivía justo después de donde llegaba la verificación anterior.

**Tercera:** no usar `Set-Content` de PowerShell para editar archivos con
acentos — reescribe en ANSI y rompe el UTF-8 (pasó con `offers.test.js`, se
recuperó con `git checkout --`). Usar la herramienta de edición.

---

## Contexto del proyecto

- JS vanilla, ES modules, sin frameworks. Vite + Vitest + happy-dom.
- **Nada de `Math.random()` en `src/core/`**: rng con semilla, el estado viaja
  en el guardado.
- Núcleo puro (`src/core/`) + capa DOM fina (`src/ui/`).
- Español rioplatense en todo el texto de juego. Coma decimal.
- Sin emojis en la interfaz (sí íconos SVG). **Excepción**: los "Momentos
  memorables" del cierre, que el usuario pidió con emoji.
- Se publica con push a `master` (workflow de GitHub Pages), a
  https://alcaraz000.github.io/simulador-peleador — login `gabriel` /
  `boxeo2026`.
- El usuario quiere **status y % de avance de forma constante**.
