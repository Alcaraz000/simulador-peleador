# Documento de Diseño — Simulador de Carrera de Deportes de Combate

> **Nombre de trabajo:** SimuladorPeleador (pendiente de bautizar).
> **Fecha:** 2026-07-24
> **Estado:** Diseño aprobado. Base para el plan de implementación.

---

## 1. Norte del proyecto

**El objetivo número uno es que el juego sea DIVERTIDO.** Todas las decisiones de
alcance y esfuerzo se subordinan a eso.

Los **tres motores de diversión** que guían el diseño (elegidos por el creador):

1. **Construir tu leyenda** — el viaje "de la nada a la gloria": ver crecer tu MEDIA,
   romper récords y terminar con una historia única.
2. **Rivalidades y picante** — provocar, cruzar declaraciones, la revancha contra el
   que te ganó; odiar a un rival y cobrárselas arriba del ring.
3. **El drama de las peleas** — tensión round-por-round, el KO en el último asalto,
   las remontadas épicas.

El **humor es un condimento** (registro "realista con chistes"), no un género: la
gracia vive en *cómo se cuentan* las cosas, no en eventos absurdos. **No** hay
eventos comodín disparatados; todo es verosímil.

---

## 2. Visión y filosofía

Juego narrativo de toma de decisiones donde el jugador crea un peleador y vive toda
su carrera. **No hay combates jugables**: la historia, los resultados y la evolución
dependen de las decisiones.

- Decisiones simples (2-3 opciones), consecuencias profundas.
- Alta rejugabilidad por **variedad de historias y estilos**, no por meta-progresión.
- Una carrera completa por partida, en **una sola sentada (~20-40 min)**.
- Un mundo que respira alrededor del jugador.

---

## 3. Resumen de decisiones de diseño

| Tema | Decisión |
|---|---|
| Ritmo | Una carrera completa por partida, en una sentada (~20-40 min), muy rejugable |
| Mundo vivo | Intermedio: se simulan de verdad los rivales clave de tu categoría; el resto es ilusión generada |
| Peleas | Round por round en modo rápido (no jugable; mirás y sentís la tensión) |
| Riesgo | Indulgente: siempre completás la carrera; la gracia es cuán grande es tu legado |
| Contenido | Híbrido: decisiones/dilemas escritos a mano + relleno (peleas, noticias) por plantillas |
| Disciplinas | Diferencia real pero acotada; disciplina *mutable* durante la carrera |
| Dinero | Intermedio: gastás en pocas cosas clave (entrenador, gimnasio, recuperación) |
| Vida personal | Presente pero liviana (dilemas que afectan moral/stats) |
| Redes | Decisiones de posteo que mueven fama/hype/rivalidades/sponsors |
| Tono | Realista + humor, verosímil ("realista con chistes") |
| Progresión de stats | Cartas de mejora tipo *Potrero*: el azar ofrece 3, vos elegís 1 |
| Rivalidades | Archirrival emergente + rivalidades que encendés vos + careos pre-pelea |
| Estilos de pelea | Builds bien marcados que cambian cómo se juega (rejugabilidad) |
| Rivales de categoría | Inventados, con un elenco fijo de **parodias obvias de íconos** |
| Identidad | Voz local/argentina + latina; mundo global (peleás con gente de todo el mundo) |
| Género (v1) | Un solo género (masculino) para la rebanada jugable; femenino después |
| Entre partidas | Cada carrera independiente; autoguardado *dentro* de la carrera |
| Interfaz | Números claros a la vista; estética minimalista y moderna con íconos (sin emojis) |
| Plataforma | Web estática, por link, sin cuentas; guardado en el navegador |
| Construcción | Rebanada jugable primero (vertical slice), después se amplía |

---

## 4. Estructura de juego

### 4.1 Etapas
La carrera va de ~14 a ~39 años, dividida en 4 etapas con ritmo distinto para que
una carrera entera entre en una sentada:

1. **Juvenil (14-17)** — arranque comprimido, tipo montaje: pocas decisiones
   formativas, alguna pelea de base. Definís de dónde venís.
2. **Amateur (18-20)** — competís en serio (torneos locales); primeras decisiones
   con peso.
3. **Profesional (21-35)** — el grueso del juego: ofertas, cinturones, defensas
   obligatorias, rivalidades, redes, plata.
