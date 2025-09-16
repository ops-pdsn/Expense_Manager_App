import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginData, RegisterData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../lib/supabaseClient";

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  department: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["supabase-user"],
    queryFn: async () => {
      try {
        // Check if Supabase is properly configured
        if (supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseAnonKey === 'your-anon-key-here') {
          console.warn('Supabase not configured. Please set up your Supabase credentials.');
          return null;
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          return null;
        }

        // Get user profile from our backend
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          return null;
        }

        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If profile doesn't exist, create it
          if (response.status === 404) {
            const { firstName, lastName, department } = authUser.user_metadata || {};
            const createResponse = await fetch('/api/user/profile', {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                firstName: firstName || '',
                lastName: lastName || '',
                department: department || 'Other',
              }),
            });

            if (createResponse.ok) {
              const profileData = await createResponse.json();
              return profileData;
            }
          }
          return null;
        }

        const profileData = await response.json();
        return profileData;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          refetch();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [refetch]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { email, password } = credentials;
      console.log('Attempting login for:', email);
      
      // Check if Supabase is properly configured
      if (supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseAnonKey === 'your-anon-key-here') {
        throw new Error('Supabase not configured. Please set up your Supabase credentials.');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Login error details:', error);
        throw new Error(error.message);
      }
      
      console.log('Login successful:', data.user);
      return data.user;
    },
    onSuccess: (user: any) => {
      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });
      // Don't reload, let the auth state change handle it
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const { email, password, firstName, lastName, department } = credentials;
      console.log('Attempting registration for:', email);
      
      // Check if Supabase is properly configured
      if (supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseAnonKey === 'your-anon-key-here') {
        throw new Error('Supabase not configured. Please set up your Supabase credentials.');
      }
      
      // First, sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName, department },
        },
      });
      
      if (authError) {
        console.error('Registration error details:', authError);
        throw new Error(authError.message);
      }
      
      console.log('Registration successful:', authData.user);
      console.log('Email confirmation required:', authData.user?.email_confirmed_at === null);
      
      return authData.user;
    },
    onSuccess: (user: any) => {
      toast({
        title: "Registration successful",
        description: `Welcome! Please check your email to confirm your account.`,
      });
      // Don't reload, let the auth state change handle it
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "Registration failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out.",
      });
      // Don't reload, let the auth state change handle it
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }
    },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
