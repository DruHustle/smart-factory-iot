#!/usr/bin/env node

/**
 * Smart Factory IoT - Demo Accounts Seeding Script
 * 
 * This script creates demo accounts in the database for testing and demonstration.
 * It uses bcryptjs to hash passwords before storing them.
 * 
 * Usage:
 *   node seed-demo-accounts.mjs              # Create demo accounts
 *   node seed-demo-accounts.mjs --reset      # Reset and recreate
 *   node seed-demo-accounts.mjs --help       # Show help
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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

// Demo accounts configuration
const DEMO_ACCOUNTS = [
  {
    openId: 'demo-admin',
    email: 'admin@demo.local',
    password: 'demo-admin-password',
    name: 'Admin User',
    loginMethod: 'local',
    role: 'admin',
  },
  {
    openId: 'demo-operator',
    email: 'operator@demo.local',
    password: 'demo-operator-password',
    name: 'Operator User',
    loginMethod: 'local',
    role: 'user',
  },
  {
    openId: 'demo-technician',
    email: 'technician@demo.local',
    password: 'demo-technician-password',
    name: 'Technician User',
    loginMethod: 'local',
    role: 'user',
  },
  {
    openId: 'demo-user',
    email: 'demo@demo.local',
    password: 'demo-password',
    name: 'Demo User',
    loginMethod: 'local',
    role: 'user',
  },
];

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

async function seedDemoAccounts(connection) {
  logHeader('Seeding Demo Accounts');

  try {
    let created = 0;
    let updated = 0;

    for (const account of DEMO_ACCOUNTS) {
      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 10);

      try {
        // Try to insert, or update if exists
        await connection.execute(
          `INSERT INTO users (openId, email, password, name, loginMethod, role) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           password = ?, name = ?, loginMethod = ?, role = ?`,
          [
            account.openId,
            account.email,
            hashedPassword,
            account.name,
            account.loginMethod,
            account.role,
            hashedPassword,
            account.name,
            account.loginMethod,
            account.role,
          ]
        );

        // Check if it was inserted or updated
        const [[result]] = await connection.execute(
          `SELECT id FROM users WHERE email = ?`,
          [account.email]
        );

        if (result) {
          logSuccess(`${account.name} (${account.email})`);
          created++;
        }
      } catch (error) {
        logError(`Failed to seed ${account.email}: ${error.message}`);
      }
    }

    logSuccess(`Demo accounts seeded: ${created} created/updated`);
  } catch (error) {
    logError(`Failed to seed demo accounts: ${error.message}`);
    throw error;
  }
}

async function displayDemoAccounts(connection) {
  logHeader('Demo Accounts Created');

  try {
    const [accounts] = await connection.execute(
      `SELECT email, name, role FROM users WHERE email LIKE '%@demo.local'`
    );

    console.log('\nDemo accounts are now available for testing:\n');
    for (const account of accounts) {
      logInfo(`${account.name} (${account.email}) - Role: ${account.role}`);
    }

    console.log('\nYou can click the demo account buttons on the login page to quickly fill in credentials.\n');
  } catch (error) {
    logError(`Failed to display demo accounts: ${error.message}`);
  }
}

async function resetDemoAccounts(connection) {
  logHeader('Resetting Demo Accounts');

  try {
    await connection.execute(`DELETE FROM users WHERE email LIKE '%@demo.local'`);
    logSuccess('Demo accounts reset');
  } catch (error) {
    logError(`Failed to reset demo accounts: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    logHeader('Smart Factory IoT - Demo Accounts Seeding');
    console.log('Usage: node seed-demo-accounts.mjs [OPTIONS]\n');
    console.log('Options:');
    console.log('  --reset   Reset demo accounts before seeding');
    console.log('  --help    Show this help message\n');
    console.log('Demo Accounts:');
    for (const account of DEMO_ACCOUNTS) {
      console.log(`  - ${account.name} (${account.email})`);
      console.log(`    Password: ${account.password}`);
      console.log(`    Role: ${account.role}\n`);
    }
    process.exit(0);
  }

  const connection = await createConnection();

  try {
    if (args.includes('--reset')) {
      await resetDemoAccounts(connection);
    }

    await seedDemoAccounts(connection);
    await displayDemoAccounts(connection);

    logHeader('Demo Accounts Setup Complete');
    logSuccess('Demo accounts are ready for testing!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: pnpm dev');
    console.log('2. Navigate to the login page');
    console.log('3. Click any demo account button to fill in credentials');
    console.log('4. Click "Sign In" to log in\n');
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
