import React from 'react';
import { WELCOME_SEEN_KEY } from '../data.ts';
import { getFromStorage, saveToStorage } from '../storage.ts';
import { ImageInfo, Pin } from '../types.ts';

const { useState, useCallback } = React;

interface ScrollPositionState {
    top: number;
    count: number;
}

export const useNavigation = () => {
    const [view, setView] = useState(() => getFromStorage(WELCOME_SEEN_KEY, false) ? 'main' : 'welcome');
    const [activeTab, setActiveTab] = useState('home');
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedImageInfo, setSelectedImageInfo] = useState<ImageInfo | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [showCreationViewer, setShowCreationViewer] = useState(false);
    const [creationViewerIndex, setCreationViewerIndex] = useState(0);
    const [creationViewerPins, setCreationViewerPins] = useState<Pin[]>([]);
    const [viewerSource, setViewerSource] = useState<{ type: string, id: string } | null>(null);
    const [scrollPositions, setScrollPositions] = useState<{ [key: string]: ScrollPositionState }>({});
    
    const handleStart = useCallback(() => {
        saveToStorage(WELCOME_SEEN_KEY, true);
        setView('main');
    }, []);

    const handleTabSelect = useCallback((tab: string) => {
        setShowCreationViewer(false); // Add this line to fix the bug
        if (tab === 'settings' || tab === 'honor-wall') {
            setView(tab);
        } else {
            setView('main');
            setActiveTab(tab);
        }
        if (activeBoardId) setActiveBoardId(null);
        if (activeCreatorId) setActiveCreatorId(null);
    }, [activeBoardId, activeCreatorId]);
    
    const openBoard = useCallback((boardId: string) => {
        setView('board');
        setActiveBoardId(boardId);
    }, []);

    const openCreatorProfile = useCallback((creatorId: string) => {
        setView('creator-profile');
        setActiveCreatorId(creatorId);
    }, []);
    
    const openEditor = useCallback((info: ImageInfo, index: number, scrollTop: number = 0, renderedCount: number = 16) => {
        setSelectedImageInfo(info);
        setIsEditorOpen(true);
        setScrollPositions(prev => ({ 
            ...prev, 
            [info.sourceCategory]: { top: scrollTop, count: renderedCount } 
        }));
    }, []);

    const openViewer = useCallback((pins: Pin[], index: number, source: { type: string, id: string } | null = null) => {
        console.log('openViewer called:', { pins, index, source });
        setCreationViewerPins(pins);
        setCreationViewerIndex(index);
        setViewerSource(source);
        setShowCreationViewer(true);
        console.log('openViewer finished. showCreationViewer:', true);
    }, []);
    
    const handleBackToMain = useCallback(() => {
        setIsEditorOpen(false);
        setSelectedImageInfo(null);
        setFinalImage(null);
        setShowSuccessModal(false);
        setActiveBoardId(null);
        setActiveCreatorId(null);
        setViewerSource(null);
        setView('main');
    }, []);

    const handleGoHomeFromModal = useCallback(() => {
        handleBackToMain();
        setActiveTab('home');
    }, [handleBackToMain]);

    return {
        view,
        activeTab,
        activeBoardId,
        activeCreatorId,
        isEditorOpen,
        selectedImageInfo,
        showSuccessModal,
        finalImage,
        showCreationViewer,
        creationViewerIndex,
        creationViewerPins,
        viewerSource,
        scrollPositions,
        setScrollPositions,
        handleStart,
        handleTabSelect,
        openBoard,
        openCreatorProfile,
        openEditor,
        openViewer,
        handleBackToMain,
        handleGoHomeFromModal,
        setShowCreationViewer,
        setFinalImage,
        setShowSuccessModal,
    };
};