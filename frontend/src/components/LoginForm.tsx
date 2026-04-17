import React, { useState } from 'react';
import styles from './AuthForm.module.css';
import { login } from '../services/authService';
import { setAuthSession } from '../utils/authStorage';

interface LoginFormProps {
  onLogin?: (payload: { token: string; role: string }) => void;
  switchToRegister?: () => void;
}

export default function LoginForm({ onLogin, switchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    try {
      setLoading(true);
      const data = await login(username, password);
      setAuthSession(data.token, data.role, username);
      setError('');
      onLogin && onLogin(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Sai tài khoản hoặc mật khẩu!');
      } else {
        setError('Sai tài khoản hoặc mật khẩu!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
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
          disabled={loading}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Mật khẩu"
          value={password}
          disabled={loading}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className={styles['auth-btn']} type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <button
          className={styles['auth-btn']}
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ marginTop: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db' }}
        >
          Dang nhap bang Google
        </button>
      </form>
      <div className={styles['auth-switch']}>
        Chưa có tài khoản?
        <span className={styles['auth-link']} onClick={switchToRegister}>Đăng ký</span>
      </div>
    </div>
  );
}
