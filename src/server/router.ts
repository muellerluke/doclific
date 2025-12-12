import { os } from '@orpc/server';
import {
	getGitRepositoryBranch,
	getGitRepositoryName,
	getGitUser,
	getGitUserEmail,
} from '../core/git.js';
import { getDoc, getDocs } from '../core/docs.js';
import { z } from 'zod';

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
	},
};

export type Router = typeof router;
