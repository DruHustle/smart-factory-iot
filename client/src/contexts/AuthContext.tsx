import { createContext, useContext, useState, useEffect } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
} from "@/lib/api-auth";
import { mockLogin, mockRegister, mockGetCurrentUser } from "@/lib/mock-auth";
import type { User } from "../../../drizzle/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // 1. Check if the existing session is a Mock session
        if (token.startsWith('mock_')) {
          const result = await mockGetCurrentUser(token);
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            localStorage.removeItem("token");
            setUser(null);
          }
        } 
        // 2. Otherwise, attempt to validate token with Render Backend
        else {
          const result = await getCurrentUser();
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            localStorage.removeItem("token");
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Define demo accounts criteria
      const isDemoAccount = email.endsWith('@dev.local') || email === 'admin@demo.com';

      let result;
      if (isDemoAccount) {
        // Use local Mock Auth for demo accounts
        result = await mockLogin(email, password);
        if (result.success && result.token) {
          localStorage.setItem("token", result.token); // Should be prefixed with 'mock_'
        }
      } else {
        // Use Render Backend for all other accounts
        result = await apiLogin(email, password);
        // apiLogin usually calls setAuthToken internally to save the real JWT
      }

      if (result.success) {
        setUser(result.user || null);
        return { success: true };
      }

      return { success: false, error: result.error || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // Registration is treated as a "Real User" action (Render Backend)
      const result = await apiRegister(email, password, name);
      
      if (result.success) {
        setUser(result.user || null);
        return { success: true };
      }
      return { success: false, error: result.error || "Registration failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");

      // Only notify backend if it's a real session
      if (token && !token.startsWith('mock_')) {
        await apiLogout();
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // Always clear local state
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user, 
        login, 
        logout, 
        register 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}