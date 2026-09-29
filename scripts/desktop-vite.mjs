import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'build' ? 'build' : 'dev';
if (mode === 'dev') mkdirSync('dist', { recursive: true });
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = mode === 'build' ? ['vite', 'build', '--mode', 'desktop'] : ['vite', '--mode', 'desktop'];

const child = spawn(command, args, {
  stdio: 'inherit',
  // Su Windows npx.cmd va lanciato tramite shell (Node >= 18.20 rifiuta i .cmd senza shell).
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    STENTOR_DESKTOP: '1',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
