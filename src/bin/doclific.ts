#!/usr/bin/env node
import { startServer } from '../server/index.js';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import open from 'open';

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
	open(`http://localhost:${port}`);
}
