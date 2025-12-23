import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Department } from '@/types/inventory';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string, 
    password: string, 
    name: string, 
    department: Department, 
    role: UserRole,
    phone?: string,
    address?: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback or retry logic could go here
      }

      if (data) {
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          department: data.department,
          createdAt: data.created_at,
        });
      } else {
        // If no profile exists yet (race condition with trigger), fallback to basic info
        setUser({
          id: userId,
          email: email,
          name: 'User', // Placeholder
          role: 'employee', // Default
          department: 'CMS', // Default
          createdAt: new Date().toISOString(),
        } as User);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }
    // Auth state listener will handle the rest
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    department: Department, 
    role: UserRole,
    phone?: string,
    address?: string
  ) => {
    setIsLoading(true);
    
    // We pass metadata, but our trigger handles profile creation mainly.
    // Passing data here is good for the trigger to pick up 'name' if we configured it that way.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          department, // Optional: if we want to store this in metadata too
          role,       // Optional: same
          phone,
          address,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }
    
    // Note: If email confirmation is enabled, user won't be logged in immediately.
    // Assuming email confirmation is OFF for dev, or handled via email link.
    // Use toast to inform user.
    toast.success('Account created! Please sign in.');
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
