import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import './AuthPage.css';
import { setAuthSession } from '../utils/authStorage';

function normalizeRole(role: string | null | undefined): 'USER' | 'ADMIN' {
  const normalized = (role || 'USER').toUpperCase().trim().replace(/^ROLE_/, '');
  return normalized === 'ADMIN' ? 'ADMIN' : 'USER';
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const role = params.get('role');
    const username = params.get('username');
    const error = params.get('error');

    if (error) {
      window.alert('Dang nhap Google that bai. Vui long thu lai.');
      navigate('/auth', { replace: true });
      return;
    }

    if (!token || !role) {
      return;
    }

    setAuthSession(token, role, username || undefined);

    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate('/user', { replace: true });
  }, [location.search, navigate]);

  const handleLoginSuccess = (payload: { token: string; role: string }) => {
    const role = normalizeRole(payload.role);
    if (role === 'ADMIN') {
      navigate('/admin');
      return;
    }
    navigate('/user');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">TicketRush</div>
          <h1>Đăng nhập hoặc tạo tài khoản</h1>
          <p>Trải nghiệm đặt vé nhanh chóng, an toàn và tối ưu cho mọi sự kiện âm nhạc và giải trí.</p>
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
            <LoginForm onLogin={handleLoginSuccess} switchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm switchToLogin={() => setMode('login')} />
          )}
        </div>

        <button className="auth-back-link" onClick={() => navigate('/')}>← Về Trang chủ</button>
      </div>
    </div>
  );
}
