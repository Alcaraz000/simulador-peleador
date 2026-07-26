// "Momentos memorables" de la pantalla de legado (legacy.js). Varias
// variantes por tipo de hito: cuatro líneas del mismo tipo (p.ej. dos
// defensas de título contra rivales distintos) no pueden sonar calcadas.
// `{rival}` y `{enJuego}` se reemplazan con los datos de la pelea.
//
// Ojo: esto NO era la causa real de la queja del usuario ("dos frases
// idénticas, mismo rival, mismo cinturón"). Esa causa era que ganar un
// título y defenderlo comparten `esTitulo:true` + `resultado:'v'` y
// legacy.js les ponía la MISMA frase a los dos. La variedad de acá es la
// segunda parte del pedido ("dale variedad a la redacción") una vez que la
// causa de fondo ya está separada en categorías distintas.
export const MOMENTOS = {
  tituloGanado: [
    'Le ganó a {rival} y se colgó el {enJuego}.',
    'Contra {rival}, se llevó el {enJuego} para casa.',
    'Noche de gloria: venció a {rival} y se convirtió en dueño del {enJuego}.',
    'Ahí nomás, ante {rival}, conquistó el {enJuego}.',
  ],
  tituloDefendido: [
    'Defendió el {enJuego} ante {rival}.',
    'Retuvo el {enJuego}: {rival} no se lo pudo sacar.',
    'Una defensa más del {enJuego}, esta vez ante {rival}.',
    'El {enJuego} siguió en su poder tras vencer a {rival}.',
  ],
  tituloPerdido: [
    'Perdió el {enJuego} contra {rival}.',
    'Se le escapó el {enJuego}: cayó ante {rival}.',
    '{rival} le arrebató el {enJuego}.',
  ],
  koPrimerRound: [
    'Durmió a {rival} en el primer round.',
    'Liquidó a {rival} antes de que sonara la campana del segundo round.',
    'Fulminante: {rival} ni llegó al segundo round.',
    'Un solo asalto le alcanzó para borrar a {rival}.',
  ],
  debut: [
    'Su debut fue contra {rival}.',
    'Todo empezó con {rival}, en su primera noche arriba del ring.',
  ],
};
