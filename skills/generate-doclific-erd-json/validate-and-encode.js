import { z } from 'zod';
import { readFileSync } from 'fs';
import he from 'he';

const dataTypeSchema = z.enum([
	'smallint',
	'integer',
	'bigint',
	'decimal',
	'numeric',
	'real',
	'double precision',
	'smallserial',
	'serial',
	'bigserial',
	'money',
	'char',
	'varchar',
	'text',
	'bytea',
	'date',
	'time',
	'timetz',
	'timestamp',
	'timestamptz',
	'interval',
	'boolean',
	'inet',
	'cidr',
	'macaddr',
	'macaddr8',
	'bit',
	'bit varying',
	'varbit',
	'tsvector',
	'tsquery',
	'uuid',
	'xml',
	'json',
	'jsonb',
	'point',
	'line',
	'lseg',
	'box',
	'path',
	'polygon',
	'circle',
	'int4range',
	'int8range',
	'numrange',
	'daterange',
	'tsrange',
	'tstzrange',
	'pg_lsn',
	'txid_snapshot',
]);

const columnSchema = z.object({
	name: z.string().describe('The name of the column'),
	type: dataTypeSchema,
	nullable: z.boolean().optional(),
	primaryKey: z.boolean().optional(),
	unique: z.boolean().optional(),
});

const outputColumnSchema = z.object({
	id: z.string().uuid().describe('The unique identifier for the column'),
	name: z.string().describe('The name of the column'),
	type: dataTypeSchema,
	nullable: z.boolean(),
	primaryKey: z.boolean(),
	unique: z.boolean(),
});

const tableNodeSchema = z.object({
	id: z.uuid().describe('The unique identifier for the table'),
	type: z.literal('tableNode'),
	data: z.object({
		name: z.string().describe('The name of the table'),
		columns: z.array(outputColumnSchema),
	}),
	position: z.object({
		x: z.number().min(-1000).max(1000).describe('The x position of the table'),
		y: z.number().min(-1000).max(1000).describe('The y position of the table'),
	}),
});

const cardinalitySchema = z.enum(['1:1', '1:N', 'N:N', 'N:1']);

const relationshipSchema = z.object({
	id: z.string().uuid().describe('The unique identifier for the relationship'),
	type: z.literal('default'),
	source: z.string().uuid().describe('The ID of the source table'),
	sourceHandle: z.string().describe('The handle ID on the source table'),
	target: z.string().uuid().describe('The ID of the target table'),
	targetHandle: z.string().describe('The handle ID on the target table'),
	animated: z.boolean(),
	markerStart: z.string().optional(),
	markerEnd: z.string().optional(),
	data: z.object({
		type: z.enum(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many']),
	}),
});

const erdSchema = z.object({
	tables: z.array(tableNodeSchema),
	relationships: z.array(relationshipSchema),
});

const initialTableSchema = z.object({
	name: z.string().describe('The name of the table'),
	x: z.number().min(-1000).max(1000).describe('The x position of the table'),
	y: z.number().min(-1000).max(1000).describe('The y position of the table'),
	columns: z.array(columnSchema),
});

const initialRelationshipSchema = z.object({
	table1: z.string().describe('The name of the first table'),
	column1: z.string().describe('The name of the first column'),
	table2: z.string().describe('The name of the second table'),
	column2: z.string().describe('The name of the second column'),
	cardinality: cardinalitySchema.describe(
		'The cardinality of the relationship -- 1:1, 1:N, N:N, N:1'
	),
});

const initialSchema = z.object({
	tables: z.array(initialTableSchema),
	relationships: z.array(initialRelationshipSchema),
});

(() => {
	const filePath = process.argv[2];
	if (!filePath) {
		console.error('Usage: node validate-and-encode.js <json-file-path>');
		process.exit(1);
	}

	try {
		// Read the JSON file
		const fileContent = readFileSync(filePath, 'utf-8');
		const jsonData = JSON.parse(fileContent);

		const validatedInitialSchema = initialSchema.parse(jsonData);

		const tables = validatedInitialSchema.tables.map((table) => ({
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
			position: {
				x: table.x,
				y: table.y,
			},
		}));

		const relationships = validatedInitialSchema.relationships.map((relationship) => {
			const sourceTable = tables.find((table) => table.data.name === relationship.table1);
			const targetTable = tables.find((table) => table.data.name === relationship.table2);

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

			let markerStart = undefined;
			let markerEnd = undefined;
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

			let type = 'one-to-one';
			switch (relationship.cardinality) {
				case '1:1':
					type = 'one-to-one';
					break;
				case '1:N':
					type = 'one-to-many';
					break;
				case 'N:1':
					type = 'many-to-one';
					break;
				case 'N:N':
					type = 'many-to-many';
					break;
			}

			return {
				id: crypto.randomUUID(),
				type: 'default',
				source: sourceTable.id,
				sourceHandle: `col-${sourceColumn.id}-source-${sourceSide}`,
				target: targetTable.id,
				targetHandle: `col-${targetColumn.id}-target-${targetSide}`,
				animated: false,
				markerStart,
				markerEnd,
				data: {
					type,
				},
			};
		});

		// Validate against the schema
		const validated = erdSchema.parse({
			tables,
			relationships,
		});

		// Extract tables and relationships
		const tablesJson = JSON.stringify(validated.tables);
		const relationshipsJson = JSON.stringify(validated.relationships);

		// HTML encode both JSONs using he package
		const encodedTables = he.encode(tablesJson);
		const encodedRelationships = he.encode(relationshipsJson);

		// Return as JSON object
		const result = {
			tables: encodedTables,
			relationships: encodedRelationships,
		};

		console.log(JSON.stringify(result));
	} catch (error) {
		console.error('Error:', error.message);
		if (error instanceof z.ZodError) {
			console.error('Validation error:', JSON.stringify(error, null, 2));
			process.exit(1);
		} else {
			console.error('Error:', error.message);
			process.exit(1);
		}
	}
})();
