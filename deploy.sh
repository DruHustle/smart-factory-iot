#!/bin/bash
# Smart Factory IoT Dashboard - Real-time Industrial Monitoring Platform
# Deployment Script
# This script automates the deployment to GitHub Pages

echo "🚀 Starting deployment for Smart Factory IoT..."

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

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the project
echo "🏗️ Building project..."
pnpm build

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

# Copy dist contents to gh-pages branch
git checkout gh-pages
rm -rf !(dist|.git)
cp -r dist/* .
rm -rf dist
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages --force

# Switch back to main branch
git checkout main 2>/dev/null || git checkout master

echo "✨ Deployment complete!"
REPO_URL=$(git remote get-url origin | sed -E 's/.*github.com[:\/]([^\/]+)\/([^\.]+).*/\1\/\2/')
echo "🌐 Your website should be live at: https://$(echo $REPO_URL | cut -d'/' -f1).github.io/$(echo $REPO_URL | cut -d'/' -f2)"
echo ""
echo "📝 Note: Make sure GitHub Pages is enabled in your repository settings:"
echo "   Settings > Pages > Source: Deploy from a branch > Branch: gh-pages"
