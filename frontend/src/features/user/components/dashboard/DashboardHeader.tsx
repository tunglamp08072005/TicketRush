import { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, User, Ticket, LogOut, Settings } from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  date: Date;
  type: 'success' | 'warning' | 'info' | 'error';
}

interface DashboardHeaderProps {
  displayName: string;
  avatarUrl?: string;
  notificationCount?: number;
  notifications?: AppNotification[];
  searchValue?: string;
  searchVariant?: 'default' | 'events';
  onSearchValueChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onOpenProfile: () => void;
  onOpenOrders: () => void;
  onOpenNotifications?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onLogout: () => void;
}

export default function DashboardHeader({
  displayName,
  avatarUrl,
  notificationCount = 0,
  notifications = [],
  searchValue = '',
  searchVariant = 'default',
  onSearchValueChange,
  onSearchSubmit,
  onOpenProfile,
  onOpenOrders,
  onOpenNotifications,
  onNotificationClick,
  onLogout,
}: DashboardHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setIsNotificationsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-6 relative z-30">
      {searchVariant === 'events' ? (
      <form
        className="min-w-[280px] max-w-[500px] flex-1"
        onSubmit={event => {
          event.preventDefault();
          onSearchSubmit?.();
        }}
      >
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-500 to-violet-600 opacity-0 blur transition duration-500 group-focus-within:opacity-30"></div>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400 transition-colors group-focus-within:text-orange-400">
              <Search className="h-5 w-5" />
            </span>

            <input
              type="text"
              placeholder="Tìm sự kiện, nghệ sĩ, địa điểm..."
              value={searchValue}
              onChange={event => onSearchValueChange?.(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-[15px] text-white outline-none backdrop-blur-xl transition-all placeholder:text-gray-500 focus:bg-[#0a0a0c]/80 focus:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            />
          </div>
        </div>
      </form>
      ) : (
        <div className="min-w-[280px] max-w-[500px] flex-1" />
      )}

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div ref={notificationsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsMenuOpen(prev => !prev)}
            className="group relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
          >
            <Bell className={`h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110 ${notificationCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
            {notificationCount > 0 && (
              <>
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-[2px] border-[#0a0a0c] bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.8)] z-10">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
                <span className="absolute right-0 top-0 flex h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75"></span>
              </>
            )}
          </button>

          {isNotificationsMenuOpen && (
            <div className="absolute right-0 mt-3 w-80 lg:w-96 rounded-2xl border border-white/10 bg-[#121215]/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl flex flex-col transform opacity-100 transition-all origin-top-right z-40"> 
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center shrink-0">
                <span className="font-bold text-white text-[15px]">Thông báo</span>
                <button
                  onClick={() => { setIsNotificationsMenuOpen(false); onOpenNotifications?.(); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-orange-400 transition-colors"
                  title="Cài đặt thông báo"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {(!notifications || notifications.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                    <Bell className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Bạn chưa có thông báo nào</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notifications.map(notification => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          onNotificationClick?.(notification);
                        }}
                        className={`group w-full rounded-xl p-3 text-left transition-all ${
                          !notification.isRead
                            ? 'bg-orange-500/10 hover:bg-orange-500/15'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${!notification.isRead ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-transparent'}`} />
                          <div>
                            <p className={`text-sm font-semibold mb-1 ${
                              notification.type === 'success' ? 'text-emerald-400' :
                              notification.type === 'warning' ? 'text-amber-400' :
                              notification.type === 'error' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-[13px] text-gray-300 leading-relaxed line-clamp-2 group-hover:line-clamp-none">
                              {notification.message}
                            </p>
                            <p className="text-[11px] font-medium text-gray-500 mt-2">
                              {notification.date.toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 py-2 pl-2 pr-4 text-left backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/10"
          >
            {avatarUrl && avatarUrl.trim() ? (
              <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-xl object-cover border border-white/10 shadow-sm" />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 text-[15px] font-bold text-white shadow-sm">
                {displayName.trim().charAt(0).toUpperCase() || 'U'}
              </span>
            )}
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white leading-tight">{displayName}</span>
              <span className="text-[11px] text-gray-400 font-medium">Thành viên</span>
            </div>
            <ChevronDown className={`ml-1 h-4 w-4 text-gray-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-[#121215]/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transform opacity-100 transition-all origin-top-right z-30"> 
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-gray-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <User className="h-[18px] w-[18px] text-gray-400" />
                  Hồ sơ của tôi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenOrders();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-gray-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Ticket className="h-[18px] w-[18px] text-gray-400" />
                  Vé của tôi
                </button>
                <div className="my-1 border-t border-white/5"></div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}} />
    </header>
  );
}
