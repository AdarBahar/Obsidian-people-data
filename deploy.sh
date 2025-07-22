#!/bin/bash

# Obsidian People Metadata Plugin - Deployment Script
# This script builds the plugin and deploys it to the specified Obsidian vault

set -e  # Exit on any error

# Configuration
PLUGIN_NAME="people-metadata"
OBSIDIAN_VAULT_PATH="/Users/adar.bahar/Documents/Obsidian/Redis"
PLUGIN_DIR="$OBSIDIAN_VAULT_PATH/.obsidian/plugins/$PLUGIN_NAME"
PROJECT_DIR="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validation checks
print_status "Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "manifest.json" ] || [ ! -f "package.json" ]; then
    print_error "This doesn't appear to be the plugin root directory."
    print_error "Please run this script from the directory containing manifest.json and package.json"
    exit 1
fi

# Check if npm is available
if ! command_exists npm; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Check if the Obsidian vault exists
if [ ! -d "$OBSIDIAN_VAULT_PATH" ]; then
    print_error "Obsidian vault not found at: $OBSIDIAN_VAULT_PATH"
    print_error "Please update the OBSIDIAN_VAULT_PATH variable in this script"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

print_status "Building the plugin..."

# Clean previous build
if [ -f "main.js" ]; then
    rm main.js
    print_status "Removed previous build file"
fi

# Build the plugin
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Verify build output
if [ ! -f "main.js" ]; then
    print_error "Build did not produce main.js file"
    exit 1
fi

# Create plugin directory if it doesn't exist
print_status "Preparing deployment directory..."
mkdir -p "$PLUGIN_DIR"

# Copy required files
print_status "Copying plugin files..."

# Copy main.js (built file)
if cp "main.js" "$PLUGIN_DIR/"; then
    print_success "Copied main.js"
else
    print_error "Failed to copy main.js"
    exit 1
fi

# Copy manifest.json
if cp "manifest.json" "$PLUGIN_DIR/"; then
    print_success "Copied manifest.json"
else
    print_error "Failed to copy manifest.json"
    exit 1
fi

# Copy styles.css
if cp "styles.css" "$PLUGIN_DIR/"; then
    print_success "Copied styles.css"
else
    print_error "Failed to copy styles.css"
    exit 1
fi

# Verify deployment
print_status "Verifying deployment..."

REQUIRED_FILES=("main.js" "manifest.json" "styles.css")
ALL_FILES_PRESENT=true

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PLUGIN_DIR/$file" ]; then
        print_success "✓ $file is present"
    else
        print_error "✗ $file is missing"
        ALL_FILES_PRESENT=false
    fi
done

if [ "$ALL_FILES_PRESENT" = true ]; then
    print_success "All required files deployed successfully!"
else
    print_error "Some files are missing from the deployment"
    exit 1
fi

# Display deployment summary
echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT SUMMARY${NC}"
echo "=========================================="
echo "Plugin Name: $PLUGIN_NAME"
echo "Deployed to: $PLUGIN_DIR"
echo "Files deployed:"
echo "  - main.js ($(stat -f%z "$PLUGIN_DIR/main.js" 2>/dev/null || stat -c%s "$PLUGIN_DIR/main.js" 2>/dev/null || echo "unknown") bytes)"
echo "  - manifest.json"
echo "  - styles.css"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open Obsidian"
echo "2. Go to Settings → Community Plugins"
echo "3. Find 'People Metadata' and enable it"
echo "4. Test the new multi-company tab feature!"
echo ""
echo -e "${BLUE}Plugin location:${NC} $PLUGIN_DIR"
echo "=========================================="

print_success "Deployment completed successfully! 🚀"
