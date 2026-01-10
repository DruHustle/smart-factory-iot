#!/bin/bash

# Smart Factory IoT - Development Database Setup Script
# This script sets up a mock MySQL database for local development

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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
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
        sudo service mysql start || sudo systemctl start mysql || print_warning "Could not start MySQL service"
        sleep 2
    fi
    print_success "MySQL service is running"
}

# Create development database
create_dev_database() {
    print_header "Creating Development Database"
    
    # Use environment variables or defaults
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
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
    
    print_success "Development database created: $DB_NAME"
}

# Create database tables
create_tables() {
    print_header "Creating Database Tables"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
    # Create tables SQL
    TABLES_SQL=$(cat << 'EOF'
USE smart_factory_dev;

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
    `minValue` FLOAT,
    `maxValue` FLOAT,
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

# Insert development sample data
insert_dev_data() {
    print_header "Inserting Development Sample Data"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
    SAMPLE_DATA=$(cat << 'EOF'
USE smart_factory_dev;

-- Insert development users
INSERT INTO users (openId, email, password, name, loginMethod, role) VALUES
('dev-admin', 'admin@dev.local', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Dev Admin', 'local', 'admin'),
('dev-operator', 'operator@dev.local', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Dev Operator', 'local', 'user'),
('dev-technician', 'tech@dev.local', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Dev Technician', 'local', 'user');

-- Insert development devices - Production Line A
INSERT INTO devices (deviceId, name, type, status, location, zone, firmwareVersion) VALUES
('DEV-SENSOR-001', 'Temperature Sensor - Line A', 'sensor', 'online', 'Production Line A', 'Zone 1', '1.0.0'),
('DEV-SENSOR-002', 'Humidity Sensor - Line A', 'sensor', 'online', 'Production Line A', 'Zone 1', '1.0.0'),
('DEV-SENSOR-003', 'Pressure Sensor - Line A', 'sensor', 'online', 'Production Line A', 'Zone 1', '1.0.0'),
('DEV-ACTUATOR-001', 'Motor Controller - Line A', 'actuator', 'online', 'Production Line A', 'Zone 1', '2.0.0'),
('DEV-CONTROLLER-001', 'PLC Controller - Line A', 'controller', 'online', 'Production Line A', 'Zone 1', '3.0.0');

-- Insert development devices - Production Line B
INSERT INTO devices (deviceId, name, type, status, location, zone, firmwareVersion) VALUES
('DEV-SENSOR-004', 'Vibration Sensor - Line B', 'sensor', 'online', 'Production Line B', 'Zone 2', '1.0.0'),
('DEV-SENSOR-005', 'Temperature Sensor - Line B', 'sensor', 'offline', 'Production Line B', 'Zone 2', '1.0.0'),
('DEV-ACTUATOR-002', 'Conveyor Motor - Line B', 'actuator', 'maintenance', 'Production Line B', 'Zone 2', '2.0.0'),
('DEV-CONTROLLER-002', 'PLC Controller - Line B', 'controller', 'online', 'Production Line B', 'Zone 2', '3.0.0');

-- Insert development devices - Infrastructure
INSERT INTO devices (deviceId, name, type, status, location, zone, firmwareVersion) VALUES
('DEV-GATEWAY-001', 'IoT Gateway - Zone 1', 'gateway', 'online', 'Control Room', 'Zone 1', '3.0.0'),
('DEV-GATEWAY-002', 'IoT Gateway - Zone 2', 'gateway', 'online', 'Control Room', 'Zone 2', '3.0.0');

-- Insert development sensor readings
INSERT INTO sensor_readings (deviceId, temperature, humidity, vibration, power, pressure, rpm, timestamp) VALUES
('DEV-SENSOR-001', 25.5, 45.0, 0.2, 100.0, 1.0, 1500, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
('DEV-SENSOR-001', 25.8, 44.5, 0.21, 101.0, 1.01, 1510, DATE_SUB(NOW(), INTERVAL 4 MINUTE)),
('DEV-SENSOR-001', 26.0, 44.0, 0.22, 102.0, 1.02, 1520, DATE_SUB(NOW(), INTERVAL 3 MINUTE)),
('DEV-SENSOR-001', 26.2, 43.5, 0.23, 103.0, 1.03, 1530, DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
('DEV-SENSOR-001', 26.5, 43.0, 0.24, 104.0, 1.04, 1540, NOW()),
('DEV-SENSOR-002', 26.0, 48.5, 0.1, 95.0, 1.05, 1450, NOW()),
('DEV-SENSOR-003', 24.8, 42.0, 0.5, 110.0, 0.95, 1600, NOW()),
('DEV-SENSOR-004', 25.2, 46.0, 0.15, 98.0, 1.02, 1480, NOW());

-- Insert development alert thresholds
INSERT INTO alert_thresholds (deviceId, metric, `minValue`, `maxValue`, warningMin, warningMax, enabled) VALUES
('DEV-SENSOR-001', 'temperature', 15.0, 35.0, 20.0, 30.0, true),
('DEV-SENSOR-002', 'humidity', 30.0, 60.0, 40.0, 55.0, true),
('DEV-SENSOR-003', 'pressure', 0.8, 1.2, 0.9, 1.1, true),
('DEV-SENSOR-004', 'vibration', 0.0, 1.0, 0.2, 0.8, true);

-- Insert development alerts
INSERT INTO alerts (deviceId, type, severity, status, message, createdAt) VALUES
('DEV-SENSOR-001', 'temperature_warning', 'warning', 'open', 'Temperature approaching upper threshold', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('DEV-SENSOR-004', 'vibration_critical', 'critical', 'resolved', 'Excessive vibration detected', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('DEV-SENSOR-005', 'device_offline', 'warning', 'open', 'Device is offline', NOW());

-- Insert development firmware versions
INSERT INTO firmware_versions (version, deviceType, releaseNotes, fileUrl, checksum, isStable) VALUES
('1.0.0', 'sensor', 'Initial sensor firmware release', 'https://firmware.dev.local/v1.0.0.bin', 'abc123def456', true),
('1.0.1', 'sensor', 'Bug fixes and stability improvements', 'https://firmware.dev.local/v1.0.1.bin', 'abc123def457', true),
('2.0.0', 'actuator', 'Performance improvements and new features', 'https://firmware.dev.local/v2.0.0.bin', 'def456ghi789', true),
('3.0.0', 'gateway', 'Enhanced connectivity and reliability', 'https://firmware.dev.local/v3.0.0.bin', 'ghi789jkl012', true),
('3.1.0', 'gateway', 'Security patches and optimizations', 'https://firmware.dev.local/v3.1.0.bin', 'ghi789jkl013', true);

-- Insert development OTA deployments
INSERT INTO ota_deployments (deviceId, firmwareVersionId, status, progress, createdAt) VALUES
('DEV-SENSOR-001', 1, 'completed', 100, DATE_SUB(NOW(), INTERVAL 7 DAY)),
('DEV-ACTUATOR-001', 3, 'completed', 100, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('DEV-GATEWAY-001', 4, 'in_progress', 65, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('DEV-SENSOR-005', 1, 'pending', 0, NOW());
EOF
)
    
    if [ -z "$DB_PASSWORD" ]; then
        echo "$SAMPLE_DATA" | mysql -h "$DB_HOST" -u "$DB_USER"
    else
        echo "$SAMPLE_DATA" | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD"
    fi
    
    print_success "Development sample data inserted"
}

# Create .env.dev file
create_env_dev() {
    print_header "Creating Development Environment File"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
    # Create DATABASE_URL
    if [ -z "$DB_PASSWORD" ]; then
        DATABASE_URL="mysql://$DB_USER@$DB_HOST:3306/$DB_NAME"
    else
        DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:3306/$DB_NAME"
    fi
    
    cat > .env.dev << EOF
# Development Environment Configuration
NODE_ENV=development
DATABASE_URL=$DATABASE_URL
JWT_SECRET=dev-secret-key-change-in-production
PORT=3000
VITE_APP_ID=smart-factory-iot-dev
VITE_APP_TITLE=Smart Factory IoT (Development)
CORS_ORIGINS=*
DEBUG=true
VITE_GOOGLE_MAPS_API_KEY=dev-key-optional
EOF
    
    print_success ".env.dev created"
    print_info "DATABASE_URL: $DATABASE_URL"
}

# Verify database connection
verify_connection() {
    print_header "Verifying Database Connection"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
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

# Get database statistics
get_statistics() {
    print_header "Database Statistics"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
    STATS_SQL=$(cat << 'EOF'
USE smart_factory_dev;
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'devices', COUNT(*) FROM devices
UNION ALL
SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL
SELECT 'alert_thresholds', COUNT(*) FROM alert_thresholds
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'firmware_versions', COUNT(*) FROM firmware_versions
UNION ALL
SELECT 'ota_deployments', COUNT(*) FROM ota_deployments;
EOF
)
    
    if [ -z "$DB_PASSWORD" ]; then
        echo "$STATS_SQL" | mysql -h "$DB_HOST" -u "$DB_USER" 2>/dev/null | tail -8
    else
        echo "$STATS_SQL" | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" 2>/dev/null | tail -8
    fi
}

# Generate summary
generate_summary() {
    print_header "Setup Complete"
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER:-root}
    DB_NAME=${DB_NAME:-smart_factory_dev}
    
    echo -e "${GREEN}Development database setup completed successfully!${NC}"
    echo ""
    echo "Database Information:"
    echo "  - Host: $DB_HOST"
    echo "  - User: $DB_USER"
    echo "  - Database: $DB_NAME"
    echo "  - Tables: 7"
    echo "  - Sample Data: Inserted"
    echo ""
    echo "Sample Data Included:"
    echo "  - 3 Users (admin, operator, technician)"
    echo "  - 12 Devices (sensors, actuators, controllers, gateways)"
    echo "  - 8 Sensor Readings (with time-series data)"
    echo "  - 4 Alert Thresholds"
    echo "  - 3 Alerts (open and resolved)"
    echo "  - 5 Firmware Versions"
    echo "  - 4 OTA Deployments"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.dev to .env: cp .env.dev .env"
    echo "2. Install dependencies: pnpm install"
    echo "3. Start development server: pnpm dev"
    echo ""
    echo "Development Credentials:"
    echo "  - Admin Email: admin@dev.local"
    echo "  - Operator Email: operator@dev.local"
    echo "  - Technician Email: tech@dev.local"
    echo "  - Password: (use hashed password from database)"
    echo ""
    echo "To reset the database, run this script again."
    echo ""
}

# Main function
main() {
    print_header "Smart Factory IoT - Development Database Setup"
    
    check_mysql
    check_mysql_service
    create_dev_database
    create_tables
    insert_dev_data
    create_env_dev
    verify_connection
    get_statistics
    generate_summary
}

main "$@"
