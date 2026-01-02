import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ignore from 'ignore';

interface FileNode {
	path: string;
	name: string;
	type: 'file' | 'directory';
	children?: FileNode[];
}

/**
 * Get all contents of a folder given a filePath.
 * @param filePath - The relative path to the folder
 */
export const getFolderContents = async (filePath: string): Promise<FileNode[]> => {
	const currentDir = process.cwd();
	let fullPath = '';
	if (filePath !== '') {
		fullPath = path.join(currentDir, filePath);
	} else {
		fullPath = currentDir;
	}
	const entries = await fs.readdir(fullPath, { withFileTypes: true });
	const nodes: FileNode[] = [];
	for (const entry of entries) {
		nodes.push({
			path: path.join(filePath, entry.name),
			name: entry.name,
			type: entry.isDirectory() ? 'directory' : 'file',
		});
	}
	return nodes;
};

export const getFileContents = async (filePath: string) => {
	try {
		const currentDir = process.cwd();
		const fullPath = path.join(currentDir, filePath);
		return fs.readFile(fullPath, 'utf8');
	} catch (error) {
		throw new Error(`Failed to get file contents for ${filePath}: ${error}`);
	}
};

/**
 * Recursively scans a directory and returns a flat list of all file paths
 * @param {string} dir - Directory path to scan
 * @param {string[]} fileList - Accumulator for file paths
 * @param {string} baseDir - Base directory for relative paths
 * @param {ignore.Ignore} ignoreInstance - Ignore instance for .gitignore patterns
 * @returns {string[]} - Array of relative paths
 */
export async function getFlatFileList(
	dir = process.cwd(),
	fileList: string[] = [],
	baseDir = dir,
	ignoreInstance?: ignore.Ignore
): Promise<string[]> {
	try {
		// Load .gitignore on first call
		if (!ignoreInstance) {
			const gitignorePath = path.join(baseDir, '.gitignore');
			let gitignoreContent = '';
			if (existsSync(gitignorePath)) {
				gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
			}
			ignoreInstance = ignore().add(gitignoreContent);
		}

		const items = await fs.readdir(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			const relativePath = path.relative(baseDir, fullPath);

			// Check if path should be ignored
			if (ignoreInstance.ignores(relativePath) || relativePath.startsWith('.git')) {
				continue;
			}

			const stats = await fs.stat(fullPath);

			if (stats.isDirectory()) {
				// Include directory path itself
				fileList.push(relativePath + '/');
				// Recurse into the subdirectory
				await getFlatFileList(fullPath, fileList, baseDir, ignoreInstance);
			} else {
				fileList.push(relativePath);
			}
		}

		return fileList;
	} catch (error) {
		throw new Error(`Failed to get flat file list for ${dir}: ${error}`);
	}
}
