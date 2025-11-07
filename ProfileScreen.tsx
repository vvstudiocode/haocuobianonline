/**
 * @file ProfileScreen.tsx
 * @description
 * 「我」的個人中心頁面元件。
 * - 顯示使用者的核心資訊：頭像、暱稱、等級和暖心點數進度條。
 * - 提供編輯暱稱和查看完整等級列表的功能。
 * - 新增「每日任務」和「每週任務」區塊，顯示任務進度並提供獎勵領取按鈕。
 * - 提供進入「我的榮譽牆」和「設定」頁面的導覽入口。
 */
import React from 'react';
// FIX: Changed import to get getLevelInfo from data.ts
import { getLevelInfo, TASKS } from './data.ts';
import LevelListModal from './LevelListModal.tsx';
import { useAppContext } from './contexts/AppContext.tsx';
import { useAuth } from './src/contexts/AuthContext.tsx';
import Auth from './src/components/Auth.tsx';
import { TaskDefinition, Board } from './types.ts';
import { supabase } from './src/supabaseClient.ts';

const { useState, useEffect } = React;

const ProfileScreen = () => {
    const { userProfile, processAchievement, handleTabSelect, openBoard, handleCreateBoard } = useAppContext();
    const { user, profile, logout, updateProfile } = useAuth();
    const { points, tasks } = userProfile;
    const { level, name: levelName, icon: levelIcon, nextLevel } = getLevelInfo(points);
    
    const [profileBoards, setProfileBoards] = useState<Board[]>([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    
    const [showLevelsModal, setShowLevelsModal] = useState(false);
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');

    useEffect(() => {
        if (!user) {
            setIsLoadingBoards(false);
            setProfileBoards([]);
            return;
        }

        const fetchBoards = async () => {
            setIsLoadingBoards(true);
            const { data, error } = await supabase
                .from('boards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching boards:', error);
                alert('無法載入您的圖版。');
            } else if (data) {
                const mappedBoards: Board[] = data.map(b => ({
                    boardId: b.id,
                    name: b.name,
                    coverPinUrl: b.cover_pin_url,
                    pinIds: [], // Not needed for profile display
                }));
                setProfileBoards(mappedBoards);
            }
            setIsLoadingBoards(false);
        };

        fetchBoards();
    }, [user]);


    const progress = nextLevel
        ? Math.round(((points - getLevelInfo(points).points) / (nextLevel.points - getLevelInfo(points).points)) * 100)
        : 100;

    const handleNicknameChange = () => {
        const currentNickname = profile?.username || userProfile.nickname;
        const newNickname = window.prompt('請輸入您的新暱稱：', currentNickname);
        if (newNickname && newNickname.trim()) {
            updateProfile(newNickname.trim());
        }
    };
    
    const handleConfirmCreateBoard = async () => {
        if (!newBoardName.trim()) return;
        try {
            const newBoardId = await handleCreateBoard(newBoardName.trim());
            const newBoard: Board = {
                boardId: newBoardId,
                name: newBoardName.trim(),
                coverPinUrl: undefined,
                pinIds: []
            };
            setProfileBoards(prev => [newBoard, ...prev]);
            setNewBoardName('');
            setIsCreatingBoard(false);
        } catch (error) {
            // Error is already alerted by handleCreateBoard from the context
            console.error("Failed to create board from profile screen:", error);
        }
    };

    const renderTaskItem = (task: TaskDefinition) => {
        const taskType = task.type;
        const progressData = tasks[taskType]?.progress[task.id] || { count: 0, claimed: false };
        const isClaimed = progressData.claimed;

        // For DAILY_CHECKIN, progress is binary. For others, it's based on count.
        const currentCount = (task.id === 'DAILY_CHECKIN' && isClaimed) ? 1 : progressData.count;
        const progressPercent = Math.min((currentCount / task.goal) * 100, 100);
        
        const isCompleted = (task.id === 'DAILY_CHECKIN') ? !isClaimed : progressData.count >= task.goal;

        let btnText = '未完成';
        let btnClass = '';
        let btnDisabled = true;

        if (task.id === 'DAILY_CHECKIN') {
             if (isClaimed) {
                btnText = '已簽到';
                btnClass = 'claimed';
                btnDisabled = true;
            } else {
                btnText = `簽到 +${task.points}`;
                btnClass = 'claimable';
                btnDisabled = false;
            }
        } else {
             if (isCompleted) {
                if (isClaimed) {
                    btnText = '已領取';
                    btnClass = 'claimed';
                    btnDisabled = true;
                } else {
                    btnText = `領取 +${task.points}`;
                    btnClass = 'claimable';
                    btnDisabled = false;
                }
            }
        }
        
        return React.createElement('div', { key: task.id, className: 'task-item' },
            React.createElement('div', { className: 'task-info' },
                React.createElement('div', { className: 'task-name-wrapper' },
                    React.createElement('div', { className: 'task-name' }, task.name),
                    React.createElement('div', { className: 'task-progress-text' }, `(${currentCount}/${task.goal})`)
                ),
                React.createElement('div', { className: 'task-description' }, task.description),
                React.createElement('div', { className: 'task-progress-bar' },
                    React.createElement('div', { className: 'task-progress-fill', style: { width: `${progressPercent}%` } })
                )
            ),
            React.createElement('button', {
                className: `task-reward-btn ${btnClass}`,
                onClick: () => processAchievement('claim_task', { taskId: task.id }),
                disabled: btnDisabled || !user // Disable if not logged in
            }, btnText)
        );
    };

    const renderBoards = () => {
        if (isLoadingBoards) {
            return React.createElement('div', { className: 'empty-boards-message' }, '正在載入您的圖版...');
        }

        if (profileBoards.length === 0) {
            return React.createElement('div', { className: 'empty-boards-message' },
                '您還沒有任何圖版。',
                React.createElement('br'),
                '建立一個來收藏您喜愛的 Pin 吧！'
            );
        }
        
        return React.createElement('div', { className: 'boards-grid' },
            profileBoards.map(board => 
                React.createElement('button', { 
                    key: board.boardId, 
                    className: 'board-item', 
                    style: { backgroundImage: `url(${board.coverPinUrl || ''})`, backgroundSize: 'cover', backgroundColor: '#e0e0e0' },
                    onClick: () => openBoard(board.boardId)
                },
                    React.createElement('span', { className: 'board-item-name' }, board.name)
                )
            )
        );
    };

    const renderCreateBoardModal = () => {
        // FIX: Extracted props to a variable to bypass TypeScript's excess property checking error.
        const modalContentProps = {
            className: 'modal-content',
            onClick: (e: React.MouseEvent) => e.stopPropagation()
        };
        return React.createElement('div', { className: 'modal-overlay', onClick: () => setIsCreatingBoard(false) },
            React.createElement('div', modalContentProps,
                React.createElement('h2', { className: 'modal-title' }, '建立新圖版'),
                React.createElement('input', {
                    type: 'text',
                    className: 'modal-input',
                    placeholder: '圖版名稱',
                    value: newBoardName,
                    onChange: e => setNewBoardName(e.target.value),
                    autoFocus: true
                }),
                React.createElement('div', { className: 'modal-buttons' },
                    React.createElement('button', { className: 'modal-btn primary', onClick: handleConfirmCreateBoard, disabled: !newBoardName.trim() }, '建立'),
                    React.createElement('button', { className: 'modal-btn secondary', onClick: () => setIsCreatingBoard(false) }, '取消')
                )
            )
        );
    };
    
    if (!user || !profile) {
        return React.createElement(Auth, null);
    }

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'screen page-screen profile-screen' },
            React.createElement('div', { className: 'profile-header' },
                React.createElement('button', { className: 'profile-settings-btn', onClick: () => handleTabSelect('settings'), 'aria-label': 'Settings' }, '⚙️'),
                React.createElement('div', { className: 'profile-avatar' }, levelIcon),
                React.createElement('button', { className: 'profile-nickname-btn', onClick: handleNicknameChange, title: '點擊以編輯暱稱' },
                    React.createElement('div', { className: 'profile-nickname' }, profile.username || '新厝邊'),
                    React.createElement('span', { className: 'edit-icon' }, '✏️')
                ),
                React.createElement('div', { className: 'profile-level-container' },
                    React.createElement('div', { className: 'profile-level' }, `Lv. ${level} ${levelName}`),
                    React.createElement('button', { className: 'level-info-btn', onClick: () => setShowLevelsModal(true), 'aria-label': '查看等級列表' }, '?')
                ),
                React.createElement('div', { className: 'profile-points-bar' },
                    React.createElement('div', { className: 'profile-points-progress', style: { width: `${progress}%` } })
                ),
                React.createElement('div', { className: 'profile-points-text' },
                    nextLevel ? `${points} / ${nextLevel.points} 點` : `${points} 點 (已達最高等級)`
                )
            ),
             React.createElement('div', { className: 'profile-boards-section' },
                React.createElement('div', { className: 'profile-boards-section-header' },
                    React.createElement('h3', null, '我的圖版'),
                    React.createElement('button', { className: 'icon-btn', title: '建立圖版', 'aria-label': 'Create new board', onClick: () => setIsCreatingBoard(true) }, '+')
                ),
                renderBoards()
            ),
            React.createElement('div', { className: 'profile-actions' },
                // FIX: Combine multiple string children into a single string to resolve a potential createElement overload issue.
                React.createElement('button', { className: 'profile-btn', onClick: () => handleTabSelect('honor-wall') }, '🏆 我的榮譽牆'),
                React.createElement('button', { className: 'profile-btn danger', style:{color: 'var(--danger-color)'}, onClick: logout }, '登出')
            ),
             React.createElement('div', { className: 'tasks-section' },
                React.createElement('h3', null, '每日任務'),
                Object.values(TASKS).filter(t => t.type === 'daily').map(renderTaskItem),
                React.createElement('h3', { style: { marginTop: '15px' } }, '每週任務'),
                Object.values(TASKS).filter(t => t.type === 'weekly').map(renderTaskItem)
            )
        ),
        showLevelsModal && React.createElement(LevelListModal, {
            userPoints: points,
            onClose: () => setShowLevelsModal(false)
        }),
        isCreatingBoard && renderCreateBoardModal()
    );
};

export default ProfileScreen;