import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/ui/**', 'happy-dom']],
    include: ['tests/**/*.test.js'],
    // La suite trae varios tests de simulación de miles de carreras completas
    // (tests/core/career.test.js, tests/core/career-lesiones-reales.test.js:
    // "ritmo de la carrera", "progresión de cinturones", "ofertas de pelea
    // con lesiones reales" — todos con 1500-3000 semillas, necesarios para no
    // ser flaky en un sistema probabilístico, ver los comentarios en esos
    // archivos). El heap por defecto de los workers de Vitest alcanzaba justo
    // al límite en máquinas con poca memoria disponible ("JavaScript heap out
    // of memory" en pleno `vitest run`, medido en la corrección del Sistema
    // 1/2): más heap para los procesos worker, no para el proceso principal.
    poolOptions: {
      forks: { execArgv: ['--max-old-space-size=8192'] },
      threads: { execArgv: ['--max-old-space-size=8192'] },
    },
  },
});
