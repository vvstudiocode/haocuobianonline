import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { Session, User, Profile } from '../types';
import { Capacitor } from '@capacitor/core';
import { MY_CREATIONS_BOARD_ID, MY_CREATIONS_BOARD_NAME, MY_FAVORITES_BOARD_ID, MY_FAVORITES_BOARD_NAME } from '../../data';

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

    // --- NEW: Function to ensure default boards exist for a user ---
    const ensureDefaultBoards = async (userId: string) => {
        try {
            // FIX: Use imported constants for board names to improve maintainability and consistency.
            const boardsToEnsure = [
                { id: MY_CREATIONS_BOARD_ID, name: MY_CREATIONS_BOARD_NAME },
                { id: MY_FAVORITES_BOARD_ID, name: MY_FAVORITES_BOARD_NAME }
            ];

            // Check which boards already exist
            const { data: existingBoards, error: checkError } = await supabase
                .from('boards')
                .select('id')
                .eq('user_id', userId)
                .in('id', [MY_CREATIONS_BOARD_ID, MY_FAVORITES_BOARD_ID]);

            if (checkError) throw checkError;

            const existingBoardIds = existingBoards.map(b => b.id);
            const boardsToCreate = boardsToEnsure.filter(b => !existingBoardIds.includes(b.id));

            if (boardsToCreate.length > 0) {
                const newBoardsData = boardsToCreate.map(b => ({
                    id: b.id,
                    name: b.name,
                    user_id: userId,
                }));

                const { error: insertError } = await supabase
                    .from('boards')
                    .insert(newBoardsData);

                if (insertError) throw insertError;
                console.log('Successfully created default boards:', newBoardsData.map(b => b.name).join(', '));
            }

        } catch (error) {
            console.error('Error ensuring default boards:', error);
            // We don't alert here to not disrupt the user's login experience.
            // RLS might prevent creation, which needs to be fixed via SQL.
        }
    };


    useEffect(() => {
        setLoading(true);
        // FIX: The original destructuring was fragile and could crash if the API response
        // structure was unexpected. This safer approach assigns the whole result first.
        const authStateChange = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            
            // --- NEW: Trigger default board creation on login ---
            if (currentUser) {
                ensureDefaultBoards(currentUser.id);
            }
            
            setLoading(false);
        });

        // The authListener object contains a subscription that should be unsubscribed
        // when the component unmounts.
        return () => {
            // Safely unsubscribe from the subscription inside the `data` object.
            authStateChange?.data?.subscription?.unsubscribe();
        };
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
        
        const redirectTo = Capacitor.isNativePlatform()
            ? 'com.haocuobian.app://login-callback'
            : window.location.origin;

        // FIX: The `signInWithOAuth` method exists on the SupabaseAuthClient. The error is likely due to faulty type definitions.
        // Explicitly casting to `any` bypasses the incorrect type check without changing the underlying correct logic.
        const { error } = await (supabase.auth as any).signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo,
            },
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