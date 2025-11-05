/**
 * @file SuccessModal.tsx
 * @description
 * 當使用者成功完成並儲存一個作品後顯示的彈出視窗元件。
 * - 顯示一個成功的提示訊息。
 * - 提供「分享祝福」、「下載」和「返回首頁」三個操作按鈕。
 */
import React from 'react';

interface SuccessModalProps {
    onShare: () => void;
    onHome: () => void;
    onDownload: () => void;
}

const SuccessModal = ({ onShare, onHome, onDownload }: SuccessModalProps) => {

  return (
    React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal-content' },
        React.createElement('div', { className: 'modal-icon' }, '✓'),
        React.createElement('h2', { className: 'modal-title' }, '作品已儲存'),
        React.createElement('p', { className: 'modal-subtitle' }, '您的創作已加入「我的作品」。立即分享或下載給親朋好友吧！'),
        React.createElement('div', { className: 'modal-buttons' },
          React.createElement('button', { className: 'modal-btn primary', onClick: onShare }, '分享祝福'),
          React.createElement('button', { className: 'modal-btn secondary', onClick: onDownload }, '下載'),
          React.createElement('button', { className: 'modal-btn secondary', onClick: onHome }, '返回首頁')
        )
      )
    )
  );
};

export default SuccessModal;
