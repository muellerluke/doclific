/**
 * Git API client functions for TanStack React Query
 */

const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface RepoInfo {
	repositoryName: string;
	repositoryBranch: string;
	user: string;
	userEmail: string;
}

/**
 * Get git repository information
 * @returns Promise resolving to repository info
 */
export async function getRepoInfo(): Promise<RepoInfo> {
	const response = await fetch(`${API_BASE_URL}/git/repo-info`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get repo info: ${errorText}`);
	}

	return response.json();
}
