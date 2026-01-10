#!/bin/bash

# Smart Factory IoT - Test Database Setup Script
# This script sets up a mock MySQL database for testing

set -e

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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if MySQL is installed
check_mysql() {
    print_header "Checking MySQL Installation"
    
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL is not installed"
        print_info "Install MySQL with: sudo apt-get install mysql-server"
        exit 1
    fi
    print_success "MySQL is installed"
}

# Check if MySQL service is running
check_mysql_service() {
    print_header "Checking MySQL Service"
    
    if ! pgrep -x "mysqld" > /dev/null; then
        print_info "Starting MySQL service..."
        sudo service mysql start || sudo systemctl start mysql
        sleep 2
    fi
    print_success "MySQL service is running"
}

# Create test database
create_test_database() {
    print_header "Creating Test Database"
    
    # Use environment variables or defaults
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    print_info "Database Host: $DB_HOST"
    print_info "Database User: $DB_USER"
    print_info "Database Name: $DB_NAME"
    
    # Create database
    if [ -z "$DB_PASSWORD" ]; then
        mysql -h "$DB_HOST" -u "$DB_USER" << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE $DB_NAME;
EOF
    else
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE $DB_NAME;
EOF
    fi
    
    print_success "Test database created: $DB_NAME"
}

# Create database tables
create_tables() {
    print_header "Creating Database Tables"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    # Create tables SQL
    TABLES_SQL=$(cat << 'EOF'
USE smart_factory_test;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    openId VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    loginMethod VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    deviceId VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    type ENUM('sensor', 'actuator', 'controller', 'gateway') DEFAULT 'sensor',
    status ENUM('online', 'offline', 'maintenance', 'error') DEFAULT 'offline',
    location VARCHAR(255),
    zone VARCHAR(255),
    firmwareVersion VARCHAR(50),
    metadata JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    deviceId VARCHAR(255),
    temperature FLOAT,
    humidity FLOAT,
    vibration FLOAT,
    power FLOAT,
    pressure FLOAT,
    rpm FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId)
);

-- Alert thresholds table
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    deviceId VARCHAR(255),
    metric VARCHAR(255),
    minValue FLOAT,
    maxValue FLOAT,
    warningMin FLOAT,
    warningMax FLOAT,
    enabled BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    deviceId VARCHAR(255),
    type VARCHAR(255),
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
    status VARCHAR(50) DEFAULT 'open',
    message TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvedAt TIMESTAMP,
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId)
);

-- Firmware versions table
CREATE TABLE IF NOT EXISTS firmware_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version VARCHAR(50) UNIQUE NOT NULL,
    deviceType VARCHAR(50),
    releaseNotes TEXT,
    fileUrl VARCHAR(255),
    checksum VARCHAR(255),
    isStable BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTA deployments table
CREATE TABLE IF NOT EXISTS ota_deployments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    deviceId VARCHAR(255),
    firmwareVersionId INT,
    status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    progress INT DEFAULT 0,
    errorMessage TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP,
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId),
    FOREIGN KEY (firmwareVersionId) REFERENCES firmware_versions(id)
);

-- Create indexes
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_readings_deviceId ON sensor_readings(deviceId);
CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_alerts_deviceId ON alerts(deviceId);
CREATE INDEX idx_alerts_status ON alerts(status);
EOF
)
    
    if [ -z "$DB_PASSWORD" ]; then
        echo "$TABLES_SQL" | mysql -h "$DB_HOST" -u "$DB_USER"
    else
        echo "$TABLES_SQL" | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD"
    fi
    
    print_success "Database tables created"
}

