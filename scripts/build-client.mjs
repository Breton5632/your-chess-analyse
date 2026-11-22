// Builds the browser half: one ESM bundle, lib/client.js (react and @timon/ui stay external).
// esbuild is a dev-only tool: it is looked up in dev/node_modules (not shipped), then in node_modules.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const roots = [join(root, 'dev'), root];
let esbuild;
for (const r of roots) {
  if (!existsSync(join(r, 'node_modules', 'esbuild'))) continue;
  esbuild = createRequire(join(r, 'package.json'))('esbuild');
  break;
}
if (!esbuild) {
  console.error('esbuild not found. Run `npm install esbuild` inside plugin/dev, then `npm run build`.');
  process.exit(1);
}

await esbuild.build({
  entryPoints: [join(root, 'lib/client/index.js')],
  outfile: join(root, 'lib/client.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  external: ['react', '@timon/ui'],
  loader: { '.svg': 'text', '.json': 'json' },
  jsx: 'transform',
  legalComments: 'none',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});
