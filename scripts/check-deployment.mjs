import { readFile } from 'node:fs/promises';

const read = name => readFile(name, 'utf8');
const [release, vercelText, dockerfile, supervisor, guide] = await Promise.all([
  read('.github/workflows/release.yml'),
  read('vercel.json'),
  read('deploy/render/Dockerfile'),
  read('deploy/render/supervisord.conf'),
  read('RENDER_DEPLOYMENT.md'),
]);

const failures = [];
const requireText = (content, pattern, message) => {
  if (!pattern.test(content)) failures.push(message);
};

requireText(release, /on:\s*\n\s+push:\s*\n\s+branches: \[main\]/, 'release workflow must run on pushes to main');
requireText(release, /workflow_dispatch:/, 'release workflow must retain a manual recovery trigger');
requireText(release, /echo "edge_ref=master"/, 'automatic releases must use the edge repository\'s actual master branch');
requireText(release, /--platform linux\/amd64/, 'Render image must be built for linux/amd64');
requireText(release, /docker push "\$IMAGE:\$GITHUB_SHA"/, 'release must publish the tested backend image');
requireText(release, /RELEASE_IMAGE=\$IMAGE@\$DIGEST/, 'Render release must use an immutable image digest');
requireText(release, /vercel@62\.2\.0 build --prod/, 'Vercel production artifact must be built in CI');
requireText(release, /vercel@62\.2\.0 deploy --prebuilt .*--prod/, 'Vercel must deploy the prebuilt production artifact');

const renderPosition = release.indexOf('Deploy reviewed backend and await readiness');
const vercelPosition = release.indexOf('Configure and deploy Vercel UI');
if (renderPosition < 0 || vercelPosition < 0 || renderPosition >= vercelPosition) {
  failures.push('Render must become ready before the Vercel deployment step');
}

const vercel = JSON.parse(vercelText);
if (vercel.outputDirectory !== 'dist/public') failures.push('Vercel outputDirectory must be dist/public');
const apiRewrite = vercel.rewrites?.find(item => item.source === '/api/:path*');
if (!apiRewrite?.destination?.startsWith('https://configure-render-origin.example.invalid/')) {
  failures.push('committed Vercel API rewrite must retain the safe placeholder configured during release');
}

requireText(dockerfile, /^FROM mcr\.microsoft\.com\/dotnet\/aspnet:8\.0-noble AS runtime$/m, 'Render runtime must use the reviewed .NET Ubuntu image');
requireText(dockerfile, /^USER app$/m, 'Render image must run as the non-root app user');
requireText(dockerfile, /ENTRYPOINT \["python3", "\/app\/deploy\/render\/entrypoint\.py"\]/, 'Render image must use the validated bundle entrypoint');

const programs = [...supervisor.matchAll(/^\[program:([^\]]+)\]$/gm)].map(match => match[1]).sort();
const expectedPrograms = ['analytics', 'api', 'device', 'identity', 'notification', 'telemetry'];
if (JSON.stringify(programs) !== JSON.stringify(expectedPrograms)) {
  failures.push(`Render bundle must contain exactly six supervised processes: ${expectedPrograms.join(', ')}`);
}

for (const phrase of [
  'push to the dashboard repository\'s protected `main` branch',
  'only production backend image',
  'not a second Docker image',
  'Disable Vercel\'s independent Git production deployment',
]) {
  if (!guide.includes(phrase)) failures.push(`deployment guide is missing required guidance: ${phrase}`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log('Deployment topology and coordinated release configuration are consistent.');
}
