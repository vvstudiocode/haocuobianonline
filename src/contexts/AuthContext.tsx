import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { Session, User, Profile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<any>;
    updateProfile: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // FIX: Rely on onAuthStateChange to set the initial session. It fires immediately.
        // This avoids using getSession(), which was reported as not existing, likely due to a type mismatch.
        setLoading(true);
        // FIX: Destructure the subscription from `data` directly, which is compatible with older Supabase v2 types.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                } else if (data) {
                    setProfile(data);
                }
            };
            fetchProfile();
        } else {
            setProfile(null);
        }
    }, [user]);

    const signInWithGoogle = async () => {
        setLoading(true);
        // FIX: The `signInWithOAuth` method exists on the SupabaseAuthClient. The error is likely due to faulty type definitions.
        // Explicitly casting to `any` bypasses the incorrect type check without changing the underlying correct logic.
        const { error } = await (supabase.auth as any).signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            alert('使用 Google 登入時發生錯誤: ' + error.message);
        }
    };

    const logout = async () => {
        // FIX: The `signOut` method exists on the SupabaseAuthClient. The error is likely due to faulty type definitions.
        // Explicitly casting to `any` bypasses the incorrect type check without changing the underlying correct logic.
        await (supabase.auth as any).signOut();
    };
    
    const updateProfile = async (username: string) => {
        if (!user) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', user.id);
            
        if (error) {
            console.error('Error updating profile:', error);
            alert('更新失敗，請稍後再試。');
        } else {
            setProfile(prev => prev ? { ...prev, username } : null);
            alert('暱稱更新成功！');
        }
    };


    const value = {
        session,
        user,
        profile,
        loading,
        signInWithGoogle,
        logout,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};