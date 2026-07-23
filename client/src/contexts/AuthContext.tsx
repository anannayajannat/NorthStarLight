import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumber?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<boolean>;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: async () => false,
  updateProfile: async () => false,
  changePassword: async () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data if authenticated
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    onSuccess: (data) => {
      if (data) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    },
    onError: () => {
      setIsAuthenticated(false);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Check authentication status on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await apiRequest("POST", "/api/auth/login", { username, password });
      await refetch();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to login";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      await apiRequest("POST", "/api/auth/register", userData);
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to register";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setIsAuthenticated(false);
      queryClient.clear();
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Something went wrong.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      await apiRequest("PUT", "/api/auth/profile", profileData);
      await refetch();
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await apiRequest("PUT", "/api/auth/password", {
        currentPassword,
        newPassword,
      });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast({
        title: "Password change failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
