declare global {
	interface Window {
		env: {
			PORT: number | string;
		};
	}
}

export {};
