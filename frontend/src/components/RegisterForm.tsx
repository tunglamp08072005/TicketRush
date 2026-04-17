import React, { useState } from 'react';
import styles from './AuthForm.module.css';

interface RegisterFormProps {
  switchToLogin?: () => void;
}

export default function RegisterForm({ switchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
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
    // Giả lập: nếu username là "user" thì báo đã tồn tại
    if (username === 'user') {
      setError('Tên đăng nhập đã tồn tại!');
      setSuccess('');
      return;
    }
    setError('');
    setSuccess('Đăng ký thành công!');
    setUsername('');
    setPassword('');
    setConfirm('');
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
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        <button className={styles['auth-btn']} type="submit">Đăng ký</button>
      </form>
      <div className={styles['auth-switch']}>
        Đã có tài khoản?
        <span className={styles['auth-link']} onClick={switchToLogin}>Đăng nhập</span>
      </div>
    </div>
  );
}
