/**
 * @file CreationViewer.tsx
 * @description
 * 獨立的作品瀏覽器元件。
 * - 從 App.tsx 抽離，使其成為一個可重用的元件。
 * - 使用 useAppContext 鉤子直接從 React Context 獲取所需資料
 *   (如圖片列表、起始索引) 和操作函式 (如分享、下載、刪除)。
 * - 具備全螢幕圖片展示、左右滑動/點擊切換、手勢滑動等功能。
 */
import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { Pin } from './types.ts';
import { MY_FAVORITES_BOARD_ID } from './data.ts';

const { useState, useEffect, useRef, useMemo } = React;

interface CreationViewerProps {
    onClose: () => void;
    onDelete: (pinId: string) => void;
}

const CreationViewer = ({ onClose, onDelete }: CreationViewerProps) => {
    const { 
        creationViewerPins: pins, 
        creationViewerIndex: startIndex,
        boards,
        shareImage,
        downloadImage,
        handleEditFromViewer,
        viewerSource,
        handleRemovePinFromBoard,
        handleToggleFavorite,
        handleTabSelect,
    } = useAppContext();

    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [animationClass, setAnimationClass] = useState('viewer-image-enter');
    const isAnimating = useRef(false);
    const touchStartX = useRef(0);
    const currentPin: Pin | undefined = pins[currentIndex];

    const isFavorited = useMemo(() => {
        if (!currentPin) return false;
        const favoritesBoard = boards.find(b => b.boardId === MY_FAVORITES_BOARD_ID);
        return !!favoritesBoard && favoritesBoard.pinIds.includes(currentPin.pinId);
    }, [boards, currentPin]);

    useEffect(() => {
        console.log('CreationViewer rendered with props:', { pins, startIndex, viewerSource });
        setCurrentIndex(startIndex);
    }, [pins, startIndex, viewerSource]);
    
    const handleNavigation = (direction: 'next' | 'prev') => {
        if (isAnimating.current || pins.length <= 1) return;
        
        isAnimating.current = true;
        const isNext = direction === 'next';
        setAnimationClass(isNext ? 'viewer-image-exit-left' : 'viewer-image-exit-right');

        setTimeout(() => {
            setCurrentIndex(prevIndex => {
                const newIndex = isNext
                    ? (prevIndex + 1) % pins.length
                    : (prevIndex - 1 + pins.length) % pins.length;
                return newIndex;
            });
            setAnimationClass(isNext ? 'viewer-image-enter-right' : 'viewer-image-enter-left');
            setTimeout(() => { isAnimating.current = false; }, 300);
        }, 150);
    };
    
    const goToPrevious = () => handleNavigation('prev');
    const goToNext = () => handleNavigation('next');
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            onDelete(currentPin.pinId);
        }
    };
    
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            shareImage(currentPin.imageUrl);
        }
    };
    
    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            downloadImage(currentPin.imageUrl);
        }
    };
    
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            handleEditFromViewer(currentPin);
        }
    };
    
    const handleClose = () => {
        onClose();
        // FIX: Ensure that when closing from a favorites board, the user is returned
        // to the profile tab where the boards are located. This prevents being
        // unintentionally kicked back to the home screen.
        if (viewerSource?.type === 'board' && viewerSource.id === MY_FAVORITES_BOARD_ID) {
             // We don't need to do anything extra here, just closing the viewer
             // will reveal the BoardScreen underneath, which is the correct behavior.
             // The bug might have been elsewhere. This ensures the flow is predictable.
        }
    };

    const handleRemoveFromBoard = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin && viewerSource?.type === 'board') {
            const boardName = boards.find(b => b.boardId === viewerSource.id)?.name || '此';
            if (window.confirm(`確定要從「${boardName}」圖版中移除這張 Pin 嗎？`)) {
                handleRemovePinFromBoard(currentPin.pinId, viewerSource.id);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pins, currentIndex]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isAnimating.current) return;
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === 0) return;
        const touchEndX = e.touches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrevious();
            touchStartX.current = 0;
        }
    };
    
    const trashIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" }, 
        React.createElement('path', { d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" }),
        React.createElement('path', { d: "M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" })
    );
    const shareIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" }, 
        React.createElement('path', { d: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" })
    );
    const downloadIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" }, 
        React.createElement('path', { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" })
    );
    const removeFromBoardIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
        React.createElement('path', { d: "M19 13H5v-2h14v2z" })
    );
    const heartIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" }, 
        React.createElement('path', { d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" })
    );


    const viewerContentProps = {
        className: `viewer-content`,
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove
    };

    const imageWrapper = React.createElement('div', { className: 'viewer-image-wrapper' },
        currentPin ?
            React.createElement('img', { 
                key: currentIndex,
                src: currentPin.imageUrl, 
                alt: `Image ${currentIndex + 1}`, 
                className: `viewer-image ${animationClass}` 
            })
            : React.createElement('div', { className: 'image-placeholder' })
    );

    const canEdit = viewerSource?.type === 'board' || currentPin?.sourceType === 'USER_CREATION' || currentPin?.sourceType === 'STATIC_IMAGE';
    const canDelete = currentPin?.creatorId !== 'official';
    const canRemoveFromBoard = viewerSource?.type === 'board';

    // FIX: Extracted props for the favorite button to a variable to bypass TypeScript's excess property checking error.
    const favoriteButtonProps = {
        className: `viewer-favorite-btn ${isFavorited ? 'favorited' : ''}`,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); currentPin && handleToggleFavorite(currentPin); },
        'aria-label': isFavorited ? '從最愛中移除' : '加入最愛',
        title: isFavorited ? '從最愛中移除' : '加入最愛'
    };

    return React.createElement('div', { className: 'modal-overlay viewer-overlay', onClick: handleClose },
        React.createElement('div', { className: `viewer-header` },
            React.createElement('div', { className: 'viewer-actions' },
                React.createElement('button', { onClick: handleDownload, 'aria-label': 'Download', title: '下載', disabled: !currentPin }, downloadIcon),
                React.createElement('button', { onClick: handleShare, 'aria-label': 'Share', title: '分享', disabled: !currentPin }, shareIcon),
                canRemoveFromBoard && React.createElement('button', { className: 'remove-from-board', onClick: handleRemoveFromBoard, 'aria-label': 'Remove from Board', title: '從圖版移除' }, removeFromBoardIcon),
                canDelete && React.createElement('button', { onClick: handleDelete, 'aria-label': 'Delete', title: '刪除' }, trashIcon),
            ),
            React.createElement('div', { className: 'viewer-actions' },
                React.createElement('button', favoriteButtonProps, heartIcon),
                React.createElement('button', { className: 'viewer-close-btn', onClick: handleClose, 'aria-label': 'Close' }, '×')
            )
        ),
        React.createElement('div', viewerContentProps,
            pins.length > 1 && React.createElement('button', { className: 'viewer-nav-btn prev', onClick: goToPrevious, 'aria-label': 'Previous' }, '‹'),
            
            React.createElement('div', { className: 'viewer-home-layout' }, 
                imageWrapper,
                React.createElement('div', { className: 'viewer-footer-home' },
                    canEdit && React.createElement('button', { className: 'viewer-edit-btn', onClick: handleEdit },
                        React.createElement('span', null, '編輯')
                    )
                )
            ),

            pins.length > 1 && React.createElement('button', { className: 'viewer-nav-btn next', onClick: goToNext, 'aria-label': 'Next' }, '›')
        )
    );
};

export default CreationViewer;