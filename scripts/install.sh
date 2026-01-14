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
FILE="$BIN_NAME-$OS-$ARCH"
CHECKSUM_FILE="checksums.txt"

BASE_URL="https://github.com/$REPO/releases/$VERSION/download"

TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"

# -----------------------------
# Download
# -----------------------------
info "Downloading binary..."
curl -fsSLO "$BASE_URL/$FILE"

info "Downloading checksums..."
curl -fsSLO "$BASE_URL/$CHECKSUM_FILE"

# -----------------------------
# Verify checksum
# -----------------------------
info "Verifying checksum..."
grep "$FILE" "$CHECKSUM_FILE" | sha256sum -c - \
  || err "Checksum verification failed"

chmod +x "$FILE"

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
  sudo mv "$FILE" "$INSTALL_DIR/$BIN_NAME"
else
  mv "$FILE" "$INSTALL_DIR/$BIN_NAME"
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

echo ""
info "✅ $BIN_NAME installed successfully!"
info "Run: $BIN_NAME --help"
