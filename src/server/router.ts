import { os } from '@orpc/server';
import {
	getGitRepositoryBranch,
	getGitRepositoryName,
	getGitUser,
	getGitUserEmail,
} from '../core/git.js';
import { createDoc, getDoc, getDocs, updateDoc } from '../core/docs.js';
import { z } from 'zod';
import { getFileContents, getFolderContents } from '../core/codebase.js';
import path from 'path';
import { AIModel, serializeCustomRichTextNodes } from '../core/ai.js';

export const router = {
	git: {
		getRepoInfo: os.handler(async () => {
			return {
				repositoryName: await getGitRepositoryName(),
				repositoryBranch: await getGitRepositoryBranch(),
				user: await getGitUser(),
				userEmail: await getGitUserEmail(),
			};
		}),
	},
	docs: {
		getDocs: os.handler(async () => {
			return await getDocs();
		}),
		getDoc: os.input(z.object({ filePath: z.string() })).handler(async ({ input }) => {
			const { filePath } = input;
			return await getDoc(filePath);
		}),
		updateDoc: os
			.input(z.object({ filePath: z.string(), content: z.string() }))
			.handler(async ({ input }) => {
				const { filePath, content } = input;
				return await updateDoc(filePath, content);
			}),
		createDoc: os
			.input(
				z.object({ filePath: z.string(), title: z.string(), icon: z.string().optional() })
			)
			.handler(async ({ input }) => {
				const { filePath, title, icon } = input;
				return await createDoc(filePath, title, icon);
			}),
	},
	codebase: {
		getFolderContents: os
			.input(z.object({ filePath: z.string() }))
			.handler(async ({ input }) => {
				const { filePath } = input;
				return await getFolderContents(filePath);
			}),
		getFileContents: os.input(z.object({ filePath: z.string() })).handler(async ({ input }) => {
			const { filePath } = input;
			const currentDir = process.cwd();
			return {
				contents: await getFileContents(filePath),
				fullPath: path.join(currentDir, filePath),
			};
		}),
	},
	ai: {
		generateRichText: os.input(z.object({ prompt: z.string() })).handler(async ({ input }) => {
			const { prompt } = input;
			const ai = new AIModel();
			const result = await ai.generateRichText(prompt);
			return serializeCustomRichTextNodes(result.experimental_output.nodes);
		}),
	},
};

export type Router = typeof router;
