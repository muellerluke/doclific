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
	// Snippet tracking fields (only present when tracking params are provided)
	newLineStart?: number;
	newLineEnd?: number;
	newBaseCommit?: string;
	newContentHash?: string;
	needsReview?: boolean;
}

export interface SnippetTrackingParams {
	lineStart?: string;
	lineEnd?: string;
	baseCommit?: string;
	contentHash?: string;
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
 * @param tracking - Optional snippet tracking parameters
 * @returns Promise resolving to file contents and full path (with tracking info if params provided)
 */
export async function getFileContents(filePath: string, tracking?: SnippetTrackingParams): Promise<FileContentsResponse> {
	const url = new URL(`${API_BASE_URL}/codebase/file`);
	url.searchParams.set('filePath', filePath);

	// Add tracking params if provided
	if (tracking) {
		if (tracking.lineStart) url.searchParams.set('lineStart', tracking.lineStart);
		if (tracking.lineEnd) url.searchParams.set('lineEnd', tracking.lineEnd);
		if (tracking.baseCommit) url.searchParams.set('baseCommit', tracking.baseCommit);
		if (tracking.contentHash) url.searchParams.set('contentHash', tracking.contentHash);
	}

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