/**
 * Catálogo de apodos. Cada uno es una tarjeta más: rareza, descripción con
 * la voz del juego y `mods` propios (igual formato que ORIGENES en
 * fighter.js: puede tocar atributos y/o especiales — mentón, disciplina
 * personal). `repartirApodos` (src/core/nicknames.js) reparte 3 sin repetir
 * con la distribución de rarezas del proyecto (normal ~70% / rara ~25% /
 * legendaria ~5%, ver elegirPorRareza en cards.js).
 *
 * Los mods son deliberadamente chicos en los normales (son la mayoría de lo
 * que le va a tocar a cualquiera) y crecen en rareza y legendaria — sin
 * nerfear a estas últimas.
 */
export const NICKNAMES = [
  // --- Normales ---
  { id: 'relampago', nombre: 'El Relámpago', descripcion: 'Le pegás y todavía no te vieron llegar.', rareza: 'normal', mods: { velocidad: 3, cardio: -2 } },
  { id: 'roca', nombre: 'La Roca', descripcion: 'Ni con un caño te mueven la guardia.', rareza: 'normal', mods: { menton: 4, velocidad: -2 } },
  { id: 'toro', nombre: 'El Toro', descripcion: 'Para adelante, siempre. Frenar no está en el plan.', rareza: 'normal', mods: { potencia: 3, defensa: -2 } },
  { id: 'zurdo_maldito', nombre: 'El Zurdo Maldito', descripcion: 'La mano rara que nadie entrena en el gimnasio del barrio.', rareza: 'normal', mods: { tecnica: 2, iq: 1 } },
  { id: 'hiena', nombre: 'La Hiena', descripcion: 'Te ríe en la cara y te muerde en el cierre del round.', rareza: 'normal', mods: { iq: 2, disciplinaPersonal: -2 } },
  { id: 'chino', nombre: 'El Chino', descripcion: 'Estudia cada video del rival como si fuera examen final.', rareza: 'normal', mods: { iq: 3, potencia: -2 } },
  { id: 'tanque', nombre: 'El Tanque', descripcion: 'Pesado, lento y prácticamente imposible de tumbar.', rareza: 'normal', mods: { menton: 3, velocidad: -3 } },
  { id: 'dinamita', nombre: 'Dinamita', descripcion: 'Un cartucho corto: si prende, vuela todo.', rareza: 'normal', mods: { potencia: 4, cardio: -3 } },
  { id: 'profesor', nombre: 'El Profesor', descripcion: 'Te explica con las manos por qué hay que cuidar la guardia.', rareza: 'normal', mods: { tecnica: 3, iq: 1, potencia: -2 } },
  { id: 'lobo', nombre: 'El Lobo', descripcion: 'Caza solo, de noche, y no perdona al que queda herido.', rareza: 'normal', mods: { iq: 2, defensa: 1, cardio: -2 } },
  { id: 'bestia', nombre: 'La Bestia', descripcion: 'No parece humano cuando se enoja arriba del ring.', rareza: 'normal', mods: { potencia: 3, iq: -2 } },
  { id: 'cirujano', nombre: 'El Cirujano', descripcion: 'Corta con precisión: nunca un golpe de más.', rareza: 'normal', mods: { tecnica: 3, defensa: 1, potencia: -2 } },
  { id: 'fantasma', nombre: 'El Fantasma', descripcion: 'Está y no está. Cuando lo encontrás, ya te pegó.', rareza: 'normal', mods: { defensa: 3, velocidad: 1, potencia: -2 } },
  { id: 'corazon_de_leon', nombre: 'Corazón de León', descripcion: 'Se cae y se levanta las veces que hagan falta.', rareza: 'normal', mods: { menton: 3, disciplinaPersonal: 2 } },
  { id: 'martillo', nombre: 'El Martillo', descripcion: 'Un solo golpe y clava el clavo.', rareza: 'normal', mods: { potencia: 3, defensa: -1, cardio: -1 } },
  { id: 'sombra', nombre: 'La Sombra', descripcion: 'Te persigue toda la pelea sin que lo notes hasta el final.', rareza: 'normal', mods: { iq: 2, velocidad: 1, tecnica: -1 } },

  // --- Normales (v4: "los apodos son de lo más divertido del juego") ---
  { id: 'punal', nombre: 'El Puñal', descripcion: 'Entra rápido, corta rápido, se va antes de que el rival entienda qué pasó.', rareza: 'normal', mods: { velocidad: 2, potencia: 2, defensa: -2 } },
  { id: 'oso', nombre: 'El Oso', descripcion: 'Pesado para moverse, imposible de convencer de que retroceda.', rareza: 'normal', mods: { potencia: 3, cardio: -2 } },
  { id: 'vendaval', nombre: 'El Vendaval', descripcion: 'Arranca la pelea a mil y reza para que le alcance hasta el campanazo final.', rareza: 'normal', mods: { velocidad: 2, potencia: 2, cardio: -3 } },
  { id: 'muro', nombre: 'El Muro', descripcion: 'Nadie encontró todavía la fórmula para pasar de ahí.', rareza: 'normal', mods: { defensa: 3, velocidad: -2 } },
  { id: 'relojero', nombre: 'El Relojero', descripcion: 'Cada golpe cae exactamente cuando el rival no lo espera.', rareza: 'normal', mods: { tecnica: 2, iq: 2, cardio: -2 } },
  { id: 'pibe_de_oro', nombre: 'El Pibe de Oro', descripcion: 'Todo el barrio apostó a que iba a llegar, y hasta ahora nadie perdió esa apuesta.', rareza: 'normal', mods: { disciplinaPersonal: 3, potencia: -2 } },
  { id: 'contador', nombre: 'El Contador', descripcion: 'Lleva la cuenta de cada golpe que da y cada uno que recibe. Nunca falla el balance.', rareza: 'normal', mods: { iq: 3, defensa: 1, velocidad: -2 } },
  { id: 'terremoto', nombre: 'El Terremoto', descripcion: 'Cuando conecta, tiembla el barrio entero, no solo el rival.', rareza: 'normal', mods: { potencia: 4, tecnica: -2 } },
  { id: 'paciente', nombre: 'El Paciente', descripcion: 'Espera el momento exacto aunque tarde diez rounds en aparecer.', rareza: 'normal', mods: { menton: 2, iq: 2, potencia: -2 } },
  { id: 'venenoso', nombre: 'El Venenoso', descripcion: 'El golpe no duele al toque. Duele dos rounds después.', rareza: 'normal', mods: { tecnica: 2, potencia: 2, defensa: -2 } },

  // --- Raras ---
  { id: 'huracan', nombre: 'El Huracán', descripcion: 'Entra al ring y no queda nada parado.', rareza: 'rara', mods: { potencia: 4, velocidad: 2, defensa: -3 } },
  { id: 'matematico', nombre: 'El Matemático', descripcion: 'Calcula cada intercambio antes de que pase.', rareza: 'rara', mods: { iq: 4, tecnica: 2, potencia: -2 } },
  { id: 'incorruptible', nombre: 'El Incorruptible', descripcion: 'Ninguna oferta lo mueve del plan que trazó con su rincón.', rareza: 'rara', mods: { disciplinaPersonal: 5, defensa: 2 } },
  { id: 'demonio_de_tasmania', nombre: 'El Demonio de Tasmania', descripcion: 'Tira desde todos los ángulos y no para nunca.', rareza: 'rara', mods: { cardio: 4, potencia: 2, tecnica: -2 } },
  { id: 'quirurgico', nombre: 'Quirúrgico', descripcion: 'Encuentra el corte exacto en el momento exacto.', rareza: 'rara', mods: { tecnica: 4, iq: 2, cardio: -2 } },
  { id: 'mandibula_de_hierro', nombre: 'Mandíbula de Hierro', descripcion: 'Le probaron de todo. Nada lo movió del lugar.', rareza: 'rara', mods: { menton: 6, velocidad: -2 } },
  { id: 'ultimo_romantico', nombre: 'El Último Romántico', descripcion: 'Pelea como si todavía existiera el boxeo de antes, y por algún motivo, le funciona.', rareza: 'rara', mods: { tecnica: 3, menton: 3, potencia: -2 } },
  { id: 'implacable', nombre: 'El Implacable', descripcion: 'No hay round malo que lo pare ni consejo de esquina que lo frene.', rareza: 'rara', mods: { cardio: 3, disciplinaPersonal: 4, defensa: -2 } },
  { id: 'francotirador', nombre: 'El Francotirador', descripcion: 'Un solo golpe limpio por asalto. El resto es puntería esperando la ocasión.', rareza: 'rara', mods: { tecnica: 3, iq: 3, cardio: -2 } },
  { id: 'trueno_del_sur', nombre: 'El Trueno del Sur', descripcion: 'Cuando conecta ese derechazo, se escucha hasta en la otra punta de la provincia.', rareza: 'rara', mods: { potencia: 5, defensa: -2, tecnica: -1 } },
  { id: 'inmortal', nombre: 'El Inmortal', descripcion: 'Se cayó tantas veces que ya perdió la cuenta, y sigue subiendo al ring.', rareza: 'rara', mods: { menton: 5, velocidad: -2 } },

  // --- Legendarios (no se nerfean) ---
  { id: 'el_elegido', nombre: 'El Elegido', descripcion: 'Nace uno cada generación. Este año, sos vos.', rareza: 'legendaria', mods: { tecnica: 4, potencia: 3, iq: 3, cardio: -2 } },
  { id: 'rey_del_barrio', nombre: 'El Rey del Barrio', descripcion: 'Antes de ser nadie en el mundo, ya eras el dueño de tu cuadra.', rareza: 'legendaria', mods: { menton: 5, disciplinaPersonal: 5, potencia: 3 } },
  { id: 'monstruo_sagrado', nombre: 'Monstruo Sagrado', descripcion: 'Los cronistas ya escriben tu leyenda y todavía no diste tu primera pelea profesional.', rareza: 'legendaria', mods: { potencia: 4, tecnica: 3, velocidad: 3, iq: 2, cardio: -3 } },
  { id: 'ultimo_de_su_estirpe', nombre: 'El Último de su Estirpe', descripcion: 'Cuando se retire, van a tardar una generación entera en encontrar a otro igual.', rareza: 'legendaria', mods: { tecnica: 4, potencia: 4, menton: 3, cardio: -2 } },
  { id: 'segundo_asalto_eterno', nombre: 'El del Segundo Asalto Eterno', descripcion: 'Nadie sabe explicarlo, pero cada pelea suya parece durar un round entero más de lo que debería — y siempre a su favor.', rareza: 'legendaria', mods: { cardio: 5, iq: 4, velocidad: 3, potencia: -2 } },
];
