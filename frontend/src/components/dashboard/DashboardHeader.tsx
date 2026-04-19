import { useEffect, useRef, useState } from 'react';

interface DashboardHeaderProps {
  displayName: string;
  notificationCount?: number;
  onOpenProfile: () => void;
  onOpenOrders: () => void;
  onLogout: () => void;
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 18H5.8c-.7 0-1.1-.8-.7-1.3l1.1-1.4a4 4 0 0 0 .8-2.5V10a5 5 0 0 1 10 0v2.8c0 .9.3 1.8.8 2.5l1.1 1.4c.4.5 0 1.3-.7 1.3H15Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function DropdownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path d="M5.7 7.2 10 11.5l4.3-4.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4Z" />
    </svg>
  );
}

export default function DashboardHeader({
  displayName,
  notificationCount = 0,
  onOpenProfile,
  onOpenOrders,
  onLogout,
}: DashboardHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="relative min-w-[280px] max-w-[520px] flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Tìm sự kiện, nghệ sĩ, địa điểm..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900/70 py-3 pl-11 pr-4 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-orange-500/60"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-200 transition hover:border-gray-700 hover:text-white"
        >
          <BellIcon />
          {notificationCount > 0 && (
            <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-2.5 py-2 text-left transition hover:border-gray-700"
          >
            <img
              src="https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=120&q=80"
              alt="User"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm font-semibold text-white">{displayName}</span>
            <span className="text-gray-400">
              <DropdownIcon />
            </span>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-gray-800 bg-gray-900 p-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenProfile();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-100 transition hover:bg-gray-800"
              >
                Thông tin cá nhân
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenOrders();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-100 transition hover:bg-gray-800"
              >
                Đơn hàng của tôi
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onLogout();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/15"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
