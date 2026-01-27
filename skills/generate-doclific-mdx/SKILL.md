---
name: generate-doclific-mdx
description: Write MDX documentation for Doclific. Finds documents by title and writes to content.mdx with CodebaseSnippet and ERD components.
---

# Generate Doclific MDX Documentation

## Overview
This skill helps you write MDX documentation for the Doclific documentation system.

## Instructions

When the user asks you to write documentation for a specific document:

1. **Find the document**: Search through the nested directories in the `doclific/` folder to find a `config.json` file where the `"title"` field matches the document name the user provided.

2. **Locate the content file**: Once found, the documentation should be written to the `content.mdx` file in the same directory as the `config.json`.

3. **Write the documentation**: Create well-structured documentation using:
   - Standard Markdown syntax (headings, paragraphs, lists, code blocks, etc.)
   - Custom MDX components described below

## Custom MDX Components

### CodebaseSnippet
Embeds a code snippet from the project's codebase with syntax highlighting.

```mdx
<CodebaseSnippet filePath="path/to/file.ts" lineStart="1" lineEnd="50">
</CodebaseSnippet>
```

**Attributes:**
- `filePath` (required): Path to the file relative to the project root
- `lineStart` (optional): Starting line number to display
- `lineEnd` (optional): Ending line number to display

Use this to reference actual code from the repository in your documentation.

### ERD (Entity Relationship Diagram)
Creates an interactive entity relationship diagram for database schemas.

```mdx
<ERD tables='[...]' relationships='[...]'>
</ERD>
```

**For generating ERD JSON, use the separate skill:** `generate-doclific-erd-json`

That skill provides detailed instructions for creating the `tables` and `relationships` JSON attributes.

### HttpRequest
Creates an interactive HTTP request builder that allows users to make live API requests directly from the documentation.

```mdx
<HttpRequest method="GET" url="https://api.example.com/users" headers="[...]" queryParams="[...]" bodyType="none" bodyContent="" formData="[]" auth="{...}">
</HttpRequest>
```

**For generating HttpRequest components, use the separate skill:** `generate-doclific-http-request`

That skill provides a script that takes a simple JSON input and outputs the properly formatted MDX component.

## Example

See the `example.mdx` file in this directory for a reference of how to use these components.

## Workflow

1. User provides a document title (e.g., "Getting Started")
2. Search `doclific/` recursively for `config.json` files
3. Find the one where `title` matches the user's input
4. Write documentation to `content.mdx` in that same directory
5. Use appropriate MDX components to enhance the documentation
6. If user needs an ERD diagram, use the `generate-doclific-erd-json` skill to create the JSON
