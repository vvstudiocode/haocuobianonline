/**
 * @file LevelListModal.tsx
 * @description
 * 顯示所有使用者等級列表的彈出視窗元件。
 * - 從 data.ts 中讀取所有等級設定 (LEVELS)。
 * - 以列表形式展示每個等級的圖示、名稱和所需點數。
 * - 特別高亮顯示使用者目前的等級，讓使用者清楚了解自己的所在位置。
 */
import React from 'react';
// FIX: Import getLevelInfo from data.ts
import { LEVELS, getLevelInfo } from './data.ts';

const LevelListModal = ({ userPoints, onClose }) => {
    
    const modalContentProps = { 
        className: 'modal-content', 
        onClick: (e: React.MouseEvent) => e.stopPropagation() 
    };

    const currentUserLevel = getLevelInfo(userPoints).level;

    return (
        React.createElement('div', { className: 'modal-overlay', onClick: onClose },
            React.createElement('div', modalContentProps,
                React.createElement('h2', { className: 'modal-title' }, '祝福之路等級'),
                React.createElement('div', { className: 'level-list-modal-body' },
                    LEVELS.map(levelInfo => {
                        const isCurrent = levelInfo.level === currentUserLevel;
                        return React.createElement('div', { 
                            key: levelInfo.level,
                            className: `level-item ${isCurrent ? 'current' : ''}`
                        },
                            React.createElement('span', { className: 'level-icon' }, levelInfo.icon),
                            React.createElement('span', { className: 'level-name' }, `Lv. ${levelInfo.level} ${levelInfo.name}`),
                            React.createElement('span', { className: 'level-points' }, `${levelInfo.points} 點`)
                        )
                    })
                ),
                React.createElement('div', { className: 'modal-buttons' },
                    React.createElement('button', { className: 'modal-btn secondary', onClick: onClose }, '關閉')
                )
            )
        )
    );
};

export default LevelListModal;
