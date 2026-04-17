import React, { useState } from 'react';
import styles from './AuthForm.module.css';
import { register } from '../services/authService';

interface RegisterFormProps {
  switchToLogin?: () => void;
}

export default function RegisterForm({ switchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirm) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      setSuccess('');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải từ 6 ký tự!');
      setSuccess('');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp!');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      const message = await register(username, password);
      setSuccess('');
      setError('');
      setSuccess(message || 'Đăng ký thành công!');
      setUsername('');
      setPassword('');
      setConfirm('');
      window.setTimeout(() => {
        switchToLogin && switchToLogin();
      }, 800);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Đăng ký thất bại!');
      } else {
        setError('Đăng ký thất bại!');
      }
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {error && <div className={styles['auth-error']}>{error}</div>}
        {success && <div className={styles['auth-success']}>{success}</div>}
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
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          value={password}
          disabled={loading}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirm}
          disabled={loading}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        <button className={styles['auth-btn']} type="submit" disabled={loading}>
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>
      <div className={styles['auth-switch']}>
        Đã có tài khoản?
        <span className={styles['auth-link']} onClick={switchToLogin}>Đăng nhập</span>
      </div>
    </div>
  );
}
