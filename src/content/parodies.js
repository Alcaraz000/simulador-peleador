/**
 * Elenco fijo de parodias obvias de íconos del boxeo, agrupadas por nacionalidad.
 * Son personajes INVENTADOS con nombres-chiste: no representan a personas reales
 * ni usan su imagen. El campo `referencia` existe solo para que se entienda el guiño.
 *
 * Cada país tiene sus máximas leyendas (rol 'leyenda', retiradas, récords a superar)
 * y al menos un peleador en actividad (rol 'activo', rival posible del jugador).
 */
export const PARODIAS = [
  // 🇺🇸 Estados Unidos
  { id: 'tyzon', nombre: 'Dyke Tyzon', apodo: 'El Ciclón', referencia: 'Mike Tyson', nacionalidad: 'US', disciplina: 'boxeo', categoria: 'mediano', estilo: 'noqueador', personalidad: 'agresivo', rol: 'activo', media: 82, edad: 26, frase: 'Todos tienen un plan hasta que les apago la luz.' },
  { id: 'alla', nombre: 'Muhammad Allá', apodo: 'El Más Grande', referencia: 'Muhammad Ali', nacionalidad: 'US', disciplina: 'boxeo', categoria: 'mediano', estilo: 'tecnico', personalidad: 'showman', rol: 'leyenda', media: 90, edad: 52, frase: 'Floto como mariposa y cobro como abeja reina.' },
  { id: 'mayweder', nombre: 'Floyd Mayweder', apodo: 'El Intocable', referencia: 'Floyd Mayweather', nacionalidad: 'US', disciplina: 'boxeo', categoria: 'pluma', estilo: 'tecnico', personalidad: 'provocador', rol: 'leyenda', media: 88, edad: 49, frase: 'Cero derrotas. Contá de nuevo: cero.' },
  { id: 'robinson', nombre: 'Shugar Ray Robinsón', apodo: 'Azúcar', referencia: 'Sugar Ray Robinson', nacionalidad: 'US', disciplina: 'boxeo', categoria: 'mediano', estilo: 'tecnico', personalidad: 'mentor', rol: 'leyenda', media: 91, edad: 61, frase: 'Antes de vos, el estilo lo inventé yo.' },

  // 🇲🇽 México
  { id: 'chaves', nombre: 'Julio César Cháves', apodo: 'El César', referencia: 'Julio César Chávez', nacionalidad: 'MX', disciplina: 'boxeo', categoria: 'pluma', estilo: 'menton', personalidad: 'agresivo', rol: 'leyenda', media: 89, edad: 54, frase: 'Ochenta y siete peleas sin perder. Buscá el dato.' },
  { id: 'canolo', nombre: 'Canolo Álvarez', apodo: 'El Pelirrojo', referencia: 'Canelo Álvarez', nacionalidad: 'MX', disciplina: 'boxeo', categoria: 'mediano', estilo: 'tecnico', personalidad: 'mercenario', rol: 'activo', media: 84, edad: 30, frase: 'Si la bolsa es buena, subo con cualquiera.' },
  { id: 'oliveros', nombre: 'Rubén Oliveros', apodo: 'Las Púas', referencia: 'Rubén "Púas" Olivares', nacionalidad: 'MX', disciplina: 'boxeo', categoria: 'pluma', estilo: 'noqueador', personalidad: 'showman', rol: 'leyenda', media: 86, edad: 57, frase: 'Fiesta toda la noche y nocaut a la tarde.' },

  // 🇦🇷 Argentina
  { id: 'monzonte', nombre: 'Carlos Monzonte', apodo: 'El Escopeta', referencia: 'Carlos Monzón', nacionalidad: 'AR', disciplina: 'boxeo', categoria: 'mediano', estilo: 'menton', personalidad: 'agresivo', rol: 'leyenda', media: 89, edad: 55, frase: 'Acá se viene a aguantar. El que aguanta, gana.' },
  { id: 'maravia', nombre: 'Sergio "Maravía" Martino', apodo: 'Maravía', referencia: 'Sergio "Maravilla" Martínez', nacionalidad: 'AR', disciplina: 'boxeo', categoria: 'mediano', estilo: 'tecnico', personalidad: 'respetuoso', rol: 'activo', media: 81, edad: 32, frase: 'Las manos abajo y la cabeza en otro lado. Probá pegarme.' },
  { id: 'lecho', nombre: 'Nicolino Lecho', apodo: 'El Intocable de Mendoza', referencia: 'Nicolino Locche', nacionalidad: 'AR', disciplina: 'boxeo', categoria: 'pluma', estilo: 'tecnico', personalidad: 'showman', rol: 'leyenda', media: 87, edad: 58, frase: 'Yo no esquivo golpes: los invito a pasar de largo.' },

  // 🇪🇸 España
  { id: 'legran', nombre: 'José Legrán', apodo: 'El Puma de Baracoa', referencia: 'José Legrá', nacionalidad: 'ES', disciplina: 'boxeo', categoria: 'pluma', estilo: 'tecnico', personalidad: 'showman', rol: 'leyenda', media: 85, edad: 56, frase: 'Bailo, pego y me voy sin despeinarme.' },
  { id: 'perico', nombre: 'Perico Fernándes', apodo: 'El Chaval', referencia: 'Perico Fernández', nacionalidad: 'ES', disciplina: 'boxeo', categoria: 'pluma', estilo: 'noqueador', personalidad: 'provocador', rol: 'leyenda', media: 83, edad: 53, frase: 'De la calle al título. Sin escalas.' },
  { id: 'diez', nombre: 'Poli Díez', apodo: 'El Potro de Vallecas', referencia: 'Poli Díaz', nacionalidad: 'ES', disciplina: 'boxeo', categoria: 'pluma', estilo: 'menton', personalidad: 'tramposo', rol: 'activo', media: 78, edad: 28, frase: 'Yo peleo como vivo: sin frenos.' },

  // 🇮🇹 Italia
  { id: 'benvenuto', nombre: 'Nino Benvenuto', apodo: 'El Elegante', referencia: 'Nino Benvenuti', nacionalidad: 'IT', disciplina: 'boxeo', categoria: 'mediano', estilo: 'tecnico', personalidad: 'respetuoso', rol: 'leyenda', media: 87, edad: 57, frase: 'El boxeo es una conversación. Yo hablo más claro.' },
  { id: 'marchiano', nombre: 'Rocky Marchiano', apodo: 'El Martillo', referencia: 'Rocky Marciano', nacionalidad: 'IT', disciplina: 'boxeo', categoria: 'mediano', estilo: 'menton', personalidad: 'mentor', rol: 'leyenda', media: 90, edad: 60, frase: 'Me retiré invicto. Vos fijate qué hacés con tu vida.' },
  { id: 'carnero', nombre: 'Primo Carnero', apodo: 'La Montaña', referencia: 'Primo Carnera', nacionalidad: 'IT', disciplina: 'boxeo', categoria: 'mediano', estilo: 'menton', personalidad: 'mercenario', rol: 'activo', media: 79, edad: 29, frase: 'Soy grande, lento y te voy a alcanzar igual.' },

  // 🇯🇵 Japón
  { id: 'inue', nombre: 'Naoya Inue', apodo: 'El Monstruo', referencia: 'Naoya Inoue', nacionalidad: 'JP', disciplina: 'boxeo', categoria: 'pluma', estilo: 'noqueador', personalidad: 'respetuoso', rol: 'activo', media: 85, edad: 27, frase: 'No hablo mucho. Los rounds tampoco duran mucho.' },
  { id: 'harata', nombre: 'Fighting Harata', apodo: 'El Puño del Sol', referencia: 'Fighting Harada', nacionalidad: 'JP', disciplina: 'boxeo', categoria: 'pluma', estilo: 'menton', personalidad: 'agresivo', rol: 'leyenda', media: 86, edad: 59, frase: 'Presión desde la campana hasta la campana.' },
  { id: 'sendo', nombre: 'Takeshi Sendo', apodo: 'El Jabalí de Naniwa', referencia: 'Takeshi Sendo', nacionalidad: 'JP', disciplina: 'boxeo', categoria: 'mediano', estilo: 'menton', personalidad: 'provocador', rol: 'activo', media: 80, edad: 28, frase: 'Vení para acá que esto recién empieza.' },
];
