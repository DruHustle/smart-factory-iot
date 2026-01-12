/**
 * Mock Authentication Service
 * * Handles demo accounts locally. Tokens generated here start with 'mock_'
 * to prevent the AuthContext from attempting to reach the Render backend.
 */

import type { User } from "../../../drizzle/schema";
// Integrated safeLocalStorage to prevent Safari-specific storage errors
import { safeLocalStorage } from "./storage";

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

/**
 * Retrieves users from storage and merges them with INITIAL_USERS.
 * This guarantees that hardcoded accounts always work regardless of
 * what is currently saved in the browser's persistent storage.
 */
function getStoredUsers(): Record<string, User> {
  // Check for SSR environment
  if (typeof window === 'undefined') return INITIAL_USERS;

  // Use the safe wrapper instead of raw localStorage
  const stored = safeLocalStorage.getItem(USERS_KEY);
  
  if (!stored) {
    safeLocalStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }

  try {
    const parsedStored = JSON.parse(stored);
    
    // THE FIX: Merge stored users with INITIAL_USERS.
    // INITIAL_USERS comes last, so it overrides any stale data for those specific emails.
    return {
      ...parsedStored,
      ...INITIAL_USERS
    };
  } catch (e) {
    console.error("Failed to parse stored users, resetting to initial", e);
    return INITIAL_USERS;
  }
}

function saveStoredUsers(users: Record<string, User>): void {
  if (typeof window === 'undefined') return;
  safeLocalStorage.setItem(USERS_KEY, JSON.stringify(users));
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
  return 'mock_' + base64; // Prefix used by AuthContext
}

export async function mockLogin(email: string, password: string): Promise<MockAuthResult> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
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

export function isGitHubPagesDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  const url = window.location.href;
  return url.includes('github.io') && !import.meta.env.VITE_API_URL; //
}