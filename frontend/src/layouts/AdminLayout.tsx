import { CalendarDays, CreditCard, LayoutDashboard, LogOut, Settings, Users, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../features/auth/utils/authStorage';
import AdminNotificationBell from '../features/admin-events/components/AdminNotificationBell';

const navItems = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Quản lý sự kiện', icon: CalendarDays },
  { to: '/admin/demographics', label: 'Thống kê khán giả', icon: BarChart3 },
  { to: '/admin/payments', label: 'Duyệt thanh toán', icon: CreditCard },
  { to: '/admin/users', label: 'Quản lí người dùng', icon: Users },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

function adminNavClass(isActive: boolean): string {
  return `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? 'border-l-4 border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
      : 'border-l-4 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const todayText = useMemo(
    () =>
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [],
  );

  const handleLogout = () => {
    clearAuthSession();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800 md:h-screen md:flex-row md:overflow-hidden">
      <aside className="flex w-full flex-col border-b border-slate-200 bg-white shadow-sm md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        <div className="border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5">
          <p className="text-xl font-black tracking-[0.08em] text-orange-600">TICKETRUSH ADMIN</p>
          <p className="mt-1 text-xs text-slate-500">Bảng điều khiển quản trị</p>
        </div>

        <nav className="flex-1 px-3 py-3 md:px-4 md:py-5">
          <ul className="flex gap-2 overflow-x-auto md:block md:space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.to} className="min-w-max md:min-w-0">
                  <NavLink to={item.to} className={({ isActive }) => adminNavClass(isActive)}>
                    <Icon className="h-4 w-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-3 md:p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4 stroke-[1.75]" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col bg-slate-100 md:h-screen">
        <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />

        <header className="relative z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Hôm nay</p>
            <p className="text-sm font-semibold text-slate-700">{todayText}</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminNotificationBell 
              onNavigateToPayments={() => navigate('/admin/payments')}
            />
            <div className="flex h-9 min-w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 px-2 text-xs font-bold text-white shadow-lg">
              AD
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
