#!/usr/bin/env node

/**
 * Smart Factory IoT - Development Data Seeding Script
 * 
 * This script generates additional sample data for development and testing.
 * It can be run multiple times to add more data without resetting the database.
 * 
 * Usage:
 *   node seed-dev-data.mjs              # Add random data
 *   node seed-dev-data.mjs --reset      # Reset and reseed
 *   node seed-dev-data.mjs --help       # Show help
 */

import mysql from 'mysql2/promise';
import { randomInt, randomFloat } from 'crypto';

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_factory_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  log('\n========================================', 'blue');
  log(title, 'blue');
  log('========================================\n', 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomStatus() {
  return getRandomElement(['online', 'offline', 'maintenance', 'error']);
}

function getRandomSeverity() {
  return getRandomElement(['info', 'warning', 'critical']);
}

function getRandomAlertType() {
  return getRandomElement([
    'temperature_warning',
    'humidity_warning',
    'pressure_warning',
    'vibration_warning',
    'power_anomaly',
    'device_offline',
    'device_error',
  ]);
}

// Database operations
async function createConnection() {
  try {
    const connection = await mysql.createConnection(config);
    logSuccess('Connected to database');
    return connection;
  } catch (error) {
    logError(`Failed to connect to database: ${error.message}`);
    process.exit(1);
  }
}

async function seedAdditionalDevices(connection) {
  logHeader('Seeding Additional Devices');

  const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];
  const locations = [
    'Production Line A',
    'Production Line B',
    'Production Line C',
    'Warehouse',
    'Control Room',
  ];
  const types = ['sensor', 'actuator', 'controller', 'gateway'];
  const deviceNames = [
    'Temperature Sensor',
    'Humidity Sensor',
    'Pressure Sensor',
    'Vibration Sensor',
    'Power Monitor',
    'Motor Controller',
    'Valve Actuator',
    'PLC Controller',
    'IoT Gateway',
    'Data Logger',
  ];

  const devices = [];
  for (let i = 0; i < 20; i++) {
    const type = getRandomElement(types);
    const deviceId = `DEV-${type.toUpperCase()}-${String(i + 100).slice(-3)}`;
    const name = `${getRandomElement(deviceNames)} ${i + 1}`;
    const status = getRandomStatus();
    const zone = getRandomElement(zones);
    const location = getRandomElement(locations);
    const firmwareVersion = `${getRandomInt(1, 3)}.${getRandomInt(0, 5)}.${getRandomInt(0, 10)}`;

    devices.push([deviceId, name, type, status, location, zone, firmwareVersion]);
  }

  try {
    for (const device of devices) {
      await connection.execute(
        `INSERT IGNORE INTO devices (deviceId, name, type, status, location, zone, firmwareVersion) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        device
      );
    }
    logSuccess(`Added ${devices.length} new devices`);
  } catch (error) {
    logError(`Failed to seed devices: ${error.message}`);
  }
}

async function seedSensorReadings(connection) {
  logHeader('Seeding Sensor Readings');

  try {
    // Get all devices
    const [devices] = await connection.execute('SELECT deviceId FROM devices LIMIT 30');

    let readingsAdded = 0;

    for (const device of devices) {
      // Add 10 readings per device over the last hour
      for (let i = 0; i < 10; i++) {
        const minutesAgo = i * 6; // 6-minute intervals
        const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);

        const readings = [
          device.deviceId,
          getRandomFloat(15, 35, 1), // temperature
          getRandomFloat(30, 70, 1), // humidity
          getRandomFloat(0, 1, 3), // vibration
          getRandomFloat(80, 120, 1), // power
          getRandomFloat(0.8, 1.2, 2), // pressure
          getRandomInt(1000, 2000), // rpm
          timestamp,
        ];

        await connection.execute(
          `INSERT INTO sensor_readings 
           (deviceId, temperature, humidity, vibration, power, pressure, rpm, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          readings
        );

        readingsAdded++;
      }
    }

    logSuccess(`Added ${readingsAdded} sensor readings`);
  } catch (error) {
    logError(`Failed to seed sensor readings: ${error.message}`);
  }
}

