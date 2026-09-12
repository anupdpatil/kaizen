import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.js', 'src/constants/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/test/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 85
      }
    }
  }
});
