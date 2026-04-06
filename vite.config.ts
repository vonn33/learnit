import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import path from 'path';

export default defineConfig({
  plugins: [
    {enforce: 'pre', ...mdx({remarkPlugins: [remarkGfm, remarkFrontmatter], providerImportSource: '@mdx-js/react'})},
    react({include: /\.(jsx|js|mdx|md|tsx|ts)$/}),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
