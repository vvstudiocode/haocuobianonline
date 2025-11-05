import React from 'react';
import { useAppContext } from './contexts/AppContext.tsx';

const { useState } = React;

const SaveToBoardModal = () => {
    const { 
        boards, 
        pinToSave, 
        closeSaveModal,
        handleCreateBoard,
        handleSavePin 
    } = useAppContext();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [newBoardName, setNewBoardName] = useState('');
    
    if (!pinToSave) return null;

    const handleCreateAndSave = async () => {
        if (newBoardName.trim()) {
            const newBoardId = await handleCreateBoard(newBoardName.trim());
            handleSavePin(pinToSave, newBoardId);
        }
    };

    const renderListView = () => (
        React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'boards-list' },
                boards.map(board => {
                    const coverDivProps = {
                        className: 'board-selector-cover',
                        style: { backgroundImage: `url(${board.coverPinUrl || pinToSave.imageUrl})` }
                    };
                    return React.createElement('button', {
                        key: board.boardId,
                        className: 'board-selector-item',
                        onClick: () => handleSavePin(pinToSave, board.boardId)
                    },
                        React.createElement('div', coverDivProps),
                        React.createElement('span', { className: 'board-selector-name' }, board.name)
                    );
                })
            ),
            React.createElement('button', { 
                className: 'create-board-btn',
                onClick: () => setView('create')
            }, '+ 建立新圖版')
        )
    );

    const renderCreateView = () => (
        React.createElement('div', { className: 'create-board-view' },
            React.createElement('input', {
                type: 'text',
                className: 'modal-input',
                placeholder: '圖版名稱',
                value: newBoardName,
                onChange: e => setNewBoardName(e.target.value),
                autoFocus: true
            }),
            React.createElement('div', { className: 'modal-actions' },
                React.createElement('button', { className: 'modal-btn secondary', onClick: () => setView('list') }, '返回'),
                React.createElement('button', { className: 'modal-btn primary', onClick: handleCreateAndSave, disabled: !newBoardName.trim() }, '建立並儲存')
            )
        )
    );
    
    // FIX: Extracted props to a variable to bypass TypeScript's excess property checking error.
    const modalContentProps = { 
        className: 'modal-content', 
        onClick: (e: React.MouseEvent) => e.stopPropagation() 
    };

    return (
        React.createElement('div', { className: 'modal-overlay save-board-modal', onClick: closeSaveModal },
            React.createElement('div', modalContentProps,
                React.createElement('h2', { className: 'modal-title' }, view === 'list' ? '儲存到圖版' : '建立新圖版'),
                view === 'list' ? renderListView() : renderCreateView()
            )
        )
    );
};

export default SaveToBoardModal;