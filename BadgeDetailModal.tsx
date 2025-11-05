/**
 * @file BadgeDetailModal.tsx
 * @description
 * 點擊榮譽牆上的徽章後，顯示其詳細資訊的彈出視窗元件。
 * - 顯示徽章的圖示、名稱、解鎖條件和可獲得的點數。
 * - 對於未解鎖的「隱藏成就」，會顯示神秘的提示訊息，而不是直接揭露解鎖條件。
 * - 根據徽章是否已解鎖，顯示不同狀態的圖示（彩色或灰色）。
 */
import React from 'react';

const BadgeDetailModal = ({ badge, isUnlocked, onClose }) => {
    
    const modalContentProps = { 
        className: 'modal-content detail-modal-content', 
        onClick: (e: React.MouseEvent) => e.stopPropagation() 
    };
    
    const isHiddenAndLocked = badge.hidden && !isUnlocked;

    return (
        React.createElement('div', { className: 'modal-overlay', onClick: onClose },
            React.createElement('div', modalContentProps,
                React.createElement('div', { className: `detail-modal-icon ${isUnlocked ? '' : 'locked'}` }, isUnlocked ? (badge.icon || '🏅') : (isHiddenAndLocked ? '❓' : '🔒')),
                React.createElement('h2', { className: 'detail-modal-name' }, isHiddenAndLocked ? '秘密成就' : badge.name),
                React.createElement('p', { className: 'detail-modal-description' }, isHiddenAndLocked ? '達成某個特殊條件即可解鎖。' : badge.description),
                React.createElement('p', { className: 'detail-modal-points' }, `+${badge.points} 點`),
                React.createElement('div', { className: 'modal-buttons' },
                    React.createElement('button', { className: 'modal-btn secondary', onClick: onClose }, '關閉')
                )
            )
        )
    );
};

export default BadgeDetailModal;
