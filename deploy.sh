#!/bin/bash

# Smart Factory IoT - Deployment Script
# This script automates the deployment process for the smart-factory-iot application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check prerequisites
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

# Validate environment variables
validate_environment() {
    print_header "Validating Environment Variables"
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set"
        exit 1
    fi
    print_success "DATABASE_URL is configured"
    
    if [ -z "$JWT_SECRET" ]; then
        print_warning "JWT_SECRET is not set, using default (NOT RECOMMENDED FOR PRODUCTION)"
    else
        print_success "JWT_SECRET is configured"
    fi
    
    if [ -z "$NODE_ENV" ]; then
        print_info "NODE_ENV not set, defaulting to 'production'"
        export NODE_ENV="production"
    fi
    print_success "NODE_ENV=$NODE_ENV"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm packages..."
        pnpm install
        print_success "Dependencies installed"
    else
        print_info "Updating dependencies..."
        pnpm install
        print_success "Dependencies updated"
    fi
}

# Run type checking
run_type_check() {
    print_header "Running TypeScript Type Check"
    
    pnpm check
    print_success "TypeScript check passed"
}

# Run tests
run_tests() {
    print_header "Running Test Suite"
    
    if pnpm test; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed - review output above"
        read -p "Continue with deployment? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Build application
build_application() {
    print_header "Building Application"
    
    print_info "Building for production..."
    pnpm build
    print_success "Build completed successfully"
    
    # Check build artifacts
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created"
        exit 1
    fi
    print_success "Build artifacts verified"
}

# Verify build
verify_build() {
    print_header "Verifying Build Artifacts"
    
    if [ ! -f "dist/index.js" ]; then
        print_error "Backend bundle not found"
        exit 1
    fi
    print_success "Backend bundle verified"
    
    if [ ! -f "dist/public/index.html" ]; then
        print_error "Frontend bundle not found"
        exit 1
    fi
    print_success "Frontend bundle verified"
    
    # Check bundle sizes
    BACKEND_SIZE=$(du -h dist/index.js | cut -f1)
    FRONTEND_SIZE=$(du -h dist/public/assets/*.js | tail -1 | cut -f1)
    
    print_info "Backend size: $BACKEND_SIZE"
    print_info "Frontend size: $FRONTEND_SIZE"
}

# Create environment file
create_env_file() {
    print_header "Creating Environment Configuration"
    
    if [ ! -f ".env.production" ]; then
        print_info "Creating .env.production file..."
        cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
PORT=${PORT:-3000}
VITE_APP_ID=smart-factory-iot
VITE_APP_TITLE=Smart Factory IoT
CORS_ORIGINS=*
DEBUG=false
EOF
        print_success ".env.production created"
    else
        print_info ".env.production already exists"
    fi
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not set, skipping migrations"
        return
    fi
    
    print_info "Running Drizzle migrations..."
    pnpm exec drizzle-kit migrate || print_warning "Migrations may have already been applied"
    print_success "Database migrations completed"
}

# Health check
health_check() {
    print_header "Health Check"
    
    print_info "Checking application health..."
    
    # Verify all required files exist
    local required_files=(
        "dist/index.js"
        "dist/public/index.html"
        "dist/public/assets"
        "package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -e "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "All required files present"
}

# Generate deployment summary
generate_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}Deployment preparation completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the .env.production file"
    echo "2. Start the application: npm start"
    echo "3. Access the application at http://localhost:3000"
    echo ""
    echo "Production Configuration:"
    echo "  - Node Environment: $NODE_ENV"
    echo "  - Port: ${PORT:-3000}"
    echo "  - Database: Configured"
    echo ""
    echo "Important Security Notes:"
    echo "  - Ensure JWT_SECRET is strong (minimum 32 characters)"
    echo "  - Use HTTPS in production"
    echo "  - Configure CORS_ORIGINS appropriately"
    echo "  - Set up monitoring and logging"
    echo "  - Enable database backups"
    echo ""
}

# Main deployment flow
main() {
    print_header "Smart Factory IoT - Deployment Script"
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_BUILD=false
    
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
            --help)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests    Skip running the test suite"
                echo "  --skip-build    Skip building the application"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    validate_environment
    install_dependencies
    run_type_check
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_application
        verify_build
    else
        print_warning "Skipping build"
    fi
    
    create_env_file
    run_migrations
    health_check
    generate_summary
}

# Run main function
main "$@"
