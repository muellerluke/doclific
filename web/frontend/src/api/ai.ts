/**
 * AI API client functions for TanStack React Query
 */

const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface GenerateRichTextRequest {
	prompt: string;
}

export interface RichTextNode {
	nodeType: 'text' | 'codebase snippet' | 'list';
	type?: 'p' | 'h1' | 'h2' | 'h3' | 'numbered' | 'bulleted';
	text?: string;
	filePath?: string;
	lineStart?: number;
	lineEnd?: number;
	items?: string[];
}

/**
 * Transform RichTextNode array from API to Plate.js format
 */
function transformRichTextNodes(nodes: RichTextNode[]): any[] {
	return nodes.map((node) => {
		switch (node.nodeType) {
			case 'text':
				return [
					{
						type: node.type || 'p',
						children: [{ text: node.text || '' }],
					},
				];
			case 'codebase snippet':
				return [
					{
						type: 'CodebaseSnippet',
						filePath: node.filePath || '',
						lineStart: String(node.lineStart || ''),
						lineEnd: String(node.lineEnd || ''),
						children: [{ text: '' }],
					},
				];
			case 'list':
				// Convert list items to paragraph nodes with list properties
				return (
					node.items?.map((item) => ({
						type: 'p',
						children: [{ text: item }],
						indent: 1,
						listStyleType: node.type === 'numbered' ? 'decimal' : 'disc',
					})) || []
				);
			default:
				return [];
		}
	});
}

/**
 * Generate rich text content using AI
 * @param request - The generation request containing the prompt
 * @returns Promise resolving to an array of Plate.js nodes ready to be inserted
 */
export async function generateRichText(request: GenerateRichTextRequest): Promise<any[]> {
	const response = await fetch(`${API_BASE_URL}/ai/generate-rich-text`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to generate rich text: ${errorText}`);
	}

	const nodes: RichTextNode[] = await response.json();
	return transformRichTextNodes(nodes);
}
