/**
 * Mock Authentication Service
 * * Handles demo accounts locally. Tokens generated here start with 'mock_'
 * to prevent the AuthContext from attempting to reach the Render backend.
 */

import type { User } from "../../../drizzle/schema";

export interface MockAuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

const USERS_KEY = 'smart_factory_users';

const INITIAL_USERS: Record<string, User> = {
  'admin@dev.local': {
    id: 1,
    openId: 'dev-admin',
    name: 'Dev Admin',
    email: 'admin@dev.local',
    password: 'password123',
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
    password: 'password123',
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
    password: 'password123',
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  'demo@dev.local': {
    id: 4,
    openId: 'dev-demo',
    name: 'Demo User',
    email: 'demo@dev.local',
    password: 'password123',
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
};

function getStoredUsers(): Record<string, User> {
  if (typeof window === 'undefined') return INITIAL_USERS;
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  return JSON.parse(stored);
}

function saveStoredUsers(users: Record<string, User>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Generate a mock JWT token prefixed with 'mock_'
 */
function generateMockToken(email: string): string {
  const payload = {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  
  const jsonString = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  // This prefix is what the AuthContext uses to distinguish MOCK vs REAL
  return 'mock_' + base64;
}

export async function mockLogin(email: string, password: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const users = getStoredUsers();
  const user = users[email];
  
  if (!user || user.password !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  return {
    success: true,
    token: generateMockToken(email),
    user,
  };
}

export async function mockRegister(email: string, password: string, name: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const users = getStoredUsers();
  
  if (users[email]) {
    return { success: false, error: 'Email already registered' };
  }

  const id = Object.keys(users).length + 1;
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

  users[email] = newUser;
  saveStoredUsers(users);

  return {
    success: true,
    token: generateMockToken(email),
    user: newUser,
  };
}

export async function mockGetCurrentUser(token: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 200));

  if (!token || !token.startsWith('mock_')) {
    return { success: false, error: 'Invalid mock token' };
  }

  try {
    const base64String = token.replace('mock_', '');
    const jsonString = decodeURIComponent(escape(atob(base64String)));
    const payload = JSON.parse(jsonString);
    const users = getStoredUsers();
    const user = users[payload.email];

    return user ? { success: true, user } : { success: false, error: 'User not found' };
  } catch {
    return { success: false, error: 'Invalid token format' };
  }
}

/**
 * Updated to check for the correct Vite environment variable
 */
export function isGitHubPagesDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  const url = window.location.href;
  // If we have an API URL set, we aren't "forced" to use GitHub Pages mock mode
  return url.includes('github.io') && !import.meta.env.VITE_API_URL;
}