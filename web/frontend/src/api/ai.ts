/**
 * AI API client functions for TanStack React Query
 */

import type { DataType } from '@/components/editor/plugins/erd-kit';

const API_BASE_URL = `http://localhost:${window.env.PORT ?? 6767}/api`;

export interface GenerateRichTextRequest {
	prompt: string;
}

export interface RichTextNode {
	nodeType: 'text' | 'codebase_snippet' | 'list' | 'erd';
	type?: 'p' | 'h1' | 'h2' | 'h3' | 'numbered' | 'bulleted';
	text?: string;
	filePath?: string;
	lineStart?: number;
	lineEnd?: number;
	items?: string[];
	tables?: {
		name: string;
		columns: {
			name: string;
			type: DataType;
			nullable: boolean;
			primaryKey: boolean;
			unique: boolean;
		}[];
		position: {
			x: number;
			y: number;
		};
	}[];
	relationships?: {
		table1: string;
		column1: string;
		table2: string;
		column2: string;
		cardinality: '1:1' | '1:N' | 'N:N' | 'N:1';
	}[];
}

/**
 * Transform RichTextNode array from API to Plate.js format
 */
function transformRichTextNodes(nodes: RichTextNode[]): any[] {
	return nodes.flatMap((node): any[] => {
		switch (node.nodeType) {
			case 'text':
				return [
					{
						type: node.type || 'p',
						children: [{ text: node.text || '' }],
					},
				];

			case 'codebase_snippet':
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
			case 'erd': {
				const tables = node.tables!.map((table) => ({
					id: crypto.randomUUID(),
					type: 'tableNode',
					data: {
						name: table.name,
						columns: table.columns.map((column) => ({
							id: crypto.randomUUID(),
							name: column.name,
							type: column.type,
							nullable: column.nullable ?? false,
							primaryKey: column.primaryKey ?? false,
							unique: column.unique ?? false,
						})),
					},
					position: table.position,
				}));

				const relationships = node.relationships!.map((relationship) => {
					const sourceTable = tables.find(
						(table) => table.data.name === relationship.table1
					);
					const targetTable = tables.find(
						(table) => table.data.name === relationship.table2
					);

					if (!sourceTable || !targetTable) {
						throw new Error(
							`Source or target table not found for relationship: ${relationship.table1} -> ${relationship.table2}`
						);
					}
					const sourceColumn = sourceTable.data.columns.find(
						(column) => column.name === relationship.column1
					);
					const targetColumn = targetTable.data.columns.find(
						(column) => column.name === relationship.column2
					);

					if (!sourceColumn || !targetColumn) {
						throw new Error(
							`Source or target column not found for relationship: ${relationship.table1}.${relationship.column1} -> ${relationship.table2}.${relationship.column2}`
						);
					}

					const sourceSide = sourceTable.position.x > targetTable.position.x ? 'l' : 'r';
					const targetSide = sourceTable.position.x > targetTable.position.x ? 'r' : 'l';

					let markerStart: string | undefined = undefined;
					let markerEnd: string | undefined = undefined;
					switch (relationship.cardinality) {
						case '1:N':
							markerEnd = targetSide === 'r' ? 'claw-right' : 'claw-left';
							break;
						case 'N:1':
							markerStart = sourceSide === 'r' ? 'claw-right' : 'claw-left';
							break;
						case 'N:N':
							markerStart = sourceSide === 'r' ? 'claw-right' : 'claw-left';
							markerEnd = targetSide === 'r' ? 'claw-right' : 'claw-left';
							break;
					}

					return {
						id: crypto.randomUUID(),
						type: 'edge',
						source: sourceTable.id,
						sourceHandle: `col-${sourceColumn.id}-source-${sourceSide}`,
						target: targetTable.id,
						targetHandle: `col-${targetColumn.id}-target-${targetSide}`,
						animated: false,
						markerStart,
						markerEnd,
						data: {
							type: relationship.cardinality,
						},
					};
				});
				return [
					{
						type: 'ERD',
						tables: tables,
						relationships: relationships,
						children: [{ text: '' }],
					},
				];
			}
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

	const transformedNodes = transformRichTextNodes(nodes);

	return transformedNodes;
}
