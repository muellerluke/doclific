#!/usr/bin/env bash
set -e

# -----------------------------
# Config
# -----------------------------
REPO="muellerluke/doclific"
BIN_NAME="doclific"
INSTALL_DIR_DEFAULT="/usr/local/bin"
VERSION="${VERSION:-latest}"

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
# Browser opener check (xdg-open)
# -----------------------------
if ! command -v xdg-open >/dev/null 2>&1; then
  warn "xdg-open not found. Doclific won't be able to open a browser tab automatically."
  info "To enable this:"
  info "  - Install xdg-utils (e.g. 'sudo apt-get install -y xdg-utils' or equivalent)."
  info "  - Ensure a default browser is configured for your system."
  info "  - Verify by running: xdg-open https://example.com"
fi

# -----------------------------
# Cleanup
# -----------------------------
rm -f "$ARCHIVE" "$CHECKSUM_FILE"
# Remove any extracted directories (but not the binary we just moved)
find . -maxdepth 1 -type d -name "$BIN_NAME-*" -exec rm -rf {} + 2>/dev/null || true

info "✅ $BIN_NAME installed successfully!"
info "Run: $BIN_NAME --help"
