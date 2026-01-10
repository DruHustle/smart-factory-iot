#!/bin/bash

# Smart Factory IoT - Development Setup Script
# This script sets up the development environment, starts the database, and runs the dev server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js $(node --version)"
    
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed"
        exit 1
    fi
    print_success "pnpm $(pnpm --version)"
    
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client is not installed"
        exit 1
    fi
    print_success "MySQL client installed"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    if [ -f "./setup-dev-db.sh" ]; then
        print_info "Running database setup script..."
        chmod +x ./setup-dev-db.sh
        ./setup-dev-db.sh
        print_success "Database setup completed"
    else
        print_error "setup-dev-db.sh not found"
        exit 1
    fi
}

# Seed demo accounts
seed_demo_accounts() {
    print_header "Seeding Demo Accounts"
    
    if [ -f "./seed-demo-accounts.mjs" ]; then
        print_info "Seeding demo accounts..."
        node ./seed-demo-accounts.mjs
        print_success "Demo accounts seeded"
    else
        print_warning "seed-demo-accounts.mjs not found, skipping demo account seeding"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm packages..."
        pnpm install
        print_success "Dependencies installed"
    else
        print_info "Dependencies already installed"
    fi
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.dev" ]; then
            print_info "Creating .env from .env.dev..."
            cp .env.dev .env
            print_success ".env created"
        else
            print_warning ".env.dev not found, creating default .env..."
            cat > .env << EOF
NODE_ENV=development
DATABASE_URL=mysql://root@localhost:3306/smart_factory_dev
JWT_SECRET=dev-secret-key-change-in-production
PORT=3000
DEBUG=true
VITE_APP_ID=smart-factory-iot
VITE_APP_TITLE=Smart Factory IoT
CORS_ORIGINS=*
EOF
            print_success ".env created with defaults"
        fi
    else
        print_info ".env already exists"
    fi
}

# Start development server
start_dev_server() {
    print_header "Starting Development Server"
    
    echo ""
    echo -e "${GREEN}Development environment is ready!${NC}"
    echo ""
    echo "Starting development server..."
    echo ""
    echo "Demo Accounts:"
    echo "  - Admin: admin@demo.local / demo-admin-password"
    echo "  - Operator: operator@demo.local / demo-operator-password"
    echo "  - Technician: technician@demo.local / demo-technician-password"
    echo "  - Demo: demo@demo.local / demo-password"
    echo ""
    echo "Access the application at: http://localhost:3000"
    echo ""
    
    pnpm dev
}

# Main function
main() {
    print_header "Smart Factory IoT - Development Setup"
    
    check_prerequisites
    setup_database
    seed_demo_accounts
    install_dependencies
    setup_environment
    start_dev_server
}

# Run main function
main "$@"
