#!/usr/bin/env bash
set -euo pipefail

# Pomodoro TUI Installer for macOS and Linux
APP="pomotui"
REPO="treepo1/pomodoro-tui"

# Colors
MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[38;5;214m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
INSTALL_DIR="${INSTALL_DIR:-$HOME/.pomotui/bin}"
requested_version=""
no_modify_path=false
binary_path=""

usage() {
    cat <<EOF
Pomodoro TUI Installer

Usage: install.sh [options]

Options:
    -h, --help              Display this help message
    -v, --version <version> Install a specific version (e.g., 1.0.0)
    -b, --binary <path>     Install from a local binary instead of downloading
    -d, --dir <path>        Custom install directory (default: ~/.pomotui/bin)
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, etc.)
        --system            Install to /usr/local/bin (requires sudo)

Examples:
    curl -fsSL https://raw.githubusercontent.com/${REPO}/master/install.sh | bash
    curl -fsSL https://raw.githubusercontent.com/${REPO}/master/install.sh | bash -s -- --version 1.0.0
    ./install.sh --binary /path/to/pomotui
    ./install.sh --system
EOF
}

print_message() {
    local level=$1
    local message=$2
    local color=""

    case $level in
        info) color="${NC}" ;;
        muted) color="${MUTED}" ;;
        success) color="${GREEN}" ;;
        warning) color="${YELLOW}" ;;
        error) color="${RED}" ;;
    esac

    echo -e "${color}${message}${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--version)
            if [[ -n "${2:-}" ]]; then
                requested_version="$2"
                shift 2
            else
                print_message error "Error: --version requires a version argument"
                exit 1
            fi
            ;;
        -b|--binary)
            if [[ -n "${2:-}" ]]; then
                binary_path="$2"
                shift 2
            else
                print_message error "Error: --binary requires a path argument"
                exit 1
            fi
            ;;
        -d|--dir)
            if [[ -n "${2:-}" ]]; then
                INSTALL_DIR="$2"
                shift 2
            else
                print_message error "Error: --dir requires a path argument"
                exit 1
            fi
            ;;
        --no-modify-path)
            no_modify_path=true
            shift
            ;;
        --system)
            INSTALL_DIR="/usr/local/bin"
            shift
            ;;
        *)
            print_message warning "Warning: Unknown option '$1'"
            shift
            ;;
    esac
done

# Check for required dependencies
check_dependencies() {
    local missing_deps=()

    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_message error "Error: Missing required dependencies: ${missing_deps[*]}"
        print_message info "Please install them and try again."
        exit 1
    fi
}

# Detect OS and architecture
detect_platform() {
    local raw_os
    raw_os=$(uname -s)
    os=$(echo "$raw_os" | tr '[:upper:]' '[:lower:]')

    case "$raw_os" in
        Darwin*) os="darwin" ;;
        Linux*) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*)
            print_message error "Error: For Windows, please use install.ps1"
            exit 1
            ;;
    esac

    arch=$(uname -m)
    case "$arch" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *)
            print_message error "Error: Unsupported architecture: $arch"
            exit 1
            ;;
    esac

    # Rosetta detection on macOS - prefer native ARM binary
    if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
        local rosetta_flag
        rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
        if [ "$rosetta_flag" = "1" ]; then
            print_message info "Detected Rosetta 2 emulation, using native ARM64 binary"
            arch="arm64"
        fi
    fi

    # Validate platform/arch combination
    case "$os-$arch" in
        darwin-x64|darwin-arm64|linux-x64)
            ;;
        linux-arm64)
            print_message error "Error: Linux ARM64 builds are not yet available"
            exit 1
            ;;
        *)
            print_message error "Error: Unsupported OS/Architecture: $os/$arch"
            exit 1
            ;;
    esac

    # musl detection for Linux (Alpine, etc.)
    is_musl=false
    if [ "$os" = "linux" ]; then
        if [ -f /etc/alpine-release ]; then
            is_musl=true
        elif command -v ldd >/dev/null 2>&1; then
            if ldd --version 2>&1 | grep -qi musl; then
                is_musl=true
            fi
        fi

        if [ "$is_musl" = "true" ]; then
            print_message warning "Warning: musl-based system detected (e.g., Alpine Linux)"
            print_message warning "The binary may not work correctly. Please report issues."
        fi
    fi
}

# Check if version is already installed
check_installed_version() {
    if command -v pomotui >/dev/null 2>&1; then
        local installed_version
        installed_version=$(pomotui --version 2>/dev/null || echo "unknown")

        if [[ "$installed_version" == "$specific_version" ]]; then
            print_message success "Version ${specific_version} is already installed"
            exit 0
        else
            print_message muted "Currently installed: ${NC}${installed_version}"
        fi
    fi
}

