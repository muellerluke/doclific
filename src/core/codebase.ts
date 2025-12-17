import path from 'path';
import fs from 'fs/promises';

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
	const currentDir = process.cwd();
	const fullPath = path.join(currentDir, filePath);
	return fs.readFile(fullPath, 'utf8');
};
