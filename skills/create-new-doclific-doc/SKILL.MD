---
name: create-new-doclific-doc
description: Create a new Doclific document. Navigates the doclific directory structure, selects an appropriate icon, and creates the document using insert-doc.js.
---

# Create New Doclific Doc

## Overview

This skill helps you create a new Doclific document by navigating the directory structure, selecting an appropriate icon, and using the `insert-doc.js` script to create the document structure.

## Instructions

When the user asks you to create a new Doclific document:

1. **Determine the location**: 
   - If the user specifies a parent document (e.g., "Create a new doc under 'Getting Started'"), search the `doclific/` directory recursively to find the parent document's directory by matching the `title` field in `config.json` files.
   - If no parent is specified, create the document at the root level of the `doclific/` directory.
   - The path should be the full directory path where the new document should be created (e.g., `doclific/` for root level, or `doclific/61ac6a60-3409-4ef6-aa86-203abbfac9d8/` for a child document).

2. **Get the document title**: 
   - Use the title provided by the user, or ask for clarification if not provided.

3. **Select an appropriate icon**:
   - Read the `all-icons.json` file from the `skills/create-new-doclific-doc/` directory.
   - Choose an icon that semantically matches the document's purpose or title.
   - Common icon choices:
     - Documentation/Guides: `BookOpen`, `FileText`, `Book`, `ScrollText`
     - Getting Started: `Rocket`, `Play`, `Zap`, `Sparkles`
     - API Reference: `Code`, `Terminal`, `Brackets`, `FileCode`
     - Architecture: `Network`, `Layers`, `Boxes`, `Workflow`
     - Configuration: `Settings`, `Sliders`, `Wrench`, `Cog`
     - Examples: `Lightbulb`, `Beaker`, `FlaskConical`, `TestTube`
   - If the user specifies an icon, use that icon name (validate it exists in `all-icons.json`).
   - If unsure, default to `FileText` or ask the user for their preference.

4. **Call insert-doc.js**:
   - Use the `insert-doc.js` script located at `skills/create-new-doclific-doc/insert-doc.js`.
   - Execute it with three arguments:
     ```bash
     node skills/create-new-doclific-doc/insert-doc.js <path> <title> <icon-name>
     ```
   - Example:
     ```bash
     node skills/create-new-doclific-doc/insert-doc.js doclific/ "Getting Started" "Rocket"
     ```
   - Or for a nested document:
     ```bash
     node skills/create-new-doclific-doc/insert-doc.js doclific/61ac6a60-3409-4ef6-aa86-203abbfac9d8/ "API Reference" "Code"
     ```

5. **Verify creation**:
   - The script will create:
     - A new directory with a random UUID
     - A `config.json` file with the title and icon
     - A `content.mdx` file with the title as a heading
   - Confirm the document was created successfully.

6. **Optional: Generate initial content**:
   - After creating the document, you can optionally use the `generate-doclific-mdx` skill to populate the `content.mdx` file with initial documentation based on the document's title and purpose.

## Workflow Example

1. User: "Create a new document called 'API Reference' under 'Getting Started'"
2. Search `doclific/` for a `config.json` with `title: "Getting Started"`
3. Find the directory path (e.g., `doclific/61ac6a60-3409-4ef6-aa86-203abbfac9d8/`)
4. Select icon: `Code` (appropriate for API Reference)
5. Execute: `node skills/create-new-doclific-doc/insert-doc.js doclific/61ac6a60-3409-4ef6-aa86-203abbfac9d8/ "API Reference" "Code"`
6. Confirm creation and optionally generate initial content using `generate-doclific-mdx`

## Important Notes

- The `insert-doc.js` script will generate a random UUID for the document directory name.
- The script validates that the icon name exists in `all-icons.json` before creating the document.
- Always use absolute paths or paths relative to the project root when calling `insert-doc.js`.
- If the parent directory doesn't exist, the script will create it (with `recursive: true`).
- After creating the document structure, you can use the `generate-doclific-mdx` skill to populate the content.
