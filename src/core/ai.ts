import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, LanguageModel, Output, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { getFileContents, getFlatFileList } from './codebase.js';
import { config } from '../bin/doclific.js';
export { tool };

const textNodeSchema = z.object({
	nodeType: z.literal('text'),
	type: z.enum(['p', 'h1', 'h2', 'h3']),
	text: z.string(),
});

const codebaseSnippetSchema = z.object({
	nodeType: z.literal('codebase snippet'), // better for the AI to understand
	filePath: z.string(),
	lineStart: z.number(),
	lineEnd: z.number(),
});

const listNodeSchema = z.object({
	nodeType: z.literal('list'),
	type: z.enum(['numbered', 'bulleted']),
	items: z.array(z.string()),
});

const richTextSchema = z.union([textNodeSchema, codebaseSnippetSchema, listNodeSchema]);

type RichTextNode = z.infer<typeof richTextSchema>;

const getFileContentsTool = {
	description: 'Get the contents of a file by file path. Multiple file paths can be provided.',
	inputSchema: z.object({
		filePaths: z.array(z.string()),
	}),
	execute: async ({ filePaths }: { filePaths: string[] }) => {
		const contents = await Promise.all(
			filePaths.map(async (filePath) => {
				const contents = await getFileContents(filePath);
				return contents.split('\n').map((line, index) => `${index + 1}: ${line}`);
			})
		);
		return contents.flat();
	},
};

export class AIModel {
	model: LanguageModel = this.createModel();

	constructor() {
		this.model = this.createModel();
	}

	async generateRichText(prompt: string) {
		const fileContents = await getFlatFileList();

		const result = await generateText({
			model: this.model,
			system: `
When writing documentation:
1. Explain concepts using "text" nodes
2. Reference implementation using "codebase snippet" nodes
3. Use "list" nodes only for summaries

If you need to show code, DO NOT paste it — reference it.

The project structure is: ${fileContents.join('\n')}
`,
			experimental_output: Output.object({
				schema: z.object({
					nodes: z.array(richTextSchema),
				}),
			}),
			tools: {
				getFileContents: tool(getFileContentsTool),
			},
			stopWhen: stepCountIs(10),
			prompt,
		});
		return result;
	}

	private createModel(): LanguageModel {
		const provider = config.AI_PROVIDER;
		const modelName = config.AI_MODEL;

		if (!provider) {
			throw new Error(
				'You must set AI_PROVIDER environment variable to one of the following: openai, anthropic, google'
			);
		}

		switch (provider) {
			case 'openai': {
				const openai = createOpenAI({ apiKey: config.OPENAI_API_KEY });
				if (!modelName) {
					throw new Error('You must set AI_MODEL environment variable');
				}
				return openai(modelName);
			}
			case 'anthropic': {
				const anthropic = createAnthropic({ apiKey: config.ANTHROPIC_API_KEY });
				if (!modelName) {
					throw new Error('You must set AI_MODEL environment variable');
				}
				return anthropic(modelName);
			}
			case 'google': {
				const google = createGoogleGenerativeAI({ apiKey: config.GOOGLE_API_KEY });
				if (!modelName) {
					throw new Error('You must set AI_MODEL environment variable');
				}
				return google(modelName);
			}
			default:
				throw new Error(
					'Unsupported provider; You must set AI_PROVIDER environment variable to one of the following: openai, anthropic, google'
				);
		}
	}
}

export function serializeCustomRichTextNodes(nodes: RichTextNode[]): any {
	return nodes
		.map((node) => {
			switch (node.nodeType) {
				case 'text':
					return {
						type: node.type,
						children: [{ text: node.text }],
					};
				case 'codebase snippet':
					return {
						type: 'CodebaseSnippet',
						filePath: node.filePath,
						lineStart: node.lineStart,
						lineEnd: node.lineEnd,
						children: [{ text: '' }],
					};
				case 'list':
					const listItems = node.items.map((item) => {
						return {
							type: 'p',
							children: [{ text: item }],
							indent: 1,
							listStyleType: node.type,
						};
					});
					return listItems;
			}
		})
		.flat();
}
