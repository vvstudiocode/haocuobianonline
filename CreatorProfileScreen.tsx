import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { Pin, Profile } from './types.ts';
import { supabase } from './src/supabaseClient.ts';

const { useState, useEffect, useRef } = React;

const ImagePlaceholder = () => React.createElement('div', { className: 'image-placeholder' });

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
            { rootMargin: '0px 0px 300px 0px' }
        );

        const currentRef = itemRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handleImageError = () => {
        setHasError(true);
    };

    if (hasError) return null;

    return (
        React.createElement('div', { ref: itemRef, className: 'pin-item', onClick: onClick },
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
                    React.createElement('span', { className: 'pin-likes' }, `❤️ ${pin.likeCount ?? 0}`)
                )
            )
        )
    );
});


const CreatorProfileScreen = () => {
    const { activeCreatorId, handleTabSelect, openViewer, activeTab } = useAppContext();
    const [creator, setCreator] = useState<Profile | null>(null);
    const [creations, setCreations] = useState<Pin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!activeCreatorId) {
            setError('找不到創作者 ID。');
            setLoading(false);
            return;
        }

        const fetchCreatorData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', activeCreatorId)
                    .single();

                if (profileError) throw profileError;
                setCreator(profileData);

                // Fetch public creations
                const { data: creationsData, error: creationsError } = await supabase
                    .from('creations')
                    .select('*')
                    .eq('user_id', activeCreatorId)
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });

                if (creationsError) throw creationsError;
                
                const mappedPins: Pin[] = creationsData.map((creation: any) => ({
                    pinId: creation.id.toString(),
                    imageUrl: creation.image_url,
                    title: creation.title || '無標題創作',
                    description: creation.description,
                    creatorId: creation.user_id,
                    creatorUsername: profileData.username || '匿名使用者',
                    sourceType: 'USER_CREATION',
                    aspectRatio: 0.75, 
                    likeCount: creation.like_count || 0,
                    editorData: creation.editor_data,
                }));
                setCreations(mappedPins);

            } catch (err: any) {
                console.error("Error fetching creator data:", err);
                setError('無法載入創作者資料，請稍後再試。');
            } finally {
                setLoading(false);
            }
        };

        fetchCreatorData();
    }, [activeCreatorId]);

    const renderGridContent = () => {
        if (loading) return React.createElement('div', { className: 'empty-grid-message' }, '正在載入...');
        if (error) return React.createElement('div', { className: 'empty-grid-message' }, error);
        if (creations.length === 0) return React.createElement('div', { className: 'empty-grid-message' }, '這位創作者還沒有公開的作品。');

        return (
            React.createElement('div', { className: 'image-grid' },
                creations.map((pin, index) => (
                    React.createElement(PinItem, { 
                        key: pin.pinId, 
                        pin: pin, 
                        onClick: () => openViewer(creations, index) 
                    })
                ))
            )
        );
    };

    return (
        React.createElement('div', { className: 'screen creator-profile-screen' },
            React.createElement('div', { className: 'page-header' },
                React.createElement('button', { className: 'header-btn back-btn', onClick: () => handleTabSelect(activeTab) }, '< 返回')
            ),
            creator && (
                React.createElement('div', { className: 'creator-info-header' },
                    React.createElement('div', { className: 'creator-avatar' }, creator.username?.charAt(0) || '好'),
                    React.createElement('h2', { className: 'creator-name' }, creator.username || '匿名使用者'),
                    React.createElement('div', { className: 'creator-stats' },
                        React.createElement('span', null, `${creations.length} 個作品`)
                    )
                )
            ),
            React.createElement('div', { className: 'image-grid-container' },
                renderGridContent()
            )
        )
    );
};

export default CreatorProfileScreen;