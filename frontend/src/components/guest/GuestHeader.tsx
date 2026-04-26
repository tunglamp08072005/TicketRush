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
  searchPlaceholder = 'Bạn tìm gì hôm nay?',
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
      <div className="guest-header-top-wrap">
        <div className="guest-header-top">
          <div className="guest-brand-row">
            <Link to="/" className="guest-brand" aria-label="TicketRush trang chủ">
              ticketrush
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
                  <svg viewBox="0 0 24 24" className="guest-search-icon" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={resolvedValue}
                    onChange={event => handleSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                  />
                </label>
                <button type="submit" className="guest-search-submit">Tìm kiếm</button>
              </form>
            ) : null}
          </div>

          <div className="guest-auth-actions">
            {isLoggedIn ? (
              <>
                <Link to="/user" className="guest-auth-button guest-auth-login">
                  Vào trang của tôi
                </Link>
                <button type="button" className="guest-auth-button guest-auth-register" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="guest-auth-button guest-auth-login">
                  Đăng nhập
                </Link>
                <Link to="/auth" className="guest-auth-button guest-auth-register">
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
              Trang chủ
            </Link>
            <Link
              to="/events"
              className={`guest-nav-link ${activeTab === 'events' ? 'active' : ''}`}
            >
              Sự kiện
            </Link>
            <Link
              to="/support"
              className={`guest-nav-link ${activeTab === 'support' ? 'active' : ''}`}
            >
              Hỗ trợ
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
