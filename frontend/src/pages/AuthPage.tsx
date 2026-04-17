import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">TicketRush</div>
          <h1>Đăng nhập hoặc tạo tài khoản</h1>
          <p>Trải nghiệm đặt vé nhanh chóng, an toàn và tối ưu cho mọi rạp phim.</p>
        </div>

        <div className="auth-tab-bar">
          <button
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('login')}
          >
            Đăng nhập
          </button>
          <button
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('register')}
          >
            Đăng ký
          </button>
        </div>

        <div className="auth-form-area">
          {mode === 'login' ? (
            <LoginForm switchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm switchToLogin={() => setMode('login')} />
          )}
        </div>

        <button className="auth-back-link" onClick={() => navigate('/')}>← Về Trang chủ</button>
      </div>
    </div>
  );
}
