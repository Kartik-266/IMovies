/**
 * iMovies Root Development Runner
 * Concurrently runs Express backend and Vite frontend development servers
 * with colored log prefixes and clean cross-platform process tree termination.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const isWin = process.platform === 'win32';
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.resolve(rootDir, 'server');
const clientDir = path.resolve(rootDir, 'client');
const serverEnvPath = path.resolve(serverDir, '.env');

// ANSI color escapes for terminal readability
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  server: '\x1b[36m', // Cyan
  client: '\x1b[35m', // Magenta
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
};

function prefixStream(stream, prefix, color) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    console.log(`${color}${prefix}${colors.reset} ${line}`);
  });
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (isWin) {
      execSync(`taskkill /F /T /PID ${pid} >nul 2>&1`);
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
}

console.log(`${colors.bold}🎬 Starting iMovies Development Environment...${colors.reset}\n`);

if (!fs.existsSync(serverEnvPath)) {
  console.log(`${colors.yellow}⚠️  Notice: server/.env was not found.${colors.reset}`);
  console.log(`${colors.dim}   Create server/.env from server/.env.example before the backend can connect to MongoDB.${colors.reset}\n`);
}

function spawnDev(dir, label, color) {
  const executable = isWin ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = isWin ? ['/d', '/s', '/c', 'npm.cmd run dev'] : ['run', 'dev'];

  const proc = spawn(executable, args, {
    cwd: dir,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsVerbatimArguments: isWin,
    detached: !isWin,
  });

  prefixStream(proc.stdout, `[${label}]`, color);
  prefixStream(proc.stderr, `[${label}]`, color);

  proc.on('error', (err) => {
    console.error(`${colors.red}[${label} error]${colors.reset} Failed to start ${label}: ${err.message}`);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${colors.yellow}[${label}]${colors.reset} Process exited with code ${code}.`);
    }
  });

  return proc;
}

const serverProcess = spawnDev(serverDir, 'server', colors.server);
const clientProcess = spawnDev(clientDir, 'client', colors.client);

// Clean Shutdown Handler
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${colors.dim}Shutting down server and client processes...${colors.reset}`);
  if (serverProcess.pid) killTree(serverProcess.pid);
  if (clientProcess.pid) killTree(clientProcess.pid);
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
