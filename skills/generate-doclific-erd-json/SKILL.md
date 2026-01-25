---
name: generate-doclific-erd-json
description: Generate JSON for ERD (Entity Relationship Diagram) components. Use when creating database schema diagrams in Doclific documentation.
---

# Generate Doclific ERD JSON

## Overview

This skill helps you generate the JSON for ERD (Entity Relationship Diagram) components in Doclific MDX documentation.

## Instructions

When the user asks you to create an ERD diagram:

1. **Gather requirements**: Ask the user about their database schema - tables, columns, and relationships.

2. **Generate the JSON**: Create properly formatted JSON for the `tables` and `relationships` attributes.

3. **Output the MDX**: Provide the complete `<ERD>` component with the generated JSON.

## ERD Component Structure

```mdx
<ERD tables="[JSON array of tables]" relationships="[JSON array of relationships]"></ERD>
```

## Tables JSON Structure

Each table object must have:

```json
{
	"id": "unique-table-id",
	"type": "tableNode",
	"data": {
		"name": "table_name",
		"columns": [
			{
				"name": "column_name",
				"dataType": "varchar",
				"isPrimaryKey": false,
				"isNullable": true
			}
		]
	},
	"position": {
		"x": 50,
		"y": 50
	}
}
```

**Table fields:**

- `id` (string): Unique identifier for the table (e.g., "t1", "users-table")
- `type` (string): The type of node, must be "tableNode"
- `data` (object): The data for the table
- `data.name` (string): The actual table name in the database
- `data.columns` (array): Array of column definitions
- `position` (object): The position of the table
- `position.x` (number): Horizontal position for diagram layout (start at 50, increment by 300 for each table), maximum 1000, minimum -1000
- `position.y` (number): Vertical position for diagram layout (typically 50-100), maximum 1000, minimum -1000

## Columns JSON Structure

Each column object must have:

```json
{
	"name": "column_name",
	"type": "varchar",
	"primaryKey": false,
	"nullable": true
}
```

**Column fields:**

- `id` (string): Unique identifier for the column (e.g., "c1", "users-id")
- `name` (string): The column name
- `type` (string): PostgreSQL data type (see list below)
- `primaryKey` (boolean): `true` if this is the primary key
- `nullable` (boolean): `true` if the column allows NULL values

**Supported data types:**

- Numeric: `smallint`, `integer`, `bigint`, `decimal`, `numeric`, `real`, `double precision`, `smallserial`, `serial`, `bigserial`
- Monetary: `money`
- Character: `char`, `varchar`, `text`
- Binary: `bytea`
- Date/Time: `date`, `time`, `timetz`, `timestamp`, `timestamptz`, `interval`
- Boolean: `boolean`
- Network: `inet`, `cidr`, `macaddr`, `macaddr8`
- Bit strings: `bit`, `bit varying`
- UUID: `uuid`
- JSON: `json`, `jsonb`
- Arrays: `array`

## Relationships JSON Structure

Each relationship object must have:

```json
{
	"table1": "table-name",
	"column1": "column-name",
	"table2": "table-name",
	"column2": "column-name",
	"cardinality": "1:N"
}
```

**Relationship fields:**

- `table1` (string): Name of the source table (the "one" side)
- `column1` (string): Name of the source column (usually the primary key)
- `table2` (string): Name of the target table (the "many" side)
- `column2` (string): Name of the target column (the foreign key)
- `cardinality` (string): Cardinality of the relationship (one of `"1:1"`, `"1:N"`, `"N:N"`, `"N:1"`)

## Example

See the `example.json` file in this directory for a complete example.

## Workflow

1. User describes their database schema
2. Identify all tables and their columns
3. Identify relationships between tables
4. Generate unique IDs for tables, columns, and relationships
5. Calculate x/y positions (space tables horizontally)
6. **Write JSON to temporary file**: Create a temporary JSON file containing the `tables` and `relationships` arrays in the format described above
7. **Validate and encode**: Run the `validate-and-encode.js` script with the temporary file path as an argument:
    ```bash
    node skills/generate-doclific-erd-json/validate-and-encode.js <temp-file-path>
    ```
    The script will:
    - Validate the JSON against the zod schema
    - HTML encode both the `tables` and `relationships` JSON arrays
    - Return a JSON object with `tables` and `relationships` properties containing the encoded strings
8. **Output the MDX**: Use the returned encoded strings as the `tables` and `relationships` props in the `<ERD>` component:
    ```mdx
    <ERD tables="{encoded_tables_string}" relationships="{encoded_relationships_string}"></ERD>
    ```
9. **Clean up**: Delete the temporary JSON file after use
