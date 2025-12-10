// Simple parallel runner for dev: starts `npm run server` and `npm run client`
// to replace reliance on npm-run-all (which may not be installed in this env).

const { spawn } = require('child_process');

// Choose a Webpack Dev Server port; avoid collisions with default 5100
const WDS_PORT = process.env.WDS_PORT || '5101';

function run(name, cmd, args, options = {}) {
  const env = { ...process.env, WDS_PORT };
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
children.push(run('server', 'npm', ['run', 'server']));
// Launch webpack dev server explicitly with chosen port to avoid conflicts
children.push(run('client', 'npx', ['webpack', 'serve', '--port', WDS_PORT]));
