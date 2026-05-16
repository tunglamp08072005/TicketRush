import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '../../features/auth/utils/authStorage';
import './GuestHeader.css';

type GuestHeaderProps = {
  activeTab: 'home' | 'events' | 'support';
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  onSearchSubmit?: () => void | Promise<void>;
  searchPlaceholder?: string;
};

export default function GuestHeader({
  activeTab,
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  searchPlaceholder = 'Tìm sự kiện...',
}: GuestHeaderProps) {
  const showSearch = activeTab === 'events';
  const navigate = useNavigate();
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const { token } = getAuthSession();
  const isLoggedIn = Boolean(token);

  const resolvedValue = searchValue ?? internalSearchValue;

  const handleSearchChange = (value: string) => {
    if (onSearchValueChange) {
      onSearchValueChange(value);
      return;
    }
    setInternalSearchValue(value);
  };

  const handleSubmit = async () => {
    if (onSearchSubmit) {
      await onSearchSubmit();
      return;
    }
    if (resolvedValue.trim()) {
      navigate('/events');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/', { replace: true });
  };

  return (
    <header className="guest-header">
      <div className="header-top-bar" />
      
      <div className="guest-header-top-wrap">
        <div className="guest-header-top">
          <div className="guest-brand-row">
            <Link to="/" className="guest-brand" aria-label="TicketRush trang chủ">
              <span className="brand-icon">🎫</span>
              <span className="brand-text">TicketRush</span>
            </Link>

            {showSearch ? (
              <form
                className="guest-search-form"
                onSubmit={event => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <label className="guest-search-field" aria-label="Tìm kiếm sự kiện">
                  <svg viewBox="0 0 24 24" className="guest-search-icon" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={resolvedValue}
                    onChange={event => handleSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                  />
                </label>
                <button type="submit" className="guest-search-submit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            ) : null}
          </div>

          <div className="guest-auth-actions">
            {isLoggedIn ? (
              <>
                <Link to="/user" className="guest-auth-button guest-auth-login">
                  <span className="btn-icon">👤</span>
                  Trang của tôi
                </Link>
                <button type="button" className="guest-auth-button guest-auth-logout" onClick={handleLogout}>
                  <span className="btn-icon">🚪</span>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="guest-auth-button guest-auth-login">
                  <span className="btn-icon">🔑</span>
                  Đăng nhập
                </Link>
                <Link to="/auth" className="guest-auth-button guest-auth-register">
                  <span className="btn-icon">✨</span>
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="guest-header-bottom">
        <div className="guest-header-bottom-inner">
          <nav className="guest-nav" aria-label="Điều hướng công khai">
            <Link
              to="/"
              className={`guest-nav-link ${activeTab === 'home' ? 'active' : ''}`}
            >
              <span className="nav-icon">🏠</span>
              Trang chủ
            </Link>
            <Link
              to="/events"
              className={`guest-nav-link ${activeTab === 'events' ? 'active' : ''}`}
            >
              <span className="nav-icon">🎭</span>
              Sự kiện
            </Link>
            {isLoggedIn ? (
              <Link
                to="/support"
                className={`guest-nav-link ${activeTab === 'support' ? 'active' : ''}`}
              >
                <span className="nav-icon">💬</span>
                Hỗ trợ
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
