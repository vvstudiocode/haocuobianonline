import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';
import { Pin, Board } from './types.ts';
import { MY_FAVORITES_BOARD_ID, MY_CREATIONS_BOARD_ID } from './data.ts';
import { useAuth } from './src/contexts/AuthContext.tsx';
import { supabase } from './src/supabaseClient.ts';

const { useMemo, useState, useEffect } = React;

// A placeholder component for when the image is not yet visible.
const ImagePlaceholder = () => React.createElement('div', { className: 'image-placeholder' });

const PinItem = ({ pin, onClick, showFavoriteButton, onToggleFavorite }: { 
    pin: Pin, 
    onClick: () => void,
    showFavoriteButton?: boolean,
    onToggleFavorite?: () => void
}) => {
    const itemRef = React.useRef<HTMLDivElement>(null);
    const [isAssetVisible, setIsAssetVisible] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
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

    const heartIcon = React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor" }, 
        React.createElement('path', { d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" })
    );

    const favoriteButton = showFavoriteButton && React.createElement('button', {
        className: 'favorite-btn favorited',
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleFavorite?.();
        },
        'aria-label': '從最愛移除',
        title: '從最愛移除'
    }, heartIcon);

    return React.createElement('div', { ref: itemRef, className: 'pin-item', onClick: onClick },
        isAssetVisible ? 
            React.createElement('img', { 
                src: pin.imageUrl, 
                alt: pin.title || 'Pin image', 
                loading: 'lazy',
                onError: handleImageError
            })
        : React.createElement(ImagePlaceholder, null),
        favoriteButton
    );
};


const BoardScreen = () => {
    const { activeBoardId, handleTabSelect, openViewer, handleRenameBoard, handleDeleteBoard, handleToggleFavorite } = useAppContext();
    const { user } = useAuth();

    const [board, setBoard] = useState<Board | null>(null);
    const [displayPins, setDisplayPins] = useState<Pin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBoardAndPins = async () => {
            if (!activeBoardId) return;

            setIsLoading(true);
            setError(null);
            
            try {
                if (!user) {
                    throw new Error('請先登入以查看圖版。');
                }
                
                // Fetch board details and its associated pins (creations) through the junction table 'board_pins'
                const { data, error: queryError } = await supabase
                    .from('boards')
                    .select(`
                        id,
                        name,
                        board_pins (
                            creations (
                                *,
                                profiles ( username )
                            )
                        )
                    `)
                    .eq('id', activeBoardId)
                    .eq('user_id', user.id)
                    .single();

                if (queryError) throw queryError;
                
                if (data) {
                    const creationsFromJoin = data.board_pins
                        .map((bp: any) => bp.creations)
                        .filter(Boolean); // Filter out any null creations

                    const currentBoard: Board = {
                        boardId: data.id,
                        name: data.name,
                        pinIds: creationsFromJoin.map((c: any) => c.id),
                    };
                    setBoard(currentBoard);

                    const mappedPins: Pin[] = creationsFromJoin.map((c: any) => ({
                        pinId: c.id.toString(),
                        imageUrl: c.image_url,
                        title: c.title,
                        creatorId: c.user_id,
                        creatorUsername: c.profiles?.username || '匿名使用者',
                        description: c.description,
                        sourceType: 'USER_CREATION',
                        editorData: c.editor_data,
                        aspectRatio: 0.75,
                        likeCount: c.like_count || 0,
                    }));
                    setDisplayPins(mappedPins.reverse()); // Show newest first
                } else {
                     throw new Error('找不到此圖版或您沒有權限查看。');
                }

            } catch (err: any) {
                console.error(`Error fetching board ${activeBoardId}:`, err);
                setError(err.message || '無法載入圖版內容，請稍後再試。');
                setBoard(null);
                setDisplayPins([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBoardAndPins();
    }, [activeBoardId, user]);

    const isFavoritesBoard = activeBoardId === MY_FAVORITES_BOARD_ID;
    const isMyCreationsBoard = activeBoardId === MY_CREATIONS_BOARD_ID;
    const isDefaultBoard = isFavoritesBoard || isMyCreationsBoard;
    
    const handleRename = async () => {
        if (!board || isDefaultBoard) return;
        const newName = window.prompt('請輸入新的圖版名稱：', board.name);
        if (newName && newName.trim() && newName.trim() !== board.name) {
            await handleRenameBoard(board.boardId, newName.trim());
            setBoard(prev => prev ? { ...prev, name: newName.trim() } : null);
        }
    };

    const confirmDelete = () => {
        if (!board || isDefaultBoard) return;
        if (window.confirm(`確定要永久刪除「${board.name}」圖版嗎？圖版中的 Pin 不會被刪除。`)) {
            handleDeleteBoard(board.boardId);
        }
    };

    const renderGridContent = () => {
        if (isLoading) {
            return React.createElement('div', { className: 'empty-grid-message' }, '正在載入...');
        }
        if (error) {
            return React.createElement('div', { className: 'empty-grid-message' }, error);
        }
        if (displayPins.length === 0) {
            const message = isMyCreationsBoard
                ? '您還沒有任何作品，快去創作吧！' 
                : '這個圖版還沒有任何 Pin。';
            return React.createElement('div', { className: 'empty-grid-message' }, message);
        }

        return React.createElement('div', { className: 'image-grid' },
            displayPins.map((pin, index) => 
                React.createElement(PinItem, {
                    key: pin.pinId,
                    pin: pin,
                    onClick: () => openViewer(displayPins, index, { type: 'board', id: activeBoardId! }),
                    showFavoriteButton: isFavoritesBoard,
                    onToggleFavorite: () => handleToggleFavorite(pin),
                })
            )
        );
    };

    return (
        React.createElement('div', { className: 'screen' },
            React.createElement('div', { className: 'header board-header' },
                React.createElement('button', { className: 'header-btn back-btn', onClick: () => handleTabSelect('profile') }, '< 返回'),
                React.createElement('h2', { className: 'page-title' }, board?.name || '圖版'),
                React.createElement('div', { className: 'board-header-actions' },
                    React.createElement('button', { 
                        className: 'header-btn edit-btn', 
                        onClick: handleRename, 
                        'aria-label': '重新命名圖版', 
                        title: '重新命名圖版', 
                        disabled: isLoading || !board || isDefaultBoard
                    }, '編輯'),
                    React.createElement('button', { 
                        className: 'header-btn delete-btn', 
                        onClick: confirmDelete, 
                        'aria-label': '刪除圖版', 
                        title: '刪除圖版', 
                        disabled: isLoading || !board || isDefaultBoard
                    }, '🗑️')
                )
            ),
            React.createElement('div', { className: 'image-grid-container' },
                renderGridContent()
            )
        )
    );
};

export default BoardScreen;