const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface UpdateCheckResponse {
	currentVersion: string;
	latestVersion: string;
}

export async function checkUpdate(): Promise<UpdateCheckResponse> {
	const response = await fetch(`${API_BASE_URL}/update/check`);
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(errorText);
	}
	return await response.json();
}