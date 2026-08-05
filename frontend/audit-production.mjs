import { spawnSync } from 'node:child_process';

const allowed = new Map([
  [
    'GHSA-qwww-vcr4-c8h2',
    'CourtVision is a client-only BrowserRouter SPA and does not use React Server Components or router actions.',
  ],
]);

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
});
if (!result.stdout) {
  process.stderr.write(result.stderr || 'npm audit produced no output\n');
  process.exit(1);
}

const report = JSON.parse(result.stdout);
const findings = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const advisory of vulnerability.via ?? []) {
    if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity)) continue;
    const id = advisory.url?.split('/').at(-1) ?? String(advisory.source);
    findings.set(id, advisory);
  }
}

const blocked = [...findings].filter(([id]) => !allowed.has(id));
for (const [id, reason] of allowed) {
  if (findings.has(id)) console.warn(`Allowlisted ${id}: ${reason}`);
}
if (blocked.length) {
  for (const [id, advisory] of blocked) {
    console.error(`${advisory.severity}: ${id} — ${advisory.title}`);
  }
  process.exit(1);
}

console.log('No unreviewed high or critical production dependency vulnerabilities.');
