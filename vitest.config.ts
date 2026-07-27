import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'build', include: ['tests/build/**/*.test.ts'], environment: 'node' } },
    ],
  },
});
