import React, { useState } from 'react';
import styles from './AuthForm.module.css';

interface LoginFormProps {
  onLogin?: (token: string) => void;
  switchToRegister?: () => void;
}

export default function LoginForm({ onLogin, switchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    // Giả lập đăng nhập thành công nếu username = "user" và password = "123456"
    if (username === 'user' && password === '123456') {
      setError('');
      onLogin && onLogin('fake-jwt-token');
    } else {
      setError('Sai tài khoản hoặc mật khẩu!');
    }
  };

  return (
    <div className={styles['auth-container']}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {error && <div className={styles['auth-error']}>{error}</div>}
        <input
          className={styles['auth-input']}
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className={styles['auth-btn']} type="submit">Đăng nhập</button>
      </form>
      <div className={styles['auth-switch']}>
        Chưa có tài khoản?
        <span className={styles['auth-link']} onClick={switchToRegister}>Đăng ký</span>
      </div>
    </div>
  );
}
