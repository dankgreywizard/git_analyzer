// Simple parallel runner for dev: starts `npm run server` and `npm run client`
// to replace reliance on npm-run-all (which may not be installed in this env).

const { spawn } = require('child_process');

// Choose a Webpack Dev Server port; avoid collisions with default 5100
const net = require('net');

async function findFreePort(startPort = 5101, attempts = 20) {
  const tryPort = (port) => new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(null))
      .once('listening', () => {
        server.close(() => resolve(port));
      })
      .listen(port, '0.0.0.0');
  });

  for (let i = 0; i < attempts; i++) {
    const port = startPort + i;
    // If an explicit env port is set, just return it (even if taken) so errors surface clearly
    if (process.env.WDS_PORT) return parseInt(process.env.WDS_PORT, 10);
    // Otherwise probe for a free port
    // eslint-disable-next-line no-await-in-loop
    const free = await tryPort(port);
    if (free) return free;
  }
  // Fall back to the start port if none found
  return startPort;
}

async function run(name, cmd, args, options = {}, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env, ...options });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited due to signal ${signal}`);
    } else {
      console.log(`[${name}] exited with code ${code}`);
    }
    // If one process exits, we exit the entire dev runner with the same code
    // and ensure the other is terminated.
    shutdown(code);
  });
  return child;
}

let children = [];

function shutdown(code = 0) {
  // Remove listeners to avoid recursion
  process.off('SIGINT', onSigInt);
  process.off('SIGTERM', onSigTerm);
  for (const ch of children) {
    if (!ch.killed) {
      try { ch.kill('SIGTERM'); } catch {}
    }
  }
  // Give children a moment to terminate gracefully
  setTimeout(() => process.exit(code), 200);
}

function onSigInt() { shutdown(130); }
function onSigTerm() { shutdown(143); }

process.on('SIGINT', onSigInt);
process.on('SIGTERM', onSigTerm);

// Use npm to run scripts so local binaries (node_modules/.bin) are resolved.
(async () => {
  // Determine shared ports once
  const backendPort = process.env.PORT ? parseInt(process.env.PORT, 10) : await findFreePort(5000);
  const wdsPort = process.env.WDS_PORT ? parseInt(process.env.WDS_PORT, 10) : await findFreePort(5101);

  const sharedEnv = { PORT: String(backendPort), WDS_PORT: String(wdsPort) };

  // Start server first
  children.push(await run('server', 'npm', ['run', 'server'], {}, sharedEnv));
  // Start webpack dev server with the chosen port (also passed in env for config access if needed)
  children.push(await run('client', 'npx', ['vite', '--port', String(wdsPort)], {}, sharedEnv));
})();
