import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { profilesApi } from '@/api/supabaseApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.warn('Session error:', error.message);
          setIsAuthenticated(false);
        } else if (session) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          profilesApi.getById(session.user.id).then(profileData => {
            if (isMounted) setProfile(profileData);
          }).catch(() => {});
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.warn('Session check failed:', error.message);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    };

    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth check timeout - continuing anyway');
        setIsLoadingAuth(false);
      }
    }, 3000);

    checkSession();

    supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        
        profilesApi.getById(session.user.id).then(profileData => {
          if (isMounted) setProfile(profileData);
        }).catch(() => {});
      } else {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const signUp = async ({ email, password, fullName }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile,
      isAdmin,
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithMicrosoft
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
