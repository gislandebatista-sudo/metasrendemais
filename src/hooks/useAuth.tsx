import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'viewer' | 'colaborador' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  isAdmin: boolean;
  isColaborador: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        setUserRole('viewer');
        return;
      }

      setUserRole((data?.role as UserRole) || 'viewer');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('viewer');
    }
  };

  useEffect(() => {
    let initialized = false;
    let lastUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        const newUserId = session?.user?.id ?? null;
        // Only refetch role if user actually changed (avoid duplicate role fetches)
        if (newUserId !== lastUserId) {
          lastUserId = newUserId;
          if (newUserId) {
            setTimeout(() => fetchUserRole(newUserId), 0);
          } else {
            setUserRole(null);
          }
        }
        if (initialized) setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      initialized = true;
      setSession(session);
      setUser(session?.user ?? null);
      const uid = session?.user?.id ?? null;
      if (uid && uid !== lastUserId) {
        lastUserId = uid;
        fetchUserRole(uid);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const value = {
    user,
    session,
    userRole,
    isLoading,
    isAdmin: userRole === 'admin',
    isColaborador: userRole === 'colaborador',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
