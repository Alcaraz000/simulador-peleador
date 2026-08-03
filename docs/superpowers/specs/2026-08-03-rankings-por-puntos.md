# Rankings por puntos (v18) — estado y plan para retomar

**Última actualización:** 2026-08-03 · **Avance: ~45%** · Rama `v17`

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
   tenga el cinturón (como WBC/WBA/IBF). Reemplaza la idea de "piso de puntos"
   y arregla solo el bug de "el campeón aparece #9".

6. **El matchmaking muestra el/los puesto(s) del rival** en la pantalla de
   oferta.

7. **Los NPC tienen puntos reales**, no una posición calculada.

8. **Hitos**: entrar y salir de cada tabla se registra con fecha y se muestra
   en los momentos del cierre de carrera (📈 entró / 📉 se cayó).

---

## Estado del código

Todo vive en la rama `v17`, commiteado y **con la suite en verde (1684 tests)**.
No está publicado: falta la mitad del sistema, así que subirlo a `master`
mostraría rankings a medio hacer.

### Hecho

| Pieza | Dónde |
|---|---|
| Modelo de puntos por división | `src/core/puntos-ranking.js` (nuevo) |
| Siembra inicial de los NPC | `puntosInicialesDe` + llamada en `src/core/roster.js` |
| Rankings ordenados por puntos | `ordenarPorPuntos` en `src/core/divisiones.js` |
| Cadena regional → nacional → mundial | `rankingsProfesionales`, `divisiones.js` |
| Puntos en peleas NPC | bucle de pares en `avanzarMundo`, `src/core/world.js` |
| Decaimiento anual | `decaerPuntos`, aplicado tras el bucle de peleas |
| Amateur se cierra al debutar | `rankingAmateur`, `divisiones.js` |
| Amateur ~6:1 local | `FRACCION_LOCAL_AMATEUR`, `roster.js` |
| Registro de hitos de ranking | `registrarHitosDeRanking`, `src/core/career.js` |
| Hitos en el cierre | `momentosDe`, `src/core/legacy.js` + `legacy-lines.js` |

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

**Verificado en el mundo simulado:** a 12 años las tablas se mantienen en
20/10/23, el top-3 mundial cambia solo por resultados, y cero peleadores en el
mundial sin estar en la elite de su país.

### Pendiente

1. **Puntos en las peleas del jugador** ← *próximo paso concreto*
2. Renglón de campeón fuera de la numeración
3. Más países (de 6 a 10-12) y ampliar `NOMBRES_POR_PAIS`
4. Puesto(s) del rival en la pantalla de oferta
5. **Rebalanceo completo** (lo más pesado)

---

## Próximo paso, con detalle

En `src/main.js`, función `cerrarPelea` (donde ya se llama a
`aplicarResultado` y a `aplicarCambioDeCampeon`):

```js
// 1. Foto de los rankings ANTES de aplicar el resultado
const rankingsAntes = rankingsProfesionales(partida.mundo, partida.jugador);
const puestosDe = (id) => Object.fromEntries(
  DIVISIONES_PUNTUABLES
    .map((d) => [d, puestoEn(rankingsAntes, d, id)])
    .filter(([, puesto]) => puesto !== null),
);

// 2. Aplicar puntos al jugador Y al rival (el rival vive en mundo.roster)
const resultadoLetra = /* 'v' | 'd' | 'e' */;
jugador.puntosRanking = aplicarPuntos(jugador, {
  resultado: resultadoLetra,
  misPuestos: puestosDe(jugador.id),
  puestosRival: puestosDe(oferta.rivalId),
});
// idem para el rival, con el resultado invertido, escribiendo en mundo.roster
```

Hacer lo mismo en el camino de trámite (`src/core/tramite.js`,
`armarLotePeleas`), que también resuelve peleas del jugador.

---

## Los tests que se van a volver a romper

Hay tests **atados a semillas**: cambiar la generación del mundo corre la
secuencia de rng y esas semillas dejan de caer en la carta que el test espera.
Ya pasó seis veces en este proyecto y está documentado en los comentarios de
los propios tests. **No es una regresión.**

- `tests/ui/main-shell.test.js` — los cuatro del "evento con azar". Necesitan
  una semilla cuyo primer beat `evento` sea la carta `desafio_de_la_vereda`.
  Buscarla con un test temporal que recorra semillas filtrando por
  `beat.datos.carta.id` (hoy: semilla 83).
- `tests/core/career.test.js` — "Bloque 6". Ese NO es deriva sino BALANCE: si
  falla, hay que retunear de verdad.

Cuando un test se rompe por un número escrito a mano y no por el invariante que
prueba, conviene hacerlo robusto en vez de perseguir semillas.

**Rangos de balance a respetar** (`tests/core/career.test.js`):
- al menos un cinturón: 83–92 %
- llegó al mundial: 18–28 %
- media final: 84–92, desviación ≥ 6
- peleas jugables por carrera: 9–14

Palancas para el balance: `CINTURONES[].rankingMax` y
`PELEAS_MINIMAS_TITULO` (ambos en `src/core/offers.js`), y los cupos en
`divisiones.js`.

---

## Cómo verificar

```bash
npm test                    # suite completa (~4 min, 1683 tests)
npm run dev                 # dev server en :5173
```

Para mirar en navegador hay scripts de Playwright en el scratchpad de la
sesión anterior; si no están, se rehacen fácil: montar la pantalla vía
`page.evaluate` importando el módulo de UI y medir con `getBoundingClientRect`.

**Regla aprendida a la mala:** al medir layout, medir el **descendiente
visible más bajo**, no el contenedor — un contenedor puede medir bien y
desbordar. Y distinguir aire *centrado* (arriba y abajo) de aire *acumulado al
pie* (eso sí es un hueco).

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