async function seedAlerts(connection) {
  logHeader('Seeding Alerts');

  try {
    // Get all devices
    const [devices] = await connection.execute('SELECT deviceId FROM devices LIMIT 30');

    let alertsAdded = 0;

    for (const device of devices) {
      // Add 2-5 random alerts per device
      const alertCount = getRandomInt(2, 5);

      for (let i = 0; i < alertCount; i++) {
        const severity = getRandomSeverity();
        const status = getRandomElement(['open', 'resolved']);
        const createdAt = new Date(Date.now() - getRandomInt(1, 7) * 24 * 60 * 60 * 1000);
        const resolvedAt = status === 'resolved' ? new Date(createdAt.getTime() + getRandomInt(1, 24) * 60 * 60 * 1000) : null;

        const alerts = [
          device.deviceId,
          getRandomAlertType(),
          severity,
          status,
          `Alert message for device ${device.deviceId}`,
          createdAt,
          resolvedAt,
        ];

        await connection.execute(
          `INSERT INTO alerts 
           (deviceId, type, severity, status, message, createdAt, resolvedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          alerts
        );

        alertsAdded++;
      }
    }

    logSuccess(`Added ${alertsAdded} alerts`);
  } catch (error) {
    logError(`Failed to seed alerts: ${error.message}`);
  }
}

async function seedFirmwareVersions(connection) {
  logHeader('Seeding Firmware Versions');

  const versions = [
    { version: '1.1.0', deviceType: 'sensor', notes: 'Improved sensor accuracy' },
    { version: '1.1.1', deviceType: 'sensor', notes: 'Bug fixes' },
    { version: '2.0.1', deviceType: 'actuator', notes: 'Performance improvements' },
    { version: '2.1.0', deviceType: 'actuator', notes: 'New control modes' },
    { version: '3.0.1', deviceType: 'gateway', notes: 'Security patches' },
    { version: '3.1.1', deviceType: 'gateway', notes: 'Stability improvements' },
    { version: '3.2.0', deviceType: 'gateway', notes: 'New features' },
  ];

  try {
    for (const fw of versions) {
      await connection.execute(
        `INSERT IGNORE INTO firmware_versions 
         (version, deviceType, releaseNotes, fileUrl, checksum, isStable) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          fw.version,
          fw.deviceType,
          fw.notes,
          `https://firmware.dev.local/v${fw.version}.bin`,
          `checksum-${fw.version}`,
          true,
        ]
      );
    }
    logSuccess(`Added ${versions.length} firmware versions`);
  } catch (error) {
    logError(`Failed to seed firmware versions: ${error.message}`);
  }
}

async function seedOTADeployments(connection) {
  logHeader('Seeding OTA Deployments');

  try {
    // Get devices and firmware versions
    const [devices] = await connection.execute('SELECT deviceId FROM devices LIMIT 20');
    const [firmwares] = await connection.execute('SELECT id FROM firmware_versions LIMIT 5');

    let deploymentsAdded = 0;

    for (const device of devices) {
      const firmware = getRandomElement(firmwares);
      const status = getRandomElement(['pending', 'in_progress', 'completed', 'failed']);
      const progress = status === 'completed' ? 100 : status === 'failed' ? getRandomInt(0, 99) : getRandomInt(0, 100);
      const errorMessage = status === 'failed' ? 'Deployment failed due to network error' : null;
      const createdAt = new Date(Date.now() - getRandomInt(1, 30) * 24 * 60 * 60 * 1000);
      const completedAt = status === 'completed' ? new Date(createdAt.getTime() + getRandomInt(1, 24) * 60 * 60 * 1000) : null;

      await connection.execute(
        `INSERT INTO ota_deployments 
         (deviceId, firmwareVersionId, status, progress, errorMessage, createdAt, completedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [device.deviceId, firmware.id, status, progress, errorMessage, createdAt, completedAt]
      );

      deploymentsAdded++;
    }

    logSuccess(`Added ${deploymentsAdded} OTA deployments`);
  } catch (error) {
    logError(`Failed to seed OTA deployments: ${error.message}`);
  }
}

async function getStatistics(connection) {
  logHeader('Database Statistics');

  try {
    const tables = [
      'users',
      'devices',
      'sensor_readings',
      'alert_thresholds',
      'alerts',
      'firmware_versions',
      'ota_deployments',
    ];

    for (const table of tables) {
      const [[{ count }]] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      logInfo(`${table}: ${count} records`);
    }
  } catch (error) {
    logError(`Failed to get statistics: ${error.message}`);
  }
}

async function resetDatabase(connection) {
  logHeader('Resetting Database');

  try {
    const tables = [
      'ota_deployments',
      'alerts',
      'sensor_readings',
      'alert_thresholds',
      'firmware_versions',
      'devices',
      'users',
    ];

    for (const table of tables) {
      await connection.execute(`TRUNCATE TABLE ${table}`);
    }

    logSuccess('Database reset complete');
  } catch (error) {
    logError(`Failed to reset database: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    logHeader('Smart Factory IoT - Development Data Seeding');
    console.log('Usage: node seed-dev-data.mjs [OPTIONS]\n');
    console.log('Options:');
    console.log('  --reset   Reset database before seeding');
    console.log('  --help    Show this help message\n');
    process.exit(0);
  }

  const connection = await createConnection();

  try {
    if (args.includes('--reset')) {
      await resetDatabase(connection);
    }

    await seedAdditionalDevices(connection);
    await seedSensorReadings(connection);
    await seedAlerts(connection);
    await seedFirmwareVersions(connection);
    await seedOTADeployments(connection);
    await getStatistics(connection);

    logHeader('Seeding Complete');
    logSuccess('Development database has been seeded successfully!');
    console.log('\nYou can now start the development server:');
    console.log('  pnpm dev\n');
  } catch (error) {
    logError(`Seeding failed: ${error.message}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
