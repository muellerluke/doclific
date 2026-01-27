# Doclific

**Doclific** is an internal documentation tool that features a modern, Notion-like rich text editor for creating and managing your project documentation. Built with a powerful CLI and a beautiful web interface, Doclific makes it easy to document your codebase, APIs, and project knowledge.

## Features

-   📝 **Notion-like Editor**: Rich text editing experience with support for headings, lists, code blocks, and more
-   📁 **Codebase Integration**: Reference code snippets directly from your repository
-   🔍 **Smart Navigation**: Organized folder structure for easy documentation management
-   ⚡ **Fast & Local**: Runs entirely on your machine - no external services required
-   🔄 **Auto-Updates**: Automatically checks for and installs updates

## Installation

Install Doclific with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/muellerluke/doclific/main/scripts/install.sh | bash
```

This will:

-   Download the latest release for your platform
-   Install the binary to `/usr/local/bin` (or `~/.local/bin` if you don't have write permissions)
-   Set up the frontend build files
-   Automatically add skills for Cursor and Claude Code to `~/.cursor/skills` or `~/.claude/skills` (if those directories exist)

**Note**: Make sure `~/.local/bin` (or `/usr/local/bin`) is in your `PATH` if it's not already.

**Skills Installation**: The installation script will automatically add Doclific skills to Cursor and Claude Code if those applications are installed. If the skills are not automatically added, you can manually copy them from the `skills/` directory in this repository to `~/.cursor/skills/` or `~/.claude/skills/` as needed.

## Using Cursor or Claude Code

Doclific includes skills that allow Cursor and Claude Code to automatically generate documentation for your project. Here's how to use them:

### Writing Documentation

To generate documentation for a specific document, simply ask Cursor or Claude Code:

```
Write documentation for the "Getting Started" document
```

or

```
Generate documentation for the "API Reference" page
```

The AI will:
1. Find the document by title in your `doclific/` folder
2. Write well-structured MDX documentation to the `content.mdx` file
3. Use code snippets from your codebase when relevant

### Creating ERD Diagrams

To create an Entity Relationship Diagram (ERD) for your database schema, you **must explicitly request an ERD**:

```
Create an ERD diagram for my database schema
```

or

```
Generate an ERD showing the relationships between Users, Posts, and Comments tables
```

When you request an ERD, the AI will:
1. Ask you about your database schema (tables, columns, relationships)
2. Generate the properly formatted JSON for the ERD component
3. Add the `<ERD>` component to your documentation

**Important**: If you want an ERD diagram, make sure to mention "ERD" or "Entity Relationship Diagram" in your prompt. The AI will not automatically create ERDs unless you specifically request them.

### Tips for Better Results

- Be specific about which document you want to update
- Mention if you want code snippets included
- For ERDs, describe your tables, columns, and relationships clearly
- You can ask for multiple documents to be updated in one session

## Commands

### `doclific`

Start the Doclific server (default command).

```bash
doclific
# or specify a custom port
doclific --port 8080
```

**Options:**

-   `-p, --port`: Port to listen on (default: 6767)

The server will automatically open your browser to the web interface.

### `doclific init`

Initialize a new Doclific project in the current directory.

```bash
doclific init
```

This creates a `doclific` folder structure where your documentation will be stored.

### `doclific get [key]`

Get a configuration value.

```bash
doclific get DEEPLINK_PREFIX
```

**Available keys:**

-   `DEEPLINK_PREFIX` - Prefix for deep linking

### `doclific set [key] [value]`

Set a configuration value.

```bash
doclific set DEEPLINK_PREFIX https://example.com
```

### `doclific version`

Show the current version of Doclific.

```bash
doclific version
```

### `doclific update`

Manually check for updates and install the latest version.

```bash
doclific update
```

**Note**: Doclific automatically checks for updates when you run any command. This command is useful for manual updates or checking update status.

## Configuration

Doclific stores configuration in `~/.config/doclific/config.json`. You can manage it using the `get` and `set` commands, or edit the file directly.

## Usage

1. **Initialize a project**:

    ```bash
    cd /path/to/your/project
    doclific init
    ```

2. **Start the server**:

    ```bash
    doclific
    ```

3. **Open the web interface**: The browser will open automatically, or navigate to `http://localhost:6767`

4. **Create documentation**: Use the Notion-like editor to create and edit your documentation

## Project Structure

After running `doclific init`, your project will have:

```
your-project/
└── doclific/
    └── [documentation folders]/
        ├── config.json
        └── content.mdx
```

Each documentation folder contains:

-   `config.json`: Metadata (title, icon)
-   `content.mdx`: The documentation content in MDX format

## Auto-Updates

Doclific automatically checks for updates every time you run a command. If a newer version is available, it will:

1. Download and install the update
2. Exit with a message asking you to restart the command
3. Continue normally if already up to date

You can disable auto-updates by running the `update` command manually when needed.

## Requirements

-   Go 1.25+ (for building from source)
-   Node.js 20+ (for building the frontend)
-   A modern web browser

## License

Copyright © 2026 Luke Mueller

Licensed under the Apache License, Version 2.0

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
