import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/tests/setup.js'],
    include: ['src/tests/**/*.test.js']
  }
});
