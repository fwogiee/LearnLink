import { spawn } from 'node:child_process';
import killPort from 'kill-port';

const port = Number(process.env.PORT || 4000);

const shouldKillPort = process.env.SKIP_PORT_KILL !== '1';

async function startServer() {
  if (shouldKillPort) {
    try {
      await killPort(port, 'tcp');
      console.log(`[dev-server] Cleared port ${port}.`);
    } catch (error) {
      if (error && !String(error.message).includes('did not find')) {
        console.warn(`[dev-server] Unable to clear port ${port}: ${error.message}`);
      }
    }
  } else {
    console.log('[dev-server] SKIP_PORT_KILL=1 detected; not clearing ports automatically.');
  }

  console.log(`[dev-server] Launching API server on port ${port}...`);

  const serverProcess = spawn(process.execPath, ['server/index.js'], {
    stdio: 'inherit',
    env: process.env,
  });

  serverProcess.on('exit', (code) => {
    process.exit(typeof code === 'number' ? code : 0);
  });
}

startServer();
