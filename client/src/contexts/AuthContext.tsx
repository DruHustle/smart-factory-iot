import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
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

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    onSuccess: (data) => {
      setUser(data);
      setIsLoading(false);
    },
    onError: () => {
      setUser(null);
      setIsLoading(false);
    },
  });

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const login = async (email: string, password: string) => {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      if (result.token) {
        localStorage.setItem("token", result.token);
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await registerMutation.mutateAsync({ email, password, name });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      localStorage.removeItem("token");
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
