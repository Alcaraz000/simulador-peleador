import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/main.js';

describe('setup', () => {
  it('expone la version del juego', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
