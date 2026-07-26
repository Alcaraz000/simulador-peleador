/**
 * Cada estilo trae su propio entrenador (1 a 1, ver src/core/coach.js). La
 * rareza del entrenador acompaña la del estilo que representa: los estilos
 * normales tienen cuerpo técnico de gimnasio de barrio, los raros ya tienen
 * un nombre propio en el ambiente, y el estilo legendario tiene a Nicolino
 * Lecho, el mismo personaje que ya aparece retirado en `parodies.js` (guiño:
 * ahora enseña lo que hacía en el ring).
 *
 * `mods`: exactamente lo que este entrenador aporta a los atributos del
 * jugador (potencia, velocidad, tecnica, defensa, cardio, iq, grappling).
 * No toca especiales (mentón, disciplina personal): ese aporte solo se
 * pinta arriba de los atributos en el tablero (ver panel-peleador.js).
 */
export const ENTRENADORES = [
  {
    id: 'ruben_tanque_ferro',
    estiloId: 'noqueador',
    nombre: 'Rubén "Tanque" Ferro',
    iniciales: 'RF',
    escuela: 'Gimnasio El Yunque',
    frase: 'Un piano no le pega a nadie desde la lona. Tirá primero, preguntá después.',
    rareza: 'normal',
    mods: { potencia: 5, cardio: 2, defensa: -1 },
  },
  {
    id: 'profesor_aldana',
    estiloId: 'tecnico',
    nombre: 'El Profesor Aldana',
    iniciales: 'PA',
    escuela: 'Academia Guantes de Seda',
    frase: 'El que pega feo, pega una vez. El que pega lindo, pega siempre.',
    rareza: 'normal',
    mods: { tecnica: 6, iq: 2 },
  },
  {
    id: 'don_casimiro_vergara',
    estiloId: 'menton',
    nombre: 'Don Casimiro Vergara',
    iniciales: 'CV',
    escuela: 'Yunque y Fe',
    frase: 'Acá el que se cansa primero, pierde. Aguantá un round más que él.',
    rareza: 'normal',
    mods: { cardio: 5, defensa: 3 },
  },
  {
    id: 'nicolino_lecho',
    estiloId: 'contragolpeador',
    nombre: 'Nicolino Lecho',
    iniciales: 'NL',
    escuela: 'Escuela El Intocable de Mendoza',
    frase: 'Yo no esquivo golpes: los invito a pasar de largo. Ahora te voy a enseñar a vos.',
    rareza: 'legendaria',
    mods: { tecnica: 8, iq: 6, velocidad: 4 },
  },
  // --- Catálogo v4: un entrenador por cada estilo nuevo ---
  {
    id: 'walter_pajarito_ledesma',
    estiloId: 'volante',
    nombre: 'Walter "Pajarito" Ledesma',
    iniciales: 'WL',
    escuela: 'Escuela Alas del Sur',
    frase: 'El que no está, no lo tocan. Aprendé a no estar.',
    rareza: 'normal',
    mods: { velocidad: 4, cardio: 3 },
  },
  {
    id: 'negro_corvalan',
    estiloId: 'presionador',
    nombre: '"Negro" Corvalán',
    iniciales: 'NC',
    escuela: 'Gimnasio La Trituradora',
    frase: 'Yo no vengo a esperar nada. Vengo a cobrar cada segundo del rival.',
    rareza: 'normal',
    mods: { potencia: 4, cardio: 3 },
  },
  {
    id: 'amelia_la_zurda_funes',
    estiloId: 'zurdo_cruzado',
    nombre: 'Amelia "La Zurda" Funes',
    iniciales: 'AF',
    escuela: 'Academia del Espejo',
    frase: 'Todos entrenan para pegarle a un ortodoxo. Vos vas a ser el que nadie entrenó a leer.',
    rareza: 'rara',
    mods: { tecnica: 5, velocidad: 3, iq: 2 },
  },
  {
    id: 'cacho_herrera',
    estiloId: 'rustico',
    nombre: 'Cacho Herrera, "el Sin Códigos"',
    iniciales: 'CH',
    escuela: 'Yunque de Barrio Sin Reglas',
    frase: 'El reglamento lo escribió alguien que nunca se comió una piña en la calle. Acá se pelea de verdad.',
    rareza: 'rara',
    mods: { potencia: 6, cardio: 3, defensa: -2 },
  },
];
