/**
 * @file AchievementModal.tsx
 * @description
 * 當使用者解鎖新成就或升級時顯示的慶祝彈窗元件。
 * - 接收解鎖的項目（徽章或等級）資訊。
 * - 使用 Canvas API 動態繪製一張包含成就圖示、標題和使用者暱稱的分享圖。
 * - 提供「分享喜悅」和「繼續」的按鈕。
 * - 支援一次顯示一個成就，以確保使用者能聚焦於當前的榮譽。
 */
import React from 'react';

const { useEffect, useRef, useState } = React;

const AchievementModal = ({ unlockedItems, userProfile, onClose, onShare }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [shareableImage, setShareableImage] = useState(null);
    const item = unlockedItems[0]; // Display one at a time for simplicity

    const drawCanvasContent = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;

        // Background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#fde49e');
        grad.addColorStop(1, '#e57a44');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Title text
        ctx.fillStyle = '#2d3a3a';
        ctx.textAlign = 'center';
        
        let icon, title, subtitle;

        if (item.type === 'level') {
            icon = item.icon;
            title = `等級提升！`;
            subtitle = `恭喜達到 ${item.name}`;
            ctx.font = 'bold 120px sans-serif'; // Level icon
            ctx.fillText(icon, width / 2, height * 0.4);
        } else { // badge
            icon = item.icon || '🏅';
            title = '新成就解鎖！';
            subtitle = `獲得徽章【${item.name}】`;
            ctx.font = 'bold 120px sans-serif'; // Badge icon
            ctx.fillText(icon, width / 2, height * 0.4);
        }
        
        ctx.font = 'bold 48px "Noto Sans TC"';
        ctx.fillText(title, width / 2, height * 0.6);

        ctx.font = '36px "Noto Sans TC"';
        ctx.fillText(subtitle, width / 2, height * 0.7);

        ctx.font = '28px "Noto Sans TC"';
        ctx.fillStyle = 'rgba(45, 58, 58, 0.8)';
        ctx.fillText(`${userProfile.nickname} 在「好厝邊」達成新目標`, width / 2, height * 0.85);
        
        // App Logo/Name at bottom
        ctx.font = 'bold 24px "Noto Sans TC"';
        ctx.fillStyle = '#fff';
        ctx.fillText('好厝邊 Haocuobian', width / 2, height * 0.95);

        setShareableImage(canvas.toDataURL('image/jpeg', 0.9));
    };

    useEffect(() => {
        // Set a timeout to ensure canvas is in the DOM and visible
        const timer = setTimeout(drawCanvasContent, 100);
        return () => clearTimeout(timer);
    }, [item, userProfile]);

    const handleShare = () => {
        if (shareableImage) {
            onShare(shareableImage, { isAchievement: true, name: item.name });
        }
    };
    
    // Close modal if there are no items
    useEffect(() => {
        if (!item) {
            onClose();
        }
    }, [item, onClose]);
    
    if (!item) return null;

    // FIX: Extracted props for the modal content div to a variable to bypass TypeScript's excess property checking error.
    const modalContentProps = {
        className: 'modal-content achievement-modal-content',
        onClick: (e: React.MouseEvent) => e.stopPropagation()
    };

    return (
        React.createElement('div', { className: 'modal-overlay', onClick: onClose },
            React.createElement('div', modalContentProps,
                React.createElement('div', { className: 'achievement-card' },
                    // FIX: Set canvas properties directly in `createElement` for idiomatic React and to fix TS errors.
                    React.createElement('canvas', {
                        ref: canvasRef,
                        className: 'achievement-canvas',
                        width: 512,
                        height: 512,
                    }),
                    React.createElement('h2', { className: 'achievement-title' }, item.type === 'level' ? `恭喜達到 ${item.name}！` : `獲得徽章【${item.name}】`),
                    React.createElement('div', { className: 'modal-buttons achievement-buttons' },
                        React.createElement('button', { className: 'modal-btn primary', onClick: handleShare }, '分享喜悅'),
                        React.createElement('button', { className: 'modal-btn secondary', onClick: onClose }, '繼續')
                    )
                )
            )
        )
    );
};

export default AchievementModal;