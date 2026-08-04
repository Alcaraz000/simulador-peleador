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

// Las nacionalidades del juego, cada una con su escuela de boxeo. La bandera
// YA NO es un campo de dato acá (era un emoji 🇦🇷 muerto que nadie leía): en
// Windows esos emojis se ven como "AR" (bug reportado dos veces), así que la
// UI siempre dibuja la bandera en SVG con `bandera(codigo)` de `src/ui/flags.js`.
//
// v18: de 6 a 12. Con el mundial armado DESDE los rankings nacionales (ver
// rankingsProfesionales, divisiones.js), la cantidad de países es lo que
// decide qué tan variada se ve la tabla del mundo: con seis, el mundial era
// siempre las mismas seis banderas repartidas. Los seis nuevos se eligieron por
// dos criterios a la vez — peso boxístico real (Cuba, Reino Unido, Filipinas,
// Ucrania, Colombia y Ghana tienen escuela propia y campeones de verdad) y
// banderas que se distingan a 20px de ancho, que es el tamaño al que se dibujan
// en las filas del ranking. Cada país nuevo necesita además su entrada en
// NOMBRES_POR_PAIS (más abajo) y su dibujante en flags.js.
export const NACIONALIDADES = [
  { codigo: 'AR', nombre: 'Argentina', gentilicio: 'argentino', escuela: 'Aguante, corazón y mandíbula de granito.' },
  { codigo: 'MX', nombre: 'México', gentilicio: 'mexicano', escuela: 'Al cuerpo y para adelante. Nunca un paso atrás.' },
  { codigo: 'US', nombre: 'Estados Unidos', gentilicio: 'estadounidense', escuela: 'Velocidad, show y grandes escenarios.' },
  { codigo: 'ES', nombre: 'España', gentilicio: 'español', escuela: 'Oficio, temple y una izquierda paciente.' },
  { codigo: 'IT', nombre: 'Italia', gentilicio: 'italiano', escuela: 'Estilo, elegancia y una defensa de museo.' },
  { codigo: 'JP', nombre: 'Japón', gentilicio: 'japonés', escuela: 'Disciplina absoluta y precisión de relojero.' },
  { codigo: 'CU', nombre: 'Cuba', gentilicio: 'cubano', escuela: 'Escuela amateur pura: pierna, guardia alta y mano suelta.' },
  { codigo: 'GB', nombre: 'Reino Unido', gentilicio: 'británico', escuela: 'Jab de manual y una calma que desespera.' },
  { codigo: 'PH', nombre: 'Filipinas', gentilicio: 'filipino', escuela: 'Zurda relámpago y ángulos que nadie ve venir.' },
  { codigo: 'UA', nombre: 'Ucrania', gentilicio: 'ucraniano', escuela: 'Fondo de hierro y una técnica de laboratorio.' },
  { codigo: 'CO', nombre: 'Colombia', gentilicio: 'colombiano', escuela: 'Cintura, contragolpe y sangre caliente.' },
  { codigo: 'GH', nombre: 'Ghana', gentilicio: 'ghanés', escuela: 'Manos pesadas y un corazón que no afloja nunca.' },
];

/**
 * Nombres típicos por nacionalidad, para que los rivales suenen creíbles.
 *
 * Doce por doce = 144 combinaciones por país. Antes eran cinco por cinco = 25,
 * y eso traía dos problemas medidos: con ~26 peleadores de un mismo país vivos
 * a la vez, el ranking nacional se llenaba de "Ramiro Ledesma / Matías Ledesma
 * / Lucas Ledesma" (reportado con captura), y peor — el generador de
 * debutantes rechaza nombres repetidos, así que con el pool agotado la camada
 * nueva no entraba y el pool local se secaba de 25 a 1 en veinte temporadas,
 * desarmando las divisiones regional y nacional.
 */
