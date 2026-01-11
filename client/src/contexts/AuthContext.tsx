import { createContext, useContext, useState, useEffect } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  isGitHubPagesDeployment,
} from "@/lib/api-auth";
import { mockLogin, mockRegister, mockGetCurrentUser } from "@/lib/mock-auth";
import type { User } from "../../../drizzle/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isGitHubPages = true; // Force mock auth for demo purposes

  useEffect(() => {
    const initializeAuth = async () => {
      if (isGitHubPages) {
        // For GitHub Pages, check localStorage for token and validate it
        const token = localStorage.getItem("token");

        if (token) {
          const result = await mockGetCurrentUser(token);
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            localStorage.removeItem("token");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        // For real backend
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [isGitHubPages]);

  const login = async (email: string, password: string) => {
    try {
      let result;

      if (isGitHubPages) {
        // Use mock auth
        result = await mockLogin(email, password);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        // Store token in localStorage for demo accounts
        if (result.token) {
          localStorage.setItem("token", result.token);
        }
      } else {
        // Use real backend
        result = await apiLogin(email, password);
      }

      if (result.success) {
        setUser(result.user || null);
        return { success: true };
      }

      return { success: false, error: result.error || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      if (isGitHubPages) {
        // Use mock auth
        const result = await mockRegister(email, password, name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        // Store token in localStorage for demo accounts
        if (result.token) {
          localStorage.setItem("token", result.token);
        }
        // Set user after registration
        setUser(result.user || null);
        return { success: true };
      } else {
        // Use real backend
        const result = await apiRegister(email, password, name);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        // Set user after registration
        setUser(result.user || null);
        return { success: true };
      }
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      if (!isGitHubPages) {
        await apiLogout();
      } else {
        localStorage.removeItem("token");
      }
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
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
