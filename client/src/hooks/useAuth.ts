import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginData, RegisterData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../lib/supabaseClient";

type AuthContextType = {
  user: any | null;
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
  } = useQuery<any | undefined, Error>({
    queryKey: ["supabase-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { email, password } = credentials;
      console.log('Attempting login for:', email);
      
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
      window.location.reload();
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
      
      // If user was created successfully, create their profile in our users table
      if (authData.user) {
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email!,
              first_name: firstName,
              last_name: lastName,
              department,
            });
          
          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw here as the user was created in auth, just log the error
          } else {
            console.log('Profile created successfully');
          }
        } catch (profileError) {
          console.error('Profile creation failed:', profileError);
        }
      }
      
      return authData.user;
    },
    onSuccess: (user: any) => {
      toast({
        title: "Registration successful",
        description: `Welcome!`,
      });
      window.location.reload();
    },
    onError: (error: Error) => {
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
      window.location.reload();
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