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
	const docsFolder = path.join(process.cwd(), 'doclific');
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
	const fullPath = path.join(currentDir, 'doclific', filePath);
	try {
		return fs.readFile(path.join(fullPath, 'content.mdx'), 'utf8');
	} catch {
		return undefined;
	}
};

export const updateDoc = async (filePath: string, content: string) => {
	const currentDir = process.cwd();
	const fullPath = path.join(currentDir, 'doclific', filePath);
	await fs.writeFile(path.join(fullPath, 'content.mdx'), content);
};

export const createDoc = async (filePath: string, title: string, icon: string | undefined) => {
	const currentDir = process.cwd();
	const fullPath = path.join(currentDir, 'doclific', filePath);

	const newFolderName = crypto.randomUUID();
	const newFolderPath = path.join(fullPath, newFolderName);
	await fs.mkdir(newFolderPath, { recursive: true });
	// create content.mdx file
	await fs.writeFile(path.join(newFolderPath, 'content.mdx'), '# Hello World');
	// create config.json file
	await fs.writeFile(
		path.join(newFolderPath, 'config.json'),
		JSON.stringify({ title, icon }, null, 2)
	);
	// return the new folder path
	return {
		filePath: newFolderPath,
		url: filePath + '/' + newFolderName,
		title,
		icon,
	};
};

export const deleteDoc = async (filePath: string) => {
	const currentDir = process.cwd();
	const fullPath = path.join(currentDir, 'doclific', filePath);
	await fs.rm(fullPath, { recursive: true });
};
