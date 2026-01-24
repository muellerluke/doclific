export type FolderStructure = {
	name: string;
	title: string;
	icon?: string;
	order?: number;
	children: FolderStructure[];
};
