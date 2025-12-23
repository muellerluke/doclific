# Doclific

A powerful documentation tool for creating and managing documentation with a modern web interface.

## Installation

Install Doclific globally using npm:

```bash
npm install -g doclific
```

## Getting Started

### 1. Initialize a Project

Navigate to the root directory of your project and run:

```bash
doclific init
```

This creates a `doclific` directory in your current working directory where your documentation will be stored.

### 2. Start the Server

From the root directory of your project, run:

```bash
doclific
```

This starts the Doclific web server on port `6767` by default. The server will automatically open in your browser.

### Custom Port

You can specify a custom port using the `--p` or `--port` flag:

```bash
doclific -p=8080
# or
doclific --port=8080
```

## Commands

- `doclific init` - Creates a `doclific` directory in the current working directory
- `doclific` - Starts the Doclific web server (default port: 6767)
- `doclific -p=<port>` - Starts the server on a custom port
- `doclific --port=<port>` - Alternative syntax for custom port
- `doclific get` - Returns the current configuration
- `doclific set <KEY> <value>` - Sets a configuration value

### Configuration Keys

You can set the following configuration keys:

- `AI_PROVIDER` - AI provider to use (`openai`, `anthropic`, or `google`)
- `AI_MODEL` - Model name to use (e.g., `gpt-4`, `claude-3-opus-20240229`, `gemini-pro`)
- `OPENAI_API_KEY` - Your OpenAI API key
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `GOOGLE_API_KEY` - Your Google API key

### Examples

```bash
# Get current configuration
doclific get

# Set AI provider
doclific set AI_PROVIDER openai

# Set AI model
doclific set AI_MODEL gpt-4

# Set API keys
doclific set OPENAI_API_KEY sk-your-api-key-here
doclific set ANTHROPIC_API_KEY sk-ant-your-api-key-here
doclific set GOOGLE_API_KEY your-api-key-here
```

## Usage

After initializing and starting the server:

1. Access the documentation interface at `http://localhost:6767` (or your custom port)
2. Create and organize your documentation files in the `doclific` directory
3. Use the sidebar to navigate between documents
4. Edit documents using the built-in editor with syntax highlighting and code snippets

## Features

- 📝 Rich markdown editor with live preview
- 🎨 Syntax highlighting for code blocks
- 📁 File tree navigation
- 🔍 Codebase snippet integration
- 🎯 Slash commands for quick formatting
- 📱 Responsive design

## Requirements

- Node.js (v18 or higher recommended)
- npm

## License

See [LICENSE](LICENSE) file for details.
