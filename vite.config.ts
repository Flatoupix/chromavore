import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import pkg from './package.json';

let commitHash = '565c730';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {}

const fullVersion = `v${pkg.version} (#${commitHash})`;

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(fullVersion),
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __VERSION_NUM__: JSON.stringify(`v${pkg.version}`)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild'
  }
});
