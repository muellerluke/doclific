#!/usr/bin/env node
import { spawn } from 'child_process';
import { startServer } from '../server/index.js';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const command = process.argv[2];

if (command === 'init') {
	const cwd = process.cwd();
	const doclificDir = path.join(cwd, 'doclific');

	if (existsSync(doclificDir)) {
		console.log('Directory "doclific" already exists.');
		process.exit(0);
	}

	mkdir(doclificDir, { recursive: true })
		.then(() => {
			console.log(`Created directory: ${doclificDir}`);
			process.exit(0);
		})
		.catch((error) => {
			console.error('Failed to create directory:', error);
			process.exit(1);
		});
} else {
	const port =
		process.argv
			.find((arg) => arg.startsWith('-p=') || arg.startsWith('--port='))
			?.split('=')[1] || 6767;

	const cwd = process.cwd();
	console.log('Doclific CLI running in directory:', cwd);

	startServer(Number(port));

	// Optional: open browser automatically
	openBrowser(`http://localhost:${port}`);
}

function openBrowser(url: string) {
	if (process.platform === 'win32') {
		spawn('cmd', ['/c', 'start', '', url], {
			detached: true,
			stdio: 'ignore',
		});
	} else if (process.platform === 'darwin') {
		spawn('open', [url], { detached: true, stdio: 'ignore' });
	} else {
		spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
	}
}
