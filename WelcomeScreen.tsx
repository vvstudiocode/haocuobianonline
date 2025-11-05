/**
 * @file WelcomeScreen.tsx
 * @description
 * 首次開啟應用程式時顯示的歡迎畫面元件。
 * - 簡單介紹 App 的用途。
 * - 提供一個「開始使用」的按鈕，點擊後會將使用者導向主畫面，並且不再顯示此歡迎畫面。
 */
import React from 'react';

interface WelcomeScreenProps {
    onStart: () => void;
}

const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
    return React.createElement('div', { className: 'screen welcome-screen' },
        React.createElement('h1', null, '歡迎使用'),
        React.createElement('h1', null, '好厝邊'),
        React.createElement('h1', null, 'Haocuobian'),
        React.createElement('p', null, '一款專為厝邊隔壁設計的溫暖問候圖工具。'),
        React.createElement('p', null, '操作簡單，心意滿滿。'),
        React.createElement('button', { className: 'welcome-btn', onClick: onStart }, '我明白了，開始使用')
    );
};

export default WelcomeScreen;