import { readFileSync, writeFileSync } from 'node:fs';

// Build a separate install manifest from the reviewed lockfile. The application
// package remains unchanged for local development and the Vercel build.
const runtime = ['@trpc/server', 'bcryptjs', 'cookie', 'cors', 'date-fns', 'dotenv',
  'drizzle-orm', 'express', 'jose', 'nanoid', 'postgres', 'redis', 'superjson', 'ws', 'zod'];
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = readFileSync('pnpm-lock.yaml', 'utf8');
const start = lock.indexOf('importers:\n');
const end = lock.indexOf('\npackages:\n', start);
if (start < 0 || end < 0) throw new Error('Expected a single-package pnpm lockfile');
const importer = lock.slice(start, end);
if (!importer.startsWith('importers:\n\n  .:\n')) throw new Error('Unsupported lockfile importer');
const dependencies = importer.split('    dependencies:\n')[1]?.split('    devDependencies:\n')[0];
if (!dependencies) throw new Error('Missing locked dependencies');
const blocks = dependencies.match(/^      \S[^\n]*:\n(?:^        [^\n]*\n)+/gm) ?? [];
const selected = runtime.map(name => {
  if (!manifest.dependencies[name]) throw new Error(`Missing runtime dependency ${name}`);
  const block = blocks.find(value => value.split('\n')[0].trim().replace(/:$/, '').replace(/^['"]|['"]$/g, '') === name);
  if (!block) throw new Error(`Missing locked runtime dependency ${name}`);
  return block;
});
writeFileSync('package.json', JSON.stringify({ name: 'smart-factory-api-runtime', private: true,
  type: 'module', packageManager: manifest.packageManager,
  dependencies: Object.fromEntries(runtime.map(name => [name, manifest.dependencies[name]])),
  pnpm: manifest.pnpm }, null, 2));
writeFileSync('pnpm-lock.yaml', lock.slice(0, start) + 'importers:\n\n  .:\n    dependencies:\n'
  + selected.join('') + '\n' + lock.slice(end));
