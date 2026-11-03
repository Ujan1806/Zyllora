import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync profile data from Supabase
  const loadProfile = async (userId) => {
    if (!isSupabaseConfigured || !supabase || !userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Check if there is a cached demo user
      const cached = localStorage.getItem('zyllora_demo_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed.user);
        setProfile(parsed.profile);
      }
      setLoading(false);
      return;
    }

    // Supabase session listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, fullName) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured yet. Please provide valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.'
      );
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured yet. Please configure frontend/.env with your Supabase credentials or use the Demo mode.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured yet. Configure Supabase to enable Google OAuth.');
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('zyllora_demo_user');
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured yet. Please configure frontend/.env to enable password resets.'
      );
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  const updateProfile = async (updates) => {
    if (isSupabaseConfigured && supabase && user) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } else {
      // Demo / preview fallback state
      const updatedProfile = { ...(profile || {}), ...updates };
      setProfile(updatedProfile);
      if (user) {
        localStorage.setItem(
          'zyllora_demo_user',
          JSON.stringify({ user, profile: updatedProfile })
        );
      }
      return updatedProfile;
    }
  };

  // Demo Login to allow testing all authenticated views when Supabase is not yet configured
  const demoLogin = (customName = 'Alex Mercer', customStudy = 'Computer Science') => {
    const demoUser = {
      id: 'demo-user-12345',
      email: 'alex.mercer@university.edu',
      user_metadata: {
        full_name: customName,
      },
      isDemo: true,
    };
    const demoProfile = {
      id: 'demo-user-12345',
      email: 'alex.mercer@university.edu',
      full_name: customName,
      field_of_study: customStudy,
      explanation_level: 'intermediate',
      learning_goal: 'exam_prep',
      onboarding_completed: true,
    };
    setUser(demoUser);
    setProfile(demoProfile);
    localStorage.setItem(
      'zyllora_demo_user',
      JSON.stringify({ user: demoUser, profile: demoProfile })
    );
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    demoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
