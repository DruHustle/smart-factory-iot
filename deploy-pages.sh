#!/bin/bash
set -e

echo "=== Smart Factory IoT - GitHub Pages Deployment ==="
echo ""

# Check if git is configured
if [ -z "$(git config user.name)" ]; then
    git config user.name "DruHustle"
    git config user.email "druhustle@example.com"
    echo "✓ Git configured as DruHustle"
fi

# Ensure we're on main branch
git checkout main
echo "✓ On main branch"

# Build the project
echo "Building project..."
pnpm build
echo "✓ Build complete"

# Verify build output exists
if [ ! -d "dist/public" ]; then
    echo "✗ Build output not found at dist/public"
    exit 1
fi

# Create a temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "✓ Created temporary directory: $TEMP_DIR"

# Copy only the built assets
cp -r dist/public/* "$TEMP_DIR/"
echo "✓ Copied built assets"

# Create a new orphan branch for gh-pages
git checkout --orphan gh-pages-new
echo "✓ Created new orphan branch"

# Remove all files
git rm -rf . > /dev/null 2>&1 || true
echo "✓ Cleaned working directory"

# Copy the built assets
cp -r "$TEMP_DIR"/* .
echo "✓ Added built assets"

# Create .gitignore for gh-pages
cat > .gitignore << 'GITIGNORE'
node_modules/
.DS_Store
Thumbs.db
*.env
GITIGNORE
echo "✓ Added .gitignore"

# Commit
git add -A
git commit -m "Deploy: GitHub Pages with latest build ($(date '+%Y-%m-%d %H:%M:%S'))"
echo "✓ Committed changes"

# Push to gh-pages using git config
git push origin gh-pages-new:gh-pages --force
echo "✓ Pushed to gh-pages branch"

# Clean up
rm -rf "$TEMP_DIR"
git checkout main
git branch -D gh-pages-new
echo "✓ Cleanup complete"

echo ""
echo "=== Deployment Successful ==="
echo "GitHub Pages URL: https://druhustle.github.io/smart-factory-iot/"
echo "Note: Changes may take a few minutes to appear on GitHub Pages"
