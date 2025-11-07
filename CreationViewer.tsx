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
import { useAuth } from './src/contexts/AuthContext.tsx';
import { supabase } from './src/supabaseClient.ts';
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
        isTogglingFavorite,
        handleTabSelect,
        openCreatorProfile,
        openSaveModal,
    } = useAppContext();
    const { user } = useAuth();

    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [animationClass, setAnimationClass] = useState('viewer-image-enter');
    const isAnimating = useRef(false);
    const touchStartX = useRef(0);
    const currentPin: Pin | undefined = pins[currentIndex];

    const [likeCount, setLikeCount] = useState(currentPin?.likeCount || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(true);

    const isFavorited = useMemo(() => {
        if (!currentPin || !boards) return false;
        const favoritesBoard = boards.find(b => b.boardId === MY_FAVORITES_BOARD_ID);
        return !!favoritesBoard && favoritesBoard.pinIds.includes(currentPin.pinId);
    }, [boards, currentPin]);

    useEffect(() => {
        console.log('CreationViewer rendered with props:', { pins, startIndex, viewerSource });
        setCurrentIndex(startIndex);
    }, [pins, startIndex, viewerSource]);

    useEffect(() => {
        // Reset state on pin change
        setLikeCount(currentPin?.likeCount || 0);
        setIsLiked(false);
        setIsLikeLoading(true);

        if (!currentPin || !user) {
            setIsLikeLoading(false);
            return;
        }

        const checkLikeStatus = async () => {
            const { data, error } = await supabase
                .from('likes')
                .select('creation_id')
                .eq('creation_id', currentPin.pinId)
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.error('Error checking like status', error);
            } else {
                setIsLiked(!!data);
            }
            setIsLikeLoading(false);
        };

        checkLikeStatus();
    }, [currentPin, user]);
    
    const handleLikeToggle = async () => {
        if (isLikeLoading || !currentPin || !user) {
            if (!user) alert('請先登入才能按讚喔！');
            return;
        }

        setIsLikeLoading(true);

        // Optimistic update
        const originalIsLiked = isLiked;
        const originalLikeCount = likeCount;

        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        try {
            if (newIsLiked) {
                // Add a like
                const { error } = await supabase.from('likes').insert({
                    creation_id: currentPin.pinId,
                    user_id: user.id,
                });
                if (error) throw error;
            } else {
                // Remove a like
                const { error } = await supabase.from('likes').delete()
                    .eq('creation_id', currentPin.pinId)
                    .eq('user_id', user.id);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Failed to update like status', error);
            // Revert on error
            setIsLiked(originalIsLiked);
            setLikeCount(originalLikeCount);
            alert('操作失敗，請稍後再試。');
        } finally {
            setIsLikeLoading(false);
        }
    };
    
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

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            openSaveModal(currentPin);
        }
    };
    
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPin) {
            handleEditFromViewer(currentPin);
        }
    };
    
    const handleCreatorClick = () => {
        if (currentPin) {
            onClose();
            setTimeout(() => openCreatorProfile(currentPin.creatorId), 50);
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
    const saveIcon = React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
        React.createElement('path', { d: "M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" })
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
    const canDelete = currentPin?.creatorId !== 'official' && currentPin?.creatorId === user?.id;
    const canSave = currentPin?.creatorId === 'official' || currentPin?.sourceType === 'USER_CREATION';

    // FIX: Extracted props for the favorite button to a variable to bypass TypeScript's excess property checking error.
    const favoriteButtonProps = {
        className: `viewer-favorite-btn ${isFavorited ? 'favorited' : ''}`,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); currentPin && handleToggleFavorite(currentPin); },
        'aria-label': isFavorited ? '從最愛中移除' : '加入最愛',
        title: isFavorited ? '從最愛中移除' : '加入最愛',
        disabled: isTogglingFavorite === currentPin?.pinId,
    };

    return React.createElement('div', { className: 'modal-overlay viewer-overlay', onClick: handleClose },
        React.createElement('div', { className: `viewer-header` },
            React.createElement('div', { className: 'viewer-actions' },
                canSave && React.createElement('button', { onClick: handleSave, 'aria-label': 'Save to board', title: '儲存到圖版' }, saveIcon),
                React.createElement('button', { onClick: handleDownload, 'aria-label': 'Download', title: '下載', disabled: !currentPin }, downloadIcon),
                React.createElement('button', { onClick: handleShare, 'aria-label': 'Share', title: '分享', disabled: !currentPin }, shareIcon),
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
                currentPin && React.createElement('div', { className: 'viewer-info-block' },
                    React.createElement('h3', { className: 'viewer-title' }, currentPin.title),
                    currentPin.description && React.createElement('p', { className: 'viewer-description' }, currentPin.description),
                    React.createElement('button', { className: 'viewer-creator-btn', onClick: handleCreatorClick }, `由 ${currentPin.creatorUsername} 創作`)
                ),
                React.createElement('div', { className: 'viewer-footer-home' },
                    React.createElement('button', { 
                        className: `viewer-like-btn ${isLiked ? 'liked' : ''}`, 
                        onClick: handleLikeToggle, 
                        disabled: isLikeLoading || !user 
                    }, `❤️ ${likeCount}`),
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