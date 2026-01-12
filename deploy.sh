#!/bin/bash

# Smart Factory IoT - Master Deployment Script (Demo accounts use localStorage)
# Functionality: Build + Test + AUTOMATIC GitHub Pages Deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==========================================
# HELPER FUNCTIONS
# ==========================================

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ==========================================
# CORE CHECKS & SETUP
# ==========================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js $(node --version)"
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed"
        exit 1
    fi
    print_success "pnpm $(pnpm --version)"
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    print_success "git $(git --version | awk '{print $3}')"
}

validate_environment() {
    print_header "Validating Environment Variables"
    
    if [ -z "$NODE_ENV" ]; then
        print_info "NODE_ENV not set, defaulting to 'production'"
        export NODE_ENV="production"
    fi
    print_success "NODE_ENV=$NODE_ENV"
    
    # Note: DATABASE_URL and JWT_SECRET checks removed as they are not needed for localStorage demo
}

install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm packages..."
        pnpm install --frozen-lockfile || pnpm install
        print_success "Dependencies installed"
    else
        print_info "Updating dependencies..."
        pnpm install --frozen-lockfile || pnpm install
        print_success "Dependencies updated"
    fi
}

run_type_check() {
    print_header "Running TypeScript Type Check"
    # Check if 'check' script exists in package.json before running
    if grep -q "\"check\":" package.json; then
        pnpm check
        print_success "TypeScript check passed"
    else
        print_warning "No 'check' script found in package.json, skipping type check."
    fi
}

run_tests() {
    print_header "Running Test Suite"
    
    # Only run if test script exists
    if grep -q "\"test\":" package.json; then
        if pnpm test 2>&1 | tee test-output.log; then
            print_success "All tests passed"
        else
            print_warning "Some tests failed - review output above"
            read -p "Continue with deployment? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
         print_warning "No 'test' script found, skipping."
    fi
}

# ==========================================
# BUILD PROCESS
# ==========================================

build_application() {
    print_header "Building Application"
    
    print_info "Building for production..."
    pnpm build
    print_success "Build completed successfully"
    
    # Check build artifacts (Adjusted for Vite/React defaults)
    if [ -d "dist" ]; then
        print_success "Build artifacts found in 'dist'"
    elif [ -d "build" ]; then
        print_success "Build artifacts found in 'build'"
    else
        print_error "Build failed - neither 'dist' nor 'build' directory created"
        exit 1
    fi
}

# ==========================================
# GITHUB PAGES DEPLOYMENT
# ==========================================

deploy_to_gh_pages() {
    print_header "Deploying to GitHub Pages"

    # Determine build directory
    BUILD_DIR="dist"
    if [ -d "build" ]; then BUILD_DIR="build"; fi

    # Check git config
    if [ -z "$(git config user.name)" ]; then
        print_warning "Git user not configured. Setting defaults for deployment..."
        git config user.name "Auto Deploy"
        git config user.email "deploy@local"
    fi

    # Ensure on main
    git checkout main 2>/dev/null || git checkout master
    print_info "Verified on main branch"

    # Create temp dir
    TEMP_DIR=$(mktemp -d)
    print_info "Created temporary directory: $TEMP_DIR"

    # Copy assets
    cp -r $BUILD_DIR/* "$TEMP_DIR/"
    print_success "Copied built assets from $BUILD_DIR"

    # Switch to orphan branch
    git checkout --orphan gh-pages-new
    print_info "Created new orphan branch"

    # Clear directory
    git rm -rf . > /dev/null 2>&1 || true
    print_info "Cleaned working directory"

    # Bring back assets
    cp -r "$TEMP_DIR"/* .
    print_success "Added built assets to branch"

    # Create .gitignore specific for gh-pages
    cat > .gitignore << 'GITIGNORE'
node_modules/
.DS_Store
Thumbs.db
*.env
GITIGNORE
    print_success "Added .gitignore"

    # Commit and Push
    git add -A
    git commit -m "Deploy: GitHub Pages with latest build ($(date '+%Y-%m-%d %H:%M:%S'))"
    print_success "Committed changes"

    print_info "Pushing to origin gh-pages (Force)..."
    git push origin gh-pages-new:gh-pages --force
    print_success "Pushed to gh-pages branch"

    # Cleanup
    rm -rf "$TEMP_DIR"
    git checkout main 2>/dev/null || git checkout master
    git branch -D gh-pages-new
    print_success "Cleanup complete"
    
    echo ""
    REPO_URL=$(git remote get-url origin | sed -E 's/.*github.com[:\/]([^\/]+)\/([^\.]+).*/\1\/\2/')
    echo "=== GitHub Pages Deployment Successful ==="
    echo "URL: https://$(echo $REPO_URL | cut -d'/' -f1).github.io/$(echo $REPO_URL | cut -d'/' -f2)"
}

# ==========================================
# MAIN EXECUTION
# ==========================================

main() {
    print_header "Smart Factory IoT - Deployment Manager"
    
    # Defaults
    SKIP_TESTS=false
    SKIP_BUILD=false
    
    # Default is TRUE. Use --skip-pages to disable.
    DO_PAGES_DEPLOY=true 
    
    # Parse Arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-pages)
                DO_PAGES_DEPLOY=false
                shift
                ;;
            --help)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-pages      Skip deploying to GitHub Pages"
                echo "  --skip-tests      Skip running the test suite"
                echo "  --skip-build      Skip building the application"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # 1. Prereqs
    check_prerequisites
    
    # 2. Validation & Install
    validate_environment
    install_dependencies
    
    # 3. Tests
    if [ "$SKIP_TESTS" = false ]; then
        run_type_check
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    # 4. Build
    if [ "$SKIP_BUILD" = false ]; then
        build_application
    else
        print_warning "Skipping build"
    fi
    
    # 5. Automatic GitHub Pages Deployment
    if [ "$DO_PAGES_DEPLOY" = true ]; then
        deploy_to_gh_pages
    fi

    echo ""
    print_success "Deployment Script Finished"
    echo "Storage Mode: localStorage (Data will persist on this device only)"
}

# Run main function
main "$@"