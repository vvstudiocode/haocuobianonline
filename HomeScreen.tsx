import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { Pin } from './types.ts';
import { supabase } from './src/supabaseClient.ts';

const { useRef, useEffect, useState, useCallback } = React;

// A placeholder component for when the image is not yet visible.
const ImagePlaceholder = () => React.createElement('div', { className: 'image-placeholder' });

// A self-contained, lazy-loading Pin item for the masonry grid.
const PinItem = React.memo(({ pin, onClick, openCreatorProfile }: { pin: Pin, onClick: () => void, openCreatorProfile: (creatorId: string) => void }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const [isAssetVisible, setIsAssetVisible] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsAssetVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: '0px 0px 300px 0px' } // Preload images 300px below the viewport
        );

        const currentRef = itemRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handleImageError = () => {
        console.warn(`Image failed to load, hiding item: ${pin.imageUrl}`);
        setHasError(true);
    };
    
    const handleCreatorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openCreatorProfile(pin.creatorId);
    };

    if (hasError) {
        return null;
    }

    return React.createElement('div', { ref: itemRef, className: 'pin-item', onClick: onClick },
        isAssetVisible ? 
            React.createElement('img', { 
                src: pin.imageUrl, 
                alt: pin.title || 'Pin image', 
                loading: 'lazy',
                onError: handleImageError
            })
        : React.createElement(ImagePlaceholder, null),
        React.createElement('div', { className: 'pin-info' },
            React.createElement('div', { className: 'pin-title' }, pin.title),
            React.createElement('div', { className: 'pin-meta' },
                React.createElement('button', { className: 'pin-creator-btn', onClick: handleCreatorClick }, `由 ${pin.creatorUsername}`),
                React.createElement('span', { className: 'pin-likes' }, `❤️ ${pin.likeCount ?? 0}`)
            )
        )
    );
});


const HomeScreen = () => {
    const { openViewer, openCreatorProfile } = useAppContext();
    const [publicCreations, setPublicCreations] = useState<Pin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
    
    const fetchPublicCreations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // This is the core query for the public feed
            let query = supabase
                .from('creations')
                .select(`
                    *,
                    profiles ( username )
                `)
                .eq('is_public', true);
            
            if (sortBy === 'latest') {
                query = query.order('created_at', { ascending: false });
            } else {
                query = query.order('like_count', { ascending: false });
            }

            const { data, error: queryError } = await query;

            if (queryError) {
                throw queryError;
            }

            // Map Supabase data to the Pin type our UI components expect
            const mappedPins: Pin[] = data.map((creation: any) => ({
                pinId: creation.id.toString(),
                imageUrl: creation.image_url,
                title: creation.title || '無標題創作',
                description: creation.description,
                creatorId: creation.user_id,
                creatorUsername: creation.profiles?.username || '匿名使用者',
                sourceType: 'USER_CREATION',
                aspectRatio: 0.75, // Default aspect ratio
                likeCount: creation.like_count || 0,
                editorData: creation.editor_data,
            }));

            setPublicCreations(mappedPins);

        } catch (err: any) {
            console.error("Error fetching public creations:", err);
            setError('無法載入公開作品，請稍後再試。');
        } finally {
            setLoading(false);
        }
    }, [sortBy]);

    useEffect(() => {
        fetchPublicCreations();
    }, [fetchPublicCreations]);

    const renderGridContent = () => {
        if (loading) {
            return React.createElement('div', { className: 'empty-grid-message' }, '正在載入公開動態...');
        }
        
        if (error) {
             return React.createElement('div', { className: 'empty-grid-message' }, error);
        }

        if (publicCreations.length === 0) {
            return React.createElement('div', { className: 'empty-grid-message' }, '目前還沒有人公開分享作品，快來當第一個吧！');
        }

        return React.createElement('div', { className: 'image-grid' },
            publicCreations.map((pin, index) => 
                React.createElement(PinItem, {
                    key: pin.pinId,
                    pin: pin,
                    onClick: () => openViewer(publicCreations, index),
                    openCreatorProfile: openCreatorProfile,
                })
            )
        );
    };

    return (
        React.createElement('div', { className: `screen home-screen` },
            React.createElement('div', { className: 'home-sort-tabs' },
                React.createElement('button', {
                    className: `sort-tab-btn ${sortBy === 'latest' ? 'active' : ''}`,
                    onClick: () => setSortBy('latest')
                }, '最新'),
                React.createElement('button', {
                    className: `sort-tab-btn ${sortBy === 'popular' ? 'active' : ''}`,
                    onClick: () => setSortBy('popular')
                }, '熱門')
            ),
            React.createElement('div', { 
                className: 'image-grid-container', 
             },
                renderGridContent()
            )
        )
    );
};

export default HomeScreen;