# Validate that the requested release exists
validate_release() {
    local version=$1
    local http_status
    http_status=$(curl -sI -o /dev/null -w "%{http_code}" "https://github.com/${REPO}/releases/tag/v${version}" 2>/dev/null || echo "000")

    if [ "$http_status" = "404" ]; then
        print_message error "Error: Release v${version} not found"
        print_message muted "Available releases: https://github.com/${REPO}/releases"
        exit 1
    elif [ "$http_status" = "000" ]; then
        print_message error "Error: Could not connect to GitHub"
        exit 1
    fi
}

# Progress bar for downloads
print_progress() {
    local bytes="$1"
    local length="$2"
    [ "$length" -gt 0 ] || return 0

    local width=40
    local percent=$(( bytes * 100 / length ))
    [ "$percent" -gt 100 ] && percent=100
    local on=$(( percent * width / 100 ))
    local off=$(( width - on ))

    local filled
    local empty
    filled=$(printf "%*s" "$on" "" | tr ' ' '█')
    empty=$(printf "%*s" "$off" "" | tr ' ' '░')

    printf "\r${CYAN}%s%s ${NC}%3d%%" "$filled" "$empty" "$percent" >&2
}

# Download with progress bar
download_with_progress() {
    local url="$1"
    local output="$2"

    # Check if we're in a TTY for progress display
    if [ -t 2 ]; then
        # Get content length first
        local content_length
        content_length=$(curl -sI -L "$url" | grep -i content-length | tail -1 | awk '{print $2}' | tr -d '\r')

        if [[ -n "$content_length" && "$content_length" -gt 0 ]]; then
            # Download with progress
            curl -sL "$url" -o "$output" --write-out "" 2>/dev/null &
            local curl_pid=$!
            local downloaded=0

            while kill -0 $curl_pid 2>/dev/null; do
                if [ -f "$output" ]; then
                    downloaded=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null || echo 0)
                    print_progress "$downloaded" "$content_length"
                fi
                sleep 0.1
            done

            wait $curl_pid
            local ret=$?
            print_progress "$content_length" "$content_length"
            echo "" >&2
            return $ret
        fi
    fi

    # Fallback: simple download without progress
    curl -sL "$url" -o "$output"
}

# Download and install the binary
download_and_install() {
    local asset_name="pomotui-${os}-${arch}"
    local url
    local tmp_dir

    if [ -z "$requested_version" ]; then
        # Get latest release info
        print_message muted "Fetching latest release..."
        local release_info
        release_info=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest")

        specific_version=$(echo "$release_info" | grep -o '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/^v//')

        if [[ -z "$specific_version" ]]; then
            print_message error "Error: Failed to fetch latest release information"
            exit 1
        fi

        url=$(echo "$release_info" | grep -o "\"browser_download_url\": *\"[^\"]*${asset_name}\"" | head -1 | cut -d'"' -f4)
    else
        # Strip leading 'v' if present
        specific_version="${requested_version#v}"

        # Validate the release exists
        validate_release "$specific_version"

        url="https://github.com/${REPO}/releases/download/v${specific_version}/${asset_name}"
    fi

    if [[ -z "$url" ]]; then
        print_message error "Error: Could not find download URL for ${asset_name}"
        exit 1
    fi

    # Check if already installed
    check_installed_version

    print_message info ""
    print_message info "${MUTED}Installing ${NC}pomotui ${MUTED}version: ${NC}${specific_version}"
    print_message muted "Platform: ${os}-${arch}"
    print_message muted "Install directory: ${INSTALL_DIR}"
    print_message info ""

    # Create temp directory with proper cleanup
    tmp_dir=$(mktemp -d 2>/dev/null || mktemp -d -t 'pomotui-install')
    trap 'rm -rf "$tmp_dir"' EXIT

    # Download
    print_message muted "Downloading..."
    if ! download_with_progress "$url" "$tmp_dir/$APP"; then
        print_message error "Error: Download failed"
        exit 1
    fi

    # Make executable
    chmod +x "$tmp_dir/$APP"

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    # Install
    print_message muted "Installing to ${INSTALL_DIR}/${APP}..."
    if [ -w "$INSTALL_DIR" ]; then
        mv "$tmp_dir/$APP" "$INSTALL_DIR/$APP"
    else
        print_message warning "Need sudo to install to $INSTALL_DIR"
        sudo mv "$tmp_dir/$APP" "$INSTALL_DIR/$APP"
    fi

    print_message success "Successfully installed pomotui v${specific_version}!"
}

# Install from local binary
install_from_binary() {
    if [ ! -f "$binary_path" ]; then
        print_message error "Error: Binary not found at ${binary_path}"
        exit 1
    fi

    specific_version="local"

    print_message info ""
    print_message info "${MUTED}Installing ${NC}pomotui ${MUTED}from: ${NC}${binary_path}"

    mkdir -p "$INSTALL_DIR"

    if [ -w "$INSTALL_DIR" ]; then
        cp "$binary_path" "$INSTALL_DIR/$APP"
    else
        print_message warning "Need sudo to install to $INSTALL_DIR"
        sudo cp "$binary_path" "$INSTALL_DIR/$APP"
    fi

    chmod +x "$INSTALL_DIR/$APP"
    print_message success "Successfully installed pomotui from local binary!"
}

