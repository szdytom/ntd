import { defineConfig } from 'vitest/config';

const glslTextPlugin = {
  name: 'glsl-text',
  transform(source: string, id: string) {
    if (!id.split('?', 1)[0]?.endsWith('.glsl')) return null;
    return { code: `export default ${JSON.stringify(source)};`, map: null };
  },
};

export default defineConfig({
  plugins: [glslTextPlugin],
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
