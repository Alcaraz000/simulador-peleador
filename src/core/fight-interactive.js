import { createRng } from './rng.js';
import { clamp } from './stats.js';
import { simularRound, PLANES } from './fight.js';

export const UMBRAL_GROGGY = 22;
export const VENTANA_MS = 3200;

export const INSTRUCCIONES_RINCON = {
  acelerar: {
    id: 'acelerar',
    nombre: 'Pisá el acelerador',
    texto: 'Ir a buscarlo. Das vuelta las tarjetas si aguantás el gas.',
    plan: 'frente',
    mods: { aguanteRival: -4, fatigaJugador: 6, ventanaGolpe: 0.05 },
  },
  respirar: {
    id: 'respirar',
    nombre: 'Boxeá y respirá',
    texto: 'Movés y tocás sin arriesgar. Recuperás fatiga.',
    plan: 'aguantar',
    mods: { aguanteRival: 0, fatigaJugador: -10, ventanaGolpe: 0 },
  },
  cuerpo: {
    id: 'cuerpo',
    nombre: 'Todo al cuerpo',
    texto: 'Castigás el cuerpo. Le abrís la puerta al nocaut.',
    plan: 'afuera',
    mods: { aguanteRival: -8, fatigaJugador: 3, ventanaGolpe: 0.18 },
  },
};

export const ZONAS_GOLPE = {
  menton: { id: 'menton', nombre: 'Mentón', dificultad: 0.75, danoBase: 60 },
  sien: { id: 'sien', nombre: 'Sien', dificultad: 0.5, danoBase: 42 },
  higado: { id: 'higado', nombre: 'Hígado', dificultad: 0.3, danoBase: 34 },
};

function clonar(pelea) {
  return {
    ...pelea,
    aguante: { ...pelea.aguante },
    fatiga: { ...pelea.fatiga },
    tarjetas: { ...pelea.tarjetas },
    caidas: { ...pelea.caidas },
  };
}

export function avanzarPelea(pelea) {
  const paso = simularRound(pelea);
  if (paso.pelea.terminada) return { pelea: { ...paso.pelea, pendiente: null }, eventos: paso.eventos };

  const bonus = pelea.bonusVentana ?? 0;
  const rivalGroggy = paso.pelea.aguante.rival <= UMBRAL_GROGGY;
  const rng = createRng(paso.pelea.semilla);
  rng.restaurar(paso.pelea.rngEstado);
  const seAbre = rivalGroggy && rng.chance(clamp(0.45 + bonus, 0, 0.9));
  const rngEstado = rng.estado();

  return {
    pelea: { ...paso.pelea, rngEstado, pendiente: seAbre ? 'golpe' : 'rincon', bonusVentana: 0 },
    eventos: paso.eventos,
  };
}

export function estadoRincon(pelea) {
  const { jugador, rival } = pelea.tarjetas;
  const diferencia = jugador - rival;
  const tarjetasTexto = diferencia === 0
    ? `Empatado ${jugador}-${rival}`
    : diferencia > 0 ? `Vas ${jugador}-${rival} arriba` : `Vas ${jugador}-${rival} abajo`;

  let consejo;
  if (diferencia < 0 && pelea.fatiga.jugador > 60) {
    consejo = 'Te está afanando los rounds y venís sin gas. Elegí con qué te la juegás.';
  } else if (diferencia < 0) {
    consejo = 'Te está afanando los rounds con el jab. O le metés presión o esto se va en las tarjetas.';
  } else if (pelea.fatiga.jugador > 60) {
    consejo = 'Vas bien, pero estás fundido. Cuidá el gas y no regales nada.';
  } else {
    consejo = 'Lo tenés medido. Sostené el plan y no te apures.';
  }

  return {
    tarjetasTexto,
    fatigaJugador: Math.round(pelea.fatiga.jugador),
    fatigaRival: Math.round(pelea.fatiga.rival),
    aguanteRival: Math.round(pelea.aguante.rival),
    consejo,
  };
}

