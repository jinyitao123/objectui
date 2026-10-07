import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const previewDir = path.dirname(fileURLToPath(import.meta.url));
const consoleDir = path.resolve(previewDir, '..');
const repoRoot = path.resolve(previewDir, '../../..');

// Match Console's source aliases so every previewed plugin shares the same
// ComponentRegistry and reads the same workspace source as the application.
const workspaceAliases: Record<string, string> = {
  '@object-ui/components': path.resolve(repoRoot, 'packages/components/src'),
  '@object-ui/core': path.resolve(repoRoot, 'packages/core/src'),
  '@object-ui/react-runtime': path.resolve(repoRoot, 'packages/react-runtime/src'),
  '@object-ui/sdui-parser': path.resolve(repoRoot, 'packages/sdui-parser/src'),
  '@object-ui/fields': path.resolve(repoRoot, 'packages/fields/src'),
  '@object-ui/layout': path.resolve(repoRoot, 'packages/layout/src'),
  '@object-ui/plugin-form': path.resolve(repoRoot, 'packages/plugin-form/src'),
  '@object-ui/plugin-grid': path.resolve(repoRoot, 'packages/plugin-grid/src'),
  '@object-ui/react': path.resolve(repoRoot, 'packages/react/src'),
  '@object-ui/types/zod': path.resolve(repoRoot, 'packages/types/src/zod/index.zod.ts'),
  '@object-ui/types': path.resolve(repoRoot, 'packages/types/src'),
  '@object-ui/data-objectstack': path.resolve(repoRoot, 'packages/data-objectstack/src'),
  '@object-ui/auth': path.resolve(repoRoot, 'packages/auth/src'),
  '@object-ui/permissions': path.resolve(repoRoot, 'packages/permissions/src'),
  '@object-ui/providers': path.resolve(repoRoot, 'packages/providers/src'),
  '@object-ui/collaboration': path.resolve(repoRoot, 'packages/collaboration/src'),
  '@object-ui/i18n': path.resolve(repoRoot, 'packages/i18n/src'),
  '@object-ui/mobile': path.resolve(repoRoot, 'packages/mobile/src'),
  '@object-ui/app-shell': path.resolve(repoRoot, 'packages/app-shell/src'),
  '@object-ui/plugin-calendar': path.resolve(repoRoot, 'packages/plugin-calendar/src'),
  '@object-ui/plugin-chatbot': path.resolve(repoRoot, 'packages/plugin-chatbot/src'),
  '@object-ui/plugin-detail': path.resolve(repoRoot, 'packages/plugin-detail/src'),
  '@object-ui/plugin-editor': path.resolve(repoRoot, 'packages/plugin-editor/src'),
  '@object-ui/plugin-gantt': path.resolve(repoRoot, 'packages/plugin-gantt/src'),
  '@object-ui/plugin-kanban': path.resolve(repoRoot, 'packages/plugin-kanban/src'),
  '@object-ui/plugin-list': path.resolve(repoRoot, 'packages/plugin-list/src'),
  '@object-ui/plugin-map': path.resolve(repoRoot, 'packages/plugin-map/src'),
  '@object-ui/plugin-markdown': path.resolve(repoRoot, 'packages/plugin-markdown/src'),
  '@object-ui/plugin-timeline': path.resolve(repoRoot, 'packages/plugin-timeline/src'),
  '@object-ui/plugin-tree': path.resolve(repoRoot, 'packages/plugin-tree/src'),
  '@object-ui/plugin-view': path.resolve(repoRoot, 'packages/plugin-view/src'),
};

export default defineConfig({
  root: previewDir,
  plugins: [react()],
  resolve: { alias: workspaceAliases },
  css: { postcss: path.resolve(consoleDir, 'postcss.config.js') },
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5180,
    fs: { allow: [repoRoot] },
  },
});
