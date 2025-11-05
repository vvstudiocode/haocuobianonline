/**
 * @file InfoModal.tsx
 * @description
 * 一個通用的資訊展示彈窗元件。
 * 用於顯示格式化的內容，如「簡易教學」、「關於我們」或「隱私權政策」。
 * - 接收標題 (title) 和子內容 (children) 作為 props。
 * - 提供一個標準的關閉按鈕。
 * - 點擊遮罩層也可關閉彈窗。
 */
import React from 'react';

interface InfoModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}

const InfoModal = ({ title, children, onClose }: InfoModalProps) => {
  // FIX: Extracted props to a variable to bypass TypeScript's excess property checking error.
  const modalContentProps = { 
    className: 'info-modal-content', 
    onClick: (e: React.MouseEvent) => e.stopPropagation() 
  };
  
  return (
    React.createElement('div', { className: 'modal-overlay', onClick: onClose },
      React.createElement('div', modalContentProps,
        React.createElement('h2', { className: 'modal-title' }, title),
        React.createElement('div', { className: 'modal-body' }, children),
        React.createElement('div', { className: 'modal-buttons' },
          React.createElement('button', { className: 'modal-btn secondary', onClick: onClose }, '關閉')
        )
      )
    )
  );
};

export default InfoModal;