4. **Veterano (36-39)** — cierre: peleas elegidas, cuidar el cuerpo, construir el
   legado, decidir cuándo colgar los guantes.

### 4.2 El "turno" (bloque)
El tiempo avanza en **bloques** (un bloque ≈ un campamento/temporada de unos meses).
Ciclo de cada bloque:

> Ver tu peleador → Elegir foco (entrenar / vida / redes) → Posible evento aleatorio
> → Oferta / preparación de pelea → Pelea round-por-round → Consecuencias → Noticias
> → Avanza el tiempo.

No todos los bloques tienen pelea; algunos son puro desarrollo y drama. El juego
regula cuántas decisiones ofrece para llegar a **~30-40 momentos jugables por
carrera**.

### 4.3 Dashboard (pantalla principal)
Siempre a la vista, en una sola pantalla tipo tablero (referencia visual: *Potrero*):
tu peleador y récord, **MEDIA**, stats con números, estado (forma/fatiga/lesión/
moral), dinero, fama, y "qué viene ahora" (la próxima decisión o pelea).

---

## 5. El peleador

### 5.1 MEDIA (overall)
Un número grande que resume tus atributos de combate (como el `65` de *Potrero*).
Sube cuando mejorás; sirve para verte de un vistazo y para el *matchmaking* (contra
quién te toca pelear).

### 5.2 Atributos permanentes (los que mejorás con cartas)
Set limpio (~6 tiles en pantalla):

- **Potencia** — cuánto lastima tu pegada.
- **Velocidad** — manos, pies, reflejos.
- **Técnica** — pulido, precisión, repertorio.
- **Defensa** — esquivar/bloquear, no comerte daño.
- **Cardio** — aguante para no fundirte en rounds largos.
- **IQ de pelea** — lectura, timing, gestión del combate.
- **Grappling** — *solo* en disciplinas que lo usan (MMA sí, Boxeo no).

### 5.3 Atributos especiales (suben más por decisiones/vida que por entrenamiento)
- **Disciplina** — cuidás tu cuerpo/rutina → afecta lesiones, peso y cuánto rendís
  tu potencial.
- **Mentón** — cuánto castigo aguantás antes de caer; sube lento.

### 5.4 Estado actual (cambia todo el tiempo)
- **Forma** — tu nivel presente (bien preparado vs oxidado); modifica tu rendimiento
  real en la próxima pelea.
- **Fatiga** — cansancio acumulado; mucha fatiga baja forma y sube riesgo de lesión.
- **Lesión** — si estás lesionado y cuánto; afecta preparación y peleas.
- **Moral** — ánimo; afecta decisiones disponibles y rendimiento.

### 5.5 Recursos
Récord (V-D-E y cómo: KO / decisión / sumisión), Dinero, Fama, Títulos.

### 5.6 Estilos / builds de pelea
Motor central de rejugabilidad: estilos **bien marcados** que cambian cómo se juega
y cómo se resuelven las peleas. Ejemplos:

- **Noqueador** — Potencia alta, busca terminarla temprano; peligroso pero se funde.
- **Boxeador técnico / escurridizo** — Técnica + Velocidad + Defensa; gana por
  puntos y desgaste.
- **Luchador / grappler** (MMA) — Grappling alto; controla y busca la sumisión.
- **Guerrero de mentón de hierro** — Mentón + Cardio; aguanta todo y quiebra al rival
  en rounds largos.

El estilo condiciona qué stats pesan, qué cartas y planes te convienen, y el cruce
contra el estilo del rival (*ventajas/desventajas de estilo*).

### 5.7 Creación del peleador
Guiada pero rápida para no demorar el arranque:

- Nombre, nacionalidad, disciplina inicial.
- Físico: altura / peso / alcance → definen tu **categoría de peso**.
- Mano hábil.
- **Origen / infancia** y **estilo de pelea** → dan modificadores iniciales y "sabor"
  a los textos.
- Botón **"Aleatorio / Sorprendeme"** y presets para arrancar en 2 clics.
- v1: un solo género (masculino).

---

## 6. Motor de decisiones (el corazón del juego)

Todo lo que pasa entre pelea y pelea se sirve como **tarjetas, de a una** (referencia:
*Potrero*). Perfecto para celular. Tipos de "beat":

