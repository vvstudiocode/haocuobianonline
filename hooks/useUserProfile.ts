import React from 'react';
import { useStorage } from './useStorage.ts';
import { 
    ACHIEVEMENTS_KEY, 
    USER_PROFILE_KEY, 
    initializeAchievements, 
    initializeUserProfile, 
    BADGES, 
    TASKS, 
    getLevelInfo,
    FONT_OPTIONS
} from '../data.ts';
import { Achievements, UserProfile } from '../types.ts';

const { useState, useCallback, useEffect, useRef } = React;

export const useUserProfile = () => {
    const [userProfile, setUserProfile] = useStorage<UserProfile>(USER_PROFILE_KEY, initializeUserProfile());
    const [achievements, setAchievements] = useStorage<Achievements>(ACHIEVEMENTS_KEY, initializeAchievements());
    const [newlyUnlocked, setNewlyUnlocked] = useState<any[]>([]);

    const updateUserProfile = (newProfile: UserProfile) => {
        setUserProfile(newProfile);
    };
    
    // Create refs to hold the latest state, enabling stable callbacks.
    const achievementsRef = useRef(achievements);
    const userProfileRef = useRef(userProfile);

    // Keep refs updated with the latest state.
    useEffect(() => {
        achievementsRef.current = achievements;
    }, [achievements]);

    useEffect(() => {
        userProfileRef.current = userProfile;
    }, [userProfile]);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const isSameWeek = (d1: Date, d2: Date) => {
        const getWeek = (date: Date) => {
            const adjustedDate = new Date(date.valueOf());
            // Set to Sunday of the week
            adjustedDate.setDate(adjustedDate.getDate() - adjustedDate.getDay());
            const startOfYear = new Date(adjustedDate.getFullYear(), 0, 1);
            const pastDaysOfYear = (adjustedDate.getTime() - startOfYear.getTime()) / 86400000;
            return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        };
        return d1.getFullYear() === d2.getFullYear() && getWeek(d1) === getWeek(d2);
    };

    // Reset tasks on mount
    useEffect(() => {
        const now = new Date();
        const currentUserProfile = userProfileRef.current; // Use ref to get latest profile on mount
        const lastDailyReset = currentUserProfile.tasks.daily.lastReset ? new Date(currentUserProfile.tasks.daily.lastReset) : null;
        const lastWeeklyReset = currentUserProfile.tasks.weekly.lastReset ? new Date(currentUserProfile.tasks.weekly.lastReset) : null;

        let profileChanged = false;
        const newTasks = JSON.parse(JSON.stringify(currentUserProfile.tasks));

        if (!lastDailyReset || !isSameDay(now, lastDailyReset)) {
            newTasks.daily = { lastReset: now.toISOString(), progress: {} };
            profileChanged = true;
        }

        if (!lastWeeklyReset || !isSameWeek(now, lastWeeklyReset)) {
            newTasks.weekly = { lastReset: now.toISOString(), progress: {} };
            profileChanged = true;
        }

        if (profileChanged) {
            setUserProfile(prev => ({ ...prev, tasks: newTasks }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setUserProfile]);


    const processAchievement = useCallback((type: string, payload: any = {}) => {
        // Use refs to get the CURRENT state without adding state to useCallback dependencies.
        let newAchievements = { ...achievementsRef.current };
        let newProfile = { ...userProfileRef.current };
        
        let pointsToAdd = 0;
        let unlockedItems: any[] = [];
        
        const unlockBadge = (badgeId: string) => {
            if (!newAchievements.unlockedBadges.includes(badgeId)) {
                const badge = BADGES[badgeId];
                if (!badge) return false;
                newAchievements.unlockedBadges.push(badgeId);
                pointsToAdd += badge.points;
                unlockedItems.push({ ...badge, type: 'badge' });
                return true;
            }
            return false;
        };
        
        const updateTaskProgressOnCreate = (creationMetadata: {
            sourceCategory: string;
            fontsUsed: string[];
            isVertical: boolean;
            imageSrc: string;
        }) => {
            const relevantTasks = Object.values(TASKS).filter(task => task.event === 'create');
            
            relevantTasks.forEach(task => {
                const taskType = task.type;
                if (!newProfile.tasks[taskType].progress[task.id]) {
                    newProfile.tasks[taskType].progress[task.id] = { count: 0, claimed: false, details: {} };
                }
                const progress = newProfile.tasks[taskType].progress[task.id];

                // If task is completed and not claimed, no need to update count further.
                if (progress.count >= task.goal && !progress.claimed) return;
                // If claimed, definitely don't update.
                if (progress.claimed) return;

                let conditionMet = !task.condition; // No condition means it's a generic create task
                if (task.condition) {
                    const { category, font, isVertical, sameBackground } = task.condition;
                    let met = true;
                    if (category && !creationMetadata.sourceCategory.includes(category)) met = false;
                    if (font && !creationMetadata.fontsUsed.includes(font)) met = false;
                    if (isVertical && !creationMetadata.isVertical) met = false;
                    if (sameBackground) {
                        const src = creationMetadata.imageSrc;
                        progress.details = progress.details || {};
                        progress.details[src] = (progress.details[src] || 0) + 1;
                        // The count is the max times any single image has been used
                        progress.count = Math.max(...Object.values(progress.details) as number[], 0);
                        // For this specific task, we don't increment count below, so we return early
                        return; 
                    }
                    conditionMet = met;
                }
                
                if (conditionMet && progress.count < task.goal) {
                    progress.count += 1;
                }
            });
        };

        const updateTaskProgressOnShare = () => {
             const relevantTasks = Object.values(TASKS).filter(task => task.event === 'share');
             relevantTasks.forEach(task => {
                const taskType = task.type;
                if (!newProfile.tasks[taskType].progress[task.id]) {
                    newProfile.tasks[taskType].progress[task.id] = { count: 0, claimed: false };
                }
                const progress = newProfile.tasks[taskType].progress[task.id];
                if (progress.count < task.goal) {
                    progress.count += 1;
                }
            });
        };

        switch (type) {
            case 'create':
                newAchievements.creationCount += 1;
                updateTaskProgressOnCreate(payload);
                break;
            case 'share':
                newAchievements.shareCount += 1;
                updateTaskProgressOnShare();
                break;
            case 'add_favorite':
                newAchievements.favoritesCount += 1;
                break;
            case 'use_font':
                if (!newAchievements.fontsUsed.includes(payload.fontFamily)) {
                    newAchievements.fontsUsed.push(payload.fontFamily);
                }
                break;
            case 'claim_task': {
                const { taskId } = payload;
                const task = TASKS[taskId];
                if (!task) break;
                const taskType = task.type;
                
                const progress = newProfile.tasks[taskType]?.progress[taskId] || { count: 0, claimed: false };

                const canClaim = (taskId === 'DAILY_CHECKIN') || (progress.count >= task.goal);

                if (canClaim && !progress.claimed) {
                    pointsToAdd += task.points;
                    
                    const updatedProgress = { ...progress, claimed: true };
                    
                    if (taskId === 'DAILY_CHECKIN') {
                         updatedProgress.count = 1;
                         const now = new Date();
                         const lastCheckIn = newAchievements.lastCheckInDate ? new Date(newAchievements.lastCheckInDate) : null;
                         const yesterday = new Date();
                         yesterday.setDate(now.getDate() - 1);

                         if (lastCheckIn && isSameDay(yesterday, lastCheckIn)) {
                             newAchievements.consecutiveCheckInDays += 1;
                         } else if (!lastCheckIn || !isSameDay(now, lastCheckIn)) {
                             newAchievements.consecutiveCheckInDays = 1;
                         }
                         newAchievements.lastCheckInDate = now.toISOString();
                    }
                    
                    newProfile = {
                        ...newProfile,
                        tasks: {
                            ...newProfile.tasks,
                            [taskType]: {
                                ...newProfile.tasks[taskType],
                                progress: {
                                    ...newProfile.tasks[taskType].progress,
                                    [taskId]: updatedProgress
                                }
                            }
                        }
                    };
                }
                break;
            }
        }
        
        // --- Badge Unlocking Logic ---
        Object.values(BADGES).forEach(badge => {
            if (newAchievements.unlockedBadges.includes(badge.id)) return;
            let shouldUnlock = false;
            switch (badge.id) {
                case 'CREATE_1': if (newAchievements.creationCount >= 1) shouldUnlock = true; break;
                case 'CREATE_10': if (newAchievements.creationCount >= 10) shouldUnlock = true; break;
                case 'CREATE_50': if (newAchievements.creationCount >= 50) shouldUnlock = true; break;
                case 'CREATE_150': if (newAchievements.creationCount >= 150) shouldUnlock = true; break;
                case 'SHARE_1': if (newAchievements.shareCount >= 1) shouldUnlock = true; break;
                case 'SHARE_20': if (newAchievements.shareCount >= 20) shouldUnlock = true; break;
                case 'SHARE_100': if (newAchievements.shareCount >= 100) shouldUnlock = true; break;
                case 'SHARE_300': if (newAchievements.shareCount >= 300) shouldUnlock = true; break;
                case 'FONT_5': if (newAchievements.fontsUsed.length >= 5) shouldUnlock = true; break;
                case 'FONT_ALL': if (newAchievements.fontsUsed.length >= FONT_OPTIONS.length) shouldUnlock = true; break;
                case 'FAVORITE_10': if (newAchievements.favoritesCount >= 10) shouldUnlock = true; break;
                case 'CHECKIN_1': if (newAchievements.lastCheckInDate) shouldUnlock = true; break;
                case 'CHECKIN_7': if (newAchievements.consecutiveCheckInDays >= 7) shouldUnlock = true; break;
                case 'CHECKIN_30': if (newAchievements.consecutiveCheckInDays >= 30) shouldUnlock = true; break;
                // Add meta logic here if needed in the future
            }
            if (shouldUnlock) {
                unlockBadge(badge.id);
            }
        });

        if (pointsToAdd > 0) {
            const oldLevelInfo = getLevelInfo(newProfile.points);
            newProfile.points += pointsToAdd;
            const newLevelInfo = getLevelInfo(newProfile.points);
            
            if (newLevelInfo.level > oldLevelInfo.level) {
                unlockedItems.push({ ...newLevelInfo, type: 'level' });
            }
        }

        setAchievements(newAchievements);
        setUserProfile(newProfile);
        
        if (unlockedItems.length > 0) {
            setNewlyUnlocked(prev => [...prev, ...unlockedItems]);
        }

    }, [setAchievements, setUserProfile, setNewlyUnlocked]);

    return { userProfile, achievements, newlyUnlocked, processAchievement, updateUserProfile, setNewlyUnlocked };
};