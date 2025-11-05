/**
 * @file FavoritesScreen.tsx
 * @description
 * 「我的最愛」頁面元件。
 * - 以網格佈局展示所有使用者從主圖庫中收藏的背景圖片。
 * - 如果沒有收藏，則顯示提示訊息。
 * - 每張圖片上都有一個心形按鈕，讓使用者可以將其從最愛中移除。
 * - 點擊任一圖片會開啟全螢幕的圖片瀏覽器 (CreationViewer)。
 */
import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import RemoveAdsButton from './RemoveAdsButton.tsx';
// FIX: Import Pin type and MY_FAVORITES_BOARD_ID for new data structure.
import { Pin } from './types.ts';
import { MY_FAVORITES_BOARD_ID } from './data.ts';

const { useMemo } = React;

const FavoritesScreen = () => {
    // FIX: Destructure boards, pins, and handleToggleFavorite instead of deprecated favorites/setFavorites.
    const { boards, pins, handleToggleFavorite, openViewer, handleTabSelect, isPremiumUser } = useAppContext();

    // FIX: Derive favorite pins from the dedicated "My Favorites" board.
    const favoritePins = useMemo<Pin[]>(() => {
        const favoritesBoard = boards.find(b => b.boardId === MY_FAVORITES_BOARD_ID);
        if (!favoritesBoard) return [];
        return favoritesBoard.pinIds
            .map(pinId => pins.find(p => p.pinId === pinId))
            .filter((pin): pin is Pin => !!pin);
    }, [boards, pins]);

    const renderContent = () => {
        // FIX: Check length of derived favoritePins array.
        if (favoritePins.length === 0) {
            return React.createElement('div', { className: 'empty-grid-message' }, 
                '您還沒有收藏任何圖片。',
                React.createElement('button', { 
                    className: 'cta-button',
                    onClick: () => handleTabSelect('home')
                }, '前往首頁圖庫逛逛')
            );
        }

        return React.createElement('div', { className: 'image-grid' },
            // FIX: Iterate over the array of Pin objects.
            favoritePins.map((pin, index) => {
                const buttonProps = {
                    className: 'favorite-btn favorited',
                    onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        // FIX: Use the global handleToggleFavorite function from context.
                        handleToggleFavorite(pin);
                    },
                    'aria-label': 'Remove from Favorites',
                    title: '從最愛移除'
                };
                return React.createElement('div', {
                    // FIX: Use stable pinId for the key.
                    key: pin.pinId,
                    className: 'image-grid-item',
                    onClick: () => {
                        // FIX: Pass the correct array of Pin objects to the viewer.
                        openViewer(favoritePins, index);
                    },
                    role: 'button',
                    'aria-label': `Select favorite ${index + 1}`
                },
                    React.createElement('img', {
                        // FIX: Use imageUrl from the pin object.
                        src: pin.imageUrl,
                        alt: `Favorite image ${index + 1}`,
                        loading: 'lazy'
                    }),
                    React.createElement('button', buttonProps,
                        React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor" },
                            React.createElement('path', { d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" })
                        )
                    )
                )
            })
        );
    };

    return (
        React.createElement('div', { className: `screen favorites-screen ${isPremiumUser ? 'premium-user' : ''}` },
            !isPremiumUser && React.createElement('div', { className: 'ad-placeholder' },
                '',
                React.createElement(RemoveAdsButton, null)
            ),
            React.createElement('div', { className: 'image-grid-container page-screen' },
                renderContent()
            )
        )
    );
};

export default FavoritesScreen;