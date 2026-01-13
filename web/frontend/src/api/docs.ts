/**
 * Docs API client functions for TanStack React Query
 */

import type { FolderStructure } from '@/types/docs';

const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface CreateDocRequest {
	filePath: string;
	title: string;
	icon?: string;
}

export interface CreateDocResponse {
	filePath: string;
	url: string;
	title: string;
	icon?: string;
}

/**
 * Get all documentation folders structure
 * @returns Promise resolving to folder structure array
 */
export async function getDocs(): Promise<FolderStructure[]> {
	const response = await fetch(`${API_BASE_URL}/docs`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get docs: ${errorText}`);
	}

	return response.json();
}

/**
 * Get a specific document's content
 * @param filePath - The relative path to the document folder
 * @returns Promise resolving to the document content (MDX string)
 */
export async function getDoc(filePath: string): Promise<string> {
	const url = new URL(`${API_BASE_URL}/docs/doc`);
	url.searchParams.set('filePath', filePath);

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get doc: ${errorText}`);
	}

	return response.json();
}

/**
 * Update a document's content
 * @param filePath - The relative path to the document folder
 * @param content - The new content (MDX string)
 * @returns Promise resolving to void
 */
export async function updateDoc(filePath: string, content: string): Promise<void> {
	const url = new URL(`${API_BASE_URL}/docs/doc`);
	url.searchParams.set('filePath', filePath);

	const response = await fetch(url.toString(), {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ content }),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update doc: ${errorText}`);
	}
}

/**
 * Create a new document
 * @param request - The document creation request
 * @returns Promise resolving to the created document response
 */
export async function createDoc(request: CreateDocRequest): Promise<CreateDocResponse> {
	const response = await fetch(`${API_BASE_URL}/docs`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to create doc: ${errorText}`);
	}

	return response.json();
}

/**
 * Delete a document
 * @param filePath - The relative path to the document folder
 * @returns Promise resolving to void
 */
export async function deleteDoc(filePath: string): Promise<void> {
	const url = new URL(`${API_BASE_URL}/docs/doc`);
	url.searchParams.set('filePath', filePath);

	const response = await fetch(url.toString(), {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to delete doc: ${errorText}`);
	}
}
