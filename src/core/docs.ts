import fs from 'fs/promises';
import path from 'path';

type FolderStructure = {
	name: string;
	title: string;
	icon?: string;
	children: FolderStructure[];
};

const scanDirectory = async (dirPath: string): Promise<FolderStructure[]> => {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const folders: FolderStructure[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const fullPath = path.join(dirPath, entry.name);
			const children = await scanDirectory(fullPath);
			let config: { title: string; icon: string | undefined } = {
				title: entry.name,
				icon: undefined,
			};
			// get the config.json file
			const configPath = path.join(fullPath, 'config.json');
			try {
				const configFile = await fs.readFile(configPath, 'utf8');
				config = JSON.parse(configFile);
			} catch {
				throw new Error(`Config file not found for ${entry.name}`);
			}
			folders.push({
				name: entry.name,
				title: config.title,
				icon: config.icon,
				children,
			});
		}
	}

	return folders;
};

export const getDocs = async (): Promise<FolderStructure[]> => {
	const docsFolder = process.cwd();
	try {
		await fs.access(docsFolder);
	} catch {
		return [];
	}
	return scanDirectory(docsFolder);
};

/**
 * This function will return the content of the .mdx file in the directory with the given filePath.
 * @param filePath - The path to the file
 * @returns
 */
export const getDoc = async (filePath: string) => {
	const currentDir = process.cwd();
	const fullPath = path.join(currentDir, filePath);
	try {
		// check for .mdx file in the directory (the name will be a unique ID)
		const files = await fs.readdir(fullPath, { withFileTypes: true });
		const mdxFile = files.find((file) => file.name.endsWith('.mdx'));
		if (!mdxFile) {
			return undefined;
		}
		return fs.readFile(path.join(fullPath, mdxFile.name), 'utf8');
	} catch {
		return undefined;
	}
};
