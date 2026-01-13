#!/usr/bin/env bash
set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh v1.2.3"
  exit 1
fi

echo "🚀 Releasing $VERSION"

# Build frontend once
cd web/frontend
npm ci
npm run build
cd ../..

PLATFORMS=(
  "linux amd64"
  "linux arm64"
  "darwin amd64"
  "darwin arm64"
  "windows amd64"
)

mkdir -p dist

for PLATFORM in "${PLATFORMS[@]}"; do
  read OS ARCH <<< "$PLATFORM"

  OUT="dist/doclific-$OS-$ARCH"
  if [ "$OS" = "windows" ]; then
    OUT="$OUT.exe"
  fi

  echo "🔨 Building $OS/$ARCH → $OUT"

  GOOS=$OS GOARCH=$ARCH \
    go build -o "$OUT" ./cmd/doclific
done

echo "✅ Release artifacts created:"
ls -lh dist/
