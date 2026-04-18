import React, { useState } from 'react';
import styles from './AuthForm.module.css';
import { requestRegisterVerification, verifyRegister } from '../services/authService';

interface RegisterFormProps {
  switchToLogin?: () => void;
}

export default function RegisterForm({ switchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirm) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      setSuccess('');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Email không hợp lệ!');
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
      const message = await requestRegisterVerification(email.trim().toLowerCase(), username.trim(), password);
      setSuccess('');
      setError('');
      setSuccess(message || 'Mã xác thực đã được gửi qua email.');
      setAwaitingVerification(true);
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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Vui lòng nhập mã xác thực!');
      return;
    }

    try {
      setLoading(true);
      const message = await verifyRegister(email.trim().toLowerCase(), verificationCode.trim());
      setError('');
      setSuccess(message || 'Đăng ký thành công!');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirm('');
      setVerificationCode('');
      setAwaitingVerification(false);
      window.setTimeout(() => {
        switchToLogin && switchToLogin();
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Xác thực thất bại!');
      } else {
        setError('Xác thực thất bại!');
      }
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <form onSubmit={awaitingVerification ? handleVerifyCode : handleRequestCode} style={{ width: '100%' }}>
        {error && <div className={styles['auth-error']}>{error}</div>}
        {success && <div className={styles['auth-success']}>{success}</div>}
        <input
          className={styles['auth-input']}
          type="email"
          placeholder="Email"
          value={email}
          disabled={loading || awaitingVerification}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className={styles['auth-input']}
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          disabled={loading || awaitingVerification}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          value={password}
          disabled={loading || awaitingVerification}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className={styles['auth-input']}
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirm}
          disabled={loading || awaitingVerification}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {awaitingVerification && (
          <input
            className={styles['auth-input']}
            type="text"
            placeholder="Mã xác thực email (6 số)"
            value={verificationCode}
            disabled={loading}
            onChange={e => setVerificationCode(e.target.value)}
            autoComplete="one-time-code"
          />
        )}
        <button className={styles['auth-btn']} type="submit" disabled={loading}>
          {loading
            ? awaitingVerification
              ? 'Đang xác thực...'
              : 'Đang gửi mã...'
            : awaitingVerification
              ? 'Xác thực & hoàn tất đăng ký'
              : 'Gửi mã xác thực email'}
        </button>
        {awaitingVerification && (
          <button
            className={styles['auth-btn-secondary']}
            type="button"
            disabled={loading}
            onClick={() => {
              setAwaitingVerification(false);
              setVerificationCode('');
              setError('');
            }}
          >
            Sửa lại thông tin
          </button>
        )}
      </form>
      <div className={styles['auth-switch']}>
        Đã có tài khoản?
        <span className={styles['auth-link']} onClick={switchToLogin}>Đăng nhập</span>
      </div>
    </div>
  );
}
