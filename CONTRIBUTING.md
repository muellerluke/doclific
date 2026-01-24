# Contributing to Doclific

First off, thank you for considering contributing to Doclific! It's people like you that make Doclific such a great tool.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## 🚀 Getting Started

### Prerequisites

Before you start, make sure you have the following installed:

- **Go**: Version 1.25 or higher
- **Node.js**: Version 20 or higher
- **npm**: (Usually comes with Node.js)
- **Git**

### Installation

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:

    ```bash
    git clone https://github.com/<your-username>/doclific.git
    cd doclific
    ```

3.  **Install Frontend Dependencies**:

    ```bash
    cd web/frontend
    npm install
    cd ../..
    ```

4.  **Verify Go Installation**:

    ```bash
    go version
    ```

## 🛠️ Development Workflow

To work on Doclific, you'll typically run the Go backend and the React frontend concurrently.

### 1. Run the Backend

The backend serves the API and the static files. For development, you can run it directly:

```bash
# From the project root
go run cmd/doclific/main.go
```

By default, the server runs on `http://localhost:6767`.

### 2. Run the Frontend (Dev Mode)

For a better developer experience (HMR, fast refresh), run the frontend in a separate terminal:

```bash
cd web/frontend
npm run dev
```

This will start the Vite dev server, usually at `http://localhost:5173`.

> **Note**: You will need to configure the frontend to talk to the backend port (6767) if you are working on API integration.

### 3. Building from Source

To build the full binary (which embeds the frontend):

1.  **Build the Frontend**:

    ```bash
    cd web/frontend
    npm run build
    cd ../..
    ```

    This generates static files in `web/frontend/dist`.

2.  **Build the Binary**:

    ```bash
    go build -o doclific cmd/doclific/main.go
    ```

3.  **Run the Binary**:

    ```bash
    ./doclific
    ```

## 📂 Project Structure

- `cmd/`: Entry point for the application (Cobra CLI commands).
- `internal/`: Private application and library code.
    - `core/`: Core domain logic (AI, Git, File System).
    - `server/`: HTTP server and API handlers.
    - `config/`: Configuration management.
- `web/`: Frontend source code.
    - `frontend/`: React + TypeScript application.

## 🧪 Running Tests

### Backend (Go)

```bash
go test ./...
```

### Frontend (React)

_Currently, the frontend does not have a test suite set up. Contributing one would be a great way to help!_

## 🎨 Code Style

### Go

- Follow standard Go conventions.
- Run `go fmt ./...` before committing.

### TypeScript / React

- We use **ESLint** and **Prettier**.
- Run linting before pushing:

    ```bash
    cd web/frontend
    npm run lint
    ```

## 📝 Pull Request Process

1.  Create a new branch for your feature or fix: `git checkout -b feature/amazing-feature`.
2.  Commit your changes with meaningful commit messages.
3.  Push to your fork: `git push origin feature/amazing-feature`.
4.  Open a Pull Request against the `main` branch.
5.  Describe your changes in detail and reference any related issues.

## 🐛 Reporting Bugs

If you find a bug, please create an issue including:

- Your operating system and version.
- Browser version (if applicable).
- Steps to reproduce the bug.
- Expected vs. actual behavior.

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's **Business Source License 1.1** (which converts to Apache 2.0). See `LICENSE` for details.
