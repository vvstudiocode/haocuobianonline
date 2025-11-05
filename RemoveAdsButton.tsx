/**
 * @file RemoveAdsButton.tsx
 * @description A component that displays a button to remove ads and handles the upgrade modal flow.
 */
import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';

const { useState } = React;

const PremiumModal = ({ onClose, onUpgrade }: { onClose: () => void, onUpgrade: () => void }) => {
    return (
        React.createElement('div', { className: 'modal-overlay' },
            React.createElement('div', { className: 'modal-content premium-modal-content' },
                React.createElement('div', { className: 'modal-icon' }, '✨'),
                React.createElement('h2', { className: 'modal-title' }, '升級至尊榮會員'),
                React.createElement('p', { className: 'modal-subtitle' }, 
                    '享受無廣告的清爽體驗！您的支持能讓我們持續改進「好厝邊」，帶來更多溫暖的功能。'
                ),
                React.createElement('div', { className: 'modal-buttons' },
                    React.createElement('button', { className: 'modal-btn primary', onClick: onUpgrade }, '立即升級'),
                    React.createElement('button', { className: 'modal-btn secondary', onClick: onClose }, '稍後再說')
                )
            )
        )
    );
};

const RemoveAdsButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { purchasePremium } = useAppContext();

    const handleUpgradeClick = () => {
        setIsModalOpen(false);
        purchasePremium();
    };

    return (
        React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'remove-ads-container' },
                React.createElement('button', { 
                    className: 'remove-ads-button',
                    onClick: () => setIsModalOpen(true)
                }, '💎 移除廣告')
            ),
            isModalOpen && React.createElement(PremiumModal, {
                onClose: () => setIsModalOpen(false),
                onUpgrade: handleUpgradeClick
            })
        )
    );
};

export default RemoveAdsButton;
