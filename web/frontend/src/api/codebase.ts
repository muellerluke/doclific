/**
 * Codebase API client functions for TanStack React Query
 */

const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface FileNode {
	path: string;
	name: string;
	type: 'file' | 'directory';
	children?: FileNode[];
}

export interface FileContentsResponse {
	contents: string;
	fullPath: string;
}

/**
 * Get contents of a folder
 * @param filePath - The relative path to the folder
 * @returns Promise resolving to array of file nodes
 */
export async function getFolderContents(filePath: string): Promise<FileNode[]> {
	const url = new URL(`${API_BASE_URL}/codebase/folder`);
	url.searchParams.set('filePath', filePath);

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get folder contents: ${errorText}`);
	}

	return response.json();
}

/**
 * Get contents of a file
 * @param filePath - The relative path to the file
 * @returns Promise resolving to file contents and full path
 */
export async function getFileContents(filePath: string): Promise<FileContentsResponse> {
	const url = new URL(`${API_BASE_URL}/codebase/file`);
	url.searchParams.set('filePath', filePath);

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get file contents: ${errorText}`);
	}

	return response.json();
}

/**
 * Get the deeplink prefix for codebase snippets
 * @returns Promise resolving to the prefix
 */
export async function getPrefix(): Promise<string> {
	const url = new URL(`${API_BASE_URL}/codebase/prefix`);

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get prefix: ${errorText}`);
	}

	const result = await response.json();
	return result.prefix;
}