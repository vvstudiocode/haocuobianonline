
/**
 * @file App.tsx
 * @description
 * 應用程式的根元件，新增了首次啟動時自動設定提醒的邏輯。
 * - **【強化】** `useStorage` 鉤子的預設值被修改為 `{ enabled: true, time: '06:00' }`，為新使用者預設開啟提醒功能。
 * - **【核心功能】** 新增 `handleStartApp` 函式。此函式會在使用者點擊歡迎畫面的「開始使用」按鈕時觸發。
 * - **【流程】** `handleStartApp` 的執行流程如下
 * 1.  呼叫原有的 `navigationData.handleStart()`，將畫面從歡迎頁切換到主畫面。
 * 2.  立即檢查並請求本地通知的權限。
 * 3.  如果使用者**同意授權**：
 * - 會自動呼叫 `scheduleDailyReminder`，為使用者排程好未來三天的早上 6:00 提醒。
 * - 彈出一個友善的提示，告知使用者此預設功能，並引導他們可以在設定頁面中修改。
 * 4.  如果使用者**拒絕授權**：
 * - 會在背景默默地將提醒設定更新為 `enabled: false`，確保設定頁面的開關狀態與實際權限一致。
 * - **【最佳化】** 這個設計讓 App 在使用者同意時能「主動服務」，在使用者拒絕時能「安靜配合」，提供了流暢且尊重使用者選擇的初次體驗。
 */
import React from 'react';
import './index.css';
import { AppProvider } from './contexts/AppContext.tsx';
import { AuthProvider, useAuth } from './src/contexts/AuthContext.tsx';
import { supabase } from './src/supabaseClient.ts';
import { useStorage } from './hooks/useStorage.ts';
import { useUserProfile } from './hooks/useUserProfile.ts';
import { useNavigation } from './hooks/useNavigation.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import WelcomeScreen from './WelcomeScreen.tsx';
import HomeScreen from './HomeScreen.tsx';
import ProfileScreen from './ProfileScreen.tsx';
import SettingsScreen from './SettingsScreen.tsx';
import HonorWallScreen from './HonorWallScreen.tsx';
import BottomNavBar from './BottomNavBar.tsx';
import EditorScreen from './EditorScreen.tsx';
import SuccessModal from './SuccessModal.tsx';
import CreationViewer from './CreationViewer.tsx';
import AchievementModal from './AchievementModal.tsx';
import SearchScreen from './SearchScreen.tsx';
import SaveToBoardModal from './SaveToBoardModal.tsx';
import BoardScreen from './BoardScreen.tsx';
import CreatorProfileScreen from './CreatorProfileScreen.tsx';
// FIX: Import `MY_CREATIONS_KEY` to resolve reference error.
import { MY_CREATIONS_KEY, MY_FAVORITES_BOARD_ID, MY_FAVORITES_BOARD_NAME, NOTIFICATION_SETTINGS_KEY, ACCESSIBILITY_SETTINGS_KEY, PINS_KEY, BOARDS_KEY, CATEGORIES, convertCategoriesToPins, MY_CREATIONS_BOARD_ID } from './data.ts';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App as CapacitorApp } from '@capacitor/app';
import { ImageInfo, Pin, Board, User } from './types.ts';
import { getFromStorage } from './storage.ts';

// FIX: Define AccessibilitySettings type to ensure type safety with useStorage.
// This resolves a type mismatch with the AppContext, where accessibilitySettings.fontSize
// was being inferred as `string` instead of the required literal type '"standard" | "larger" | "largest"'.
interface AccessibilitySettings {
    fontSize: 'standard' | 'larger' | 'largest';
    highContrast: boolean;
}

const { useCallback, useEffect, useState } = React;

const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error.message === 'string') return error.message;
    try {
        // Attempt to extract a more specific message from Supabase errors
        if (error && error.details) return error.details;
        return JSON.stringify(error);
    } catch {
        return 'An unknown error occurred.';
    }
};

const urlToBase64 = (url: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (url.startsWith('data:image')) {
            resolve(url.split(',')[1]);
            return;
        }
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error converting URL to Base64:', error);
            reject(error);
        }
    });
};


