/**
 * @file AppContext.tsx
 * @description
 * 定義 React Context，用於提供全域應用程式狀態。
 * 這個元件整合了所有自訂鉤子的輸出，
 * 並透過 Context Provider 將共享狀態（如使用者資料、作品、導覽狀態）
 * 和操作函式（如儲存、分享、處理成就）傳遞給應用程式中的任何元件。
 * - **【修正】** 補全了所有 useNotifications 鉤子提供的函式型別，確保 App 在呼叫時不會因型別錯誤而崩潰。
 */
import React from 'react';
import { UserProfile, Achievements, ImageInfo, Pin, Board } from '../types.ts';

const { createContext, useContext } = React;

interface AccessibilitySettings {
    fontSize: 'standard' | 'larger' | 'largest';
    highContrast: boolean;
}

interface ScrollPositionState {
    top: number;
    count: number;
}

interface AppContextType {
    // from useStorage
    creations: string[];
    setCreations: React.Dispatch<React.SetStateAction<string[]>>;
    pins: Pin[];
    setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
    boards: Board[];
    setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
    
    // from useUserProfile
    userProfile: UserProfile;
    achievements: Achievements;
    newlyUnlocked: any[];
    processAchievement: (type: string, payload?: any) => void;
    updateUserProfile: (newProfile: UserProfile) => void;
    setNewlyUnlocked: React.Dispatch<React.SetStateAction<any[]>>;

    // from useNavigation
    view: string;
    activeTab: string;
    activeBoardId: string | null;
    activeCreatorId: string | null;
    isEditorOpen: boolean;
    selectedImageInfo: ImageInfo | null;
    showSuccessModal: boolean;
    finalImage: string | null;
    showCreationViewer: boolean;
    creationViewerIndex: number;
    creationViewerPins: Pin[];
    viewerSource: { type: string, id: string } | null;
    scrollPositions: { [key: string]: ScrollPositionState };
    setScrollPositions: React.Dispatch<React.SetStateAction<{ [key: string]: ScrollPositionState }>>;
    
    handleStart: () => void;
    handleTabSelect: (tab: string) => void;
    openBoard: (boardId: string) => void;
    openCreatorProfile: (creatorId: string) => void;
    openEditor: (info: ImageInfo, index: number, scrollTop?: number, renderedCount?: number) => void;
    openViewer: (pins: Pin[], index: number, source?: { type: string, id: string } | null) => void;
    handleBackToMain: () => void;
    handleGoHomeFromModal: () => void;
    setShowCreationViewer: React.Dispatch<React.SetStateAction<boolean>>;
    setFinalImage: React.Dispatch<React.SetStateAction<string | null>>;
    setShowSuccessModal: React.Dispatch<React.SetStateAction<boolean>>;
    
    // from useNotifications
    scheduleDailyReminder: (hour: number, minute: number) => Promise<boolean>;
    cancelDailyReminder: () => Promise<void>;
    checkPermissions: () => Promise<any>;
    requestPermissions: () => Promise<any>;
    reaffirmDailyReminder: (settings: { enabled: boolean; time: string; }) => Promise<void>;
    initNotificationListeners: (callback: () => void) => void;
    removeNotificationListeners: () => void;
    
    // Global functions
    shareImage: (imageDataUrl: string, shareDetails?: { isAchievement?: boolean; name?: string; }) => Promise<void>;
    downloadImage: (imageDataUrl: string) => Promise<void>;
    handleComplete: (
        imageDataUrl: string, 
        metadata: {
            sourceCategory: string;
            fontsUsed: string[];
            isVertical: boolean;
            imageSrc: string;
            editorData: any;
        }, 
        isPublic: boolean,
        title: string,
        description: string
    ) => void;
    handleEditorFontChange: (fontFamily: string) => void;
    handleEditFromViewer: (pin: Pin) => void;
    handleToggleFavorite: (pin: Pin) => void;

    // Accessibility
    accessibilitySettings: AccessibilitySettings;
    setAccessibilitySettings: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
    
    // In-App Purchases
    isPremiumUser: boolean;
    purchasePremium: () => Promise<void>;
    restorePurchases: () => Promise<void>;

    // Pin & Board Management
    pinToSave: Pin | null;
    openSaveModal: (pin: Pin) => void;
    closeSaveModal: () => void;
    handleCreateBoard: (boardName: string) => Promise<string>;
    handleSavePin: (pin: Pin, boardId: string) => void;
    handleDeletePin: (pinId: string) => void;
    handleRemovePinFromBoard: (pinId: string, boardId: string) => void;
    handleRenameBoard: (boardId: string, newName: string) => void;
    handleClearFavoritePins: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = AppContext.Provider;

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};