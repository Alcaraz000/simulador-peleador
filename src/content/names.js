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

/** Las 6 nacionalidades de la v1, cada una con su bandera y su escuela de boxeo. */
export const NACIONALIDADES = [
  { codigo: 'AR', nombre: 'Argentina', gentilicio: 'argentino', bandera: '🇦🇷', escuela: 'Aguante, corazón y mandíbula de granito.' },
  { codigo: 'MX', nombre: 'México', gentilicio: 'mexicano', bandera: '🇲🇽', escuela: 'Al cuerpo y para adelante. Nunca un paso atrás.' },
  { codigo: 'US', nombre: 'Estados Unidos', gentilicio: 'estadounidense', bandera: '🇺🇸', escuela: 'Velocidad, show y grandes escenarios.' },
  { codigo: 'ES', nombre: 'España', gentilicio: 'español', bandera: '🇪🇸', escuela: 'Oficio, temple y una izquierda paciente.' },
  { codigo: 'IT', nombre: 'Italia', gentilicio: 'italiano', bandera: '🇮🇹', escuela: 'Estilo, elegancia y una defensa de museo.' },
  { codigo: 'JP', nombre: 'Japón', gentilicio: 'japonés', bandera: '🇯🇵', escuela: 'Disciplina absoluta y precisión de relojero.' },
];

/** Nombres típicos por nacionalidad, para que los rivales suenen creíbles. */
export const NOMBRES_POR_PAIS = {
  AR: { nombres: ['Lucas', 'Matías', 'Nahuel', 'Facundo', 'Ramiro'], apellidos: ['Ortiz', 'Sosa', 'Quiroga', 'Peralta', 'Ledesma'] },
  MX: { nombres: ['Julio', 'Rafa', 'Ernesto', 'Salvador', 'Ramón'], apellidos: ['Vargas', 'Chávez', 'Montoya', 'Barrera', 'Zúñiga'] },
  US: { nombres: ['Ray', 'Tyrell', 'Marcus', 'Jayden', 'Dontrell'], apellidos: ['Carter', 'Brooks', 'Hayes', 'Wallace', 'Freeman'] },
  ES: { nombres: ['Álvaro', 'Iker', 'Sergio', 'Rubén', 'Nacho'], apellidos: ['Cifuentes', 'Bermúdez', 'Olmedo', 'Cortés', 'Rueda'] },
  IT: { nombres: ['Marco', 'Salvatore', 'Enzo', 'Nico', 'Gianni'], apellidos: ['Ricci', 'Fontana', 'Moretti', 'Bellini', 'Rizzo'] },
  JP: { nombres: ['Kenji', 'Hiro', 'Takumi', 'Ryo', 'Daiki'], apellidos: ['Takeda', 'Yamamoto', 'Ishida', 'Kurosawa', 'Nakano'] },
};

export const GIMNASIOS = [
  'La Catedral', 'El Galpón', 'Sudor y Fierro', 'Club Atlético Progreso',
  'La Fábrica', 'Templo del Ring', 'La Cueva', 'Bunker MMA',
];
