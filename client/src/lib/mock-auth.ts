/**
 * Mock Authentication Service
 * 
 * Used for GitHub Pages deployment where no backend API is available.
 * Provides local authentication using demo accounts stored in localStorage.
 */

import { DEMO_ACCOUNTS } from "../../../shared/demo-accounts";
import type { User } from "../../../drizzle/schema";

export interface MockAuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

/**
 * Mock user data for demo accounts
 */
const MOCK_USERS: Record<string, User> = {
  'admin@dev.local': {
    id: 1,
    openId: 'dev-admin',
    name: 'Dev Admin',
    email: 'admin@dev.local',
    password: '$2b$10$nfvduvUJ1PgldBqQEk93GuWPAeL2HlfrlHsGqheEmAyiRpP6vpOiu',
    loginMethod: 'email',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  'operator@dev.local': {
    id: 2,
    openId: 'dev-operator',
    name: 'Dev Operator',
    email: 'operator@dev.local',
    password: '$2b$10$nfvduvUJ1PgldBqQEk93GuWPAeL2HlfrlHsGqheEmAyiRpP6vpOiu',
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  'tech@dev.local': {
    id: 3,
    openId: 'dev-tech',
    name: 'Dev Technician',
    email: 'tech@dev.local',
    password: '$2b$10$nfvduvUJ1PgldBqQEk93GuWPAeL2HlfrlHsGqheEmAyiRpP6vpOiu',
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
};

/**
 * Generate a mock JWT token
 */
function generateMockToken(email: string): string {
  const payload = {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  
  return 'mock_' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Mock login function
 */
export async function mockLogin(email: string, password: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const demoAccount = DEMO_ACCOUNTS.find(acc => acc.email === email);
  if (!demoAccount) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  if (password !== demoAccount.password) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  const user = MOCK_USERS[email];
  if (!user) {
    return {
      success: false,
      error: 'User not found',
    };
  }

  const token = generateMockToken(email);

  return {
    success: true,
    token,
    user,
  };
}

/**
 * Mock register function
 */
export async function mockRegister(
  email: string,
  password: string,
  name: string
): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 500));

  if (MOCK_USERS[email]) {
    return {
      success: false,
      error: 'Email already registered',
    };
  }

  const id = Object.keys(MOCK_USERS).length + 1;
  const newUser: User = {
    id,
    openId: `user-${id}`,
    name,
    email,
    password,
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  MOCK_USERS[email] = newUser;

  const token = generateMockToken(email);

  return {
    success: true,
    token,
    user: newUser,
  };
}

/**
 * Mock get current user
 */
export async function mockGetCurrentUser(token: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 200));

  if (!token || !token.startsWith('mock_')) {
    return {
      success: false,
      error: 'Invalid token',
    };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.replace('mock_', ''), 'base64').toString()
    );
    const user = MOCK_USERS[payload.email];

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      user,
    };
  } catch {
    return {
      success: false,
      error: 'Invalid token',
    };
  }
}

/**
 * Check if running on GitHub Pages (no backend available)
 */
export function isGitHubPagesDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const url = window.location.href;
  return url.includes('github.io') || 
         (url.includes('localhost') && !process.env.VITE_API_URL);
}