export const NOMBRES_POR_PAIS = {
  AR: {
    nombres: ['Lucas', 'Matías', 'Nahuel', 'Facundo', 'Ramiro', 'Bruno', 'Thiago', 'Ezequiel', 'Joaquín', 'Iván', 'Gonzalo', 'Damián'],
    apellidos: ['Ortiz', 'Sosa', 'Quiroga', 'Peralta', 'Ledesma', 'Aguirre', 'Barrios', 'Cabrera', 'Maidana', 'Vergara', 'Miranda', 'Ferreyra'],
  },
  MX: {
    nombres: ['Julio', 'Rafa', 'Ernesto', 'Salvador', 'Ramón', 'Alfonso', 'Cuauhtémoc', 'Lalo', 'Beto', 'Everardo', 'Mauro', 'Ismael'],
    apellidos: ['Vargas', 'Chávez', 'Montoya', 'Barrera', 'Zúñiga', 'Ibarra', 'Guzmán', 'Salcedo', 'Rentería', 'Cuevas', 'Valdez', 'Nájera'],
  },
  US: {
    nombres: ['Ray', 'Tyrell', 'Marcus', 'Jayden', 'Dontrell', 'Darnell', 'Kevon', 'Malik', 'Trey', 'Deshawn', 'Rashad', 'Terrence'],
    apellidos: ['Carter', 'Brooks', 'Hayes', 'Wallace', 'Freeman', 'Whitfield', 'Sanders', 'Pryor', 'Boyd', 'Ellison', 'Marsh', 'Vaughn'],
  },
  ES: {
    nombres: ['Álvaro', 'Iker', 'Sergio', 'Rubén', 'Nacho', 'Unai', 'Borja', 'Aitor', 'Hugo', 'Marcos', 'Jorge', 'Óscar'],
    apellidos: ['Cifuentes', 'Bermúdez', 'Olmedo', 'Cortés', 'Rueda', 'Escudero', 'Arana', 'Gallardo', 'Serrano', 'Pardo', 'Quintana', 'Lozano'],
  },
  IT: {
    nombres: ['Marco', 'Salvatore', 'Enzo', 'Nico', 'Gianni', 'Dario', 'Fabio', 'Luca', 'Pietro', 'Sandro', 'Matteo', 'Corrado'],
    apellidos: ['Ricci', 'Fontana', 'Moretti', 'Bellini', 'Rizzo', 'Caruso', 'Ferrara', 'Lombardi', 'Vitale', 'Bruno', 'Marchetti', 'Gallo'],
  },
  JP: {
    nombres: ['Kenji', 'Hiro', 'Takumi', 'Ryo', 'Daiki', 'Sota', 'Haruki', 'Kaito', 'Ren', 'Yuto', 'Shinji', 'Naoki'],
    apellidos: ['Takeda', 'Yamamoto', 'Ishida', 'Kurosawa', 'Nakano', 'Fujimoto', 'Okada', 'Sakamoto', 'Mori', 'Hasegawa', 'Ueda', 'Kimura'],
  },
  CU: {
    nombres: ['Yordenis', 'Erislandy', 'Lázaro', 'Yuniel', 'Reinier', 'Odelín', 'Yosvany', 'Maikel', 'Roniel', 'Osleys', 'Arlén', 'Leinier'],
    apellidos: ['Savón', 'Duvergel', 'Balado', 'Pedroso', 'Cañizares', 'Hurtado', 'Tamayo', 'Betancourt', 'Sarduy', 'Almenteros', 'Videaux', 'Cepeda'],
  },
  GB: {
    nombres: ['Callum', 'Liam', 'Reece', 'Dillian', 'Josh', 'Kell', 'Billy Joe', 'Conor', 'Harlem', 'Nathan', 'Lewis', 'Tyrone'],
    apellidos: ['Whitaker', 'Ashfield', 'Crolla', 'Buckland', 'Fielding', 'Cheeseman', 'Langford', 'Ritson', 'Kinsella', 'Prescott', 'Hatton', 'Bramble'],
  },
  PH: {
    nombres: ['Nonito', 'Jerwin', 'Rey', 'Marlon', 'Vicente', 'Eumir', 'Dodie', 'Genesis', 'Reymart', 'Jonas', 'Arnel', 'Melvin'],
    apellidos: ['Ancajas', 'Casimero', 'Magdaleno', 'Bautista', 'Villanueva', 'Tapales', 'Dimaano', 'Sarmiento', 'Elorde', 'Salud', 'Bacal', 'Peñalosa'],
  },
  UA: {
    nombres: ['Oleksandr', 'Vasyl', 'Serhiy', 'Denys', 'Bohdan', 'Taras', 'Andriy', 'Yaroslav', 'Vitali', 'Mykola', 'Artem', 'Ihor'],
    apellidos: ['Kovalenko', 'Bondar', 'Shevchuk', 'Tkachenko', 'Melnyk', 'Kravets', 'Lysenko', 'Hrytsenko', 'Pavlenko', 'Romanchuk', 'Zhuk', 'Petrenko'],
  },
  CO: {
    nombres: ['Éider', 'Deivis', 'Yuberjen', 'Wílder', 'Breidis', 'Elkin', 'Darlys', 'Jhon', 'Fabio', 'Ceiber', 'Duván', 'Yeison'],
    apellidos: ['Arboleda', 'Mosquera', 'Palomeque', 'Caicedo', 'Angulo', 'Cuero', 'Perea', 'Murillo', 'Balanta', 'Hinestroza', 'Asprilla', 'Córdoba'],
  },
  GH: {
    nombres: ['Azumah', 'Kwame', 'Kofi', 'Emmanuel', 'Isaac', 'Richard', 'Bukom', 'Ike', 'Alfred', 'Yaw', 'Nana', 'Braimah'],
    apellidos: ['Quaye', 'Commey', 'Dogboe', 'Tagoe', 'Addy', 'Clottey', 'Mensah', 'Ankrah', 'Otoo', 'Laryea', 'Nartey', 'Amankwah'],
  },
};

export const GIMNASIOS = [
  'La Catedral', 'El Galpón', 'Sudor y Fierro', 'Club Atlético Progreso',
  'La Fábrica', 'Templo del Ring', 'La Cueva', 'Bunker MMA',
];
