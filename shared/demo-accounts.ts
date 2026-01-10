/**
 * Demo Accounts Configuration
 * 
 * This file defines demo accounts available for testing and demonstration purposes.
 * These accounts are pre-populated in the database and can be used to quickly
 * access the application with different user roles.
 */

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'operator' | 'technician';
  description: string;
}

/**
 * Demo accounts available for the application
 * 
 * These accounts are created during database setup and can be used for:
 * - Testing different user roles
 * - Demonstrations
 * - Development and debugging
 * 
 * Note: In production, these demo accounts should be disabled or removed.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin',
    email: 'admin@dev.local',
    password: 'password123',
    role: 'admin',
    description: 'Full system access and administration',
  },
  {
    label: 'Operator',
    email: 'operator@dev.local',
    password: 'password123',
    role: 'user',
    description: 'Device monitoring and basic operations',
  },
  {
    label: 'Technician',
    email: 'tech@dev.local',
    password: 'password123',
    role: 'user',
    description: 'Maintenance and technical support',
  },
  {
    label: 'Demo',
    email: 'demo@dev.local',
    password: 'password123',
    role: 'user',
    description: 'Limited demo access for testing',
  },
];

/**
 * Get demo account by label
 */
export function getDemoAccount(label: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((account) => account.label.toLowerCase() === label.toLowerCase());
}

/**
 * Get all demo accounts
 */
export function getAllDemoAccounts(): DemoAccount[] {
  return DEMO_ACCOUNTS;
}

/**
 * Check if an email is a demo account
 */
export function isDemoAccount(email: string): boolean {
  return DEMO_ACCOUNTS.some((account) => account.email === email);
}