# Add install directory to PATH
add_to_path() {
    local config_file=$1
    local command=$2

    if grep -Fq "$INSTALL_DIR" "$config_file" 2>/dev/null; then
        print_message muted "PATH already configured in $config_file"
        return
    fi

    if [[ -w "$config_file" ]]; then
        echo "" >> "$config_file"
        echo "# pomotui" >> "$config_file"
        echo "$command" >> "$config_file"
        print_message success "Added ${INSTALL_DIR} to PATH in ${config_file}"
    else
        print_message warning "Could not write to $config_file"
        print_message info "Manually add: $command"
    fi
}

configure_path() {
    if [[ "$no_modify_path" == "true" ]]; then
        return
    fi

    # Skip if already in PATH
    if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
        return
    fi

    local current_shell
    current_shell=$(basename "$SHELL")
    local config_file=""

    case $current_shell in
        fish)
            config_file="$HOME/.config/fish/config.fish"
            ;;
        zsh)
            for f in "${ZDOTDIR:-$HOME}/.zshrc" "$HOME/.zshrc"; do
                if [[ -f "$f" ]]; then
                    config_file="$f"
                    break
                fi
            done
            [[ -z "$config_file" ]] && config_file="$HOME/.zshrc"
            ;;
        bash)
            for f in "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
                if [[ -f "$f" ]]; then
                    config_file="$f"
                    break
                fi
            done
            [[ -z "$config_file" ]] && config_file="$HOME/.bashrc"
            ;;
        *)
            for f in "$HOME/.profile" "$HOME/.bashrc"; do
                if [[ -f "$f" ]]; then
                    config_file="$f"
                    break
                fi
            done
            ;;
    esac

    if [[ -n "$config_file" ]]; then
        case $current_shell in
            fish)
                add_to_path "$config_file" "fish_add_path $INSTALL_DIR"
                ;;
            *)
                add_to_path "$config_file" "export PATH=\"$INSTALL_DIR:\$PATH\""
                ;;
        esac

        print_message warning "Restart your terminal or run: source $config_file"
    else
        print_message warning "Could not detect shell config file"
        print_message info "Manually add to your shell config:"
        print_message info "  export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
}

# Install mpv dependency
install_mpv() {
    print_message info ""
    print_message muted "Checking for mpv (required for music feature)..."

    if command -v mpv >/dev/null 2>&1; then
        print_message success "mpv is already installed"
        return
    fi

    print_message warning "mpv not found. Attempting to install..."

    case "$os" in
        darwin)
            if command -v brew >/dev/null 2>&1; then
                print_message muted "Installing mpv via Homebrew..."
                brew install mpv
            else
                print_message warning "Homebrew not found. Please install mpv manually:"
                print_message info "  brew install mpv"
                print_message info "  or download from: https://mpv.io/installation/"
            fi
            ;;
        linux)
            if command -v apt-get >/dev/null 2>&1; then
                print_message muted "Installing mpv via apt..."
                sudo apt-get update && sudo apt-get install -y mpv
            elif command -v dnf >/dev/null 2>&1; then
                print_message muted "Installing mpv via dnf..."
                sudo dnf install -y mpv
            elif command -v pacman >/dev/null 2>&1; then
                print_message muted "Installing mpv via pacman..."
                sudo pacman -S --noconfirm mpv
            elif command -v zypper >/dev/null 2>&1; then
                print_message muted "Installing mpv via zypper..."
                sudo zypper install -y mpv
            elif command -v apk >/dev/null 2>&1; then
                print_message muted "Installing mpv via apk..."
                sudo apk add mpv
            else
                print_message warning "Could not detect package manager. Please install mpv manually:"
                print_message info "  https://mpv.io/installation/"
            fi
            ;;
    esac
}

# GitHub Actions support
setup_github_actions() {
    if [[ -n "${GITHUB_ACTIONS:-}" ]] && [[ "${GITHUB_ACTIONS}" == "true" ]]; then
        echo "$INSTALL_DIR" >> "$GITHUB_PATH"
        print_message muted "Added $INSTALL_DIR to \$GITHUB_PATH"
    fi
}

# Print success banner
print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}       ${GREEN}🍅 Pomodoro TUI Installed${NC}       ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${MUTED}To get started:${NC}"
    echo ""
    echo -e "  pomotui          ${MUTED}# Start the app${NC}"
    echo -e "  pomotui --help   ${MUTED}# Show help${NC}"
    echo ""
    echo -e "${MUTED}For more information: ${NC}https://github.com/${REPO}"
    echo ""
}

# Main execution
main() {
    check_dependencies

    if [ -n "$binary_path" ]; then
        install_from_binary
    else
        detect_platform
        download_and_install
    fi

    configure_path
    setup_github_actions
    install_mpv
    print_banner
}

main
