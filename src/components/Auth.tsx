import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';

const { useState } = React;

const Auth = () => {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const buttonStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '12px',
        fontSize: '1rem',
        fontWeight: 500,
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        color: '#333',
        cursor: 'pointer',
        borderRadius: '8px'
    };

    return (
        React.createElement('div', { style: { padding: '20px' } },
            React.createElement('h3', { style: { textAlign: 'center', marginBottom: '10px' } }, '登入或註冊'),
            React.createElement('p', { style: { textAlign: 'center', color: '#666', marginBottom: '20px' } }, '登入以保存您的創作並與社群分享！'),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '15px' } },
                React.createElement('button', { onClick: handleLogin, disabled: loading, style: buttonStyles }, 
                    React.createElement('img', { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", alt: "Google icon", style: { width: '20px', height: '20px' } }),
                    loading ? '處理中...' : '使用 Google 登入'
                )
            )
        )
    );
};

export default Auth;
