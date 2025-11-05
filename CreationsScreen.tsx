/**
 * @file CreationsScreen.tsx
 * @description
 * 「我的作品」頁面元件。
 * - 以網格佈局展示所有使用者已儲存的創作。
 * - 如果沒有作品，則顯示鼓勵使用者創作的提示訊息。
 * - 點擊任一作品圖片會開啟全螢幕的作品瀏覽器 (CreationViewer)。
 */
import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import RemoveAdsButton from './RemoveAdsButton.tsx';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const { useState, useEffect, useMemo } = React;

const CreationsScreen = () => {
    const { pins, openViewer, handleTabSelect, isPremiumUser } = useAppContext();
    const [imageSources, setImageSources] = useState<(string | null)[]>([]);

    const userCreations = useMemo(() => pins.filter(p => p.sourceType === 'USER_CREATION'), [pins]);

    useEffect(() => {
        if (!userCreations || userCreations.length === 0) {
            setImageSources([]);
            return;
        }

        const resolveImageSources = async () => {
            // Show placeholders while loading
            setImageSources(new Array(userCreations.length).fill(null));

            const sources = await Promise.all(userCreations.map(async (pin) => {
                const creationUrl = pin.imageUrl;
                if (Capacitor.isNativePlatform() && !creationUrl.startsWith('data:image')) {
                    try {
                        const result = await Filesystem.readFile({
                            path: creationUrl,
                        });
                        return `data:image/jpeg;base64,${result.data}`;
                    } catch (e) {
                        console.error("Failed to read creation file:", creationUrl, e);
                        return null; // Use null for failed images
                    }
                }
                return creationUrl; // It's already a data URL (for web)
            }));
            setImageSources(sources);
        };

        resolveImageSources();
    }, [userCreations]);
    
    const renderContent = () => {
        if (userCreations.length === 0) {
            return React.createElement('div', { className: 'empty-grid-message' }, 
              '您還沒有任何作品。',
              React.createElement('button', { 
                  className: 'cta-button',
                  onClick: () => handleTabSelect('home')
              }, '從圖庫挑選一張開始創作')
            );
        }

        return React.createElement('div', { className: 'image-grid' },
            imageSources.map((imgSrc, index) =>
                React.createElement('div', {
                    key: userCreations[index].pinId || index,
                    className: 'image-grid-item',
                    onClick: () => {
                        if (imgSrc) {
                           // FIX: Pass the array of Pin objects and the index to openViewer.
                           openViewer(userCreations, index);
                        }
                    },
                    role: 'button',
                    'aria-label': `Select creation ${index + 1}`
                },
                    imgSrc ?
                        React.createElement('img', {
                            src: imgSrc,
                            alt: `My Creation ${index + 1}`,
                            loading: 'lazy'
                        }) :
                        React.createElement('div', { className: 'image-placeholder' })
                )
            )
        );
    };

    return (
        React.createElement('div', { className: `screen creations-screen ${isPremiumUser ? 'premium-user' : ''}` },
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

export default CreationsScreen;
