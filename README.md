# Doclific

**Doclific** is an internal documentation tool that features a modern, Notion-like rich text editor for creating and managing your project documentation. Built with a powerful CLI and a beautiful web interface, Doclific makes it easy to document your codebase, APIs, and project knowledge.

## Features

-   📝 **Notion-like Editor**: Rich text editing experience with support for headings, lists, code blocks, and more
-   🤖 **AI-Powered Documentation**: Generate documentation using AI with support for multiple providers (OpenAI, Anthropic, Google)
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

**Note**: Make sure `~/.local/bin` (or `/usr/local/bin`) is in your `PATH` if it's not already.

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
doclific get AI_PROVIDER
doclific get GOOGLE_API_KEY
```

**Available keys:**

-   `DEEPLINK_PREFIX` - Prefix for deep linking
-   `AI_PROVIDER` - AI provider to use (`openai`, `anthropic`, or `google`)
-   `AI_MODEL` - AI model name
-   `OPENAI_API_KEY` - OpenAI API key
-   `ANTHROPIC_API_KEY` - Anthropic API key
-   `GOOGLE_API_KEY` - Google API key

API keys are automatically masked when displayed for security.

### `doclific set [key] [value]`

Set a configuration value.

```bash
doclific set AI_PROVIDER google
doclific set GOOGLE_API_KEY your-api-key-here
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

### Setting up AI

To use AI-powered documentation generation, configure your AI provider:

```bash
# Set the provider
doclific set AI_PROVIDER google

# Set your API key
doclific set GOOGLE_API_KEY your-api-key-here

# Set the model (optional)
doclific set AI_MODEL gemini-3-flash-preview
```

Supported providers:

-   **OpenAI**: Set `AI_PROVIDER=openai` and `OPENAI_API_KEY`
-   **Anthropic**: Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`
-   **Google**: Set `AI_PROVIDER=google` and `GOOGLE_API_KEY`

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

5. **Use AI assistance**: Click the AI button (✨) in the editor to generate documentation using AI

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

-   Go 1.24+ (for building from source)
-   Node.js 20+ (for building the frontend)
-   A modern web browser

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
