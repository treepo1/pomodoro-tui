#!/bin/bash
set -e

# Pomodoro TUI Installer for macOS and Linux

REPO="treepo1/pomodoro-tui"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="pomotui"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map architecture names
case "$ARCH" in
    x86_64|amd64)
        ARCH="x64"
        ;;
    arm64|aarch64)
        ARCH="arm64"
        ;;
    *)
        echo "Error: Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Map OS names
case "$OS" in
    darwin)
        PLATFORM="darwin"
        ;;
    linux)
        PLATFORM="linux"
        # Linux only has x64 builds
        if [ "$ARCH" != "x64" ]; then
            echo "Error: Linux builds are only available for x64 architecture"
            exit 1
        fi
        ;;
    *)
        echo "Error: Unsupported operating system: $OS"
        echo "For Windows, please use install.ps1"
        exit 1
        ;;
esac

ASSET_NAME="pomotui-${PLATFORM}-${ARCH}"

echo "Pomodoro TUI Installer"
echo "======================"
echo "OS: $PLATFORM"
echo "Architecture: $ARCH"
echo "Install directory: $INSTALL_DIR"
echo ""

# Get latest release URL
echo "Fetching latest release..."
LATEST_RELEASE=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest")
DOWNLOAD_URL=$(echo "$LATEST_RELEASE" | grep -o "https://github.com/${REPO}/releases/download/[^\"]*/${ASSET_NAME}" | head -1)
VERSION=$(echo "$LATEST_RELEASE" | grep -o '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not find download URL for $ASSET_NAME"
    echo "Available assets:"
    echo "$LATEST_RELEASE" | grep -o '"name": *"pomotui[^"]*"' | cut -d'"' -f4
    exit 1
fi

echo "Latest version: $VERSION"
echo "Downloading from: $DOWNLOAD_URL"
echo ""

# Create temp directory
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Download binary
curl -sL "$DOWNLOAD_URL" -o "$TMP_DIR/$BINARY_NAME"

# Make executable
chmod +x "$TMP_DIR/$BINARY_NAME"

# Install
echo "Installing to $INSTALL_DIR/$BINARY_NAME..."
if [ -w "$INSTALL_DIR" ]; then
    mv "$TMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
else
    echo "Need sudo to install to $INSTALL_DIR"
    sudo mv "$TMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
fi

echo ""
echo "Successfully installed pomotui $VERSION!"
echo ""

# Install mpv for music/radio feature
echo "Checking for mpv (required for music feature)..."
if command -v mpv &> /dev/null; then
    echo "mpv is already installed."
else
    echo "mpv not found. Attempting to install..."
    case "$PLATFORM" in
        darwin)
            if command -v brew &> /dev/null; then
                echo "Installing mpv via Homebrew..."
                brew install mpv
            else
                echo "Warning: Homebrew not found. Please install mpv manually:"
                echo "  brew install mpv"
                echo "  or download from: https://mpv.io/installation/"
            fi
            ;;
        linux)
            if command -v apt-get &> /dev/null; then
                echo "Installing mpv via apt..."
                sudo apt-get update && sudo apt-get install -y mpv
            elif command -v dnf &> /dev/null; then
                echo "Installing mpv via dnf..."
                sudo dnf install -y mpv
            elif command -v pacman &> /dev/null; then
                echo "Installing mpv via pacman..."
                sudo pacman -S --noconfirm mpv
            elif command -v zypper &> /dev/null; then
                echo "Installing mpv via zypper..."
                sudo zypper install -y mpv
            else
                echo "Warning: Could not detect package manager. Please install mpv manually:"
                echo "  https://mpv.io/installation/"
            fi
            ;;
    esac
fi

echo ""
echo "Run 'pomotui --help' to get started."