const AppContent = () => {
    console.log('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    const { user } = useAuth();
    // These local states will be gradually phased out.
    const [creations, setCreations] = useStorage<string[]>(MY_CREATIONS_KEY, []);
    const [pins, setPins] = useStorage<Pin[]>(PINS_KEY, []);
    const [boards, setBoards] = useStorage<Board[]>(BOARDS_KEY, []);
    const [notificationSettings, setNotificationSettings] = useStorage(NOTIFICATION_SETTINGS_KEY, { enabled: true, time: '06:00' });
    const [accessibilitySettings, setAccessibilitySettings] = useStorage<AccessibilitySettings>(ACCESSIBILITY_SETTINGS_KEY, { fontSize: 'largest', highContrast: false });
    const [pinToSave, setPinToSave] = useState<Pin | null>(null);

    const userProfileData = useUserProfile();
    const navigationData = useNavigation();
    const notificationHandlers = useNotifications();

    const { view, activeTab, isEditorOpen, finalImage, showSuccessModal, showCreationViewer, selectedImageInfo, setFinalImage, setShowSuccessModal } = navigationData;
    const { userProfile, newlyUnlocked, setNewlyUnlocked, processAchievement } = userProfileData;

    const handleNotificationClick = useCallback(() => {
        navigationData.handleTabSelect('home');
    }, [navigationData]);

    useEffect(() => {
        const initializeApp = async () => {
            if (Capacitor.isNativePlatform()) {
                if (Capacitor.isPluginAvailable('LocalNotifications')) {
                    await LocalNotifications.createChannel({
                        id: 'reminders',
                        name: '每日提醒',
                        description: '用於早安問候的每日提醒',
                        importance: 4,
                        visibility: 1,
                        lights: true,
                        vibration: true,
                    });
                }
                
                notificationHandlers.initNotificationListeners(handleNotificationClick);
                if (view !== 'welcome') {
                    notificationHandlers.reaffirmDailyReminder(notificationSettings);
                }
            }
        };

        initializeApp();

        return () => {
            if (Capacitor.isNativePlatform()) {
                notificationHandlers.removeNotificationListeners();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    useEffect(() => {
        console.log('App.tsx - showCreationViewer state changed:', showCreationViewer);
    }, [showCreationViewer]);

    // --- Accessibility Settings Applier ---
    useEffect(() => {
        const root = document.documentElement;
        // Clean up previous classes
        root.classList.remove('font-size-larger', 'font-size-largest', 'high-contrast');

        // Apply font size class
        if (accessibilitySettings.fontSize === 'larger') {
            root.classList.add('font-size-larger');
        } else if (accessibilitySettings.fontSize === 'largest') {
            root.classList.add('font-size-largest');
        }

        // Apply high contrast class
        if (accessibilitySettings.highContrast) {
            root.classList.add('high-contrast');
        }
    }, [accessibilitySettings]);

    // --- Android Back Button Handler ---
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const backButtonHandler = () => {
                const { 
                    isEditorOpen, 
                    showCreationViewer, 
                    showSuccessModal, 
                    view, 
                    activeTab 
                } = navigationData;
    
                if (isEditorOpen) {
                    navigationData.handleBackToMain();
                } else if (showCreationViewer) {
                    navigationData.setShowCreationViewer(false);
                } else if (showSuccessModal) {
                    navigationData.handleGoHomeFromModal();
                } else if (newlyUnlocked.length > 0) {
                    setNewlyUnlocked(prev => prev.slice(1));
                } else if (pinToSave) {
                    setPinToSave(null);
                } else if (view === 'creator-profile') {
                    navigationData.handleTabSelect(activeTab);
                } else if (view === 'board') {
                    navigationData.handleTabSelect('profile');
                } else if (view === 'settings' || view === 'honor-wall') {
                    navigationData.handleTabSelect('profile');
                } else if (activeTab !== 'home') {
                    navigationData.handleTabSelect('home');
                } else {
                    CapacitorApp.exitApp();
                }
            };
            
            const listenerPromise = CapacitorApp.addListener('backButton', backButtonHandler);

            return () => {
                listenerPromise.then(listener => listener.remove());
            };
        }
        return () => {};
    }, [navigationData, newlyUnlocked, setNewlyUnlocked, pinToSave]);
    
    // --- Phase 1: Initialize Pins from Static Categories ---
    useEffect(() => {
        // This is now purely for legacy/offline mode.
        // The main content is fetched from Supabase.
        const existingPins = getFromStorage(PINS_KEY, []);
        if (existingPins.length === 0) {
            console.log('Initializing local pins from static categories for offline fallback...');
            const staticPins = convertCategoriesToPins(CATEGORIES);
            setPins(staticPins);
        }
    }, [setPins]);

    const handleStartApp = useCallback(async () => {
        navigationData.handleStart();

        if (Capacitor.isPluginAvailable('LocalNotifications')) {
            let status = await notificationHandlers.checkPermissions();
            if (status.display === 'prompt') {
                status = await notificationHandlers.requestPermissions();
            }

            if (status.display === 'granted') {
                const success = await notificationHandlers.scheduleDailyReminder(6, 0);
                if (success) {
                    setTimeout(() => {
                        alert('已為您預設開啟每日 06:00 的早安提醒！\n\n您隨時可以在「我」>「設定」頁面中調整或關閉。');
                    }, 1500);
                }
            } else {
                setNotificationSettings({ enabled: false, time: '06:00' });
            }
        }
    }, [navigationData, notificationHandlers, setNotificationSettings]);

    const shareImage = useCallback(async (
        imageUrl: string,
        shareDetails: { isAchievement?: boolean; name?: string } = { isAchievement: false }
    ) => {
        try {
            const text = shareDetails.isAchievement && shareDetails.name
                ? `我解鎖了「${shareDetails.name}」！快來『好厝邊』看看吧！`
                : '與您分享我的溫馨創作！';

            if (Capacitor.isPluginAvailable('Share')) {
                const base64Data = await urlToBase64(imageUrl);
                const fileName = `share_${Date.now()}.jpeg`;
                
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache,
                });
    
                const { uri } = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName,
                });

                await Share.share({
                    title: '來自「好厝邊」的分享',
                    text: text,
                    url: uri,
                    dialogTitle: '分享',
                });
            } else if (navigator.share) {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], 'creation.jpg', { type: blob.type });

                await navigator.share({
                    title: '來自「好厝邊」的分享',
                    text: text,
                    files: [file],
                });
            } else {
                alert('您的裝置不支援分享功能。');
                return;
            }

            if (!shareDetails.isAchievement) {
                processAchievement('share');
                navigationData.handleGoHomeFromModal();
            }
        } catch (error: any) {
             const errorMessage = (error && error.message) ? String(error.message) : '';
            if (error.name !== 'AbortError' && !errorMessage.toLowerCase().includes('cancel')) {
                 console.error('分享失敗:', error);
                 alert(`分享失敗: ${getErrorMessage(error)}`);
            }
        }
    }, [processAchievement, navigationData]);

    const downloadImage = useCallback(async (imageUrl: string) => {
        try {
            if (Capacitor.isNativePlatform()) {
                const base64Data = await urlToBase64(imageUrl);
                const fileName = `haocuobian_${Date.now()}.jpeg`;
                
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true,
                });
                
                alert('圖片已儲存至您裝置的文件資料夾中。');
            } else {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `haocuobian_${Date.now()}.jpeg`;
                link.click();
            }
            navigationData.handleGoHomeFromModal();
        } catch (error: any) {
            console.error('下載失敗:', error);
            alert(`下載失敗: ${getErrorMessage(error)}`);
        }
    }, [navigationData]);

    const handleComplete = useCallback(async (
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
    ) => {
        if (!user) {
            alert('請先登入以儲存您的作品。');
            navigationData.handleTabSelect('profile');
            return;
        }

        // TODO: Implement a proper loading indicator
        alert('正在儲存您的作品，請稍候...');

        try {
            // 1. Convert data URL to Blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // 2. Upload image to Supabase Storage
            const fileName = `${user.id}/${Date.now()}.jpeg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('CREATION-IMAGES')
                .upload(fileName, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'image/jpeg',
                });

            if (uploadError) {
                throw uploadError;
            }

            // 3. Get public URL
            const { data: urlData } = supabase.storage
                .from('CREATION-IMAGES')
                .getPublicUrl(uploadData.path);
            
            const imageUrl = urlData.publicUrl;

            // 4. Write metadata to 'creations' table
            const { data: creationData, error: insertError } = await supabase
                .from('creations')
                .insert({
                    user_id: user.id,
                    title: title.trim() || '我的創作',
                    description: description.trim() || '',
                    image_url: imageUrl,
                    is_public: isPublic,
                    editor_data: metadata.editorData,
                })
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            // 5. Automatically add the new creation to the "My Creations" board
            if (creationData) {
                await supabase.from('board_pins').insert({
                    board_id: MY_CREATIONS_BOARD_ID,
                    creation_id: creationData.id,
                });
            }

            setFinalImage(imageUrl);
            setShowSuccessModal(true);
            
            processAchievement('create', metadata);
            
            if (metadata.fontsUsed && metadata.fontsUsed.length > 0) {
                metadata.fontsUsed.forEach((font: string) => {
                     processAchievement('use_font', { fontFamily: font });
                });
            }
        } catch (error: any) {
            console.error('儲存作品失敗:', error);
            alert(`儲存作品失敗: ${getErrorMessage(error)}`);
        }
    }, [user, navigationData, processAchievement, setFinalImage, setShowSuccessModal]);
    
    const handleEditorFontChange = useCallback((fontFamily: string) => {
        processAchievement('use_font', { fontFamily });
    }, [processAchievement]);

    const handleDeletePin = async (pinIdToDelete: string) => {
        if (!user) return;
        if (!window.confirm('確定要永久刪除這張創作嗎？此操作也會將它從所有圖版中移除。')) return;

        try {
            // 1. Find the creation to get the image URL
            const { data: creation, error: fetchError } = await supabase
                .from('creations')
                .select('image_url')
                .eq('id', pinIdToDelete)
                .eq('user_id', user.id)
                .single();
            
            if (fetchError || !creation) {
                throw new Error('找不到要刪除的作品或您沒有權限。');
            }
            
            // 2. Delete the image from Storage
            const imageUrl = creation.image_url;
            const path = new URL(imageUrl).pathname.split('/CREATION-IMAGES/')[1];
            if (path) {
                const { error: storageError } = await supabase.storage.from('CREATION-IMAGES').remove([path]);
                if (storageError) console.error('刪除雲端圖片失敗:', storageError.message); // Log but continue
            }
            
            // 3. Delete the creation record from the 'creations' table
            // RLS and CASCADE should handle deleting from 'board_pins'
            const { error: deleteError } = await supabase
                .from('creations')
                .delete()
                .eq('id', pinIdToDelete);

            if (deleteError) throw deleteError;
            
            alert('刪除成功！');
            navigationData.setShowCreationViewer(false);
            // We can add a mechanism to trigger a refresh on the board/profile screen here
        } catch (error: any) {
            console.error('刪除作品失敗:', error);
            alert(`刪除作品失敗: ${getErrorMessage(error)}`);
        }
    };

    const handleRemovePinFromBoard = useCallback(async (pinId: string, boardId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('board_pins')
                .delete()
                .eq('board_id', boardId)
                .eq('creation_id', pinId)
                .eq('user_id', user.id);
            if (error) throw error;
            navigationData.setShowCreationViewer(false);
        } catch (error: any) {
            console.error('從圖版移除 Pin 失敗:', error);
            alert(`從圖版移除失敗: ${getErrorMessage(error)}`);
        }
    }, [user, navigationData]);

    const handleEditFromViewer = useCallback((pin: Pin) => {
        navigationData.setShowCreationViewer(false);
        // Assuming pin.editorData exists. For static images, it might be empty.
        const info: ImageInfo = { 
            src: pin.imageUrl, 
            isCreation: false, 
            sourceCategory: 'edit-pin', 
            editorData: pin.editorData 
        };
        navigationData.openEditor(info, -1, 0);
    }, [navigationData]);

    // FIX: Changed handleCreateBoard to return Promise<string> (the board ID) to match context type.
    const handleCreateBoard = useCallback(async (boardName: string): Promise<string> => {
        if (!user) {
            alert('請先登入以建立圖版');
            throw new Error('User not logged in');
        }

        const { data, error } = await supabase
            .from('boards')
            .insert({ name: boardName.trim(), user_id: user.id })
            .select('id')
            .single();

        if (error) {
            console.error('建立圖版失敗:', error);
            alert(`建立圖版失敗: ${getErrorMessage(error)}`);
            throw error;
        }

        if (!data?.id) {
            const creationError = new Error('Board creation returned no ID.');
            console.error(creationError);
            alert(`建立圖版失敗: ${getErrorMessage(creationError)}`);
            throw creationError;
        }
        
        return data.id;
    }, [user]);

    const handleSavePin = useCallback(async (pin: Pin, boardId: string) => {
        if (!user) return;

        try {
             // 1. Insert into board_pins
            const { error: insertError } = await supabase.from('board_pins').insert({
                board_id: boardId,
                creation_id: pin.pinId,
            });
            if (insertError) throw insertError;

            // 2. Check if the board has a cover and update if it doesn't
            const { data: boardData } = await supabase
                .from('boards')
                .select('cover_pin_url')
                .eq('id', boardId)
                .single();
            
            if (boardData && !boardData.cover_pin_url) {
                const { error: updateError } = await supabase
                    .from('boards')
                    .update({ cover_pin_url: pin.imageUrl })
                    .eq('id', boardId);
                if (updateError) console.error('更新圖版封面失敗:', updateError);
            }

            setPinToSave(null);
            alert('成功儲存！');

        } catch (error: any) {
            console.error('儲存 Pin 失敗:', error);
            alert(`儲存失敗: ${getErrorMessage(error)}`);
        }
    }, [user]);

    const handleToggleFavorite = useCallback(async (pin: Pin) => {
        if (!user) return;
        try {
            // Check if it's already a favorite
            const { data, error: checkError } = await supabase
                .from('board_pins')
                .select('id')
                .eq('board_id', MY_FAVORITES_BOARD_ID)
                .eq('creation_id', pin.pinId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (checkError) throw checkError;

            if (data) { // It exists, so unfavorite (delete)
                const { error: deleteError } = await supabase
                    .from('board_pins')
                    .delete()
                    .eq('id', data.id);
                if (deleteError) throw deleteError;
            } else { // It doesn't exist, so favorite (insert)
                await handleSavePin(pin, MY_FAVORITES_BOARD_ID);
                processAchievement('add_favorite');
            }
        } catch (error: any) {
            console.error('切換最愛狀態失敗:', error);
            alert(`操作失敗: ${getErrorMessage(error)}`);
        }
    }, [user, handleSavePin, processAchievement]);

    const handleRenameBoard = useCallback(async (boardId: string, newName: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('boards')
                .update({ name: newName })
                .eq('id', boardId)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error: any) {
            console.error('重新命名圖版失敗:', error);
            alert(`重新命名失敗: ${getErrorMessage(error)}`);
        }
    }, [user]);

    const handleClearFavoritePins = useCallback(async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('board_pins')
                .delete()
                .eq('board_id', MY_FAVORITES_BOARD_ID)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error: any) {
             console.error('清除最愛失敗:', error);
             alert(`清除失敗: ${getErrorMessage(error)}`);
        }
    }, [user]);
    
    const contextValue = {
        creations, setCreations,
        pins, setPins, // Kept for offline/legacy
        boards, setBoards, // Kept for offline/legacy
        ...userProfileData,
        ...navigationData,
        ...notificationHandlers,
        shareImage,
        downloadImage,
        handleComplete,
        handleEditorFontChange,
        handleEditFromViewer,
        accessibilitySettings,
        setAccessibilitySettings,
        pinToSave,
        openSaveModal: (pin: Pin) => setPinToSave(pin),
        closeSaveModal: () => setPinToSave(null),
        handleCreateBoard,
        handleSavePin,
        handleDeletePin,
        handleRemovePinFromBoard,
        handleToggleFavorite,
        handleRenameBoard,
        handleClearFavoritePins,
    };

    const renderMainContent = () => {
        switch (activeTab) {
            case 'home': return React.createElement(HomeScreen, { key: 'home' });
            case 'search': return React.createElement(SearchScreen, { key: 'search' });
            case 'profile': return React.createElement(ProfileScreen, { key: 'profile' });
            default: return React.createElement(HomeScreen, { key: 'default-home' });
        }
    };
    
    if (view === 'welcome') {
        return React.createElement(WelcomeScreen, { onStart: handleStartApp });
    }

    return (
        React.createElement(AppProvider, { value: contextValue },
            React.createElement('div', { className: 'app-container' },
                view === 'main' && renderMainContent(),
                view === 'board' && React.createElement(BoardScreen, null),
                view === 'creator-profile' && React.createElement(CreatorProfileScreen, null),
                view === 'settings' && React.createElement(SettingsScreen, { onBack: () => navigationData.handleTabSelect('profile') }),
                view === 'honor-wall' && React.createElement(HonorWallScreen, { onBack: () => navigationData.handleTabSelect('profile') }),
                isEditorOpen && selectedImageInfo && React.createElement(EditorScreen, {
                    imageInfo: selectedImageInfo,
                    onClose: navigationData.handleBackToMain,
                    onComplete: handleComplete,
                    onFontChange: handleEditorFontChange,
                }),
                !isEditorOpen && React.createElement(BottomNavBar, null),
                showSuccessModal && finalImage && React.createElement(SuccessModal, {
                    onShare: () => shareImage(finalImage),
                    onHome: navigationData.handleGoHomeFromModal,
                    onDownload: () => downloadImage(finalImage)
                }),
                showCreationViewer && React.createElement(CreationViewer, {
                    onClose: () => navigationData.setShowCreationViewer(false),
                    onDelete: handleDeletePin
                }),
                newlyUnlocked.length > 0 && React.createElement(AchievementModal, {
                    unlockedItems: newlyUnlocked,
                    userProfile: userProfile,
                    onClose: () => setNewlyUnlocked(prev => prev.slice(1)),
                    onShare: shareImage
                }),
                pinToSave && React.createElement(SaveToBoardModal, null)
            )
        )
    );
};

const App = () => {
    // --- Deep Link Handler for Auth Callback ---
    // FIX: Replaced the previous `window.location.hash` assignment with a more robust
    // method that directly calls `supabase.auth.setSession`. This avoids race conditions
    // where the Supabase client might not have initialized its hash change listener
    // in time, which was the likely cause of the persistent white screen issue.
    React.useEffect(() => {
        // This effect runs only on native platforms to handle OAuth redirects.
        if (Capacitor.isNativePlatform()) {
            const listenerPromise = CapacitorApp.addListener('appUrlOpen', (data) => {
                const url = new URL(data.url);
                const hash = url.hash.substring(1); // Remove the leading '#'
                if (hash) {
                    const params = new URLSearchParams(hash);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        // Directly set the session in the Supabase client.
                        // This will trigger the onAuthStateChange listener in AuthContext
                        // and complete the login process reliably.
                        supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                    } else {
                        // Fallback for other types of deep links or if tokens are missing.
                        console.warn('Deep link opened but no auth tokens found in hash.', data.url);
                    }
                }
            });

            // Clean up the listener when the component unmounts.
            return () => {
                listenerPromise.then(listener => listener.remove());
            };
        }
        return () => {}; // Return an empty cleanup function for non-native platforms.
    }, []);

    return (
        React.createElement(AuthProvider, null,
            React.createElement(AppContent, null)
        )
    );
};

// FIX: Add default export to make the App component available for import in other files.
export default App;