export function aplicarInstruccionRincon(pelea, instruccionId) {
  const instruccion = INSTRUCCIONES_RINCON[instruccionId];
  if (!instruccion) throw new Error(`Instrucción desconocida: ${instruccionId}`);
  const nueva = clonar(pelea);
  nueva.plan = instruccion.plan;
  nueva.aguante.rival = clamp(nueva.aguante.rival + instruccion.mods.aguanteRival, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + instruccion.mods.fatigaJugador, 0, 100);
  nueva.bonusVentana = instruccion.mods.ventanaGolpe;
  nueva.pendiente = null;
  return nueva;
}

export function abrirGolpeDeGracia(pelea) {
  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);
  const zonaAbierta = rng.weighted([
    { valor: 'higado', peso: 5 },
    { valor: 'sien', peso: 3 },
    { valor: 'menton', peso: 1 },
  ]);
  const zonas = Object.values(ZONAS_GOLPE).map((zona) => ({
    ...zona,
    estado: zona.id === zonaAbierta ? 'abierto' : zona.id === 'menton' ? 'tapado' : 'riesgoso',
  }));
  return { zonaAbierta, zonas, ventanaMs: VENTANA_MS };
}

export function resolverGolpeDeGracia(pelea, { zonaElegida, precision, aTiempo }) {
  const nueva = clonar(pelea);
  nueva.pendiente = null;
  nueva.bonusVentana = 0;
  const eventos = [];
  const round = nueva.roundActual;
  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  if (!aTiempo) {
    nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 8, 0, 100);
    nueva.aguante.rival = clamp(nueva.aguante.rival + 8, 0, 100);
    eventos.push({
      round,
      tipo: 'ventana_perdida',
      texto: `${apodoJ} duda medio segundo de más y ${apodoR} se recompone. Perdiste la chance.`,
    });
    return { pelea: nueva, eventos };
  }

  const rng = createRng(nueva.semilla);
  rng.restaurar(nueva.rngEstado);
  const { zonaAbierta } = abrirGolpeDeGracia(pelea);
  const zona = ZONAS_GOLPE[zonaElegida] ?? ZONAS_GOLPE.higado;
  const acerto = zonaElegida === zonaAbierta;

  const potencia = nueva.snapshot.jugador.atributos.potencia;
  const mentonRival = nueva.snapshot.rival.especiales.menton;
  const base = clamp(precision, 0, 1) * (acerto ? 1 : 0.35) * (1 - zona.dificultad * 0.4);
  const probKo = clamp(base * 1.5 + (potencia - mentonRival) / 300, 0, 0.97);

  const dano = Math.round(zona.danoBase * clamp(precision, 0, 1) * (acerto ? 1 : 0.4));
  nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + 5, 0, 100);

  if (nueva.aguante.rival <= 0 || rng.chance(probKo)) {
    nueva.terminada = true;
    nueva.resultado = {
      ganador: 'jugador',
      metodo: nueva.caidas.rival >= 1 ? 'tko' : 'ko',
      round,
      texto: `${apodoJ} gana por nocaut en el round ${round}.`,
    };
    eventos.push({
      round,
      tipo: 'ko',
      texto: acerto
        ? `${apodoJ} la manda al ${zona.nombre.toLowerCase()} y ${apodoR} se dobla. ¡Se terminó!`
        : `${apodoJ} pega donde puede y ${apodoR} igual se cae. ¡Nocaut!`,
    });
  } else {
    nueva.caidas.rival += acerto ? 1 : 0;
    eventos.push({
      round,
      tipo: 'golpe_fallado',
      texto: acerto
        ? `${apodoJ} conecta al ${zona.nombre.toLowerCase()} pero ${apodoR} aguanta y se rearma.`
        : `${apodoJ} apunta al ${zona.nombre.toLowerCase()} y encuentra la guardia. ${apodoR} se recompone.`,
    });
  }

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}