### 6.1 Carta de mejora
"El campamento rindió: elegí una." Ofrece **3 mejoras** con sabor narrativo + el
modificador explícito (`+3 Velocidad`). El azar decide *qué 3 te tocan*; vos elegís.
El **dinero** entra acá: un mejor gimnasio/entrenador mejora las cartas (más opciones,
números más altos, o poder descartar y volver a tirar).

### 6.2 Decisión / evento
Dilema escrito a mano o evento aleatorio (dopaje, chantaje, sponsor, cambio de
entrenador, cancelación, escándalo, invitación especial). Siempre **2-3 opciones**,
con tres sabores de modificador:

- **Directo:** `+5 Cardio`
- **Combinado:** `+5 Cardio · -3 Potencia`
- **Con probabilidad:** `50% Forma +3 / 50% Forma -3` → el juego **"tira el dado"**:
  piensa unos segundos con una animación de suspenso y recién ahí muestra el resultado.

### 6.3 Carta de redes
Cada tanto: "¿Qué posteás?" (2-3 opciones: provocar a un rival, mostrarte humilde,
promocionar la pelea) que mueven **fama / hype / rivalidades / sponsors**.

### 6.4 Careo / declaración (pre-pelea grande)
Beat propio de **rivalidad**: antes de las peleas importantes elegís cómo encarás al
rival (provocar, respetar, meter presión psicológica). Mueve el **hype**, la actitud
del rival y puede pesar en la pelea. Es una de las mecánicas de diversión centrales.

### 6.5 Oferta / pelea
Ver §8.

### 6.6 Consecuencias encadenadas
Una elección no toca solo un número: puede afectar estado, plata, moral, **encender
una rivalidad**, cambiar una relación, **habilitar o cerrar eventos futuros** y casi
siempre genera un **titular de noticia**. "Decisiones simples, consecuencias
profundas."

---

## 7. Rivalidades y picante

- **Archirrival emergente:** del grupo de rivales "reales" de tu categoría emerge
  **un** archirrival que te cruza toda la carrera, con historial cara a cara
  (ej. "12-12 vs Molina").
- **Rivalidades que encendés vos:** tus posteos, careos y decisiones pueden crear
  rivalidades nuevas.
- **Careos pre-pelea** (§6.4) y **trash talk por redes** (§6.3) como las dos vías de
  picante.
- La **revancha** contra quien te ganó es un beat destacado (cerrar el círculo).

---

## 8. Peleas

### 8.1 Ofertas
Llegan como oferta con todo a la vista: **rival** (récord, estilo, personalidad,
MEDIA), **bolsa** (plata), **riesgo/recompensa** y **qué está en juego** (ranking,
cinturón, defensa obligatoria). Aceptás o rechazás — rechazar también cuesta (perdés
impulso, fans, o una oferta que no vuelve). Se arranca en torneos locales; ganando,
aparecen escenarios más grandes, rankings, cinturones y defensas obligatorias.

### 8.2 Preparación + plan
Beat corto de preparación (una carta/decisión: foco del campamento, corte de peso)
que ajusta tu **Forma/Fatiga** de entrada. Incluye una **decisión de estrategia**
liviana ("ir al frente / boxear de afuera / aguantar y contragolpear") que pesa junto
a tus stats. Suma agencia sin ser combate jugable.

### 8.3 Resolución round-por-round (modo rápido)
Por debajo: cada peleador tiene una "efectividad" derivada de sus stats (ponderados
según **disciplina** y **estilo**), ajustada por Forma/Fatiga/Moral/Lesión, el cruce
de estilos, el plan y algo de azar. El texto aparece round a round, ágil, con vaivenes
y **drama** (remontadas, caídas, el KO en el último asalto). Desenlaces posibles:
**KO/TKO, sumisión** (MMA), **decisión** (puntos) o **descalificación**; puede haber
lesión. El resultado dispara consecuencias: récord, fama, plata, moral, ranking,
**noticias**.

### 8.4 Títulos
Ganar un título trae gloria y **defensas obligatorias** (peleas recurrentes de alto
riesgo). Perder el cinturón es drama puro.

---

## 9. Mundo vivo (Intermedio)

