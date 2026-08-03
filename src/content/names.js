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

// Las 6 nacionalidades de la v1, cada una con su escuela de boxeo. La bandera
// YA NO es un campo de dato acá (era un emoji 🇦🇷 muerto que nadie leía): en
// Windows esos emojis se ven como "AR" (bug reportado dos veces), así que la
// UI siempre dibuja la bandera en SVG con `bandera(codigo)` de `src/ui/flags.js`.
export const NACIONALIDADES = [
  { codigo: 'AR', nombre: 'Argentina', gentilicio: 'argentino', escuela: 'Aguante, corazón y mandíbula de granito.' },
  { codigo: 'MX', nombre: 'México', gentilicio: 'mexicano', escuela: 'Al cuerpo y para adelante. Nunca un paso atrás.' },
  { codigo: 'US', nombre: 'Estados Unidos', gentilicio: 'estadounidense', escuela: 'Velocidad, show y grandes escenarios.' },
  { codigo: 'ES', nombre: 'España', gentilicio: 'español', escuela: 'Oficio, temple y una izquierda paciente.' },
  { codigo: 'IT', nombre: 'Italia', gentilicio: 'italiano', escuela: 'Estilo, elegancia y una defensa de museo.' },
  { codigo: 'JP', nombre: 'Japón', gentilicio: 'japonés', escuela: 'Disciplina absoluta y precisión de relojero.' },
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
};

export const GIMNASIOS = [
  'La Catedral', 'El Galpón', 'Sudor y Fierro', 'Club Atlético Progreso',
  'La Fábrica', 'Templo del Ring', 'La Cueva', 'Bunker MMA',
];
