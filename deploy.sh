#!/bin/bash
# Smart Factory IoT - Master Deployment Script (Demo accounts use localStorage)
# Functionality: Build + Test + AUTOMATIC GitHub Pages Deployment with Rollback

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

# Store the current gh-pages commit for potential rollback
PREVIOUS_COMMIT=$(git rev-parse origin/gh-pages 2>/dev/null || echo "")

rollback() {
    echo ""
    print_error "Deployment failed. Initiating rollback..."
    
    if [ -z "$PREVIOUS_COMMIT" ]; then
        print_error "No previous version available for rollback."
        exit 1
    fi
    
    print_info "Reverting gh-pages to: $PREVIOUS_COMMIT"
    git checkout gh-pages
    git reset --hard "$PREVIOUS_COMMIT"
    git push origin gh-pages --force
    
    git checkout main 2>/dev/null || git checkout master
    print_success "Rollback complete! Website reverted."
    exit 1
}

# Set trap to call rollback on error
trap rollback ERR

# ==========================================
# CORE CHECKS & SETUP
# ==========================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    for cmd in node pnpm git; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is not installed"
            exit 1
        fi
    done
    print_success "All tools (Node, pnpm, Git) are available"
}

validate_environment() {
    print_header "Validating Environment Variables"
    export NODE_ENV=${NODE_ENV:-production}
    print_success "NODE_ENV=$NODE_ENV"
}

install_dependencies() {
    print_header "Installing Dependencies"
    pnpm install --frozen-lockfile || pnpm install
    print_success "Dependencies ready"
}

run_type_check() {
    print_header "Running TypeScript Type Check"
    if grep -q "\"check\":" package.json; then
        pnpm check
        print_success "TypeScript check passed"
    else
        print_warning "No 'check' script found, skipping."
    fi
}

run_tests() {
    print_header "Running Test Suite"
    if grep -q "\"test\":" package.json; then
        # Removed 2>/dev/null to ensure error visibility
        if pnpm test --reporter=default; then
            print_success "All tests passed"
        else
            print_error "Tests failed. Aborting deployment for safety."
            exit 1
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
    pnpm build
    
    # Check build artifacts
    if [ -d "dist" ]; then
        export BUILD_DIR="dist"
    elif [ -d "build" ]; then
        export BUILD_DIR="build"
    else
        print_error "Build failed - no output directory found"
        exit 1
    fi
    print_success "Build completed in '$BUILD_DIR'"
}

# ==========================================
# GITHUB PAGES DEPLOYMENT
# ==========================================

deploy_to_gh_pages() {
    print_header "Deploying to GitHub Pages"

    # Ensure on main/master
    git checkout main 2>/dev/null || git checkout master

    # Create temp dir for artifacts
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    cp -r $BUILD_DIR/* "$TEMP_DIR/"

    # Ensure gh-pages branch exists locally
    if ! git show-ref --verify --quiet refs/heads/gh-pages; then
        print_info "Initializing gh-pages branch..."
        git checkout --orphan gh-pages
        git rm -rf .
        git commit --allow-empty -m "Initial gh-pages commit"
        git checkout main 2>/dev/null || git checkout master
    fi

    # Switch to gh-pages and update
    git checkout gh-pages
    print_info "Cleaning gh-pages branch..."
    find . -maxdepth 1 -not -name '.git' -not -name '.' -exec rm -rf {} +

    cp -r "$TEMP_DIR"/* .
    
    # Create .gitignore using robust printf
    printf "node_modules/\n.DS_Store\nThumbs.db\n*.env\n" > .gitignore
    print_success ".gitignore created"

    # Commit and Push
    git add .
    git commit -m "Deploy: Smart Factory IoT Build ($(date '+%Y-%m-%d %H:%M:%S'))" || print_info "No changes to deploy"

    print_info "Pushing to origin gh-pages..."
    git push origin gh-pages --force
    
    # Return to main
    git checkout main 2>/dev/null || git checkout master
    
    echo ""
    REPO_URL=$(git remote get-url origin | sed -E 's/.*github.com[:\/]([^\/]+)\/([^\.]+).*/\1\/\2/')
    print_success "GitHub Pages Deployment Successful"
    echo "URL: https://$(echo $REPO_URL | cut -d'/' -f1).github.io/$(echo $REPO_URL | cut -d'/' -f2)"
}

# ==========================================
# MAIN EXECUTION
# ==========================================

main() {
    print_header "Smart Factory IoT - Deployment Manager"
    
    SKIP_TESTS=false
    SKIP_BUILD=false
    DO_PAGES_DEPLOY=true 
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests) SKIP_TESTS=true; shift ;;
            --skip-build) SKIP_BUILD=true; shift ;;
            --skip-pages) DO_PAGES_DEPLOY=false; shift ;;
            --help)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo "  --skip-pages      Skip GH Pages deployment"
                echo "  --skip-tests      Skip testing"
                echo "  --skip-build      Skip building"
                exit 0
                ;;
            *) print_error "Unknown option: $1"; exit 1 ;;
        esac
    done
    
    check_prerequisites
    validate_environment
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_type_check
        run_tests
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_application
    fi
    
    if [ "$DO_PAGES_DEPLOY" = true ]; then
        deploy_to_gh_pages
    fi

    print_success "Deployment Script Finished Successfully"
    echo "Storage Mode: localStorage"
}

main "$@"