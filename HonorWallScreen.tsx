/**
 * @file HonorWallScreen.tsx
 * @description
 * 「我的榮譽牆」頁面元件。
 * - 以網格形式展示遊戲化系統中所有的徽章 (Badges)。
 * - 區分已解鎖、未解鎖和未解鎖的隱藏成就，並給予不同的視覺樣式。
 * - 允許使用者點擊任何徽章（無論是否解鎖）來查看其詳細資訊彈窗 (BadgeDetailModal)。
 */
import React from 'react';
import { BADGES, BADGE_SERIES } from './data.ts';
import BadgeDetailModal from './BadgeDetailModal.tsx';
import { useAppContext } from './contexts/AppContext.tsx';
import { Achievements, AchievementCounterKey } from '../types.ts';

const { useState, useMemo } = React;

interface HonorWallScreenProps {
    onBack: () => void;
}

const getProgressValue = (key: AchievementCounterKey, achievements: Achievements): number => {
    if (key === 'fontsUsed') {
        return achievements.fontsUsed.length;
    }
    // All other keys are direct number properties on the achievements object
    return achievements[key] as number;
};


const HonorWallScreen = ({ onBack }: HonorWallScreenProps) => {
    const { achievements } = useAppContext();
    const [selectedBadge, setSelectedBadge] = useState(null);

    const badgesToDisplay = useMemo(() => {
        const displayList = [];
        const processedSeriesTopLevel = new Set<string>();

        // Iterate through all badges in their defined order to maintain a consistent layout
        for (const badgeId in BADGES) {
            const badge = BADGES[badgeId];
            
            // Check if this badge is part of a series
            const owningSeriesKey = Object.keys(BADGE_SERIES).find(key => BADGE_SERIES[key].includes(badgeId));

            if (owningSeriesKey) {
                // It's a series badge. Only process the entire series once.
                if (processedSeriesTopLevel.has(owningSeriesKey)) {
                    continue; // Already handled this series
                }

                const seriesIds = BADGE_SERIES[owningSeriesKey];
                let firstLockedFound = false;
                
                // Add all unlocked badges from the series, plus the next locked one
                for (const seriesBadgeId of seriesIds) {
                    const seriesBadge = BADGES[seriesBadgeId];
                    if (!seriesBadge) continue;

                    const isUnlocked = achievements.unlockedBadges.includes(seriesBadgeId);
                    
                    if (isUnlocked) {
                        displayList.push(seriesBadge);
                    } else if (!firstLockedFound) {
                        // This is the first locked badge, add it as the next goal
                        displayList.push(seriesBadge);
                        firstLockedFound = true;
                    }
                }
                processedSeriesTopLevel.add(owningSeriesKey);
            } else {
                // It's a standalone badge, just add it
                displayList.push(badge);
            }
        }
        return displayList;
    }, [achievements.unlockedBadges]);

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'screen honor-wall-screen' },
            React.createElement('div', { className: 'page-header' },
                 React.createElement('button', { className: 'header-btn back-btn', onClick: onBack }, '< 返回個人')
            ),
            React.createElement('div', { className: 'badge-grid' },
                badgesToDisplay.map(badge => {
                    const isUnlocked = achievements.unlockedBadges.includes(badge.id);
                    const isHiddenAndLocked = 'hidden' in badge && badge.hidden && !isUnlocked;
                    
                    const hasProgress = !isUnlocked && badge.goal && badge.progressKey;
                    let currentProgress = 0;
                    let progressPercent = 0;
                    if (hasProgress && badge.progressKey) {
                        currentProgress = getProgressValue(badge.progressKey, achievements);
                        progressPercent = Math.min((currentProgress / badge.goal!) * 100, 100);
                    }


                    return React.createElement('button', {
                        key: badge.id,
                        className: `badge-item ${isUnlocked ? 'unlocked' : 'locked'} ${isHiddenAndLocked ? 'hidden' : ''}`,
                        onClick: () => setSelectedBadge(badge)
                    },
                        React.createElement('div', { className: 'badge-icon' }, badge.icon ),
                        React.createElement('div', { className: 'badge-name' }, isHiddenAndLocked ? '秘密成就' : badge.name),
                        hasProgress
                            ? React.createElement('div', { className: 'badge-progress-container' },
                                React.createElement('div', { className: 'badge-progress-text' }, `${currentProgress} / ${badge.goal}`),
                                React.createElement('div', { className: 'badge-progress-bar' },
                                    React.createElement('div', { className: 'badge-progress-fill', style: { width: `${progressPercent}%` } })
                                )
                              )
                            : React.createElement('div', { className: 'badge-description' }, isUnlocked ? `+${badge.points} 點` : '未解鎖')
                    )
                })
            )
        ),
        selectedBadge && React.createElement(BadgeDetailModal, {
            badge: selectedBadge,
            isUnlocked: achievements.unlockedBadges.includes(selectedBadge.id),
            onClose: () => setSelectedBadge(null)
        })
    );
};

export default HonorWallScreen;