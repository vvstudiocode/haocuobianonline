import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { Pin } from './types.ts';
import { supabase } from './src/supabaseClient.ts';

const { useRef, useEffect, useState, useMemo } = React;

// A placeholder component for when the image is not yet visible.
const ImagePlaceholder = () => React.createElement('div', { className: 'image-placeholder' });

// A self-contained, lazy-loading Pin item for the masonry grid.
const PinItem = React.memo(({ pin, onClick }: { pin: Pin, onClick: () => void }) => {
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
        : React.createElement(ImagePlaceholder, null)
    );
});


const HomeScreen = () => {
    const { openViewer } = useAppContext();
    const [publicCreations, setPublicCreations] = useState<Pin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchPublicCreations = async () => {
            setLoading(true);
            setError(null);

            try {
                // This is the core query for the public feed
                const { data, error: queryError } = await supabase
                    .from('creations')
                    .select(`
                        *,
                        profiles ( username )
                    `)
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });

                if (queryError) {
                    throw queryError;
                }

                // Map Supabase data to the Pin type our UI components expect
                const mappedPins: Pin[] = data.map((creation: any) => ({
                    pinId: creation.id.toString(),
                    imageUrl: creation.image_url,
                    title: creation.title,
                    description: `由 ${creation.profiles?.username || '匿名使用者'} 創作`,
                    creatorId: creation.user_id,
                    sourceType: 'USER_CREATION',
                    aspectRatio: 0.75, // Default aspect ratio
                }));

                setPublicCreations(mappedPins);

            } catch (err: any) {
                console.error("Error fetching public creations:", err);
                setError('無法載入公開作品，請稍後再試。');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicCreations();
    }, []);

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
                })
            )
        );
    };

    return (
        React.createElement('div', { className: `screen home-screen` },
            React.createElement('div', { 
                className: 'image-grid-container', 
             },
                renderGridContent()
            )
        )
    );
};

export default HomeScreen;