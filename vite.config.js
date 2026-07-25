import { defineConfig } from 'vite';

// El sitio se publica en https://<usuario>.github.io/simulador-peleador/,
// asi que los assets tienen que resolverse desde ese subdirectorio.
export default defineConfig({
  base: '/simulador-peleador/',
});
