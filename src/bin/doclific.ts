#!/usr/bin/env node
import { spawn } from 'child_process';
import { startServer } from '../server/index.js';

const port =
	process.argv.find((arg) => arg.startsWith('-p=') || arg.startsWith('--port='))?.split('=')[1] ||
	6767;

const cwd = process.cwd();
console.log('Doclific CLI running in directory:', cwd);

startServer(Number(port));

// Optional: open browser automatically
const open =
	process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
spawn(open, [`http://localhost:${port}`]);