# Insert sample data
insert_sample_data() {
    print_header "Inserting Sample Data"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    SAMPLE_DATA=$(cat << 'EOF'
USE smart_factory_test;

-- Insert sample users
INSERT INTO users (openId, email, password, name, loginMethod, role) VALUES
('user-001', 'admin@factory.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Admin User', 'local', 'admin'),
('user-002', 'operator@factory.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Operator', 'local', 'user');

-- Insert sample devices
INSERT INTO devices (deviceId, name, type, status, location, zone, firmwareVersion) VALUES
('SENSOR-001', 'Temperature Sensor - Line A', 'sensor', 'online', 'Production Line A', 'Zone 1', '1.0.0'),
('SENSOR-002', 'Humidity Sensor - Line A', 'sensor', 'online', 'Production Line A', 'Zone 1', '1.0.0'),
('ACTUATOR-001', 'Motor Controller - Line A', 'actuator', 'online', 'Production Line A', 'Zone 1', '2.0.0'),
('SENSOR-003', 'Vibration Sensor - Line B', 'sensor', 'offline', 'Production Line B', 'Zone 2', '1.0.0'),
('GATEWAY-001', 'IoT Gateway - Zone 1', 'gateway', 'online', 'Control Room', 'Zone 1', '3.0.0');

-- Insert sample sensor readings
INSERT INTO sensor_readings (deviceId, temperature, humidity, vibration, power, pressure, rpm) VALUES
('SENSOR-001', 25.5, 45.0, 0.2, 100.0, 1.0, 1500),
('SENSOR-002', 26.0, 48.5, 0.1, 95.0, 1.05, 1450),
('SENSOR-003', 24.8, 42.0, 0.5, 110.0, 0.95, 1600);

-- Insert sample alert thresholds
INSERT INTO alert_thresholds (deviceId, metric, minValue, maxValue, warningMin, warningMax, enabled) VALUES
('SENSOR-001', 'temperature', 15.0, 35.0, 20.0, 30.0, true),
('SENSOR-002', 'humidity', 30.0, 60.0, 40.0, 55.0, true),
('SENSOR-003', 'vibration', 0.0, 1.0, 0.2, 0.8, true);

-- Insert sample firmware versions
INSERT INTO firmware_versions (version, deviceType, releaseNotes, fileUrl, checksum, isStable) VALUES
('1.0.0', 'sensor', 'Initial release', 'https://firmware.example.com/v1.0.0.bin', 'abc123def456', true),
('2.0.0', 'actuator', 'Performance improvements', 'https://firmware.example.com/v2.0.0.bin', 'def456ghi789', true),
('3.0.0', 'gateway', 'Bug fixes and stability', 'https://firmware.example.com/v3.0.0.bin', 'ghi789jkl012', true);
EOF
)
    
    if [ -z "$DB_PASSWORD" ]; then
        echo "$SAMPLE_DATA" | mysql -h "$DB_HOST" -u "$DB_USER"
    else
        echo "$SAMPLE_DATA" | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD"
    fi
    
    print_success "Sample data inserted"
}

# Create .env.test file
create_env_test() {
    print_header "Creating Test Environment File"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    # Create DATABASE_URL
    if [ -z "$DB_PASSWORD" ]; then
        DATABASE_URL="mysql://$DB_USER@$DB_HOST:3306/$DB_NAME"
    else
        DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:3306/$DB_NAME"
    fi
    
    cat > .env.test << EOF
# Test Environment Configuration
NODE_ENV=test
DATABASE_URL=$DATABASE_URL
JWT_SECRET=test-secret-key-change-in-production
PORT=3001
VITE_APP_ID=smart-factory-iot-test
VITE_APP_TITLE=Smart Factory IoT (Test)
CORS_ORIGINS=*
DEBUG=true
EOF
    
    print_success ".env.test created"
    print_info "DATABASE_URL: $DATABASE_URL"
}

# Verify database connection
verify_connection() {
    print_header "Verifying Database Connection"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    if [ -z "$DB_PASSWORD" ]; then
        RESULT=$(mysql -h "$DB_HOST" -u "$DB_USER" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>&1)
    else
        RESULT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>&1)
    fi
    
    if echo "$RESULT" | grep -q "7"; then
        print_success "Database connection verified - 7 tables found"
    else
        print_error "Failed to verify database connection"
        exit 1
    fi
}

# Generate summary
generate_summary() {
    print_header "Setup Complete"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_NAME=${DB_NAME:-smart_factory_test}
    
    echo -e "${GREEN}Test database setup completed successfully!${NC}"
    echo ""
    echo "Database Information:"
    echo "  - Host: $DB_HOST"
    echo "  - User: $DB_USER"
    echo "  - Database: $DB_NAME"
    echo "  - Tables: 7"
    echo "  - Sample Data: Inserted"
    echo ""
    echo "Next steps:"
    echo "1. Run tests: pnpm test"
    echo "2. Or use .env.test: cp .env.test .env && pnpm test"
    echo ""
    echo "To reset the database, run this script again."
    echo ""
}

# Main function
main() {
    print_header "Smart Factory IoT - Test Database Setup"
    
    check_mysql
    check_mysql_service
    create_test_database
    create_tables
    insert_sample_data
    create_env_test
    verify_connection
    generate_summary
}

main "$@"
