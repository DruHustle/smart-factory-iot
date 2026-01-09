#!/bin/bash
# Smart Factory IoT Dashboard - Real-time Industrial Monitoring Platform
# Deployment Script with Rollback Mechanism
# This script automates the deployment to GitHub Pages with automatic rollback on failure

set -e  # Exit on any error

echo "🚀 Starting deployment for Smart Factory IoT..."

# Store the current gh-pages commit for potential rollback
PREVIOUS_COMMIT=$(git rev-parse origin/gh-pages 2>/dev/null || echo "")

# Rollback function
rollback() {
    echo ""
    echo "⚠️  Deployment failed. Initiating rollback..."
    
    if [ -z "$PREVIOUS_COMMIT" ]; then
        echo "❌ No previous version available for rollback."
        exit 1
    fi
    
    echo "📦 Rolling back to previous version: $PREVIOUS_COMMIT"
    git checkout gh-pages
    git reset --hard "$PREVIOUS_COMMIT"
    git push origin gh-pages --force
    
    git checkout main 2>/dev/null || git checkout master
    
    echo "✅ Rollback complete! Website reverted to previous working version."
    exit 1
}

# Set trap to call rollback on error
trap rollback ERR

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install Node.js and pnpm."
    exit 1
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Smart Factory IoT Platform"
fi

# Ask for GitHub username if not already configured in remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
    echo "🔗 Configuring GitHub repository..."
    read -p "Enter your GitHub username: " USERNAME
    read -p "Enter your repository name (default: smart-factory-iot): " REPO_NAME
    REPO_NAME=${REPO_NAME:-smart-factory-iot}
    git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
    echo "✅ Remote origin added: https://github.com/$USERNAME/$REPO_NAME.git"
else
    echo "✅ Remote origin already configured: $REMOTE_URL"
fi

# Fetch latest changes
echo "📡 Fetching latest changes..."
git fetch origin

# Store the current gh-pages commit for potential rollback
PREVIOUS_COMMIT=$(git rev-parse origin/gh-pages 2>/dev/null || echo "")

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Run tests
echo "🧪 Running tests..."
if pnpm test 2>/dev/null; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

# Build the project
echo "🏗️ Building project..."
pnpm build

# Verify build output exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist directory not found."
    exit 1
fi

# Check if gh-pages branch exists, if not create it
if ! git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "📝 Creating gh-pages branch..."
    git checkout --orphan gh-pages
    git reset --hard
    git commit --allow-empty -m "Initial gh-pages commit"
    git checkout main 2>/dev/null || git checkout master
fi

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
echo "NOTE: You may be asked for your GitHub credentials."

# Create a temporary directory for the deployment
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy dist contents to temporary directory
cp -r dist/* "$TEMP_DIR/"

# Switch to gh-pages branch
git checkout gh-pages

# Backup current gh-pages state
BACKUP_COMMIT=$(git rev-parse HEAD)

# Clear old content and copy new content
find . -maxdepth 1 -type f -not -name '.gitignore' -delete
find . -maxdepth 1 -type d -not -name '.git' -not -name '.' -exec rm -rf {} + 2>/dev/null || true
cp -r "$TEMP_DIR"/* .
cp -r "$TEMP_DIR"/.* . 2>/dev/null || true

# Verify new content was copied
if [ ! -f "index.html" ]; then
    echo "❌ Deployment failed: index.html not found in build output."
    exit 1
fi

# Commit and push
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "ℹ️  No changes to commit"

# Push with error handling
if ! git push origin gh-pages --force; then
    echo "❌ Failed to push to gh-pages branch."
    exit 1
fi

# Switch back to main branch
git checkout main 2>/dev/null || git checkout master

echo ""
echo "✨ Deployment complete!"
REPO_URL=$(git remote get-url origin | sed -E 's/.*github.com[:\/]([^\/]+)\/([^\.]+).*/\1\/\2/')
echo "🌐 Your website should be live at: https://$(echo $REPO_URL | cut -d'/' -f1).github.io/$(echo $REPO_URL | cut -d'/' -f2)"
echo ""
echo "📝 Note: Make sure GitHub Pages is enabled in your repository settings:"
echo "   Settings > Pages > Source: Deploy from a branch > Branch: gh-pages"
echo ""
echo "🔄 Rollback Information:"
echo "   Previous version: $PREVIOUS_COMMIT"
echo "   Current version: $(git rev-parse origin/gh-pages)"
