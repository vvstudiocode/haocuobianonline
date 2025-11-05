/**
 * @file BottomNavBar.tsx
 * @description
 * 應用程式底部的導覽列元件。
 * - 提供五個主要分頁的切換按鈕：「首頁」、「作品」、「創作」、「最愛」和「我」。
 * - 根據目前所在的 activeTab 來高亮對應的圖示。
 * - 點擊「創作」分頁會觸發上傳圖片的功能，而點擊其他分頁則會切換對應的畫面。
 */
import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { useAuth } from './src/contexts/AuthContext.tsx';

const BottomNavBar = () => {
    const { activeTab, handleTabSelect, openEditor } = useAppContext();
    const { user } = useAuth();

    const handleAddClick = () => {
        if (!user) {
            alert('請先登入才能開始創作！');
            handleTabSelect('profile');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (typeof e.target?.result === 'string') {
                        openEditor({ src: e.target.result, isCreation: true, sourceCategory: 'upload' }, -1, 0);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const navItems = [
        { id: 'home', label: '首頁', icon: React.createElement('path', { d: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" }) },
        { id: 'search', label: '搜尋', icon: React.createElement('path', { d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" }) },
        { id: 'add', label: '建立', icon: React.createElement('path', { d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" }) },
        { id: 'profile', label: '個人資料', icon: React.createElement('path', { d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" }) }
    ];

    return (
        React.createElement('div', { className: 'bottom-nav' },
            navItems.map(item => {
                const isAddItem = item.id === 'add';
                const buttonProps = {
                    key: item.id,
                    className: `nav-item ${isAddItem ? 'add-item' : ''} ${!isAddItem && activeTab === item.id ? 'active' : ''}`,
                    onClick: isAddItem ? handleAddClick : () => handleTabSelect(item.id),
                    'aria-label': item.label
                };
                
                return React.createElement('button', buttonProps,
                    React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" }, item.icon),
                    React.createElement('span', { className: 'label' }, item.label)
                );
            })
        )
    );
};

export default BottomNavBar;