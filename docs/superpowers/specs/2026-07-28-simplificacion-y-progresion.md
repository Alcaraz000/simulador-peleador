# Simplificación y progresión — diseño

> Cerrado con el usuario el 2026-07-28, después de jugar la versión con seis
> atributos y cinco estados. Reemplaza el sistema de progresión completo.

## El problema

El juego acumuló seis atributos de combate, cinco estados y decenas de cartas
que los mueven de a uno o dos puntos. El resultado: **nada se siente
importante**. La media sube tan lento que el jugador no percibe progreso, los
estados son números que mira sin entender qué hacen, y las tarjetas se
parecen todas entre sí.

Y hay un problema más de fondo: **todas las partidas se parecen**. Jugando
bien, el 100% de las carreras consigue los tres cinturones. Si siempre ganás,
no hay nada que contar de una carrera a la otra.

## El norte

Dos cosas, en este orden:

1. **Que cada decisión se sienta.** Que veas el número moverse.
2. **Que cada partida se sienta distinta.** Que a veces te toque un crack, a
   veces uno que hay que empujar, y a veces uno que no daba.

---

## Los cuatro atributos

Se pasa de seis atributos + cinco estados a **cuatro atributos y nada más**:

| | Qué es | Qué hace en la pelea |
|---|---|---|
| **Fuerza** | La mano | Daño por golpe, probabilidad de nocaut |
| **Defensa** | No te entran, y si entran las aguantás | Absorbe el mentón: evita golpes y evita caer |
| **Cardio** | El tanque | Alimenta la fatiga dentro del combate |
| **Agilidad** | Pies y manos rápidas | Iniciativa, esquivar, conectar primero |

**Se van**: técnica, IQ de pelea, potencia y velocidad como atributos
separados (se funden en los cuatro de arriba), y los cinco estados —mentón,
disciplina personal, forma, moral y fatiga— desaparecen del tablero.

**La fatiga sigue existiendo, pero solo dentro de la pelea**: nace en 0 cada
combate, sube round a round, y cardio determina cuánto aguanta el peleador
antes de fundirse. Deja de ser un número que el jugador administra fuera del
ring.

**La media es el promedio simple de los cuatro.** Eso hace que la aritmética
sea legible para el jugador sin explicarla: **+4 en un atributo = +1 de media
exacto**.

### Qué más se va

**La fama.** No hacía nada relevante y era un número más para mirar.

**Lo que se queda**: dinero, tienda, cinturones, lesiones, entrenador,
rivalidades, ranking. La **tienda no toca los atributos** — da bolsas más
grandes, menos lesiones, mejores oportunidades. Los atributos salen
exclusivamente de las decisiones, para que el presupuesto de progresión tenga
una sola fuente.

---

## El ritmo

La carrera sigue yendo de los **15 a los 39 años**, y arranca en **enero**.

**Tres decisiones por año, una cada cuatro meses.** Son **72 decisiones** en
una carrera completa.

Antes de cada pelea aparece una tarjeta que no es de acción:

- **Pelea simulada** → el entrenador te dice contra quién vas.
- **Pelea importante** → aceptar o rechazar.

Los años amateur (15-20) funcionan igual: tres decisiones al año, con peleas
amateur que llevan **su propio récord**, separado del profesional.

### Presupuesto de tiempo

| | beats |
|---|---|
| Decisiones (3/año × 24) | 72 |
| Anuncios de pelea | ~30 |
| Resúmenes de año | ~23 |
| **Clicks simples** | **~125** |
| Peleas importantes jugadas completas | ~6, mucho más largas |

Estimado: **27-30 minutos**. El usuario lo aceptó explícitamente. Si al
jugarlo se siente largo, las palancas por orden de menor daño son: resolver
la pelea simulada en el mismo beat del anuncio, aligerar el resumen anual, y
bajar a dos decisiones al año en los años amateur.

---

## La progresión

La cuenta que gobierna todo el balance:

- 72 decisiones.
- Media inicial ~40, media final deseada ~90 → **+50 netos**.
- El declive por edad se come 10-15 en el tramo final → hacen falta
  **+60 a +65 brutos**.
- 62 ÷ 72 ≈ **+0,85 de media por decisión**, o sea **+3 o +4 en un atributo**
  por tarjeta típica.

