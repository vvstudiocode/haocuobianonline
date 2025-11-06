/**
 * @file SettingsScreen.tsx
 * @description
 * 最終版本的設定頁面元件。
 * - **【清理】** 移除了用於診斷目的的「發送測試通知」按鈕及其對應的 `handleTestNotification` 函式，使介面更簡潔。
 * - **【修正】** 將 `useStorage` 鉤子的預設值修改為 `{ enabled: true, time: '06:00' }`，確保新使用者在安裝 App 後，每日提醒功能會預設開啟。
 * - **【保留】** 核心的開關、時間選擇、資料管理等功能保持不變，提供穩定且完整的設定選項。
 */
import React from 'react';
import { MY_CREATIONS_KEY, NOTIFICATION_SETTINGS_KEY } from './data.ts';
import InfoModal from './InfoModal.tsx';
import { useAppContext } from './contexts/AppContext.tsx';
import { useStorage } from './hooks/useStorage.ts';
import { Capacitor } from '@capacitor/core';

const { useState, useEffect } = React;

interface SettingsScreenProps {
    onBack: () => void;
}

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
    const { 
      setCreations, 
      handleClearFavoritePins,
      scheduleDailyReminder,
      cancelDailyReminder,
      checkPermissions,
      requestPermissions,
      accessibilitySettings,
      setAccessibilitySettings,
    } = useAppContext();
    const [modalContent, setModalContent] = useState(null);
    const [notificationSettings, setNotificationSettings] = useStorage(NOTIFICATION_SETTINGS_KEY, {
        enabled: true,
        time: '06:00',
    });

    useEffect(() => {
      const checkCurrentPermission = async () => {
        if (Capacitor.isPluginAvailable('LocalNotifications')) {
          const status = await checkPermissions();
          if (status.display !== 'granted' && notificationSettings.enabled) {
            setNotificationSettings(prev => ({ ...prev, enabled: false }));
          }
        }
      };
      checkCurrentPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleNotifications = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const wantsToEnable = event.target.checked;

        if (!wantsToEnable) {
            await cancelDailyReminder();
            setNotificationSettings(prev => ({ ...prev, enabled: false }));
            alert('每日提醒已關閉。');
            return;
        }

        if (!Capacitor.isPluginAvailable('LocalNotifications')) {
            alert('此裝置不支援通知功能。');
            return;
        }

        let status = await checkPermissions();

        if (status.display === 'prompt') {
            status = await requestPermissions();
        }

        if (status.display === 'granted') {
            const [hour, minute] = notificationSettings.time.split(':').map(Number);
            const success = await scheduleDailyReminder(hour, minute);
            if (success) {
                setNotificationSettings(prev => ({ ...prev, enabled: true }));
                alert(`設定成功！\n每日提醒將於 ${notificationSettings.time} 為您送上問候。`);
            } else {
                alert('設定失敗，請稍後再試。');
            }
        } else {
             if (Capacitor.isNativePlatform()) {
                alert('您需要授權通知權限才能開啟此功能。\n\n請前往您裝置的「設定」 > 「好厝邊」 > 「通知」，手動允許通知後再試一次。');
            } else {
                alert('您的瀏覽器已封鎖通知，請檢查瀏覽器設定。');
            }
        }
    };


    const handleTimeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = event.target.value;
        setNotificationSettings(prev => ({ ...prev, time: newTime }));

        if (notificationSettings.enabled) {
            const status = await checkPermissions();
             if (status.display === 'granted') {
                const [hour, minute] = newTime.split(':').map(Number);
                await scheduleDailyReminder(hour, minute);
                alert(`提醒時間已更新為 ${newTime}`);
             }
        }
    };

    const handleClearCreations = () => {
        if (window.confirm('確定要清除所有「我的作品」嗎？此操作無法復原。')) {
            setCreations([]);
            alert('「我的作品」已清除。');
        }
    };

    const handleClearFavorites = () => {
        if (window.confirm('確定要清除所有「我的最愛」嗎？此操作無法復原。')) {
            handleClearFavoritePins();
            alert('「我的最愛」已清除。');
        }
    };
    
    const handleClearAll = () => {
        if (window.confirm('【高風險】確定要清除所有 App 資料嗎？這會刪除您的所有作品、最愛、暱稱和成就進度，且無法復原。')) {
            localStorage.clear();
            cancelDailyReminder();
            alert('所有資料已清除，應用程式將重新載入。');
            window.location.reload();
        }
    };

    const handleFontSizeChange = (size: 'standard' | 'larger' | 'largest') => {
        setAccessibilitySettings(prev => ({ ...prev, fontSize: size }));
    };

    const handleHighContrastToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAccessibilitySettings(prev => ({ ...prev, highContrast: event.target.checked }));
    };

    const getModalContent = (type: string) => {
        switch (type) {
            case 'tutorial':
                return {
                    title: '簡易教學',
                    content: React.createElement('div', null,
                        React.createElement('h4', null, '1. 選擇背景'),
                        React.createElement('p', null, '在「首頁」，您可以從圖庫分類中挑選圖片。點擊底部導覽列的「創作」按鈕，則可上傳您自己的照片。'),
                        React.createElement('h4', null, '2. 編輯文字'),
                        React.createElement('ul', null,
                            React.createElement('li', null, React.createElement('strong', null, '新增/選取：'), '點擊「+ 新增文字」來加入文字。直接點擊畫布上的文字即可選取。'),
                            React.createElement('li', null, React.createElement('strong', null, '修改：'), '選取文字後，下方會出現編輯工具，您可以修改內容、顏色、字體、大小和角度。'),
                            React.createElement('li', null, React.createElement('strong', null, '移動/縮放/旋轉：'), '直接拖曳文字來移動。用兩根手指可同時縮放和旋轉文字。'),
                            React.createElement('li', null, React.createElement('strong', null, '刪除：'), '選取文字後，點擊紅色的「刪除文字」按鈕。')
                        ),
                        React.createElement('h4', null, '3. 完成創作'),
                        React.createElement('p', null, '編輯完成後，點擊右上角的「完成」。圖片將自動儲存至您的裝置，並同步保存至 App內的「我的作品」。'),
                        React.createElement('h4', null, '4. 瀏覽與分享'),
                        React.createElement('p', null, '您可以在「作品」或「最愛」頁面中找到您的創作與收藏。點擊圖片可進行分享或刪除。'),
                         React.createElement('h4', null, '5. 成就系統'),
                        React.createElement('p', null, '在「我」的頁面中，您可以查看您的等級、任務與成就。完成特定目標可獲得點數與徽章！')
                    )
                };
            case 'about':
                return {
                    title: '關於好厝邊',
                    content: React.createElement('div', null,
                        React.createElement('p', null, '「好厝邊」，台語「厝邊隔壁」的意思，代表著鄰里間的溫暖問候與互相關懷。'),
                        React.createElement('p', null, '在這個快節奏的數位時代，我們希望能提供一個簡單、溫暖的方式，讓每個人都能輕鬆製作充滿心意的問候圖，將關懷與祝福傳遞給生命中重要的人。'),
                        React.createElement('p', null, '感謝您的使用，願您與厝邊隔壁的親友，常常聯繫，互相關心。')
                    )
                };
            case 'privacy':
                 return {
                    title: '隱私權政策',
                    content: React.createElement('div', null,
                        React.createElement('p', null, '最後更新日期：2024年7月1日'),
                        React.createElement('p', null, '「好厝邊 Haocuobian」高度重視您的隱私權。本應用程式的所有操作皆在您的裝置上完成，我們承諾：'),
                        React.createElement('ul', null,
                            React.createElement('li', null, React.createElement('strong', null, '不收集個人資料：'), '我們不會收集、儲存或傳輸任何可用於識別您個人身份的資訊。'),
                            React.createElement('li', null, React.createElement('strong', null, '所有資料本機儲存：'), '您上傳的照片、創作的作品、收藏的圖片、暱稱及成就進度，全部儲存在您裝置的瀏覽器本機儲存空間中。這些資料不會上傳到任何伺服器。'),
                            React.createElement('li', null, React.createElement('strong', null, '無追蹤行為：'), '本應用不包含任何使用者行為追蹤或分析工具。')
                        ),
                         React.createElement('p', null, '您的信任是我們的最大資產。您可以安心使用「好厝邊 Haocuobian」進行創作。')
                    )
                };
            case 'notification-help':
                return {
                    title: '解決通知問題',
                    content: React.createElement('div', null,
                        React.createElement('p', null, '為確保您能準時收到每日提醒，部分手機（特別是三星、小米、華為等品牌）可能需要手動調整電池設定。'),
                        React.createElement('h4', null, '為什麼會這樣？'),
                        React.createElement('p', null, '為了延長電池壽命，您的手機系統會自動將不常使用的應用程式設為「深度睡眠」，這會導致 App 無法在背景執行，也就收不到預先排程好的通知。'),
                        React.createElement('h4', null, '建議設定步驟（以三星為例）：'),
                        React.createElement('ol', { style: { paddingLeft: '20px', textAlign: 'left', listStyle: 'decimal', margin: '10px 0' } },
                            React.createElement('li', null, '開啟手機的「設定」。'),
                            React.createElement('li', null, '進入「應用程式」。'),
                            React.createElement('li', null, '在列表中找到「好厝邊」。'),
                            React.createElement('li', null, '點擊進入，並找到「電池」選項。'),
                            React.createElement('li', null, '將電池用量設定從「已最佳化」改為「不受限制」。')
                        ),
                        React.createElement('p', { style: { marginTop: '15px' }}, '完成此設定後，即可大幅提升通知的準時性。不同品牌手機的設定路徑可能稍有不同，但關鍵都是找到並關閉 App 的電池優化。')
                    )
                };
            default:
                return null;
        }
    };
    
    const openModal = (type: string) => setModalContent(getModalContent(type));

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'screen page-screen' },
            React.createElement('div', { className: 'page-header' },
                React.createElement('button', { className: 'header-btn back-btn', onClick: onBack }, '< 返回個人')
            ),
            React.createElement('div', { className: 'settings-content' },
                React.createElement('div', { className: 'settings-section' },
                    React.createElement('h3', null, '每日提醒'),
                    React.createElement('div', { className: 'notification-setting' },
                        React.createElement('label', { htmlFor: 'reminder-toggle' }, '早安問候提醒'),
                        React.createElement('label', { className: 'toggle-switch' },
                            React.createElement('input', {
                                type: 'checkbox',
                                id: 'reminder-toggle',
                                checked: notificationSettings.enabled,
                                onChange: handleToggleNotifications,
                            }),
                            React.createElement('span', { className: 'toggle-slider' })
                        )
                    ),
                    React.createElement('div', { className: 'notification-setting' },
                        React.createElement('label', { htmlFor: 'reminder-time' }, '提醒時間'),
                        React.createElement('input', {
                            type: 'time',
                            id: 'reminder-time',
                            value: notificationSettings.time,
                            onChange: handleTimeChange,
                            disabled: !notificationSettings.enabled
                        })
                    ),
                    React.createElement('div', { className: 'notification-help-text' },
                        '收不到通知嗎？',
                        React.createElement('button', { 
                            onClick: () => openModal('notification-help'), 
                            className: 'text-link-button'
                        }, '點此查看解決方法')
                    )
                ),
                 React.createElement('div', { className: 'settings-section' },
                    React.createElement('h3', null, '視覺與介面'),
                    React.createElement('div', { className: 'setting-option' },
                        React.createElement('label', null, '字體大小'),
                        React.createElement('div', { className: 'segmented-control' },
                            React.createElement('button', {
                                className: accessibilitySettings.fontSize === 'standard' ? 'active' : '',
                                onClick: () => handleFontSizeChange('standard')
                            }, '標準'),
                            React.createElement('button', {
                                className: accessibilitySettings.fontSize === 'larger' ? 'active' : '',
                                onClick: () => handleFontSizeChange('larger')
                            }, '稍大'),
                            React.createElement('button', {
                                className: accessibilitySettings.fontSize === 'largest' ? 'active' : '',
                                onClick: () => handleFontSizeChange('largest')
                            }, '最大')
                        )
                    ),
                    React.createElement('div', { className: 'notification-setting' },
                        React.createElement('label', { htmlFor: 'contrast-toggle' }, '高對比度模式'),
                         React.createElement('label', { className: 'toggle-switch' },
                            React.createElement('input', {
                                type: 'checkbox',
                                id: 'contrast-toggle',
                                checked: accessibilitySettings.highContrast,
                                onChange: handleHighContrastToggle,
                            }),
                            React.createElement('span', { className: 'toggle-slider' })
                        )
                    )
                ),
                React.createElement('div', { className: 'settings-section' },
                    React.createElement('h3', null, '說明'),
                    React.createElement('button', { className: 'settings-button', onClick: () => openModal('tutorial') }, '簡易教學'),
                    React.createElement('button', { className: 'settings-button', onClick: () => openModal('about') }, '關於好厝邊'),
                    React.createElement('button', { className: 'settings-button', onClick: () => openModal('privacy') }, '隱私權政策')
                ),
                React.createElement('div', { className: 'settings-section' },
                    React.createElement('h3', null, '資料管理'),
                    React.createElement('button', { className: 'settings-button danger', onClick: handleClearCreations }, '清除我的作品'),
                    React.createElement('button', { className: 'settings-button danger', onClick: handleClearFavorites }, '清除我的最愛'),
                    React.createElement('button', { className: 'settings-button danger', onClick: handleClearAll }, '清除所有資料並重設 App')
                ),
                React.createElement('div', { className: 'settings-section' },
                    React.createElement('h3', null, 'App 版本'),
                    React.createElement('p', null, '好厝邊 Haocuobian v1.1.0')
                )
            )
        ),
        modalContent && React.createElement(InfoModal, { 
            title: modalContent.title, 
            onClose: () => setModalContent(null),
            children: modalContent.content
        })
    );
};

export default SettingsScreen;