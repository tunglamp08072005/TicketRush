import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import './AuthPage.css';
import { getAuthSession, setAuthSession } from '../utils/authStorage';

function normalizeRole(role: string | null | undefined): 'USER' | 'ADMIN' {
  const normalized = (role || 'USER').toUpperCase().trim().replace(/^ROLE_/, '');
  return normalized === 'ADMIN' ? 'ADMIN' : 'USER';
}

function resolveRedirectTarget(rawRedirect: string | null): string | null {
  if (!rawRedirect) return null;
  if (!rawRedirect.startsWith('/') || rawRedirect.startsWith('//')) return null;
  if (rawRedirect.startsWith('/auth')) return null;
  return rawRedirect;
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
    const redirectTarget = resolveRedirectTarget(params.get('redirect'));
    const error = params.get('error');
    const errorDetail = params.get('error_detail');

    if (error) {
      const detailText = errorDetail ? `\nChi tiet: ${errorDetail}` : '';
      window.alert(`Dang nhap Google that bai (${error}).${detailText}`);
      navigate('/auth', { replace: true });
      return;
    }

    if (!token || !role) {
      const currentSession = getAuthSession();
      if (currentSession.token && currentSession.role) {
        if (currentSession.role === 'ADMIN') {
          navigate('/admin', { replace: true });
          return;
        }
        navigate(redirectTarget || '/user', { replace: true });
      }
      return;
    }

    setAuthSession(token, role, username || undefined);
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate(redirectTarget || '/user', { replace: true });
  }, [location.search, navigate]);

  const handleLoginSuccess = (payload: { token: string; role: string }) => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = resolveRedirectTarget(params.get('redirect'));
    const role = normalizeRole(payload.role);
    if (role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate(redirectTarget || '/user', { replace: true });
  };

  return (
    <div className="auth-page">
      {/* Animated Background Blobs */}
      <div className="auth-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Floating particles */}
      <div className="auth-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="auth-particle" style={{ '--delay': `${i * 0.5}s`, '--x': `${10 + i * 6}%`, '--duration': `${15 + i * 2}s` } as React.CSSProperties} />
        ))}
      </div>

      <div className="auth-card-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand">
              <span className="brand-icon">🎫</span>
              TicketRush
            </div>
            <h1>{mode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}</h1>
            <p>
              {mode === 'login' 
                ? 'Đăng nhập để săn vé nhanh chóng và không bỏ lỡ sự kiện nào!'
                : 'Đăng ký ngay để trải nghiệm đặt vé không giới hạn.'}
            </p>
          </div>

          <div className="auth-tab-bar">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              <span className="tab-icon">🔑</span>
              Đăng nhập
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              <span className="tab-icon">✨</span>
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

          <div className="auth-footer">
            <button className="auth-back-link" onClick={() => navigate('/')}>
              <span>←</span> Về Trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
