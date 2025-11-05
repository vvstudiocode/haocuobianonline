/**
 * @file types.ts
 * @description
 * 集中管理整個應用程式共享的 TypeScript 型別定義。
 */
import { Session, User } from '@supabase/supabase-js';

export interface ImageInfo {
    src: string;
    isCreation: boolean;
    sourceCategory: string;
    // FIX: Add optional editorData property to allow passing canvas state for re-editing.
    editorData?: any;
}

// Create a type for keys that represent counters in the Achievements object.
export type AchievementCounterKey = 'creationCount' | 'shareCount' | 'fontsUsed' | 'favoritesCount' | 'consecutiveCheckInDays';

export interface Badge {
    id: string;
    name: string;
    description: string;
    points: number;
    category: 'creation' | 'sharing' | 'habit' | 'hidden' | 'meta';
    icon: string;
    hidden?: boolean;
    meta?: boolean;
    requiredCategory?: 'creation' | 'sharing' | 'habit';
    reward?: string;
    goal?: number;
    progressKey?: AchievementCounterKey;
}

export interface Level {
    level: number;
    name: string;
    points: number;
    icon: string;
}

export interface TaskDefinition {
    id: string;
    type: 'daily' | 'weekly';
    name: string;
    description: string;
    goal: number;
    points: number;
    event: 'claim_task' | 'create' | 'share';
    condition?: {
        category?: string;
        font?: string;
        isVertical?: boolean;
        sameBackground?: boolean;
    }
}

export interface TaskProgress {
    count: number;
    claimed: boolean;
    details?: any; // For complex tracking, e.g., { [imageSrc: string]: number }
}

export interface DailyTasks {
    lastReset: string | null;
    progress: { [taskId: string]: TaskProgress };
}

export interface WeeklyTasks {
    lastReset: string | null;
    progress: { [taskId:string]: TaskProgress };
}

export interface UserProfile {
    nickname: string;
    points: number;
    tasks: {
        daily: DailyTasks;
        weekly: WeeklyTasks;
    };
}

export interface Achievements {
    creationCount: number;
    shareCount: number;
    fontsUsed: string[];
    favoritesCount: number;
    consecutiveCheckInDays: number;
    lastCheckInDate: string | null;
    unlockedBadges: string[];
}


// --- Pin & Board Data Models for Pinterest-style layout ---

export type PinSourceType = 'STATIC_IMAGE' | 'USER_CREATION' | 'USER_UPLOAD';

export interface Pin {
    pinId: string;
    imageUrl: string;
    aspectRatio: number; // e.g., 0.75 for a 3:4 image
    title: string;
    description?: string;
    creatorId: string; // 'official' for static, or a user ID
    creatorUsername?: string;
    likeCount?: number;
    sourceType: PinSourceType;
    editorData?: any; // For re-editing USER_CREATION pins
}

export interface Board {
    boardId: string;
    name: string;
    description?: string;
    coverPinUrl?: string; // URL of the first pin or a selected cover
    pinIds: string[];
}

// --- Supabase Types ---
export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
}

export type { Session, User };