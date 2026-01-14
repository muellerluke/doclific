#!/usr/bin/env bash
set -euo pipefail

VERSION="$1"
if [ -z "${VERSION:-}" ]; then
  echo "Usage: ./scripts/release.sh v1.2.3"
  exit 1
fi

APP_NAME="doclific"
DIST_DIR="dist"

echo "🚀 Releasing $APP_NAME $VERSION"

# ----------------------------
# Build frontend (once)
# ----------------------------
echo "🌐 Building frontend"
cd web/frontend
npm ci
npm run build
cd ../..

# ----------------------------
# Build binaries
# ----------------------------
PLATFORMS=(
  "linux amd64"
  "linux arm64"
  "darwin amd64"
  "darwin arm64"
  "windows amd64"
)

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

for PLATFORM in "${PLATFORMS[@]}"; do
  read OS ARCH <<< "$PLATFORM"

  BIN_NAME="$APP_NAME"
  EXT=""

  if [ "$OS" = "windows" ]; then
    EXT=".exe"
  fi

  BUILD_DIR="$DIST_DIR/$APP_NAME-$VERSION-$OS-$ARCH"
  mkdir -p "$BUILD_DIR"

  echo "🔨 Building $OS/$ARCH"

  GOOS=$OS GOARCH=$ARCH \
    go build -o "$BUILD_DIR/$BIN_NAME$EXT" ./cmd/doclific

  # Copy frontend build files
  echo "📦 Copying frontend build files..."
  cp -r web/build "$BUILD_DIR/build"

  # ----------------------------
  # Archive
  # ----------------------------
  ARCHIVE_NAME="$APP_NAME-$VERSION-$OS-$ARCH"

  if [ "$OS" = "windows" ]; then
    (cd "$DIST_DIR" && zip -r "$ARCHIVE_NAME.zip" "$(basename "$BUILD_DIR")")
  else
    (cd "$DIST_DIR" && tar -czf "$ARCHIVE_NAME.tar.gz" "$(basename "$BUILD_DIR")")
  fi

  rm -rf "$BUILD_DIR"
done

# ----------------------------
# Generate checksums
# ----------------------------
echo "🔐 Generating checksums"
cd "$DIST_DIR"
shasum -a 256 * > checksums.txt
cd ..

echo "✅ Release artifacts:"
ls -lh "$DIST_DIR"