Ese +4 es el número de diseño: una tarjeta que da "+4 Fuerza" mueve la media
un punto entero y el jugador lo ve.

### El declive

Empieza a los **34 años**, no antes.

**El castigo acumulado lo adelanta**: los nocauts sufridos y las caídas —no
las derrotas por puntos— corren esa edad hacia abajo. Un peleador que comió
muchas manos se termina antes, aunque haya ganado. Un boxeador que ganó
siempre por decisión llega entero.

---

## La rejugabilidad

Es el motivo del rediseño, y lo que cambia el eje de balance.

### Llegar al mundial puede fallar

Hasta ahora el piso era "≥85% de las carreras bien jugadas consiguen los tres
cinturones". **Ese objetivo se reemplaza:**

| | Objetivo |
|---|---|
| Consigue al menos un cinturón | ~85-90% |
| Llega al mundial | **1 de cada 4 o 5 carreras** (20-25%) |

Un peleador flojo con buenas decisiones llega al regional o al nacional y se
queda ahí. **Esa carrera también tiene que valer la pena contarla** — el
cierre y las estadísticas finales tienen que hacerle justicia a un tipo que
fue campeón nacional y nunca más, no tratarlo como un fracaso.

### De dónde sale la varianza

Cuatro palancas, combinadas:

**1. El reparto inicial.** Ya no se arranca parejo en 40. Un peleador puede
salir con 55 de fuerza y 28 de cardio, y eso lo cambia todo: ¿tapás el
agujero o potenciás lo que ya tenés?

**2. El techo.** Cuánto rinde cada mejora. A uno las tarjetas le rinden de
más y crece solo; a otro le rinden de menos y cada punto le cuesta el doble.
Es la palanca que más diferencia una carrera de otra.

**3. La curva.** Uno explota a los 23 y a los 30 ya baja; otro madura tarde y
su mejor momento son los 33. Cambia cuándo conviene ir a buscar el título.

**4. Lo que ya existe**: origen, apodo, estilo y entrenador, con sus rarezas.

### Cómo se entera el jugador

**El talento se intuye, no se lee.** No hay un número de "techo" en pantalla.
El entrenador va tirando señales ("este pibe aprende rápido", "le cuesta más
que a los otros") y el jugador saca sus conclusiones.

**Si el peleador es bueno se ve en el ring**, no en la creación. El reparto
inicial no te lo canta: hay que subir a pelear para enterarte.

---

## Las tarjetas

Se reescriben todas. Simples, legibles, con efectos grandes.

**Dos opciones es la norma.** Las de tres son **especiales** y aparecen poco.

**Los patrones**:
- Elegir **qué** subir: fuerza o cardio, defensa o agilidad.
- Elegir **si** arriesgar: una opción con azar y porcentaje, otra segura.
- Una opción puede **no dar nada**. No es la norma, pero es parte de lo
  divertido: a veces la decisión es no hacer nada.

**Las rarezas se mantienen** (normal, rara, legendaria) y **las legendarias
no se nerfean**: son raras y desbalancean a propósito. Con efectos más
grandes, una legendaria puede dar +8 de un saque — dos puntos de media.

**Las de porcentaje son lo más divertido del juego** (dicho por el usuario) y
tienen que seguir siendo protagonistas.

---

## Las peleas por año

| Momento | Peleas al año |
|---|---|
| Joven | 2-3 |
| Prime, sin cinturón | 2 |
| Campeón | 1, y **todas importantes** |
| Veterano | 1-2 |
| Veterano y campeón | 1 |

Total: **~30-32 peleas profesionales** en la carrera.

La regla del campeón tiene una razón de diseño: al que le va bien no puede
tocarle **jugar menos**. Peleás una vez al año, pero esa pelea se juega
completa y es un evento. El techo de la carrera se tiene que sentir como un
techo.

Se mantiene la proporción actual: la mayoría de las peleas se resuelven
simuladas o con el minijuego, y solo las importantes se juegan completas.

---

## Fuera de alcance

- Cambiar el motor de combate más allá de adaptarlo a los cuatro atributos.
- Tocar la interfaz salvo lo que exija el cambio de atributos.
- MMA, género femenino, más categorías de peso.
