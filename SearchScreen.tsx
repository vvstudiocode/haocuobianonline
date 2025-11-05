import React from 'react';

const SearchScreen = () => {
    return React.createElement('div', { className: 'screen page-screen', style: { alignItems: 'center', justifyContent: 'center', gap: '10px' } },
        React.createElement('h2', { style: { fontSize: '1.5rem' } }, '搜尋'),
        React.createElement('p', { style: { color: '#888' } }, '搜尋功能正在開發中，敬請期待！')
    );
};

export default SearchScreen;