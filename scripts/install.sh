#!/usr/bin/env bash
set -e

# -----------------------------
# Config
# -----------------------------
REPO="muellerluke/doclific"
BIN_NAME="doclific"
INSTALL_DIR_DEFAULT="/usr/local/bin"
# Allow version to be passed as first argument, or via environment variable, or default to latest
VERSION="${1:-${VERSION:-latest}}"

# -----------------------------
# Helpers
# -----------------------------
err() {
  echo "❌ $1" >&2
  exit 1
}

info() {
  echo "ℹ️  $1"
}

# -----------------------------
# Detect OS
# -----------------------------
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  darwin) OS="darwin" ;;
  linux) OS="linux" ;;
  *) err "Unsupported OS: $OS" ;;
esac

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) err "Unsupported architecture: $ARCH" ;;
esac

# -----------------------------
# Resolve version
# -----------------------------
if [ "$VERSION" = "latest" ]; then
  VERSION="$(curl -fsSL https://api.github.com/repos/$REPO/releases/latest \
    | grep '"tag_name"' \
    | sed -E 's/.*"([^"]+)".*/\1/')"
fi

info "Installing $BIN_NAME $VERSION for $OS/$ARCH"

# -----------------------------
# URLs
# -----------------------------
ARCHIVE="$BIN_NAME-$VERSION-$OS-$ARCH.tar.gz"
CHECKSUM_FILE="checksums.txt"
BASE_URL="https://github.com/$REPO/releases/download/$VERSION"

TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"

# -----------------------------
# Download
# -----------------------------
info "Downloading binary archive..."
curl -fsSLO "$BASE_URL/$ARCHIVE"

info "Downloading checksums..."
curl -fsSLO "$BASE_URL/$CHECKSUM_FILE"

# -----------------------------
# Verify checksum
# -----------------------------
info "Verifying checksum..."

# Determine command
if command -v sha256sum >/dev/null 2>&1; then
    CHECKSUM_CMD="sha256sum -c -"
elif command -v shasum >/dev/null 2>&1; then
    CHECKSUM_CMD="shasum -a 256 -c -"
else
    err "No SHA256 checksum tool found. Please install sha256sum or shasum."
fi

# Run checksum verification
grep "$ARCHIVE" "$CHECKSUM_FILE" | $CHECKSUM_CMD || err "Checksum verification failed"

# -----------------------------
# Extract archive
# -----------------------------
info "Extracting binary..."
tar -xzf "$ARCHIVE"

# Find the binary (it might be in a subdirectory)
BINARY_PATH=""
if [ -f "$BIN_NAME" ]; then
  # Binary is in current directory
  BINARY_PATH="$BIN_NAME"
else
  # Binary is in a subdirectory (e.g., doclific-v1.0.0-linux-amd64/doclific)
  BINARY_PATH="$(find . -name "$BIN_NAME" -type f | head -n 1)"
  if [ -z "$BINARY_PATH" ]; then
    err "Extracted binary '$BIN_NAME' not found"
  fi
fi

# Ensure extracted binary exists
if [ ! -f "$BINARY_PATH" ]; then
  err "Extracted binary '$BIN_NAME' not found"
fi

chmod +x "$BINARY_PATH"

# -----------------------------
# Install location
# -----------------------------
INSTALL_DIR="$INSTALL_DIR_DEFAULT"
if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

# -----------------------------
# Install
# -----------------------------
info "Installing to $INSTALL_DIR"
if [ "$INSTALL_DIR" = "$INSTALL_DIR_DEFAULT" ]; then
  sudo mv "$BINARY_PATH" "$INSTALL_DIR/$BIN_NAME"
else
  mv "$BINARY_PATH" "$INSTALL_DIR/$BIN_NAME"
fi

# Install build directory if it exists
BUILD_DIR_PATH=""
if [ -d "build" ]; then
  BUILD_DIR_PATH="build"
elif [ -d "web/build" ]; then
  BUILD_DIR_PATH="web/build"
else
  # Look for build directory in extracted subdirectory
  BUILD_DIR_PATH="$(find . -type d -name "build" -not -path "*/.*" | head -n 1)"
fi

if [ -n "$BUILD_DIR_PATH" ] && [ -d "$BUILD_DIR_PATH" ]; then
  info "Installing frontend build files..."
  BUILD_TARGET_DIR="$INSTALL_DIR/build"
  if [ "$INSTALL_DIR" = "$INSTALL_DIR_DEFAULT" ]; then
    sudo rm -rf "$BUILD_TARGET_DIR"
    sudo cp -r "$BUILD_DIR_PATH" "$BUILD_TARGET_DIR"
  else
    rm -rf "$BUILD_TARGET_DIR"
    cp -r "$BUILD_DIR_PATH" "$BUILD_TARGET_DIR"
  fi
fi

# -----------------------------
# Add skills to ~/.cursor or ~/.claude
# -----------------------------
# Find skills directory in extracted archive (similar to build directory)
# Do this BEFORE cleanup so we can access the extracted files
SKILLS_DIR_PATH=""
if [ -d "skills" ]; then
  SKILLS_DIR_PATH="skills"
else
  # Look for skills directory in extracted subdirectory
  SKILLS_DIR_PATH="$(find . -type d -name "skills" -not -path "*/.*" | head -n 1)"
fi

if [ -n "$SKILLS_DIR_PATH" ] && [ -d "$SKILLS_DIR_PATH" ]; then
  # Function to install a skill to a target directory
  install_skill() {
    local skill_name="$1"
    local target_dir="$2"
    local skill_source="$SKILLS_DIR_PATH/$skill_name"
    local skill_target="$target_dir/$skill_name"
    
    if [ -d "$skill_source" ]; then
      info "Installing skill: $skill_name"
      cp -r "$skill_source" "$skill_target"
      
      # Install npm dependencies if package.json exists
      if [ -f "$skill_target/package.json" ]; then
        info "Installing dependencies for $skill_name"
        (cd "$skill_target" && npm install --silent)
      fi
    fi
  }
  
  SKILLS_INSTALLED=false
  
  # Install to ~/.cursor/skills if ~/.cursor exists
  if [ -d ~/.cursor ]; then
    info "Adding skills to ~/.cursor/skills"
    mkdir -p ~/.cursor/skills
    
    # Install each skill individually
    for skill in "$SKILLS_DIR_PATH"/*; do
      if [ -d "$skill" ]; then
        skill_name="$(basename "$skill")"
        install_skill "$skill_name" ~/.cursor/skills
      fi
    done
    SKILLS_INSTALLED=true
  fi
  
  # Install to ~/.claude/skills if ~/.claude exists
  if [ -d ~/.claude ]; then
    info "Adding skills to ~/.claude/skills"
    mkdir -p ~/.claude/skills
    
    # Install each skill individually
    for skill in "$SKILLS_DIR_PATH"/*; do
      if [ -d "$skill" ]; then
        skill_name="$(basename "$skill")"
        install_skill "$skill_name" ~/.claude/skills
      fi
    done
    SKILLS_INSTALLED=true
  fi
  
  # Warn if skills couldn't be installed
  if [ "$SKILLS_INSTALLED" = false ]; then
    echo ""
    echo "⚠️  Could not find ~/.cursor or ~/.claude directories to install skills."
    echo "To manually install skills:"
    echo "  1. Clone or download the Doclific repository"
    echo "  2. Copy the skills from the 'skills/' directory"
    echo "  3. Add them to your AI agent's skills directory:"
    echo "     - For Cursor: ~/.cursor/skills/"
    echo "     - For Claude Code: ~/.claude/skills/"
    echo ""
  fi
fi

# -----------------------------
# PATH check
# -----------------------------
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo ""
  echo "⚠️  $INSTALL_DIR is not on your PATH."
  echo "Add this to your shell config:"
  echo ""
  echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
fi

# -----------------------------
# Browser opener check (xdg-open / wslview)
# -----------------------------
if [ "$OS" = "linux" ]; then
  if grep -qi "microsoft" /proc/version 2>/dev/null || \
    grep -qi "microsoft" /proc/sys/kernel/osrelease 2>/dev/null; then
    if ! command -v wslview >/dev/null 2>&1; then
      echo ""
      echo "⚠️  wslview not found. Doclific won't be able to open a browser tab automatically on WSL."
      info "To enable this:"
      info "  - Install wslu (e.g. 'sudo apt-get install -y wslu' or equivalent)."
      info "  - Verify by running: wslview https://example.com"
    fi
  else
    if ! command -v xdg-open >/dev/null 2>&1; then
      echo ""
      echo "⚠️  xdg-open not found. Doclific won't be able to open a browser tab automatically."
      info "To enable this:"
      info "  - Install xdg-utils (e.g. 'sudo apt-get install -y xdg-utils' or equivalent)."
      info "  - Ensure a default browser is configured for your system."
      info "  - Verify by running: xdg-open https://example.com"
    fi
  fi
fi

# -----------------------------
# Cleanup
# -----------------------------
rm -f "$ARCHIVE" "$CHECKSUM_FILE"
# Remove any extracted directories (but not the binary we just moved)
find . -maxdepth 1 -type d -name "$BIN_NAME-*" -exec rm -rf {} + 2>/dev/null || true

info "✅ $BIN_NAME installed successfully!"
info "Run: $BIN_NAME --help"
