import React, { useState } from 'react';
import styles from './AuthForm.module.css';
import { forgotPassword, login, resetPassword } from '../services/authService';
import { setAuthSession } from '../utils/authStorage';

interface LoginFormProps {
  onLogin?: (payload: { token: string; role: string }) => void;
  switchToRegister?: () => void;
}

export default function LoginForm({ onLogin, switchToRegister }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      const data = await login(identifier.trim(), password);
      setAuthSession(data.token, data.role, identifier.trim());
      setError('');
      setSuccess('');
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

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Vui lòng nhập email để nhận mã xác thực!');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      const message = await forgotPassword(forgotEmail.trim().toLowerCase());
      setError('');
      setSuccess(message || 'Mã đặt lại mật khẩu đã được gửi qua email.');
      setResetStep('verify');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể gửi mã xác thực!');
      } else {
        setError('Không thể gửi mã xác thực!');
      }
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !resetCode.trim() || !newPassword || !confirmNewPassword) {
      setError('Vui lòng nhập đầy đủ email, mã xác thực, mật khẩu mới và nhập lại mật khẩu!');
      setSuccess('');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự!');
      setSuccess('');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      const message = await resetPassword(forgotEmail.trim().toLowerCase(), resetCode.trim(), newPassword);
      setError('');
      setSuccess(message || 'Đặt lại mật khẩu thành công.');
      setForgotMode(false);
      setResetStep('request');
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Đặt lại mật khẩu thất bại!');
      } else {
        setError('Đặt lại mật khẩu thất bại!');
      }
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  return (
    <div className={styles['auth-container']}>
      <form onSubmit={forgotMode ? (resetStep === 'request' ? handleForgotRequest : handleResetPassword) : handleSubmit} style={{ width: '100%' }}>
        {error && <div className={styles['auth-error']}>{error}</div>}
        {success && <div className={styles['auth-success']}>{success}</div>}

        {!forgotMode && (
          <>
            <input
              className={styles['auth-input']}
              type="text"
              placeholder="Email hoặc tên đăng nhập"
              value={identifier}
              disabled={loading}
              onChange={e => setIdentifier(e.target.value)}
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
          </>
        )}

        {forgotMode && (
          <>
            <input
              className={styles['auth-input']}
              type="email"
              placeholder="Email tài khoản"
              value={forgotEmail}
              disabled={loading || resetStep === 'verify'}
              onChange={e => setForgotEmail(e.target.value)}
              autoComplete="email"
            />

            {resetStep === 'verify' && (
              <>
                <input
                  className={styles['auth-input']}
                  type="text"
                  placeholder="Mã xác thực email (6 số)"
                  value={resetCode}
                  disabled={loading}
                  onChange={e => setResetCode(e.target.value)}
                  autoComplete="one-time-code"
                />
                <input
                  className={styles['auth-input']}
                  type="password"
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  value={newPassword}
                  disabled={loading}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <input
                  className={styles['auth-input']}
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmNewPassword}
                  disabled={loading}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </>
            )}

            <button className={styles['auth-btn']} type="submit" disabled={loading}>
              {loading
                ? 'Đang xử lý...'
                : resetStep === 'request'
                  ? 'Gửi mã xác thực'
                  : 'Xác thực & đặt lại mật khẩu'}
            </button>
          </>
        )}

        {!forgotMode && (
          <button
            className={styles['auth-text-link']}
            type="button"
            onClick={() => {
              setForgotMode(true);
              setResetStep('request');
              setError('');
              setSuccess('');
            }}
          >
            Quên mật khẩu?
          </button>
        )}

        {forgotMode && (
          <button
            className={styles['auth-text-link']}
            type="button"
            onClick={() => {
              setForgotMode(false);
              setResetStep('request');
              setForgotEmail('');
              setResetCode('');
              setNewPassword('');
              setConfirmNewPassword('');
              setError('');
              setSuccess('');
            }}
          >
            Quay lại đăng nhập
          </button>
        )}

        {forgotMode && resetStep === 'verify' && (
          <button
            className={styles['auth-btn-secondary']}
            type="button"
            disabled={loading}
            onClick={() => {
              setResetStep('request');
              setResetCode('');
              setNewPassword('');
              setConfirmNewPassword('');
              setError('');
            }}
          >
            Gửi lại mã xác thực
          </button>
        )}

        {!forgotMode && (
        <button
          className={styles['google-btn']}
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className={styles['google-icon']} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6.1-2.8-6.1-6.2s2.8-6.2 6.1-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 2.7 14.6 1.8 12 1.8 6.4 1.8 1.9 6.4 1.9 12s4.5 10.2 10.1 10.2c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"/>
              <path fill="#34A853" d="M1.9 7.8l3.2 2.3C6 7.8 8.8 5.8 12 5.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 2.7 14.6 1.8 12 1.8 8 1.8 4.6 4.1 1.9 7.8z"/>
              <path fill="#FBBC05" d="M12 22.2c2.6 0 4.8-.9 6.4-2.4l-3-2.4c-.8.6-1.9 1.1-3.4 1.1-4 0-5.2-2.4-5.5-3.6l-3.1 2.4c1.6 3.1 4.9 4.9 8.6 4.9z"/>
              <path fill="#4285F4" d="M21.6 12.4c0-.7-.1-1.2-.2-1.7H12v3.9h5.5c-.3 1.2-1.4 3.6-5.5 3.6-3.3 0-6.1-2.8-6.1-6.2 0-.7.1-1.3.3-1.9L3 7.8C2.3 9.1 1.9 10.5 1.9 12c0 5.6 4.5 10.2 10.1 10.2 5.8 0 9.6-4.1 9.6-9.8z"/>
            </svg>
          </span>
          Đăng nhập bằng Google
        </button>
        )}
      </form>
      <div className={styles['auth-switch']}>
        Chưa có tài khoản?
        <span className={styles['auth-link']} onClick={switchToRegister}>Đăng ký</span>
      </div>
    </div>
  );
}
