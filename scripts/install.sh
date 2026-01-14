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

# Ensure extracted binary exists
if [ ! -f "$BIN_NAME" ]; then
  err "Extracted binary '$BIN_NAME' not found"
fi

chmod +x "$BIN_NAME"

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
  sudo mv "$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
else
  mv "$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
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
# Cleanup
# -----------------------------
rm -f "$ARCHIVE" "$CHECKSUM_FILE"

echo ""
info "✅ $BIN_NAME installed successfully!"
info "Run: $BIN_NAME --help"
