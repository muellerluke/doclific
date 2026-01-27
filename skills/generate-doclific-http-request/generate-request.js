import { z } from 'zod';
import { readFileSync } from 'fs';
import he from 'he';

// Schema definitions
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

const keyValuePairSchema = z.object({
	key: z.string(),
	value: z.string(),
	enabled: z.boolean().default(true),
});

const bodyTypeSchema = z.enum(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw']);

const authTypeSchema = z.enum(['none', 'basic', 'bearer', 'apikey']);

const authSchema = z
	.object({
		type: authTypeSchema,
		// Basic auth
		username: z.string().optional(),
		password: z.string().optional(),
		// Bearer token
		token: z.string().optional(),
		// API Key
		apiKeyName: z.string().optional(),
		apiKeyValue: z.string().optional(),
		apiKeyLocation: z.enum(['header', 'query']).optional(),
	})
	.default({ type: 'none' });

const inputSchema = z.object({
	method: httpMethodSchema,
	url: z.string().refine(
		(url) => url.startsWith('http://') || url.startsWith('https://'),
		{ message: 'URL must start with http:// or https://' }
	),
	headers: z.array(keyValuePairSchema).default([]),
	queryParams: z.array(keyValuePairSchema).default([]),
	bodyType: bodyTypeSchema.default('none'),
	bodyContent: z.string().default(''),
	formData: z.array(keyValuePairSchema).default([]),
	auth: authSchema,
});

(() => {
	const filePath = process.argv[2];
	if (!filePath) {
		console.error('Usage: node generate-request.js <json-file-path>');
		console.error('');
		console.error('Example:');
		console.error('  node generate-request.js request.json');
		process.exit(1);
	}

	try {
		// Read and parse the JSON file
		const fileContent = readFileSync(filePath, 'utf-8');
		const jsonData = JSON.parse(fileContent);

		// Validate against schema
		const validated = inputSchema.parse(jsonData);

		// HTML encode the complex fields
		const encodedHeaders = he.encode(JSON.stringify(validated.headers));
		const encodedQueryParams = he.encode(JSON.stringify(validated.queryParams));
		const encodedFormData = he.encode(JSON.stringify(validated.formData));
		const encodedAuth = he.encode(JSON.stringify(validated.auth));
		const encodedBodyContent = he.encode(validated.bodyContent);

		// Build the MDX component
		const mdxComponent = `<HttpRequest method="${validated.method}" url="${he.encode(validated.url)}" headers="${encodedHeaders}" queryParams="${encodedQueryParams}" bodyType="${validated.bodyType}" bodyContent="${encodedBodyContent}" formData="${encodedFormData}" auth="${encodedAuth}">
</HttpRequest>`;

		console.log(mdxComponent);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error('Validation error:');
			error.errors.forEach((err) => {
				console.error(`  - ${err.path.join('.')}: ${err.message}`);
			});
			process.exit(1);
		} else if (error instanceof SyntaxError) {
			console.error('JSON parse error:', error.message);
			process.exit(1);
		} else {
			console.error('Error:', error.message);
			process.exit(1);
		}
	}
})();