- Un grupo chico de **rivales "reales" de tu categoría** (inventados) pelea de verdad
  entre sí: ganan, pierden, suben/bajan en el ranking, envejecen, se lesionan, se
  retiran — sin depender del jugador. De ahí **emerge el archirrival**.
- **Elenco fijo de parodias** de íconos del deporte, con nombres-chiste obvios
  (ej. "Dyke Tyzon" → Mike Tyson, "Conor McConnor" → Conor McGregor, "Muhammad Allá"
  → Muhammad Ali). **Roles mixtos:** algunos son rivales activos de tu era que podés
  enfrentar (el campeón a vencer); otros son leyendas retiradas (récords a superar,
  mentores, promotores, comentaristas que te tiran palos).
- El resto del mundo es **ilusión generada** (noticias, récords, oponentes creados
  cuando hacen falta).
- **Rankings** que se actualizan y una sección de **Noticias** que refleja todo para
  que el mundo se sienta vivo.

---

## 10. Costados

- **Dinero (intermedio):** entra por bolsas y sponsors; sale en mejorar gimnasio/
  entrenador (mejora las cartas de mejora), recuperar lesiones más rápido, y alguna
  tentación de la vida personal.
- **Vida personal (liviana):** beats sobre familia, amigos, relaciones, vicios y
  disciplina personal. Afectan moral, disciplina, a veces stats o plata. No es un sim
  de vida.
- **Lesiones (indulgente):** pueden pasar en peleas o por fatiga alta / poca
  disciplina. Casi siempre son contratiempos (bajan forma, piden recuperación y
  plata, mueven el calendario). Solo en casos extremos y raros fuerzan un retiro
  anticipado; el default es completar la carrera.

---

## 11. Final de carrera y legado

Al retirarte (~39 o cuando quieras), pantalla de cierre **pensada para sacarle captura
y compartir** (screenshot-worthy): récord, títulos, defensas, dinero, lesiones,
**rivales históricos** (con el archirrival destacado), momentos memorables,
**biografía generada dinámicamente** y los **legados** (deportivo, nacional,
económico, mediático, ético). Es el "premio" de la run y el gancho para volver a
jugar y superar tu marca.

---

## 12. Alcance de la rebanada jugable (v1)

**Entra en la v1:**
- 2 disciplinas: **Boxeo** y **MMA** (icónicas y mecánicamente distintas; MMA suma
  Grappling/sumisiones).
- Un género (masculino); 1-2 categorías de peso.
- Las 4 etapas con ritmo comprimido.
- El motor de tarjetas completo: mejora / decisión-evento / redes / careo / oferta-pelea.
- Estilos/builds bien marcados.
- Peleas round-por-round rápidas con drama.
- Elenco de parodias + rivales inventados + archirrival emergente + rivalidades que
  encendés.
- Dinero intermedio, vida personal liviana, lesiones, noticias.
- Pantalla de legado compartible + autoguardado dentro de la carrera.

**Queda para después (post-v1):**
- Más disciplinas (Karate, etc.).
- Género femenino con sus divisiones.
- Más categorías de peso.
- Más eventos escritos a mano.
- Torneos ilegales / exhibiciones post-retiro.
- Posibles desbloqueos entre partidas.

---

## 13. Estética y tecnología

**Estética:** referencia *Potrero* — oscura, minimalista, tarjetas, tipografía
condensada en mayúsculas, un color de acento para lo positivo, íconos SVG (sin
emojis), prolija y moderna. **Responsive** (celular + computadora). Feedback visual
con "juice" tasteful: pop de stat al subir (flechita ▲), suspenso del dado, remate de
KO, cierre vistoso — sin caer en lo recargado.

**Tecnología:** web **estática, 100% del lado del cliente**, sin backend ni cuentas;
guardado en el navegador (localStorage). Publicable por link gratis y también
ejecutable local. Stack liviano **sin herramientas de compilación pesadas** (a definir
en el plan; preferencia por JS puro / framework liviano).

---

## 14. Decisiones pendientes / abiertas

- **Nombre del juego** (hoy "SimuladorPeleador" como nombre de trabajo).
- Categorías de peso exactas para la v1 (1 o 2, y cuáles).
- Set inicial de estilos/builds a implementar en v1 y su balance.
- Tamaño del elenco de parodias para la v1.
- Elección concreta de stack liviano (se define en el plan de implementación).
