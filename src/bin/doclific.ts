#!/usr/bin/env node
import { startServer } from '../server/index.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import open from 'open';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'doclific');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export let config: Record<string, any> = {};

const command = process.argv[2];

if (command === 'init') {
	// create config file
	mkdir(CONFIG_DIR, { recursive: true })
		.then(() => {
			console.log(`Created directory: ${CONFIG_DIR}`);
			process.exit(0);
		})
		.catch((error) => {
			console.error('Failed to create directory:', error);
			process.exit(1);
		});

	// create doclific directory
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
} else if (command === 'set') {
	const config = await readConfig();
	const key = process.argv[3];
	const value = process.argv[4];
	setNested(config, key, value);
	await writeConfig(config);
	console.log(`Set ${key} to ${value}`);
	process.exit(0);
} else if (command === 'get') {
	const config = await readConfig();
	console.log(config);
	process.exit(0);
} else {
	config = await readConfig();
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

export async function readConfig() {
	if (!existsSync(CONFIG_FILE)) return {};
	return JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
}

async function writeConfig(config: Record<string, any>) {
	await mkdir(CONFIG_DIR, { recursive: true });
	await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function setNested(obj: any, key: string, value: any) {
	const parts = key.split('.');
	let current = obj;

	for (let i = 0; i < parts.length - 1; i++) {
		current[parts[i]] ??= {};
		current = current[parts[i]];
	}

	current[parts.at(-1)!] = value;
}

function getNested(obj: any, key: string) {
	return key.split('.').reduce((o, k) => o?.[k], obj);
}
