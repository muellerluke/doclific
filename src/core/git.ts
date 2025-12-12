import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

export const getGitRepositoryName = async (): Promise<string | null> => {
	try {
		const GET_REPO_NAME_COMMAND = `git config --get remote.origin.url | sed -E "s|.*/(.+)\\.git|\\1|"`;
		const repoName = await execAsync(GET_REPO_NAME_COMMAND);
		return repoName.stdout.toString().trim();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getGitRepositoryBranch = async (): Promise<string | null> => {
	try {
		const GET_REPO_BRANCH_COMMAND = `git rev-parse --abbrev-ref HEAD`;
		const repoBranch = await execAsync(GET_REPO_BRANCH_COMMAND);
		return repoBranch.stdout.toString().trim();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getGitUser = async (): Promise<string | null> => {
	try {
		const GET_USER_COMMAND = `git config user.name`;
		const user = await execAsync(GET_USER_COMMAND);
		return user.stdout.toString().trim();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getGitUserEmail = async (): Promise<string | null> => {
	try {
		const GET_USER_EMAIL_COMMAND = `git config user.email`;
		const userEmail = await execAsync(GET_USER_EMAIL_COMMAND);
		return userEmail.stdout.toString().trim();
	} catch (error) {
		console.error(error);
		return null;
	}
};
